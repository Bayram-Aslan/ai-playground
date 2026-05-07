const socket = io();
const operatorData = JSON.parse(localStorage.getItem('hubOperator') || '{"name":"OPERATÖR","icon":"🤖"}');
const userName = operatorData.name.toUpperCase();
const userIcon = operatorData.icon;

const bigQuestionPool = {
    elektrik: [
        {q: "B=100.000 Gauss değeri kaç Tesla'dır?", a: ["0.1", "1", "10", "100"], c: 1},
        {q: "S7-1200 PLC hangi markaya aittir?", a: ["ABB", "Schneider", "Siemens", "Delta"], c: 2}
    ],
    spor: [{q: "Fenerbahçe kaç yılında kuruldu?", a: ["1903", "1905", "1907", "1923"], c: 2}],
    tarih: [{q: "İstanbul kaç yılında fethedildi?", a: ["1071", "1299", "1453", "1923"], c: 2}],
    genel: [{q: "Dünyanın en yüksek dağı?", a: ["Everest", "K2", "Ağrı", "Erciyes"], c: 0}],
    bilim: [{q: "Suyun kimyasal formülü nedir?", a: ["H2O", "CO2", "O2", "N2"], c: 0}],
    edebiyat: [{q: "Sinekli Bakkal kimin eseridir?", a: ["Halide Edib", "Reşat Nuri", "Peyami Safa", "Ziya Gökalp"], c: 0}],
    film: [{q: "Inception yönetmeni kimdir?", a: ["Nolan", "Spielberg", "Cameron", "Tarantino"], c: 0}]
};

let currentQuestionSet = [], currentQ = 0, myScore = 0, correctCount = 0, timer, timeLeft = 10;
let amIReady = false, canStartServer = false, selectedCategoryName = "elektrik", players = [];

function joinMultiplayer() {
    const room = document.getElementById('room-input').value.toUpperCase();
    if(room.length < 3) return alert("Hatalı Kod!");
    socket.emit('join_room', { roomName: room, username: userName, userIcon: userIcon });
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
    renderCategories();
}

function renderCategories() {
    let area = document.getElementById('category-area');
    if(!area) {
        area = document.createElement('div');
        area.id = 'category-area';
        area.className = "category-grid"; // CSS'deki grid yapısına uygun
        area.style = "margin:20px 0; display:grid; grid-template-columns:1fr 1fr; gap:10px;";
        document.getElementById('lobby').insertBefore(area, document.getElementById('start-trigger'));
    }
    area.innerHTML = Object.keys(bigQuestionPool).map(c => `
        <button onclick="setCat('${c}')" class="opt-btn" id="btn-${c}" style="padding:10px; font-size:0.7rem;">
            ${c.toUpperCase()}
        </button>`).join('');
    setCat(selectedCategoryName);
}

function setCat(c) {
    selectedCategoryName = c;
    document.querySelectorAll('#category-area button').forEach(b => b.style.borderColor = "rgba(255,255,255,0.1)");
    if(document.getElementById(`btn-${c}`)) document.getElementById(`btn-${c}`).style.borderColor = "var(--neon)";
}

function triggerAction() {
    if(!amIReady) {
        amIReady = true;
        socket.emit('player_ready');
    } else if(canStartServer) {
        socket.emit('admin_start_game', { category: selectedCategoryName });
    }
}

socket.on('update_player_list', (data) => {
    canStartServer = data.canStart;
    let listArea = document.getElementById('player-list-area');
    if(!listArea) {
        listArea = document.createElement('div');
        listArea.id = 'player-list-area';
        listArea.style = "margin:20px 0; display:flex; flex-wrap:wrap; gap:10px; justify-content:center;";
        document.getElementById('lobby').insertBefore(listArea, document.getElementById('category-area'));
    }

    listArea.innerHTML = data.users.map(u => `
        <div class="player-badge" style="background:${u.ready ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${u.ready ? 'var(--neon)' : '#333'}; padding:8px; border-radius:5px; font-size:0.7rem;">
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
        btn.style.boxShadow = "0 0 20px var(--neon)";
    } else {
        btn.innerText = "DİĞERLERİ BEKLENİYOR...";
        btn.style.background = "#222";
        btn.style.color = "#666";
    }
});

socket.on('game_started_by_admin', (data) => {
    currentQuestionSet = bigQuestionPool[data.category];
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('arena').style.display = 'grid';
    loadQ();
});

function loadQ() {
    if(currentQ >= currentQuestionSet.length) return endBattle();
    timeLeft = 10;
    const qData = currentQuestionSet[currentQ];
    document.getElementById('q-number').innerText = `MISSION: ${currentQ + 1} / ${currentQuestionSet.length}`;
    document.getElementById('q-text').innerText = qData.q;
    document.getElementById('feedback-box').innerHTML = "";
    
    const opt = document.getElementById('options');
    opt.innerHTML = '';
    qData.a.forEach((s, i) => {
        const b = document.createElement('button');
        b.className = 'opt-btn'; b.innerText = s;
        b.onclick = () => checkAnswer(i);
        opt.appendChild(b);
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
        confetti({ particleCount: 100, spread: 70 });
        document.getElementById('feedback-box').innerHTML = `<span style='color:var(--neon)'>SİSTEM DOĞRULANDI! +${gain}</span>`;
    } else {
        document.getElementById('feedback-box').innerHTML = `<span style='color:var(--danger)'>VERİ KAYBI!</span>`;
    }
    socket.emit('submit_score', { username: userName, score: myScore });
    setTimeout(() => { currentQ++; loadQ(); }, 2000);
}

function updateLeaderboard() {
    const list = document.getElementById('lb-list');
    let me = players.find(p => p.name === userName);
    if(!me) players.push({name: userName, score: myScore, icon: userIcon}); else me.score = myScore;
    players.sort((a, b) => b.score - a.score);
    list.innerHTML = players.map((p, i) => `
        <div class="lb-item ${p.name === userName ? 'me' : ''}">
            <span>${i+1}. ${p.icon} ${p.name}</span>
            <span>${p.score} P</span>
        </div>`).join('');
}

socket.on('update_room_leaderboard', (data) => {
    let p = players.find(x => x.name === data.username);
    if(p) p.score = data.score; else players.push({name: data.username, score: data.score, icon: "👤"});
    updateLeaderboard();
});

function endBattle() {
    document.getElementById('arena').style.display = 'none';
    document.getElementById('end-screen').style.display = 'flex';
    document.getElementById('final-score').innerText = myScore;
    document.getElementById('final-correct').innerText = correctCount;
}