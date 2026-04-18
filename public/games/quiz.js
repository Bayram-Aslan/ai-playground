const questions = [
    { q: "Türkiye'nin başkenti neresidir?", a: ["İstanbul", "Ankara", "İzmir", "Bursa"], c: 1 },
    { q: "Elektrik akımı birimi nedir?", a: ["Volt", "Watt", "Amper", "Ohm"], c: 2 },
    { q: "Fenerbahçe hangi yıl kurulmuştur?", a: ["1903", "1905", "1907", "1908"], c: 2 },
    { q: "Hangi gezegen 'Kızıl Gezegen' olarak bilinir?", a: ["Venüs", "Mars", "Jüpiter", "Satürn"], c: 1 },
    { q: "Suyun kimyasal formülü nedir?", a: ["H2O", "CO2", "NaCl", "O2"], c: 0 },
    { q: "İlk Türk astronot kimdir?", a: ["Alper Gezeravcı", "Cihangir İslam", "Umut Yıldız", "Selçuk Bayraktar"], c: 0 },
    { q: "Hangisi bir programlama dilidir?", a: ["HTML", "CSS", "Python", "JSON"], c: 2 },
    { q: "Mona Lisa tablosu kime aittir?", a: ["Picasso", "Da Vinci", "Van Gogh", "Dali"], c: 1 },
    { q: "Dünyanın en büyük okyanusu hangisidir?", a: ["Atlantik", "Hint", "Büyük Okyanus", "Arktik"], c: 2 },
    { q: "Işık hızı saniyede kaç km'dir?", a: ["150.000", "200.000", "300.000", "500.000"], c: 2 }
];

let cur = 0, score = 0;

function loadQ() {
    if(cur >= questions.length) {
        document.getElementById('quiz-box').style.display = 'none';
        const s = document.getElementById('score');
        s.style.display = 'block';
        s.innerText = `TEBRİKLER! SKORUN: ${score} / ${questions.length}`;
        return;
    }
    const q = questions[cur];
    document.getElementById('q-text').innerText = q.q;
    const optDiv = document.getElementById('options');
    optDiv.innerHTML = '';
    q.a.forEach((o, i) => {
        const b = document.createElement('button');
        b.className = 'opt';
        b.innerText = o;
        b.onclick = () => { if(i === q.c) score++; cur++; loadQ(); };
        optDiv.appendChild(b);
    });
}
loadQ();