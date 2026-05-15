/* ===== Persona zoom — click-to-enlarge for slide 16 cards =====
   Lets the speaker tap any persona card to lift it into a centered
   overlay so the audience can clearly read it. Click the backdrop,
   the X button, the card itself, or press Esc to close.

   To make position:fixed work even when ancestor .slide elements
   have transforms applied (which would otherwise re-parent fixed
   coords), we portal the zoomed card to <body> and restore it on
   close.
============================================================ */
(() => {
  const playSound = (n) => { if (window.CXSound && CXSound.play) CXSound.play(n); };

  let openCard = null;
  let originParent = null;
  let originNext = null;
  let backdrop = null;

  function close() {
    if (!openCard) return;
    const card = openCard;
    card.classList.remove('is-zoomed');
    card.setAttribute('aria-expanded', 'false');
    if (originParent) {
      originParent.insertBefore(card, originNext);
    }
    openCard = null;
    originParent = null;
    originNext = null;
    if (backdrop) backdrop.classList.remove('is-visible');
    document.body.classList.remove('persona-zoom-open');
    playSound('softclick');
  }

  function open(card) {
    if (openCard === card) { close(); return; }
    if (openCard) close();
    originParent = card.parentNode;
    originNext = card.nextSibling;
    document.body.appendChild(card);
    openCard = card;
    card.classList.add('is-zoomed');
    card.setAttribute('aria-expanded', 'true');
    if (backdrop) backdrop.classList.add('is-visible');
    document.body.classList.add('persona-zoom-open');
    playSound('softclick');
  }

  function onCardClick(e) {
    const card = e.currentTarget;
    if (e.target.closest('[data-persona-close]')) {
      e.stopPropagation();
      close();
      return;
    }
    open(card);
  }

  function onCardKey(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open(e.currentTarget);
    }
  }

  function init() {
    const cards = document.querySelectorAll('[data-persona-zoom]');
    if (!cards.length) return;
    backdrop = document.querySelector('[data-persona-backdrop]');
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.addEventListener('click', close);
    }
    cards.forEach((card) => {
      card.setAttribute('aria-expanded', 'false');
      card.addEventListener('click', onCardClick);
      card.addEventListener('keydown', onCardKey);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && openCard) close();
    });
    // close if the deck navigates to another slide
    document.addEventListener('cx:slide-enter', close, true);
  }

  window.CXPersonaZoom = { init, close };
})();
