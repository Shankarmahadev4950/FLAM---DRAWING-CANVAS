/**
 * RoomManager handles multiple drawing rooms/sessions
 */
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.defaultRoomId = 'default';
        
        // Initialize default room
        this.getRoom(this.defaultRoomId);
    }

    getRoom(roomId = this.defaultRoomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                id: roomId,
                users: new Map(),
                history: null,
                createdAt: new Date(),
                isActive: true
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
            joinedAt: new Date()
        });
        return room;
    }

    removeUserFromRoom(roomId, userId) {
        const room = this.getRoom(roomId);
        const user = room.users.get(userId);
        if (user) {
            room.users.delete(userId);
            
            // Clean up empty rooms (except default)
            if (roomId !== this.defaultRoomId && room.users.size === 0) {
                this.rooms.delete(roomId);
                console.log(`Room ${roomId} deleted (no users)`);
            }
        }
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

    getUserRoom(userId) {
        for (const [roomId, room] of this.rooms.entries()) {
            if (room.users.has(userId)) {
                return roomId;
            }
        }
        return null;
    }

    getAllRooms() {
        return Array.from(this.rooms.values());
    }

    getActiveRooms() {
        return this.getAllRooms().filter(room => room.users.size > 0);
    }
}

module.exports = RoomManager;
