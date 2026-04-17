const sorular = [
    { s: "Ohm Kanunu formülü nedir?", siklar: ["V=I*R", "P=V*I", "I=V/P", "V=P/I"], c: 0 },
    { s: "Buck Converter ne işe yarar?", siklar: ["Gerilimi yükseltir", "Gerilimi düşürür", "DC'yi AC yapar", "Akımı sabitler"], c: 1 },
    { s: "TRISB register'ında 0 neyi ifade eder?", siklar: ["Input", "Output", "Analog", "Reset"], c: 1 }
];

module.exports = {
    init: (io, socket, states) => {
        socket.emit('quiz_skor_guncelle', states.quizPuanlar);
        socket.emit('yeni_soru', { soru: sorular[0], no: 0 });
    },
    handle: (io, socket, states) => {
        socket.on('quiz_cevap_ver', (data) => {
            if(data.cevap === sorular[data.soruNo].c) {
                states.quizPuanlar[socket.username] = (states.quizPuanlar[socket.username] || 0) + 10;
            }
            io.to('quiz').emit('quiz_skor_guncelle', states.quizPuanlar);
            
            let sonraki = data.soruNo + 1;
            if(sonraki < sorular.length) {
                socket.emit('yeni_soru', { soru: sorular[sonraki], no: sonraki });
            } else {
                socket.emit('quiz_bitti', states.quizPuanlar[socket.username]);
            }
        });
    }
};
