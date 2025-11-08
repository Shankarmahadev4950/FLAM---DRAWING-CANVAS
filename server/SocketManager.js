const OperationHistory = require('./OperationHistory');
const RoomManager = require('./RoomManager');

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
        console.log(' Socket Manager initialized');
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(` Client connected: ${socket.id}`);

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

        const userColor = this.colorPalette[this.colorIndex % this.colorPalette.length];
        this.colorIndex++;

        socket.join(roomId);
        this.roomManager.addUserToRoom(roomId, userId, socket.id, userColor);

        const room = this.roomManager.getRoom(roomId);
        const history = room.history;

        socket.emit('init', {
            operations: history.getActiveOperations(),
            users: this.roomManager.getUsersInRoom(roomId),
            canUndo: history.canUndo(),
            canRedo: history.canRedo()
        });

        socket.to(roomId).emit('user-joined', {
            id: userId,
            color: userColor
        });

        this.io.to(roomId).emit('user-list', this.roomManager.getUsersInRoom(roomId));
        console.log(`👤 User ${userId} joined room ${roomId}`);
    }

    handleDrawStart(socket, data) {
        console.log('draw-start received:', data);

        socket.currentOperation = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            userId: data.userId || 'unknown',
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

        console.log('socket.currentOperation set:', socket.currentOperation);
    }

    handleDrawMove(socket, data) {
        if (!socket.currentOperation) {
            console.log('No current operation for move');
            return;
        }

        if (data.point) {
            socket.currentOperation.data.points.push(data.point);
        }
    }

    handleDrawEnd(socket, data) {
        console.log('draw-end received:', data);
        console.log('socket.currentOperation:', socket.currentOperation);

        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) {
            console.log('No room data found for socket');
            return;
        }

        const { roomId } = roomData;
        const room = this.roomManager.getRoom(roomId);
        const history = room.history;

        if (!socket.currentOperation) {
            console.log('No current operation to end');
            console.log('Creating new operation from data:', data);

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
        console.log('Final operation to broadcast:', operation);

        this.io.to(roomId).emit('operation', {
            id: operation.id,
            data: operation.data
        });

        this.broadcastUndoRedoState(roomId, history);
        delete socket.currentOperation;

        console.log(` Operation completed: ${operation.id}`);
    }

    handleCursorMove(socket, data) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        const { roomId } = roomData;
        socket.to(roomId).emit('cursor-update', data);
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
            console.log(` Undo operation: ${undoneOperation.id}`);
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
            console.log(` Redo operation: ${redoneOperation.id}`);
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

        console.log(`Canvas cleared in room ${roomId}`);
    }

    handleDisconnect(socket) {
        const roomData = this.roomManager.getRoomForSocket(socket.id);
        if (!roomData) return;

        const { roomId, user } = roomData;

        this.roomManager.removeUserFromRoom(roomId, user.id);
        socket.to(roomId).emit('user-left', { userId: user.id });
        this.io.to(roomId).emit('user-list', this.roomManager.getUsersInRoom(roomId));

        console.log(`User ${user.id} disconnected`);
    }

    broadcastUndoRedoState(roomId, history) {
        this.io.to(roomId).emit('undo-redo-state', {
            canUndo: history.canUndo(),
            canRedo: history.canRedo()
        });
    }

    getTotalConnectedUsersCount() {
        return this.io.sockets.sockets.size;
    }
}

module.exports = SocketManager;
