// Team page interaction script (moved from team.html)
// - Click or press Enter/Space on a .team-card to open modal with full bio
// - Esc closes the modal
(function () {
  const grid = document.querySelector('.team-grid');
  const clubs = document.querySelector('.clubs');
  // Debug: indicate which containers exist on this page
  try { console.debug('team.js init', { grid: !!grid, clubs: !!clubs }); } catch (e) {}
  if (!grid && !clubs) return;

  const modal = document.getElementById('bioModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');
  if (!modal) { try { console.warn('team.js: modal element not found'); } catch(e) {} }

  let previouslyFocused = null;

  function openModal(name, title, bio, imgSrc, imgAlt) {
  if (modalTitle) modalTitle.textContent = name;
    const modalImage = document.getElementById('modalImage');
    const modalMediaWrap = modalImage ? modalImage.parentElement : null;
    if (imgSrc) {
      modalImage.src = imgSrc;
      modalImage.alt = imgAlt || name;
      if (modalMediaWrap) {
        modalMediaWrap.style.display = '';
        modalMediaWrap.setAttribute('aria-hidden', 'false');
      }
    } else {
      modalImage.src = '';
      modalImage.alt = '';
      if (modalMediaWrap) {
        modalMediaWrap.style.display = 'none';
        modalMediaWrap.setAttribute('aria-hidden', 'true');
      }
    }

  const modalText = document.getElementById('modalText');
    modalText.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = bio;
    modalText.appendChild(p);

    // If a link is provided in the data, append a visible call-to-action
    if (title && title.toLowerCase() === 'membership') {
      // membership-specific link will be injected by openForCard when available
    }

    const main = document.querySelector('main');
    if (main) main.setAttribute('aria-hidden', 'true');

    previouslyFocused = document.activeElement;
    if (modal) {
      modal.setAttribute('aria-hidden', 'false');
      modal.setAttribute('aria-modal', 'true');
      // allow page scroll to be locked via a class so the modal content can scroll internally
      document.body.classList.add('modal-open');
      try { console.debug('team.js: opening modal', name); } catch(e) {}
      // ensure modal-card is scrolled to top and focusable
      const modalCard = modal.querySelector('.modal-card');
      if (modalCard) {
        modalCard.scrollTop = 0;
        modalCard.setAttribute('tabindex', '-1');
        modalCard.focus({ preventScroll: true });
      }
      if (modalClose && typeof modalClose.focus === 'function') modalClose.focus();
      trapFocus(modal);
    } else {
      try { console.warn('team.js: cannot open modal - modal element missing'); } catch(e) {}
    }
  }

  function closeModal() {
  modal.setAttribute('aria-hidden', 'true');
  modal.removeAttribute('aria-modal');
  const main = document.querySelector('main');
  if (main) main.removeAttribute('aria-hidden');
  document.body.classList.remove('modal-open');
    // hide modal media to ensure it's not announced after close
    const modalImage = document.getElementById('modalImage');
    if (modalImage && modalImage.parentElement) {
      modalImage.parentElement.style.display = 'none';
      modalImage.parentElement.setAttribute('aria-hidden', 'true');
    }
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    releaseFocusTrap();
  }

  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  let focusables = [], firstFocusable = null, lastFocusable = null, trapHandler;
  function trapFocus(container) {
    focusables = Array.from(container.querySelectorAll('a, button, input, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.hasAttribute('disabled'));
    firstFocusable = focusables[0] || modalClose;
    lastFocusable = focusables[focusables.length - 1] || modalClose;
    trapHandler = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstFocusable) { e.preventDefault(); lastFocusable.focus(); }
        else if (!e.shiftKey && document.activeElement === lastFocusable) { e.preventDefault(); firstFocusable.focus(); }
      }
    };
    document.addEventListener('keydown', trapHandler);
  }
  function releaseFocusTrap() { document.removeEventListener('keydown', trapHandler); }

  // delegated click and keyboard handlers on grid (only if present)
  if (grid) {
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.team-card');
      if (!card) return;
      openForCard(card);
    });
    grid.addEventListener('keydown', (e) => {
      const card = e.target.closest('.team-card');
      if (!card) return;
      // Accept Enter or Space (handle variations across browsers/assistive tech)
      const isEnter = e.key === 'Enter' || e.code === 'Enter';
      const isSpace = e.key === ' ' || e.key === 'Spacebar' || e.key === 'Space' || e.code === 'Space';
      if (isEnter || isSpace) { e.preventDefault(); openForCard(card); }
    });
  }

  // Also attach direct listeners to each team-card as a robust fallback
  try {
    if (grid) {
      const cards = Array.from(grid.querySelectorAll('.team-card'));
      cards.forEach(c => {
        c.addEventListener('click', (e) => { try { console.debug('team.js: direct team-card click', c.dataset.name); } catch(e){}; openForCard(c); });
        c.addEventListener('keydown', (e) => { const isEnter = e.key === 'Enter' || e.code === 'Enter'; const isSpace = e.key === ' ' || e.key === 'Spacebar' || e.key === 'Space' || e.code === 'Space'; if (isEnter || isSpace) { e.preventDefault(); openForCard(c); } });
      });
    }
  } catch(e) { try{ console.warn('team.js: error attaching direct team-card listeners', e); }catch(e){} }

  function openForCard(card) {
    const img = card.querySelector('.team-media');
    openModal(card.dataset.name, card.dataset.title, card.dataset.bio, img ? img.src : '', img ? img.alt : '');
  }

  // Clubs: delegate similarly so club tiles behave like team cards
  if (clubs) {
    clubs.addEventListener('click', (e) => {
      const card = e.target.closest('.club');
      try { console.debug('team.js: clubs click', !!card); } catch(e) {}
      if (!card) return;
      openForClub(card);
    });
    clubs.addEventListener('keydown', (e) => {
      const card = e.target.closest('.club');
      if (!card) return;
      const isEnter = e.key === 'Enter' || e.code === 'Enter';
      const isSpace = e.key === ' ' || e.key === 'Spacebar' || e.key === 'Space' || e.code === 'Space';
      if (isEnter || isSpace) { e.preventDefault(); openForClub(card); }
    });
  }

  // Also attach direct listeners to each club tile as a fallback
  try {
    if (clubs) {
      const clubCards = Array.from(clubs.querySelectorAll('.club'));
      clubCards.forEach(c => {
        c.addEventListener('click', (e) => { try { console.debug('team.js: direct club click', c.dataset.name); } catch(e){}; openForClub(c); });
        c.addEventListener('keydown', (e) => { const isEnter = e.key === 'Enter' || e.code === 'Enter'; const isSpace = e.key === ' ' || e.key === 'Spacebar' || e.key === 'Space' || e.code === 'Space'; if (isEnter || isSpace) { e.preventDefault(); openForClub(c); } });
      });
    }
  } catch(e) { try{ console.warn('team.js: error attaching direct club listeners', e); }catch(e){} }

  function openForClub(card) {
    // club tiles: use the large 'l' image variant (e.g. fc.png -> fcl.png)
    const img = card.querySelector('img');
    let largeSrc = '';
    if (img) {
      const raw = img.getAttribute('src') || '';
      const lastDot = raw.lastIndexOf('.');
      if (lastDot > 0) largeSrc = raw.slice(0, lastDot) + '_large' + raw.slice(lastDot);
      else largeSrc = raw;
    }
    // For clubs we intentionally do not show the full bio paragraph — only the CTA link.
    openModal(card.dataset.name, card.dataset.title, '', largeSrc, img ? img.alt : '');
    // inject only the 'To learn more' link
    const modalText = document.getElementById('modalText');
    if (modalText) {
      modalText.innerHTML = '';
      if (card.dataset.link) {
        const p2 = document.createElement('p');
        p2.className = 'muted';
        const a = document.createElement('a');
        a.href = card.dataset.link;
        a.textContent = 'To learn more, click here';
        a.setAttribute('aria-label', `Email to learn more about ${card.dataset.name}`);
        p2.appendChild(a);
        modalText.appendChild(p2);
      }
    }
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal(); });

  // Smooth scroll for in-page anchors
  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
})();
