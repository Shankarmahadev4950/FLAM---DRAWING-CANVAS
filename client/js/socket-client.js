class RealtimeCommunicationClient {
    constructor(serverUrl = '') {
        // Use current origin if no server URL provided (for deployed environment)
        const url = serverUrl || window.location.origin;
        this.socketInstance = io(url, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        this.uniqueUserIdentifier = this.generateUniqueUserIdentifier();

        this.setupConnectionHandlers();
        this.setupUserCountListener();

        console.log("RealtimeCommunicationClient initialized with user ID:", this.uniqueUserIdentifier);
    }

    generateUniqueUserIdentifier() {
        // Generate a more readable user ID
        return `user_${Math.random().toString(36).substring(2, 6)}`;
    }

    setupConnectionHandlers() {
        this.socketInstance.on("connect", () => {
            console.log("Connected to WebSocket Server ✅");
        });

        this.socketInstance.on("disconnect", () => {
            console.log("Disconnected from WebSocket Server ❌");
        });

        this.socketInstance.on("connect_error", (errorObject) => {
            console.error("WebSocket Connection Error:", errorObject);
        });
    }

    setupUserCountListener() {
        this.socketInstance.on("user-count", (count) => {
            const countElement = document.getElementById("user-count");
            if (countElement) {
                countElement.innerText = count;
            }
            console.log("Active Users Connected:", count);
        });
    }

    registerEventListener(eventNameToListen, callbackFunction) {
        this.socketInstance.on(eventNameToListen, callbackFunction);
    }

    emitEventToServer(eventNameToEmit, eventDataObject) {
        // Always include user ID in all events
        const dataWithUserId = {
            ...eventDataObject,
            userId: this.uniqueUserIdentifier
        };
        
        console.log(`Emitting ${eventNameToEmit}:`, dataWithUserId);
        this.socketInstance.emit(eventNameToEmit, dataWithUserId);
    }

    getUserIdentifier() {
        return this.uniqueUserIdentifier;
    }

    isSocketConnected() {
        return this.socketInstance && this.socketInstance.connected;
    }

    emitDrawStartEvent(operationDataObject) {
        this.emitEventToServer("draw-start", operationDataObject);
    }

    emitDrawMoveEvent(pointsDataObject) {
        this.emitEventToServer("draw-move", pointsDataObject);
    }

    emitDrawEndEvent() {
        this.emitEventToServer("draw-end", {});
    }

    emitCursorPositionEvent(positionDataObject) {
        this.emitEventToServer("cursor-move", positionDataObject);
    }

    emitUndoActionEvent() {
        this.emitEventToServer("undo", {});
    }

    emitRedoActionEvent() {
        this.emitEventToServer("redo", {});
    }

    emitClearCanvasEvent() {
        this.emitEventToServer("clear-all", {});
    }
}
