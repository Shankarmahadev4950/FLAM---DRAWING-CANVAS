let socketClient;
let canvasManager;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 === App Initializing ===');
    
    try {
        // Initialize Socket Client
        socketClient = new RealtimeCommunicationClient(window.location.origin);
        console.log('✅ Socket client created');
        
        // Initialize Canvas Manager
        canvasManager = new CanvasRenderingManager('drawing-canvas', socketClient);
        console.log('✅ Canvas manager created');

        // Setup UI Event Listeners
        setupUIEventListeners();
        
        // Setup Socket Event Listeners
        setupSocketEventListeners();
        
        console.log('🚀 === App Initialized Successfully ===');
    } catch (error) {
        console.error('❌ Error during initialization:', error);
    }
});

function setupUIEventListeners() {
    // Color Picker
    const colorPicker = document.getElementById('color-picker');
    if (colorPicker) {
        colorPicker.addEventListener('change', (e) => {
            canvasManager.setDrawingColor(e.target.value);
            console.log('Color changed to:', e.target.value);
        });
    }

    // Brush Size
    const brushSize = document.getElementById('brush-size');
    if (brushSize) {
        brushSize.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            canvasManager.setBrushWidth(size);
            
            const sizeDisplay = document.getElementById('size-display');
            if (sizeDisplay) {
                sizeDisplay.textContent = size + 'px';
            }
        });
    }

    // Clear Button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Clear the entire canvas? This will affect all users!')) {
                canvasManager.clearCanvasContent();
                if (socketClient && socketClient.isSocketConnected()) {
                    socketClient.emitEventToServer('clear-all', {});
                }
            }
        });
    }

    // Undo Button
    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            if (socketClient && socketClient.isSocketConnected()) {
                socketClient.emitEventToServer('undo', {});
            }
        });
    }

    // Redo Button
    const redoBtn = document.getElementById('redo-btn');
    if (redoBtn) {
        redoBtn.addEventListener('click', () => {
            if (socketClient && socketClient.isSocketConnected()) {
                socketClient.emitEventToServer('redo', {});
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

    // Connection Status
    socketClient.registerEventListener('connect', () => {
        updateConnectionStatus(true);
    });

    socketClient.registerEventListener('disconnect', () => {
        updateConnectionStatus(false);
    });

    // Init Event
    socketClient.registerEventListener('init', (data) => {
        console.log('🎨 Canvas initialized:', data);
    });

    // User Events
    socketClient.registerEventListener('user-joined', (data) => {
        console.log('👤 User joined:', data);
        showNotification(`${data.id} joined!`, 'success');
    });

    socketClient.registerEventListener('user-left', (data) => {
        console.log('👋 User left:', data);
        showNotification(`${data.userId} left`, 'info');
    });

    socketClient.registerEventListener('user-list', (users) => {
        updateUserList(users);
    });

    // Undo/Redo State
    socketClient.registerEventListener('undo-redo-state', (state) => {
        updateUndoRedoButtons(state);
    });

    // Operations Update (for undo/redo)
    socketClient.registerEventListener('operations-update', (data) => {
        canvasManager.redrawAllOperations(data.operations);
    });

    console.log('✅ Socket event listeners setup complete');
}

function updateConnectionStatus(connected) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (statusDot && statusText) {
        if (connected) {
            statusDot.classList.add('connected');
            statusText.textContent = 'Connected';
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Disconnected';
        }
    }
}

function updateUserList(users) {
    const userListElement = document.getElementById('user-list');
    const onlineCount = document.querySelector('.online-count');
    
    if (!userListElement) return;
    
    userListElement.innerHTML = '';
    
    users.forEach((user, index) => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <span class="user-dot" style="background: ${user.color};"></span>
            <span class="user-name">${user.id === socketClient.getUserIdentifier() ? 'You' : 'User ' + (index + 1)}</span>
        `;
        userListElement.appendChild(userItem);
    });
    
    if (onlineCount) {
        onlineCount.textContent = `${users.length} Online`;
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

function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // You can add a toast notification here if you want
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (socketClient) {
        socketClient.disconnect();
    }
});
