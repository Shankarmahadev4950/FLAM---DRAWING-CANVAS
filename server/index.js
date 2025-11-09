const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const SocketManager = require('./SocketManager');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..')));

// Creating Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initializing Socket Manager
const socketManager = new SocketManager(io);

// Routes - Serve the main page from root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Serving other static files
app.get('/js/:file', (req, res) => {
    res.sendFile(path.join(__dirname, '../js', req.params.file));
});

app.get('/styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, '../styles.css'));
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

process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
