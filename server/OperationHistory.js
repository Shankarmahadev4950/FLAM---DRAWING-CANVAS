const { v4: uuidv4 } = require('uuid');


class OperationHistory {
    constructor() {
        // Array of all operations in chronological order
        this.operations = [];

        // Current position in the history (for undo/redo)
        this.currentIndex = -1;

        // Maximum history size (prevent memory issues)
        this.maxHistorySize = 1000;
    }

   
    addOperation(operation) {
        // Assign a unique ID if not present
        if (!operation.id) {
            operation.id = uuidv4();
        }

        // Add timestamp
        operation.timestamp = Date.now();

        // Remove any operations after the current index (they've been undone)
        if (this.currentIndex < this.operations.length - 1) {
            this.operations.splice(this.currentIndex + 1);
        }

        // Add the new operation
        this.operations.push(operation);
        this.currentIndex++;

        // Enforce maximum history size
        if (this.operations.length > this.maxHistorySize) {
            const removeCount = this.operations.length - this.maxHistorySize;
            this.operations.splice(0, removeCount);
            this.currentIndex -= removeCount;
        }

        return operation;
    }

   
    undo() {
        if (!this.canUndo()) {
            return null;
        }

        const operation = this.operations[this.currentIndex];
        this.currentIndex--;

        return operation;
    }

   
    redo() {
        if (!this.canRedo()) {
            return null;
        }

        this.currentIndex++;
        const operation = this.operations[this.currentIndex];

        return operation;
    }

    
    canUndo() {
        return this.currentIndex >= 0;
    }


    canRedo() {
        return this.currentIndex < this.operations.length - 1;
    }

    getActiveOperations() {
        return this.operations.slice(0, this.currentIndex + 1);
    }

   
    getAllOperations() {
        return this.operations;
    }

    
    clear() {
        this.operations = [];
        this.currentIndex = -1;
    }

    /
    getState() {
        return {
            totalOperations: this.operations.length,
            currentIndex: this.currentIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            activeOperations: this.getActiveOperations().length
        };
    }
}

module.exports = OperationHistory;
