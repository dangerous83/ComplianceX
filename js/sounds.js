/* ===== ComplianceX Sci-Fi Sound Engine =====
   Pure Web Audio — no asset files needed.
   Plays synthesized sci-fi cues on demand: click, hover, transition, enter, boot, etc.
*/

window.CXSound = (() => {
  let ctx = null;
  let masterGain = null;
  let enabled = true;

  // lazy-init: only create AudioContext on first user gesture
  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.4;
      masterGain.connect(ctx.destination);
    } catch (e) {
      console.warn('Web Audio not supported');
    }
    return ctx;
  }

  function tone({ freq = 440, type = 'sine', dur = 0.15, attack = 0.005, decay = 0.1, vol = 0.3, slide = 0, delay = 0 }) {
    if (!enabled) return;
    ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.1, vol = 0.15, filterFreq = 1500, delay = 0 }) {
    if (!enabled) return;
    ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const bufferSize = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(masterGain);
    src.start(t0);
    src.stop(t0 + dur);
  }

  // === public sound effects ===
  const sounds = {
    hover() {
      tone({ freq: 880, type: 'sine', dur: 0.06, vol: 0.05, slide: 200 });
    },
    click() {
      tone({ freq: 1200, type: 'square', dur: 0.04, vol: 0.08 });
      tone({ freq: 1800, type: 'sine', dur: 0.06, vol: 0.05, delay: 0.02 });
    },
    softclick() {
      tone({ freq: 1400, type: 'sine', dur: 0.05, vol: 0.06, slide: -400 });
    },
    enter() {
      // ascending zap
      tone({ freq: 200, type: 'sawtooth', dur: 0.25, vol: 0.18, slide: 1200, attack: 0.01 });
      tone({ freq: 600, type: 'sine', dur: 0.4, vol: 0.12, slide: 800, delay: 0.05 });
      noise({ dur: 0.2, vol: 0.08, filterFreq: 2500, delay: 0.1 });
    },
    transition() {
      tone({ freq: 800, type: 'sine', dur: 0.15, vol: 0.1, slide: -400 });
      tone({ freq: 1200, type: 'sine', dur: 0.2, vol: 0.08, slide: -600, delay: 0.03 });
      noise({ dur: 0.12, vol: 0.06, filterFreq: 3000 });
    },
    open() {
      // expand/reveal sound
      tone({ freq: 400, type: 'sine', dur: 0.12, vol: 0.1, slide: 800 });
      tone({ freq: 1200, type: 'triangle', dur: 0.1, vol: 0.06, delay: 0.05 });
    },
    close() {
      tone({ freq: 1200, type: 'sine', dur: 0.1, vol: 0.08, slide: -800 });
    },
    boot() {
      // long ascending pad
      tone({ freq: 100, type: 'sawtooth', dur: 1.5, vol: 0.06, slide: 800, attack: 0.3 });
      tone({ freq: 200, type: 'sine', dur: 1.2, vol: 0.08, slide: 600, attack: 0.2, delay: 0.2 });
    },
    bootBeep() {
      tone({ freq: 1800, type: 'square', dur: 0.03, vol: 0.06 });
    },
    bootComplete() {
      tone({ freq: 600, type: 'sine', dur: 0.15, vol: 0.15, slide: 800 });
      tone({ freq: 1200, type: 'sine', dur: 0.2, vol: 0.1, slide: 400, delay: 0.08 });
      tone({ freq: 1800, type: 'triangle', dur: 0.25, vol: 0.08, delay: 0.16 });
    },
    error() {
      tone({ freq: 200, type: 'sawtooth', dur: 0.2, vol: 0.12, slide: -50 });
    },
    success() {
      tone({ freq: 800, type: 'sine', dur: 0.1, vol: 0.1 });
      tone({ freq: 1200, type: 'sine', dur: 0.15, vol: 0.1, delay: 0.08 });
    },
    keytap() {
      // mechanical keypress: short percussive thock
      const f = 1500 + Math.random() * 600;
      tone({ freq: f, type: 'triangle', dur: 0.03, vol: 0.05 });
      noise({ dur: 0.025, vol: 0.04, filterFreq: 3500 });
    },
    upload() {
      // upload whoosh — rising synth pad over 1.2s with sparkle
      tone({ freq: 220, type: 'sawtooth', dur: 1.0, vol: 0.12, slide: 600, attack: 0.05 });
      tone({ freq: 440, type: 'sine',    dur: 1.1, vol: 0.08, slide: 800, attack: 0.08, delay: 0.05 });
      noise({ dur: 0.9,  vol: 0.06, filterFreq: 2500, delay: 0.05 });
      tone({ freq: 1600, type: 'triangle', dur: 0.08, vol: 0.07, delay: 0.6 });
      tone({ freq: 2000, type: 'triangle', dur: 0.08, vol: 0.06, delay: 0.85 });
    },
    cyberScan() {
      // cybersecurity scan — looping low pulse + tactical beeps
      tone({ freq: 80,   type: 'sawtooth', dur: 0.4, vol: 0.08, slide: 40 });
      tone({ freq: 1800, type: 'square',   dur: 0.05, vol: 0.06, delay: 0.0 });
      tone({ freq: 1800, type: 'square',   dur: 0.05, vol: 0.06, delay: 0.2 });
      tone({ freq: 2200, type: 'square',   dur: 0.05, vol: 0.05, delay: 0.4 });
      noise({ dur: 0.3,  vol: 0.04, filterFreq: 4500 });
    }
  };

  return {
    play(name) {
      if (typeof sounds[name] === 'function') sounds[name]();
    },
    setMuted(m) {
      enabled = !m;
      try { localStorage.setItem('cx_muted', m ? '1' : '0'); } catch (e) {}
    },
    isMuted() { return !enabled; },
    init() {
      try {
        enabled = localStorage.getItem('cx_muted') !== '1';
      } catch (e) {}
      // attach hover/click handlers via delegation
      document.addEventListener('mouseover', e => {
        const t = e.target.closest('[data-sound-hover], .nav-btn, .toc-item, .cta-mega, .card, .regulator-badge, .workflow-node');
        if (t && !t._hovered) {
          t._hovered = true;
          this.play('hover');
          setTimeout(() => { t._hovered = false; }, 120);
        }
      }, true);
      document.addEventListener('click', e => {
        const t = e.target.closest('[data-sound]');
        if (t) {
          this.play(t.dataset.sound);
        }
      }, true);
    }
  };
})();
