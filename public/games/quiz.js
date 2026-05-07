const socket = io();
const operatorData = JSON.parse(localStorage.getItem('hubOperator') || '{"name":"OPERATÖR","icon":"🤖"}');
const userName = operatorData.name.toUpperCase();
const userIcon = operatorData.icon;

const bigQuestionPool = {
    elektrik: [
        {q: "B=100.000 Gauss değeri kaç Tesla'dır?", a: ["0.1", "1", "10", "100"], c: 1},
        {q: "S7-1200 PLC hangi markaya aittir?", a: ["ABB", "Schneider", "Siemens", "Delta"], c: 2},
        {q: "Buck Converter devresi temel olarak ne yapar?", a: ["Gerilim Yükseltir", "Gerilim Düşürür", "Frekans Artırır", "AC Çıkış Verir"], c: 1},
        {q: "Afyon Kocatepe Üniversitesi Elektrik Bölüm Başkanı kimdir?", a: ["Cenk Yavuz", "Ali Demir", "Veli Can", "Ahmet Ak"], c: 0}
    ],
    spor: [{q: "Fenerbahçe Spor Kulübü hangi yıl kurulmuştur?", a: ["1903", "1905", "1907", "1923"], c: 2}],
    genel: [{q: "Dünyanın en yüksek dağı hangisidir?", a: ["Everest", "K2", "Ağrı", "Fujiyama"], c: 0}],
    tarih: [{q: "İstanbul kaç yılında fethedilmiştir?", a: ["1071", "1299", "1453", "1923"], c: 2}]
};

let currentQuestionSet = [];
let currentQ = 0, myScore = 0, correctCount = 0, timer, timeLeft = 10, canAnswer = true;
let isMultiplayer = false;
let players = []; // Liderlik tablosu için

function selectCategory(cat) {
    currentQuestionSet = bigQuestionPool[cat];
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
    document.getElementById('user-info-lobby').innerText = `KATEGORİ: ${cat.toUpperCase()}`;
}

function joinMultiplayer() {
    const room = document.getElementById('room-input').value.toUpperCase();
    if(room.length < 3) return alert("Hatalı Oda Kodu!");
    isMultiplayer = true;
    socket.emit('join_room', { roomName: room, username: userName, userIcon: userIcon });
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
}

// --- YENİ: ODADAKİ KULLANICI LİSTESİNİ GÜNCELLE ---
socket.on('update_player_list', (data) => {
    const lobbyTitle = document.getElementById('lobby-title');
    const startBtn = document.getElementById('start-trigger');
    
    lobbyTitle.innerText = `ODA MEVCUDU: ${data.count} OPERATÖR`;
    
    // Eğer odada bir liste alanı yoksa oluştur (Basit bir liste alanı varsayıyoruz)
    let listArea = document.getElementById('player-list-area');
    if(!listArea) {
        listArea = document.createElement('div');
        listArea.id = 'player-list-area';
        listArea.style = "margin: 20px 0; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;";
        document.getElementById('lobby').insertBefore(listArea, startBtn);
    }

    listArea.innerHTML = data.users.map(u => `
        <div style="background:rgba(0,255,136,0.1); border:1px solid var(--neon); padding:10px 15px; border-radius:5px; font-family:'Orbitron'; font-size:0.8rem;">
            ${u.icon} ${u.name}
        </div>
    `).join('');
});

function triggerStart() {
    if(isMultiplayer) socket.emit('admin_start_game');
    else startCountdown();
}

socket.on('game_started_by_admin', () => {
    startCountdown();
});

function startCountdown() {
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
    document.getElementById('options').innerHTML = '';
    qData.a.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'opt-btn';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(i);
        document.getElementById('options').appendChild(btn);
    });
    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft -= 0.1;
        if(document.getElementById('timer-bar')) document.getElementById('timer-bar').style.width = (timeLeft * 10) + "%";
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
        let gain = Math.ceil(100 + (timeLeft * 10));
        myScore += gain;
        correctCount++;
        confetti({ particleCount: 100, spread: 70 });
        document.getElementById('feedback-box').innerHTML = `<span style='color:var(--neon)'>DOĞRULANDI! +${gain}</span>`;
    } else {
        document.getElementById('feedback-box').innerHTML = `<span style='color:var(--danger)'>HATALI!</span>`;
    }
    if(isMultiplayer) socket.emit('submit_score', { username: userName, score: myScore });
    setTimeout(() => { currentQ++; loadQuestion(); }, 2000);
}

function updateLeaderboard() {
    const list = document.getElementById('lb-list');
    // Yerel skoru listede güncelle veya ekle
    let me = players.find(p => p.name === userName);
    if(me) me.score = myScore;
    else players.push({name: userName, score: myScore, icon: userIcon});

    players.sort((a, b) => b.score - a.score);
    list.innerHTML = players.map((p, i) => `
        <div class="lb-item ${p.name === userName ? 'me' : ''}">
            <span>${i+1}. ${p.icon || '🤖'} ${p.name}</span>
            <span>${p.score} P</span>
        </div>`).join('');
}

socket.on('update_room_leaderboard', (data) => {
    let p = players.find(player => player.name === data.username);
    if(p) p.score = data.score;
    else players.push({name: data.username, score: data.score, icon: "👤"});
    updateLeaderboard();
});

function endBattle() {
    clearInterval(timer);
    const myRank = players.findIndex(p => p.name === userName) + 1;
    document.getElementById('arena').style.display = 'none';
    document.getElementById('end-screen').style.display = 'flex';
    document.getElementById('final-rank').innerText = `#${myRank}`;
    document.getElementById('final-score').innerText = myScore;
    document.getElementById('final-correct').innerText = correctCount;
    const ratio = currentQuestionSet.length > 0 ? Math.round((correctCount / currentQuestionSet.length) * 100) : 0;
    document.getElementById('final-ratio').innerText = `%${ratio}`;
}

function restartGame() {
    location.reload(); // En temiz sıfırlama için
}