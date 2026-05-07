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
    tarih: [{q: "İstanbul'un fethi?", a: ["1071", "1453", "1299", "1923"], c: 1}],
    genel: [{q: "En yüksek dağ?", a: ["Everest", "K2", "Ağrı", "Erciyes"], c: 0}],
    bilim: [{q: "Suyun formülü?", a: ["H2O", "CO2", "O2", "N2"], c: 0}],
    edebiyat: [{q: "Sinekli Bakkal yazarı?", a: ["Halide Edib", "Reşat Nuri", "Peyami Safa", "Ziya Gökalp"], c: 0}],
    film: [{q: "Inception yönetmeni?", a: ["Nolan", "Spielberg", "Cameron", "Tarantino"], c: 0}]
};

let currentQuestionSet = [];
let currentQ = 0, myScore = 0, correctCount = 0, timer, timeLeft = 10;
let isMultiplayer = false;
let players = [];
let selectedCategoryName = "elektrik"; // Varsayılan

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
    const lobby = document.getElementById('lobby');
    let catArea = document.getElementById('category-area');
    if(!catArea) {
        catArea = document.createElement('div');
        catArea.id = 'category-area';
        catArea.style = "margin: 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;";
        lobby.insertBefore(catArea, document.getElementById('start-trigger'));
    }
    
    const cats = Object.keys(bigQuestionPool);
    catArea.innerHTML = cats.map(c => `
        <button onclick="setCategory('${c}')" class="opt-btn" id="btn-${c}" style="padding:10px; font-size:0.7rem;">
            ${c.toUpperCase()}
        </button>
    `).join('');
    setCategory(selectedCategoryName);
}

function setCategory(c) {
    selectedCategoryName = c;
    document.querySelectorAll('#category-area button').forEach(b => b.style.borderColor = "rgba(255,255,255,0.1)");
    const activeBtn = document.getElementById(`btn-${c}`);
    if(activeBtn) activeBtn.style.borderColor = "var(--neon)";
}

// "HAZIR" Butonuna basıldığında
function triggerReady() {
    socket.emit('player_ready');
    const btn = document.getElementById('start-trigger');
    btn.innerText = "HAZIRLIK TAMAM";
    btn.disabled = true;
    btn.style.opacity = "0.5";
}

socket.on('update_player_list', (data) => {
    document.getElementById('lobby-title').innerText = `ARENA: ${data.users.length} OPERATÖR`;
    let listArea = document.getElementById('player-list-area');
    if(!listArea) {
        listArea = document.createElement('div');
        listArea.id = 'player-list-area';
        listArea.style = "margin: 20px 0; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;";
        document.getElementById('lobby').insertBefore(listArea, document.getElementById('category-area'));
    }

    listArea.innerHTML = data.users.map(u => `
        <div style="background:${u.ready ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.05)'}; 
                    border:1px solid ${u.ready ? 'var(--neon)' : '#333'}; 
                    padding:10px; border-radius:5px; font-family:'Orbitron'; font-size:0.7rem;">
            ${u.ready ? '✅' : '⏳'} ${u.icon} ${u.name}
        </div>
    `).join('');
});

// YÖNETİCİ BAŞLATMA (Herkes hazır olunca veya sen basınca)
function triggerStart() {
    socket.emit('admin_start_game', { category: selectedCategoryName });
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
        document.getElementById('timer-bar').style.width = (timeLeft * 10) + "%";
        if(timeLeft <= 0) { clearInterval(timer); checkAnswer(-1); }
    }, 100);
}

function checkAnswer(idx) {
    clearInterval(timer);
    const correctIdx = currentQuestionSet[currentQ].c;
    if(idx === correctIdx) {
        let gain = Math.ceil(100 + (timeLeft * 10));
        myScore += gain;
        correctCount++;
        confetti({ particleCount: 50, spread: 60 });
    }
    socket.emit('submit_score', { username: userName, score: myScore });
    setTimeout(() => { currentQ++; loadQuestion(); }, 1500);
}

function updateLeaderboard() {
    const list = document.getElementById('lb-list');
    let me = players.find(p => p.name === userName);
    if(!me) players.push({name: userName, score: myScore, icon: userIcon});
    else me.score = myScore;
    players.sort((a, b) => b.score - a.score);
    list.innerHTML = players.map((p, i) => `
        <div class="lb-item ${p.name === userName ? 'me' : ''}">
            <span>${i+1}. ${p.icon} ${p.name}</span>
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
    document.getElementById('arena').style.display = 'none';
    document.getElementById('end-screen').style.display = 'flex';
    document.getElementById('final-score').innerText = myScore;
}