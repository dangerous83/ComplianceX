/* ===== VerifiX Product Slides (18–21) — interactive controller =====
   Wires up:
   • Clickable pills + modules → toggle matching popover
   • Close buttons inside popovers
   • Risk-meter state sync from the sweeping needle
   • Auto-rotate the active matrix row on slide 19
*/
(() => {
  function initSlide(slideEl) {
    const pillbars = slideEl.querySelectorAll('[data-vfx-pillbar]');
    const stacks = slideEl.querySelectorAll('[data-vfx-popover-stack]');
    const triggers = slideEl.querySelectorAll('[data-vfx-target]');

    function closeAll() {
      slideEl.querySelectorAll('.vfx-popover.open').forEach(p => p.classList.remove('open'));
      slideEl.querySelectorAll('.vfx-prod-pill.active').forEach(b => b.classList.remove('active'));
      slideEl.querySelectorAll('.vfx-module.active').forEach(m => m.classList.remove('active'));
    }

    function openTarget(key, srcEl) {
      const pop = slideEl.querySelector('.vfx-popover[data-vfx-popover="' + key + '"]');
      if (!pop) return;
      const wasOpen = pop.classList.contains('open');
      closeAll();
      if (wasOpen) return; // toggle off
      pop.classList.add('open');
      slideEl.querySelectorAll('[data-vfx-target="' + key + '"]').forEach(t => t.classList.add('active'));
      if (window.CXSound) CXSound.play('softclick');
      if (srcEl && window.CXFX && window.CXFX.burstAt) {
        const r = srcEl.getBoundingClientRect();
        CXFX.burstAt(r.left + r.width / 2, r.top + r.height / 2, { count: 10 });
      }
    }

    triggers.forEach(t => {
      t.addEventListener('click', e => {
        e.stopPropagation();
        openTarget(t.dataset.vfxTarget, t);
      });
    });

    slideEl.querySelectorAll('[data-vfx-close]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        closeAll();
      });
    });

    // Stack height: make the popover container at least as tall as its tallest popover
    stacks.forEach(stack => {
      const pops = stack.querySelectorAll('.vfx-popover');
      function syncHeight() {
        let max = 0;
        pops.forEach(p => {
          const wasOpen = p.classList.contains('open');
          p.style.position = 'relative';
          p.style.opacity = '0';
          p.style.pointerEvents = 'none';
          const h = p.offsetHeight;
          p.style.position = '';
          p.style.opacity = '';
          p.style.pointerEvents = '';
          if (wasOpen) p.classList.add('open');
          if (h > max) max = h;
        });
        stack.style.minHeight = max ? (max + 4) + 'px' : '';
      }
      // defer to next frame so layout is settled
      requestAnimationFrame(syncHeight);
      window.addEventListener('resize', syncHeight);
    });

    // Risk meter: sync header state with the sweeping needle
    const meter = slideEl.querySelector('[data-vfx-meter]');
    if (meter) {
      const stateEl = meter.querySelector('[data-vfx-meter-state]');
      const cycle = ['low', 'med', 'hi', 'crit'];
      const labels = {
        low:  'LOW · Continue process',
        med:  'MEDIUM · Monitor or review',
        hi:   'HIGH · Manual review',
        crit: 'CRITICAL · Block / escalate'
      };
      let idx = 0;
      function tick() {
        const s = cycle[idx];
        meter.dataset.state = s;
        if (stateEl) stateEl.textContent = labels[s];
        idx = (idx + 1) % cycle.length;
      }
      tick();
      setInterval(tick, 2000); // matches the 8s needle cycle / 4 stops
    }
  }

  function bootstrap() {
    document.querySelectorAll('.vfx-product-slide').forEach(initSlide);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
