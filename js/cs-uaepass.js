/* ===== CyberShield · UAE Pass Operator Access (SOC console demo) =====
   Drives the holographic badge, terminal log, decision panel, and timeline
   on the CyberShield UAE Pass slide. Auto-plays when the slide becomes active.
============================================================ */
(() => {
  function initCsUaePass(slideEl) {
    const stage = slideEl.querySelector('[data-cs-uaepass-stage]');
    if (!stage) return;

    const termBody = slideEl.querySelector('[data-cs-term-body]');
    const termStatus = slideEl.querySelector('[data-cs-term-status]');
    const badge = slideEl.querySelector('[data-cs-uaepass-badge]');
    const badgeTag = slideEl.querySelector('[data-cs-uaepass-badge-tag]');
    const clearance = slideEl.querySelector('[data-cs-clearance]');
    const video = slideEl.querySelector('[data-cs-uaepass-video]');
    const tlNodes = Array.from(slideEl.querySelectorAll('[data-cs-uaepass-timeline] [data-cs-step]'));
    const stages = {
      identity: slideEl.querySelector('[data-cs-stage="identity"]'),
      risk:     slideEl.querySelector('[data-cs-stage="risk"]'),
      role:     slideEl.querySelector('[data-cs-stage="role"]'),
      policy:   slideEl.querySelector('[data-cs-stage="policy"]')
    };
    const replay = slideEl.querySelector('[data-cs-uaepass-replay]');

    let timers = [];
    let busy = false;
    const wait = (ms) => new Promise(r => { const t = setTimeout(r, ms); timers.push(t); });
    const clearTimers = () => { timers.forEach(t => clearTimeout(t)); timers = []; };
    const playSound = (n) => { if (window.CXSound && CXSound.play) CXSound.play(n); };

    function setGridState(s) { stage.dataset.state = s; }
    function setTermStatus(t) { if (termStatus) termStatus.textContent = t; }
    function setBadgeTag(t, state) {
      if (badgeTag) badgeTag.textContent = t;
      if (badge) badge.dataset.state = state || '';
    }
    function setClearance(t) { if (clearance) clearance.textContent = t; }

    function setStep(n, state) {
      const node = tlNodes.find(x => +x.dataset.csStep === n);
      if (node) node.dataset.state = state;
    }
    function resetSteps() { tlNodes.forEach(n => delete n.dataset.state); }

    function setStageValue(key, value, state) {
      const el = stages[key];
      if (!el) return;
      const v = el.querySelector('.cs-decision-value');
      if (v) v.textContent = value;
      if (state) el.dataset.state = state; else delete el.dataset.state;
    }
    function resetStages() {
      Object.keys(stages).forEach(k => {
        setStageValue(k, '— awaiting —', '');
      });
    }

    function termClear() { if (termBody) termBody.innerHTML = ''; }
    function termAppend(html) {
      if (!termBody) return;
      const div = document.createElement('div');
      div.className = 'cs-term-line';
      div.innerHTML = html;
      termBody.appendChild(div);
      // crude scroll-to-bottom: drop the oldest if more than ~10 lines
      while (termBody.children.length > 10) termBody.removeChild(termBody.firstChild);
    }

    function playVideo() {
      if (!video) return;
      try {
        video.currentTime = 0;
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) {}
    }
    function stopVideo() {
      if (video) { try { video.pause(); video.currentTime = 0; } catch (e) {} }
    }

    async function runDemo() {
      if (busy) return;
      busy = true;
      clearTimers();
      resetSteps();
      resetStages();
      setGridState('idle');
      setBadgeTag('STAND BY', '');
      setClearance('—');
      setTermStatus('● LISTENING');
      termClear();
      stopVideo();
      await wait(500);

      // ---- STAGE 1: incoming request ----
      setStep(1, 'active');
      setTermStatus('● REQUEST');
      termAppend('<span class="prompt">$</span><span class="info">incoming access request</span>');
      playSound('softclick');
      await wait(450);
      termAppend('<span class="key">src</span>=<span class="val">10.42.7.18</span> <span class="key">user</span>=<span class="val">op-784</span> <span class="key">target</span>=<span class="val">SOC console</span>');
      await wait(650);
      setStep(1, 'done');

      // ---- STAGE 2: UAE Pass push ----
      setStep(2, 'active');
      setTermStatus('● UAE PASS · PUSH SENT');
      setBadgeTag('VERIFYING', 'verifying');
      playVideo();
      termAppend('<span class="prompt">&gt;</span> dispatching <span class="key">UAE Pass</span> push challenge…');
      playSound('softclick');
      await wait(900);
      termAppend('<span class="info">[uaepass]</span> biometric prompt acknowledged on operator device');
      await wait(900);
      setStep(2, 'done');

      // ---- STAGE 3: TDRA verify (identity assertion) ----
      setStep(3, 'active');
      setTermStatus('● TDRA · VERIFYING');
      termAppend('<span class="prompt">&gt;</span> requesting <span class="key">TDRA</span> identity assertion…');
      await wait(750);
      termAppend('<span class="info">[tdra]</span> <span class="ok">200 OK</span> assertion signed · iss=tdra.gov.ae');
      playSound('enter');
      setStageValue('identity', 'CSX-OP-784 · Verified', 'done');
      setBadgeTag('IDENTITY OK', 'verifying');
      await wait(1100);
      setStep(3, 'done');

      // ---- STAGE 4: Risk check ----
      setStep(4, 'active');
      setTermStatus('● RISK ENGINE');
      termAppend('<span class="prompt">&gt;</span> evaluating <span class="key">device + behaviour</span> risk…');
      await wait(750);
      termAppend('<span class="info">[risk]</span> score=<span class="ok">0.04 LOW</span> · device known · no anomalies');
      setStageValue('risk', '0.04 · LOW', 'done');
      await wait(900);
      setStep(4, 'done');

      // ---- STAGE 5: Policy eval ----
      setStep(5, 'active');
      setTermStatus('● POLICY ENGINE');
      termAppend('<span class="prompt">&gt;</span> matching against <span class="key">zero-trust policy</span>…');
      await wait(750);
      termAppend('<span class="info">[policy]</span> role=<span class="val">SOC Analyst</span> tier=<span class="val">Tier 2</span>');
      setStageValue('role', 'SOC Analyst · Tier 2', 'done');
      await wait(900);
      termAppend('<span class="info">[policy]</span> match=<span class="ok">SOC_T2_FULL</span> · 8h session · re-auth on sensitive ops');
      setStageValue('policy', 'SOC_T2_FULL · 8h', 'done');
      await wait(900);
      setStep(5, 'done');

      // ---- STAGE 6: Grant + audit ----
      setStep(6, 'active');
      setTermStatus('● GRANTING');
      setBadgeTag('ACCESS GRANTED', 'verified');
      setClearance('T2');
      termAppend('<span class="prompt">&gt;</span> writing immutable audit entry…');
      await wait(700);
      termAppend('<span class="info">[audit]</span> sha256=<span class="val">7f3a9c…42b1</span> appended to ledger');
      await wait(600);
      termAppend('<span class="arrow">→</span> <span class="ok">ACCESS GRANTED</span> · session bound to UAE Pass token');
      setGridState('granted');
      playSound('enter');
      stopVideo();
      setTermStatus('● ONLINE');
      await wait(900);
      setStep(6, 'done');

      busy = false;
    }

    function resetIdle() {
      clearTimers();
      busy = false;
      resetSteps();
      resetStages();
      setGridState('idle');
      setBadgeTag('STAND BY', '');
      setClearance('—');
      setTermStatus('● LISTENING');
      termClear();
      stopVideo();
    }

    if (replay) {
      replay.addEventListener('click', (e) => {
        e.preventDefault();
        clearTimers();
        busy = false;
        runDemo();
      });
    }

    const slide = slideEl.classList.contains('slide') ? slideEl : slideEl.closest('.slide');
    if (slide) {
      const observer = new MutationObserver(() => {
        if (slide.classList.contains('active')) {
          setTimeout(() => runDemo(), 500);
        } else {
          resetIdle();
        }
      });
      observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
      if (slide.classList.contains('active')) {
        setTimeout(() => runDemo(), 600);
      }
    }

    slideEl.__cxCsUaePass = { runDemo, resetIdle };
  }

  window.CXCsUaePass = {
    init() {
      document.querySelectorAll('[data-cs-uaepass-slide]').forEach(initCsUaePass);
    }
  };
})();
