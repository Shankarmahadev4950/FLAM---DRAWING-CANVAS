const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const cors = require('cors');
const path = require('path');
const SocketManager = require('./SocketManager');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

// Serve static client files
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

// Initialize Socket.IO
const io = new SocketIO(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 60000
});

// Initialize Socket Manager
const socketManager = new SocketManager(io);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'operational',
        users: socketManager.getTotalConnectedUsersCount(),
        timestamp: new Date().toISOString()
    });
});

// Serve index.html for all unknown routes
app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════╗
║ Collaborative Drawing Server           ║
║ Status: ✓ Running                      ║
║ Port: ${PORT}                          ║
║ WebSocket: ✓ Ready                     ║
║ Client Serving: ✓ Enabled              ║
╚════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received: Shutting down');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = {
    app,
    server,
    io,
    socketManager
};
