class DrawingToolManager {
    constructor(canvasContext, canvasElement) {
        this.canvasContext = canvasContext;
        this.canvasElement = canvasElement;
        this.activeToolName = 'brush';
        this.currentDrawingColor = '#000000';
        this.currentBrushWidth = 4;
        this.isCurrentlyDrawing = false;
        this.lastRecordedPositionX = 0;
        this.lastRecordedPositionY = 0;
    }

    switchToTool(toolName) {
        this.activeToolName = toolName;
        
        if (toolName === 'eraser') {
            this.canvasElement.style.cursor = 'crosshair';
        } else {
            this.canvasElement.style.cursor = 'crosshair';
        }
    }

    setDrawingColor(color) {
        this.currentDrawingColor = color;
    }

    setBrushWidth(width) {
        this.currentBrushWidth = width;
    }

    initiateDrawing(x, y) {
        this.isCurrentlyDrawing = true;
        this.lastRecordedPositionX = x;
        this.lastRecordedPositionY = y;
        
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(x, y);
    }

    performDrawing(x, y) {
        if (!this.isCurrentlyDrawing) return;

        this.canvasContext.strokeStyle = this.currentDrawingColor;
        this.canvasContext.lineWidth = this.currentBrushWidth;
        this.canvasContext.lineCap = 'round';
        this.canvasContext.lineJoin = 'round';

        if (this.activeToolName === 'eraser') {
            this.canvasContext.globalCompositeOperation = 'destination-out';
        } else {
            this.canvasContext.globalCompositeOperation = 'source-over';
        }

        this.canvasContext.lineTo(x, y);
        this.canvasContext.stroke();
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(x, y);

        this.lastRecordedPositionX = x;
        this.lastRecordedPositionY = y;
    }

    completeDrawing() {
        this.isCurrentlyDrawing = false;
        this.canvasContext.beginPath();
        this.canvasContext.globalCompositeOperation = 'source-over';
    }
}
