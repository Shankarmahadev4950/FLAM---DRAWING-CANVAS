class CollaborativeDrawingApp {
    constructor() {
        this.canvas = document.getElementById('drawing-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize components
        this.socketClient = new RealtimeCommunicationClient();
        this.drawingTool = new DrawingToolManager(this.ctx, this.canvas);
        this.stateManager = new ApplicationStateManager();
        this.uiController = new UserInterfaceController(
            (tool) => this.onToolChange(tool),
            (color) => this.onColorChange(color),
            (width) => this.onWidthChange(width),
            () => this.onUndo(),
            () => this.onRedo(),
            () => this.onClear()
        );

        this.isDrawing = false;
        this.currentOperation = null;
        
        this.setupCanvas();
        this.setupSocketListeners();
        this.joinRoom();
        
        console.log('Collaborative Drawing App initialized');
    }

    setupCanvas() {
        // Set canvas dimensions
        const sidebarWidth = 300;
        const headerHeight = 100;
        this.canvas.width = window.innerWidth - sidebarWidth;
        this.canvas.height = window.innerHeight - headerHeight;

        // Set default drawing styles
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Add event listeners
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());

        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    setupSocketListeners() {
        // Connection events
        this.socketClient.registerEventListener('connect', () => {
            console.log('Connected to server');
            this.uiController.setConnectionStatusIndicator(true);
        });

        this.socketClient.registerEventListener('disconnect', () => {
            console.log('Disconnected from server');
            this.uiController.setConnectionStatusIndicator(false);
        });

        // Drawing events from other users - FIXED
        this.socketClient.registerEventListener('draw-start', (data) => {
            console.log('Remote draw start:', data);
            this.handleRemoteDrawStart(data);
        });

        this.socketClient.registerEventListener('draw-move', (data) => {
            this.handleRemoteDrawMove(data);
        });

        this.socketClient.registerEventListener('draw-end', (data) => {
            console.log('Remote draw end:', data);
            this.handleRemoteDrawEnd(data);
        });

        // Cursor events
        this.socketClient.registerEventListener('cursor-update', (data) => {
            this.handleRemoteCursorMove(data);
        });

        // User management
        this.socketClient.registerEventListener('user-joined', (user) => {
            console.log('User joined:', user);
            this.stateManager.addUserToConnectedList(user);
            this.uiController.updateOnlineUsersList(this.stateManager.getConnectedUsersList());
        });

        this.socketClient.registerEventListener('user-left', (data) => {
            console.log('User left:', data);
            this.stateManager.removeUserFromConnectedList(data.userId);
            this.uiController.removeRemoteUserCursor(data.userId);
            this.uiController.updateOnlineUsersList(this.stateManager.getConnectedUsersList());
        });

        this.socketClient.registerEventListener('user-list', (users) => {
            console.log('User list received:', users);
            users.forEach(user => this.stateManager.addUserToConnectedList(user));
            this.uiController.updateOnlineUsersList(this.stateManager.getConnectedUsersList());
        });

        // Initialization - FIXED
        this.socketClient.registerEventListener('init', (data) => {
            console.log('Initial data received:', data);
            this.stateManager.initializeApplicationState(data);
            this.redrawCanvas();
            this.uiController.updateOnlineUsersList(this.stateManager.getConnectedUsersList());
            this.uiController.setUndoButtonEnabled(data.canUndo);
            this.uiController.setRedoButtonEnabled(data.canRedo);
        });

        // Undo/Redo state
        this.socketClient.registerEventListener('undo-redo-state', (state) => {
            this.uiController.setUndoButtonEnabled(state.canUndo);
            this.uiController.setRedoButtonEnabled(state.canRedo);
        });

        // Operations update - FIXED
        this.socketClient.registerEventListener('operations-update', (data) => {
            console.log('Operations update received:', data.operations.length, 'operations');
            this.stateManager.setOperationsInList(data.operations);
            this.redrawCanvas();
        });

        this.socketClient.registerEventListener('canvas-cleared', () => {
            console.log('Canvas cleared event received');
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.stateManager.setOperationsInList([]);
        });

        // User count
        this.socketClient.registerEventListener('user-count', (count) => {
            console.log('User count:', count);
            const countElement = document.getElementById('user-count');
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }

    joinRoom() {
        this.socketClient.emitEventToServer('join', {
            userId: this.socketClient.getUserIdentifier()
        });
    }

    // Local drawing handlers
    handleMouseDown(e) {
        if (e.button !== 0) return; // Only left click
        
        const point = this.getCanvasPoint(e);
        this.startDrawing(point);
    }

    handleMouseMove(e) {
        const point = this.getCanvasPoint(e);
        
        if (this.isDrawing) {
            this.continueDrawing(point);
        }
        
        // Send cursor position
        this.socketClient.emitCursorPositionEvent(point);
    }

    handleMouseUp() {
        this.finishDrawing();
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const point = this.getCanvasPoint(touch);
        this.startDrawing(point);
    }

    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isDrawing) return;
        
        const touch = e.touches[0];
        const point = this.getCanvasPoint(touch);
        this.continueDrawing(point);
        
        // Send cursor position
        this.socketClient.emitCursorPositionEvent(point);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.finishDrawing();
    }

    getCanvasPoint(input) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: input.clientX - rect.left,
            y: input.clientY - rect.top
        };
    }

    startDrawing(point) {
        this.isDrawing = true;
        
        this.currentOperation = {
            userId: this.socketClient.getUserIdentifier(),
            tool: this.uiController.getCurrentlySelectedTool(),
            color: this.uiController.getCurrentlySelectedColor(),
            brushSize: this.uiController.getCurrentlySelectedWidth(),
            points: [point],
            timestamp: Date.now()
        };

        // Start drawing locally
        this.drawingTool.initiateDrawing(point.x, point.y);
        
        // Send to server - FIXED
        this.socketClient.emitDrawStartEvent({
            point: point,
            tool: this.currentOperation.tool,
            color: this.currentOperation.color,
            brushSize: this.currentOperation.brushSize
        });
    }

    continueDrawing(point) {
        if (!this.isDrawing) return;
        
        this.currentOperation.points.push(point);
        
        // Continue drawing locally
        this.drawingTool.performDrawing(point.x, point.y);
        
        // Send to server
        this.socketClient.emitDrawMoveEvent({
            point: point
        });
    }

    finishDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.drawingTool.completeDrawing();
        
        // Send to server
        this.socketClient.emitDrawEndEvent();
        
        this.currentOperation = null;
    }

    // Remote drawing handlers - FIXED
    handleRemoteDrawStart(data) {
        // Don't process our own events
        if (data.userId === this.socketClient.getUserIdentifier()) return;
        
        console.log('Starting remote drawing:', data);
        // Initialize remote drawing
        this.drawingTool.setDrawingColor(data.color);
        this.drawingTool.setBrushWidth(data.brushSize);
        this.drawingTool.initiateDrawing(data.point.x, data.point.y);
    }

    handleRemoteDrawMove(data) {
        // Don't process our own events
        if (data.userId === this.socketClient.getUserIdentifier()) return;
        
        // Continue remote drawing
        this.drawingTool.performDrawing(data.point.x, data.point.y);
    }

    handleRemoteDrawEnd(data) {
        // Don't process our own events
        if (data.userId === this.socketClient.getUserIdentifier()) return;
        
        // Complete remote drawing
        this.drawingTool.completeDrawing();
    }

    handleRemoteCursorMove(data) {
        // Don't process our own events
        if (data.userId === this.socketClient.getUserIdentifier()) return;
        
        // Update remote cursor position
        this.uiController.updateRemoteUserCursorPosition(data, data.color);
    }

    handleResize() {
        // Save current canvas image
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Resize canvas
        const sidebarWidth = 300;
        const headerHeight = 100;
        this.canvas.width = window.innerWidth - sidebarWidth;
        this.canvas.height = window.innerHeight - headerHeight;
        
        // Restore canvas image
        this.ctx.putImageData(imageData, 0, 0);
    }

    redrawCanvas() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw all operations
        const operations = this.stateManager.getOperationsFromList();
        console.log('Redrawing canvas with', operations.length, 'operations');
        
        operations.forEach(operation => {
            if (operation.points && operation.points.length > 0) {
                this.drawingTool.setDrawingColor(operation.color);
                this.drawingTool.setBrushWidth(operation.brushSize);
                
                // Draw the operation
                this.drawingTool.initiateDrawing(operation.points[0].x, operation.points[0].y);
                for (let i = 1; i < operation.points.length; i++) {
                    this.drawingTool.performDrawing(operation.points[i].x, operation.points[i].y);
                }
                this.drawingTool.completeDrawing();
            }
        });
    }

    // UI callbacks
    onToolChange(tool) {
        this.drawingTool.switchToTool(tool);
    }

    onColorChange(color) {
        this.drawingTool.setDrawingColor(color);
    }

    onWidthChange(width) {
        this.drawingTool.setBrushWidth(width);
    }

    onUndo() {
        this.socketClient.emitUndoActionEvent();
    }

    onRedo() {
        this.socketClient.emitRedoActionEvent();
    }

    onClear() {
        this.socketClient.emitClearCanvasEvent();
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.drawingApp = new CollaborativeDrawingApp();
});
