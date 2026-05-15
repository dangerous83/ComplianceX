/* ===== UAE Pass interactive demo =====
   Drives the phone mockup, step list, and counters on slide 20.
   Auto-plays when the slide becomes active. Includes:
   - Typed-input animation (Name / Emirates ID / Nationality) with keytap sound
   - Auto-press of the "Sign up with UAE Pass" CTA
   - Biometric Blink video on the Authenticate screen
   - Andrew Matthew S. Cruz credentials on the assertion screen
============================================================ */
(() => {
  function initUaePass(slideEl) {
    const stage = slideEl.querySelector('[data-uaepass-stage]');
    if (!stage) return;

    const steps = Array.from(slideEl.querySelectorAll('[data-uaepass-steps] .uaepass-li'));
    const trigger = slideEl.querySelector('[data-uaepass-trigger]');
    const replay = slideEl.querySelector('[data-uaepass-replay]');
    const authStatus = slideEl.querySelector('[data-uaepass-up-status]');
    const counters = Array.from(slideEl.querySelectorAll('[data-uaepass-counter]'));
    const typedFields = Array.from(slideEl.querySelectorAll('[data-typed]'));
    const cta = slideEl.querySelector('[data-uaepass-cta]');
    const video = slideEl.querySelector('[data-uaepass-video]');

    // Andrew Matthew S. Cruz credentials typed onto the signup form
    const FIELD_VALUES = {
      name: 'Andrew Matthew S. Cruz',
      eid:  '784-45892-1983-1',
      nat:  'American'
    };
    const TYPE_SPEED = 65;     // ms per character
    const FIELD_GAP  = 380;    // ms between fields

    let timers = [];
    let busy = false;
    const wait = (ms) => new Promise(r => { const t = setTimeout(r, ms); timers.push(t); });
    const clearTimers = () => { timers.forEach(t => clearTimeout(t)); timers = []; };
    const playSound = (n) => { if (window.CXSound && CXSound.play) CXSound.play(n); };

    function setState(s) { stage.dataset.uaepassState = s; }
    function setStep(n, state) {
      const s = steps.find(x => +x.dataset.step === n);
      if (s) s.dataset.state = state;
    }
    function resetSteps() { steps.forEach(s => delete s.dataset.state); }
    function setAuthStatus(t) { if (authStatus) authStatus.textContent = t; }

    function clearTypedFields() {
      typedFields.forEach(el => {
        el.textContent = '';
        el.classList.remove('is-typing');
        const wrap = el.closest('.uaepass-input');
        if (wrap) wrap.classList.remove('is-active');
      });
    }

    async function typeInto(el, text) {
      const wrap = el.closest('.uaepass-input');
      if (wrap) wrap.classList.add('is-active');
      el.classList.add('is-typing');
      el.textContent = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        el.textContent += ch;
        if (ch !== ' ') playSound('keytap');
        await wait(TYPE_SPEED);
      }
      el.classList.remove('is-typing');
      if (wrap) wrap.classList.remove('is-active');
    }

    function formatCount(v, target) {
      if (target >= 1000000) {
        return (v / 1000000).toFixed(v < target ? 1 : 0).replace(/\.0$/, '') + 'M';
      }
      return Math.round(v).toString();
    }

    function animateCounter(el, target, dur, prefix, suffix) {
      const start = performance.now();
      function step(now) {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        const v = target * eased;
        el.textContent = (prefix || '') + formatCount(v, target) + (suffix || '');
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function runCounters() {
      counters.forEach(el => {
        const target = +el.dataset.uaepassCounter;
        const prefix = el.dataset.uaepassPrefix || '';
        const suffix = el.dataset.uaepassSuffix || '';
        animateCounter(el, target, 1600, prefix, suffix);
      });
    }

    function resetCounters() {
      counters.forEach(el => {
        const prefix = el.dataset.uaepassPrefix || '';
        const suffix = el.dataset.uaepassSuffix || '';
        el.textContent = prefix + '0' + suffix;
      });
    }

    function pulseCta() {
      if (!cta) return;
      cta.classList.remove('is-firing');
      void cta.offsetWidth;
      cta.classList.add('is-firing');
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
      resetCounters();
      clearTypedFields();
      stopVideo();
      setState('signup');
      setAuthStatus('Look at the camera');
      playSound('softclick');
      await wait(700);

      // STEP 1 — Tap Sign Up: animate typing the credentials, then fire CTA
      setStep(1, 'active');
      // Sub-phase A: type fields
      for (const f of typedFields) {
        const key = f.dataset.typed;
        if (!FIELD_VALUES[key]) continue;
        await typeInto(f, FIELD_VALUES[key]);
        await wait(FIELD_GAP);
      }
      await wait(500);
      // Sub-phase B: highlight + click CTA
      pulseCta();
      playSound('click');
      await wait(700);
      setStep(1, 'done');

      // STEP 2 — Authenticate with UAE Pass (Blink video)
      setState('auth');
      setStep(2, 'active');
      playSound('softclick');
      playVideo();
      setAuthStatus('Look at the camera');
      await wait(2000);
      setAuthStatus('Scanning facial features…');
      await wait(1500);
      setAuthStatus('Match found ✓');
      await wait(900);
      stopVideo();
      setStep(2, 'done');

      // STEP 3 — Verified identity assertion returns
      setState('assertion');
      setStep(3, 'active');
      playSound('enter');
      runCounters();
      await wait(3000);
      setStep(3, 'done');

      // STEP 4 — Profile auto-created
      setStep(4, 'active');
      await wait(1400);
      setStep(4, 'done');

      // STEP 5 — Cross-check + AML
      setStep(5, 'active');
      await wait(1800);
      setStep(5, 'done');

      // STEP 6 — Account live
      setState('done');
      setStep(6, 'active');
      playSound('enter');
      await wait(900);
      setStep(6, 'done');

      busy = false;
    }

    function resetIdle() {
      clearTimers();
      busy = false;
      resetSteps();
      resetCounters();
      clearTypedFields();
      stopVideo();
      setState('idle');
      setAuthStatus('Look at the camera');
    }

    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        if (busy) return;
        runDemo();
      });
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

    slideEl.__cxUaePass = { runDemo, resetIdle };
  }

  window.CXUaePass = {
    init() {
      document.querySelectorAll('[data-uaepass-slide]').forEach(initUaePass);
    }
  };
})();
