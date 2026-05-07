const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    socket.on('join_room', (data) => {
        socket.rooms.forEach(room => { if (room !== socket.id) socket.leave(room); });
        socket.join(data.roomName);
        socket.username = data.username;
        socket.userIcon = data.userIcon;
        socket.isReady = false;
        socket.currentRoom = data.roomName;
        broadcastRoomUpdate(data.roomName);
    });

    socket.on('player_ready', () => {
        socket.isReady = true;
        broadcastRoomUpdate(socket.currentRoom);
    });

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
        const room = socket.currentRoom;
        setTimeout(() => { if(room) broadcastRoomUpdate(room); }, 200);
    });

    function broadcastRoomUpdate(roomName) {
        if(!roomName) return;
        const users = [];
        const clients = io.sockets.adapter.rooms.get(roomName);
        if(clients) {
            clients.forEach(id => {
                const s = io.sockets.sockets.get(id);
                if(s && s.username) users.push({ name: s.username, icon: s.userIcon, ready: s.isReady });
            });
        }
        const allReady = users.length > 0 && users.every(u => u.ready);
        io.to(roomName).emit('update_player_list', { users, canStart: allReady });
    }
});

server.listen(process.env.PORT || 3000, () => console.log("ARENA ONLINE"));