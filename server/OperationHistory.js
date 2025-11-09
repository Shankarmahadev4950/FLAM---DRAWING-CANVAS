const { v4: uuidv4 } = require('uuid');

/**
 * OperationHistory manages the global undo/redo history
 * This is the core component for global undo/redo functionality
 */
class OperationHistory {
    constructor() {
        // Array of all operations in chronological order
        this.operations = [];

        // Current position in the history (for undo/redo)
        this.currentIndex = -1;

        // Maximum history size (prevent memory issues)
        this.maxHistorySize = 1000;
    }

    /**
     * Add a new operation to the history
     * When a new operation is added, all operations after currentIndex are removed
     */
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

    /**
     * Undo the last operation
     * Returns the operation that was undone, or null if nothing to undo
     */
    undo() {
        if (!this.canUndo()) {
            return null;
        }

        const operation = this.operations[this.currentIndex];
        this.currentIndex--;

        return operation;
    }

    /**
     * Redo the last undone operation
     * Returns the operation that was redone, or null if nothing to redo
     */
    redo() {
        if (!this.canRedo()) {
            return null;
        }

        this.currentIndex++;
        const operation = this.operations[this.currentIndex];

        return operation;
    }

    /**
     * Check if undo is possible
     */
    canUndo() {
        return this.currentIndex >= 0;
    }

    /**
     * Check if redo is possible
     */
    canRedo() {
        return this.currentIndex < this.operations.length - 1;
    }

    /**
     * Get all currently active operations (up to currentIndex)
     * This is what should be drawn on the canvas
     */
    getActiveOperations() {
        return this.operations.slice(0, this.currentIndex + 1);
    }

    /**
     * Get all operations (for debugging)
     */
    getAllOperations() {
        return this.operations;
    }

    /**
     * Clear all history
     */
    clear() {
        this.operations = [];
        this.currentIndex = -1;
    }

    /**
     * Get current state information
     */
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
