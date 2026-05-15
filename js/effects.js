/* ===== ComplianceX Interactive Effects Engine =====
   3D Tilt · Cinematic Modal · Click Particle Burst ·
   Mouse Spotlight · Number Count-Up · Magnetic Buttons
*/

(() => {

  // ====== 3D TILT (cards follow mouse with parallax depth) ======
  function attachTilt(el, opts = {}) {
    const max = opts.max || 12;          // max rotation degrees
    const scale = opts.scale || 1.04;
    const speed = opts.speed || 400;
    let bounds = null;
    let frame = null;

    function update(e) {
      if (!bounds) bounds = el.getBoundingClientRect();
      const x = (e.clientX - bounds.left) / bounds.width;   // 0..1
      const y = (e.clientY - bounds.top) / bounds.height;   // 0..1
      const rx = (0.5 - y) * max;
      const ry = (x - 0.5) * max;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale}) translateZ(0)`;
        // glare position
        const glare = el.querySelector('.tilt-glare');
        if (glare) {
          glare.style.opacity = '1';
          glare.style.background = `radial-gradient(circle at ${x*100}% ${y*100}%, rgba(0,212,255,0.35) 0%, transparent 50%)`;
        }
      });
    }

    function reset() {
      bounds = null;
      cancelAnimationFrame(frame);
      el.style.transition = `transform ${speed}ms cubic-bezier(.2,.8,.2,1)`;
      el.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) scale(1) translateZ(0)';
      const glare = el.querySelector('.tilt-glare');
      if (glare) glare.style.opacity = '0';
      setTimeout(() => { el.style.transition = ''; }, speed);
    }

    el.addEventListener('mouseenter', () => { bounds = el.getBoundingClientRect(); el.style.transition = ''; });
    el.addEventListener('mousemove', update);
    el.addEventListener('mouseleave', reset);
  }

  // ====== MAGNETIC BUTTON (CTA pulls toward cursor) ======
  function attachMagnetic(el, strength = 0.4) {
    let bounds, frame;
    function update(e) {
      if (!bounds) bounds = el.getBoundingClientRect();
      const x = e.clientX - (bounds.left + bounds.width / 2);
      const y = e.clientY - (bounds.top + bounds.height / 2);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
    }
    function reset() {
      bounds = null;
      cancelAnimationFrame(frame);
      el.style.transition = 'transform 0.5s cubic-bezier(.2,.8,.2,1)';
      el.style.transform = 'translate(0,0)';
      setTimeout(() => { el.style.transition = ''; }, 500);
    }
    el.addEventListener('mouseenter', () => { bounds = el.getBoundingClientRect(); });
    el.addEventListener('mousemove', update);
    el.addEventListener('mouseleave', reset);
  }

  // ====== CINEMATIC MODAL (opens from click position) ======
  let modalEl = null;
  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'cx-modal';
    modalEl.innerHTML = `
      <div class="cx-modal-backdrop"></div>
      <div class="cx-modal-shell">
        <div class="cx-modal-glare"></div>
        <div class="cx-modal-corner tl"></div>
        <div class="cx-modal-corner tr"></div>
        <div class="cx-modal-corner bl"></div>
        <div class="cx-modal-corner br"></div>
        <button class="cx-modal-close" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="cx-modal-body">
          <div class="cx-modal-tag"></div>
          <div class="cx-modal-icon"></div>
          <h3 class="cx-modal-title"></h3>
          <div class="cx-modal-subtitle"></div>
          <div class="cx-modal-content"></div>
          <div class="cx-modal-footer"></div>
        </div>
        <div class="cx-modal-scan"></div>
      </div>
    `;
    document.body.appendChild(modalEl);
    modalEl.querySelector('.cx-modal-close').addEventListener('click', closeModal);
    modalEl.querySelector('.cx-modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modalEl.classList.contains('open')) closeModal();
    });
    return modalEl;
  }

  function openModal(originEl, data) {
    ensureModal();
    const body = modalEl.querySelector('.cx-modal-body');
    modalEl.querySelector('.cx-modal-tag').textContent = data.tag || '// MODULE';
    modalEl.querySelector('.cx-modal-icon').innerHTML = data.icon || '';
    modalEl.querySelector('.cx-modal-title').innerHTML = data.title || '';
    modalEl.querySelector('.cx-modal-subtitle').textContent = data.subtitle || '';
    modalEl.querySelector('.cx-modal-content').innerHTML = data.content || '';
    modalEl.querySelector('.cx-modal-footer').innerHTML = data.footer || '';

    // origin point for warp animation
    const r = originEl.getBoundingClientRect();
    const ox = r.left + r.width / 2;
    const oy = r.top + r.height / 2;
    const shell = modalEl.querySelector('.cx-modal-shell');
    shell.style.transformOrigin = `${ox}px ${oy}px`;

    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (window.CXSound) CXSound.play('enter');
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    document.body.style.overflow = '';
    if (window.CXSound) CXSound.play('close');
  }

  // ====== CLICK PARTICLE BURST ======
  function burstAt(x, y, opts = {}) {
    const count = opts.count || 18;
    const color = opts.color || '#00d4ff';
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'cx-burst-particle';
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const dist = 60 + Math.random() * 80;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const size = 3 + Math.random() * 3;
      p.style.cssText = `
        position:fixed; left:${x}px; top:${y}px;
        width:${size}px; height:${size}px;
        background:${color};
        border-radius:50%;
        pointer-events:none;
        z-index:9999;
        box-shadow:0 0 8px ${color};
        --dx:${dx}px; --dy:${dy}px;
        animation: cx-burst-fly 0.7s cubic-bezier(.2,.8,.2,1) forwards;
      `;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 750);
    }
    // ripple ring
    const ring = document.createElement('span');
    ring.style.cssText = `
      position:fixed; left:${x}px; top:${y}px;
      width:20px; height:20px;
      border:1.5px solid ${color};
      border-radius:50%;
      transform:translate(-50%,-50%);
      pointer-events:none;
      z-index:9998;
      animation: cx-burst-ring 0.6s cubic-bezier(.2,.8,.2,1) forwards;
    `;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 650);
  }

  // ====== MOUSE SPOTLIGHT ======
  function attachSpotlight() {
    const spot = document.createElement('div');
    spot.className = 'cx-spotlight';
    document.body.appendChild(spot);
    let tx = -1000, ty = -1000;
    let cx = -1000, cy = -1000;
    document.addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
    });
    function loop() {
      cx += (tx - cx) * 0.15;
      cy += (ty - cy) * 0.15;
      spot.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(loop);
    }
    loop();
  }

  // ====== ANIMATED COUNT-UP ======
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const dur = parseInt(el.dataset.dur || '1400', 10);
    let start = null;
    function step(ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const raw = (target * eased).toFixed(decimals);
      const v = decimals === 0 ? Number(raw).toLocaleString('en-US') : raw;
      el.textContent = v + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function observeCounters() {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target;
          if (!el._counted) { el._counted = true; countUp(el); }
        }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
  }

  // also re-run counters when a slide becomes active
  function rerunCountersInSlide(slide) {
    slide.querySelectorAll('[data-count]').forEach(el => {
      el._counted = false;
      countUp(el);
      el._counted = true;
    });
  }

  // ====== Public API ======
  window.CXFX = {
    init() {
      // tilt
      document.querySelectorAll('.tilt-card').forEach(el => {
        // wrap inner content if missing
        if (!el.querySelector('.tilt-inner')) {
          const inner = document.createElement('div');
          inner.className = 'tilt-inner';
          while (el.firstChild) inner.appendChild(el.firstChild);
          el.appendChild(inner);
        }
        if (!el.querySelector('.tilt-glare')) {
          const g = document.createElement('div');
          g.className = 'tilt-glare';
          el.appendChild(g);
        }
        attachTilt(el);
      });

      // magnetic buttons
      document.querySelectorAll('.magnetic').forEach(el => attachMagnetic(el));

      // modal launchers — read data attributes from the card
      document.querySelectorAll('[data-launch]').forEach(el => {
        el.addEventListener('click', e => {
          // don't fire if user clicked an inner button/link
          if (e.target.closest('button:not([data-launch]), a:not([data-launch])')) return;
          const data = {
            tag: el.dataset.launchTag,
            title: el.dataset.launchTitle,
            subtitle: el.dataset.launchSubtitle,
            icon: el.dataset.launchIcon,
            content: el.dataset.launchContent,
            footer: el.dataset.launchFooter
          };
          openModal(el, data);
          if (window.CXSound) CXSound.play('open');
        });
      });

      // particle burst on every click of .burst (and modal launchers)
      document.addEventListener('click', e => {
        const t = e.target.closest('.burst, [data-launch], .cta-mega, .nav-btn');
        if (t) burstAt(e.clientX, e.clientY);
      });

      // spotlight
      attachSpotlight();

      // counters
      observeCounters();

      // expose
      window.CXFX.rerunCountersInSlide = rerunCountersInSlide;
      window.CXFX.openModal = openModal;
      window.CXFX.closeModal = closeModal;
      window.CXFX.burstAt = burstAt;
    }
  };
})();
