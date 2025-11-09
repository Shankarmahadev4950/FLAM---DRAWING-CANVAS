class RealtimeCommunicationClient {
    constructor(serverUrlString) {
        this.socketInstance = io(serverUrlString, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
            transports: ['websocket', 'polling']
        });

        this.uniqueUserIdentifier = this.generateUniqueUserIdentifier();
        this.setupConnectionHandlers();
        
        console.log('🔌 Socket Client created with ID:', this.uniqueUserIdentifier);
    }

    generateUniqueUserIdentifier() {
        return `user_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    }

    setupConnectionHandlers() {
        this.socketInstance.on('connect', () => {
            console.log('✅ Connected to server');
            this.socketInstance.emit('join', {
                userId: this.uniqueUserIdentifier
            });
        });

        this.socketInstance.on('disconnect', (reason) => {
            console.log('❌ Disconnected from server:', reason);
        });

        this.socketInstance.on('connect_error', (error) => {
            console.error('🔴 Connection error:', error);
        });

        this.socketInstance.on('reconnect', (attemptNumber) => {
            console.log('🔄 Reconnected after', attemptNumber, 'attempts');
        });

        // User count listener
        this.socketInstance.on('user-count', (count) => {
            console.log('👥 Total users:', count);
            this.updateUserCountDisplay(count);
        });
    }

    updateUserCountDisplay(count) {
        const onlineCount = document.querySelector('.online-count');
        if (onlineCount && !document.getElementById('user-list').children.length) {
            onlineCount.textContent = `${count} Online`;
        }
    }

    registerEventListener(eventName, callbackFunction) {
        this.socketInstance.on(eventName, callbackFunction);
    }

    emitEventToServer(eventName, dataPayload) {
        if (this.socketInstance.connected) {
            this.socketInstance.emit(eventName, dataPayload);
        }
    }

    emitDrawStartEvent(drawingData) {
        this.emitEventToServer('draw-start', {
            ...drawingData,
            userId: this.uniqueUserIdentifier
        });
    }

    emitDrawMoveEvent(pointData) {
        this.emitEventToServer('draw-move', pointData);
    }

    emitDrawEndEvent(strokeData) {
        this.emitEventToServer('draw-end', strokeData);
    }

    isSocketConnected() {
        return this.socketInstance && this.socketInstance.connected;
    }

    getUserIdentifier() {
        return this.uniqueUserIdentifier;
    }

    disconnect() {
        if (this.socketInstance) {
            this.socketInstance.disconnect();
        }
    }
}
