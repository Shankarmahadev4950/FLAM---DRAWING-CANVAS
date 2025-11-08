class CollaborativeDrawingApp {
    constructor() {
        this.canvas = document.getElementById('drawing-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize components
        this.socketClient = new RealtimeCommunicationClient();
        this.stateManager = new ApplicationStateManager();
        this.drawingTool = new DrawingToolManager(this.ctx, this.canvas);
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

        // Room-specific drawing events
        this.socketClient.registerEventListener('room-draw-start', (data) => {
            console.log('Room draw start:', data);
            this.handleRemoteDrawStart(data);
        });

        this.socketClient.registerEventListener('room-draw-move', (data) => {
            this.handleRemoteDrawMove(data);
        });

        this.socketClient.registerEventListener('room-draw-end', (data) => {
            console.log('Room draw end:', data);
            this.handleRemoteDrawEnd(data);
        });

        // Room operations update
        this.socketClient.registerEventListener('room-operations-update', (data) => {
            console.log('Room operations update:', data.operations.length, 'operations');
            this.stateManager.setOperationsInList(data.operations);
            this.redrawCanvas();
        });

        this.socketClient.registerEventListener('room-canvas-cleared', () => {
            console.log('Room canvas cleared');
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.stateManager.setOperationsInList([]);
        });

        // Existing event listeners for backward compatibility
        this.socketClient.registerEventListener('draw-start', (data) => {
            if (!this.roomManager.getCurrentActiveRoom()) {
                this.handleRemoteDrawStart(data);
            }
        });

        this.socketClient.registerEventListener('draw-move', (data) => {
            if (!this.roomManager.getCurrentActiveRoom()) {
                this.handleRemoteDrawMove(data);
            }
        });

        this.socketClient.registerEventListener('draw-end', (data) => {
            if (!this.roomManager.getCurrentActiveRoom()) {
                this.handleRemoteDrawEnd(data);
            }
        });

        this.socketClient.registerEventListener('operations-update', (data) => {
            if (!this.roomManager.getCurrentActiveRoom()) {
                this.stateManager.setOperationsInList(data.operations);
                this.redrawCanvas();
            }
        });

        // ... rest of the existing socket listeners
    }

    // Modified drawing methods to use room broadcasting
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
        
        // Send to server - use room broadcast if in a room
        if (this.roomManager.getCurrentActiveRoom()) {
            this.socketClient.emitEventToServer('room-draw-start', {
                point: point,
                tool: this.currentOperation.tool,
                color: this.currentOperation.color,
                brushSize: this.currentOperation.brushSize,
                roomCode: this.roomManager.getCurrentActiveRoom()
            });
        } else {
            this.socketClient.emitDrawStartEvent({
                point: point,
                tool: this.currentOperation.tool,
                color: this.currentOperation.color,
                brushSize: this.currentOperation.brushSize
            });
        }
    }

    continueDrawing(point) {
        if (!this.isDrawing) return;
        
        this.currentOperation.points.push(point);
        
        // Continue drawing locally
        this.drawingTool.performDrawing(point.x, point.y);
        
        // Send to server - use room broadcast if in a room
        if (this.roomManager.getCurrentActiveRoom()) {
            this.socketClient.emitEventToServer('room-draw-move', {
                point: point,
                roomCode: this.roomManager.getCurrentActiveRoom()
            });
        } else {
            this.socketClient.emitDrawMoveEvent({
                point: point
            });
        }
    }

    finishDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.drawingTool.completeDrawing();
        
        // Send to server - use room broadcast if in a room
        if (this.roomManager.getCurrentActiveRoom()) {
            this.socketClient.emitEventToServer('room-draw-end', {
                operation: this.currentOperation,
                roomCode: this.roomManager.getCurrentActiveRoom()
            });
        } else {
            this.socketClient.emitDrawEndEvent();
        }
        
        this.currentOperation = null;
    }

    onUndo() {
        if (this.roomManager.getCurrentActiveRoom()) {
            this.socketClient.emitEventToServer('room-undo', {
                roomCode: this.roomManager.getCurrentActiveRoom()
            });
        } else {
            this.socketClient.emitUndoActionEvent();
        }
    }

    onRedo() {
        if (this.roomManager.getCurrentActiveRoom()) {
            this.socketClient.emitEventToServer('room-redo', {
                roomCode: this.roomManager.getCurrentActiveRoom()
            });
        } else {
            this.socketClient.emitRedoActionEvent();
        }
    }

    onClear() {
        if (this.roomManager.getCurrentActiveRoom()) {
            this.socketClient.emitEventToServer('room-clear-all', {
                roomCode: this.roomManager.getCurrentActiveRoom()
            });
        } else {
            this.socketClient.emitClearCanvasEvent();
        }
    }

    // ... rest of the existing methods
}
