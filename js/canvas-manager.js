class CanvasRenderingManager {
    constructor(canvasElementId, socketClientInstance) {
        this.canvasElement = document.getElementById(canvasElementId);
        this.canvasContext = this.canvasElement.getContext('2d');
        this.socketClientInstance = socketClientInstance;
        this.drawingToolManagerInstance = new DrawingToolManager(this.canvasContext, this.canvasElement);
        this.isCurrentlyDrawing = false;
        this.currentStrokePoints = [];

        this.initializeCanvasSetup();
        this.attachEventListenersToCanvas();
        this.configureToolButtonHandlers();
        this.setupRemoteDrawingListeners();
    }

    initializeCanvasSetup() {
        const sidebarWidthPixels = 280;
        const headerHeightPixels = 60;

        this.canvasElement.width = window.innerWidth - sidebarWidthPixels;
        this.canvasElement.height = window.innerHeight - headerHeightPixels;

        this.canvasContext.lineCap = 'round';
        this.canvasContext.lineJoin = 'round';

        window.addEventListener('resize', () => {
            this.canvasElement.width = window.innerWidth - sidebarWidthPixels;
            this.canvasElement.height = window.innerHeight - headerHeightPixels;
        });
    }

    attachEventListenersToCanvas() {
        this.canvasElement.addEventListener('mousedown', (event) => this.handleMouseDownEvent(event));
        this.canvasElement.addEventListener('mousemove', (event) => this.handleMouseMoveEvent(event));
        this.canvasElement.addEventListener('mouseup', (event) => this.handleMouseUpEvent(event));
        this.canvasElement.addEventListener('mouseout', (event) => this.handleMouseUpEvent(event));

        this.canvasElement.addEventListener('touchstart', (event) => this.handleTouchStartEvent(event), { passive: false });
        this.canvasElement.addEventListener('touchmove', (event) => this.handleTouchMoveEvent(event), { passive: false });
        this.canvasElement.addEventListener('touchend', (event) => this.handleTouchEndEvent(event), { passive: false });
    }

    configureToolButtonHandlers() {
        const toolButtonElementsList = document.querySelectorAll('.tool-btn');
        toolButtonElementsList.forEach(toolButton => {
            toolButton.addEventListener('click', () => {
                const selectedToolName = toolButton.dataset.tool;
                this.selectToolFromButton(selectedToolName);

                toolButtonElementsList.forEach(btn => btn.classList.remove('active'));
                toolButton.classList.add('active');
            });
        });
    }

    selectToolFromButton(toolNameToSelect) {
        this.drawingToolManagerInstance.switchToTool(toolNameToSelect);

        if (toolNameToSelect === 'text') {
            const userEnteredText = prompt('Enter text to draw:');
            if (userEnteredText) {
                this.canvasElement.addEventListener('click', (clickEvent) => {
                    const canvasBoundingRectangle = this.canvasElement.getBoundingClientRect();
                    const xCoordinateOnCanvas = clickEvent.clientX - canvasBoundingRectangle.left;
                    const yCoordinateOnCanvas = clickEvent.clientY - canvasBoundingRectangle.top;
                    this.drawingToolManagerInstance.drawTextAtPosition(xCoordinateOnCanvas, yCoordinateOnCanvas, userEnteredText);

                    if (this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
                        this.socketClientInstance.emitEventToServer('draw-end', {
                            tool: 'text',
                            x: xCoordinateOnCanvas,
                            y: yCoordinateOnCanvas,
                            text: userEnteredText,
                            color: this.drawingToolManagerInstance.currentDrawingColor,
                            fontSize: 16
                        });
                    }
                }, { once: true });
            }
        }
    }

    handleMouseDownEvent(mouseEvent) {
        const canvasBoundingRectangle = this.canvasElement.getBoundingClientRect();
        const xCoordinateOnCanvas = mouseEvent.clientX - canvasBoundingRectangle.left;
        const yCoordinateOnCanvas = mouseEvent.clientY - canvasBoundingRectangle.top;

        this.isCurrentlyDrawing = true;
        this.currentStrokePoints = [];
        this.drawingToolManagerInstance.initiateDrawing(xCoordinateOnCanvas, yCoordinateOnCanvas);

        if (this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
            this.socketClientInstance.emitDrawStartEvent({
                tool: this.drawingToolManagerInstance.activeToolName,
                x: xCoordinateOnCanvas,
                y: yCoordinateOnCanvas,
                color: this.drawingToolManagerInstance.currentDrawingColor,
                width: this.drawingToolManagerInstance.currentBrushWidth
            });
        }
    }

    handleMouseMoveEvent(mouseEvent) {
        if (!this.drawingToolManagerInstance.isCurrentlyDrawing) return;

        const canvasBoundingRectangle = this.canvasElement.getBoundingClientRect();
        const xCoordinateOnCanvas = mouseEvent.clientX - canvasBoundingRectangle.left;
        const yCoordinateOnCanvas = mouseEvent.clientY - canvasBoundingRectangle.top;

        this.currentStrokePoints.push({ x: xCoordinateOnCanvas, y: yCoordinateOnCanvas });
        this.drawingToolManagerInstance.performDrawing(xCoordinateOnCanvas, yCoordinateOnCanvas);

        if (this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
            this.socketClientInstance.emitDrawMoveEvent({
                point: { x: xCoordinateOnCanvas, y: yCoordinateOnCanvas }
            });
        }
    }

    handleMouseUpEvent(mouseEvent) {
        if (!this.isCurrentlyDrawing) return;

        const canvasBoundingRectangle = this.canvasElement.getBoundingClientRect();
        const xCoordinateOnCanvas = mouseEvent.clientX - canvasBoundingRectangle.left;
        const yCoordinateOnCanvas = mouseEvent.clientY - canvasBoundingRectangle.top;

        this.drawingToolManagerInstance.lastRecordedPositionX = xCoordinateOnCanvas;
        this.drawingToolManagerInstance.lastRecordedPositionY = yCoordinateOnCanvas;
        this.drawingToolManagerInstance.completeDrawing();

        if (this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
            this.socketClientInstance.emitEventToServer('draw-end', {
                tool: this.drawingToolManagerInstance.activeToolName,
                color: this.drawingToolManagerInstance.currentDrawingColor,
                width: this.drawingToolManagerInstance.currentBrushWidth,
                points: this.currentStrokePoints,
                startX: this.drawingToolManagerInstance.drawingStartPositionX,
                startY: this.drawingToolManagerInstance.drawingStartPositionY,
                endX: xCoordinateOnCanvas,
                endY: yCoordinateOnCanvas
            });
        }

        this.isCurrentlyDrawing = false;
        this.currentStrokePoints = [];
    }

    handleTouchStartEvent(touchEvent) {
        touchEvent.preventDefault();
        const firstTouchContact = touchEvent.touches;
        const canvasBoundingRectangle = this.canvasElement.getBoundingClientRect();
        const xCoordinateOnCanvas = firstTouchContact.clientX - canvasBoundingRectangle.left;
        const yCoordinateOnCanvas = firstTouchContact.clientY - canvasBoundingRectangle.top;

        this.isCurrentlyDrawing = true;
        this.currentStrokePoints = [];
        this.drawingToolManagerInstance.initiateDrawing(xCoordinateOnCanvas, yCoordinateOnCanvas);

        if (this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
            this.socketClientInstance.emitDrawStartEvent({
                tool: this.drawingToolManagerInstance.activeToolName,
                x: xCoordinateOnCanvas,
                y: yCoordinateOnCanvas,
                color: this.drawingToolManagerInstance.currentDrawingColor,
                width: this.drawingToolManagerInstance.currentBrushWidth
            });
        }
    }

    handleTouchMoveEvent(touchEvent) {
        touchEvent.preventDefault();
        if (!this.drawingToolManagerInstance.isCurrentlyDrawing) return;

        const firstTouchContact = touchEvent.touches;
        const canvasBoundingRectangle = this.canvasElement.getBoundingClientRect();
        const xCoordinateOnCanvas = firstTouchContact.clientX - canvasBoundingRectangle.left;
        const yCoordinateOnCanvas = firstTouchContact.clientY - canvasBoundingRectangle.top;

        this.currentStrokePoints.push({ x: xCoordinateOnCanvas, y: yCoordinateOnCanvas });
        this.drawingToolManagerInstance.performDrawing(xCoordinateOnCanvas, yCoordinateOnCanvas);

        if (this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
            this.socketClientInstance.emitDrawMoveEvent({
                point: { x: xCoordinateOnCanvas, y: yCoordinateOnCanvas }
            });
        }
    }

    handleTouchEndEvent(touchEvent) {
        touchEvent.preventDefault();
        this.drawingToolManagerInstance.completeDrawing();

        if (this.isCurrentlyDrawing && this.socketClientInstance && this.socketClientInstance.isSocketConnected()) {
            this.socketClientInstance.emitEventToServer('draw-end', {
                tool: this.drawingToolManagerInstance.activeToolName,
                color: this.drawingToolManagerInstance.currentDrawingColor,
                width: this.drawingToolManagerInstance.currentBrushWidth,
                points: this.currentStrokePoints,
                startX: this.drawingToolManagerInstance.drawingStartPositionX,
                startY: this.drawingToolManagerInstance.drawingStartPositionY,
                endX: this.drawingToolManagerInstance.lastRecordedPositionX,
                endY: this.drawingToolManagerInstance.lastRecordedPositionY
            });
        }

        this.isCurrentlyDrawing = false;
        this.currentStrokePoints = [];
    }

    setupRemoteDrawingListeners() {
        if (!this.socketClientInstance) return;

        this.socketClientInstance.registerEventListener('operation', (operation) => {
            this.drawRemoteOperation(operation);
        });

        this.socketClientInstance.registerEventListener('canvas-cleared', () => {
            this.clearCanvasContent();
        });
    }

    drawRemoteOperation(operation) {
        if (!operation || !operation.data) return;

        const { tool, color, width, points, x, y, text, fontSize } = operation.data;

        this.canvasContext.strokeStyle = color || '#000000';
        this.canvasContext.lineWidth = width || 3;
        this.canvasContext.fillStyle = color || '#000000';

        if (tool === 'brush' && points && points.length > 0) {
            this.canvasContext.lineCap = 'round';
            this.canvasContext.lineJoin = 'round';
            this.canvasContext.beginPath();

            if (points.length > 0) {
                this.canvasContext.moveTo(points.x, points.y);
                points.forEach((point, index) => {
                    if (index > 0) {
                        this.canvasContext.lineTo(point.x, point.y);
                    }
                });
            }
            this.canvasContext.stroke();
        } else if (tool === 'line' && points && points.length >= 2) {
            this.canvasContext.beginPath();
            this.canvasContext.moveTo(points.x, points.y);
            this.canvasContext.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            this.canvasContext.stroke();
        } else if (tool === 'rectangle' && points && points.length >= 2) {
            const rectWidth = points[points.length - 1].x - points.x;
            const rectHeight = points[points.length - 1].y - points.y;
            this.canvasContext.strokeRect(points.x, points.y, rectWidth, rectHeight);
        } else if (tool === 'circle' && points && points.length >= 2) {
            const radius = Math.sqrt(
                Math.pow(points[points.length - 1].x - points.x, 2) +
                Math.pow(points[points.length - 1].y - points.y, 2)
            );
            this.canvasContext.beginPath();
            this.canvasContext.arc(points.x, points.y, radius, 0, 2 * Math.PI);
            this.canvasContext.stroke();
        } else if (tool === 'text' && text) {
            this.canvasContext.font = `${fontSize || 16}px Arial`;
            this.canvasContext.fillText(text, x || 0, y || 0);
        } else if (tool === 'eraser' && points && points.length > 0) {
            points.forEach((point) => {
                const eraserSize = width || 10;
                this.canvasContext.clearRect(point.x - eraserSize / 2, point.y - eraserSize / 2, eraserSize, eraserSize);
            });
        }
    }

    getCanvasElement() {
        return this.canvasElement;
    }

    getCanvasContext() {
        return this.canvasContext;
    }

    setDrawingColor(colorHexValue) {
        this.drawingToolManagerInstance.setDrawingColor(colorHexValue);
    }

    setBrushWidth(brushWidthInPixels) {
        this.drawingToolManagerInstance.setBrushWidth(brushWidthInPixels);
    }

    clearCanvasContent() {
        this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    getCanvasImageData() {
        return this.canvasContext.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    restoreCanvasFromImageData(imageDataToRestore) {
        this.canvasContext.putImageData(imageDataToRestore, 0, 0);
    }
}
