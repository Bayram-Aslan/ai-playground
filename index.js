const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Statik dosyaları (HTML, JS, CSS) sunmak için 'public' klasörünü kullan
app.use(express.static(path.join(__dirname, 'public')));

// Global Sistem Durumu
let systemState = {
    totalOperators: 0,
    rooms: new Map() // Oda bazlı kullanıcı takibi
};

io.on('connection', (socket) => {
    systemState.totalOperators++;
    console.log(`[SİSTEM] Yeni bir operatör bağlandı. Mevcut Sayı: ${systemState.totalOperators}`);

    // Tüm kullanıcılara anlık operatör sayısını gönder
    io.emit('total_count', systemState.totalOperators);

    // ODAYA KATILMA (Quiz Arena Kahoot Modu & Diğerleri)
    socket.on('join_room', (data) => {
        // Kullanıcıyı önceki odalarından çıkar (Kendi id odası hariç)
        socket.rooms.forEach(room => {
            if (room !== socket.id) {
                socket.leave(room);
            }
        });

        socket.join(data.roomName);
        socket.username = data.username;
        socket.currentRoom = data.roomName;

        console.log(`[ARENA] ${data.username}, ${data.roomName} odasına giriş yaptı.`);

        // Odaya katılanlara güncel oda mevcudunu bildir
        const room = io.sockets.adapter.rooms.get(data.roomName);
        const roomSize = room ? room.size : 0;
        
        io.to(data.roomName).emit('room_count', roomSize);
        
        // Diğer oyunculara yeni birinin geldiğini haber ver
        socket.to(data.roomName).emit('user_joined', { 
            username: data.username,
            totalInRoom: roomSize 
        });
    });

    // SKOR PAYLAŞIMI (Multiplayer rekabet için)
    socket.on('submit_score', (data) => {
        // Gelen skoru ilgili odadaki herkese yayınla (Leaderboard güncellemesi için)
        if(socket.currentRoom) {
            io.to(socket.currentRoom).emit('update_room_leaderboard', {
                username: data.username,
                score: data.score
            });
        }
    });

    // BAĞLANTI KESİLDİĞİNDE
    socket.on('disconnect', () => {
        systemState.totalOperators = Math.max(0, systemState.totalOperators - 1);
        io.emit('total_count', systemState.totalOperators);
        console.log(`[SİSTEM] Bir operatör ayrıldı. Kalan: ${systemState.totalOperators}`);
    });
});

// Render veya yerel ortam için uygun portu ayarla
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`ARENA MISSION CONTROL CENTER HAZIR!`);
    console.log(`PORT: ${PORT}`);
    console.log(`ADRES: http://localhost:${PORT}`);
    console.log(`-------------------------------------------`);
});