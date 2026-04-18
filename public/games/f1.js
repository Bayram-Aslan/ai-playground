let state = 'IDLE', startTime, timerInterval, animReq, attempt = 0;
const user = localStorage.getItem('user') || "OPERATÖR";
let top5 = JSON.parse(localStorage.getItem('f1-top-scores')) || [];

const timer = document.getElementById('timer'), status = document.getElementById('status'),
      trigger = document.getElementById('trigger'), resetBtn = document.getElementById('reset-btn'),
      lamps = document.querySelectorAll('.lamp'), historyList = document.getElementById('history-list'),
      leaderboard = document.getElementById('leaderboard');

updateBoard();

function handleAction() {
    if (state === 'IDLE' || state === 'END') startSequence();
    else if (state === 'SEQUENCE' || state === 'WAIT') fail();
    else if (state === 'GO') stop();
}

function startSequence() {
    state = 'SEQUENCE';
    resetLamps();
    timer.innerText = "0.000";
    timer.style.color = "rgba(255,255,255,0.05)";
    trigger.innerText = "BEKLE...";
    status.innerText = "HAZIR OLUN...";
    status.style.color = "var(--neon)";
    resetBtn.style.display = "none";

    let count = 0;
    timerInterval = setInterval(() => {
        lamps[count*2].classList.add('on'); 
        lamps[count*2+1].classList.add('on');
        count++;
        if(count === 5) {
            clearInterval(timerInterval);
            state = 'WAIT';
            timerInterval = setTimeout(go, Math.random() * 3000 + 1200);
        }
    }, 800);
}

function go() {
    state = 'GO';
    lamps.forEach(l => l.classList.remove('on'));
    timer.style.color = "#fff";
    status.innerText = "BAAAAS!";
    startTime = performance.now();
    updateClock();
}

function updateClock() {
    if(state !== 'GO') return;
    timer.innerText = ((performance.now() - startTime)/1000).toFixed(3);
    animReq = requestAnimationFrame(updateClock);
}

function stop() {
    state = 'END';
    cancelAnimationFrame(animReq);
    const score = (performance.now() - startTime)/1000;
    timer.innerText = score.toFixed(3);
    timer.style.color = "var(--neon)";
    status.innerText = score < 0.25 ? "EFSANESİN!" : "BAŞARILI!";
    
    log(`DENEME ${++attempt}`, score.toFixed(3) + "s", false);
    save(score);
    showReset();
}

function fail() {
    clearInterval(timerInterval); clearTimeout(timerInterval);
    state = 'END';
    timer.innerText = "FAIL";
    timer.style.color = "var(--f1-red)";
    status.innerText = "HATALI KALKIŞ!";
    status.style.color = "var(--f1-red)";
    
    log(`DENEME ${++attempt}`, "HATALI", true);
    showReset();
}

function log(label, val, isFail) {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.style.color = isFail ? "var(--f1-red)" : "#aaa";
    div.innerHTML = `<span>${label}</span> <span>${val}</span>`;
    historyList.prepend(div);
}

function save(s) {
    top5.push({name: user, score: parseFloat(s)});
    top5.sort((a,b) => a.score - b.score);
    top5 = top5.slice(0, 5);
    localStorage.setItem('f1-top-scores', JSON.stringify(top5));
    updateBoard();
}

function updateBoard() {
    leaderboard.innerHTML = top5.map((entry, i) => `
        <div class="list-item">
            <span style="color:#555">${i+1}.</span>
            <span style="flex-grow:1; margin-left:10px">${entry.name.toUpperCase()}</span>
            <span style="color:var(--neon)">${entry.score.toFixed(3)}</span>
        </div>
    `).join('') || "<div class='list-item'>KAYIT YOK</div>";
}

function showReset() { 
    trigger.style.display = "none"; 
    resetBtn.style.display = "inline-block"; 
}

function resetUI() {
    state = 'IDLE';
    resetLamps();
    timer.innerText = "0.000"; timer.style.color = "rgba(255,255,255,0.05)";
    status.innerText = "SİSTEM ÇEVRİMİÇİ";
    status.style.color = "var(--neon)";
    trigger.style.display = "inline-block"; trigger.innerText = "BAŞLAT";
    resetBtn.style.display = "none";
}

function resetLamps() { lamps.forEach(l => l.classList.remove('on')); }