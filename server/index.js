import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// ES6 equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Socket.IO configuration
const io = new SocketIO(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Import and initialize SocketManager
const SocketManager = (await import('./SocketManager.js')).default;
const socketManager = new SocketManager(io);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        users: socketManager.getUserCount ? socketManager.getUserCount() : 0,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
