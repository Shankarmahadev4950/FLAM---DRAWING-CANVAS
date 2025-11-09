class CollaborativeRoomManager {
    constructor(realtimeCommunicationClientInstance, stateManager, uiController) {
        this.socketClient = realtimeCommunicationClientInstance;
        this.stateManager = stateManager;
        this.uiController = uiController;
        this.currentActiveRoomCode = null;
        this.setupRoomEventHandlers();
        this.setupSocketListeners();
    }

    setupRoomEventHandlers() {
        const joinRoomButton = document.getElementById('join-room-btn');
        const createRoomButton = document.getElementById('create-room-btn');
        
        if (joinRoomButton) {
            joinRoomButton.addEventListener('click', () => {
                this.joinCollaborativeRoom();
            });
        }
        
        if (createRoomButton) {
            createRoomButton.addEventListener('click', () => {
                this.createNewRoom();
            });
        }
    }

    setupSocketListeners() {
        this.socketClient.registerEventListener('room-created', (data) => {
            this.handleRoomCreated(data);
        });

        this.socketClient.registerEventListener('room-joined', (data) => {
            this.handleRoomJoined(data);
        });

        this.socketClient.registerEventListener('room-error', (data) => {
            this.handleRoomError(data);
        });
    }

    createNewRoom() {
        const roomCode = this.generateRoomCode();
        this.socketClient.emitEventToServer('create-room', { 
            roomCode: roomCode
        });
        console.log('Creating room:', roomCode);
    }

    joinCollaborativeRoom(roomCodeValue = null) {
        const roomCodeToJoin = roomCodeValue || document.getElementById('room-id-input')?.value;
        
        if (!roomCodeToJoin) {
            alert('Please enter a room code');
            return;
        }
        
        if (roomCodeToJoin === this.currentActiveRoomCode) {
            return;
        }
        
        console.log('Attempting to join room:', roomCodeToJoin);
        this.socketClient.emitEventToServer('join-room', { 
            roomCode: roomCodeToJoin
        });
    }

    leaveCollaborativeRoom() {
        if (this.currentActiveRoomCode) {
            this.socketClient.emitEventToServer('leave-room', { 
                roomCode: this.currentActiveRoomCode
            });
            this.currentActiveRoomCode = null;
            this.updateRoomUserInterface();
        }
    }

    handleRoomCreated(data) {
        this.currentActiveRoomCode = data.roomCode;
        this.updateRoomUserInterface();
        this.showRoomNotification(`Room ${data.roomCode} created successfully!`);
        
        const roomCodeDisplay = document.getElementById('room-code-display');
        const currentRoomCode = document.getElementById('current-room-code');
        if (roomCodeDisplay && currentRoomCode) {
            currentRoomCode.textContent = data.roomCode;
            roomCodeDisplay.style.display = 'block';
        }
    }

    handleRoomJoined(data) {
        this.currentActiveRoomCode = data.roomCode;
        this.updateRoomUserInterface();
        this.showRoomNotification(`Joined room ${data.roomCode}`);
        
        const roomCodeDisplay = document.getElementById('room-code-display');
        const currentRoomCode = document.getElementById('current-room-code');
        if (roomCodeDisplay && currentRoomCode) {
            currentRoomCode.textContent = data.roomCode;
            roomCodeDisplay.style.display = 'block';
        }
        
        // Update with room data
        if (data.operations) {
            this.stateManager.setOperationsInList(data.operations);
        }
        if (data.users) {
            this.stateManager.connectedUsersList.clear();
            data.users.forEach(user => {
                this.stateManager.addUserToConnectedList(user);
            });
            this.uiController.updateOnlineUsersList(this.stateManager.getConnectedUsersList());
        }
    }

    handleRoomError(data) {
        alert(`Room Error: ${data.message}`);
        console.error('Room error:', data);
    }

    generateRoomCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    updateRoomUserInterface() {
        const roomInputElement = document.getElementById('room-id-input');
        const joinButtonElement = document.getElementById('join-room-btn');
        const createButtonElement = document.getElementById('create-room-btn');
        
        if (roomInputElement) {
            roomInputElement.value = this.currentActiveRoomCode || '';
            roomInputElement.disabled = !!this.currentActiveRoomCode;
            roomInputElement.placeholder = this.currentActiveRoomCode ? 'In Room' : 'Enter Room Code';
        }
        
        if (joinButtonElement) {
            if (this.currentActiveRoomCode) {
                joinButtonElement.textContent = 'Leave Room';
                joinButtonElement.className = 'room-btn leave-btn';
                joinButtonElement.onclick = () => this.leaveCollaborativeRoom();
            } else {
                joinButtonElement.textContent = 'Join Room';
                joinButtonElement.className = 'room-btn join-btn';
                joinButtonElement.onclick = () => this.joinCollaborativeRoom();
            }
        }
        
        if (createButtonElement) {
            createButtonElement.disabled = !!this.currentActiveRoomCode;
        }
    }

    showRoomNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'room-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getCurrentActiveRoom() {
        return this.currentActiveRoomCode;
    }
}
