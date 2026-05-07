const socket = io();
const userData = JSON.parse(localStorage.getItem('user') || '{"name":"OPERATÖR","avatar":"🤖"}');
const userName = userData.name.toUpperCase();
const userIcon = userData.avatar;

let botPlayers = [
    {name: "AYHANCAN", score: 0, icon: "⚡"},
    {name: "CENK_HOCA", score: 0, icon: "👨‍🏫"},
    {name: "ROBOT_V3", score: 0, icon: "🤖"},
    {name: "ELECTRO_G", score: 0, icon: "🎯"}
];

let currentQuestionSet = [], currentQ = 0, myScore = 0, timer, timeLeft = 20; 
let amIReady = false, canStartServer = false, selectedCategoryName = "elektrik", players = [];
let isMultiplayer = false;
let canAnswer = true; 
let hasShownSummary = false; 

// Emojiler ve Kategori İsimleri
const categoryIcons = {
    bilim: "🔬 BİLİM",
    edebiyat: "📚 EDEBİYAT",
    elektrik: "⚡ ELEKTRİK",
    genelkultur: "🌍 G. KÜLTÜR",
    sinema: "🎬 SİNEMA",
    spor: "🏅 SPOR",
    tarih: "⏳ TARİH"
};

function getRandomQuestions(category) {
    let pool = (typeof bigQuestionPool !== 'undefined') ? bigQuestionPool[category] : [];
    if(!pool || pool.length === 0) return [];
    let shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 10);
}

window.onload = () => {
    if(typeof bigQuestionPool !== 'undefined') {
        const singleArea = document.getElementById('single-category-area');
        singleArea.innerHTML = Object.keys(bigQuestionPool).map(c => `
            <button onclick="startSinglePlayer('${c}')" class="cat-btn cat-${c}">${categoryIcons[c] || c.toUpperCase()}</button>
        `).join('');
    }
};

function startSinglePlayer(category) {
    isMultiplayer = false;
    currentQuestionSet = getRandomQuestions(category);
    players = [...botPlayers];
    startCountdown();
}

function joinMultiplayer() {
    const room = document.getElementById('room-input').value.toUpperCase().trim();
    if(room.length < 1) return alert("Oda kodu girin!");
    isMultiplayer = true;
    socket.emit('join_room', { roomName: room, username: userName, userIcon: userIcon });
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'block';
    
    if(typeof bigQuestionPool !== 'undefined') {
        const multiArea = document.getElementById('multi-category-area');
        multiArea.innerHTML = Object.keys(bigQuestionPool).map(c => `
            <button onclick="setMultiCat('${c}')" class="cat-btn cat-${c}" id="btn-${c}">${categoryIcons[c] || c.toUpperCase()}</button>
        `).join('');
        setMultiCat(Object.keys(bigQuestionPool)[0]); 
    }
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
        const selectedQs = getRandomQuestions(selectedCategoryName);
        socket.emit('admin_start_game', { category: selectedCategoryName, questions: selectedQs });
    }
}

socket.on('update_player_list', (data) => {
    canStartServer = data.canStart;
    document.getElementById('count').innerText = data.users.length;
    const listArea = document.getElementById('player-list-area');
    listArea.innerHTML = data.users.map(u => `
        <div style="background:${u.ready ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${u.ready ? 'var(--neon)' : '#333'}; padding:8px 12px; border-radius:5px; font-size:0.7rem; font-family:'Orbitron';">
            ${u.ready ? '✅' : '⏳'} ${u.icon} ${u.name}
        </div>`).join('');
    
    const btn = document.getElementById('start-trigger');
    if(!amIReady) { btn.innerText = "HAZIR OL"; btn.style.background = "white"; btn.style.color = "black"; }
    else if(data.canStart) { btn.innerText = "OPERASYONU BAŞLAT"; btn.style.background = "var(--neon)"; btn.style.color = "black"; }
    else { btn.innerText = "DİĞERLERİ BEKLENİYOR..."; btn.style.background = "#222"; btn.style.color = "#666"; }
});

socket.on('game_started_by_admin', (data) => {
    currentQuestionSet = data.questions; 
    startCountdown();
});

function startCountdown() {
    document.getElementById('init-screen').style.display = 'none';
    document.getElementById('lobby').style.display = 'none';
    const cdScreen = document.getElementById('countdown-screen');
    cdScreen.style.display = 'block';
    
    let cd = 3;
    const bigCd = document.getElementById('big-countdown');
    bigCd.innerText = cd;
    
    let interval = setInterval(() => {
        cd--;
        if(cd > 0) {
            bigCd.innerText = cd;
        } else if (cd === 0) {
            bigCd.innerText = "BAŞLA!";
        } else {
            clearInterval(interval);
            cdScreen.style.display = 'none';
            document.getElementById('arena').style.display = 'grid';
            loadQuestion();
        }
    }, 1000);
}

function loadQuestion() {
    if(currentQ >= 10 || currentQ >= currentQuestionSet.length) return endBattle();
    
    timeLeft = 20; 
    canAnswer = true;
    hasShownSummary = false;
    updateLeaderboard(); 
    
    if(isMultiplayer) socket.emit('question_loaded');
    
    const qData = currentQuestionSet[currentQ];
    document.getElementById('q-number').innerText = `MISSION: ${currentQ + 1} / 10`;
    document.getElementById('q-text').innerText = qData.q;
    document.getElementById('feedback-box').innerHTML = "<span style='color:#888'>VERİ BEKLENİYOR...</span>";
    
    const optArea = document.getElementById('options');
    optArea.innerHTML = '';
    
    qData.a.forEach((optText, i) => {
        const btn = document.createElement('button');
        btn.className = 'opt'; 
        btn.innerText = optText;
        btn.onclick = () => checkAnswer(i);
        optArea.appendChild(btn);
    });
    
    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft -= 0.1;
        document.getElementById('timer-bar').style.width = (timeLeft * 5) + "%"; 
        
        if(timeLeft <= 0) { 
            clearInterval(timer); 
            if(canAnswer) {
                canAnswer = false;
                document.getElementById('feedback-box').innerHTML = `<span style='color:var(--danger)'>SÜRE DOLDU!</span>`;
                document.querySelectorAll('.opt').forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });
                if(isMultiplayer) socket.emit('player_answered'); 
            }
            if(!hasShownSummary) showRoundSummary(); 
        }
    }, 100);
}

function checkAnswer(idx) {
    if(!canAnswer) return; 
    canAnswer = false;
    
    const opts = document.querySelectorAll('.opt');
    opts.forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });
    
    const correctIdx = currentQuestionSet[currentQ].c;
    
    if(idx === correctIdx) {
        opts[idx].style.borderColor = 'var(--neon)';
        opts[idx].style.opacity = '1';
        
        let gain = Math.ceil(timeLeft); 
        myScore += gain; 
        confetti({ particleCount: 50, spread: 60 });
        document.getElementById('feedback-box').innerHTML = `<span style='color:var(--neon)'>DOĞRU! +${gain} Puan</span>`;
    } else {
        if(idx !== -1) {
            opts[idx].style.borderColor = 'var(--danger)';
            opts[idx].style.opacity = '1';
        }
        opts[correctIdx].style.borderColor = 'var(--neon)';
        opts[correctIdx].style.opacity = '1';
        document.getElementById('feedback-box').innerHTML = `<span style='color:var(--danger)'>HATALI!</span>`;
    }
    
    if(isMultiplayer) {
        socket.emit('submit_score', { username: userName, score: myScore });
        socket.emit('player_answered'); 
        document.getElementById('feedback-box').innerHTML += `<br><span style="font-size:0.75rem; color:#888;">Diğer operatörler bekleniyor...</span>`;
    } else {
        players.forEach(p => { 
            if(p.name !== userName && Math.random() > 0.3) p.score += Math.ceil(Math.random() * 20); 
        });
        updateLeaderboard();
        setTimeout(() => { if(!hasShownSummary) showRoundSummary(); }, 2000);
    }
}

socket.on('all_answered', () => {
    if(!hasShownSummary) {
        setTimeout(() => { if(!hasShownSummary) showRoundSummary(); }, 1000);
    }
});

function showRoundSummary() {
    if(hasShownSummary) return;
    hasShownSummary = true;
    clearInterval(timer);
    
    document.getElementById('arena').style.display = 'none';
    
    players.sort((a, b) => b.score - a.score);
    const leader = players[0];
    
    let me = players.find(p => p.name === userName);
    if(!me) {
        me = {name: userName, score: myScore, icon: userIcon};
        players.push(me);
        players.sort((a, b) => b.score - a.score);
    }
    const myRank = players.findIndex(p => p.name === userName) + 1;
    
    document.getElementById('round-rank').innerText = `#${myRank}`;
    const gapEl = document.getElementById('round-gap');
    
    if (myRank === 1) {
        gapEl.innerText = "ZİRVEDESİN! KORU BU YERİ!";
        gapEl.style.color = "var(--neon)";
    } else {
        const playerAbove = players[myRank - 2]; 
        const gap = playerAbove.score - me.score;
        
        if (gap === 0) {
            gapEl.innerText = `BİR ÜST SIRADAKİ (${playerAbove.name}) İLE AYNI PUANDASIN!`;
            gapEl.style.color = "#ffd700"; 
        } else {
            gapEl.innerText = `BİR ÜST SIRADAN (${playerAbove.name}) ${gap} PUAN GERİDESİN!`;
            gapEl.style.color = "var(--danger)"; 
        }
    }
    
    document.getElementById('round-leader-name').innerText = `GENEL LİDER: ${leader.icon || '🤖'} ${leader.name}`;
    
    const rsScreen = document.getElementById('round-leaderboard');
    rsScreen.style.display = 'block';
    
    setTimeout(() => {
        rsScreen.style.display = 'none';
        currentQ++;
        if(currentQ >= 10 || currentQ >= currentQuestionSet.length) {
            endBattle();
        } else {
            document.getElementById('arena').style.display = 'grid';
            loadQuestion();
        }
    }, 4000); 
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
    
    const finalLb = document.getElementById('final-leaderboard');
    players.sort((a, b) => b.score - a.score);
    finalLb.innerHTML = players.map((p, i) => `
        <div class="lb-item ${p.name === userName ? 'me' : ''}">
            <span>${i+1}. ${p.icon || '🤖'} ${p.name}</span>
            <span>${p.score} P</span>
        </div>`).join('');
        
    const best = parseInt(localStorage.getItem('quiz_best') || '0');
    if(myScore > best) localStorage.setItem('quiz_best', myScore);
}