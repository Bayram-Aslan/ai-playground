let p1Hp = 100, p2Hp = 100;
let barValue = 0, direction = 1, barSpeed = 2;
let isMoving = true, round = 1;
const user = localStorage.getItem('user') || "OPERATÖR";

document.getElementById('p1-name').innerText = user.toUpperCase();

// Bar Animasyonu
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
    isMoving = false; // Barı durdur
    
    const p1Power = barValue;
    const p2Power = Math.floor(Math.random() * 80) + 10; // Rakip rastgele vurur
    
    document.getElementById('hit-btn').disabled = true;
    document.getElementById('msg').innerText = `GÜÇ: ${Math.floor(p1Power)} VS ${p2Power}`;

    setTimeout(() => {
        resolveRound(p1Power, p2Power);
    }, 1000);
}

function resolveRound(p1, p2) {
    const p1Obj = document.getElementById('player-obj');
    const p2Obj = document.getElementById('enemy-obj');

    if (p1 > p2) {
        p2Hp -= 34; // 3 vuruşta bitsin diye
        p2Obj.style.transform = "translateX(50px) rotate(20deg)";
        p2Obj.style.opacity = "0.5";
        document.getElementById('msg').innerText = "HASAR VERDİN!";
    } else {
        p1Hp -= 34;
        p1Obj.style.transform = "translateX(-50px) rotate(-20deg)";
        p1Obj.style.opacity = "0.5";
        document.getElementById('msg').innerText = "HASAR ALDIN!";
    }

    updateHp();

    setTimeout(() => {
        if (p1Hp <= 0 || p2Hp <= 0) return endGame();
        resetRound();
    }, 1500);
}

function updateHp() {
    document.getElementById('p1-hp').style.width = Math.max(0, p1Hp) + "%";
    document.getElementById('p2-hp').style.width = Math.max(0, p2Hp) + "%";
}

function resetRound() {
    isMoving = true;
    barSpeed += 0.5; // Her tur hızlanır
    document.getElementById('hit-btn').disabled = false;
    document.getElementById('player-obj').style.transform = "scaleX(-1)";
    document.getElementById('player-obj').style.opacity = "1";
    document.getElementById('enemy-obj').style.transform = "none";
    document.getElementById('enemy-obj').style.opacity = "1";
    document.getElementById('msg').innerText = "SIRADAKİ ROUND...";
    moveBar();
}

function endGame() {
    const winner = p1Hp > 0 ? "KAZANDIN! 🏆" : "KAYBETTİN! 💀";
    document.getElementById('msg').innerText = winner;
    setTimeout(() => location.reload(), 3000);
}