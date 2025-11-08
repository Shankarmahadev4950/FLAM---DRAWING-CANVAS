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


app.use(express.static(path.join(__dirname, "../client")));

const socketClientPath = require.resolve("socket.io/client-dist/socket.io.js");
app.get("/socket.io/socket.io.js", (req, res) => {
    res.sendFile(socketClientPath);
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/index.html"));
});
new SocketManager(io);
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
