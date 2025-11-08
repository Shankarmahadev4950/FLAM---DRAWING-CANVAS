import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import SocketManager from './SocketManager.js';

// ES6 equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Enhanced CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from client directory
const clientPath = path.join(__dirname, '../client');
app.use(express.static(clientPath, {
    maxAge: '1h',
    etag: true,
    index: 'index.html'
}));

// Enhanced Socket.IO configuration
const io = new SocketIO(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingInterval: 25000,
    pingTimeout: 60000,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e8, // 100MB max buffer size for large drawings
    transports: ['websocket', 'polling'] // Fallback support
});

// Initialize Socket Manager with error handling
let socketManager;
try {
    socketManager = new SocketManager(io);
    console.log('✅ Socket Manager initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize Socket Manager:', error);
    process.exit(1);
}

// Health check endpoint with detailed status
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'operational',
        server: 'collaborative-drawing-server',
        version: '1.0.0',
        users: socketManager.getUserCount ? socketManager.getUserCount() : 0,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(healthStatus);
});

// Server status endpoint
app.get('/status', (req, res) => {
    const status = {
        server: 'Collaborative Drawing Server',
        status: 'running',
        port: PORT,
        connections: io.engine.clientsCount,
        timestamp: new Date().toISOString()
    };
    
    res.json(status);
});

// Room information endpoint
app.get('/api/rooms', (req, res) => {
    const roomsInfo = {
        default: {
            users: socketManager.getUserCount ? socketManager.getUserCount() : 0,
            active: true
        }
    };
    
    res.json(roomsInfo);
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong!'
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API endpoint not found',
        path: req.originalUrl
    });
});

// Serve SPA for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

// Server configuration
const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

// Start server
server.listen(PORT, HOST, () => {
    console.log('🚀 Collaborative Drawing Server Started');
    console.log('========================================');
    console.log(`📍 Server URL: http://${HOST}:${PORT}`);
    console.log(`📁 Client Path: ${clientPath}`);
    console.log(`🔄 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`👥 Socket Manager: ${socketManager ? 'Active' : 'Inactive'}`);
    console.log('========================================');
    
    // Log server readiness
    console.log(`✅ Server is ready to accept connections on port ${PORT}`);
});

// Enhanced graceful shutdown handling
const gracefulShutdown = (signal) => {
    console.log(`\n📢 Received ${signal}. Starting graceful shutdown...`);
    
    // Close Socket.IO connections
    if (io) {
        console.log('🔌 Closing Socket.IO connections...');
        io.close(() => {
            console.log('✅ Socket.IO connections closed');
        });
    }
    
    // Close HTTP server
    server.close((err) => {
        if (err) {
            console.error('❌ Error during server close:', err);
            process.exit(1);
        }
        
        console.log('✅ HTTP server closed');
        console.log('👋 Server shutdown completed');
        process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.log('⏰ Forcing shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Process signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

// Uncaught exception handlers
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Server event listeners
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', error);
    }
});

server.on('listening', () => {
    console.log(`✅ Server successfully bound to port ${PORT}`);
});

// Export for testing purposes
export { app, server, io, socketManager };
