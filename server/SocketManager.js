const OperationHistory = require('./OperationHistory');
const RoomManager = require('./RoomManager');


class SocketManager {
    constructor(io) {
        this.io = io;
        this.roomManager = new RoomManager();
        this.operationHistory = new OperationHistory();

        // Set history for default room
        const defaultRoom = this.roomManager.getRoom();
        defaultRoom.history = this.operationHistory;

        // User color palette for visual identification
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

            // Broadcast user count when someone connects
            this.broadcastUserCount();

            // Register all socket event handlers
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

    handleJoin(socket, data) {
        const { userId } = data;
        const roomId = 'default';

        // Assign color to user
        const userColor = this.colorPalette[this.colorIndex % this.colorPalette.length];
        this.colorIndex++;

        // Add user to room
        socket.join(roomId);
        this.roomManager.addUserToRoom(roomId, userId, socket.id, userColor);

        const room = this.roomManager.getRoom(roomId);
        const history = room.history;

        // Send initial data to the joining user
        socket.emit('init', {
            operations: history.getActiveOperations(),
            users: this.roomManager.getUsersInRoom(roomId),
            canUndo: history.canUndo(),
            canRedo: history.canRedo()
        });

        // Notify other users in the room
        socket.to(roomId).emit('user-joined', {
            id: userId,
            color: userColor
        });

        // Broadcast updated user list to all users in the room
        this.io.to(roomId).emit('user-list', this.roomManager.getUsersInRoom(roomId));

        // Broadcast total user count to all connected clients
        this.broadcastUserCount();

        console.log(`👤 User ${userId} joined room ${roomId}`);
    }

    handleDrawStart(socket, data) {
        console.log('✏️ draw-start received:', data);

        // Create a new operation for this drawing session
        socket.currentOperation = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            userId: data.userId || socket.id,
            tool: data.tool,
            color: data.color,
            width: data.width,
            data: {
                tool: data.tool,
                color: data.color,
                width: data.width,
                points: []
            }
        };

        console.log('📝 Current operation initialized:', socket.currentOperation.id);
    }

    handleDrawMove(socket, data) {
        if (!socket.currentOperation) {
            console.log('⚠️ No current operation for move');
            return;
        }

        // Add point to the current operation
        if (data.point) {
            socket.currentOperation.data.points.push(data.point);
        }
    }

    handleDrawEnd(socket, data) {
        console.log('✅ draw-end received:', data);

        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) {
            console.log('⚠️ No room data found for socket');
            return;
        }

        const { roomId } = roomData;
        const room = this.roomManager.getRoom(roomId);
        const history = room.history;

        // If no operation was started, create one from the data
        if (!socket.currentOperation) {
            console.log('📝 Creating new operation from draw-end data');

            socket.currentOperation = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(),
                userId: socket.id,
                tool: data.tool,
                color: data.color,
                width: data.width,
                data: {
                    tool: data.tool,
                    color: data.color,
                    width: data.width,
                    points: data.points || [],
                    startX: data.startX,
                    startY: data.startY,
                    endX: data.endX,
                    endY: data.endY,
                    text: data.text,
                    fontSize: data.fontSize
                }
            };
        }

        const operation = socket.currentOperation;
        console.log(`📤 Broadcasting operation ${operation.id} to room ${roomId}`);

        // Broadcast the operation to ALL clients in the room (including sender)
        this.io.to(roomId).emit('operation', {
            id: operation.id,
            data: operation.data
        });

        // Add to history
        history.addOperation(operation);

        // Broadcast undo/redo state
        this.broadcastUndoRedoState(roomId, history);

        // Clean up
        delete socket.currentOperation;

        console.log(`✅ Operation ${operation.id} completed and broadcast`);
    }

    handleCursorMove(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        const { roomId } = roomData;
        
        // Broadcast cursor position to other users (not sender)
        socket.to(roomId).emit('cursor-update', {
            userId: data.userId || socket.id,
            x: data.x,
            y: data.y
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
            // Send updated operations to all users
            this.io.to(roomId).emit('operations-update', {
                operations: history.getActiveOperations()
            });

            this.broadcastUndoRedoState(roomId, history);
            console.log(`⬅️ Undo operation: ${undoneOperation.id}`);
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
            // Send updated operations to all users
            this.io.to(roomId).emit('operations-update', {
                operations: history.getActiveOperations()
            });

            this.broadcastUndoRedoState(roomId, history);
            console.log(`➡️ Redo operation: ${redoneOperation.id}`);
        }
    }

    handleClearAll(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        const { roomId } = roomData;
        const room = this.roomManager.getRoom(roomId);
        const history = room.history;

        history.clear();
        
        // Broadcast clear event to all users
        this.io.to(roomId).emit('canvas-cleared');
        this.broadcastUndoRedoState(roomId, history);

        console.log(`🗑️ Canvas cleared in room ${roomId}`);
    }

    handleDisconnect(socket) {
        console.log(`🔌 Client disconnecting: ${socket.id}`);

        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) {
            console.log('⚠️ No room data found for disconnecting socket');
            this.broadcastUserCount();
            return;
        }

        const { roomId, user } = roomData;

        // Remove user from room
        this.roomManager.removeUserFromRoom(roomId, user.id);

        // Notify other users
        socket.to(roomId).emit('user-left', { 
            userId: user.id 
        });

        // Broadcast updated user list
        this.io.to(roomId).emit('user-list', this.roomManager.getUsersInRoom(roomId));

        // Broadcast updated user count to all
        this.broadcastUserCount();

        console.log(`👋 User ${user.id} disconnected from room ${roomId}`);
    }

    broadcastUndoRedoState(roomId, history) {
        this.io.to(roomId).emit('undo-redo-state', {
            canUndo: history.canUndo(),
            canRedo: history.canRedo()
        });
    }

    broadcastUserCount() {
        const count = this.io.sockets.sockets.size;
        this.io.emit('user-count', count);
        console.log(`👥 Broadcasting user count: ${count}`);
    }

    getTotalConnectedUsersCount() {
        return this.io.sockets.sockets.size;
    }

    getActiveRooms() {
        return this.roomManager.getAllRooms();
    }

    getRoomUserCount(roomId) {
        return this.roomManager.getUsersInRoom(roomId).length;
    }
}

module.exports = SocketManager;
