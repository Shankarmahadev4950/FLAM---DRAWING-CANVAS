class DrawingTool {
    constructor(ctx, canvas, socketClient) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.socketClient = socketClient;
        this.currentTool = 'brush';
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.lastX = 0;
        this.lastY = 0;
        this.color = '#000000';
        this.width = 3;
        this.imageData = null;
        this.currentStroke = [];
    }

    setTool(tool) {
        this.currentTool = tool;
        console.log('Tool changed to:', tool);
        if (tool === 'text') {
            this.canvas.style.cursor = 'text';
        } else if (tool === 'eraser') {
            this.canvas.style.cursor = 'grab';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    setColor(color) {
        this.color = color;
    }

    setWidth(width) {
        this.width = width;
    }

    startDrawing(x, y) {
        this.isDrawing = true;
        this.startX = x;
        this.startY = y;
        this.lastX = x;
        this.lastY = y;
        this.currentStroke = [];

        // Emit draw-start event to server
        if (this.socketClient && this.socketClient.isConnected()) {
            this.socketClient.emit('draw-start', {
                tool: this.currentTool,
                x: x,
                y: y,
                color: this.color,
                width: this.width
            });
        }

        if (this.currentTool === 'line' || this.currentTool === 'rectangle' || this.currentTool === 'circle') {
            this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    draw(x, y) {
        if (!this.isDrawing) return;

        if (this.currentTool === 'brush') {
            this.drawBrush(x, y);
        } else if (this.currentTool === 'eraser') {
            this.drawEraser(x, y);
        } else if (this.currentTool === 'line') {
            this.previewLine(x, y);
        } else if (this.currentTool === 'rectangle') {
            this.previewRectangle(x, y);
        } else if (this.currentTool === 'circle') {
            this.previewCircle(x, y);
        }

        // Collect stroke points
        this.currentStroke.push({ x, y });

        // Emit draw-move event to server
        if (this.socketClient && this.socketClient.isConnected()) {
            this.socketClient.emit('draw-move', {
                point: { x, y }
            });
        }
    }

    endDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.currentTool === 'line') {
            this.finalizeLine();
        } else if (this.currentTool === 'rectangle') {
            this.finalizeRectangle();
        } else if (this.currentTool === 'circle') {
            this.finalizeCircle();
        }

        // Emit draw-end event with complete stroke
        if (this.socketClient && this.socketClient.isConnected()) {
            this.socketClient.emit('draw-end', {
                tool: this.currentTool,
                color: this.color,
                width: this.width,
                points: this.currentStroke,
                startX: this.startX,
                startY: this.startY,
                endX: this.lastX,
                endY: this.lastY
            });
        }

        this.currentStroke = [];
    }

    drawBrush(x, y) {
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.lastX = x;
        this.lastY = y;
    }

    drawEraser(x, y) {
        this.ctx.clearRect(x - this.width / 2, y - this.width / 2, this.width, this.width);
        this.lastX = x;
        this.lastY = y;
    }

    previewLine(x, y) {
        if (this.imageData) {
            this.ctx.putImageData(this.imageData, 0, 0);
        }
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.width;
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    finalizeLine() {
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.width;
        this.ctx.beginPath();
        this.ctx.moveTo(this.startX, this.startY);
        this.ctx.lineTo(this.lastX, this.lastY);
        this.ctx.stroke();
    }

    previewRectangle(x, y) {
        if (this.imageData) {
            this.ctx.putImageData(this.imageData, 0, 0);
        }
        const width = x - this.startX;
        const height = y - this.startY;
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.width;
        this.ctx.strokeRect(this.startX, this.startY, width, height);
    }

    finalizeRectangle() {
        const width = this.lastX - this.startX;
        const height = this.lastY - this.startY;
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.width;
        this.ctx.strokeRect(this.startX, this.startY, width, height);
    }

    previewCircle(x, y) {
        if (this.imageData) {
            this.ctx.putImageData(this.imageData, 0, 0);
        }
        const radius = Math.sqrt(Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2));
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.width;
        this.ctx.beginPath();
        this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    finalizeCircle() {
        const radius = Math.sqrt(Math.pow(this.lastX - this.startX, 2) + Math.pow(this.lastY - this.startY, 2));
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.width;
        this.ctx.beginPath();
        this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    drawText(x, y, text, fontSize = 16) {
        this.ctx.fillStyle = this.color;
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.fillText(text, x, y);

        // Emit text draw event
        if (this.socketClient && this.socketClient.isConnected()) {
            this.socketClient.emit('draw-end', {
                tool: 'text',
                x: x,
                y: y,
                text: text,
                color: this.color,
                fontSize: fontSize
            });
        }
    }
}
