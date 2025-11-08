class RealtimeCommunicationClient {
    constructor(serverUrlString) {
        this.socketInstance = io(serverUrlString, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        this.uniqueUserIdentifier = this.generateUniqueUserIdentifier();
        this.setupConnectionHandlers();
        console.log('RealtimeCommunicationClient initialized');
    }

    generateUniqueUserIdentifier() {
        return `user_${Math.random().toString(36).substring(2, 11)}`;
    }

    setupConnectionHandlers() {
        this.socketInstance.on('connect', () => {
            console.log('✅ Connected to server');
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
    }

    registerEventListener(eventName, callbackFunction) {
        this.socketInstance.on(eventName, callbackFunction);
    }

    emitEventToServer(eventName, dataPayload) {
        this.socketInstance.emit(eventName, dataPayload);
    }

    emitDrawStartEvent(drawingData) {
        this.socketInstance.emit('draw-start', drawingData);
    }

    emitDrawMoveEvent(pointData) {
        this.socketInstance.emit('draw-move', pointData);
    }

    emitDrawEndEvent(strokeData) {
        this.socketInstance.emit('draw-end', strokeData);
    }

    isSocketConnected() {
        return this.socketInstance.connected;
    }

    getUserIdentifier() {
        return this.uniqueUserIdentifier;
    }
}
