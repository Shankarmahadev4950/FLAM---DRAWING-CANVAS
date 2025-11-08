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
        this.setupUserCountListener();

        console.log("RealtimeCommunicationClient initialized with user ID:", this.uniqueUserIdentifier);
    }

    generateUniqueUserIdentifier() {
        return `user_${Math.random().toString(36).substring(2, 11)}`;
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
        this.socketInstance.emit(eventNameToEmit, eventDataObject);
    }

    getUserIdentifier() {
        return this.uniqueUserIdentifier;
    }

    isSocketConnected() {
        return this.socketInstance.connected;
    }

    emitDrawStartEvent(operationDataObject) {
        this.emitEventToServer("draw-start", { ...operationDataObject, userId: this.uniqueUserIdentifier });
    }

    emitDrawMoveEvent(pointsDataObject) {
        this.emitEventToServer("draw-move", pointsDataObject);
    }

    emitDrawEndEvent() {
        this.emitEventToServer("draw-end", {});
    }

    emitCursorPositionEvent(positionDataObject) {
        this.emitEventToServer("cursor-move", { userId: this.uniqueUserIdentifier, ...positionDataObject });
    }

    emitUndoActionEvent() {
        this.emitEventToServer("undo", { userId: this.uniqueUserIdentifier });
    }

    emitRedoActionEvent() {
        this.emitEventToServer("redo", { userId: this.uniqueUserIdentifier });
    }

    emitClearCanvasEvent() {
        this.emitEventToServer("clear-all", { userId: this.uniqueUserIdentifier });
    }
}
