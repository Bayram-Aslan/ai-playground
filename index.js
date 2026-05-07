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

function checkAllAnswered(roomName) {
    const clients = io.sockets.adapter.rooms.get(roomName);
    if(!clients) return;
    let allAnswered = true;
    clients.forEach(id => {
        const s = io.sockets.sockets.get(id);
        if(s && !s.hasAnswered) allAnswered = false; 
    });
    if(allAnswered && clients.size > 0) {
        io.to(roomName).emit('all_answered');
    }
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
        socket.hasAnswered = false; 
        socket.currentRoom = data.roomName;

        if(data.roomName === 'f1' && typeof f1Logic !== 'undefined') {
            f1Logic.init(io, socket, gameStates);
        } else {
            broadcastRoomUpdate(data.roomName);
        }
    });

    if(typeof f1Logic !== 'undefined') f1Logic.handle(io, socket, gameStates);

    socket.on('player_ready', () => {
        socket.isReady = true;
        broadcastRoomUpdate(socket.currentRoom);
    });

    socket.on('admin_start_game', (data) => {
        if(socket.currentRoom) {
            io.to(socket.currentRoom).emit('game_started_by_admin', { category: data.category });
        }
    });

    socket.on('question_loaded', () => {
        socket.hasAnswered = false;
    });

    socket.on('player_answered', () => {
        socket.hasAnswered = true;
        checkAllAnswered(socket.currentRoom);
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
        if(r) {
            setTimeout(() => { 
                broadcastRoomUpdate(r); 
                checkAllAnswered(r); 
            }, 200);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`ARENA SERVER RUNNING ON PORT ${PORT}`));