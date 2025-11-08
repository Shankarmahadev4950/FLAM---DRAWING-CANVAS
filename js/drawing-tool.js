class DrawingToolManager {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.isCurrentlyDrawing = false;
        this.activeToolName = 'brush';
        this.currentDrawingColor = '#000000';
        this.currentBrushWidth = 3;
        this.drawingStartPositionX = 0;
        this.drawingStartPositionY = 0;
        this.lastRecordedPositionX = 0;
        this.lastRecordedPositionY = 0;
    }

    switchToTool(toolNameToSelect) {
        this.activeToolName = toolNameToSelect;
        
        // Update cursor based on tool
        if (toolNameToSelect === 'eraser') {
            this.canvas.style.cursor = 'crosshair';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    setDrawingColor(colorValue) {
        this.currentDrawingColor = colorValue;
    }

    setBrushWidth(widthValue) {
        this.currentBrushWidth = widthValue;
    }

    initiateDrawing(startX, startY) {
        this.isCurrentlyDrawing = true;
        this.drawingStartPositionX = startX;
        this.drawingStartPositionY = startY;
        this.lastRecordedPositionX = startX;
        this.lastRecordedPositionY = startY;

        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        
        // Set drawing styles
        if (this.activeToolName === 'eraser') {
            this.ctx.globalCompositeOperation = 'destination-out';
        } else {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = this.currentDrawingColor;
        }
        
        this.ctx.lineWidth = this.currentBrushWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    performDrawing(currentX, currentY) {
        if (!this.isCurrentlyDrawing) return;

        if (this.activeToolName === 'brush' || this.activeToolName === 'eraser') {
            this.ctx.lineTo(currentX, currentY);
            this.ctx.stroke();
        }
        
        this.lastRecordedPositionX = currentX;
        this.lastRecordedPositionY = currentY;
    }

    completeDrawing() {
        if (!this.isCurrentlyDrawing) return;
        
        this.ctx.closePath();
        this.isCurrentlyDrawing = false;
        
        // Reset composite operation
        this.ctx.globalCompositeOperation = 'source-over';
    }

    drawTextAtPosition(x, y, textContent) {
        this.ctx.fillStyle = this.currentDrawingColor;
        this.ctx.font = '16px Arial';
        this.ctx.fillText(textContent, x, y);
    }

    // Additional methods for shape tools
    drawLine(startX, startY, endX, endY) {
        this.ctx.strokeStyle = this.currentDrawingColor;
        this.ctx.lineWidth = this.currentBrushWidth;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
    }

    drawRectangle(startX, startY, width, height) {
        this.ctx.strokeStyle = this.currentDrawingColor;
        this.ctx.lineWidth = this.currentBrushWidth;
        this.ctx.strokeRect(startX, startY, width, height);
    }

    drawCircle(centerX, centerY, radius) {
        this.ctx.strokeStyle = this.currentDrawingColor;
        this.ctx.lineWidth = this.currentBrushWidth;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
}
