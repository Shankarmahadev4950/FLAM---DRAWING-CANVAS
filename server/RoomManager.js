/**
 * RoomManager handles multiple drawing rooms/sessions
 */
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.defaultRoomId = 'default';
    }

    getRoom(roomId = this.defaultRoomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                id: roomId,
                users: new Map(),
                history: null
            });
        }
        return this.rooms.get(roomId);
    }

    addUserToRoom(roomId, userId, socketId, color) {
        const room = this.getRoom(roomId);
        room.users.set(userId, { id: userId, socketId, color });
        return room;
    }

    removeUserFromRoom(roomId, userId) {
        const room = this.getRoom(roomId);
        room.users.delete(userId);
        return room;
    }

    getUsersInRoom(roomId) {
        const room = this.getRoom(roomId);
        return Array.from(room.users.values());
    }

    getRoomForSocket(socketId) {
        for (const [roomId, room] of this.rooms.entries()) {
            for (const user of room.users.values()) {
                if (user.socketId === socketId) {
                    return { roomId, user };
                }
            }
        }
        return null;
    }
}

module.exports = RoomManager;
