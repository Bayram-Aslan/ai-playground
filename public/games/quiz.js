const socket = io();
const operatorData = JSON.parse(localStorage.getItem('hubOperator') || '{"name":"OPERATÖR","icon":"🤖"}');
const userName = operatorData.name.toUpperCase();
const userIcon = operatorData.icon;

const bigQuestionPool = {
    elektrik: [
        {q: "B=100.000 Gauss değeri kaç Tesla'dır?", a: ["0.1", "1", "10", "100"], c: 1},
        {q: "S7-1200 PLC hangi markaya aittir?", a: ["ABB", "Schneider", "Siemens", "Delta"], c: 2}
    ],
    spor: [{q: "Fenerbahçe hangi yıl kuruldu?", a: ["1903", "1905", "1907", "1923"], c: 2}],
    tarih: [{q: "İstanbul fethi?", a: ["1071", "1453", "1299", "1923"], c: 1}],
    genel: [{q: "En yüksek dağ?", a: ["Everest", "K2", "Ağrı", "Erciyes"], c: 0}],
    bilim: [{q: "H2O nedir?", a: ["Su", "Tuz", "Hava", "Şeker"], c: 0}],
    edebiyat: [{q: "Sinekli Bakkal?", a: ["Halide Edib", "Reşat Nuri", "Peyami Safa", "Ziya Gökalp"], c: 0}],
    film: [{q: "Inception?", a: ["Nolan", "Spielberg", "Cameron", "Tarantino"], c: 0}]
};

let currentQuestionSet = [];
let currentQ = 0, myScore = 0, correctCount = 0, timer, timeLeft = 10;
let isMultiplayer = false, amIReady = false, canStartServer = false;
let players = [], selectedCategoryName = "elektrik";

function joinMultiplayer() {
    const room = document.getElementById('room-input').value.toUpperCase();
    if(room.length < 3) return alert("Hatalı Oda Kodu!");
    isMultiplayer = true;
    socket.emit('join_room', { roomName: room, username: userName, userIcon: userIcon });
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
    showCategorySelection();
}

function showCategorySelection() {
    let catArea = document.getElementById('category-area');
    if(!catArea) {
        catArea = document.createElement('div');
        catArea.id = 'category-area';
        catArea.style = "margin: 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;";
        document.getElementById('lobby').insertBefore(catArea, document.getElementById('start-trigger'));
    }
    catArea.innerHTML = Object.keys(bigQuestionPool).map(c => `
        <button onclick="setCategory('${c}')" class="opt-btn" id="btn-${c}" style="padding:10px; font-size:0.7rem;">
            ${c.toUpperCase()}
        </button>
    `).join('');
    setCategory(selectedCategoryName);
}

function setCategory(c) {
    selectedCategoryName = c;
    document.querySelectorAll('#category-area button').forEach(b => b.style.borderColor = "#333");
    if(document.getElementById(`btn-${c}`)) document.getElementById(`btn-${c}`).style.borderColor = "var(--neon)";
}

function triggerAction() {
    if(!amIReady) {
        amIReady = true;
        socket.emit('player_ready');
        // Butonu hemen geri bildirim için güncelle
        const btn = document.getElementById('start-trigger');
        btn.innerText = "BEKLENİYOR...";
        btn.style.background = "#222";
    } else if(canStartServer) {
        socket.emit('admin_start_game', { category: selectedCategoryName });
    }
}

socket.on('update_player_list', (data) => {
    document.getElementById('lobby-title').innerText = `ARENA: ${data.users.length} OPERATÖR`;
    canStartServer = data.canStart;

    let listArea = document.getElementById('player-list-area') || createListArea();
    listArea.innerHTML = data.users.map(u => `
        <div style="background:${u.ready ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${u.ready ? 'var(--neon)' : '#333'}; padding:8px; border-radius:5px; font-size:0.7rem;">
            ${u.ready ? '✅' : '⏳'} ${u.icon} ${u.name}
        </div>`).join('');

    const btn = document.getElementById('start-trigger');
    if(!amIReady) {
        btn.innerText = "HAZIR OL";
        btn.style.background = "white";
        btn.style.color = "black";
    } else if(data.canStart) {
        btn.innerText = "OPERASYONU BAŞLAT";
        btn.style.background = "var(--neon)";
        btn.style.color = "black";
    } else {
        btn.innerText = "DİĞERLERİ BEKLENİYOR...";
        btn.style.background = "#222";
        btn.style.color = "#666";
    }
});

function createListArea() {
    const la = document.createElement('div');
    la.id = 'player-list-area';
    la.style = "margin: 20px 0; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;";
    document.getElementById('lobby').insertBefore(la, document.getElementById('category-area'));
    return la;
}

socket.on('game_started_by_admin', (data) => {
    currentQuestionSet = bigQuestionPool[data.category];
    startCountdown();
});

function startCountdown() {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('arena').style.display = 'grid';
    let cd = 3;
    let interval = setInterval(() => {
        document.getElementById('q-text').innerText = `BAŞLIYOR: ${cd}`;
        cd--;
        if(cd < 0) { clearInterval(interval); loadQuestion(); }
    }, 1000);
}

function loadQuestion() {
    if(currentQ >= currentQuestionSet.length) return endBattle();
    timeLeft = 10; updateLeaderboard();
    const qData = currentQuestionSet[currentQ];
    document.getElementById('q-number').innerText = `MISSION: ${currentQ + 1} / ${currentQuestionSet.length}`;
    document.getElementById('q-text').innerText = qData.q;
    document.getElementById('options').innerHTML = '';
    qData.a.forEach((opt, i) => {
        const b = document.createElement('button');
        b.className = 'opt-btn'; b.innerText = opt;
        b.onclick = () => checkAnswer(i);
        document.getElementById('options').appendChild(b);
    });
    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft -= 0.1;
        if(document.getElementById('timer-bar')) document.getElementById('timer-bar').style.width = (timeLeft * 10) + "%";
        if(timeLeft <= 0) { clearInterval(timer); checkAnswer(-1); }
    }, 100);
}

function checkAnswer(idx) {
    clearInterval(timer);
    if(idx === currentQuestionSet[currentQ].c) {
        myScore += Math.ceil(100 + (timeLeft * 10));
        correctCount++;
        confetti({ particleCount: 50, spread: 60 });
    }
    socket.emit('submit_score', { username: userName, score: myScore });
    setTimeout(() => { currentQ++; loadQuestion(); }, 1500);
}

function updateLeaderboard() {
    const list = document.getElementById('lb-list');
    let me = players.find(p => p.name === userName);
    if(!me) players.push({name: userName, score: myScore, icon: userIcon}); else me.score = myScore;
    players.sort((a, b) => b.score - a.score);
    list.innerHTML = players.map((p, i) => `<div class="lb-item ${p.name === userName ? 'me' : ''}"><span>${i+1}. ${p.icon} ${p.name}</span><span>${p.score} P</span></div>`).join('');
}

socket.on('update_room_leaderboard', (data) => {
    let p = players.find(player => player.name === data.username);
    if(p) p.score = data.score; else players.push({name: data.username, score: data.score, icon: "👤"});
    updateLeaderboard();
});

function endBattle() {
    document.getElementById('arena').style.display = 'none';
    document.getElementById('end-screen').style.display = 'flex';
    document.getElementById('final-score').innerText = myScore;
}