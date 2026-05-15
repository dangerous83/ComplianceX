/* ===== ComplianceX Presentation Deck Controller v2 ===== */

(() => {
  CXSound.init();

  // ===== Slide navigation =====
  // scope to top-level .slide sections only — never match nested helpers that
  // happen to use the same class name inside slide content
  const slides = document.querySelectorAll('.deck > .slide');
  const total = slides.length;
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const counterCurrent = document.getElementById('counterCurrent');
  const counterTotal = document.getElementById('counterTotal');
  const progressFill = document.getElementById('progressFill');
  const tocItems = document.querySelectorAll('.toc-item');
  const toc = document.getElementById('toc');
  const menuToggle = document.getElementById('menuToggle');
  const wipe = document.getElementById('slideWipe');

  let current = 0;

  counterTotal.textContent = String(total).padStart(2, '0');

  function go(idx, opts = {}) {
    if (idx < 0 || idx >= total) return;
    if (idx === current && !opts.force) return;

    // wipe effect
    if (!opts.silent) {
      CXSound.play('transition');
      wipe.classList.add('active');
      setTimeout(() => wipe.classList.remove('active'), 700);
    }

    slides[current].classList.remove('active');
    current = idx;
    slides[current].classList.add('active');

    counterCurrent.textContent = String(current + 1).padStart(2, '0');
    progressFill.style.width = ((current + 1) / total * 100) + '%';

    tocItems.forEach((el, i) => el.classList.toggle('active', i === current));

    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === total - 1;

    slides[current].scrollTop = 0;

    // re-run any count-up numbers in this slide
    if (window.CXFX && CXFX.rerunCountersInSlide) {
      setTimeout(() => CXFX.rerunCountersInSlide(slides[current]), 200);
    }

    // notify slide-specific modules (e.g. CyberShield) that this slide is now active
    slides[current].dispatchEvent(new CustomEvent('cx:slide-enter', { bubbles: true }));

    if (!opts.silent) history.replaceState(null, '', '#s' + (current + 1));
  }

  prevBtn.addEventListener('click', () => go(current - 1));
  nextBtn.addEventListener('click', () => go(current + 1));

  // Cover-page Enter button (slide 1) — advances to slide 2
  document.querySelectorAll('[data-cover-enter]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (window.CXSound) CXSound.play('enter');
      go(1);
    });
  });

  tocItems.forEach(el => {
    el.addEventListener('click', () => {
      go(parseInt(el.dataset.slide, 10));
      toc.classList.remove('open');
    });
  });

  menuToggle.addEventListener('click', () => {
    toc.classList.toggle('open');
    CXSound.play('open');
  });

  // ===== Sound toggle =====
  const soundToggle = document.getElementById('soundToggle');
  if (CXSound.isMuted()) soundToggle.classList.add('muted');
  soundToggle.addEventListener('click', () => {
    const willMute = !soundToggle.classList.contains('muted');
    CXSound.setMuted(willMute);
    soundToggle.classList.toggle('muted', willMute);
    if (!willMute) CXSound.play('softclick');
  });

  // ===== Keyboard =====
  document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        e.preventDefault(); go(current + 1); break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault(); go(current - 1); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End': e.preventDefault(); go(total - 1); break;
      case 'm': case 'M':
        toc.classList.toggle('open');
        CXSound.play('open');
        break;
      case 's': case 'S':
        soundToggle.click();
        break;
      case 'Escape': toc.classList.remove('open'); break;
      case 'f': case 'F':
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
        break;
    }
  });

  // ===== Touch swipe =====
  let touchStartX = 0, touchStartY = 0;
  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  document.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) go(current + 1); else go(current - 1);
    }
  }, { passive: true });

  // ===== Click outside TOC =====
  document.addEventListener('click', e => {
    if (toc.classList.contains('open') &&
        !toc.contains(e.target) &&
        e.target !== menuToggle && !menuToggle.contains(e.target)) {
      toc.classList.remove('open');
    }
  });

  // ===== Click-to-expand cards =====
  document.querySelectorAll('.expand-card').forEach(card => {
    card.addEventListener('click', () => {
      const wasOpen = card.classList.contains('open');
      card.classList.toggle('open');
      CXSound.play(wasOpen ? 'close' : 'open');
    });
  });

  // ===== Workflow node interaction (step-by-step with animated packets) =====
  (() => {
    const stage = document.getElementById('workflowStage');
    if (!stage) return;
    const nodes = Array.from(stage.querySelectorAll('.workflow-node')).sort(
      (a, b) => parseInt(a.dataset.step, 10) - parseInt(b.dataset.step, 10)
    );
    if (!nodes.length) return;

    const wfTitle = document.getElementById('wfTitle');
    const wfDesc = document.getElementById('wfDesc');
    const wfDetail = document.getElementById('workflowDetail');
    const wfDetailTag = document.getElementById('wfDetailTag');
    const wfStepNum = document.getElementById('wfStepNum');
    const wfProgressFill = document.getElementById('wfProgressFill');
    const playBtn = document.getElementById('wfPlayBtn');
    const playTextEl = playBtn ? playBtn.querySelector('.wf-play-text') : null;

    const pathBase = document.getElementById('wfPath');
    const pathProgress = document.getElementById('wfPathProgress');
    const packets = Array.from(stage.querySelectorAll('.wf-packet'));

    const total = nodes.length;
    const pathLen = pathBase && pathBase.getTotalLength ? pathBase.getTotalLength() : 0;
    let activeStep = 0;
    let playing = false;
    let playTimer = null;
    const packetAnims = new Array(packets.length).fill(0);

    function setProgress(stepIndex) {
      const pct = total > 1 ? (stepIndex / (total - 1)) * 100 : 0;
      if (pathProgress) pathProgress.style.strokeDashoffset = String(100 - pct);
      if (wfProgressFill) wfProgressFill.style.width = `${((stepIndex + 1) / total) * 100}%`;
    }

    function setNodeStates(stepIndex) {
      nodes.forEach((n, i) => {
        n.classList.remove('active', 'completed', 'dimmed');
        if (i < stepIndex) n.classList.add('completed');
        else if (i === stepIndex) n.classList.add('active');
        else n.classList.add('dimmed');
      });
    }

    function updateDetail(node, stepNumber) {
      if (!node) return;
      const padded = String(stepNumber + 1).padStart(2, '0');
      if (wfTitle) wfTitle.textContent = node.dataset.title || '';
      if (wfDesc) wfDesc.textContent = node.dataset.desc || '';
      if (wfStepNum) wfStepNum.textContent = padded;
      if (wfDetailTag) wfDetailTag.textContent = `// STEP ${padded} · ${(node.dataset.key || '').toUpperCase()}`;
      if (wfDetail) wfDetail.classList.add('show');
    }

    function animatePacket(fromStep, toStep, duration) {
      if (!pathBase || !packets.length || !pathLen) return;
      duration = duration || 800;
      packetAnims.forEach((id) => id && cancelAnimationFrame(id));
      if (fromStep === toStep) {
        packets.forEach((pkt) => pkt.classList.remove('active'));
        return;
      }
      const segLen = 1 / (total - 1);
      const startT = fromStep * segLen;
      const endT = toStep * segLen;
      const baseTime = performance.now();

      packets.forEach((pkt, idx) => {
        const stagger = idx * 150;
        const startTime = baseTime + stagger;
        pkt.classList.add('active');

        const step = (now) => {
          if (now < startTime) {
            packetAnims[idx] = requestAnimationFrame(step);
            return;
          }
          const t = Math.min(1, (now - startTime) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          const dist = (startT + (endT - startT) * eased) * pathLen;
          const p = pathBase.getPointAtLength(dist);
          pkt.setAttribute('cx', p.x);
          pkt.setAttribute('cy', p.y);
          if (t < 1) {
            packetAnims[idx] = requestAnimationFrame(step);
          } else {
            packetAnims[idx] = 0;
            setTimeout(() => pkt.classList.remove('active'), 120);
          }
        };
        packetAnims[idx] = requestAnimationFrame(step);
      });
    }

    function goToStep(stepIndex, opts) {
      opts = opts || {};
      const prev = activeStep;
      activeStep = stepIndex;
      setNodeStates(stepIndex);
      setProgress(stepIndex);
      updateDetail(nodes[stepIndex], stepIndex);
      if (!opts.skipPacket) animatePacket(prev, stepIndex);
    }

    function startPlay() {
      if (playing) return;
      playing = true;
      if (playBtn) playBtn.classList.add('playing');
      if (playTextEl) playTextEl.textContent = 'Pause';

      let i = activeStep >= total - 1 ? 0 : activeStep + 1;
      // if user is mid-journey, continue from next; if at end, restart from 0
      if (activeStep >= total - 1) {
        goToStep(0);
        i = 1;
      }
      const advance = () => {
        if (!playing) return;
        if (i >= total) {
          playTimer = setTimeout(stopPlay, 1400);
          return;
        }
        goToStep(i);
        i += 1;
        playTimer = setTimeout(advance, 1200);
      };
      playTimer = setTimeout(advance, 600);
    }

    function stopPlay() {
      playing = false;
      if (playTimer) { clearTimeout(playTimer); playTimer = null; }
      if (playBtn) playBtn.classList.remove('playing');
      if (playTextEl) playTextEl.textContent = 'Play sequence';
    }

    nodes.forEach((node, i) => {
      node.addEventListener('click', () => {
        stopPlay();
        goToStep(i);
      });
    });

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (playing) stopPlay();
        else startPlay();
      });
    }

    // Initialize: Onboard active, others dimmed, no packet animation yet
    goToStep(0, { skipPacket: true });
  })();

  // ===== Deep-link from hash =====
  if (location.hash.startsWith('#s')) {
    const n = parseInt(location.hash.slice(2), 10);
    if (!isNaN(n) && n >= 1 && n <= total) {
      slides[0].classList.remove('active');
      slides[n - 1].classList.add('active');
      current = n - 1;
      counterCurrent.textContent = String(n).padStart(2, '0');
      progressFill.style.width = (n / total * 100) + '%';
      tocItems.forEach((el, i) => el.classList.toggle('active', i === current));
    }
  } else {
    progressFill.style.width = (1 / total * 100) + '%';
    tocItems[0].classList.add('active');
  }

  prevBtn.disabled = current === 0;
  nextBtn.disabled = current === total - 1;

  // ===== Live clock for top corner if added later =====

  // ===== ITSEC Capability Constellation =====
  (() => {
    const station = document.getElementById('itsecStation');
    if (!station) return;
    const nodes = station.querySelectorAll('.ic-node');
    const edges = station.querySelectorAll('.ic-edge');
    const tagEl = document.getElementById('icTag');
    const titleEl = document.getElementById('icTitle');
    const descEl = document.getElementById('icDesc');
    const statEl = document.getElementById('icStat');

    function activate(node) {
      const target = node.dataset.target;
      nodes.forEach(n => n.classList.toggle('active', n === node));
      edges.forEach(e => e.classList.toggle('live', e.dataset.target === target));
      if (tagEl) tagEl.textContent = '// ' + (node.dataset.title || '').toUpperCase();
      if (titleEl) titleEl.textContent = node.dataset.title || '';
      if (descEl) descEl.textContent = node.dataset.desc || '';
      if (statEl) statEl.textContent = node.dataset.stat || '';
      if (window.CXSound) CXSound.play('click');
      if (window.CXFX && window.CXFX.burstAt) {
        const r = node.getBoundingClientRect();
        CXFX.burstAt(r.left + r.width/2, r.top + r.height/2, { count: 12 });
      }
    }

    nodes.forEach(n => n.addEventListener('click', () => activate(n)));

    // activate the default-active node on slide enter
    const slide = station.closest('.slide');
    if (slide) {
      const mo = new MutationObserver(() => {
        if (slide.classList.contains('active')) {
          const active = station.querySelector('.ic-node.active') || nodes[0];
          if (active) {
            // refresh edges + detail without sound to avoid double-click
            const target = active.dataset.target;
            edges.forEach(e => e.classList.toggle('live', e.dataset.target === target));
            if (tagEl) tagEl.textContent = '// ' + (active.dataset.title || '').toUpperCase();
            if (titleEl) titleEl.textContent = active.dataset.title || '';
            if (descEl) descEl.textContent = active.dataset.desc || '';
            if (statEl) statEl.textContent = active.dataset.stat || '';
          }
        }
      });
      mo.observe(slide, { attributes: true, attributeFilter: ['class'] });
    }
  })();

  // ===== Platform sidebar view switcher (Slide 8) =====
  document.querySelectorAll('.platform-window').forEach(win => {
    const navItems = win.querySelectorAll('.nav-item[data-view]');
    const views = win.querySelectorAll('.pm-view[data-view]');

    function staggerRows(viewEl) {
      // Stagger the list rows so they slide in one after another
      const rows = viewEl.querySelectorAll('.pm-list-row, .pm-ws-card, .pm-tr-row, .mlro-row, .tx-row, .pm-alert-row');
      rows.forEach((r, i) => {
        r.classList.remove('stagger');
        // force reflow to restart animation
        void r.offsetWidth;
        r.style.animationDelay = (i * 60) + 'ms';
        r.classList.add('stagger');
      });
    }

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const target = item.dataset.view;
        navItems.forEach(n => n.classList.toggle('active', n === item));
        views.forEach(v => {
          const on = v.dataset.view === target;
          v.classList.toggle('active', on);
          if (on) staggerRows(v);
        });
        if (window.CXSound) CXSound.play('softclick');
      });
    });

    // Auto-cycle through views every few seconds when the slide is on-screen,
    // so the audience sees each module without manual clicking.
    const slide = win.closest('.slide');
    if (slide) {
      const order = ['dashboard', 'workspaces', 'kyc', 'txmonitor', 'aml', 'travelrule', 'mlro', 'sar', 'regreports', 'investigations', 'por', 'compliance', 'security'];
      let idx = 0;
      let timer = null;
      let userActivated = false;

      // pause auto-cycle once user clicks a nav item (manual control wins)
      navItems.forEach(item => item.addEventListener('click', () => {
        userActivated = true;
        if (timer) { clearInterval(timer); timer = null; }
      }, { once: true }));

      const observer = new MutationObserver(() => {
        if (slide.classList.contains('active') && !userActivated) {
          if (timer) clearInterval(timer);
          idx = 0;
          timer = setInterval(() => {
            idx = (idx + 1) % order.length;
            const targetItem = win.querySelector(`.nav-item[data-view="${order[idx]}"]`);
            if (targetItem && !userActivated) {
              const target = order[idx];
              navItems.forEach(n => n.classList.toggle('active', n.dataset.view === target));
              views.forEach(v => {
                const on = v.dataset.view === target;
                v.classList.toggle('active', on);
                if (on) staggerRows(v);
              });
            }
          }, 4500);
        } else if (timer) {
          clearInterval(timer);
          timer = null;
        }
      });
      observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
      // initial trigger if slide is already active
      if (slide.classList.contains('active')) {
        const ev = new Event('DOMContentLoaded');
        setTimeout(() => observer.takeRecords(), 0);
      }
    }
  });

  // ===== VerifiX consolidated platform — sidebar swaps views =====
  document.querySelectorAll('[data-vfx-platform]').forEach(win => {
    const navItems = win.querySelectorAll('.vfx-nav-item[data-view]');
    const views = win.querySelectorAll('.vfx-pview[data-view]');
    const main = win.querySelector('.vfx-main');
    function showView(target) {
      navItems.forEach(n => n.classList.toggle('active', n.dataset.view === target));
      views.forEach(v => v.classList.toggle('active', v.dataset.view === target));
      if (main) main.scrollTop = 0;
    }
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        showView(item.dataset.view);
        if (window.CXSound) CXSound.play('softclick');
      });
    });
    win.querySelectorAll('.vfx-tile[data-jump]').forEach(tile => {
      tile.style.cursor = 'pointer';
      tile.addEventListener('click', () => {
        showView(tile.dataset.jump);
        if (window.CXSound) CXSound.play('softclick');
      });
    });
  });

  // ===== VerifiX Training — lesson detail navigation =====
  document.querySelectorAll('[data-vfx-training]').forEach(t => {
    const states = t.querySelectorAll('.vfx-training-state[data-tstate]');
    const main = t.closest('.vfx-main');
    function showTState(key) {
      states.forEach(s => s.classList.toggle('active', s.dataset.tstate === String(key)));
      if (main) main.scrollTop = 0;
    }
    t.querySelectorAll('[data-open-lesson]').forEach(btn => {
      btn.addEventListener('click', () => {
        showTState(btn.dataset.openLesson);
        if (window.CXSound) CXSound.play('softclick');
      });
    });
    t.querySelectorAll('[data-back-lessons]').forEach(btn => {
      btn.addEventListener('click', () => {
        showTState('list');
        if (window.CXSound) CXSound.play('softclick');
      });
    });
    t.querySelectorAll('[data-next-lesson]').forEach(btn => {
      btn.addEventListener('click', () => {
        showTState(btn.dataset.nextLesson);
        if (window.CXSound) CXSound.play('softclick');
      });
    });
    t.querySelectorAll('.vfx-quiz-cta').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.CXSound) CXSound.play('success');
      });
    });
  });

  // ===== Make VerifiX form interactivity feel real =====
  // Toggle switches
  document.querySelectorAll('.vfx-switch').forEach(sw => {
    sw.addEventListener('click', (e) => {
      e.preventDefault();
      sw.classList.toggle('on');
      if (window.CXSound) CXSound.play('softclick');
    });
  });
  // Person/Company toggle group
  document.querySelectorAll('.vfx-toggle-group').forEach(grp => {
    grp.querySelectorAll('.vfx-toggle-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        grp.querySelectorAll('.vfx-toggle-opt').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        if (window.CXSound) CXSound.play('softclick');
      });
    });
  });
  // AML Person/Company entity swap — swaps form fields + right-side visual
  document.querySelectorAll('[data-vfx-aml]').forEach(aml => {
    aml.querySelectorAll('[data-aml-entity]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.amlEntity;
        aml.querySelectorAll('[data-aml-fields]').forEach(f => f.classList.toggle('active', f.dataset.amlFields === mode));
        aml.querySelectorAll('[data-aml-empty]').forEach(e => e.classList.toggle('active', e.dataset.amlEmpty === mode));
      });
    });
  });
  // Alert feed tabs
  document.querySelectorAll('.vfx-feed-toggle').forEach(grp => {
    grp.querySelectorAll('.vfx-feed-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        grp.querySelectorAll('.vfx-feed-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (window.CXSound) CXSound.play('softclick');
      });
    });
  });

  // ===== Particle field =====
  const canvas = document.getElementById('particles');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, particles = [];
    const PARTICLE_COUNT = 60;
    const MAX_DIST = 130;
    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.2 + 0.4,
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
        const dx = mouse.x - p.x, dy = mouse.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 160) { p.x -= dx / d * 0.5; p.y -= dy / d * 0.5; }
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
            ctx.strokeStyle = 'rgba(0, 212, 255, ' + ((1 - d / MAX_DIST) * 0.10) + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(tick);
    }
    tick();
  }

})();

/* ===== CyberShield slide module (slides 24–28 in presentation.html) ===== */
(() => {
  const csSlides = Array.from(document.querySelectorAll('.slide.cs-host'));
  if (!csSlides.length) return;

  // ----- popover -----
  const popover = document.getElementById('csPopover');
  const popTag = document.getElementById('csPopoverTag');
  const popTitle = document.getElementById('csPopoverTitle');
  const popBody = document.getElementById('csPopoverBody');
  const popClose = document.getElementById('csPopoverClose');

  const popoverContent = {
    phishing: { tag: '// PHISHING SIMULATION', title: 'Phishing Simulation',
      body: '43+ Arabic & English templates covering BEC, MFA fatigue, QR phishing and credential capture. Send realistic, safe simulations to any department and capture opens, clicks, submissions and reports in real time.' },
    training: { tag: '// INTERACTIVE TRAINING', title: 'Interactive Training',
      body: '70+ micro-learning modules. Role-aware paths auto-assign to risky users after every campaign. Bilingual (AR/EN), 3–5 minute lessons, completion certificates and quiz scoring built in.' },
    compliance: { tag: '// COMPLIANCE MAPPING', title: 'Compliance Mapping',
      body: 'Map every awareness control to CBUAE, DESC ISR, NESA / UAE IA, PDPL — plus ISO 27001, NIST CSF and SOC 2. Each campaign and lesson is tagged to specific control IDs, ready for evidence export.' },
    policies: { tag: '// POLICY ACKNOWLEDGEMENT', title: 'Policy Acknowledgement',
      body: 'Publish acceptable-use, data handling and security policies. Capture per-employee acknowledgement, version history and reminders. Every signature is timestamped and immutable.' },
    audit: { tag: '// AUDIT EVIDENCE EXPORT', title: 'Audit Evidence Export',
      body: 'One click produces a regulator-ready PDF: control mapping, campaign results, training completion, policy signatures, screenshots and a tamper-evident audit hash.' },
    'threat-phish': { tag: '// PHISHING', title: 'Phishing Attempt',
      body: 'Fake CBUAE / DEWA / Microsoft emails crafted with urgency cues. CyberShield delivers identical safe simulations to every employee — coaching anyone who clicks instantly.' },
    'threat-bec': { tag: '// BUSINESS EMAIL COMPROMISE', title: 'BEC Scenario',
      body: 'Attackers impersonate the CFO / CEO requesting an urgent wire transfer to a new IBAN. CyberShield trains finance teams specifically on invoice verification and dual-control payments.' },
    'threat-mfa': { tag: '// MFA FATIGUE', title: 'MFA Fatigue Attack',
      body: 'Repeated push prompts at odd hours pressure the user to approve. CyberShield trains employees to recognise prompt-bombing and use number-matching MFA.' },
    'threat-qr': { tag: '// QR PHISHING', title: 'Quishing (QR Phishing)',
      body: 'Malicious QR codes in emails, posters or PDFs send users to credential-capture pages on mobile — bypassing many email defences. We simulate quishing in Arabic and English.' },
    'threat-rw': { tag: '// RANSOMWARE', title: 'Ransomware Awareness',
      body: 'Tests for risky behaviours that lead to ransomware: macro-enabled attachments, fake helpdesk tools, password-protected zips. Pair with mandatory micro-learning.' },
    'wf-connect': { tag: '// 01 IDENTITY SYNC', title: 'Connect Users',
      body: 'Sync from Microsoft Entra ID, Google Workspace or SCIM. Groups become departments. New joiners are auto-onboarded; leavers are auto-deactivated.' },
    'wf-launch': { tag: '// 02 CAMPAIGN LAUNCH', title: 'Launch Campaign',
      body: 'Pick from 43+ bilingual templates, set sender domain (DKIM/SPF configured), choose audience, and schedule. Optional Arabic-only or Arabic-first delivery for UAE staff.' },
    'wf-train': { tag: '// 04 TARGETED TRAINING', title: 'Assign Training',
      body: 'Anyone who clicks, submits credentials, or fails the safe-prompt automatically receives a 3-minute coaching lesson — no manual list-building.' },
    'wf-score': { tag: '// 05 RISK DASHBOARD', title: 'View Risk Score',
      body: 'Department-level human-risk score combining click rate, submission rate, training completion, policy acknowledgement, and tenure. Trend lines show progress quarter over quarter.' },
    'wf-export': { tag: '// 06 AUDIT EXPORT', title: 'Export Evidence',
      body: 'Generate a PDF pack: campaign list, click-through results, training completion, policy signatures, control mapping, hashes and signatures — ready for CBUAE, DESC, NESA, PDPL.' },
    'fw-cbuae': { tag: '// CBUAE', title: 'CBUAE',
      body: 'Central Bank of the UAE — guidelines on cyber security awareness, phishing testing, and staff training for licensed financial institutions. CyberShield maps every campaign to relevant CBUAE controls.' },
    'fw-desc': { tag: '// DESC ISR', title: 'DESC Information Security Regulation',
      body: 'Dubai Electronic Security Center · ISR for Dubai Government and semi-government entities. Awareness, phishing, and policy controls are tagged to ISR domains and exported as evidence.' },
    'fw-nesa': { tag: '// NESA / UAE IA', title: 'NESA / UAE Information Assurance',
      body: 'National Information Assurance standard for critical infrastructure (energy, telecom, transport, health). Awareness and HR security families are pre-mapped.' },
    'fw-pdpl': { tag: '// PDPL', title: 'UAE Personal Data Protection Law',
      body: 'Federal Decree-Law 45 of 2021 on the Protection of Personal Data. Staff awareness, lawful handling, and data-subject rights training tagged and reportable.' },
    'fw-custom': { tag: '// CUSTOM FRAMEWORKS', title: 'Custom Frameworks',
      body: 'ISO 27001 Annex A.7 (HR security), NIST CSF · PR.AT, SOC 2 · CC1/CC2, sector-specific frameworks or your internal control library — add custom mappings in minutes.' },
    'cta-dashboard': { tag: '// EXEC DASHBOARD', title: 'View Dashboard',
      body: 'Open the executive risk dashboard: human-risk trend, top 5 risky departments, training completion, compliance score and audit-export status. Live, single pane.' },
    'cta-evidence': { tag: '// EVIDENCE PACK', title: 'Download Evidence Pack',
      body: 'One click produces a signed PDF + machine-readable bundle: campaign results, training, policy acknowledgements, control mapping, hashes. Regulator-ready.' },
    'cta-training': { tag: '// TRAINING REVIEW', title: 'Review Training Completion',
      body: 'Drill into per-department completion, average score, time-to-complete and outstanding learners. Send Arabic or English reminders in one click.' },
    'cta-launch': { tag: '// NEW CAMPAIGN', title: 'Launch New Campaign',
      body: 'Configure audience, template, sender domain and schedule. Less than 7 days from signup to first live phishing campaign for most organizations.' },
    'cta-demo': { tag: '// BOOK A DEMO', title: 'Book a Live Demo',
      body: 'See CyberShield with your data: connect a test tenant, launch a sample campaign, and walk through a real audit-evidence pack. 30 minutes with our UAE team.' }
  };

  function openPopover(key, sourceBtn) {
    const data = popoverContent[key];
    if (!data || !popover) return;
    popTag.textContent = data.tag;
    popTitle.textContent = data.title;
    popBody.textContent = data.body;
    popover.classList.add('show');
    if (sourceBtn && sourceBtn.parentElement) {
      sourceBtn.parentElement.querySelectorAll('.cs-btn').forEach(b => b.classList.remove('active'));
      sourceBtn.classList.add('active');
    }
  }
  function closePopover() {
    if (!popover) return;
    popover.classList.remove('show');
    document.querySelectorAll('.cs-btn.active').forEach(b => b.classList.remove('active'));
  }

  if (popClose) popClose.addEventListener('click', closePopover);

  document.querySelectorAll('.cs-btn[data-cs-popover]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPopover(btn.dataset.csPopover, btn);
    });
  });

  document.addEventListener('click', (e) => {
    if (popover && popover.classList.contains('show')
        && !popover.contains(e.target)
        && !e.target.closest('.cs-btn[data-cs-popover]')) {
      closePopover();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopover(); });

  // ----- slide-specific animations -----
  let flowRaf = 0;
  function animateFlow() {
    cancelAnimationFrame(flowRaf);
    const flowPath = document.getElementById('csFlowPath');
    const p1 = document.getElementById('csFlowPacket1');
    const p2 = document.getElementById('csFlowPacket2');
    if (!flowPath || !p1) return;
    const len = flowPath.getTotalLength();
    const start = performance.now();
    const loop = (now) => {
      const t1 = ((now - start) / 4000) % 1;
      const t2 = ((now - start - 600) / 4000 + 1) % 1;
      const pt1 = flowPath.getPointAtLength(t1 * len);
      p1.setAttribute('cx', pt1.x); p1.setAttribute('cy', pt1.y);
      if (p2) {
        const pt2 = flowPath.getPointAtLength(t2 * len);
        p2.setAttribute('cx', pt2.x); p2.setAttribute('cy', pt2.y);
      }
      flowRaf = requestAnimationFrame(loop);
    };
    flowRaf = requestAnimationFrame(loop);
  }
  function stopFlow() { cancelAnimationFrame(flowRaf); flowRaf = 0; }

  function animateMeter() {
    const meterFg = document.getElementById('csMeterFg');
    const meterValue = document.getElementById('csMeterValue');
    if (!meterFg || !meterValue) return;
    const targetPct = 72;
    const circumference = 502;
    meterFg.style.strokeDashoffset = String(circumference * (1 - targetPct / 100));
    const start = performance.now();
    const dur = 1400;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      meterValue.textContent = Math.round(eased * targetPct);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function resetMeter() {
    const meterFg = document.getElementById('csMeterFg');
    const meterValue = document.getElementById('csMeterValue');
    if (meterFg) meterFg.style.strokeDashoffset = '502';
    if (meterValue) meterValue.textContent = '--';
  }

  function animateCounter(el, target, duration, suffix) {
    if (!el) return;
    suffix = suffix || '';
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // attach slide-enter handlers
  csSlides.forEach(slide => {
    slide.addEventListener('cx:slide-enter', () => {
      closePopover();
      const n = parseInt(slide.dataset.csSlide, 10);
      stopFlow();
      if (n === 1) {
        setTimeout(animateFlow, 400);
      }
      if (n === 2) {
        resetMeter();
        setTimeout(animateMeter, 700);
      } else if (n !== 2) {
        // keep meter reset when not on slide 2 so it replays cleanly
        resetMeter();
      }
      if (n === 5) {
        const train = document.getElementById('csKpiTrain');
        const audit = document.getElementById('csKpiAudit');
        if (train) animateCounter(train, 94, 1400, '%');
        if (audit) animateCounter(audit, 100, 1600, '%');
      }
    });
  });

  // if the deck opens directly on a CyberShield slide, kick off its animations
  const activeCs = document.querySelector('.slide.active.cs-host');
  if (activeCs) {
    setTimeout(() => activeCs.dispatchEvent(new CustomEvent('cx:slide-enter')), 100);
  }
})();

/* ===== Biometric Live Scan — slide 9 liveness sequence =====
   Flow:
   1. Upload portrait (file picker → reveals face)
   2. "Start Biometric Scan" CTA
   3. Three step videos play in-frame, each followed by an "Approved" stamp:
        · Blink     (Biometric-Blink.mp4)
        · Head Turn (Biometric-Turn Head.mp4)
        · Mouth     (Biometric - Mouth Movement.mp4)
   4. Focus shifts to the holographic head, which loads over 3 s
   5. Final "Successful" overlay + metric reveal
==================================================================== */
(() => {
  const station = document.querySelector('[data-bio-station]');
  if (!station) return;

  const uploadTrigger = station.querySelector('[data-bio-upload-trigger]');
  const startBtn      = station.querySelector('[data-bio-start]');
  const replayBtn     = station.querySelector('[data-bio-replay]');
  const continueBtn   = station.querySelector('[data-bio-continue]');

  const overlays = {
    upload:   station.querySelector('[data-bio-overlay="upload"]'),
    idle:     station.querySelector('[data-bio-overlay="idle"]'),
    prompt:   station.querySelector('[data-bio-overlay="prompt"]'),
    approved: station.querySelector('[data-bio-overlay="approved"]'),
    holo:     station.querySelector('[data-bio-overlay="holo"]'),
    success:  station.querySelector('[data-bio-overlay="success"]')
  };
  const promptTag = station.querySelector('[data-bio-prompt-tag]');
  const promptMsg = station.querySelector('[data-bio-prompt-msg]');
  const approvedLabel = station.querySelector('[data-bio-approved-label]');
  const approvedSub   = station.querySelector('[data-bio-approved-sub]');
  const faceImg = station.querySelector('[data-bio-face-img]');

  const videos = {
    blink: station.querySelector('[data-bio-video="blink"]'),
    head:  station.querySelector('[data-bio-video="head"]'),
    mouth: station.querySelector('[data-bio-video="mouth"]')
  };
  const finalVideo = station.querySelector('[data-bio-final-video]');

  const chips = {
    blink: station.querySelector('[data-bio-chip="blink"]'),
    head:  station.querySelector('[data-bio-chip="head"]'),
    mouth: station.querySelector('[data-bio-chip="mouth"]')
  };
  const stepPips = {
    blink: station.querySelector('[data-bio-step-pip="blink"]'),
    head:  station.querySelector('[data-bio-step-pip="head"]'),
    mouth: station.querySelector('[data-bio-step-pip="mouth"]')
  };

  const metrics = station.querySelectorAll('[data-bio-metric]');
  const metricTags = station.querySelectorAll('[data-bio-metric-tag]');
  const scene = station.closest('.kyc-scene') || station.parentElement;
  const statusBar = scene ? scene.querySelector('[data-bio-status]') : null;
  const statusMini = station.querySelector('[data-bio-status-mini]');
  const gaugeCircle = station.querySelector('[data-bio-gauge]');

  const STEP_LABELS = {
    blink: { title: 'Blink',         tag: '// STEP 1 · BLINK',          msg: 'Please blink naturally',           sub: 'Eye closure pattern confirmed',     approvedFor: 'Blink verified' },
    head:  { title: 'Head Turn',     tag: '// STEP 2 · HEAD TURN',      msg: 'Slowly turn your head left & right', sub: '3D orientation tracking confirmed', approvedFor: 'Head Turn verified' },
    mouth: { title: 'Mouth Movement',tag: '// STEP 3 · MOUTH MOVEMENT', msg: 'Open and close your mouth naturally', sub: 'Facial motion response confirmed', approvedFor: 'Mouth Movement verified' }
  };

  const VIDEO_FALLBACK_MS = 8000; // hard cap if 'ended' never fires
  const APPROVED_HOLD_MS  = 1100;
  const FINAL_VIDEO_CAP_MS = 6000; // ~5s clip + buffer

  let running = false;
  let timers = [];

  const wait = (ms) => new Promise(r => {
    const t = setTimeout(r, ms);
    timers.push(t);
  });
  const clearTimers = () => { timers.forEach(t => clearTimeout(t)); timers = []; };

  function playSound(name) {
    if (window.CXSound && CXSound.play) CXSound.play(name);
  }

  function setChipState(key, state) {
    const c = chips[key]; if (!c) return;
    c.dataset.bioChipState = state;
    const val = c.querySelector('[data-bio-chip-val]');
    if (!val) return;
    val.textContent =
      state === 'waiting'   ? 'Pending' :
      state === 'detecting' ? 'Scanning…' :
      state === 'done'      ? 'Approved'
      : val.textContent;
  }

  function setPipState(key, state) {
    const p = stepPips[key]; if (!p) return;
    p.dataset.state = state;
  }

  function setStatus(text) {
    if (statusBar) statusBar.textContent = text;
    if (statusMini) statusMini.textContent = text;
  }

  function setPhase(phase) {
    station.classList.remove('bio-phase-init', 'bio-phase-blink', 'bio-phase-head', 'bio-phase-mouth', 'bio-phase-final');
    if (phase) station.classList.add('bio-phase-' + phase);
  }

  function setPrompt(tag, msg) {
    if (promptTag) promptTag.textContent = tag;
    if (promptMsg) promptMsg.textContent = msg;
  }

  function showOverlay(which) {
    Object.values(overlays).forEach(el => { if (el) el.hidden = true; });
    const el = overlays[which];
    if (el) el.hidden = false;
  }

  function allVideoElements() {
    const arr = Object.values(videos).filter(Boolean);
    if (finalVideo) arr.push(finalVideo);
    return arr;
  }

  function showVideo(key) {
    Object.entries(videos).forEach(([k, v]) => {
      if (!v) return;
      if (k === key) {
        v.hidden = false;
        v.classList.add('is-active');
      } else {
        v.hidden = true;
        v.classList.remove('is-active');
        try { v.pause(); v.currentTime = 0; } catch (e) {}
      }
    });
    // hide final video while step videos are showing
    if (finalVideo) {
      finalVideo.hidden = true;
      finalVideo.classList.remove('is-active');
      try { finalVideo.pause(); finalVideo.currentTime = 0; } catch (e) {}
    }
    if (faceImg) faceImg.classList.toggle('is-dimmed', !!key);
  }

  function hideAllVideos() {
    allVideoElements().forEach(v => {
      v.hidden = true;
      v.classList.remove('is-active');
      try { v.pause(); v.currentTime = 0; } catch (e) {}
    });
    if (faceImg) faceImg.classList.remove('is-dimmed');
  }

  function playStepVideo(key) {
    const v = videos[key];
    if (!v) return Promise.resolve();
    showVideo(key);
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        v.removeEventListener('ended', finish);
        resolve();
      };
      v.addEventListener('ended', finish, { once: true });
      try { v.currentTime = 0; } catch (e) {}
      const playPromise = v.play();
      if (playPromise && playPromise.catch) playPromise.catch(() => {});
      const fallback = setTimeout(finish, VIDEO_FALLBACK_MS);
      timers.push(fallback);
    });
  }

  function playFinalVideo() {
    if (!finalVideo) return wait(5000);
    // hide step videos, dim the face image, reveal final video
    Object.values(videos).forEach(v => {
      if (!v) return;
      v.hidden = true;
      v.classList.remove('is-active');
      try { v.pause(); v.currentTime = 0; } catch (e) {}
    });
    if (faceImg) faceImg.classList.add('is-dimmed');
    finalVideo.hidden = false;
    finalVideo.classList.add('is-active');
    return new Promise(resolve => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        finalVideo.removeEventListener('ended', finish);
        resolve();
      };
      finalVideo.addEventListener('ended', finish, { once: true });
      try { finalVideo.currentTime = 0; } catch (e) {}
      const playPromise = finalVideo.play();
      if (playPromise && playPromise.catch) playPromise.catch(() => {});
      const fallback = setTimeout(finish, FINAL_VIDEO_CAP_MS);
      timers.push(fallback);
    });
  }

  function animateCounter(el, target, duration, decimals, suffix) {
    if (!el) return;
    decimals = decimals == null ? (target % 1 !== 0 ? 1 : 0) : decimals;
    suffix = suffix || '';
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = (eased * target).toFixed(decimals);
      const sub = el.querySelector('small');
      el.innerHTML = v + (sub ? `<small>${sub.textContent}</small>` : suffix);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function resetStation() {
    clearTimers();
    running = false;
    station.classList.remove('bio-running', 'bio-done', 'bio-uploaded');
    station.classList.add('bio-ready', 'bio-await-upload');
    setPhase(null);
    Object.keys(chips).forEach(k => { setChipState(k, 'waiting'); setPipState(k, 'pending'); });
    metrics.forEach(m => {
      const small = m.querySelector('small');
      m.innerHTML = '—' + (small ? `<small>${small.textContent}</small>` : '');
    });
    metricTags.forEach(t => t.textContent = 'STAND BY');
    setStatus('STAND BY · UPLOAD PORTRAIT TO BEGIN');
    if (gaugeCircle) gaugeCircle.style.strokeDashoffset = '';
    hideAllVideos();
    showOverlay('upload');
    if (startBtn) startBtn.disabled = false;
  }

  function handleUploadComplete() {
    station.classList.remove('bio-await-upload');
    station.classList.add('bio-uploaded');
    setStatus('PORTRAIT ENROLLED · READY FOR LIVENESS');
    showOverlay('idle');
  }

  async function runScan() {
    if (running) return;
    running = true;
    station.classList.remove('bio-ready');
    station.classList.add('bio-running');
    if (startBtn) startBtn.disabled = true;
    playSound('click');

    // Phase 1 — initialise
    showOverlay('prompt');
    setPhase('init');
    setPrompt('// INITIALIZING', 'Calibrating sensors & anti-spoof signals');
    setStatus('INITIALIZING BIOMETRIC LIVENESS …');
    await wait(900);

    // Phases 2-4 — one video per step
    const order = ['blink', 'head', 'mouth'];
    for (let i = 0; i < order.length; i++) {
      const key = order[i];
      const lbl = STEP_LABELS[key];
      setPhase(key);
      setPipState(key, 'active');
      setPrompt(lbl.tag, lbl.msg);
      setStatus(`STEP ${i + 1} / 3 · ${lbl.title.toUpperCase()}`);
      setChipState(key, 'detecting');

      // show the prompt briefly, then swap to the video
      await wait(550);
      showOverlay('prompt'); // ensure prompt visible while video plays underneath
      await playStepVideo(key);

      // approved stamp
      hideAllVideos();
      setChipState(key, 'done');
      setPipState(key, 'done');
      playSound('softclick');
      if (approvedLabel) approvedLabel.textContent = 'Approved';
      if (approvedSub)   approvedSub.textContent   = lbl.approvedFor;
      showOverlay('approved');
      await wait(APPROVED_HOLD_MS);
    }

    // Phase 5 — final consolidated biometric capture (~5 s)
    // Plays the bundled "full biometric.mp4" big & uncropped, then resolves.
    setPhase('final');
    setStatus('FULL BIOMETRIC CAPTURE · COMPILING SIGNATURE');
    showOverlay(null);
    playSound('enter');
    await playFinalVideo();

    // Phase 6 — final success
    // Add bio-done BEFORE clearing the phase so the hologram stays visible
    // through the class swap (both selectors keep .live-holo opacity:1).
    station.classList.remove('bio-running');
    station.classList.add('bio-done');
    setPhase(null);
    setStatus('LIVENESS VERIFICATION COMPLETE · IDENTITY VERIFIED');

    // animate gauge fill (full circumference ≈ 238.76 for r=38)
    if (gaugeCircle) {
      const card = gaugeCircle.closest('.livemetric');
      const metricEl = card ? card.querySelector('[data-bio-metric]') : null;
      const final = metricEl ? parseFloat(metricEl.dataset.bioFinal) || 99.7 : 99.7;
      gaugeCircle.style.strokeDashoffset = String(238.76 * (1 - final / 100));
    }
    metrics.forEach(m => {
      const target = parseFloat(m.dataset.bioFinal);
      const decimals = m.dataset.bioDecimals != null ? parseInt(m.dataset.bioDecimals, 10) : (target % 1 !== 0 ? 1 : 0);
      const suffix = m.dataset.bioSuffix || '';
      animateCounter(m, target, 1100, decimals, suffix);
    });
    metricTags.forEach(t => {
      const card = t.closest('[data-bio-metric-card]');
      const kind = card && card.dataset.bioMetricCard;
      t.textContent = kind === 'spoof' ? 'VERY LOW' : kind === 'match' ? 'MATCHED' : 'OK';
    });
    playSound('enter');
    await wait(500);
    showOverlay('success');
    running = false;
  }

  /* ----- wire events ----- */
  // Upload is purely cosmetic for the demo — it always loads the bundled
  // biometric.png asset rather than opening a real file picker.
  function fakeUpload() {
    if (!overlays.upload) { handleUploadComplete(); return; }
    if (overlays.upload.classList.contains('is-uploading')) return;
    overlays.upload.classList.add('is-uploading');
    if (uploadTrigger) uploadTrigger.disabled = true;
    setStatus('UPLOADING PORTRAIT · ENROLLING …');
    playSound('softclick');
    const FAKE_UPLOAD_MS = 1500;
    const t = setTimeout(() => {
      if (overlays.upload) overlays.upload.classList.remove('is-uploading');
      if (uploadTrigger) uploadTrigger.disabled = false;
      // biometric.png is the default face image — nothing to swap, just continue
      handleUploadComplete();
    }, FAKE_UPLOAD_MS);
    timers.push(t);
  }
  if (uploadTrigger) {
    uploadTrigger.addEventListener('click', () => {
      playSound('click');
      fakeUpload();
    });
  }
  if (startBtn) startBtn.addEventListener('click', runScan);
  if (replayBtn) replayBtn.addEventListener('click', () => {
    // keep uploaded face — just rerun the scan
    clearTimers();
    running = false;
    station.classList.remove('bio-done');
    station.classList.add('bio-uploaded');
    setPhase(null);
    Object.keys(chips).forEach(k => { setChipState(k, 'waiting'); setPipState(k, 'pending'); });
    metrics.forEach(m => {
      const small = m.querySelector('small');
      m.innerHTML = '—' + (small ? `<small>${small.textContent}</small>` : '');
    });
    metricTags.forEach(t => t.textContent = 'STAND BY');
    if (gaugeCircle) gaugeCircle.style.strokeDashoffset = '';
    hideAllVideos();
    showOverlay('idle');
    if (startBtn) startBtn.disabled = false;
    setTimeout(runScan, 200);
  });
  if (continueBtn) continueBtn.addEventListener('click', () => {
    if (window.CXSound) CXSound.play('click');
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn && !nextBtn.disabled) nextBtn.click();
  });

  // initial state
  resetStation();
})();
