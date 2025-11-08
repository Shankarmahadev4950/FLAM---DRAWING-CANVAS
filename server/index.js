const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const SocketManager = require("./src/SocketManager");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

// ✅ Serve frontend (client folder)
app.use(express.static(path.join(__dirname, "../client")));

// ✅ Load index.html for all routes
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client", "index.html"));
});

new SocketManager(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
