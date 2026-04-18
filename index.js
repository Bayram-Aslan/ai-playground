const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let gameStates = {
    f1BestScores: {},
    quizPuanlar: {},
    toplamKullanici: 0
};



io.on('connection', (socket) => {
    gameStates.toplamKullanici++;
    io.emit('total_count', gameStates.toplamKullanici);

    socket.on('join_room', (data) => {
        Array.from(socket.rooms).forEach(r => { if(r !== socket.id) socket.leave(r); });
        socket.join(data.roomName);
        socket.username = data.username;
        socket.room = data.roomName;

        if(data.roomName === 'f1') f1Logic.init(io, socket, gameStates);
        
        setTimeout(() => {
            const room = io.sockets.adapter.rooms.get(data.roomName);
            io.to(data.roomName).emit('room_count', room ? room.size : 0);
        }, 200);
    });

    f1Logic.handle(io, socket, gameStates);

    socket.on('disconnect', () => {
        gameStates.toplamKullanici--;
        io.emit('total_count', gameStates.toplamKullanici);
    });
});

server.listen(3000, () => console.log('SİSTEM 3000 PORTUNDA HAZIR!'));