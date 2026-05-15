/* ===== ComplianceX Interactive Module Stations =====
   Drives the capability tabs on each module deep-dive slide.
   Click a tab → terminal types out lines for that capability,
   the demo viz highlights the relevant part, and the metric bar updates.
*/

(() => {
  function typeLines(consoleEl, lines, opts = {}) {
    if (!consoleEl) return;
    consoleEl.innerHTML = '';
    consoleEl.dataset.typingToken = String((+consoleEl.dataset.typingToken || 0) + 1);
    const token = consoleEl.dataset.typingToken;
    let i = 0;
    const speed = opts.speed || 220;
    function next() {
      if (consoleEl.dataset.typingToken !== token) return;
      if (i >= lines.length) {
        const cursor = document.createElement('div');
        cursor.className = 'ln cursor show';
        consoleEl.appendChild(cursor);
        if (typeof opts.onDone === 'function') opts.onDone();
        return;
      }
      const l = lines[i];
      const div = document.createElement('div');
      div.className = 'ln ' + (l.cls || '');
      div.innerHTML = l.html;
      consoleEl.appendChild(div);
      requestAnimationFrame(() => div.classList.add('show'));
      if (window.CXSound && i % 2 === 0) CXSound.play('bootBeep');
      i++;
      setTimeout(next, speed + Math.random() * 100);
    }
    next();
  }

  function ensureVerifiedChip(tab) {
    if (tab.querySelector('.cap-tab-verified')) return;
    const chip = document.createElement('span');
    chip.className = 'cap-tab-verified';
    chip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg><span>VERIFIED</span>';
    const body = tab.querySelector('.cap-tab-body') || tab;
    body.appendChild(chip);
  }

  function markVerified(tab) {
    if (!tab || tab.classList.contains('verified')) return;
    tab.classList.add('verified');
    if (window.CXSound) CXSound.play('softclick');
    if (window.CXFX && window.CXFX.burstAt) {
      const chip = tab.querySelector('.cap-tab-verified');
      const target = chip || tab;
      const r = target.getBoundingClientRect();
      CXFX.burstAt(r.left + r.width / 2, r.top + r.height / 2, { count: 12, color: 'rgba(16,217,155,0.9)' });
    }
  }

  function activateTab(stationEl, idx) {
    const tabs = stationEl.querySelectorAll('.cap-tab');
    const consoleEl = stationEl.querySelector('.demo-console');
    const stage = stationEl.querySelector('.demo-stage');
    tabs.forEach((t, i) => t.classList.toggle('active', i === idx));

    // build lines from active tab's data
    const tab = tabs[idx];
    if (!tab) return;
    const lines = JSON.parse(tab.dataset.lines || '[]');
    typeLines(consoleEl, lines, { onDone: () => markVerified(tab) });

    // optional: dispatch a highlight event for slide-specific viz
    if (tab.dataset.highlight) {
      stationEl.dataset.activeHighlight = tab.dataset.highlight;
      stationEl.querySelectorAll('[data-h]').forEach(el => {
        el.classList.toggle('highlight', el.dataset.h === tab.dataset.highlight);
      });
    }

    if (window.CXSound) CXSound.play('softclick');
    if (window.CXFX && window.CXFX.burstAt) {
      const r = tab.getBoundingClientRect();
      CXFX.burstAt(r.left + r.width / 2, r.top + r.height / 2, { count: 8 });
    }
  }

  function initDepthCloud(stationEl) {
    const group = stationEl.querySelector('.depth-points');
    if (!group || group.childElementCount > 0) return;
    const svgNS = 'http://www.w3.org/2000/svg';
    const cx = 80, cy = 60, rx = 42, ry = 52;
    const eyes = [{ x: 64, y: 48, r: 7 }, { x: 96, y: 48, r: 7 }];
    const mouth = { x: 80, y: 82, rx: 11, ry: 3 };
    for (let gy = 8; gy < 116; gy += 3) {
      for (let gx = 30; gx < 130; gx += 3) {
        const jx = gx + (Math.random() - 0.5) * 1.6;
        const jy = gy + (Math.random() - 0.5) * 1.6;
        const dx = (jx - cx) / rx, dy = (jy - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
        let skip = false;
        for (const e of eyes) {
          const ex = jx - e.x, ey = jy - e.y;
          if (ex * ex + ey * ey < e.r * e.r) { skip = true; break; }
        }
        if (skip) continue;
        const mx = (jx - mouth.x) / mouth.rx, my = (jy - mouth.y) / mouth.ry;
        if (mx * mx + my * my < 1) continue;
        const c = document.createElementNS(svgNS, 'circle');
        c.setAttribute('cx', jx.toFixed(2));
        c.setAttribute('cy', jy.toFixed(2));
        const edge = Math.max(Math.abs(dx), Math.abs(dy));
        c.setAttribute('r', (0.55 + (1 - edge) * 0.55).toFixed(2));
        c.style.animationDelay = (Math.random() * 2.6).toFixed(2) + 's';
        c.style.fillOpacity = (0.4 + Math.random() * 0.55).toFixed(2);
        group.appendChild(c);
      }
    }
  }

  function initForensicsHeatmap(stationEl) {
    const grid = stationEl.querySelector('[data-forenheat]');
    if (!grid || grid.childElementCount > 0) return;
    const cols = 24, rows = 6;
    const hotspots = [
      { x: 4,  y: 2 },
      { x: 11, y: 1 },
      { x: 17, y: 3 },
      { x: 21, y: 4 },
      { x: 8,  y: 4 },
    ];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'forenheat-cell';
        let lvl = 0;
        for (const h of hotspots) {
          const d = Math.hypot(c - h.x, r - h.y);
          if (d < 1.2) lvl = Math.max(lvl, 3);
          else if (d < 2.1) lvl = Math.max(lvl, 2);
          else if (d < 3.0) lvl = Math.max(lvl, 1);
        }
        if (lvl === 0 && Math.random() < 0.04) lvl = 1;
        if (lvl > 0) {
          cell.classList.add('l' + lvl);
          cell.style.animationDelay = (Math.random() * 1.6).toFixed(2) + 's';
        }
        grid.appendChild(cell);
      }
    }
  }

  function initForensicsLayers(stationEl) {
    const doc = stationEl.querySelector('.forendoc');
    if (!doc) return;
    const layerButtons = stationEl.querySelectorAll('.forenlayer');
    if (!layerButtons.length) return;
    function setLayer(target) {
      doc.dataset.layer = target;
      layerButtons.forEach(b => b.classList.toggle('active', b.dataset.layer === target));
    }
    layerButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        setLayer(btn.dataset.layer);
        if (window.CXSound) CXSound.play('softclick');
      });
    });
    setLayer(doc.dataset.layer || 'visible');
    let i = 0;
    const order = Array.from(layerButtons).map(b => b.dataset.layer);
    setInterval(() => {
      i = (i + 1) % order.length;
      setLayer(order[i]);
    }, 3200);
  }

  function initIdFlip(stationEl) {
    const card = stationEl.querySelector('[data-id-flip-card]');
    if (!card) return;
    const triggers = stationEl.querySelectorAll('[data-id-flip]');
    const labelEl = stationEl.querySelector('[data-id-flip-label]');
    function setFace(face) {
      card.dataset.face = face;
      if (labelEl) labelEl.textContent = face === 'back' ? 'Flip to Front' : 'Flip to Back';
    }
    setFace(card.dataset.face || 'front');
    triggers.forEach(btn => {
      btn.addEventListener('click', () => {
        const next = card.dataset.face === 'back' ? 'front' : 'back';
        setFace(next);
        btn.classList.add('is-flipping');
        setTimeout(() => btn.classList.remove('is-flipping'), 700);
        if (window.CXSound) CXSound.play('softclick');
        if (window.CXFX && window.CXFX.burstAt) {
          const r = card.getBoundingClientRect();
          CXFX.burstAt(r.left + r.width / 2, r.top + r.height / 2, { count: 10 });
        }
      });
    });
  }

  /* ============================================================
     SCENE 1 (identity) — interactive ID scanner state machine.
     States: idle → scanning → failed → uploading → rescanning → verified
     The current ID Front.png is treated as a SUSPICIOUS document;
     after Upload Correct ID the front swaps to Correct ID.png and
     a clean 3s rescan completes verification.
  ============================================================ */
  function initIdScanner(stationEl) {
    const station = stationEl.querySelector('[data-id-station]');
    if (!station) return;
    console.log('[CX-ID] initIdScanner bound for', station);

    const startBtn  = station.querySelector('[data-id-start]');
    const uploadBtn = station.querySelector('[data-id-upload]');
    const loadFalseBtn = station.querySelector('[data-id-load-false]');
    const loadFill  = station.querySelector('[data-id-load-fill]');
    const loadLbl   = station.querySelector('[data-id-load-lbl]');
    const loadTag   = station.querySelector('[data-id-load-tag]');
    console.log('[CX-ID] buttons found?', { start: !!startBtn, upload: !!uploadBtn, loadFalse: !!loadFalseBtn });
    const statusEl  = station.querySelector('[data-id-status]');
    const titleEl   = station.querySelector('[data-idconf-title]');
    const scoreEl   = station.querySelector('[data-idconf-score]');
    const subEl     = station.querySelector('[data-idconf-sub]');
    const confBar   = station.querySelector('[data-idconf-bar]');
    const frontImg  = station.querySelector('[data-id-front-img]');
    const frontLbl  = station.querySelector('[data-id-front-label]');
    const flipCard  = station.querySelector('[data-id-flip-card]');

    const nodes = {
      smartcard: station.querySelector('[data-idnode="smartcard"]'),
      mrz:       station.querySelector('[data-idnode="mrz"]'),
      face:      station.querySelector('[data-idnode="face"]'),
      uae:       station.querySelector('[data-idnode="uae"]')
    };
    const steps = {
      detect:   station.querySelector('[data-idstep="detect"]'),
      chip:     station.querySelector('[data-idstep="chip"]'),
      mrz:      station.querySelector('[data-idstep="mrz"]'),
      face:     station.querySelector('[data-idstep="face"]'),
      uae:      station.querySelector('[data-idstep="uae"]'),
      complete: station.querySelector('[data-idstep="complete"]')
    };

    const FALSE_FRONT_SRC = 'assets/ID Front.png?v=3';
    const CORRECT_FRONT_SRC = 'assets/Correct ID.png';
    let loadedKind = null; // null | 'false' | 'correct'
    // circumference for r=44 ≈ 276.46
    const RING_C = 2 * Math.PI * 44;

    let timers = [];
    let busy = false;
    const wait = (ms) => new Promise(r => { const t = setTimeout(r, ms); timers.push(t); });
    const clearTimers = () => { timers.forEach(t => clearTimeout(t)); timers = []; };
    const playSound = (n) => { if (window.CXSound && CXSound.play) CXSound.play(n); };

    function setState(s) { station.dataset.idState = s; }
    function setStatus(t) { if (statusEl) statusEl.textContent = t; }
    function setConfTitle(html) { if (titleEl) titleEl.innerHTML = html; }
    function setConfSub(t)   { if (subEl) subEl.textContent = t; }
    function setConfScore(text) { if (scoreEl) scoreEl.innerHTML = text; }
    function setConfRing(pct) {
      if (!confBar) return;
      confBar.style.strokeDasharray = RING_C;
      confBar.style.strokeDashoffset = String(RING_C * (1 - Math.max(0, Math.min(100, pct)) / 100));
    }

    function setNode(key, state, descOverride) {
      const n = nodes[key]; if (!n) return;
      n.dataset.idnodeState = state;
      const statusEl = n.querySelector('[data-idnode-status]');
      if (statusEl) {
        statusEl.textContent =
          state === 'pending'  ? '—' :
          state === 'scanning' ? '…' :
          state === 'ok'       ? 'OK' :
          state === 'fail'     ? 'FAIL' : statusEl.textContent;
      }
      const descEl = n.querySelector('[data-idnode-desc]');
      if (descEl && descOverride) descEl.textContent = descOverride;
    }
    function setStep(key, state) {
      const s = steps[key]; if (!s) return;
      s.dataset.idstepState = state;  // pending | active | done | fail
    }
    function resetSteps() { Object.keys(steps).forEach(k => setStep(k, 'pending')); }
    function resetNodes() { Object.keys(nodes).forEach(k => setNode(k, 'pending', defaultDesc(k))); }

    function defaultDesc(k) {
      return ({
        smartcard: 'PKI certificate verified',
        mrz:       'Checksum & format validated',
        face:      'Photo extracted & matched',
        uae:       'Identity record confirmed'
      })[k] || '';
    }

    function animateScore(from, to, durMs, decimals) {
      decimals = decimals == null ? 1 : decimals;
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / durMs);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = (from + (to - from) * eased).toFixed(decimals);
        setConfScore(v + '<small>%</small>');
        setConfRing(parseFloat(v));
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function resetAll() {
      clearTimers();
      busy = false;
      loadedKind = null;
      setState('empty');
      resetNodes();
      resetSteps();
      setStatus('READY · LOAD AN ID TO BEGIN');
      setConfTitle('AWAITING<br/>DOCUMENT');
      setConfSub('NO ID LOADED');
      setConfScore('—');
      setConfRing(0);
      if (frontImg) { frontImg.setAttribute('src', ''); frontImg.style.opacity = '0'; frontImg.removeAttribute('style'); frontImg.style.opacity = '0'; }
      if (frontLbl) frontLbl.textContent = 'FRONT · MRZ';
      if (flipCard) flipCard.dataset.face = 'front';
      if (loadFalseBtn) { loadFalseBtn.hidden = false; loadFalseBtn.disabled = false; }
      // Start Scan is always clickable; if no ID is loaded, clicking auto-loads the False ID first
      if (startBtn)  { startBtn.hidden = false; startBtn.disabled = false; }
      if (uploadBtn) { uploadBtn.hidden = true; uploadBtn.disabled = false; }
    }

    // Animate the upload progress bar over `durMs` ms from 0 → 100
    async function animateLoadBar(durMs) {
      const start = performance.now();
      return new Promise(resolve => {
        function step(now) {
          const t = Math.min(1, (now - start) / durMs);
          const eased = 1 - Math.pow(1 - t, 2);
          const pct = Math.round(eased * 100);
          if (loadFill) loadFill.style.width = pct + '%';
          if (loadTag) loadTag.textContent = pct + '%';
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      });
    }

    // -------- LOAD FALSE / CORRECT ID (no scan, just loading animation)
    async function loadId(kind) {
      if (busy) return; busy = true;
      const src = (kind === 'false') ? FALSE_FRONT_SRC : CORRECT_FRONT_SRC;
      const label = (kind === 'false') ? 'FALSE ID' : 'CORRECT ID';

      playSound('upload');
      setState('loading');
      setStatus(`UPLOADING ${label} · PLEASE WAIT …`);
      setConfTitle('UPLOADING…');
      setConfSub(label);
      if (loadLbl) loadLbl.textContent = `UPLOADING ${label}…`;
      if (loadFill) loadFill.style.width = '0%';
      if (loadTag) loadTag.textContent = '0%';

      // disable inputs during upload
      if (loadFalseBtn) loadFalseBtn.disabled = true;
      if (uploadBtn) uploadBtn.disabled = true;
      if (startBtn) startBtn.disabled = true;

      // preload image while bar fills
      if (frontImg) { frontImg.setAttribute('src', src); frontImg.style.opacity = '0'; }
      await animateLoadBar(2000);

      // Reveal the loaded ID
      if (frontImg) frontImg.style.opacity = '1';
      loadedKind = kind;
      setState(kind === 'false' ? 'loaded-false' : 'loaded-correct');
      setStatus(`${label} LOADED · CLICK "START SCAN" TO BEGIN VERIFICATION`);
      setConfTitle('READY TO<br/>VERIFY');
      setConfSub('CLICK START SCAN');
      playSound('success');

      // Reset scan-progress visuals from any prior failed run so the next scan starts clean
      resetNodes();
      resetSteps();
      setConfScore('—');
      setConfRing(0);

      // Re-show + enable Start Scan (it gets hidden after a failed scan)
      if (startBtn) { startBtn.hidden = false; startBtn.disabled = false; }
      if (kind === 'false') {
        if (loadFalseBtn) loadFalseBtn.hidden = true;
      } else {
        if (uploadBtn) uploadBtn.hidden = true;
      }

      busy = false;
    }

    // Mark every node "scanning" simultaneously (visual loader bed)
    function markAllScanning() {
      ['smartcard', 'mrz', 'face', 'uae'].forEach(k => setNode(k, 'scanning'));
      ['detect', 'chip', 'mrz', 'face', 'uae'].forEach(k => setStep(k, 'active'));
    }

    // Play recurring cyber-scan beeps over `durMs` total
    async function playCyberScanSounds(durMs) {
      const pulses = Math.floor(durMs / 700);
      for (let i = 0; i < pulses; i++) {
        playSound('cyberScan');
        await wait(700);
      }
    }

    // -------- FAIL scan (false ID loaded) -----------------------------
    // 1) 3-second cybersecurity scan animation, 2) reveal REJECTED + flags
    async function runScanFail() {
      if (busy) return; busy = true;
      setState('scanning');
      if (startBtn) startBtn.disabled = true;
      if (loadFalseBtn) loadFalseBtn.disabled = true;
      playSound('click');

      // Phase 1: 3-second cybersecurity scan
      setConfTitle('SCANNING…');
      setConfSub('READING DOCUMENT');
      setConfScore('0.0<small>%</small>');
      setStatus('CYBER-SCAN ACTIVE · EXTRACTING · CROSS-CHECKING …');
      markAllScanning();
      animateScore(0, 88, 3000);
      playCyberScanSounds(3000);
      await wait(3000);

      // Phase 2: reveal — flags + REJECTED
      setNode('smartcard', 'ok', 'PKI certificate valid');
      setNode('mrz',       'fail', 'Checksum mismatch on ID number');
      setNode('face',      'ok', 'Portrait matched · 96.2%');
      setNode('uae',       'fail', 'Nationality not on UAE registry');
      setStep('detect', 'done');
      setStep('chip',   'done');
      setStep('mrz',    'fail');
      setStep('face',   'done');
      setStep('uae',    'fail');
      setStep('complete', 'fail');

      setState('failed');
      setConfTitle('VERIFICATION<br/>FAILED');
      setConfSub('SUSPICIOUS DOCUMENT');
      setConfScore('41.3<small>%</small>');
      setConfRing(41.3);
      setStatus('FAIL · ID NUMBER MISMATCH · NATIONALITY MISMATCH — UPLOAD A CORRECT ID');
      playSound('error');
      if (uploadBtn) uploadBtn.hidden = false;
      if (startBtn)  startBtn.hidden = true;
      busy = false;
    }

    // -------- CLEAN scan → APPROVED (used when correct ID is loaded)
    async function runScanApprove() {
      if (busy) return; busy = true;
      setState('scanning');
      if (startBtn) startBtn.disabled = true;
      playSound('click');

      // Phase 1: 3-second cybersecurity scan animation
      setConfTitle('SCANNING…');
      setConfSub('READING DOCUMENT');
      setConfScore('0.0<small>%</small>');
      setStatus('CYBER-SCAN ACTIVE · EXTRACTING · CROSS-CHECKING …');
      markAllScanning();
      animateScore(0, 98.6, 3000);
      playCyberScanSounds(3000);
      await wait(3000);

      // Phase 2: reveal APPROVED
      setNode('smartcard', 'ok', 'PKI certificate verified');
      setNode('mrz',       'ok', 'Checksum & format validated');
      setNode('face',      'ok', 'Photo extracted & matched');
      setNode('uae',       'ok', 'Identity record confirmed');
      ['detect', 'chip', 'mrz', 'face', 'uae', 'complete'].forEach(k => setStep(k, 'done'));

      setState('verified');
      setConfTitle('APPROVED');
      setConfSub('IDENTITY CONFIRMED');
      setConfScore('98.6<small>%</small>');
      setConfRing(98.6);
      setStatus('APPROVED · IDENTITY CONFIRMED · YOU MAY FLIP TO BACK');
      playSound('enter');
      if (startBtn) { startBtn.hidden = true; startBtn.disabled = false; }
      if (uploadBtn) { uploadBtn.hidden = true; }
      busy = false;
    }

    async function dispatchStart() {
      if (busy) return;
      // If user clicks Start Scan with no ID loaded, auto-load the False ID first then scan
      if (!loadedKind) {
        await loadId('false');
        // small breath so the user sees the loaded ID before the scan kicks off
        await wait(450);
        runScanFail();
        return;
      }
      if (loadedKind === 'false')   { runScanFail(); return; }
      if (loadedKind === 'correct') { runScanApprove(); return; }
    }

    if (loadFalseBtn) {
      loadFalseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        try { loadId('false'); } catch (err) { console.error('[CX-ID] loadId(false) error:', err); }
      });
    }
    if (startBtn) {
      startBtn.addEventListener('click', (e) => {
        e.preventDefault();
        try { dispatchStart(); } catch (err) { console.error('[CX-ID] dispatchStart error:', err); }
      });
    }
    if (uploadBtn) {
      uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        try { loadId('correct'); } catch (err) { console.error('[CX-ID] loadId(correct) error:', err); }
      });
    }

    // Document-level safety net (single delegated listener for all stations)
    if (!window.__cxIdScannerDelegated) {
      window.__cxIdScannerDelegated = true;
      document.addEventListener('click', (e) => {
        const start = e.target.closest('[data-id-start]');
        if (start && !start.disabled) {
          try { dispatchStart(); } catch (err) { console.error('[CX-ID] dispatchStart error:', err); }
          return;
        }
        const upload = e.target.closest('[data-id-upload]');
        if (upload && !upload.disabled) {
          try { loadId('correct'); } catch (err) { console.error('[CX-ID] loadId(correct) error:', err); }
          return;
        }
        const loadFalse = e.target.closest('[data-id-load-false]');
        if (loadFalse && !loadFalse.disabled) {
          try { loadId('false'); } catch (err) { console.error('[CX-ID] loadId(false) error:', err); }
          return;
        }
      });
    }

    // Expose for debugging
    station.__cxScan = { runScanFail, runScanApprove, loadId, resetAll };
    window.__cxScan = station.__cxScan;

    resetAll();
    console.log('[CX-ID] resetAll() complete, state idle');
  }

  function initStation(stationEl) {
    initIdFlip(stationEl);
    initIdScanner(stationEl);
    initDepthCloud(stationEl);
    initForensicsHeatmap(stationEl);
    initForensicsLayers(stationEl);
    const tabs = stationEl.querySelectorAll('.cap-tab');
    tabs.forEach((t, idx) => {
      ensureVerifiedChip(t);
      t.addEventListener('click', () => activateTab(stationEl, idx));
    });

    // observer: when the parent slide becomes active, fire tab 0
    const slide = stationEl.closest('.slide');
    if (slide) {
      const mo = new MutationObserver(() => {
        if (slide.classList.contains('active')) {
          setTimeout(() => activateTab(stationEl, 0), 350);
        }
      });
      mo.observe(slide, { attributes: true, attributeFilter: ['class'] });

      // if already active on init
      if (slide.classList.contains('active')) {
        setTimeout(() => activateTab(stationEl, 0), 500);
      }
    }
  }

  window.CXModules = {
    init() {
      document.querySelectorAll('.module-station').forEach(initStation);
    }
  };
})();
