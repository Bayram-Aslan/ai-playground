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

function getRoomUsers(roomName) {
    const users = [];
    const clients = io.sockets.adapter.rooms.get(roomName);
    if (clients) {
        clients.forEach(clientId => {
            const s = io.sockets.sockets.get(clientId);
            if (s && s.username) {
                users.push({ 
                    name: s.username, 
                    icon: s.userIcon || "👤", 
                    ready: s.isReady || false 
                });
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
        socket.userIcon = data.userIcon;
        socket.isReady = false;
        socket.currentRoom = data.roomName;

        io.to(data.roomName).emit('update_player_list', {
            users: getRoomUsers(data.roomName)
        });
    });

    // Kullanıcı hazır butonuna bastığında
    socket.on('player_ready', () => {
        socket.isReady = true;
        if(socket.currentRoom) {
            const users = getRoomUsers(socket.currentRoom);
            io.to(socket.currentRoom).emit('update_player_list', { users });
            
            // Eğer herkes hazırsa (opsiyonel otomatik başlatma için kontrol edilebilir)
            const allReady = users.every(u => u.ready);
            if(allReady) io.to(socket.currentRoom).emit('all_players_ready');
        }
    });

    // Kategori seçildiğinde ve başlatıldığında
    socket.on('admin_start_game', (data) => {
        if(socket.currentRoom) {
            io.to(socket.currentRoom).emit('game_started_by_admin', { category: data.category });
        }
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
            io.to(socket.currentRoom).emit('update_player_list', { users: getRoomUsers(socket.currentRoom) });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`ARENA MISSION CONTROL: PORT ${PORT}`);
});