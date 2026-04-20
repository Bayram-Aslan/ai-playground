let p1Hp = 100, p2Hp = 100;
let barValue = 0, direction = 1, barSpeed = 2;
let isMoving = true;

const operatorData = JSON.parse(localStorage.getItem('hubOperator') || '{"name":"OPERATÖR","icon":"⚔️"}');
const user = operatorData.name;
const userIcon = operatorData.icon;

document.getElementById('p1-name').innerText = `${userIcon} ${user.toUpperCase()}`;

function moveBar() {
    if (!isMoving) return;
    barValue += direction * barSpeed;
    if (barValue >= 100 || barValue <= 0) direction *= -1;
    document.getElementById('power-fill').style.height = barValue + "%";
    requestAnimationFrame(moveBar);
}

moveBar();

function hit() {
    if (!isMoving) return;
    isMoving = false; 
    const p1Power = barValue;
    const p2Power = Math.floor(Math.random() * 80) + 10; 
    document.getElementById('hit-btn').disabled = true;
    setTimeout(() => { resolveRound(p1Power, p2Power); }, 1000);
}

function resolveRound(p1, p2) {
    if (p1 > p2) p2Hp -= 34;
    else p1Hp -= 34;
    updateHp();
    if (p1Hp <= 0 || p2Hp <= 0) endGame();
    else resetRound();
}

function updateHp() {
    document.getElementById('p1-hp').style.width = Math.max(0, p1Hp) + "%";
    document.getElementById('p2-hp').style.width = Math.max(0, p2Hp) + "%";
}

function resetRound() {
    isMoving = true;
    barSpeed += 0.5;
    document.getElementById('hit-btn').disabled = false;
    moveBar();
}

function endGame() {
    const win = p1Hp > 0;
    document.getElementById('msg').innerText = win ? "KAZANDIN!" : "KAYBETTİN!";
}