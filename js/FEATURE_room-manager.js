class CollaborativeRoomManager {
    constructor(realtimeCommunicationClientInstance, stateManager, uiController) {
        this.socketClient = realtimeCommunicationClientInstance;
        this.stateManager = stateManager;
        this.uiController = uiController;
        this.currentActiveRoomCode = null;
        this.roomsCollection = {};
        this.setupRoomEventHandlers();
        this.setupSocketListeners();
    }

    setupRoomEventHandlers() {
        const joinRoomButtonElement = document.getElementById('join-room-btn');
        const createRoomButtonElement = document.getElementById('create-room-btn');
        const roomCodeDisplayElement = document.getElementById('room-code-display');
        
        if (joinRoomButtonElement) {
            joinRoomButtonElement.addEventListener('click', () => {
                this.joinCollaborativeRoom();
            });
        }
        
        if (createRoomButtonElement) {
            createRoomButtonElement.addEventListener('click', () => {
                this.createNewRoom();
            });
        }
    }

    setupSocketListeners() {
        // Room management events
        this.socketClient.registerEventListener('room-created', (data) => {
            this.handleRoomCreated(data);
        });

        this.socketClient.registerEventListener('room-joined', (data) => {
            this.handleRoomJoined(data);
        });

        this.socketClient.registerEventListener('room-user-joined', (data) => {
            this.handleRoomUserJoined(data);
        });

        this.socketClient.registerEventListener('room-user-left', (data) => {
            this.handleRoomUserLeft(data);
        });

        this.socketClient.registerEventListener('room-users-update', (data) => {
            this.handleRoomUsersUpdate(data);
        });

        this.socketClient.registerEventListener('room-error', (data) => {
            this.handleRoomError(data);
        });
    }

    createNewRoom() {
        // Generate a random room code
        const roomCode = this.generateRoomCode();
        this.socketClient.emitEventToServer('create-room', { 
            roomCode: roomCode,
            userId: this.socketClient.getUserIdentifier()
        });
    }

    joinCollaborativeRoom(roomCodeValue = null) {
        const roomCodeToJoin = roomCodeValue || document.getElementById('room-id-input')?.value;
        
        if (!roomCodeToJoin) {
            alert('Please enter a room code');
            return;
        }
        
        if (roomCodeToJoin === this.currentActiveRoomCode) {
            return; // Already in this room
        }
        
        console.log('Attempting to join room:', roomCodeToJoin);
        this.socketClient.emitEventToServer('join-room', { 
            roomCode: roomCodeToJoin,
            userId: this.socketClient.getUserIdentifier()
        });
    }

    leaveCollaborativeRoom() {
        if (this.currentActiveRoomCode) {
            this.socketClient.emitEventToServer('leave-room', { 
                roomCode: this.currentActiveRoomCode,
                userId: this.socketClient.getUserIdentifier()
            });
            this.currentActiveRoomCode = null;
            this.updateRoomUserInterface();
        }
    }

    handleRoomCreated(data) {
        this.currentActiveRoomCode = data.roomCode;
        this.updateRoomUserInterface();
        this.showRoomNotification(`Room ${data.roomCode} created successfully!`);
        
        // Update room code display
        const roomCodeDisplay = document.getElementById('room-code-display');
        if (roomCodeDisplay) {
            roomCodeDisplay.textContent = `Room Code: ${data.roomCode}`;
            roomCodeDisplay.style.display = 'block';
        }
    }

    handleRoomJoined(data) {
        this.currentActiveRoomCode = data.roomCode;
        this.updateRoomUserInterface();
        this.showRoomNotification(`Joined room ${data.roomCode}`);
        
        // Update room code display
        const roomCodeDisplay = document.getElementById('room-code-display');
        if (roomCodeDisplay) {
            roomCodeDisplay.textContent = `Room Code: ${data.roomCode}`;
            roomCodeDisplay.style.display = 'block';
        }
        
        // Clear and reinitialize with room data if provided
        if (data.operations) {
            this.stateManager.setOperationsInList(data.operations);
        }
    }

    handleRoomUserJoined(data) {
        this.stateManager.addUserToConnectedList(data.user);
        this.uiController.updateOnlineUsersList(this.stateManager.getConnectedUsersList());
        this.showRoomNotification(`User ${data.user.id} joined the room`);
    }

    handleRoomUserLeft(data) {
        this.stateManager.removeUserFromConnectedList(data.userId);
        this.uiController.removeRemoteUserCursor(data.userId);
        this.uiController.updateOnlineUsersList(this.stateManager.getConnectedUsersList());
        this.showRoomNotification(`User ${data.userId} left the room`);
    }

    handleRoomUsersUpdate(data) {
        // Update user list with room-specific users
        this.stateManager.connectedUsersList.clear();
        data.users.forEach(user => {
            this.stateManager.addUserToConnectedList(user);
        });
        this.uiController.updateOnlineUsersList(this.stateManager.getConnectedUsersList());
    }

    handleRoomError(data) {
        alert(`Room Error: ${data.message}`);
        console.error('Room error:', data);
    }

    generateRoomCode() {
        // Generate a 6-character alphanumeric room code
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
                joinButtonElement.className = 'btn btn-danger';
            } else {
                joinButtonElement.textContent = 'Join Room';
                joinButtonElement.className = 'btn btn-primary';
            }
        }
        
        if (createButtonElement) {
            createButtonElement.disabled = !!this.currentActiveRoomCode;
        }
    }

    showRoomNotification(message) {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.className = 'room-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    broadcastEventToCollaborativeRoom(eventNameString, eventDataObject) {
        if (this.currentActiveRoomCode) {
            this.socketClient.emitEventToServer('room-broadcast', {
                roomCode: this.currentActiveRoomCode,
                event: eventNameString,
                data: eventDataObject
            });
        }
    }

    getCurrentActiveRoom() {
        return this.currentActiveRoomCode;
    }

    getRoomInformationObject() {
        return { 
            currentRoom: this.currentActiveRoomCode,
            users: this.stateManager.getConnectedUsersList()
        };
    }
}
