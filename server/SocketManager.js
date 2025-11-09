import RoomManager from './RoomManager.js';
import OperationHistory from './OperationHistory.js';

class SocketManager {
    constructor(io) {
        this.io = io;
        this.roomManager = new RoomManager();
        this.operationHistory = new OperationHistory();
        this.userColors = new Map();
        this.userCursors = new Map();
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
            
            const userColor = this.assignUserColor(socket.id);
            
            socket.on('join', (data) => {
                try {
                    const userId = data.userId || socket.id;
                    this.roomManager.addUser(userId, socket.id);
                    this.userColors.set(userId, userColor);
                    
                    socket.emit('init', {
                        operations: this.operationHistory.getOperations(),
                        users: this.getActiveUsersWithColors(),
                        userId: userId,
                        userColor: userColor,
                        cursors: Array.from(this.userCursors.entries())
                    });

                    socket.broadcast.emit('user-joined', {
                        id: userId,
                        color: userColor
                    });

                    this.broadcastUserList();
                    console.log('✅ User joined:', userId, 'Color:', userColor);
                } catch (error) {
                    console.error('❌ Error in join handler:', error);
                }
            });

            socket.on('cursor-move', (data) => {
                try {
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
                } catch (error) {
                    console.error('❌ Error in cursor-move:', error);
                }
            });

            socket.on('draw-start', (data) => {
                socket.broadcast.emit('remote-draw-start', data);
            });

            socket.on('draw-move', (data) => {
                socket.broadcast.emit('remote-draw-move', data);
            });

            socket.on('draw-end', (data) => {
                try {
                    const operation = this.operationHistory.addOperation(data);
                    this.io.emit('operation', operation);
                    this.broadcastUndoRedoState();
                } catch (error) {
                    console.error('❌ Error in draw-end:', error);
                }
            });

            socket.on('undo', () => {
                try {
                    const result = this.operationHistory.undo();
                    if (result) {
                        this.io.emit('operations-update', {
                            operations: this.operationHistory.getOperations()
                        });
                        this.broadcastUndoRedoState();
                    }
                } catch (error) {
                    console.error('❌ Error in undo:', error);
                }
            });

            socket.on('redo', () => {
                try {
                    const result = this.operationHistory.redo();
                    if (result) {
                        this.io.emit('operations-update', {
                            operations: this.operationHistory.getOperations()
                        });
                        this.broadcastUndoRedoState();
                    }
                } catch (error) {
                    console.error('❌ Error in redo:', error);
                }
            });

            socket.on('clear-all', () => {
                try {
                    this.operationHistory.clear();
                    this.io.emit('canvas-cleared');
                    this.broadcastUndoRedoState();
                } catch (error) {
                    console.error('❌ Error in clear-all:', error);
                }
            });

            socket.on('disconnect', () => {
                try {
                    const userId = this.roomManager.getUserBySocketId(socket.id);
                    if (userId) {
                        this.roomManager.removeUser(userId);
                        this.userColors.delete(userId);
                        this.userCursors.delete(userId);
                        
                        this.io.emit('user-left', { userId });
                        this.io.emit('cursor-remove', { userId });
                        this.broadcastUserList();
                        console.log('👋 User left:', userId);
                    }
                } catch (error) {
                    console.error('❌ Error in disconnect:', error);
                }
            });
        });
    }

    assignUserColor(socketId) {
        const usedColors = new Set(this.userColors.values());
        const availableColor = this.availableColors.find(color => !usedColors.has(color));
        return availableColor || this.availableColors[Math.floor(Math.random() * this.availableColors.length)];
    }

    getActiveUsersWithColors() {
        return this.roomManager.getActiveUsers().map(userId => ({
            id: userId,
            color: this.userColors.get(userId) || '#999'
        }));
    }

    broadcastUserList() {
        const users = this.getActiveUsersWithColors();
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
        return this.roomManager.getUserCount();
    }
}

export default SocketManager;
