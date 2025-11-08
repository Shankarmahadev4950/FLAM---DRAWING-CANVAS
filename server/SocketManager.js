const OperationHistory = require('./OperationHistory');
const RoomManager = require('./RoomManager');

class SocketManager {
    constructor(io) {
        this.io = io;
        this.roomManager = new RoomManager();
        
        this.colorPalette = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
            '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
            '#F8B739', '#52C77E', '#FF6B9D', '#00D4FF'
        ];
        this.colorIndex = 0;

        this.setupSocketHandlers();
        console.log('Socket Manager initialized with room support');
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);

            // Room management events
            socket.on('create-room', (data) => this.handleCreateRoom(socket, data));
            socket.on('join-room', (data) => this.handleJoinRoom(socket, data));
            socket.on('leave-room', (data) => this.handleLeaveRoom(socket, data));
            socket.on('room-broadcast', (data) => this.handleRoomBroadcast(socket, data));

            // Room-specific drawing events
            socket.on('room-draw-start', (data) => this.handleRoomDrawStart(socket, data));
            socket.on('room-draw-move', (data) => this.handleRoomDrawMove(socket, data));
            socket.on('room-draw-end', (data) => this.handleRoomDrawEnd(socket, data));
            socket.on('room-undo', (data) => this.handleRoomUndo(socket, data));
            socket.on('room-redo', (data) => this.handleRoomRedo(socket, data));
            socket.on('room-clear-all', (data) => this.handleRoomClearAll(socket, data));

            // Existing global events for backward compatibility
            socket.on('join', (data) => this.handleJoin(socket, data));
            socket.on('draw-start', (data) => this.handleDrawStart(socket, data));
            socket.on('draw-move', (data) => this.handleDrawMove(socket, data));
            socket.on('draw-end', (data) => this.handleDrawEnd(socket, data));
            socket.on('cursor-move', (data) => this.handleCursorMove(socket, data));
            socket.on('undo', (data) => this.handleUndo(socket, data));
            socket.on('redo', (data) => this.handleRedo(socket, data));
            socket.on('clear-all', (data) => this.handleClearAll(socket, data));

            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
                this.broadcastUserCount();
            });
        });
    }

    // Room Management Handlers
    handleCreateRoom(socket, data) {
        const { roomCode, userId } = data;
        
        if (this.roomManager.rooms.has(roomCode)) {
            socket.emit('room-error', { message: 'Room already exists' });
            return;
        }

        // Create new room with operation history
        const room = this.roomManager.getRoom(roomCode);
        room.history = new OperationHistory();
        
        const userColor = this.getNextColor();
        this.roomManager.addUserToRoom(roomCode, userId, socket.id, userColor);
        socket.join(roomCode);

        socket.emit('room-created', { roomCode: roomCode });
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

        // Send room state to the new user
        socket.emit('room-joined', {
            roomCode: roomCode,
            operations: room.history.getActiveOperations(),
            users: this.roomManager.getUsersInRoom(roomCode),
            canUndo: room.history.canUndo(),
            canRedo: room.history.canRedo()
        });

        // Notify other users in the room
        socket.to(roomCode).emit('room-user-joined', {
            user: { id: userId, color: userColor, socketId: socket.id }
        });

        // Update user list for everyone in the room
        this.io.to(roomCode).emit('room-users-update', {
            users: this.roomManager.getUsersInRoom(roomCode)
        });

        console.log(`User ${userId} joined room ${roomCode}`);
    }

    handleLeaveRoom(socket, data) {
        const { roomCode, userId } = data;
        const room = this.roomManager.getRoom(roomCode);

        this.roomManager.removeUserFromRoom(roomCode, userId);
        socket.leave(roomCode);

        // Notify other users in the room
        socket.to(roomCode).emit('room-user-left', { userId: userId });

        // Update user list
        this.io.to(roomCode).emit('room-users-update', {
            users: this.roomManager.getUsersInRoom(roomCode)
        });

        console.log(`User ${userId} left room ${roomCode}`);
    }

    // Room Drawing Handlers
    handleRoomDrawStart(socket, data) {
        const { roomCode, ...drawData } = data;
        
        // Broadcast to other users in the room
        socket.to(roomCode).emit('room-draw-start', {
            ...drawData,
            userId: drawData.userId
        });
    }

    handleRoomDrawMove(socket, data) {
        const { roomCode, ...drawData } = data;
        
        socket.to(roomCode).emit('room-draw-move', {
            ...drawData,
            userId: drawData.userId
        });
    }

    handleRoomDrawEnd(socket, data) {
        const { roomCode, operation } = data;
        const room = this.roomManager.getRoom(roomCode);

        if (room.history && operation) {
            // Add operation to room history
            const savedOperation = room.history.addOperation(operation);
            
            // Broadcast to all users in the room (including sender for consistency)
            this.io.to(roomCode).emit('room-draw-end', {
                ...savedOperation,
                userId: operation.userId
            });

            // Update operations for all clients
            this.io.to(roomCode).emit('room-operations-update', {
                operations: room.history.getActiveOperations()
            });

            this.broadcastRoomUndoRedoState(roomCode, room.history);
        }
    }

    handleRoomUndo(socket, data) {
        const { roomCode } = data;
        const room = this.roomManager.getRoom(roomCode);

        if (room.history) {
            const undoneOperation = room.history.undo();
            if (undoneOperation) {
                this.io.to(roomCode).emit('room-operations-update', {
                    operations: room.history.getActiveOperations()
                });
                
                this.broadcastRoomUndoRedoState(roomCode, room.history);
            }
        }
    }

    handleRoomRedo(socket, data) {
        const { roomCode } = data;
        const room = this.roomManager.getRoom(roomCode);

        if (room.history) {
            const redoneOperation = room.history.redo();
            if (redoneOperation) {
                this.io.to(roomCode).emit('room-operations-update', {
                    operations: room.history.getActiveOperations()
                });
                
                this.broadcastRoomUndoRedoState(roomCode, room.history);
            }
        }
    }

    handleRoomClearAll(socket, data) {
        const { roomCode } = data;
        const room = this.roomManager.getRoom(roomCode);

        if (room.history) {
            room.history.clear();
            this.io.to(roomCode).emit('room-canvas-cleared');
            this.broadcastRoomUndoRedoState(roomCode, room.history);
        }
    }

    handleRoomBroadcast(socket, data) {
        const { roomCode, event, data: eventData } = data;
        socket.to(roomCode).emit(event, eventData);
    }

    broadcastRoomUndoRedoState(roomCode, history) {
        this.io.to(roomCode).emit('room-undo-redo-state', {
            canUndo: history.canUndo(),
            canRedo: history.canRedo()
        });
    }

    getNextColor() {
        const color = this.colorPalette[this.colorIndex % this.colorPalette.length];
        this.colorIndex++;
        return color;
    }

    // ... rest of the existing methods (handleJoin, handleDrawStart, etc.)
}

module.exports = SocketManager;
