import RoomManager from './RoomManager.js';
import OperationHistory from './OperationHistory.js';

class SocketManager {
    constructor(io) {
        this.io = io;
        this.roomManager = new RoomManager();
        this.operationHistory = new OperationHistory();
        this.userColors = new Map(); // Track user colors
        this.userCursors = new Map(); // Track cursor positions
        this.availableColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
            '#98D8C8', '#F7B731', '#5F27CD', '#00D2D3',
            '#FF9FF3', '#54A0FF', '#48DBFB', '#1DD1A1'
        ];
        
        this.setupSocketHandlers();
        console.log('📡 Socket Manager initialized');
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log('👤 New user connected:', socket.id);
            
            // Assign a color to the user
            const userColor = this.assignUserColor(socket.id);
            
            socket.on('join', (data) => {
                const userId = data.userId || socket.id;
                this.roomManager.addUser(userId, socket.id);
                this.userColors.set(userId, userColor);
                
                // Send initial data
                socket.emit('init', {
                    operations: this.operationHistory.getOperations(),
                    users: this.roomManager.getActiveUsers(),
                    userId: userId,
                    userColor: userColor,
                    cursors: Array.from(this.userCursors.entries())
                });

                // Broadcast to others
                socket.broadcast.emit('user-joined', {
                    id: userId,
                    color: userColor
                });

                this.broadcastUserList();
                console.log('✅ User joined:', userId, 'Color:', userColor);
            });

            // Cursor movement
            socket.on('cursor-move', (data) => {
                const userId = this.roomManager.getUserBySocketId(socket.id);
                if (userId) {
                    this.userCursors.set(userId, {
                        x: data.x,
                        y: data.y,
                        color: this.userColors.get(userId)
                    });
                    socket.broadcast.emit('cursor-update', {
                        userId,
                        x: data.x,
                        y: data.y,
                        color: this.userColors.get(userId)
                    });
                }
            });

            // Drawing events
            socket.on('draw-start', (data) => {
                socket.broadcast.emit('remote-draw-start', data);
            });

            socket.on('draw-move', (data) => {
                socket.broadcast.emit('remote-draw-move', data);
            });

            socket.on('draw-end', (data) => {
                const operation = this.operationHistory.addOperation(data);
                this.io.emit('operation', operation);
                this.broadcastUndoRedoState();
            });

            // Global undo/redo
            socket.on('undo', () => {
                const result = this.operationHistory.undo();
                if (result) {
                    this.io.emit('operations-update', {
                        operations: this.operationHistory.getOperations()
                    });
                    this.broadcastUndoRedoState();
                }
            });

            socket.on('redo', () => {
                const result = this.operationHistory.redo();
                if (result) {
                    this.io.emit('operations-update', {
                        operations: this.operationHistory.getOperations()
                    });
                    this.broadcastUndoRedoState();
                }
            });

            socket.on('clear-all', () => {
                this.operationHistory.clear();
                this.io.emit('canvas-cleared');
                this.broadcastUndoRedoState();
            });

            socket.on('disconnect', () => {
                const userId = this.roomManager.getUserBySocketId(socket.id);
                if (userId) {
                    this.roomManager.removeUser(userId);
                    this.userColors.delete(userId);
                    this.userCursors.delete(userId);
                    this.releaseUserColor(this.userColors.get(userId));
                    
                    this.io.emit('user-left', { userId });
                    this.io.emit('cursor-remove', { userId });
                    this.broadcastUserList();
                }
            });
        });
    }

    assignUserColor(socketId) {
        // Find an available color
        const usedColors = new Set(this.userColors.values());
        const availableColor = this.availableColors.find(color => !usedColors.has(color));
        return availableColor || this.availableColors[Math.floor(Math.random() * this.availableColors.length)];
    }

    releaseUserColor(color) {
        // Color becomes available again
    }

    broadcastUserList() {
        const users = this.roomManager.getActiveUsers().map(userId => ({
            id: userId,
            color: this.userColors.get(userId)
        }));
        
        this.io.emit('user-list', users);
        this.io.emit('user-count', users.length);
    }

    broadcastUndoRedoState() {
        this.io.emit('undo-redo-state', {
            canUndo: this.operationHistory.canUndo(),
            canRedo: this.operationHistory.canRedo()
        });
    }

    getTotalConnectedUsersCount() {
        return this.roomManager.getActiveUsers().length;
    }
}

export default SocketManager;
