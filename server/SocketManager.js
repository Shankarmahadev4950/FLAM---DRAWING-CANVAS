import OperationHistory from './OperationHistory.js';
import RoomManager from './RoomManager.js';

class SocketManager {
    constructor(io) {
        this.io = io;
        this.roomManager = new RoomManager();
        this.operationHistory = new OperationHistory();

        const defaultRoom = this.roomManager.getRoom();
        defaultRoom.history = this.operationHistory;

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
            this.broadcastUserCount();

            socket.on('join', (data) => this.handleJoin(socket, data));
            socket.on('draw-start', (data) => this.handleDrawStart(socket, data));
            socket.on('draw-move', (data) => this.handleDrawMove(socket, data));
            socket.on('draw-end', (data) => this.handleDrawEnd(socket, data));
            socket.on('cursor-move', (data) => this.handleCursorMove(socket, data));
            socket.on('clear-all', (data) => this.handleClearAll(socket, data));
            socket.on('undo', (data) => this.handleUndo(socket, data));
            socket.on('redo', (data) => this.handleRedo(socket, data));
            socket.on('disconnect', () => this.handleDisconnect(socket));
        });
    }

    handleJoin(socket, data) {
        const { userId } = data;
        const roomId = 'default';
        const userColor = this.colorPalette[this.colorIndex % this.colorPalette.length];
        this.colorIndex++;

        socket.join(roomId);
        this.roomManager.addUserToRoom(roomId, userId, socket.id, userColor);

        const room = this.roomManager.getRoom(roomId);
        const history = room.history;

        // Send initial state to joining user
        socket.emit('init', {
            operations: history.getActiveOperations(),
            users: this.roomManager.getUsersInRoom(roomId),
            canUndo: history.canUndo(),
            canRedo: history.canRedo(),
            userId: userId,
            userColor: userColor
        });

        // Notify others
        socket.to(roomId).emit('user-joined', {
            id: userId,
            color: userColor
        });

        // Broadcast user list
        this.io.to(roomId).emit('user-list', this.roomManager.getUsersInRoom(roomId));
        this.broadcastUserCount();

        console.log(`👤 User ${userId} joined room ${roomId} (Total: ${this.getTotalConnectedUsersCount()})`);
    }

    handleDrawStart(socket, data) {
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
    }

    handleDrawMove(socket, data) {
        if (!socket.currentOperation) return;
        
        if (data.point) {
            socket.currentOperation.data.points.push(data.point);
        }
        
        // Broadcast move in real-time for live preview
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (roomData) {
            socket.to(roomData.roomId).emit('draw-preview', {
                userId: socket.currentOperation.userId,
                point: data.point,
                color: socket.currentOperation.color,
                width: socket.currentOperation.width
            });
        }
    }

    handleDrawEnd(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        const { roomId } = roomData;
        const room = this.roomManager.getRoom(roomId);
        const history = room.history;

        // Create operation if not exists
        if (!socket.currentOperation) {
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
                    points: data.points || []
                }
            };
        }

        const operation = socket.currentOperation;

        // Add to history
        history.addOperation(operation);

        // Broadcast to ALL users in room (including sender for confirmation)
        this.io.to(roomId).emit('operation', {
            id: operation.id,
            data: operation.data,
            userId: operation.userId
        });

        // Update undo/redo state
        this.broadcastUndoRedoState(roomId, history);

        delete socket.currentOperation;
    }

    handleCursorMove(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        const { roomId } = roomData;
        
        // Broadcast to others only
        socket.to(roomId).emit('cursor-update', {
            userId: data.userId || socket.id,
            x: data.x,
            y: data.y,
            color: data.color
        });
    }

    handleClearAll(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        const { roomId } = roomData;
        const room = this.roomManager.getRoom(roomId);
        
        room.history.clear();
        this.io.to(roomId).emit('canvas-cleared');
        this.broadcastUndoRedoState(roomId, room.history);
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
        }
    }

    handleDisconnect(socket) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        
        if (!roomData) {
            this.broadcastUserCount();
            return;
        }

        const { roomId, user } = roomData;
        
        this.roomManager.removeUserFromRoom(roomId, user.id);
        socket.to(roomId).emit('user-left', { userId: user.id });
        this.io.to(roomId).emit('user-list', this.roomManager.getUsersInRoom(roomId));
        this.broadcastUserCount();

        console.log(`👋 User ${user.id} disconnected (Total: ${this.getTotalConnectedUsersCount()})`);
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
    }

    getTotalConnectedUsersCount() {
        return this.io.sockets.sockets.size;
    }
}

export default SocketManager;
