const canvas = document.getElementById('catchCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score-val');
const livesEl = document.getElementById('lives-val');
const overlay = document.getElementById('overlay');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let lives = 3;
let targets = [];
let gameActive = false;
let spawnRate = 1000;
let lastSpawn = 0;

class Target {
    constructor() {
        this.radius = Math.random() * 20 + 15;
        this.x = Math.random() * (canvas.width - this.radius * 2) + this.radius;
        this.y = -this.radius;
        this.speed = Math.random() * 3 + 2 + (score / 10);
        this.type = Math.random() > 0.15 ? 'good' : 'bad'; // %15 ihtimalle bomba (kırmızı)
        this.color = this.type === 'good' ? '#00ff88' : '#ff1e1e';
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.closePath();
        ctx.shadowBlur = 0;
    }
}

function startCatchGame() {
    overlay.style.display = 'none';
    score = 0;
    lives = 3;
    targets = [];
    gameActive = true;
    updateUI();
    animate();
}

function updateUI() {
    scoreEl.innerText = `SCORE: ${score}`;
    livesEl.innerText = `LIVES: ${lives}`;
}

canvas.addEventListener('mousedown', (e) => checkHit(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    checkHit(e.touches[0].clientX, e.touches[0].clientY);
});

function checkHit(tx, ty) {
    if (!gameActive) return;
    for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        const dist = Math.hypot(t.x - tx, t.y - ty);
        if (dist < t.radius + 20) {
            if (t.type === 'bad') {
                lives--;
                if (lives <= 0) gameOver();
            } else {
                score++;
                spawnRate = Math.max(300, 1000 - score * 10);
            }
            targets.splice(i, 1);
            updateUI();
            return;
        }
    }
}

function animate(time = 0) {
    if (!gameActive) return;

    ctx.fillStyle = 'rgba(5, 5, 5, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (time - lastSpawn > spawnRate) {
        targets.push(new Target());
        lastSpawn = time;
    }

    for (let i = targets.length - 1; i >= 0; i--) {
        targets[i].update();
        targets[i].draw();

        if (targets[i].y - targets[i].radius > canvas.height) {
            if (targets[i].type === 'good') {
                lives--;
                if (lives <= 0) gameOver();
                updateUI();
            }
            targets.splice(i, 1);
        }
    }

    requestAnimationFrame(animate);
}

function gameOver() {
    gameActive = false;
    document.getElementById('final-stat').innerText = `GAME OVER! SCORE: ${score}`;
    overlay.style.display = 'flex';
}