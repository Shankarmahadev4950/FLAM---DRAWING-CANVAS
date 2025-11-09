import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import SocketManager from './SocketManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());

const rootPath = join(__dirname, '..');
console.log('📁 Serving static files from:', rootPath);
app.use(express.static(rootPath));

// Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

// Initialize Socket Manager
const socketManager = new SocketManager(io);

// Routes
app.get('/', (req, res) => {
    const indexPath = join(rootPath, 'index.html');
    console.log('📄 Sending index.html from:', indexPath);
    res.sendFile(indexPath);
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        connectedUsers: socketManager.getTotalConnectedUsersCount(),
        uptime: process.uptime()
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🌐 Open http://localhost:${PORT}`);
});

export default app;
