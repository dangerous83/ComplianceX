/* ===== Landing Page Controller ===== */

(() => {
  CXSound.init();

  // ===== Boot sequence =====
  const boot = document.getElementById('boot');
  const bootLog = document.getElementById('bootLog');
  const bootBarFill = document.getElementById('bootBarFill');
  const bootBarPercent = document.getElementById('bootBarPercent');
  const bootStatus = document.getElementById('bootStatus');

  const bootLines = [
    { t: 'Initializing secure runtime…', tag: 'arrow' },
    { t: 'Loading regulatory framework: VARA, SCA, DFSA, FSRA, CBUAE, GCGRA', tag: 'ok' },
    { t: 'Verifying ISO 27001 controls…', tag: 'ok' },
    { t: 'Establishing encrypted channel · TLS 1.3', tag: 'ok' },
    { t: 'Mounting compliance modules [11/11]', tag: 'ok' },
    { t: 'Loading speaker session · Amir A. Kolahzadeh', tag: 'arrow' },
    { t: 'System ready. Welcome to ComplianceX.', tag: 'ok' }
  ];

  let lineIdx = 0;
  let progress = 0;

  function printLine() {
    if (lineIdx >= bootLines.length) {
      finishBoot();
      return;
    }
    const ln = bootLines[lineIdx];
    const div = document.createElement('div');
    div.className = 'line ' + (ln.tag || '');
    div.innerHTML = (ln.tag === 'ok' ? '[<span class="ok">OK</span>] ' : '<span class="arrow">→</span> ') + ln.t;
    bootLog.appendChild(div);
    requestAnimationFrame(() => div.classList.add('show'));
    if (bootLog.children.length > 6) {
      bootLog.removeChild(bootLog.children[0]);
    }
    bootStatus.textContent = ln.t;
    CXSound.play('bootBeep');
    lineIdx++;
    setTimeout(printLine, 450 + Math.random() * 350);
  }

  function tickProgress() {
    if (progress >= 100) return;
    progress += Math.random() * 4 + 1.5;
    if (progress > 100) progress = 100;
    bootBarFill.style.width = progress + '%';
    bootBarPercent.textContent = Math.floor(progress) + '%';
    if (progress < 100) requestAnimationFrame(() => setTimeout(tickProgress, 60));
  }

  function finishBoot() {
    CXSound.play('bootComplete');
    setTimeout(() => {
      boot.classList.add('done');
      setTimeout(() => boot.remove(), 700);
    }, 400);
  }

  // start boot after a tiny delay so paint is ready
  setTimeout(() => {
    CXSound.play('boot');
    printLine();
    tickProgress();
  }, 250);

  // ===== Live clock =====
  const clock = document.getElementById('liveClock');
  function updateClock() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    if (clock) clock.textContent = `${hh}:${mm}:${ss}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ===== Enter button → navigate with whoosh =====
  const enterBtn = document.getElementById('enterBtn');
  function launchDeck() {
    CXSound.play('enter');
    document.body.style.transition = 'opacity 0.6s ease, filter 0.6s ease';
    document.body.style.filter = 'blur(8px) brightness(1.8)';
    document.body.style.opacity = '0';
    setTimeout(() => { window.location.href = 'presentation.html'; }, 580);
  }
  enterBtn.addEventListener('click', launchDeck);

  // also Enter key triggers launch
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      launchDeck();
    }
  });

  // ===== Particle field =====
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];
  const PARTICLE_COUNT = 90;
  const MAX_DIST = 140;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.4 + 0.4,
      opacity: Math.random() * 0.5 + 0.2
    });
  }

  let mouse = { x: -1000, y: -1000 };
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 180) { p.x -= dx / d * 0.6; p.y -= dy / d * 0.6; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 212, 255, ' + p.opacity + ')';
      ctx.fill();
    }
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < MAX_DIST) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = 'rgba(0, 212, 255, ' + ((1 - d / MAX_DIST) * 0.12) + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(tick);
  }
  tick();
})();
