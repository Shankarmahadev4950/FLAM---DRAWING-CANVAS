class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.rooms.set('default', {
            id: 'default',
            users: new Map(),
            history: null,
            createdAt: Date.now()
        });
    }

    getRoom(roomId = 'default') {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                id: roomId,
                users: new Map(),
                history: null,
                createdAt: Date.now()
            });
        }
        return this.rooms.get(roomId);
    }

    addUserToRoom(roomId, userId, socketId, color) {
        const room = this.getRoom(roomId);
        room.users.set(userId, {
            id: userId,
            socketId,
            color,
            joinedAt: Date.now()
        });
    }

    removeUserFromRoom(roomId, userId) {
        const room = this.getRoom(roomId);
        if (room) {
            room.users.delete(userId);
        }
    }

    getUsersInRoom(roomId) {
        const room = this.getRoom(roomId);
        return Array.from(room.users.values());
    }

    getRoomForSocket(socketId) {
        for (const [roomId, room] of this.rooms) {
            for (const [userId, user] of room.users) {
                if (user.socketId === socketId) {
                    return { roomId, user };
                }
            }
        }
        return null;
    }

    getAllRooms() {
        return Array.from(this.rooms.keys());
    }
}

export default RoomManager;
