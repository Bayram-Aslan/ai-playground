// OYUN AYARLARI
const maxHp = 150; 
let p1Hp = maxHp, p2Hp = maxHp;
let p1Wins = 0, p2Wins = 0;
let currentRound = 1;
const winTarget = 3; 

// BAR AYARLARI 
let barVal = 0;
let speed = 4.5; 
let way = 1;
let isMoving = false;
let animFrame;

// MODLAR
let gameMode = 'bot';
let currentPlayer = 1;
let p1StoredPower = 0;

// LOBİ VERİLERİ (Al Pacino Koruması)
const hubData = JSON.parse(localStorage.getItem('hubOperator') || '{"name":"OPERATÖR","icon":"⚡"}');
document.getElementById('p1-name-ui').innerText = hubData.name.toUpperCase();
const p1AvatarBox = document.getElementById('p1-avatar');

if (hubData.icon === '🎬') {
    p1AvatarBox.innerHTML = `<img src="al-pacino.jpeg" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.innerText='🎬'">`;
} else {
    p1AvatarBox.innerText = hubData.icon;
}

// OYUNU BAŞLAT
function startGame(mode) {
    gameMode = mode;
    document.getElementById('mode-overlay').style.display = 'none';
    document.getElementById('arena-box').style.display = 'flex';

    if (mode === 'local') {
        document.getElementById('p2-name-ui').innerText = "OYUNCU 2";
        document.getElementById('p2-avatar').innerText = "👤";
        document.getElementById('p2-avatar').style.borderColor = "var(--cyan)";
        document.getElementById('p2-avatar').style.boxShadow = "0 0 30px rgba(0,210,255,0.3), inset 0 0 20px rgba(0,210,255,0.2)";
        document.getElementById('p2-hp').style.background = "linear-gradient(-90deg, #00d2ff, #00aaff)";
        document.getElementById('p2-hp').style.boxShadow = "0 0 20px var(--cyan)";
    }

    updateHpUI();
    isMoving = true;
    animateMeter();
    
    document.getElementById('msg-box').innerText = gameMode === 'bot' ? "KOMUT BEKLENİYOR..." : "OYUNCU 1, ATEŞLE!";
}

function updateHpUI() {
    let p1Show = Math.max(0, p1Hp);
    let p2Show = Math.max(0, p2Hp);
    
    document.getElementById('p1-hp').style.width = (p1Show / maxHp) * 100 + "%";
    document.getElementById('p2-hp').style.width = (p2Show / maxHp) * 100 + "%";
    
    document.getElementById('p1-hp-text').innerText = p1Show + " / " + maxHp;
    document.getElementById('p2-hp-text').innerText = p2Show + " / " + maxHp;
}

function animateMeter() {
    if (!isMoving) return;
    barVal += way * speed;
    
    if (barVal >= 100) { barVal = 100; way = -1; }
    if (barVal <= 0) { barVal = 0; way = 1; }
    
    document.getElementById('power-fill').style.width = barVal + "%";
    animFrame = requestAnimationFrame(animateMeter);
}

function executeHit() {
    if (!isMoving) return;
    
    isMoving = false; 
    cancelAnimationFrame(animFrame); 
    document.getElementById('hit-btn').disabled = true;

    let currentPower = Math.floor(barVal);

    if (gameMode === 'bot') {
        let minBot = 10 + (currentRound * 10); 
        let maxBot = 60 + (currentRound * 10); 
        if (maxBot > 95) maxBot = 95; 
        let botPower = Math.floor(Math.random() * (maxBot - minBot + 1)) + minBot;

        showHitNumbers(currentPower, botPower);
        setTimeout(() => resolveCombat(currentPower, botPower), 600);

    } else {
        if (currentPlayer === 1) {
            p1StoredPower = currentPower;
            document.getElementById('p1-power-text').innerText = p1StoredPower;
            document.getElementById('p1-power-text').className = "hit-power-display show";
            
            document.getElementById('msg-box').innerText = "SIRA OYUNCU 2'DE!";
            document.getElementById('msg-box').style.color = "var(--cyan)";

            setTimeout(() => {
                currentPlayer = 2;
                resetBarUI("OYUNCU 2 VUR!", "linear-gradient(45deg, var(--cyan), #00aaff)", "KOMUT BEKLENİYOR...", "var(--cyan)");
            }, 1000);

        } else {
            document.getElementById('p2-power-text').innerText = currentPower;
            document.getElementById('p2-power-text').className = "hit-power-display show";
            
            setTimeout(() => resolveCombat(p1StoredPower, currentPower), 600);
        }
    }
}

function showHitNumbers(p1, p2) {
    const p1Text = document.getElementById('p1-power-text');
    const p2Text = document.getElementById('p2-power-text');
    p1Text.innerText = p1;
    p2Text.innerText = p2;
    p1Text.className = "hit-power-display show";
    p2Text.className = "hit-power-display show";
}

// YENİ: ÇARPIŞMA FLAŞ EFEKTİ
function createImpactFlash() {
    const clashCenter = document.getElementById('clash-center');
    const wave = document.createElement('div');
    wave.className = 'impact-wave';
    clashCenter.appendChild(wave);
    setTimeout(() => wave.remove(), 500);
}

// HASAR HESAPLAMA (SAF FARK)
function resolveCombat(power1, power2) {
    let dmg = Math.abs(power1 - power2);
    let msgBox = document.getElementById('msg-box');
    const p1Text = document.getElementById('p1-power-text');
    const p2Text = document.getElementById('p2-power-text');

    createImpactFlash(); // Rakamlar çarpıştığında flaş patlar!

    if (power1 > power2) {
        p2Hp -= dmg;
        p1Text.classList.add('winner');
        p2Text.classList.add('loser');
        msgBox.innerText = gameMode === 'bot' ? "KRİTİK VURUŞ!" : "OYUNCU 1 HASAR VERDİ!";
        msgBox.style.color = "var(--neon)";
        showDamageEffect(dmg, 'p2-col', 'var(--neon)');
    } else if (power2 > power1) {
        p1Hp -= dmg;
        p2Text.classList.add('winner');
        p1Text.classList.add('loser');
        msgBox.innerText = gameMode === 'bot' ? "SAVUNMA KIRILDI!" : "OYUNCU 2 HASAR VERDİ!";
        msgBox.style.color = gameMode === 'bot' ? "var(--danger)" : "var(--cyan)";
        showDamageEffect(dmg, 'p1-avatar', gameMode === 'bot' ? 'var(--danger)' : 'var(--cyan)');
    } else {
        msgBox.innerText = "GÜÇLER EŞİT! HASAR YOK";
        msgBox.style.color = "var(--gold)";
    }

    updateHpUI();
    
    document.body.classList.remove('shake-screen');
    void document.body.offsetWidth; 
    document.body.classList.add('shake-screen');

    setTimeout(() => {
        if (p1Hp <= 0 || p2Hp <= 0) endRound();
        else nextTurn(); 
    }, 1600); // Rakamlar biraz daha ekranda kalsın diye süreyi uzattık
}

// UÇAN HASAR YAZISI
function showDamageEffect(dmg, targetId, color) {
    if(dmg === 0) return;
    const target = document.getElementById(targetId);
    const fx = document.createElement('div');
    fx.className = 'dmg-text';
    fx.innerText = `-${dmg}`;
    fx.style.color = color;
    
    fx.style.left = target.offsetLeft + (target.offsetWidth/2) - 30 + "px";
    fx.style.top = target.offsetTop - 30 + "px";
    
    document.getElementById('arena-box').appendChild(fx);
    setTimeout(() => fx.remove(), 900);
}

function nextTurn() {
    currentPlayer = 1;
    let msgText = gameMode === 'bot' ? "KOMUT BEKLENİYOR..." : "OYUNCU 1, ATEŞLE!";
    resetBarUI("ATEŞLE!", "linear-gradient(45deg, var(--neon), var(--cyan))", msgText, "var(--neon)");
}

function resetBarUI(btnText, btnBg, msgText, glowColor) {
    barVal = 0; way = 1;
    document.getElementById('power-fill').style.width = "0%";
    
    document.getElementById('p1-power-text').className = "hit-power-display";
    document.getElementById('p2-power-text').className = "hit-power-display";
    
    document.getElementById('msg-box').innerText = msgText;
    document.getElementById('msg-box').style.color = "white";
    
    let btn = document.getElementById('hit-btn');
    btn.innerText = btnText;
    btn.style.background = btnBg;
    
    if(glowColor === 'var(--cyan)') {
        btn.style.boxShadow = "0 8px 0 #007799, 0 15px 30px rgba(0,210,255,0.5), inset 0 0 15px rgba(255,255,255,0.4)";
    } else {
        btn.style.boxShadow = "0 8px 0 #007799, 0 15px 30px rgba(0,255,136,0.5), inset 0 0 15px rgba(255,255,255,0.4)";
    }
    
    btn.disabled = false;
    isMoving = true;
    animateMeter(); 
}

function endRound() {
    const msgBox = document.getElementById('msg-box');
    
    if (p1Hp <= 0 && p2Hp <= 0) {
        if (p1Hp > p2Hp) {
            p1Wins++;
            msgBox.innerText = gameMode === 'bot' ? "KIL PAYI KURTULDUN! RAUNDU ALDIN!" : "OYUNCU 1 RAUNDU ALDI!";
            msgBox.style.color = "var(--neon)";
        } else if (p2Hp > p1Hp) {
            p2Wins++;
            msgBox.innerText = gameMode === 'bot' ? "ROBOT KIL PAYI KURTULDU! RAUNT GİTTİ!" : "OYUNCU 2 RAUNDU ALDI!";
            msgBox.style.color = gameMode === 'bot' ? "var(--danger)" : "var(--cyan)";
        } else {
            msgBox.innerText = "BERABERE! İKİ TARAF DA ÇÖKTÜ.";
            msgBox.style.color = "var(--gold)";
        }
    } 
    else if (p1Hp <= 0) {
        p2Wins++;
        msgBox.innerText = gameMode === 'bot' ? "ROBOT RAUNDU ALDI!" : "OYUNCU 2 RAUNDU ALDI!";
        msgBox.style.color = gameMode === 'bot' ? "var(--danger)" : "var(--cyan)";
    } else {
        p1Wins++;
        msgBox.innerText = gameMode === 'bot' ? "RAUNDU ALDIN!" : "OYUNCU 1 RAUNDU ALDI!";
        msgBox.style.color = "var(--neon)";
    }

    document.getElementById('p1-score').innerText = p1Wins;
    document.getElementById('p2-score').innerText = p2Wins;

    if (p1Wins === winTarget || p2Wins === winTarget) setTimeout(finishMatch, 2000);
    else setTimeout(startNextRound, 2000);
}

function startNextRound() {
    currentRound++;
    p1Hp = maxHp; p2Hp = maxHp;
    updateHpUI();
    speed += 0.5; 
    document.getElementById('round-badge').innerText = "ROUND " + currentRound;
    nextTurn();
}

function finishMatch() {
    const msgBox = document.getElementById('msg-box');
    const hitBtn = document.getElementById('hit-btn');
    document.getElementById('round-badge').innerText = "MAÇ BİTTİ";

    if (p1Wins === winTarget) {
        msgBox.innerText = gameMode === 'bot' ? "ZAFER SENİN!" : "OYUNCU 1 KAZANDI!";
        msgBox.style.color = "var(--neon)";
        if(gameMode === 'bot') localStorage.setItem('battle_best', `${p1Wins} - ${p2Wins} WIN`);
    } else {
        msgBox.innerText = gameMode === 'bot' ? "SİSTEM ÇÖKTÜ..." : "OYUNCU 2 KAZANDI!";
        msgBox.style.color = gameMode === 'bot' ? "var(--danger)" : "var(--cyan)";
    }

    hitBtn.innerText = "TEKRAR OYNA";
    hitBtn.style.background = "linear-gradient(45deg, var(--gold), #ff8800)";
    hitBtn.style.boxShadow = "0 8px 0 #ccaa00, 0 15px 30px rgba(255,215,0,0.5)";
    hitBtn.onclick = () => location.reload();
    hitBtn.disabled = false;
}