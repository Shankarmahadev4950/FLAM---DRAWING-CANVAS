class CanvasRenderingManager {
    constructor(canvasElementId, socketClientInstance) {
        this.canvasElement = document.getElementById(canvasElementId);
        
        // ✅ FIX: Add willReadFrequently option
        this.canvasContext = this.canvasElement.getContext('2d', { 
            willReadFrequently: true 
        });
        
        this.socketClientInstance = socketClientInstance;
        this.drawingToolManagerInstance = new DrawingToolManager(this.canvasContext, this.canvasElement);
        this.isCurrentlyDrawing = false;
        this.currentStrokePoints = [];
        
        this.throttleDelay = 16;
        this.lastEmitTime = 0;

        this.initializeCanvasSetup();
        this.attachEventListenersToCanvas();
        this.configureToolButtonHandlers();
        this.setupRemoteDrawingListeners();
        
        console.log('✅ Canvas Manager initialized');
    }

    initializeCanvasSetup() {
        const sidebarWidth = window.innerWidth > 768 ? 350 : 0;
        const headerHeight = 65;

        this.canvasElement.width = window.innerWidth - sidebarWidth - 40;
        this.canvasElement.height = window.innerHeight - headerHeight - 40;

        this.canvasContext.lineCap = 'round';
        this.canvasContext.lineJoin = 'round';
        this.canvasContext.imageSmoothingEnabled = true;
        
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        const sidebarWidth = window.innerWidth > 768 ? 350 : 0;
        const headerHeight = 65;
        
        const imageData = this.canvasContext.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        this.canvasElement.width = window.innerWidth - sidebarWidth - 40;
        this.canvasElement.height = window.innerHeight - headerHeight - 40;
        
        this.canvasContext.putImageData(imageData, 0, 0);
    }

    attachEventListenersToCanvas() {
        this.canvasElement.addEventListener('mousedown', (e) => this.handleMouseDownEvent(e));
        this.canvasElement.addEventListener('mousemove', (e) => this.handleMouseMoveEvent(e));
        this.canvasElement.addEventListener('mouseup', (e) => this.handleMouseUpEvent(e));
        this.canvasElement.addEventListener('mouseout', (e) => this.handleMouseUpEvent(e));

        this.canvasElement.addEventListener('touchstart', (e) => this.handleTouchStartEvent(e), { passive: false });
        this.canvasElement.addEventListener('touchmove', (e) => this.handleTouchMoveEvent(e), { passive: false });
        this.canvasElement.addEventListener('touchend', (e) => this.handleTouchEndEvent(e), { passive: false });
    }

    configureToolButtonHandlers() {
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tool = button.dataset.tool;
                this.selectTool(tool);
                
                toolButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    }

    selectTool(toolName) {
        this.drawingToolManagerInstance.switchToTool(toolName);
    }

    getCoordinates(event) {
        const rect = this.canvasElement.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    getTouchCoordinates(event) {
        const rect = this.canvasElement.getBoundingClientRect();
        return {
            x: event.touches[0].clientX - rect.left,
            y: event.touches[0].clientY - rect.top
        };
    }

    handleMouseDownEvent(event) {
        const { x, y } = this.getCoordinates(event);
        
        this.isCurrentlyDrawing = true;
        this.currentStrokePoints = [{ x, y }];
        this.drawingToolManagerInstance.initiateDrawing(x, y);

        if (this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
            this.socketClientInstance.emitDrawStartEvent({
                tool: this.drawingToolManagerInstance.activeToolName,
                x, y,
                color: this.drawingToolManagerInstance.currentDrawingColor,
                width: this.drawingToolManagerInstance.currentBrushWidth
            });
        }
    }

    handleMouseMoveEvent(event) {
        if (!this.drawingToolManagerInstance.isCurrentlyDrawing) return;

        const { x, y } = this.getCoordinates(event);
        const point = { x, y };
        
        this.currentStrokePoints.push(point);
        this.drawingToolManagerInstance.performDrawing(x, y);

        const now = Date.now();
        if (now - this.lastEmitTime > this.throttleDelay) {
            if (this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
                this.socketClientInstance.emitDrawMoveEvent({ point });
            }
            this.lastEmitTime = now;
        }
    }

    handleMouseUpEvent(event) {
        if (!this.isCurrentlyDrawing) return;

        this.drawingToolManagerInstance.completeDrawing();

        if (this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
            this.socketClientInstance.emitEventToServer('draw-end', {
                tool: this.drawingToolManagerInstance.activeToolName,
                color: this.drawingToolManagerInstance.currentDrawingColor,
                width: this.drawingToolManagerInstance.currentBrushWidth,
                points: this.currentStrokePoints
            });
        }

        this.isCurrentlyDrawing = false;
        this.currentStrokePoints = [];
    }

    handleTouchStartEvent(event) {
        event.preventDefault();
        const { x, y } = this.getTouchCoordinates(event);
        
        this.isCurrentlyDrawing = true;
        this.currentStrokePoints = [{ x, y }];
        this.drawingToolManagerInstance.initiateDrawing(x, y);

        if (this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
            this.socketClientInstance.emitDrawStartEvent({
                tool: this.drawingToolManagerInstance.activeToolName,
                x, y,
                color: this.drawingToolManagerInstance.currentDrawingColor,
                width: this.drawingToolManagerInstance.currentBrushWidth
            });
        }
    }

    handleTouchMoveEvent(event) {
        event.preventDefault();
        if (!this.drawingToolManagerInstance.isCurrentlyDrawing) return;

        const { x, y } = this.getTouchCoordinates(event);
        const point = { x, y };
        
        this.currentStrokePoints.push(point);
        this.drawingToolManagerInstance.performDrawing(x, y);

        const now = Date.now();
        if (now - this.lastEmitTime > this.throttleDelay) {
            if (this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
                this.socketClientInstance.emitDrawMoveEvent({ point });
            }
            this.lastEmitTime = now;
        }
    }

    handleTouchEndEvent(event) {
        event.preventDefault();
        if (!this.isCurrentlyDrawing) return;

        this.drawingToolManagerInstance.completeDrawing();

        if (this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
            this.socketClientInstance.emitEventToServer('draw-end', {
                tool: this.drawingToolManagerInstance.activeToolName,
                color: this.drawingToolManagerInstance.currentDrawingColor,
                width: this.drawingToolManagerInstance.currentBrushWidth,
                points: this.currentStrokePoints
            });
        }

        this.isCurrentlyDrawing = false;
        this.currentStrokePoints = [];
    }

    setupRemoteDrawingListeners() {
        if (!this.socketClientInstance) return;

        this.socketClientInstance.registerEventListener('operation', (operation) => {
            console.log('✏️ Drawing received:', operation);
            this.drawRemoteOperation(operation);
        });

        this.socketClientInstance.registerEventListener('canvas-cleared', () => {
            this.clearCanvasContent();
        });

        this.socketClientInstance.registerEventListener('operations-update', (data) => {
            this.redrawAllOperations(data.operations);
        });
    }

    drawRemoteOperation(operation) {
        if (!operation || !operation.data) return;

        const { tool, color, width, points } = operation.data;

        this.canvasContext.strokeStyle = color;
        this.canvasContext.lineWidth = width;
        this.canvasContext.lineCap = 'round';
        this.canvasContext.lineJoin = 'round';

        if (tool === 'brush' && points && points.length > 0) {
            this.canvasContext.beginPath();
            this.canvasContext.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length; i++) {
                this.canvasContext.lineTo(points[i].x, points[i].y);
            }
            
            this.canvasContext.stroke();
        } else if (tool === 'eraser' && points && points.length > 0) {
            this.canvasContext.globalCompositeOperation = 'destination-out';
            this.canvasContext.beginPath();
            this.canvasContext.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length; i++) {
                this.canvasContext.lineTo(points[i].x, points[i].y);
            }
            
            this.canvasContext.stroke();
            this.canvasContext.globalCompositeOperation = 'source-over';
        }
    }

    redrawAllOperations(operations) {
        this.clearCanvasContent();
        operations.forEach(op => this.drawRemoteOperation(op));
    }

    setDrawingColor(color) {
        this.drawingToolManagerInstance.setDrawingColor(color);
    }

    setBrushWidth(width) {
        this.drawingToolManagerInstance.setBrushWidth(width);
    }

    clearCanvasContent() {
        this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
}

console.log('✅ canvas-manager.js loaded');
