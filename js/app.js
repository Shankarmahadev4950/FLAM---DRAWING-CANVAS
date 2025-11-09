class CollaborativeDrawingApp {
    constructor() {
        this.canvas = document.getElementById('drawing-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize components
        this.socketClient = new RealtimeCommunicationClient();
        this.stateManager = new ApplicationStateManager();
        this.drawingTool = new DrawingTool(this.ctx, this.canvas, this.socketClient);
        this.uiController = new UserInterfaceController(
            (tool) => this.onToolChange(tool),
            (color) => this.onColorChange(color),
            (width) => this.onWidthChange(width),
            () => this.onUndo(),
            () => this.onRedo(),
            () => this.onClear()
        );
        
        // Initialize room manager
        this.roomManager = new CollaborativeRoomManager(this.socketClient, this.stateManager, this.uiController);

        this.isDrawing = false;
        this.currentOperation = null;
        
        this.setupCanvas();
        this.setupSocketListeners();
        
        console.log('Collaborative Drawing App initialized');
    }

    setupCanvas() {
        // Set canvas dimensions
        this.canvas.width = window.innerWidth - 300;
        this.canvas.height = window.innerHeight - 100;

        // Set default drawing styles
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Add event listeners
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());

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

        // Drawing events
        this.socketClient.registerEventListener('draw-start', (data) => {
            if (data.userId === this.socketClient.getUserIdentifier()) return;
            this.handleRemoteDrawStart(data);
        });

        this.socketClient.registerEventListener('draw-move', (data) => {
            if (data.userId === this.socketClient.getUserIdentifier()) return;
            this.handleRemoteDrawMove(data);
        });

        this.socketClient.registerEventListener('draw-end', (data) => {
            if (data.userId === this.socketClient.getUserIdentifier()) return;
            this.handleRemoteDrawEnd(data);
        });

        // User management
        this.socketClient.registerEventListener('user-joined', (user) => {
            this.stateManager.addUserToConnectedList(user);
            this.uiController.updateOnlineUsersList(this.stateManager.getConnectedUsersList());
        });

        this.socketClient.registerEventListener('user-left', (data) => {
            this.stateManager.removeUserFromConnectedList(data.userId);
            this.uiController.removeRemoteUserCursor(data.userId);
            this.uiController.updateOnlineUsersList(this.stateManager.getConnectedUsersList());
        });

        this.socketClient.registerEventListener('user-list', (users) => {
            users.forEach(user => this.stateManager.addUserToConnectedList(user));
            this.uiController.updateOnlineUsersList(this.stateManager.getConnectedUsersList());
        });

        // Operations and state
        this.socketClient.registerEventListener('operations-update', (data) => {
            this.stateManager.setOperationsInList(data.operations);
            this.redrawCanvas();
        });

        this.socketClient.registerEventListener('canvas-cleared', () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.stateManager.setOperationsInList([]);
        });

        this.socketClient.registerEventListener('undo-redo-state', (state) => {
            this.uiController.setUndoButtonEnabled(state.canUndo);
            this.uiController.setRedoButtonEnabled(state.canRedo);
        });

        // User count
        this.socketClient.registerEventListener('user-count', (count) => {
            const countElement = document.getElementById('user-count');
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }

    // Drawing handlers
    handleMouseDown(e) {
        if (e.button !== 0) return;
        const point = this.getCanvasPoint(e);
        this.startDrawing(point);
    }

    handleMouseMove(e) {
        const point = this.getCanvasPoint(e);
        
        if (this.isDrawing) {
            this.continueDrawing(point);
        }
        
        this.socketClient.emitCursorPositionEvent(point);
    }

    handleMouseUp() {
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

        this.drawingTool.startDrawing(point.x, point.y);
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
        this.drawingTool.draw(point.x, point.y);
        this.socketClient.emitDrawMoveEvent({ point: point });
    }

    finishDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.drawingTool.endDrawing();
        this.socketClient.emitDrawEndEvent();
        this.currentOperation = null;
    }

    // Remote drawing handlers
    handleRemoteDrawStart(data) {
        this.drawingTool.setColor(data.color);
        this.drawingTool.setWidth(data.brushSize);
        this.drawingTool.startDrawing(data.point.x, data.point.y);
    }

    handleRemoteDrawMove(data) {
        this.drawingTool.draw(data.point.x, data.point.y);
    }

    handleRemoteDrawEnd(data) {
        this.drawingTool.endDrawing();
    }

    handleResize() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = window.innerWidth - 300;
        this.canvas.height = window.innerHeight - 100;
        this.ctx.putImageData(imageData, 0, 0);
    }

    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const operations = this.stateManager.getOperationsFromList();
        
        operations.forEach(operation => {
            if (operation.points && operation.points.length > 0) {
                this.drawingTool.setColor(operation.color);
                this.drawingTool.setWidth(operation.brushSize);
                
                // Replay the drawing
                this.drawingTool.startDrawing(operation.points[0].x, operation.points[0].y);
                for (let i = 1; i < operation.points.length; i++) {
                    this.drawingTool.draw(operation.points[i].x, operation.points[i].y);
                }
                this.drawingTool.endDrawing();
            }
        });
    }

    // UI callbacks
    onToolChange(tool) {
        this.drawingTool.setTool(tool);
    }

    onColorChange(color) {
        this.drawingTool.setColor(color);
    }

    onWidthChange(width) {
        this.drawingTool.setWidth(width);
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

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    window.drawingApp = new CollaborativeDrawingApp();
});
