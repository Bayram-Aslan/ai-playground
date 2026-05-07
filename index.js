const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

let gameStates = {
    f1BestScores: {},
    quizPuanlar: {},
    toplamKullanici: 0
};

function getRoomUsers(roomName) {
    const users = [];
    const clients = io.sockets.adapter.rooms.get(roomName);
    if(clients) {
        clients.forEach(id => {
            const s = io.sockets.sockets.get(id);
            if(s && s.username) {
                users.push({ name: s.username, icon: s.userIcon, ready: s.isReady });
            }
        });
    }
    return users;
}

function broadcastRoomUpdate(roomName) {
    if(!roomName) return;
    const users = getRoomUsers(roomName);
    const allReady = users.length > 0 && users.every(u => u.ready);
    io.to(roomName).emit('update_player_list', { users, canStart: allReady });
}

io.on('connection', (socket) => {
    gameStates.toplamKullanici++;
    io.emit('total_count', gameStates.toplamKullanici);

    socket.on('join_room', (data) => {
        Array.from(socket.rooms).forEach(r => { if(r !== socket.id) socket.leave(r); });
        socket.join(data.roomName);
        socket.username = data.username;
        socket.userIcon = data.userIcon || "👤";
        socket.isReady = false; 
        socket.currentRoom = data.roomName;

        if(data.roomName === 'f1' && typeof f1Logic !== 'undefined') {
            f1Logic.init(io, socket, gameStates);
        } else {
            broadcastRoomUpdate(data.roomName);
        }
        
        setTimeout(() => {
            const room = io.sockets.adapter.rooms.get(data.roomName);
            io.to(data.roomName).emit('room_count', room ? room.size : 0);
        }, 200);
    });

    if(typeof f1Logic !== 'undefined') {
        f1Logic.handle(io, socket, gameStates);
    }

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
        gameStates.toplamKullanici--;
        io.emit('total_count', gameStates.toplamKullanici);
        const r = socket.currentRoom;
        setTimeout(() => { if(r) broadcastRoomUpdate(r); }, 200);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`ARENA SERVER RUNNING ON PORT ${PORT}`));