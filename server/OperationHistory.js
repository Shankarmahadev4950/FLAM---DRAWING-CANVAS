class OperationHistory {
    constructor() {
        this.operations = [];
        this.currentIndex = -1;
        this.maxOperations = 100;
        console.log('📝 Operation History initialized');
    }

    addOperation(data) {
        const operation = {
            id: this.generateId(),
            data: data,
            timestamp: Date.now()
        };

        this.operations = this.operations.slice(0, this.currentIndex + 1);
        this.operations.push(operation);
        this.currentIndex++;

        if (this.operations.length > this.maxOperations) {
            this.operations.shift();
            this.currentIndex--;
        }

        return operation;
    }

    undo() {
        if (this.canUndo()) {
            this.currentIndex--;
            return true;
        }
        return false;
    }

    redo() {
        if (this.canRedo()) {
            this.currentIndex++;
            return true;
        }
        return false;
    }

    canUndo() {
        return this.currentIndex >= 0;
    }

    canRedo() {
        return this.currentIndex < this.operations.length - 1;
    }

    getOperations() {
        return this.operations.slice(0, this.currentIndex + 1);
    }

    clear() {
        this.operations = [];
        this.currentIndex = -1;
    }

    generateId() {
        return Math.random().toString(36).substring(2, 11);
    }
}

export default OperationHistory;
