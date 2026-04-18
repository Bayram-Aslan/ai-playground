// 100 SORULUK HAVUZ ÖRNEĞİ (Geliştirilebilir)
const questionPool = [
    {q: "Akımı sınırlayan devre elemanı hangisidir?", a: ["Diyot", "Direnç", "Bobin", "Transformatör"], c: 1},
    {q: "S7-1200 hangi markanın otomasyon ürünüdür?", a: ["ABB", "Delta", "Siemens", "Schneider"], c: 2},
    {q: "Gerilimi değiştiren makineler hangisidir?", a: ["Motor", "Üreteç", "Transformatör", "Kontaktör"], c: 2},
    {q: "Elektronik devrelerde anahtarlama elemanı?", a: ["Transistör", "LDR", "Pil", "Hoparlör"], c: 0},
    {q: "PIC16F84A mikrodenetleyicisi kaç pinlidir?", a: ["8", "14", "18", "40"], c: 2},
    {q: "Kondansatörün birimi nedir?", a: ["Volt", "Farad", "Ohm", "Amper"], c: 1},
    {q: "TIA Portal programında 'Network' nerede olur?", a: ["OB1", "CPU", "RAM", "SCADA"], c: 0},
    {q: "Hangisi bir sensördür?", a: ["LED", "Röle", "LDR", "Motor"], c: 2},
    {q: "12V 60Ah akü kaç Watt-saat enerji depolar?", a: ["720", "120", "60", "240"], c: 0},
    {q: "Manyetik akı yoğunluğu birimi hangisidir?", a: ["Lümen", "Tesla", "Weber", "Lüks"], c: 1}
];

let currentQ = 0, myScore = 0, timer, timeLeft = 10, canAnswer = true;
const userName = localStorage.getItem('user') || "OPERATÖR";

// Rakip Botlar
let players = [
    {name: "AYHANCAN", score: 0},
    {name: "CENK_HOCA", score: 0},
    {name: "ROBOT_V3", score: 0},
    {name: "ELECTRO_G", score: 0}
];

function setReady() {
    const btn = document.getElementById('ready-btn');
    btn.innerText = "HAZIR";
    btn.classList.add('waiting');
    btn.onclick = null;
    
    let cd = 3;
    const cdDiv = document.getElementById('countdown');
    let interval = setInterval(() => {
        cdDiv.innerText = `BAŞLIYOR: ${cd}`;
        cd--;
        if(cd < 0) {
            clearInterval(interval);
            startArena();
        }
    }, 1000);
}

function startArena() {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('arena').style.display = 'grid';
    loadQuestion();
}

function loadQuestion() {
    if(currentQ >= 10) return endBattle();
    canAnswer = true;
    updateLeaderboard();
    timeLeft = 10;
    document.getElementById('q-number').innerText = `MISSION: ${currentQ + 1} / 10`;
    document.getElementById('feedback-box').innerHTML = "<span style='color:#555'>SEÇİMİNİ YAP...</span>";
    
    const qData = questionPool[currentQ];
    document.getElementById('q-text').innerText = qData.q;
    const optDiv = document.getElementById('options');
    optDiv.innerHTML = '';

    qData.a.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'opt';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(i);
        optDiv.appendChild(btn);
    });

    startTimer();
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft -= 0.1;
        document.getElementById('timer-bar').style.width = (timeLeft * 10) + "%";
        if(timeLeft <= 0) {
            clearInterval(timer);
            if(canAnswer) checkAnswer(-1);
        }
    }, 100);
}

function checkAnswer(idx) {
    if(!canAnswer) return;
    canAnswer = false;
    clearInterval(timer);
    
    const correctIdx = questionPool[currentQ].c;
    const buttons = document.querySelectorAll('.opt');
    
    buttons.forEach((btn, i) => {
        btn.style.cursor = "default";
        if(i === correctIdx) btn.style.borderColor = "var(--neon)";
        if(i === idx && i !== correctIdx) btn.style.borderColor = "var(--danger)";
    });

    if(idx === correctIdx) {
        let timeBonus = Math.ceil(timeLeft);
        let gain = 10 + timeBonus;
        myScore += gain;
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        document.getElementById('feedback-box').innerHTML = `<span style='color:var(--neon)'>DOĞRU! +${gain} Puan</span>`;
    } else {
        document.getElementById('feedback-box').innerHTML = `<span style='color:var(--danger)'>YANLIŞ! (Doğru Cevap: ${questionPool[currentQ].a[correctIdx]})</span>`;
    }

    players.forEach(p => { if(Math.random() > 0.4) p.score += Math.floor(Math.random() * 10 + 10); });

    setTimeout(() => {
        currentQ++;
        loadQuestion();
    }, 2500);
}

function updateLeaderboard() {
    const list = document.getElementById('lb-list');
    let me = players.find(p => p.name === userName);
    if(!me) players.push({name: userName, score: myScore});
    else me.score = myScore;

    players.sort((a, b) => b.score - a.score);
    
    const myPos = players.findIndex(p => p.name === userName);
    if(myPos > 0) {
        const diff = players[myPos-1].score - players[myPos].score;
        document.getElementById('feedback-box').innerHTML += `<br><span style="font-size:0.7rem; color:#aaa">${players[myPos-1].name} ile aranda ${diff} puan var!</span>`;
    }

    list.innerHTML = players.slice(0, 10).map((p, i) => `
        <div class="lb-item ${p.name === userName ? 'me' : ''}">
            <span>${i+1}. ${p.name.toUpperCase()}</span>
            <span>${p.score} P</span>
        </div>
    `).join('');
}

function endBattle() {
    alert(`OPERASYON TAMAMLANDI!\nSKORUN: ${myScore}`);
    window.location.href = "/";
}