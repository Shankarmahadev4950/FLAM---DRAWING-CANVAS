class ApplicationStateManager {
    constructor() {
        this.operationsList = [];
        this.connectedUsersList = new Map();
        this.canUndoDrawing = false;
        this.canRedoDrawing = false;
    }

    initializeApplicationState(stateDataObject) {
        this.operationsList = stateDataObject.operations || [];
        (stateDataObject.users || []).forEach(userObject => {
            this.connectedUsersList.set(userObject.id, userObject);
        });
        this.canUndoDrawing = stateDataObject.canUndo || false;
        this.canRedoDrawing = stateDataObject.canRedo || false;
    }

    addOperationToList(operationObject) {
        this.operationsList.push(operationObject);
    }

    getOperationsFromList() {
        return this.operationsList;
    }

    setOperationsInList(operationsList) {
        this.operationsList = operationsList;
    }

    addUserToConnectedList(userObject) {
        this.connectedUsersList.set(userObject.id, userObject);
    }

    removeUserFromConnectedList(userIdToRemove) {
        this.connectedUsersList.delete(userIdToRemove);
    }

    getConnectedUsersList() {
        return Array.from(this.connectedUsersList.values());
    }

    getSingleUserFromList(userIdToFind) {
        return this.connectedUsersList.get(userIdToFind);
    }

    setUndoRedoCapabilities(canPerformUndo, canPerformRedo) {
        this.canUndoDrawing = canPerformUndo;
        this.canRedoDrawing = canPerformRedo;
    }

    getCanUndoState() {
        return this.canUndoDrawing;
    }

    getCanRedoState() {
        return this.canRedoDrawing;
    }

    clearAllApplicationState() {
        this.operationsList = [];
        this.connectedUsersList.clear();
    }
}
