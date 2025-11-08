const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const SocketManager = require('./SocketManager');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../client')); // Serve static files from client directory

// Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize Socket Manager
const socketManager = new SocketManager(io);

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '../client' });
});

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
║   🏠 Room system active                ║
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
