const canvas = document.getElementById('circleCanvas');
const ctx = canvas.getContext('2d');
const display = document.getElementById('accuracy-display');
const statusMsg = document.getElementById('status-msg');
const resetBtn = document.getElementById('reset-btn');

// İsim artık lobiden (hubOperator) alınıyor
const hubData = JSON.parse(localStorage.getItem('hubOperator') || '{"name":"OPERATÖR"}');
const userName = hubData.name.toUpperCase();

let isDrawing = false;
let points = [];
const centerX = 175; 
const centerY = 175;
const targetRadius = 130; 

function initCanvas() {
    canvas.width = 350;
    canvas.height = 350;
    if(window.innerWidth < 768) {
        canvas.width = 300;
        canvas.height = 300;
    }
}

initCanvas();

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', endDrawing);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e.touches[0]); });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e.touches[0]); });
canvas.addEventListener('touchend', endDrawing);

function startDrawing(e) {
    if(points.length > 0) return; 
    isDrawing = true;
    points = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    statusMsg.innerText = "ÇİZİM YAPILIYOR...";
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    points.push({x, y});

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#00ff88';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function endDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    calculateAccuracy();
}

function calculateAccuracy() {
    if (points.length < 10) return;

    let totalDiff = 0;
    const currentCenterX = canvas.width / 2;
    const currentCenterY = canvas.height / 2;
    const currentTargetRadius = canvas.width * 0.38;

    points.forEach(p => {
        const dist = Math.sqrt(Math.pow(p.x - currentCenterX, 2) + Math.pow(p.y - currentCenterY, 2));
        totalDiff += Math.abs(dist - currentTargetRadius);
    });

    const avgDiff = totalDiff / points.length;
    let score = Math.max(0, 100 - (avgDiff * 1.5));
    
    if(points.length < 50) score *= 0.5; 

    display.innerText = score.toFixed(1) + "%";
    statusMsg.innerText = score > 90 ? "MÜKEMMEL HASSASİYET!" : "DAHA İYİ OLABİLİR";
    
    if(score > 95) confetti({ particleCount: 150, spread: 70 });

    saveScore(score);
    resetBtn.style.display = "block";
}

function saveScore(s) {
    let scores = JSON.parse(localStorage.getItem('circle-scores')) || [];
    scores.push({name: userName, score: s});
    scores.sort((a,b) => b.score - a.score);
    localStorage.setItem('circle-scores', JSON.stringify(scores.slice(0, 5)));
    updateLeaderboard();
}

function updateLeaderboard() {
    const list = document.getElementById('lb-list');
    let scores = JSON.parse(localStorage.getItem('circle-scores')) || [];
    list.innerHTML = scores.map((s, i) => `
        <div class="lb-item">
            <span>${i+1}. ${s.name}</span>
            <span>%${s.score.toFixed(1)}</span>
        </div>
    `).join('') || "KAYIT YOK";
}

function resetGame() {
    points = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    display.innerText = "0%";
    statusMsg.innerText = "DAİREYİ ÇİZMEYE BAŞLA";
    resetBtn.style.display = "none";
    ctx.beginPath();
}

updateLeaderboard();