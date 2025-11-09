class RoomManager {
    constructor() {
        this.users = new Map(); // userId -> socketId mapping
        console.log(' Room Manager initialized');
    }

    addUser(userId, socketId) {
        this.users.set(userId, socketId);
        console.log(` User added: ${userId} (Socket: ${socketId})`);
    }

    removeUser(userId) {
        const socketId = this.users.get(userId);
        this.users.delete(userId);
        console.log(` User removed: ${userId}`);
        return socketId;
    }

    getUserBySocketId(socketId) {
        for (const [userId, sid] of this.users.entries()) {
            if (sid === socketId) {
                return userId;
            }
        }
        return null;
    }

    getSocketIdByUserId(userId) {
        return this.users.get(userId);
    }

    getActiveUsers() {
        return Array.from(this.users.keys());
    }

    getUserCount() {
        return this.users.size;
    }

    hasUser(userId) {
        return this.users.has(userId);
    }

    getAllUsers() {
        return Array.from(this.users.entries()).map(([userId, socketId]) => ({
            userId,
            socketId
        }));
    }
}

export default RoomManager;
