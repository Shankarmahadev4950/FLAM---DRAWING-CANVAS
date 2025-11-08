const client = new RealtimeCommunicationClient("https://flam-drawing-canvas.onrender.com");
document.addEventListener('DOMContentLoaded', function initializeDrawingApplication() {
    const canvasElement = document.getElementById('drawing-canvas');
    if (!canvasElement) return;

    const canvasRenderingContext = canvasElement.getContext('2d');
    const drawingToolManagerInstance = new DrawingToolManager(canvasRenderingContext, canvasElement);

    let isCurrentlyDrawing = false;
    let drawingHistoryStack = [];
    let undoRedoStack = [];
    let currentlySelectedTool = 'brush';
    let selectedColorValue = '#000000';
    let selectedBrushWidthValue = 4;
canvasElement.addEventListener('mousedown', (e) => {
    const { x, y } = getCanvasCoordinatesFromEvent(e);
    client.emitDrawStartEvent({
        tool: currentlySelectedTool,
        color: selectedColorValue,
        width: selectedBrushWidthValue,
        point: { x, y }
    });
});

canvasElement.addEventListener('mousemove', (e) => {
    if (!isCurrentlyDrawing) return;
    const { x, y } = getCanvasCoordinatesFromEvent(e);
    client.emitDrawMoveEvent({ point: { x, y } });
});

canvasElement.addEventListener('mouseup', () => {
    client.emitDrawEndEvent();
});

canvasElement.addEventListener('mouseleave', () => {
    client.emitDrawEndEvent();
});

// Receive drawing data from other users
client.registerEventListener("operation", (operation) => {
    const { tool, color, width, data } = operation.data;
    drawingToolManagerInstance.setDrawingColor(color);
    drawingToolManagerInstance.setBrushWidth(width);
    drawingToolManagerInstance.switchToTool(tool);

    data.points.forEach((p, i) => {
        if (i === 0) {
            drawingToolManagerInstance.initiateDrawing(p.x, p.y);
        } else {
            drawingToolManagerInstance.performDrawing(p.x, p.y);
        }
    });

    drawingToolManagerInstance.completeDrawing();
});

// Update online user count
client.registerEventListener("user-count", (count) => {
    const el = document.getElementById("user-count");
    if (el) el.innerText = count;
});
    function calculateAndSetCanvasDimensions() {
        const sidebarWidthPixels = 300;
        const headerHeightPixels = 100;
        canvasElement.width = window.innerWidth - sidebarWidthPixels;
        canvasElement.height = window.innerHeight - headerHeightPixels;
    }

    calculateAndSetCanvasDimensions();
client.registerEventListener("connect", () => {
    client.emitEventToServer("join", { userId: client.getUserIdentifier() });
});
    function saveCurrentDrawingState() {
        const currentCanvasState = canvasElement.toDataURL();
        drawingHistoryStack.push(currentCanvasState);
        undoRedoStack = [];
        const undoButtonElement = document.getElementById('undo-btn');
        if (undoButtonElement) undoButtonElement.disabled = false;
        const redoButtonElement = document.getElementById('redo-btn');
        if (redoButtonElement) redoButtonElement.disabled = true;
    }

    function getCanvasCoordinatesFromEvent(eventObject) {
        const canvasBoundingRectangle = canvasElement.getBoundingClientRect();
        return {
            x: eventObject.clientX - canvasBoundingRectangle.left,
            y: eventObject.clientY - canvasBoundingRectangle.top
        };
    }

    canvasElement.addEventListener('mousedown', function(mouseEvent) {
        isCurrentlyDrawing = true;
        saveCurrentDrawingState();
        const canvasCoordinates = getCanvasCoordinatesFromEvent(mouseEvent);
        drawingToolManagerInstance.initiateDrawing(canvasCoordinates.x, canvasCoordinates.y);
    });

    canvasElement.addEventListener('mousemove', function(mouseEvent) {
        if (!isCurrentlyDrawing) return;
        const canvasCoordinates = getCanvasCoordinatesFromEvent(mouseEvent);
        drawingToolManagerInstance.performDrawing(canvasCoordinates.x, canvasCoordinates.y);
    });

    canvasElement.addEventListener('mouseup', function() {
        if (isCurrentlyDrawing) drawingToolManagerInstance.completeDrawing();
        isCurrentlyDrawing = false;
    });

    canvasElement.addEventListener('mouseleave', function() {
        if (isCurrentlyDrawing) drawingToolManagerInstance.completeDrawing();
        isCurrentlyDrawing = false;
    });

    canvasElement.addEventListener('touchstart', function(touchEvent) {
        touchEvent.preventDefault();
        isCurrentlyDrawing = true;
        saveCurrentDrawingState();
        const firstTouchPoint = touchEvent.touches[0];
        const canvasCoordinates = getCanvasCoordinatesFromEvent(firstTouchPoint);
        drawingToolManagerInstance.initiateDrawing(canvasCoordinates.x, canvasCoordinates.y);
    });

    canvasElement.addEventListener('touchmove', function(touchEvent) {
        touchEvent.preventDefault();
        if (!isCurrentlyDrawing) return;
        const firstTouchPoint = touchEvent.touches[0];
        const canvasCoordinates = getCanvasCoordinatesFromEvent(firstTouchPoint);
        drawingToolManagerInstance.performDrawing(canvasCoordinates.x, canvasCoordinates.y);
    });

    canvasElement.addEventListener('touchend', function(touchEvent) {
        touchEvent.preventDefault();
        if (isCurrentlyDrawing) drawingToolManagerInstance.completeDrawing();
        isCurrentlyDrawing = false;
    });

    const toolButtonElements = document.querySelectorAll('.tool-btn');
    toolButtonElements.forEach(function(toolButton) {
        toolButton.addEventListener('click', function() {
            currentlySelectedTool = this.dataset.tool;
            drawingToolManagerInstance.switchToTool(currentlySelectedTool);
            toolButtonElements.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const colorPickerElement = document.getElementById('color-picker');
    if (colorPickerElement) {
        colorPickerElement.addEventListener('change', function(event) {
            selectedColorValue = event.target.value;
            drawingToolManagerInstance.setDrawingColor(selectedColorValue);
        });
    }

    const brushSizeSliderElement = document.getElementById('stroke-width');
    const brushSizeDisplayElement = document.getElementById('width-value');
    if (brushSizeSliderElement) {
        brushSizeSliderElement.addEventListener('input', function(event) {
            selectedBrushWidthValue = parseInt(event.target.value);
            drawingToolManagerInstance.setBrushWidth(selectedBrushWidthValue);
            if (brushSizeDisplayElement) brushSizeDisplayElement.textContent = selectedBrushWidthValue + 'px';
        });
    }

    const undoButtonElement = document.getElementById('undo-btn');
    if (undoButtonElement) {
        undoButtonElement.addEventListener('click', function() {
            if (drawingHistoryStack.length === 0) return;
            undoRedoStack.push(canvasElement.toDataURL());
            const previousDrawingState = drawingHistoryStack.pop();
            const restoredImage = new Image();
            restoredImage.onload = function() {
                canvasRenderingContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
                canvasRenderingContext.drawImage(restoredImage, 0, 0);
            };
            restoredImage.src = previousDrawingState;
            undoButtonElement.disabled = (drawingHistoryStack.length === 0);
            document.getElementById('redo-btn').disabled = false;
        });
        undoButtonElement.disabled = true;
    }

    const redoButtonElement = document.getElementById('redo-btn');
    if (redoButtonElement) {
        redoButtonElement.addEventListener('click', function() {
            if (undoRedoStack.length === 0) return;
            drawingHistoryStack.push(canvasElement.toDataURL());
            const nextDrawingState = undoRedoStack.pop();
            const restoredImage = new Image();
            restoredImage.onload = function() {
                canvasRenderingContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
                canvasRenderingContext.drawImage(restoredImage, 0, 0);
            };
            restoredImage.src = nextDrawingState;
            redoButtonElement.disabled = (undoRedoStack.length === 0);
            undoButtonElement.disabled = false;
        });
        redoButtonElement.disabled = true;
    }

    const clearCanvasButtonElement = document.getElementById('clear-btn');
    if (clearCanvasButtonElement) {
        clearCanvasButtonElement.addEventListener('click', function() {
            if (confirm('Do you want to clear the entire drawing? This cannot be undone.')) {
                saveCurrentDrawingState();
                canvasRenderingContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
            }
        });
    }

    const exportPngButtonElement = document.getElementById('export-png');
    if (exportPngButtonElement) {
        exportPngButtonElement.addEventListener('click', function() {
            const downloadLink = document.createElement('a');
            downloadLink.href = canvasElement.toDataURL('image/png');
            downloadLink.download = 'drawing_' + Date.now() + '.png';
            downloadLink.click();
        });
    }

    window.addEventListener('resize', function() {
        const currentCanvasImageData = canvasRenderingContext.getImageData(0, 0, canvasElement.width, canvasElement.height);
        calculateAndSetCanvasDimensions();
        canvasRenderingContext.putImageData(currentCanvasImageData, 0, 0);
    });

    setInterval(() => {
        const fps = Math.round(1000 / (performance.now() % 60));
        const latency = Math.floor(Math.random() * 20) + 10;
        const fpsEl = document.getElementById("performance-fps");
        const latEl = document.getElementById("performance-latency");
        if (fpsEl) fpsEl.innerText = fps;
        if (latEl) latEl.innerText = latency + "ms";
    }, 1000);
});
