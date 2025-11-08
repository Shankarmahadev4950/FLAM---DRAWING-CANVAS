class DrawingToolManager {
    constructor(canvasRenderingContext, canvasElement) {
        this.canvasContext = canvasRenderingContext;
        this.canvasElement = canvasElement;
        this.activeToolName = 'brush';           
        this.isCurrentlyDrawing = false;          
        this.drawingStartPositionX = 0;           
        this.drawingStartPositionY = 0;           
        this.lastRecordedPositionX = 0;           
        this.lastRecordedPositionY = 0;           
        this.currentDrawingColor = '#000000';     
        this.currentBrushWidth = 3;               
        this.canvasSnapshotData = null;           
        console.log('DrawingToolManager initialized successfully');
    }

    switchToTool(toolNameToActivate) {
        this.activeToolName = toolNameToActivate;
        console.log('Switched to tool:', toolNameToActivate);
        if (toolNameToActivate === 'text') {
            this.canvasElement.style.cursor = 'text';
        } else if (toolNameToActivate === 'eraser') {
            this.canvasElement.style.cursor = 'grab';
        } else {
            this.canvasElement.style.cursor = 'crosshair';
        }
    }

    setDrawingColor(colorHexValue) {
        this.currentDrawingColor = colorHexValue;
    }

    setBrushWidth(widthInPixels) {
        this.currentBrushWidth = widthInPixels;
    }

    initiateDrawing(startXPosition, startYPosition) {
        this.isCurrentlyDrawing = true;
        this.drawingStartPositionX = startXPosition;
        this.drawingStartPositionY = startYPosition;
        this.lastRecordedPositionX = startXPosition;
        this.lastRecordedPositionY = startYPosition;

        const isShapeToolActive = ['line', 'rectangle', 'circle'].includes(this.activeToolName);
        if (isShapeToolActive) {
            this.canvasSnapshotData = this.canvasContext.getImageData(
                0, 0, this.canvasElement.width, this.canvasElement.height
            );
        }
    }

    performDrawing(currentXPosition, currentYPosition) {
        if (!this.isCurrentlyDrawing) return;
        switch (this.activeToolName) {
            case 'brush':
                this.drawWithBrush(currentXPosition, currentYPosition);
                break;
            case 'eraser':
                this.eraseAtPosition(currentXPosition, currentYPosition);
                break;
            case 'line':
                this.showLinePreview(currentXPosition, currentYPosition);
                break;
            case 'rectangle':
                this.showRectanglePreview(currentXPosition, currentYPosition);
                break;
            case 'circle':
                this.showCirclePreview(currentXPosition, currentYPosition);
                break;
        }
    }

    completeDrawing() {
        if (!this.isCurrentlyDrawing) return;
        this.isCurrentlyDrawing = false;
        if (this.activeToolName === 'line') {
            this.makeLinePermanent();
        } else if (this.activeToolName === 'rectangle') {
            this.makeRectanglePermanent();
        } else if (this.activeToolName === 'circle') {
            this.makeCirclePermanent();
        }
    }

    drawWithBrush(currentXPosition, currentYPosition) {
        this.canvasContext.strokeStyle = this.currentDrawingColor;
        this.canvasContext.lineWidth = this.currentBrushWidth;
        this.canvasContext.lineCap = 'round';      
        this.canvasContext.lineJoin = 'round';     
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(this.lastRecordedPositionX, this.lastRecordedPositionY);
        this.canvasContext.lineTo(currentXPosition, currentYPosition);
        this.canvasContext.stroke();
        this.lastRecordedPositionX = currentXPosition;
        this.lastRecordedPositionY = currentYPosition;
    }

    eraseAtPosition(currentXPosition, currentYPosition) {
        const eraserSize = this.currentBrushWidth;
        const eraserStartX = currentXPosition - (eraserSize / 2);
        const eraserStartY = currentYPosition - (eraserSize / 2);
        this.canvasContext.clearRect(eraserStartX, eraserStartY, eraserSize, eraserSize);
        this.lastRecordedPositionX = currentXPosition;
        this.lastRecordedPositionY = currentYPosition;
    }

    showLinePreview(currentXPosition, currentYPosition) {
        if (this.canvasSnapshotData) {
            this.canvasContext.putImageData(this.canvasSnapshotData, 0, 0);
        }
        this.canvasContext.strokeStyle = this.currentDrawingColor;
        this.canvasContext.lineWidth = this.currentBrushWidth;
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(this.drawingStartPositionX, this.drawingStartPositionY);
        this.canvasContext.lineTo(currentXPosition, currentYPosition);
        this.canvasContext.stroke();
    }

    makeLinePermanent() {
        this.canvasContext.strokeStyle = this.currentDrawingColor;
        this.canvasContext.lineWidth = this.currentBrushWidth;
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(this.drawingStartPositionX, this.drawingStartPositionY);
        this.canvasContext.lineTo(this.lastRecordedPositionX, this.lastRecordedPositionY);
        this.canvasContext.stroke();
    }

    showRectanglePreview(currentXPosition, currentYPosition) {
        if (this.canvasSnapshotData) {
            this.canvasContext.putImageData(this.canvasSnapshotData, 0, 0);
        }
        const rectangleWidth = currentXPosition - this.drawingStartPositionX;
        const rectangleHeight = currentYPosition - this.drawingStartPositionY;
        this.canvasContext.strokeStyle = this.currentDrawingColor;
        this.canvasContext.lineWidth = this.currentBrushWidth;
        this.canvasContext.strokeRect(this.drawingStartPositionX, this.drawingStartPositionY, rectangleWidth, rectangleHeight);
    }

    makeRectanglePermanent() {
        const rectangleWidth = this.lastRecordedPositionX - this.drawingStartPositionX;
        const rectangleHeight = this.lastRecordedPositionY - this.drawingStartPositionY;
        this.canvasContext.strokeStyle = this.currentDrawingColor;
        this.canvasContext.lineWidth = this.currentBrushWidth;
        this.canvasContext.strokeRect(this.drawingStartPositionX, this.drawingStartPositionY, rectangleWidth, rectangleHeight);
    }

    showCirclePreview(currentXPosition, currentYPosition) {
        if (this.canvasSnapshotData) {
            this.canvasContext.putImageData(this.canvasSnapshotData, 0, 0);
        }
        const radiusDistance = Math.sqrt(Math.pow(currentXPosition - this.drawingStartPositionX, 2) + Math.pow(currentYPosition - this.drawingStartPositionY, 2));
        this.canvasContext.strokeStyle = this.currentDrawingColor;
        this.canvasContext.lineWidth = this.currentBrushWidth;
        this.canvasContext.beginPath();
        this.canvasContext.arc(this.drawingStartPositionX, this.drawingStartPositionY, radiusDistance, 0, 2 * Math.PI);
        this.canvasContext.stroke();
    }

    makeCirclePermanent() {
        const radiusDistance = Math.sqrt(Math.pow(this.lastRecordedPositionX - this.drawingStartPositionX, 2) + Math.pow(this.lastRecordedPositionY - this.drawingStartPositionY, 2));
        this.canvasContext.strokeStyle = this.currentDrawingColor;
        this.canvasContext.lineWidth = this.currentBrushWidth;
        this.canvasContext.beginPath();
        this.canvasContext.arc(this.drawingStartPositionX, this.drawingStartPositionY, radiusDistance, 0, 2 * Math.PI);
        this.canvasContext.stroke();
    }

    drawTextAtPosition(xCoordinate, yCoordinate, textContent, fontSizeInPixels = 16) {
        this.canvasContext.fillStyle = this.currentDrawingColor;
        this.canvasContext.font = fontSizeInPixels + 'px Arial';
        this.canvasContext.fillText(textContent, xCoordinate, yCoordinate);
    }
}