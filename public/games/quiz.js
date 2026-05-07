const socket = io();

// Kullanıcı verisini çek
const userData = JSON.parse(localStorage.getItem('user') || '{"name":"OPERATÖR","avatar":"🤖"}');
const userName = userData.name.toUpperCase();
const userIcon = userData.avatar;

const bigQuestionPool = {
    elektrik: [
        {q: "Akımı sınırlayan devre elemanı hangisidir?", a: ["Diyot", "Direnç", "Bobin", "Transformatör"], c: 1},
        {q: "S7-1200 PLC hangi markaya aittir?", a: ["ABB", "Schneider", "Siemens", "Delta"], c: 2},
        {q: "Kondansatörün birimi nedir?", a: ["Volt", "Farad", "Ohm", "Amper"], c: 1}
    ],
    spor: [{q: "Fenerbahçe kaç yılında kuruldu?", a: ["1903", "1905", "1907", "1923"], c: 2}],
    tarih: [{q: "İstanbul kaç yılında fethedildi?", a: ["1071", "1299", "1453", "1923"], c: 1}],
    genel: [{q: "Dünyanın en yüksek dağı hangisidir?", a: ["Everest", "K2", "Ağrı", "Erciyes"], c: 0}]
};

// Eski sistemindeki orijinal Bot rakipler
let botPlayers = [
    {name: "AYHANCAN", score: 0, icon: "⚡"},
    {name: "CENK_HOCA", score: 0, icon: "👨‍🏫"},
    {name: "ROBOT_V3", score: 0, icon: "🤖"},
    {name: "ELECTRO_G", score: 0, icon: "🎯"}
];

let currentQuestionSet = [], currentQ = 0, myScore = 0, timer, timeLeft = 10;
let amIReady = false, canStartServer = false, selectedCategoryName = "elektrik", players = [];
let isMultiplayer = false; // Bireysel mi Çoklu mu kontrolü

// SİSTEM YÜKLENDİĞİNDE BİREYSEL KATEGORİLERİ EKRANA BAS
window.onload = () => {
    const singleArea = document.getElementById('single-category-area');
    singleArea.innerHTML = Object.keys(bigQuestionPool).map(c => `
        <button onclick="startSinglePlayer('${c}')" class="cat-btn">
            ${c.toUpperCase()}
        </button>`).join('');
};

// --- BİREYSEL OYUN BAŞLATMA (BOTLARA KARŞI) ---
function startSinglePlayer(category) {
    isMultiplayer = false;
    currentQuestionSet = bigQuestionPool[category];
    players = [...botPlayers]; // Sadece botları ekle (Kullanıcı kendisi eklenecek)
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('arena').style.display = 'grid';
    loadQuestion();
}

// --- ÇOKLU OYUNCU (ODA) SİSTEMİ ---
function joinMultiplayer() {
    const room = document.getElementById('room-input').value.toUpperCase().trim();
    if(room.length < 1) return alert("Lütfen bir oda kodu girin!");
    
    isMultiplayer = true;
    socket.emit('join_room', { roomName: room, username: userName, userIcon: userIcon });
    
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
    
    const multiArea = document.getElementById('multi-category-area');
    multiArea.innerHTML = Object.keys(bigQuestionPool).map(c => `
        <button onclick="setMultiCat('${c}')" class="cat-btn" id="btn-${c}">
            ${c.toUpperCase()}
        </button>`).join('');
    setMultiCat(selectedCategoryName);
}

function setMultiCat(c) {
    selectedCategoryName = c;
    document.querySelectorAll('#multi-category-area .cat-btn').forEach(b => b.classList.remove('active'));
    if(document.getElementById(`btn-${c}`)) document.getElementById(`btn-${c}`).classList.add('active');
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
    document.getElementById('count').innerText = data.users.length;
    
    const listArea = document.getElementById('player-list-area');
    listArea.innerHTML = data.users.map(u => `
        <div style="background:${u.ready ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)'}; 
                    border:1px solid ${u.ready ? 'var(--neon)' : '#333'}; padding:8px 15px; border-radius:5px; font-size:0.75rem; font-family:'Orbitron';">
            ${u.ready ? '✅' : '⏳'} ${u.icon} ${u.name}
        </div>`).join('');

    const btn = document.getElementById('start-trigger');
    if(!amIReady) {
        btn.innerText = "HAZIR OL";
        btn.style.background = "white"; btn.style.color = "black";
    } else if(data.canStart) {
        btn.innerText = "OPERASYONU BAŞLAT";
        btn.style.background = "var(--neon)"; btn.style.color = "black";
    } else {
        btn.innerText = "DİĞERLERİ BEKLENİYOR...";
        btn.style.background = "#222"; btn.style.color = "#666";
    }
});

socket.on('game_started_by_admin', (data) => {
    currentQuestionSet = bigQuestionPool[data.category];
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('arena').style.display = 'grid';
    loadQuestion();
});

// --- ORTAK OYUN MANTIĞI (SORULAR VE SÜRE) ---
function loadQuestion() {
    if(currentQ >= 10 || currentQ >= currentQuestionSet.length) return endBattle();
    timeLeft = 10;
    updateLeaderboard(); // Her soruda tabloyu güncelle
    const qData = currentQuestionSet[currentQ];
    
    document.getElementById('q-number').innerText = `MISSION: ${currentQ + 1} / 10`;
    document.getElementById('q-text').innerText = qData.q;
    document.getElementById('feedback-box').innerHTML = "<span style='color:#555'>SEÇİMİNİ YAP...</span>";
    
    const optArea = document.getElementById('options');
    optArea.innerHTML = '';
    
    qData.a.forEach((optText, i) => {
        const btn = document.createElement('button');
        btn.className = 'opt'; btn.innerText = optText;
        btn.onclick = () => checkAnswer(i);
        optArea.appendChild(btn);
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
        let gain = Math.ceil(10 + timeLeft);
        myScore += gain; 
        confetti({ particleCount: 50, spread: 60 });
        document.getElementById('feedback-box').innerHTML = `<span style='color:var(--neon)'>DOĞRU! +${gain}</span>`;
    } else {
        document.getElementById('feedback-box').innerHTML = `<span style='color:var(--danger)'>HATALI!</span>`;
    }
    
    // Skorları ilet veya Botları simüle et
    if(isMultiplayer) {
        socket.emit('submit_score', { username: userName, score: myScore });
    } else {
        // Eski bot simülasyon mantığı
        players.forEach(p => { 
            if(p.name !== userName && Math.random() > 0.4) p.score += Math.floor(Math.random() * 10 + 10); 
        });
        updateLeaderboard();
    }
    
    setTimeout(() => { currentQ++; loadQuestion(); }, 2000);
}

function updateLeaderboard() {
    const list = document.getElementById('lb-list');
    let me = players.find(p => p.name === userName);
    if(!me) players.push({name: userName, score: myScore, icon: userIcon}); else me.score = myScore;
    
    players.sort((a, b) => b.score - a.score);
    
    list.innerHTML = players.map((p, i) => `
        <div class="lb-item ${p.name === userName ? 'me' : ''}">
            <span>${i+1}. ${p.icon || '🤖'} ${p.name}</span>
            <span>${p.score} P</span>
        </div>`).join('');
}

// Çoklu oyuncuda listeden veri gelir
socket.on('update_room_leaderboard', (data) => {
    if(!isMultiplayer) return;
    let p = players.find(x => x.name === data.username);
    if(p) p.score = data.score; else players.push({name: data.username, score: data.score, icon: "👤"});
    updateLeaderboard();
});

function endBattle() {
    document.getElementById('arena').style.display = 'none';
    document.getElementById('end-screen').style.display = 'block';
    document.getElementById('final-score').innerText = myScore;
    
    const best = parseInt(localStorage.getItem('quiz_best') || '0');
    if(myScore > best) localStorage.setItem('quiz_best', myScore);
}