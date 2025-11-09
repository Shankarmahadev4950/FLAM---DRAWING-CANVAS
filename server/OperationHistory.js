class OperationHistory {
    constructor() {
        this.operations = [];
        this.undoStack = [];
        this.maxHistory = 1000; // Limit history to prevent memory issues
    }

    addOperation(operation) {
        this.operations.push(operation);
        this.undoStack = [];
        
        // Limit history size
        if (this.operations.length > this.maxHistory) {
            this.operations.shift();
        }
    }

    getActiveOperations() {
        return this.operations;
    }

    undo() {
        if (this.operations.length === 0) return null;
        const operation = this.operations.pop();
        this.undoStack.push(operation);
        return operation;
    }

    redo() {
        if (this.undoStack.length === 0) return null;
        const operation = this.undoStack.pop();
        this.operations.push(operation);
        return operation;
    }

    canUndo() {
        return this.operations.length > 0;
    }

    canRedo() {
        return this.undoStack.length > 0;
    }

    clear() {
        this.operations = [];
        this.undoStack = [];
    }

    getOperationCount() {
        return this.operations.length;
    }
}

export default OperationHistory;
