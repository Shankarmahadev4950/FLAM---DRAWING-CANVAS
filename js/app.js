let socketClient;
let canvasManager;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 === App Initializing ===');
    
    try {
        socketClient = new RealtimeCommunicationClient(window.location.origin);
        console.log('✅ Socket client created');
        
        canvasManager = new CanvasRenderingManager('drawing-canvas', socketClient);
        console.log('✅ Canvas manager created');

        setupUIEventListeners();
        setupSocketEventListeners();
        
        console.log('🚀 === App Initialized Successfully ===');
    } catch (error) {
        console.error('❌ Error during initialization:', error);
    }
});

function setupUIEventListeners() {
    const colorPicker = document.getElementById('color-picker');
    if (colorPicker) {
        colorPicker.addEventListener('change', (e) => {
            canvasManager.setDrawingColor(e.target.value);
        });
    }

    const brushSize = document.getElementById('brush-size');
    if (brushSize) {
        brushSize.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            canvasManager.setBrushWidth(size);
            
            const sizeDisplay = document.getElementById('size-value');
            if (sizeDisplay) {
                sizeDisplay.textContent = size + 'px';
            }
        });
    }

    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear the entire canvas?')) {
                canvasManager.clearCanvasContent();
                if (socketClient && socketClient.isSocketConnected()) {
                    socketClient.emitEventToServer('clear-all', {});
                }
            }
        });
    }

    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            if (socketClient && socketClient.isSocketConnected()) {
                socketClient.emitEventToServer('undo', {});
            }
        });
    }

    const redoBtn = document.getElementById('redo-btn');
    if (redoBtn) {
        redoBtn.addEventListener('click', () => {
            if (socketClient && socketClient.isSocketConnected()) {
                socketClient.emitEventToServer('redo', {});
            }
        });
    }
}

function setupSocketEventListeners() {
    if (!socketClient) return;

    socketClient.registerEventListener('connect', () => {
        updateConnectionStatus(true);
        console.log('✅ Connected to server');
    });

    socketClient.registerEventListener('disconnect', () => {
        updateConnectionStatus(false);
        console.log('❌ Disconnected');
    });

    socketClient.registerEventListener('init', (data) => {
        console.log('🎨 Canvas initialized:', data);
        updateOnlineCount(data.users ? data.users.length : 0);
    });

    socketClient.registerEventListener('user-joined', (data) => {
        console.log('👤 User joined:', data.id);
    });

    socketClient.registerEventListener('user-left', (data) => {
        console.log('👋 User left:', data.userId);
    });

    socketClient.registerEventListener('user-list', (users) => {
        updateOnlineCount(users.length);
        console.log('👥 Users online:', users);
    });

    socketClient.registerEventListener('user-count', (count) => {
        updateOnlineCount(count);
    });

    socketClient.registerEventListener('undo-redo-state', (state) => {
        updateUndoRedoButtons(state);
    });
}

function updateConnectionStatus(connected) {
    const status = document.getElementById('status-indicator');
    if (status) {
        status.textContent = connected ? 'Connected' : 'Disconnected';
        status.classList.toggle('disconnected', !connected);
    }
}

function updateOnlineCount(count) {
    const onlineCount = document.getElementById('online-count');
    if (onlineCount) {
        onlineCount.textContent = `${count} Online`;
    }
}

function updateUndoRedoButtons(state) {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    
    if (undoBtn) undoBtn.disabled = !state.canUndo;
    if (redoBtn) redoBtn.disabled = !state.canRedo;
}

console.log('✅ app.js loaded');
