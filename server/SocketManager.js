const OperationHistory = require('./OperationHistory');
const RoomManager = require('./RoomManager');

class SocketManager {
    constructor(io) {
        this.io = io;
        this.roomManager = new RoomManager();
        
        // Set history for default room
        const defaultRoom = this.roomManager.getRoom();
        defaultRoom.history = new OperationHistory();

        // User color palette
        this.colorPalette = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
            '#F8B739', '#52C77E', '#FF6B9D', '#00D4FF'
        ];
        this.colorIndex = 0;

        this.setupSocketHandlers();
        console.log('📡 Socket Manager initialized');
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);

            // Room management events
            socket.on('create-room', (data) => this.handleCreateRoom(socket, data));
            socket.on('join-room', (data) => this.handleJoinRoom(socket, data));
            socket.on('leave-room', (data) => this.handleLeaveRoom(socket, data));

            // Drawing events
            socket.on('join', (data) => this.handleJoin(socket, data));
            socket.on('draw-start', (data) => this.handleDrawStart(socket, data));
            socket.on('draw-move', (data) => this.handleDrawMove(socket, data));
            socket.on('draw-end', (data) => this.handleDrawEnd(socket, data));
            socket.on('cursor-move', (data) => this.handleCursorMove(socket, data));
            socket.on('undo', (data) => this.handleUndo(socket, data));
            socket.on('redo', (data) => this.handleRedo(socket, data));
            socket.on('clear-all', (data) => this.handleClearAll(socket, data));

            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
    }

    // Room Management
    handleCreateRoom(socket, data) {
        const { roomCode, userId } = data;
        
        if (this.roomManager.rooms.has(roomCode)) {
            socket.emit('room-error', { message: 'Room already exists' });
            return;
        }

        // Create new room
        const room = this.roomManager.getRoom(roomCode);
        room.history = new OperationHistory();
        
        const userColor = this.getNextColor();
        this.roomManager.addUserToRoom(roomCode, userId, socket.id, userColor);
        socket.join(roomCode);

        socket.emit('room-created', { 
            roomCode: roomCode,
            users: this.roomManager.getUsersInRoom(roomCode)
        });
        
        console.log(`Room ${roomCode} created by user ${userId}`);
    }

    handleJoinRoom(socket, data) {
        const { roomCode, userId } = data;
        const room = this.roomManager.getRoom(roomCode);

        if (!room.history) {
            socket.emit('room-error', { message: 'Room does not exist' });
            return;
        }

        const userColor = this.getNextColor();
        this.roomManager.addUserToRoom(roomCode, userId, socket.id, userColor);
        socket.join(roomCode);

        // Send room state to new user
        socket.emit('room-joined', {
            roomCode: roomCode,
            operations: room.history.getActiveOperations(),
            users: this.roomManager.getUsersInRoom(roomCode),
            canUndo: room.history.canUndo(),
            canRedo: room.history.canRedo()
        });

        // Notify room about new user
        socket.to(roomCode).emit('user-joined', {
            id: userId,
            color: userColor,
            socketId: socket.id
        });

        // Update user list for everyone in room
        this.io.to(roomCode).emit('user-list', this.roomManager.getUsersInRoom(roomCode));
        
        console.log(`User ${userId} joined room ${roomCode}`);
    }

    handleLeaveRoom(socket, data) {
        const { roomCode, userId } = data;
        
        this.roomManager.removeUserFromRoom(roomCode, userId);
        socket.leave(roomCode);

        socket.to(roomCode).emit('user-left', { userId: userId });
        this.io.to(roomCode).emit('user-list', this.roomManager.getUsersInRoom(roomCode));
        
        console.log(`User ${userId} left room ${roomCode}`);
    }

    // Original join handler for default room
    handleJoin(socket, data) {
        const { userId } = data;
        const roomId = 'default';

        const userColor = this.getNextColor();
        socket.join(roomId);
        this.roomManager.addUserToRoom(roomId, userId, socket.id, userColor);

        const room = this.roomManager.getRoom(roomId);
        const history = room.history;

        // Send initial state to the new user
        socket.emit('init', {
            operations: history.getActiveOperations(),
            users: this.roomManager.getUsersInRoom(roomId),
            canUndo: history.canUndo(),
            canRedo: history.canRedo()
        });

        // Notify other users about new user
        socket.to(roomId).emit('user-joined', {
            id: userId,
            color: userColor,
            socketId: socket.id
        });

        // Update user list for everyone
        this.io.to(roomId).emit('user-list', this.roomManager.getUsersInRoom(roomId));
        
        console.log(`User ${userId} joined default room`);
    }


    handleDrawStart(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        // Store current operation
        socket.currentOperation = {
            ...data,
            points: [data.point],
            timestamp: Date.now()
        };

        
        socket.to(roomData.roomId).emit('draw-start', data);
        
        console.log('Draw start in room:', roomData.roomId);
    }

    
    handleDrawMove(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        // Add point to current operation
        if (socket.currentOperation && data.point) {
            socket.currentOperation.points.push(data.point);
        }

        socket.to(roomData.roomId).emit('draw-move', data);
    }

   
    handleDrawEnd(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        const { roomId } = roomData;
        const room = this.roomManager.getRoom(roomId);
        const history = room.history;

        if (!socket.currentOperation) return;

        // Add operation to room history
        const operation = history.addOperation(socket.currentOperation);
        
        this.io.to(roomId).emit('operations-update', {
            operations: history.getActiveOperations()
        });

        this.broadcastUndoRedoState(roomId, history);
        delete socket.currentOperation;

        console.log('Draw end in room:', roomId);
    }

    handleCursorMove(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;
        
        const { roomId, user } = roomData;
        
        socket.to(roomId).emit('cursor-update', {
            ...data,
            color: user.color
        });
    }

    handleUndo(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        const { roomId } = roomData;
        const room = this.roomManager.getRoom(roomId);
        const history = room.history;

        const undoneOperation = history.undo();
        if (undoneOperation) {
            this.io.to(roomId).emit('operations-update', {
                operations: history.getActiveOperations()
            });
            
            this.broadcastUndoRedoState(roomId, history);
            console.log('Undo in room:', roomId);
        }
    }

    handleRedo(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        const { roomId } = roomData;
        const room = this.roomManager.getRoom(roomId);
        const history = room.history;

        const redoneOperation = history.redo();
        if (redoneOperation) {
            this.io.to(roomId).emit('operations-update', {
                operations: history.getActiveOperations()
            });
            
            this.broadcastUndoRedoState(roomId, history);
            console.log('Redo in room:', roomId);
        }
    }

    handleClearAll(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        const { roomId } = roomData;
        const room = this.roomManager.getRoom(roomId);
        const history = room.history;

        history.clear();
        this.io.to(roomId).emit('canvas-cleared');
        this.broadcastUndoRedoState(roomId, history);

        console.log('Canvas cleared in room:', roomId);
    }

    handleDisconnect(socket) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        const { roomId, user } = roomData;
        this.roomManager.removeUserFromRoom(roomId, user.id);

        socket.to(roomId).emit('user-left', { userId: user.id });
        this.io.to(roomId).emit('user-list', this.roomManager.getUsersInRoom(roomId));

        console.log(`User ${user.id} disconnected from room ${roomId}`);
    }

    broadcastUndoRedoState(roomId, history) {
        this.io.to(roomId).emit('undo-redo-state', {
            canUndo: history.canUndo(),
            canRedo: history.canRedo()
        });
    }

    getNextColor() {
        const color = this.colorPalette[this.colorIndex % this.colorPalette.length];
        this.colorIndex++;
        return color;
    }

    getUserCount() {
        return this.io.engine.clientsCount;
    }
}

module.exports = SocketManager;
