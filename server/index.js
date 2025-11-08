const express = require("express");
const http = require("http");
const path = require("path");
const socketIO = require("socket.io");
const SocketManager = require("./src/SocketManager");

const app = express();
const server = http.createServer(app);


const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, ".."))); 

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

new SocketManager(io);


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
