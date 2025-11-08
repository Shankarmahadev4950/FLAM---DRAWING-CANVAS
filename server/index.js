const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const SocketManager = require("./src/SocketManager");

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: { origin: "*" }
});

// ✅ Serve all frontend files from client folder
app.use(express.static(path.join(__dirname, "../client")));

// ✅ Ensure index.html loads for all routes (SPA fallback)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client", "index.html"));
});

// Initialize socket logic
new SocketManager(io);

// ✅ Use Render-provided port
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
    console.log(`🚀 Server running on port ${PORT}`)
);
