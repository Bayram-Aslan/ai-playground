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
    tarih: [{q: "İstanbul kaç yılında fethedilmiştir?", a: ["1071", "1299", "1453", "1923"], c: 2}],
    genel: [{q: "Dünyanın en yüksek dağı hangisidir?", a: ["Everest", "K2", "Ağrı", "Fujiyama"], c: 0}],
    bilim: [{q: "Suyun kimyasal formülü nedir?", a: ["H2O", "CO2", "O2", "CH4"], c: 0}],
    edebiyat: [{q: "Sinekli Bakkal romanının yazarı kimdir?", a: ["Halide Edib", "Reşat Nuri", "Peyami Safa", "Ziya Gökalp"], c: 0}],
    film: [{q: "Inception filminin yönetmeni kimdir?", a: ["Christopher Nolan", "Steven Spielberg", "James Cameron", "Quentin Tarantino"], c: 0}]
};

let currentQuestionSet = [];
let currentQ = 0, myScore = 0, correctCount = 0, timer, timeLeft = 10, canAnswer = true;
let isMultiplayer = false;
let players = [];
let selectedCategoryName = "elektrik";

function selectCategory(cat) {
    currentQuestionSet = bigQuestionPool[cat];
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
    showCategorySelection();
}

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
    const cats = Object.keys(bigQuestionPool);
    catArea.innerHTML = cats.map(c => `
        <button onclick="setCategory('${c}')" class="opt-btn" id="btn-${c}" style="padding:10px; font-size:0.7rem; border:1px solid #333;">
            ${c.toUpperCase()}
        </button>
    `).join('');
    setCategory(selectedCategoryName);
}

function setCategory(c) {
    selectedCategoryName = c;
    document.querySelectorAll('#category-area button').forEach(b => b.style.borderColor = "#333");
    const activeBtn = document.getElementById(`btn-${c}`);
    if(activeBtn) activeBtn.style.borderColor = "var(--neon)";
}

// "HAZIR" Butonuna tıklandığında
function triggerReady() {
    socket.emit('player_ready');
    const readyBtn = document.getElementById('ready-trigger-btn');
    if(readyBtn) {
        readyBtn.innerText = "HAZIRLIK TAMAM ✅";
        readyBtn.disabled = true;
        readyBtn.style.opacity = "0.5";
        readyBtn.style.background = "rgba(0, 255, 136, 0.2)";
    }
}

// Sunucudan gelen oyuncu listesi ve 'başlatılabilir mi' bilgisini dinle
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

    // Başlat butonu kilidi
    const startBtn = document.getElementById('start-trigger');
    if(data.canStart) {
        startBtn.disabled = false;
        startBtn.style.opacity = "1";
        startBtn.innerText = "OPERASYONU BAŞLAT";
        startBtn.style.boxShadow = "0 0 20px var(--neon)";
    } else {
        startBtn.disabled = true;
        startBtn.style.opacity = "0.3";
        startBtn.innerText = "HERKESİN HAZIR OLMASI BEKLENİYOR...";
        startBtn.style.boxShadow = "none";
    }
});

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
    document.getElementById('arena').style.display = 'none';
    document.getElementById('end-screen').style.display = 'flex';
    document.getElementById('final-score').innerText = myScore;
    document.getElementById('final-correct').innerText = correctCount;
}

function restartGame() {
    location.reload();
}