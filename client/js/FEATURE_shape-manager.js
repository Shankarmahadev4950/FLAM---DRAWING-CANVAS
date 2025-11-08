class ShapeDrawingManager {
    constructor(canvasContextObject) {
        this.canvasContext = canvasContextObject;
        this.shapeStartXCoordinate = 0;
        this.shapeStartYCoordinate = 0;
        this.isShapeDrawingActive = false;
    }

    initiateShapeDrawing(startXValue, startYValue) {
        this.shapeStartXCoordinate = startXValue;
        this.shapeStartYCoordinate = startYValue;
        this.isShapeDrawingActive = true;
    }

    drawLineShape(fromXPosition, fromYPosition, toXPosition, toYPosition, colorValue, strokeWidthValue) {
        this.canvasContext.strokeStyle = colorValue;
        this.canvasContext.lineWidth = strokeWidthValue;
        this.canvasContext.lineCap = 'round';
        this.canvasContext.lineJoin = 'round';
        this.canvasContext.beginPath();
        this.canvasContext.moveTo(fromXPosition, fromYPosition);
        this.canvasContext.lineTo(toXPosition, toYPosition);
        this.canvasContext.stroke();
    }

    drawRectangleShape(xPosition, yPosition, rectWidthValue, rectHeightValue, colorValue, strokeWidthValue, shouldFillShape = false) {
        this.canvasContext.strokeStyle = colorValue;
        this.canvasContext.lineWidth = strokeWidthValue;
        
        if (shouldFillShape) {
            this.canvasContext.fillStyle = colorValue;
            this.canvasContext.globalAlpha = 0.3;
            this.canvasContext.fillRect(xPosition, yPosition, rectWidthValue, rectHeightValue);
            this.canvasContext.globalAlpha = 1;
        }
        
        this.canvasContext.strokeRect(xPosition, yPosition, rectWidthValue, rectHeightValue);
    }

    drawCircleShape(centerXPosition, centerYPosition, radiusValue, colorValue, strokeWidthValue, shouldFillShape = false) {
        this.canvasContext.strokeStyle = colorValue;
        this.canvasContext.lineWidth = strokeWidthValue;
        this.canvasContext.beginPath();
        this.canvasContext.arc(centerXPosition, centerYPosition, Math.abs(radiusValue), 0, 2 * Math.PI);
        
        if (shouldFillShape) {
            this.canvasContext.fillStyle = colorValue;
            this.canvasContext.globalAlpha = 0.3;
            this.canvasContext.fill();
            this.canvasContext.globalAlpha = 1;
        }
        
        this.canvasContext.stroke();
    }

    drawTextShape(textContentString, xPosition, yPosition, colorValue, fontSizeValue = 16, fontFamilyString = 'Arial') {
        this.canvasContext.fillStyle = colorValue;
        this.canvasContext.font = `${fontSizeValue}px ${fontFamilyString}`;
        this.canvasContext.fillText(textContentString, xPosition, yPosition);
    }

    drawImageShape(imageObject, xPosition, yPosition, imageWidthValue, imageHeightValue) {
        this.canvasContext.drawImage(imageObject, xPosition, yPosition, imageWidthValue, imageHeightValue);
    }

    completeShapeDrawing() {
        this.isShapeDrawingActive = false;
    }
}