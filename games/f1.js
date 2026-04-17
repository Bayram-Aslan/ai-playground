module.exports = {
    init: (io, socket, states) => {
        socket.emit('f1_skor_guncelle', states.f1BestScores);
    },
    handle: (io, socket, states) => {
        socket.on('f1_hazirlik', () => {
            // Sadece basan kişiye (socket.emit) gönderiyoruz
            socket.emit('f1_isiklari_hazirla'); 
            
            const bekleme = 2500 + (Math.random() * 3500); 
            setTimeout(() => {
                socket.emit('f1_isiklari_sondur');
            }, bekleme);
        });

        socket.on('f1_finish', (data) => {
            if (!states.f1BestScores[data.username] || data.sure < states.f1BestScores[data.username]) {
                states.f1BestScores[data.username] = data.sure;
            }
            io.to('f1').emit('f1_skor_guncelle', states.f1BestScores);
            io.to('f1').emit('f1_son_deneme', { user: data.username, sure: data.sure });
        });
    }
};