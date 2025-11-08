class CollaborativeRoomManager {
    constructor(realtimeCommunicationClientInstance) {
        this.socketClient = realtimeCommunicationClientInstance;
        this.currentActiveRoomCode = null;
        this.roomsCollection = {};
        this.setupRoomEventHandlers();
    }

    setupRoomEventHandlers() {
        const joinRoomButtonElement = document.getElementById('join-room-btn');
        if (joinRoomButtonElement) {
            joinRoomButtonElement.addEventListener('click', () => {
                this.joinCollaborativeRoom();
            });
        }
    }

    joinCollaborativeRoom(roomCodeValue = null) {
        const roomCodeToJoin = roomCodeValue || document.getElementById('room-id-input')?.value;
        
        if (!roomCodeToJoin) {
            alert('Please enter a room code');
            return;
        }
        
        this.currentActiveRoomCode = roomCodeToJoin;
        this.socketClient.emitEventToServer('join-room', { roomCode: roomCodeToJoin });
        console.log('Joined room:', roomCodeToJoin);
        this.updateRoomUserInterface();
    }

    leaveCollaborativeRoom() {
        if (this.currentActiveRoomCode) {
            this.socketClient.emitEventToServer('leave-room', { roomCode: this.currentActiveRoomCode });
            this.currentActiveRoomCode = null;
            this.updateRoomUserInterface();
        }
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

    updateRoomUserInterface() {
        const roomInputElement = document.getElementById('room-id-input');
        if (roomInputElement) {
            roomInputElement.value = this.currentActiveRoomCode || '';
            roomInputElement.disabled = !!this.currentActiveRoomCode;
        }
        
        const joinButtonElement = document.getElementById('join-room-btn');
        if (joinButtonElement) {
            joinButtonElement.textContent = this.currentActiveRoomCode ? 'Leave Room' : 'Join Room';
            joinButtonElement.onclick = () => {
                if (this.currentActiveRoomCode) {
                    this.leaveCollaborativeRoom();
                } else {
                    this.joinCollaborativeRoom();
                }
            };
        }
    }

    getRoomInformationObject() {
        return { currentRoom: this.currentActiveRoomCode };
    }
}