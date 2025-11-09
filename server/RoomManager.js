class RoomManager {
    constructor() {
        this.users = new Map();
        console.log('🏠 Room Manager initialized');
    }

    addUser(userId, socketId) {
        this.users.set(userId, socketId);
        console.log(`➕ User added: ${userId}`);
    }

    removeUser(userId) {
        this.users.delete(userId);
        console.log(`➖ User removed: ${userId}`);
    }

    getUserBySocketId(socketId) {
        for (const [userId, sid] of this.users.entries()) {
            if (sid === socketId) {
                return userId;
            }
        }
        return null;
    }

    getActiveUsers() {
        return Array.from(this.users.keys());
    }

    getUserCount() {
        return this.users.size;
    }
}

export default RoomManager;
