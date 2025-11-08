let socketClient;
let canvasManager;
let drawingToolManager;

document.addEventListener('DOMContentLoaded', function() {
    socketClient = new RealtimeCommunicationClient(window.location.origin);
    canvasManager = new CanvasRenderingManager('drawing-canvas', socketClient);
    drawingToolManager = canvasManager.drawingToolManagerInstance;

    setupUIEventListeners();
    setupSocketEventListeners();
});

function setupUIEventListeners() {
    const colorPickerElement = document.getElementById('color-picker');
    if (colorPickerElement) {
        colorPickerElement.addEventListener('change', (event) => {
            canvasManager.setDrawingColor(event.target.value);
        });
    }

    const brushSizeSliderElement = document.getElementById('brush-size');
    if (brushSizeSliderElement) {
        brushSizeSliderElement.addEventListener('input', (event) => {
            canvasManager.setBrushWidth(parseInt(event.target.value));
            const sizeDisplayElement = document.getElementById('size-display');
            if (sizeDisplayElement) {
                sizeDisplayElement.textContent = event.target.value + 'px';
            }
        });
    }

    const clearCanvasButtonElement = document.getElementById('clear-btn');
    if (clearCanvasButtonElement) {
        clearCanvasButtonElement.addEventListener('click', () => {
            canvasManager.clearCanvasContent();
            if (socketClient && socketClient.isSocketConnected()) {
                socketClient.emitEventToServer('clear-all', {});
            }
        });
    }

    const undoButtonElement = document.getElementById('undo-btn');
    if (undoButtonElement) {
        undoButtonElement.addEventListener('click', () => {
            if (socketClient && socketClient.isSocketConnected()) {
                socketClient.emitEventToServer('undo', {});
            }
        });
    }

    const redoButtonElement = document.getElementById('redo-btn');
    if (redoButtonElement) {
        redoButtonElement.addEventListener('click', () => {
            if (socketClient && socketClient.isSocketConnected()) {
                socketClient.emitEventToServer('redo', {});
            }
        });
    }
}

function setupSocketEventListeners() {
    if (!socketClient) return;

    socketClient.registerEventListener('init', (data) => {
        console.log('Initialized with:', data);
    });

    socketClient.registerEventListener('user-joined', (data) => {
        console.log('User joined:', data);
    });

    socketClient.registerEventListener('user-list', (users) => {
        updateUserListDisplay(users);
    });

    socketClient.registerEventListener('operations-update', (data) => {
        console.log('Operations updated');
    });

    socketClient.registerEventListener('undo-redo-state', (state) => {
        console.log('Undo/Redo state updated');
    });
}

function updateUserListDisplay(users) {
    const onlineCountDisplay = document.querySelector('.online-count');
    if (onlineCountDisplay) {
        onlineCountDisplay.textContent = `${users.length} Online`;
    }
}
