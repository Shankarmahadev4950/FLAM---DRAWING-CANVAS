class CanvasRenderingManager{
    constructor(canvasElementId) {
        this.canvasElement = document.getElementById(canvasElementId);
        this.canvasContext = this.canvasElement.getContext('2d');
        this.drawingToolManagerInstance = new DrawingToolManager(this.canvasContext, this.canvasElement);
        this.isCurrentlyDrawing = false;
        
        this.initializeCanvasSetup();
        this.attachEventListenersToCanvas();
        this.configureToolButtonHandlers();
        
        console.log('CanvasRenderingManager initialized');
    }

    initializeCanvasSetup() {
        const sidebarWidthPixels = 280;
        const headerHeightPixels = 60;
        
        this.canvasElement.width = window.innerWidth - sidebarWidthPixels;
        this.canvasElement.height = window.innerHeight - headerHeightPixels;
        
        this.canvasContext.lineCap = 'round';
        this.canvasContext.lineJoin = 'round';
    }

    attachEventListenersToCanvas() {
        this.canvasElement.addEventListener('mousedown', (event) => this.handleMouseDownEvent(event));
        this.canvasElement.addEventListener('mousemove', (event) => this.handleMouseMoveEvent(event));
        this.canvasElement.addEventListener('mouseup', (event) => this.handleMouseUpEvent(event));
        this.canvasElement.addEventListener('mouseout', (event) => this.handleMouseUpEvent(event));
        
        this.canvasElement.addEventListener('touchstart', (event) => this.handleTouchStartEvent(event));
        this.canvasElement.addEventListener('touchmove', (event) => this.handleTouchMoveEvent(event));
        this.canvasElement.addEventListener('touchend', (event) => this.handleTouchEndEvent(event));
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
                }, { once: true });
            }
        }
    }

    handleMouseDownEvent(mouseEvent) {
        const canvasBoundingRectangle = this.canvasElement.getBoundingClientRect();
        const xCoordinateOnCanvas = mouseEvent.clientX - canvasBoundingRectangle.left;
        const yCoordinateOnCanvas = mouseEvent.clientY - canvasBoundingRectangle.top;
        this.drawingToolManagerInstance.initiateDrawing(xCoordinateOnCanvas, yCoordinateOnCanvas);
    }

    handleMouseMoveEvent(mouseEvent) {
        if (!this.drawingToolManagerInstance.isCurrentlyDrawing) return;
        
        const canvasBoundingRectangle = this.canvasElement.getBoundingClientRect();
        const xCoordinateOnCanvas = mouseEvent.clientX - canvasBoundingRectangle.left;
        const yCoordinateOnCanvas = mouseEvent.clientY - canvasBoundingRectangle.top;
        this.drawingToolManagerInstance.performDrawing(xCoordinateOnCanvas, yCoordinateOnCanvas);
    }

    handleMouseUpEvent(mouseEvent) {
        const canvasBoundingRectangle = this.canvasElement.getBoundingClientRect();
        const xCoordinateOnCanvas = mouseEvent.clientX - canvasBoundingRectangle.left;
        const yCoordinateOnCanvas = mouseEvent.clientY - canvasBoundingRectangle.top;
        
        this.drawingToolManagerInstance.lastRecordedPositionX = xCoordinateOnCanvas;
        this.drawingToolManagerInstance.lastRecordedPositionY = yCoordinateOnCanvas;
        this.drawingToolManagerInstance.completeDrawing();
    }

    handleTouchStartEvent(touchEvent) {
        touchEvent.preventDefault();
        const firstTouchContact = touchEvent.touches[0];
        const canvasBoundingRectangle = this.canvasElement.getBoundingClientRect();
        const xCoordinateOnCanvas = firstTouchContact.clientX - canvasBoundingRectangle.left;
        const yCoordinateOnCanvas = firstTouchContact.clientY - canvasBoundingRectangle.top;
        this.drawingToolManagerInstance.initiateDrawing(xCoordinateOnCanvas, yCoordinateOnCanvas);
    }

    handleTouchMoveEvent(touchEvent) {
        touchEvent.preventDefault();
        if (!this.drawingToolManagerInstance.isCurrentlyDrawing) return;
        
        const firstTouchContact = touchEvent.touches[0];
        const canvasBoundingRectangle = this.canvasElement.getBoundingClientRect();
        const xCoordinateOnCanvas = firstTouchContact.clientX - canvasBoundingRectangle.left;
        const yCoordinateOnCanvas = firstTouchContact.clientY - canvasBoundingRectangle.top;
        this.drawingToolManagerInstance.performDrawing(xCoordinateOnCanvas, yCoordinateOnCanvas);
    }

    handleTouchEndEvent(touchEvent) {
        touchEvent.preventDefault();
        this.drawingToolManagerInstance.completeDrawing();
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
        console.log('Canvas content cleared');
    }

    getCanvasImageData() {
        return this.canvasContext.getImageData(0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    restoreCanvasFromImageData(imageDataToRestore) {
        this.canvasContext.putImageData(imageDataToRestore, 0, 0);
    }
}