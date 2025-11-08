const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const SocketManager = require('./src/SocketManager');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize Socket Manager
const socketManager = new SocketManager(io);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        users: socketManager.getUserCount(),
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   🎨 Collaborative Drawing Server      ║
║                                        ║
║   ✅ Server running on port ${PORT}        ║
║   📡 WebSocket server ready            ║
║   🌐 CORS enabled                      ║
╚════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
