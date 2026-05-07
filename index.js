const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static(path.join(__dirname, 'public')));

let systemState = { totalOperators: 0 };

// Odadaki kullanıcıları takip etmek için yardımcı fonksiyon
function getRoomUsers(roomName) {
    const users = [];
    const clients = io.sockets.adapter.rooms.get(roomName);
    if (clients) {
        clients.forEach(clientId => {
            const s = io.sockets.sockets.get(clientId);
            if (s && s.username) {
                users.push({ name: s.username, icon: s.userIcon || "👤" });
            }
        });
    }
    return users;
}

io.on('connection', (socket) => {
    systemState.totalOperators++;
    io.emit('total_count', systemState.totalOperators);

    socket.on('join_room', (data) => {
        socket.rooms.forEach(room => { if (room !== socket.id) socket.leave(room); });
        
        socket.join(data.roomName);
        socket.username = data.username;
        socket.userIcon = data.userIcon; // İkon desteği eklendi
        socket.currentRoom = data.roomName;

        const roomUsers = getRoomUsers(data.roomName);
        // Odadaki herkese güncel listeyi ve sayıyı gönder
        io.to(data.roomName).emit('update_player_list', {
            users: roomUsers,
            count: roomUsers.length
        });
    });

    socket.on('admin_start_game', () => {
        if(socket.currentRoom) io.to(socket.currentRoom).emit('game_started_by_admin');
    });

    socket.on('submit_score', (data) => {
        if(socket.currentRoom) {
            io.to(socket.currentRoom).emit('update_room_leaderboard', {
                username: data.username,
                score: data.score
            });
        }
    });

    socket.on('disconnect', () => {
        systemState.totalOperators = Math.max(0, systemState.totalOperators - 1);
        io.emit('total_count', systemState.totalOperators);
        
        if(socket.currentRoom) {
            const roomUsers = getRoomUsers(socket.currentRoom);
            io.to(socket.currentRoom).emit('update_player_list', {
                users: roomUsers,
                count: roomUsers.length
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`ARENA MISSION CONTROL: PORT ${PORT}`);
});