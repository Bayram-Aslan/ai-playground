const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const msg = document.getElementById('msg');
const winCard = document.getElementById('win-card');
const lvlTxt = document.getElementById('lvl-txt');

let w, h, scale;
let dots = [];
let lines = {}; // { color: points[] }
let drawing = false;
let curColor = null;
let curLvl = parseInt(localStorage.getItem('neon_link_progress')) || 0;

// DOĞAL, DAĞINIK VE ÇÖZÜLEBİLİR 20+ BÖLÜM
const levels = [
    { p: [{x:15,y:15,c:'#00d2ff'},{x:85,y:85,c:'#00d2ff'},{x:85,y:15,c:'#ff0055'},{x:15,y:85,c:'#ff0055'}] },
    { p: [{x:10,y:50,c:'#00ff88'},{x:90,y:50,c:'#00ff88'},{x:50,y:10,c:'#ffcf00'},{x:50,y:90,c:'#ffcf00'}] },
    { p: [{x:15,y:20,c:'#ff0055'},{x:70,y:20,c:'#ff0055'},{x:30,y:80,c:'#00d2ff'},{x:85,y:80,c:'#00d2ff'}] },
    { p: [{x:10,y:10,c:'#00ff88'},{x:90,y:90,c:'#00ff88'},{x:50,y:10,c:'#ffcf00'},{x:10,y:90,c:'#ffcf00'},{x:90,y:10,c:'#ff0055'},{x:50,y:90,c:'#ff0055'}] },
    { p: [{x:5,y:50,c:'#00d2ff'},{x:95,y:50,c:'#00d2ff'},{x:25,y:15,c:'#ff0055'},{x:75,y:85,c:'#ff0055'}] },
    { p: [{x:20,y:10,c:'#ffcf00'},{x:80,y:10,c:'#ffcf00'},{x:20,y:90,c:'#00ff88'},{x:80,y:90,c:'#00ff88'},{x:50,y:40,c:'#ff0055'},{x:50,y:60,c:'#ff0055'}] },
    { p: [{x:10,y:20,c:'#00d2ff'},{x:90,y:20,c:'#00d2ff'},{x:10,y:80,c:'#ffcf00'},{x:90,y:80,c:'#ffcf00'},{x:50,y:5,c:'#ff0055'},{x:50,y:95,c:'#ff0055'}] },
    { p: [{x:15,y:15,c:'#00ff88'},{x:45,y:45,c:'#00ff88'},{x:55,y:55,c:'#ffcf00'},{x:85,y:85,c:'#ffcf00'}] },
    { p: [{x:5,y:5,c:'#00d2ff'},{x:95,y:95,c:'#00d2ff'},{x:95,y:5,c:'#ff0055'},{x:5,y:95,c:'#ff0055'},{x:50,y:50,c:'#ffcf00'},{x:50,y:5,c:'#ffcf00'}] },
    { p: [{x:10,y:30,c:'#00ff88'},{x:90,y:70,c:'#00ff88'},{x:10,y:70,c:'#ff0055'},{x:90,y:30,c:'#ff0055'}] },
    { p: [{x:20,y:20,c:'#00d2ff'},{x:80,y:80,c:'#00d2ff'},{x:20,y:80,c:'#ff0055'},{x:80,y:20,c:'#ff0055'},{x:50,y:10,c:'#ffcf00'},{x:50,y:90,c:'#ffcf00'}] },
    { p: [{x:15,y:40,c:'#00ff88'},{x:85,y:40,c:'#00ff88'},{x:15,y:60,c:'#ff0055'},{x:85,y:60,c:'#ff0055'}] },
    { p: [{x:10,y:10,c:'#ffcf00'},{x:50,y:50,c:'#ffcf00'},{x:90,y:10,c:'#ff0055'},{x:50,y:90,c:'#ff0055'}] },
    { p: [{x:5,y:50,c:'#00d2ff'},{x:50,y:5,c:'#00d2ff'},{x:95,y:50,c:'#00ff88'},{x:50,y:95,c:'#00ff88'}] },
    { p: [{x:10,y:10,c:'#ff0055'},{x:90,y:10,c:'#ff0055'},{x:10,y:90,c:'#00d2ff'},{x:90,y:90,c:'#00d2ff'},{x:50,y:40,c:'#00ff88'},{x:50,y:60,c:'#00ff88'}] },
    { p: [{x:20,y:15,c:'#ffcf00'},{x:80,y:85,c:'#ffcf00'},{x:80,y:15,c:'#00ff88'},{x:20,y:85,c:'#00ff88'}] },
    { p: [{x:10,y:50,c:'#00d2ff'},{x:90,y:50,c:'#00d2ff'},{x:50,y:10,c:'#ff0055'},{x:50,y:90,c:'#ff0055'},{x:25,y:25,c:'#00ff88'},{x:75,y:75,c:'#00ff88'}] },
    { p: [{x:5,y:5,c:'#ffcf00'},{x:5,y:95,c:'#ffcf00'},{x:95,y:5,c:'#ff0055'},{x:95,y:95,c:'#ff0055'},{x:50,y:5,c:'#00ff88'},{x:50,y:95,c:'#00ff88'}] },
    { p: [{x:15,y:30,c:'#00d2ff'},{x:85,y:30,c:'#00d2ff'},{x:15,y:70,c:'#ff0055'},{x:85,y:70,c:'#ff0055'},{x:50,y:10,c:'#ffcf00'},{x:50,y:90,c:'#ffcf00'}] },
    { p: [{x:5,y:5,c:'#00ff88'},{x:95,y:95,c:'#00ff88'},{x:50,y:50,c:'#ff0055'},{x:10,y:90,c:'#ff0055'}] }
];

function setup() {
    resize();
    load(curLvl);
    loop();
}

function resize() {
    w = canvas.parentElement.clientWidth;
    h = canvas.parentElement.clientHeight;
    canvas.width = w; canvas.height = h;
    scale = Math.min(w, h) / 100;
}

function load(idx) {
    curLvl = idx;
    localStorage.setItem('neon_link_progress', curLvl);
    lvlTxt.innerText = `LEVEL ${idx + 1}`;
    dots = levels[idx % levels.length].p.map(d => ({
        c: d.c,
        rx: (d.x * w) / 100,
        ry: (d.y * h) / 100
    }));
    lines = {};
    dots.forEach(d => { if (!lines[d.c]) lines[d.c] = []; });
    winCard.style.display = 'none';
    msg.innerText = "YOLLARI KESİŞTİRMEDEN BİRLEŞTİR";
    msg.style.color = "#666";
}

function draw() {
    ctx.clearRect(0, 0, w, h);

    // Çizgiler
    for (const c in lines) {
        const p = lines[c];
        if (p.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = c;
        ctx.lineWidth = 10 * (scale/5);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.shadowBlur = 15; ctx.shadowColor = c;
        ctx.moveTo(p[0].x, p[0].y);
        for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Noktalar
    dots.forEach(d => {
        ctx.beginPath();
        ctx.fillStyle = d.c;
        ctx.shadowBlur = 20; ctx.shadowColor = d.c;
        ctx.arc(d.rx, d.ry, 14 * (scale/5), 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.arc(d.rx, d.ry, 4 * (scale/5), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

function intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const det = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
    if (det === 0) return false;
    const l = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
    const g = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
    return (0.05 < l && l < 0.95) && (0.05 < g && g < 0.95);
}

function checkHit(x1, y1, x2, y2, color) {
    for (const c in lines) {
        if (c === color) continue;
        const p = lines[c];
        for (let i = 0; i < p.length - 1; i++) {
            if (intersect(x1, y1, x2, y2, p[i].x, p[i].y, p[i+1].x, p[i+1].y)) return true;
        }
    }
    return false;
}

function start(e) {
    const { x, y } = getPos(e);
    const d = dots.find(d => Math.hypot(x - d.rx, y - d.ry) < 30);
    if (d) {
        curColor = d.c; drawing = true;
        lines[curColor] = [{ x: d.rx, y: d.ry }];
    }
}

function move(e) {
    if (!drawing) return;
    const { x, y } = getPos(e);
    const p = lines[curColor];
    const last = p[p.length - 1];

    if (Math.hypot(x - last.x, y - last.y) > 6) {
        if (checkHit(last.x, last.y, x, y, curColor)) {
            drawing = false;
            msg.innerText = "DİKKAT: YOLLAR ÇAKIŞTI!";
            msg.style.color = "var(--pink)";
            return;
        }
        p.push({ x, y });
        const target = dots.find(d => d.c === curColor && Math.hypot(x - d.rx, y - d.ry) < 25 && Math.hypot(d.rx - p[0].x, d.ry - p[0].y) > 40);
        if (target) {
            p[p.length - 1] = { x: target.rx, y: target.ry };
            drawing = false;
            checkWin();
        }
    }
}

function checkWin() {
    let done = 0;
    const colors = [...new Set(dots.map(d => d.c))];
    colors.forEach(c => {
        const p = lines[c];
        if (p && p.length > 1) {
            const s = dots.some(d => d.c === c && Math.hypot(p[0].x - d.rx, p[0].y - d.ry) < 5);
            const e = dots.some(d => d.c === c && Math.hypot(p[p.length-1].x - d.rx, p[p.length-1].y - d.ry) < 5);
            if (s && e) done++;
        }
    });
    if (done === colors.length) winCard.style.display = 'flex';
}

function getPos(e) {
    const t = e.touches ? e.touches[0] : e;
    const r = canvas.getBoundingClientRect();
    return { x: t.clientX - r.left, y: t.clientY - r.top };
}

function loop() { draw(); requestAnimationFrame(loop); }
window.reset = () => load(curLvl);
window.next = () => load(curLvl + 1);

canvas.addEventListener('mousedown', start);
window.addEventListener('mousemove', move);
window.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); });
window.addEventListener('touchmove', (e) => { if(drawing) e.preventDefault(); move(e); });
window.addEventListener('touchend', () => drawing = false);
window.addEventListener('resize', () => { resize(); load(curLvl); });

setup();