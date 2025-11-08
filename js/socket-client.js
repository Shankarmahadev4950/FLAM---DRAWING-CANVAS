class RealtimeCommunicationClient {
    constructor(serverUrlString) {
        console.log('Creating socket connection to:', serverUrlString);
        
        this.socketInstance = io(serverUrlString, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        this.uniqueUserIdentifier = this.generateUniqueUserIdentifier();
        this.setupConnectionHandlers();
        
        console.log('RealtimeCommunicationClient initialized with ID:', this.uniqueUserIdentifier);
    }

    generateUniqueUserIdentifier() {
        return `user_${Math.random().toString(36).substring(2, 11)}`;
    }

    setupConnectionHandlers() {
        this.socketInstance.on('connect', () => {
            console.log('✅ Connected to server');
            // Automatically join room on connection
            this.socketInstance.emit('join', {
                userId: this.uniqueUserIdentifier
            });
        });

        this.socketInstance.on('disconnect', () => {
            console.log('❌ Disconnected from server');
        });

        this.socketInstance.on('connect_error', (errorObject) => {
            console.error('🔴 Connection error:', errorObject);
        });

        // Listen for user count updates
        this.socketInstance.on('user-count', (count) => {
            console.log('👥 User count updated:', count);
            this.updateUserCount(count);
        });
    }

    updateUserCount(count) {
        // Update multiple possible elements
        const userCountElement = document.getElementById('user-count');
        if (userCountElement) {
            userCountElement.textContent = count;
        }

        const onlineCountElement = document.querySelector('.online-count');
        if (onlineCountElement) {
            onlineCountElement.textContent = `${count} Online`;
        }

        const statusElement = document.querySelector('.status');
        if (statusElement) {
            statusElement.textContent = count > 1 ? `${count} users online` : '1 user online';
        }
    }

    registerEventListener(eventName, callbackFunction) {
        console.log('Registering listener for:', eventName);
        this.socketInstance.on(eventName, callbackFunction);
    }

    emitEventToServer(eventName, dataPayload) {
        console.log('Emitting event:', eventName);
        this.socketInstance.emit(eventName, dataPayload);
    }

    emitDrawStartEvent(drawingData) {
        console.log('Draw start event:', drawingData);
        this.socketInstance.emit('draw-start', {
            ...drawingData,
            userId: this.uniqueUserIdentifier
        });
    }

    emitDrawMoveEvent(pointData) {
        this.socketInstance.emit('draw-move', pointData);
    }

    emitDrawEndEvent(strokeData) {
        console.log('Draw end event:', strokeData);
        this.socketInstance.emit('draw-end', strokeData);
    }

    isSocketConnected() {
        return this.socketInstance.connected;
    }

    getUserIdentifier() {
        return this.uniqueUserIdentifier;
    }
}
