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

// Odadaki kullanıcıları detaylı (Hazır durumu dahil) getiren fonksiyon
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

// Oda durumunu (Herkes hazır mı?) kontrol edip herkese yayınlayan fonksiyon
function updateRoomState(roomName) {
    if(!roomName) return;
    const users = getRoomUsers(roomName);
    // En az 1 kişi olmalı ve herkesin 'ready' değeri true olmalı
    const allReady = users.length > 0 && users.every(u => u.ready);
    
    io.to(roomName).emit('update_player_list', { 
        users: users,
        count: users.length,
        canStart: allReady 
    });
}

io.on('connection', (socket) => {
    systemState.totalOperators++;
    io.emit('total_count', systemState.totalOperators);

    socket.on('join_room', (data) => {
        socket.rooms.forEach(room => { if (room !== socket.id) socket.leave(room); });
        
        socket.join(data.roomName);
        socket.username = data.username;
        socket.userIcon = data.userIcon;
        socket.isReady = false; // Yeni giren oyuncu varsayılan olarak hazır değil
        socket.currentRoom = data.roomName;

        updateRoomState(data.roomName);
    });

    // Oyuncu 'Hazır' butonuna bastığında
    socket.on('player_ready', () => {
        socket.isReady = true;
        updateRoomState(socket.currentRoom);
    });

    // Yönetici oyunu başlattığında (Sunucu tarafında son kontrolü yapar)
    socket.on('admin_start_game', (data) => {
        const users = getRoomUsers(socket.currentRoom);
        const allReady = users.every(u => u.ready);
        
        if(allReady && socket.currentRoom) {
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
        const roomBeforeExit = socket.currentRoom;
        systemState.totalOperators = Math.max(0, systemState.totalOperators - 1);
        io.emit('total_count', systemState.totalOperators);
        
        // Çıkan oyuncudan sonra oda durumunu güncelle
        setTimeout(() => { updateRoomState(roomBeforeExit); }, 100);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`ARENA MISSION CONTROL: PORT ${PORT}`);
});