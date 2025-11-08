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
        this.setupAdditionalListeners(); 
        this.socketInstance.on("user-count", (count) => {
    document.getElementById("user-count").innerText = count;
});
        console.log('RealtimeCommunicationClient initialized with User ID:', this.uniqueUserIdentifier);
    }

    generateUniqueUserIdentifier() {
        return `user_${Math.random().toString(36).substring(2, 11)}`;
    }

    setupConnectionHandlers() {
        this.socketInstance.on('connect', () => {
            console.log('Connected to WebSocket server');
        });

        this.socketInstance.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
        });

        this.socketInstance.on('connect_error', (errorObject) => {
            console.error('WebSocket connection error:', errorObject);
        });
    }
    setupAdditionalListeners() {
        this.socketInstance.on("user-count", (count) => {
            const el = document.getElementById("user-count");
            if (el) el.innerText = count;
            console.log("Online Users Updated:", count);
        });
    }

    registerEventListener(eventNameToListen, callbackFunction) {
        this.socketInstance.on(eventNameToListen, callbackFunction);
    }

    emitEventToServer(eventNameToEmit, eventDataObject) {
        this.socketInstance.emit(eventNameToEmit, eventDataObject);
    }

    getUserIdentifier() {
        return this.uniqueUserIdentifier;
    }

    isSocketConnected() {
        return this.socketInstance.connected;
    }

    emitDrawStartEvent(operationDataObject) {
        this.emitEventToServer('draw-start', { ...operationDataObject, userId: this.uniqueUserIdentifier });
    }

    emitDrawMoveEvent(pointsDataObject) {
        this.emitEventToServer('draw-move', pointsDataObject);
    }

    emitDrawEndEvent() {
        this.emitEventToServer('draw-end', {});
    }

    emitCursorPositionEvent(positionDataObject) {
        this.emitEventToServer('cursor-move', { userId: this.uniqueUserIdentifier, ...positionDataObject });
    }

    emitUndoActionEvent() {
        this.emitEventToServer('undo', { userId: this.uniqueUserIdentifier });
    }

    emitRedoActionEvent() {
        this.emitEventToServer('redo', { userId: this.uniqueUserIdentifier });
    }

    emitClearCanvasEvent() {
        this.emitEventToServer('clear-all', { userId: this.uniqueUserIdentifier });
    }
}
