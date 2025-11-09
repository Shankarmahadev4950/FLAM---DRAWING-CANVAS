class CanvasRenderingManager {
    constructor(canvasId, socketClient) {
        this.canvasElement = document.getElementById(canvasId);
        this.canvasContext = this.canvasElement.getContext('2d', { willReadFrequently: true });
        this.socketClientInstance = socketClient;
        this.drawingToolManagerInstance = new DrawingToolManager(this.canvasContext, this.canvasElement);
        this.isCurrentlyDrawing = false;
        this.currentStrokePoints = [];
        this.throttleDelay = 16;
        this.lastEmitTime = 0;
        
        // Remote cursors
        this.remoteCursors = new Map();
        this.cursorRenderInterval = null;

        this.initializeCanvas();
        this.attachEventListeners();
        this.setupRemoteDrawingListeners();
        this.setupCursorTracking();
        this.startCursorRendering();
        
        console.log('✅ Canvas Manager initialized');
    }

    initializeCanvas() {
        this.canvasElement.width = window.innerWidth - 390;
        this.canvasElement.height = window.innerHeight - 105;
        this.canvasContext.lineCap = 'round';
        this.canvasContext.lineJoin = 'round';
        this.canvasContext.imageSmoothingEnabled = true;
        
        window.addEventListener('resize', () => this.handleResize());
    }

    handleResize() {
        const imageData = this.canvasContext.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);
        this.canvasElement.width = window.innerWidth - 390;
        this.canvasElement.height = window.innerHeight - 105;
        this.canvasContext.putImageData(imageData, 0, 0);
    }

    attachEventListeners() {
        this.canvasElement.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvasElement.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvasElement.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvasElement.addEventListener('mouseout', (e) => this.handleMouseUp(e));

        this.canvasElement.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvasElement.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvasElement.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.drawingToolManagerInstance.switchToTool(btn.dataset.tool);
            });
        });
    }

    setupCursorTracking() {
        // Track own cursor movement
        this.canvasElement.addEventListener('mousemove', (e) => {
            if (this.socketClientInstance.isSocketConnected()) {
                const { x, y } = this.getCoordinates(e);
                this.socketClientInstance.emitEventToServer('cursor-move', { x, y });
            }
        });

        // Listen for remote cursors
        this.socketClientInstance.registerEventListener('cursor-update', (data) => {
            this.remoteCursors.set(data.userId, {
                x: data.x,
                y: data.y,
                color: data.color,
                lastUpdate: Date.now()
            });
        });

        this.socketClientInstance.registerEventListener('cursor-remove', (data) => {
            this.remoteCursors.delete(data.userId);
        });

        // Clean up old cursors
        setInterval(() => {
            const now = Date.now();
            this.remoteCursors.forEach((cursor, userId) => {
                if (now - cursor.lastUpdate > 3000) {
                    this.remoteCursors.delete(userId);
                }
            });
        }, 1000);
    }

    startCursorRendering() {
        this.cursorRenderInterval = setInterval(() => {
            this.renderRemoteCursors();
        }, 50);
    }

    renderRemoteCursors() {
        // Remove old cursor overlays
        document.querySelectorAll('.remote-cursor').forEach(el => el.remove());

        // Draw new cursors as HTML elements
        this.remoteCursors.forEach((cursor, userId) => {
            const cursorElement = document.createElement('div');
            cursorElement.className = 'remote-cursor';
            cursorElement.style.left = `${cursor.x}px`;
            cursorElement.style.top = `${cursor.y}px`;
            cursorElement.innerHTML = `
                <div class="remote-cursor-dot" style="background: ${cursor.color};"></div>
                <div class="remote-cursor-label" style="background: ${cursor.color};">${userId.substring(5, 13)}</div>
            `;
            this.canvasElement.parentElement.appendChild(cursorElement);
        });
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

    handleMouseDown(event) {
        const { x, y } = this.getCoordinates(event);
        this.isCurrentlyDrawing = true;
        this.currentStrokePoints = [{ x, y }];
        this.drawingToolManagerInstance.initiateDrawing(x, y);

        if (this.socketClientInstance.isSocketConnected()) {
            this.socketClientInstance.emitDrawStartEvent({
                tool: this.drawingToolManagerInstance.activeToolName,
                x, y,
                color: this.drawingToolManagerInstance.currentDrawingColor,
                width: this.drawingToolManagerInstance.currentBrushWidth
            });
        }
    }

    handleMouseMove(event) {
        if (!this.drawingToolManagerInstance.isCurrentlyDrawing) return;

        const { x, y } = this.getCoordinates(event);
        this.currentStrokePoints.push({ x, y });
        this.drawingToolManagerInstance.performDrawing(x, y);

        const now = Date.now();
        if (now - this.lastEmitTime > this.throttleDelay) {
            if (this.socketClientInstance.isSocketConnected()) {
                this.socketClientInstance.emitDrawMoveEvent({ point: { x, y } });
            }
            this.lastEmitTime = now;
        }
    }

    handleMouseUp(event) {
        if (!this.isCurrentlyDrawing) return;

        this.drawingToolManagerInstance.completeDrawing();

        if (this.socketClientInstance.isSocketConnected()) {
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

    handleTouchStart(event) {
        event.preventDefault();
        const { x, y } = this.getTouchCoordinates(event);
        this.isCurrentlyDrawing = true;
        this.currentStrokePoints = [{ x, y }];
        this.drawingToolManagerInstance.initiateDrawing(x, y);

        if (this.socketClientInstance.isSocketConnected()) {
            this.socketClientInstance.emitDrawStartEvent({
                tool: this.drawingToolManagerInstance.activeToolName,
                x, y,
                color: this.drawingToolManagerInstance.currentDrawingColor,
                width: this.drawingToolManagerInstance.currentBrushWidth
            });
        }
    }

    handleTouchMove(event) {
        event.preventDefault();
        if (!this.drawingToolManagerInstance.isCurrentlyDrawing) return;

        const { x, y } = this.getTouchCoordinates(event);
        this.currentStrokePoints.push({ x, y });
        this.drawingToolManagerInstance.performDrawing(x, y);

        const now = Date.now();
        if (now - this.lastEmitTime > this.throttleDelay) {
            if (this.socketClientInstance.isSocketConnected()) {
                this.socketClientInstance.emitDrawMoveEvent({ point: { x, y } });
            }
            this.lastEmitTime = now;
        }
    }

    handleTouchEnd(event) {
        event.preventDefault();
        if (!this.isCurrentlyDrawing) return;

        this.drawingToolManagerInstance.completeDrawing();

        if (this.socketClientInstance.isSocketConnected()) {
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
        this.socketClientInstance.registerEventListener('operation', (operation) => {
            console.log('✏️ Drawing received:', operation);
            this.drawRemoteOperation(operation);
        });

        this.socketClientInstance.registerEventListener('canvas-cleared', () => {
            this.clearCanvas();
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
            this.canvasContext.globalCompositeOperation = 'source-over';
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
        this.clearCanvas();
        operations.forEach(op => this.drawRemoteOperation(op));
    }

    setDrawingColor(color) {
        this.drawingToolManagerInstance.setDrawingColor(color);
    }

    setBrushWidth(width) {
        this.drawingToolManagerInstance.setBrushWidth(width);
    }

    clearCanvas() {
        this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
}

console.log('✅ canvas-manager.js loaded');
