class SocketClient {
    constructor(serverUrl = '') {
        // ✅ FIX: Use current origin for production, fallback for development
        const url = serverUrl || window.location.origin;
        
        this.socket = io(url, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });
        
        this.userId = this.generateUserId();
        this.setupConnectionHandlers();
        
        console.log("SocketClient initialized with user ID:", this.userId);
    }

    generateUserId() {
        return `user_${Math.random().toString(36).substr(2, 9)}`;
    }

    setupConnectionHandlers() {
        this.socket.on('connect', () => {
            console.log('✅ Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('🔴 Connection error:', error);
        });
    }

    on(event, callback) {
        this.socket.on(event, callback);
    }

    emit(event, data) {
        this.socket.emit(event, data);
    }

    getUserId() {
        return this.userId;
    }

    isConnected() {
        return this.socket.connected;
    }

    // ✅ FIXED: Match server expected format
    emitDrawStart(operation) {
        this.emit('draw-start', { 
            ...operation, 
            userId: this.userId 
        });
    }

    emitDrawMove(points) {
        this.emit('draw-move', { 
            ...points, 
            userId: this.userId 
        });
    }

    emitDrawEnd() {
        this.emit('draw-end', { 
            userId: this.userId 
        });
    }

    emitCursorMove(position) {
        this.emit('cursor-move', { 
            ...position, 
            userId: this.userId 
        });
    }

    emitUndo() {
        this.emit('undo', { 
            userId: this.userId 
        });
    }

    emitRedo() {
        this.emit('redo', { 
            userId: this.userId 
        });
    }

    emitClearAll() {
        this.emit('clear-all', { 
            userId: this.userId 
        });
    }

    // Room management methods
    emitCreateRoom(roomCode) {
        this.emit('create-room', {
            roomCode: roomCode,
            userId: this.userId
        });
    }

    emitJoinRoom(roomCode) {
        this.emit('join-room', {
            roomCode: roomCode,
            userId: this.userId
        });
    }

    emitLeaveRoom(roomCode) {
        this.emit('leave-room', {
            roomCode: roomCode,
            userId: this.userId
        });
    }
}
