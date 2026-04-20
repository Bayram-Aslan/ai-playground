const socket = io();
const userName = (JSON.parse(localStorage.getItem('user'))?.name || "OPERATÖR").toUpperCase();

const bigQuestionPool = {
    elektrik: [
        {q: "B=100.000 Gauss değeri kaç Tesla'dır?", a: ["0.1", "1", "10", "100"], c: 1}, //
        {q: "S7-1200 PLC hangi markaya aittir?", a: ["ABB", "Schneider", "Siemens", "Delta"], c: 2},
        {q: "Buck Converter devresi temel olarak ne yapar?", a: ["Gerilim Yükseltir", "Gerilim Düşürür", "Frekans Artırır", "AC Çıkış Verir"], c: 1},
        {q: "Afyon Kocatepe Üniversitesi Elektrik Bölüm Başkanı kimdir?", a: ["Cenk Yavuz", "Ali Demir", "Veli Can", "Ahmet Ak"], c: 0} //
    ],
    spor: [
        {q: "Fenerbahçe Spor Kulübü hangi yıl kurulmuştur?", a: ["1903", "1905", "1907", "1923"], c: 2} //
    ],
    genel: [{q: "Dünyanın en yüksek dağı hangisidir?", a: ["Everest", "K2", "Ağrı", "Fujiyama"], c: 0}],
    tarih: [{q: "İstanbul kaç yılında fethedilmiştir?", a: ["1071", "1299", "1453", "1923"], c: 2}]
};

let currentQuestionSet = [];
let currentQ = 0, myScore = 0, correctCount = 0, timer, timeLeft = 10, canAnswer = true;
let isMultiplayer = false;

let players = [
    {name: "CENK_HOCA", score: 0, IQ: 0.90, speed: 1.1}, //
    {name: "AYHANCAN", score: 0, IQ: 0.75, speed: 0.8}, //
    {name: "ROBOT_V3", score: 0, IQ: 0.60, speed: 1.3}
];

function selectCategory(cat) {
    currentQuestionSet = bigQuestionPool[cat];
    if(!currentQuestionSet || currentQuestionSet.length === 0) return alert("Soru bekleniyor...");
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
    document.getElementById('user-info-lobby').innerText = `KATEGORİ: ${cat.toUpperCase()}`;
}

function joinMultiplayer() {
    const room = document.getElementById('room-input').value.toUpperCase();
    if(room.length < 3) return alert("Kod girin!");
    isMultiplayer = true;
    socket.emit('join_room', { roomName: room, username: userName });
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
}

function triggerStart() {
    document.getElementById('start-trigger').style.display = 'none';
    let cd = 3;
    let interval = setInterval(() => {
        document.getElementById('countdown').innerText = cd;
        cd--;
        if(cd < 0) { clearInterval(interval); startArena(); }
    }, 1000);
}

function startArena() {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('arena').style.display = 'grid';
    loadQuestion();
}

function loadQuestion() {
    if(currentQ >= currentQuestionSet.length) return endBattle();
    canAnswer = true; timeLeft = 10; updateLeaderboard();
    
    const qData = currentQuestionSet[currentQ];
    document.getElementById('q-number').innerText = `MISSION: ${currentQ + 1} / ${currentQuestionSet.length}`;
    document.getElementById('q-text').innerText = qData.q;
    document.getElementById('feedback-box').innerHTML = "";
    
    const optDiv = document.getElementById('options');
    optDiv.innerHTML = '';
    qData.a.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(i);
        optDiv.appendChild(btn);
    });

    startTimer();
    if(!isMultiplayer) simulateAIBots();
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft -= 0.1;
        document.getElementById('timer-bar').style.width = (timeLeft * 10) + "%";
        if(timeLeft <= 0) { clearInterval(timer); if(canAnswer) checkAnswer(-1); }
    }, 100);
}

function checkAnswer(idx) {
    if(!canAnswer) return;
    canAnswer = false;
    clearInterval(timer);
    
    const correctIdx = currentQuestionSet[currentQ].c;
    const buttons = document.querySelectorAll('.opt-btn');
    
    buttons.forEach((btn, i) => {
        if(i === correctIdx) btn.style.borderColor = "var(--neon)";
        if(i === idx && i !== correctIdx) btn.style.borderColor = "var(--danger)";
    });

    if(idx === correctIdx) {
        let gain = Math.ceil(10 + timeLeft);
        myScore += gain;
        correctCount++;
        confetti({ particleCount: 80, spread: 60 });
        document.getElementById('feedback-box').innerHTML = `<span style='color:var(--neon)'>SİSTEM DOĞRULANDI!</span>`;
    } else {
        document.getElementById('feedback-box').innerHTML = `<span style='color:var(--danger)'>HATALI VERİ!</span>`;
    }

    setTimeout(() => { currentQ++; loadQuestion(); }, 1800);
}

function simulateAIBots() {
    players.forEach(p => {
        if(p.name === userName) return;
        setTimeout(() => {
            if(!canAnswer && currentQ < currentQuestionSet.length) {
                if(Math.random() < p.IQ) p.score += Math.floor(10 + Math.random() * 5);
                updateLeaderboard();
            }
        }, Math.random() * 3000 + 2000);
    });
}

function updateLeaderboard() {
    const list = document.getElementById('lb-list');
    let me = players.find(p => p.name === userName);
    if(!me) players.push({name: userName, score: myScore});
    else me.score = myScore;

    players.sort((a, b) => b.score - a.score);
    list.innerHTML = players.map((p, i) => `
        <div class="lb-item ${p.name === userName ? 'me' : ''}">
            <span>${i+1}. ${p.name}</span>
            <span>${p.score} P</span>
        </div>
    `).join('');
}

function endBattle() {
    clearInterval(timer);
    
    // Son bir kez liderlik tablosunu güncelle ve sıralamayı netleştir
    updateLeaderboard();
    const myRank = players.findIndex(p => p.name === userName) + 1;

    // Arayüz geçişi
    document.getElementById('arena').style.display = 'none';
    document.getElementById('end-screen').style.display = 'flex';
    
    // VERİLERİ YAZDIR (FOTOĞRAFTA ÇALIŞMAYAN KISIM BURASIYDI)
    document.getElementById('final-rank').innerText = `#${myRank}`;
    document.getElementById('final-score').innerText = myScore;
    document.getElementById('final-correct').innerText = correctCount;
    
    // Başarı yüzdesi hesabı
    const ratio = currentQuestionSet.length > 0 ? Math.round((correctCount / currentQuestionSet.length) * 100) : 0;
    document.getElementById('final-ratio').innerText = `%${ratio}`;
    
    // Mesaj belirle
    const msg = document.getElementById('end-message');
    if(myRank === 1) msg.innerText = "LİDERLİK KOLTUĞUNDASIN OPERATÖR!";
    else if(myRank <= 2) msg.innerText = "MÜKEMMEL ANALİZ, ZİRVEYE ÇOK YAKIN.";
    else msg.innerText = "GÖREV TAMAMLANDI, VERİ ANALİZ EDİLDİ.";
    
    localStorage.setItem('quiz_best', Math.max(myScore, localStorage.getItem('quiz_best') || 0));
}

function restartGame() {
    // Tüm oyun değişkenlerini sıfırla
    currentQ = 0; 
    myScore = 0; 
    correctCount = 0;
    players.forEach(p => p.score = 0);
    
    // UI'ı temizle ve başa dön
    document.getElementById('end-screen').style.display = 'none';
    document.getElementById('init-screen').style.display = 'block';
    document.getElementById('start-trigger').style.display = 'block';
    document.getElementById('countdown').innerText = "";
    
    // Liderlik tablosunu (LB) temizle
    updateLeaderboard();
}

socket.on('user_joined', (data) => { console.log("Yeni oyuncu katıldı:", data.username); });