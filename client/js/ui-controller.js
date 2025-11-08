class UserInterfaceController {
    constructor(onToolChangeCallback, onColorChangeCallback, onWidthChangeCallback, onUndoCallback, onRedoCallback, onClearCallback) {
        this.currentlySelectedTool = 'brush';
        this.currentlySelectedColor = '#000000';
        this.currentlySelectedWidth = 3;
        
        // Cache DOM element references
        this.colorPickerElement = document.getElementById('color-picker');
        this.widthSliderElement = document.getElementById('stroke-width');
        this.widthDisplayElement = document.getElementById('width-value');
        this.undoButtonElement = document.getElementById('undo-btn');
        this.redoButtonElement = document.getElementById('redo-btn');
        this.clearButtonElement = document.getElementById('clear-btn');
        this.connectionStatusTextElement = document.getElementById('status-text');
        this.connectionStatusBarElement = document.getElementById('connection-status');
        this.usersContainerElement = document.getElementById('users-container');
        this.usersOnlineCountElement = document.getElementById('users-online-count');
        this.remoteUserCursorsContainerElement = document.getElementById('cursors-container');
        
        // Store callback functions
        this.onToolChangeCallback = onToolChangeCallback;
        this.onColorChangeCallback = onColorChangeCallback;
        this.onWidthChangeCallback = onWidthChangeCallback;
        
        // Configure event listeners
        this.setupUserInterfaceEventListeners();
        
        // Bind action button callbacks
        this.undoButtonElement.addEventListener('click', onUndoCallback);
        this.redoButtonElement.addEventListener('click', onRedoCallback);
        
        // Clear button with user confirmation
        this.clearButtonElement.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all drawings?')) {
                onClearCallback();
            }
        });
        
        console.log('UserInterfaceController initialized');
    }

    setupUserInterfaceEventListeners() {
        // Tool button selection
        document.querySelectorAll('.tool-btn').forEach(toolButtonElement => {
            toolButtonElement.addEventListener('click', (clickEvent) => {
                const selectedToolName = clickEvent.currentTarget.dataset.tool;
                this.selectToolAndUpdateUI(selectedToolName);
            });
        });
        
        // Color palette swatches
        document.querySelectorAll('.color-swatch').forEach(colorSwatchElement => {
            colorSwatchElement.addEventListener('click', (clickEvent) => {
                const selectedColorValue = clickEvent.currentTarget.dataset.color;
                this.selectColorAndUpdateUI(selectedColorValue);
                
                document.querySelectorAll('.color-swatch').forEach(swatch => swatch.classList.remove('active'));
                clickEvent.currentTarget.classList.add('active');
                
                this.colorPickerElement.value = selectedColorValue;
            });
        });
        
        // Custom color picker
        this.colorPickerElement.addEventListener('input', (inputEvent) => {
            this.currentlySelectedColor = inputEvent.target.value;
            this.onColorChangeCallback(this.currentlySelectedColor);
            
            document.querySelectorAll('.color-swatch').forEach(swatch => swatch.classList.remove('active'));
        });
        
        // Width slider
        this.widthSliderElement.addEventListener('input', (inputEvent) => {
            this.currentlySelectedWidth = parseInt(inputEvent.target.value);
            this.widthDisplayElement.textContent = this.currentlySelectedWidth + 'px';
            this.onWidthChangeCallback(this.currentlySelectedWidth);
        });
    }

    selectToolAndUpdateUI(toolNameToSelect) {
        this.currentlySelectedTool = toolNameToSelect;
        
        document.querySelectorAll('.tool-btn').forEach(toolButton => {
            toolButton.classList.remove('active');
        });
        
        document.querySelector(`[data-tool="${toolNameToSelect}"]`).classList.add('active');
        this.onToolChangeCallback(toolNameToSelect);
    }

    selectColorAndUpdateUI(colorValueToSelect) {
        this.currentlySelectedColor = colorValueToSelect;
        this.onColorChangeCallback(colorValueToSelect);
    }

    getCurrentlySelectedTool() {
        return this.currentlySelectedTool;
    }

    getCurrentlySelectedColor() {
        return this.currentlySelectedColor;
    }

    getCurrentlySelectedWidth() {
        return this.currentlySelectedWidth;
    }

    setUndoButtonEnabled(isButtonEnabled) {
        this.undoButtonElement.disabled = !isButtonEnabled;
    }

    setRedoButtonEnabled(isButtonEnabled) {
        this.redoButtonElement.disabled = !isButtonEnabled;
    }

    setConnectionStatusIndicator(isConnectedToServer) {
        if (isConnectedToServer) {
            this.connectionStatusTextElement.innerHTML = 'Connected to server';
            this.connectionStatusBarElement.classList.remove('bg-secondary', 'error', 'connecting');
            this.connectionStatusBarElement.classList.add('connected');
        } else {
            this.connectionStatusTextElement.innerHTML = 'Disconnected from server';
            this.connectionStatusBarElement.classList.remove('bg-secondary', 'connected', 'connecting');
            this.connectionStatusBarElement.classList.add('error');
        }
    }

    updateOnlineUsersList(activeUsersList) {
        // Update user count display
        if (this.usersOnlineCountElement) {
            this.usersOnlineCountElement.textContent = activeUsersList.length;
        }
        
        // Clear and rebuild user badges
        this.usersContainerElement.innerHTML = '';
        activeUsersList.forEach(userObject => {
            const userBadgeElement = document.createElement('div');
            userBadgeElement.className = 'user-badge';
            userBadgeElement.style.backgroundColor = userObject.color;
            userBadgeElement.textContent = userObject.id.substring(0, 4).toUpperCase();
            userBadgeElement.title = `User: ${userObject.id}`;
            this.usersContainerElement.appendChild(userBadgeElement);
        });
    }

    updateRemoteUserCursorPosition(cursorPositionObject, userColor) {
        let cursorElement = document.getElementById(`cursor-${cursorPositionObject.userId}`);
        
        if (!cursorElement) {
            cursorElement = document.createElement('div');
            cursorElement.id = `cursor-${cursorPositionObject.userId}`;
            cursorElement.className = 'remote-cursor';
            cursorElement.style.backgroundColor = userColor;
            cursorElement.dataset.user = cursorPositionObject.userId.substring(0, 6).toUpperCase();
            this.remoteUserCursorsContainerElement.appendChild(cursorElement);
        }
        
        cursorElement.style.left = `${cursorPositionObject.x}px`;
        cursorElement.style.top = `${cursorPositionObject.y}px`;
    }

    removeRemoteUserCursor(userIdToRemove) {
        const cursorElement = document.getElementById(`cursor-${userIdToRemove}`);
        if (cursorElement) {
            cursorElement.remove();
        }
    }
}