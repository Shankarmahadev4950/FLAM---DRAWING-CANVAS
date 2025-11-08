let socketClient;
let canvasManager;
let drawingToolManager;

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== App Starting ===');
    
    try {
        socketClient = new RealtimeCommunicationClient(window.location.origin);
        console.log('✅ Socket client created');
        
        canvasManager = new CanvasRenderingManager('drawing-canvas', socketClient);
        console.log('✅ Canvas manager created');
        
        drawingToolManager = canvasManager.drawingToolManagerInstance;
        console.log('✅ Drawing tool manager assigned');

        setupUIEventListeners();
        setupSocketEventListeners();
        
        console.log('=== App Initialized Successfully ===');
    } catch (error) {
        console.error('❌ Error during initialization:', error);
    }
});

function setupUIEventListeners() {
    const colorPickerElement = document.getElementById('color-picker');
    if (colorPickerElement) {
        colorPickerElement.addEventListener('change', (event) => {
            canvasManager.setDrawingColor(event.target.value);
            console.log('Color changed to:', event.target.value);
        });
    }

    const brushSizeSliderElement = document.getElementById('brush-size');
    if (brushSizeSliderElement) {
        brushSizeSliderElement.addEventListener('input', (event) => {
            const size = parseInt(event.target.value);
            canvasManager.setBrushWidth(size);
            
            const sizeDisplayElement = document.getElementById('size-display');
            if (sizeDisplayElement) {
                sizeDisplayElement.textContent = size + 'px';
            }
            console.log('Brush size changed to:', size);
        });
    }

    const clearCanvasButtonElement = document.getElementById('clear-btn');
    if (clearCanvasButtonElement) {
        clearCanvasButtonElement.addEventListener('click', () => {
            canvasManager.clearCanvasContent();
            
            if (socketClient && socketClient.isSocketConnected()) {
                socketClient.emitEventToServer('clear-all', {});
                console.log('Clear canvas event sent to server');
            }
        });
    }

    const undoButtonElement = document.getElementById('undo-btn');
    if (undoButtonElement) {
        undoButtonElement.addEventListener('click', () => {
            if (socketClient && socketClient.isSocketConnected()) {
                socketClient.emitEventToServer('undo', {});
                console.log('Undo event sent to server');
            }
        });
    }

    const redoButtonElement = document.getElementById('redo-btn');
    if (redoButtonElement) {
        redoButtonElement.addEventListener('click', () => {
            if (socketClient && socketClient.isSocketConnected()) {
                socketClient.emitEventToServer('redo', {});
                console.log('Redo event sent to server');
            }
        });
    }

    console.log('✅ UI event listeners setup complete');
}

function setupSocketEventListeners() {
    if (!socketClient) {
        console.error('❌ Socket client not available');
        return;
    }

    socketClient.registerEventListener('init', (data) => {
        console.log('🎨 Initialized with data:', data);
        if (data.operations && data.operations.length > 0) {
            console.log(`Loaded ${data.operations.length} existing operations`);
        }
    });

    socketClient.registerEventListener('user-joined', (data) => {
        console.log('👤 User joined:', data);
    });

    socketClient.registerEventListener('user-left', (data) => {
        console.log('👋 User left:', data);
    });

    socketClient.registerEventListener('user-list', (users) => {
        console.log('👥 User list updated:', users);
        updateUserListDisplay(users);
    });

    socketClient.registerEventListener('operations-update', (data) => {
        console.log('🔄 Operations updated:', data);
    });

    socketClient.registerEventListener('undo-redo-state', (state) => {
        console.log('↩️ Undo/Redo state:', state);
        updateUndoRedoButtons(state);
    });

    socketClient.registerEventListener('operation', (operation) => {
        console.log('✏️ Operation received:', operation);
    });

    socketClient.registerEventListener('canvas-cleared', () => {
        console.log('🗑️ Canvas cleared by remote user');
    });

    console.log('✅ Socket event listeners setup complete');
}

function updateUserListDisplay(users) {
    const onlineCountDisplay = document.querySelector('.online-count');
    if (onlineCountDisplay) {
        onlineCountDisplay.textContent = `${users.length} Online`;
    }

    const userListElement = document.getElementById('user-list');
    if (userListElement) {
        userListElement.innerHTML = '';
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.style.color = user.color;
            userItem.textContent = user.id;
            userListElement.appendChild(userItem);
        });
    }
}

function updateUndoRedoButtons(state) {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    if (undoBtn) {
        undoBtn.disabled = !state.canUndo;
    }

    if (redoBtn) {
        redoBtn.disabled = !state.canRedo;
    }
}
