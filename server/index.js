const express = require('express');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const cors = require('cors');
const path = require('path');
const SocketManager = require('./SocketManager');

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());

const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath));

const io = new SocketIO(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 60000
});

const socketManager = new SocketManager(io);

app.get('/health', (req, res) => {
    res.json({
        status: 'operational',
        users: socketManager.getTotalConnectedUsersCount(),
        timestamp: new Date().toISOString()
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io, socketManager };
