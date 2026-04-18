const canvas = document.getElementById('linkCanvas');
const ctx = canvas.getContext('2d');
const levelDisplay = document.getElementById('level-display');

canvas.width = Math.min(window.innerWidth - 40, 400);
canvas.height = canvas.width;

let level = 1;
let dots = [];
let currentLine = null;
let completedLines = [];
let colors = ['#00ff88', '#ff1e1e', '#007bff', '#ffd700', '#bc13fe', '#ff8c00'];

function startLinkGame() {
    document.getElementById('start-screen').style.display = 'none';
    setupLevel();
}

function setupLevel() {
    dots = [];
    completedLines = [];
    let dotCount = Math.min(level + 2, 6);
    
    for(let i = 0; i < dotCount; i++) {
        // İkişer nokta oluştur (başlangıç ve bitiş)
        let color = colors[i];
        dots.push({ x: Math.random()*300+50, y: Math.random()*300+50, color, id: i, pair: 'a' });
        dots.push({ x: Math.random()*300+50, y: Math.random()*300+50, color, id: i, pair: 'b' });
    }
    draw();
}

canvas.addEventListener('mousedown', startPath);
canvas.addEventListener('touchstart', (e) => startPath(e.touches[0]));

function startPath(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    dots.forEach(dot => {
        if(Math.hypot(dot.x - x, dot.y - y) < 20) {
            currentLine = { color: dot.color, points: [{x: dot.x, y: dot.y}], startId: dot.id };
        }
    });
}

window.addEventListener('mousemove', movePath);
window.addEventListener('touchmove', (e) => movePath(e.touches[0]));

function movePath(e) {
    if(!currentLine) return;
    const rect = canvas.getBoundingClientRect();
    currentLine.points.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    draw();
}

window.addEventListener('mouseup', endPath);
window.addEventListener('touchend', endPath);

function endPath(e) {
    if(!currentLine) return;
    
    const lastPoint = currentLine.points[currentLine.points.length - 1];
    let success = false;

    dots.forEach(dot => {
        if(dot.id === currentLine.startId && Math.hypot(dot.x - lastPoint.x, dot.y - lastPoint.y) < 20) {
            if(currentLine.points.length > 5) { // Çok kısa değilse
                completedLines.push(currentLine);
                success = true;
            }
        }
    });

    currentLine = null;
    draw();

    if(completedLines.length === dots.length / 2) {
        level++;
        levelDisplay.innerText = "LEVEL: " + level;
        setTimeout(setupLevel, 1000);
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Tamamlanmış hatlar
    completedLines.forEach(line => {
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 5;
        line.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
    });

    // Aktif hat
    if(currentLine) {
        ctx.beginPath();
        ctx.strokeStyle = currentLine.color;
        ctx.lineWidth = 5;
        currentLine.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
    }

    // Noktalar
    dots.forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 12, 0, Math.PI*2);
        ctx.fillStyle = dot.color;
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}