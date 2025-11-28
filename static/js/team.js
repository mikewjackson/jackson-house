(function () {
  const grid = document.querySelector('.team-grid');
  if (!grid) return;

  const modal = document.getElementById('bioModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalClose = document.getElementById('modalClose');
  const modalImage = document.getElementById('modalImage');
  const modalText = document.getElementById('modalText');
  const main = document.querySelector('main');

  let previouslyFocused = null;
  let trapHandler;

  function toggleMedia(imgSrc, imgAlt, name) {
    const wrap = modalImage?.parentElement;
    if (!wrap) return;
    if (imgSrc) {
      modalImage.src = imgSrc;
      modalImage.alt = imgAlt || name;
      wrap.style.display = '';
      wrap.setAttribute('aria-hidden', 'false');
    } else {
      modalImage.src = '';
      modalImage.alt = '';
      wrap.style.display = 'none';
      wrap.setAttribute('aria-hidden', 'true');
    }
  }

  function openModal(name, title, bio, imgSrc, imgAlt) {
    if (modalTitle) modalTitle.textContent = name;
    toggleMedia(imgSrc, imgAlt, name);

    modalText.innerHTML = '';
    modalText.insertAdjacentHTML('beforeend', `<p class="muted">${bio}</p>`);

    main?.setAttribute('aria-hidden', 'true');
    previouslyFocused = document.activeElement;

    modal.setAttribute('aria-hidden', 'false');
    modal.setAttribute('aria-modal', 'true');
    document.body.classList.add('modal-open');

    const modalCard = modal.querySelector('.modal-card');
    if (modalCard) {
      modalCard.scrollTop = 0;
      modalCard.setAttribute('tabindex', '-1');
      modalCard.focus({ preventScroll: true });
    }

    modalClose?.focus();
    trapFocus(modal);
  }

  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    modal.removeAttribute('aria-modal');
    main?.removeAttribute('aria-hidden');
    document.body.classList.remove('modal-open');
    toggleMedia('', '', '');
    previouslyFocused?.focus();
    releaseFocusTrap();
  }

  function trapFocus(container) {
    const focusables = Array.from(
      container.querySelectorAll('a, button, input, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(el => !el.disabled);

    const first = focusables[0] || modalClose;
    const last = focusables[focusables.length - 1] || modalClose;

    trapHandler = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', trapHandler);
  }

  function releaseFocusTrap() {
    document.removeEventListener('keydown', trapHandler);
  }

  function openForCard(card) {
    const img = card.querySelector('.team-media');
    openModal(card.dataset.name, card.dataset.title, card.dataset.bio, img?.src || '', img?.alt || '');
  }

  // Delegated events
  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.team-card');
    if (card) openForCard(card);
  });

  grid.addEventListener('keydown', (e) => {
    const card = e.target.closest('.team-card');
    if (!card) return;
    const isEnter = e.key === 'Enter' || e.code === 'Enter';
    const isSpace = [' ', 'Spacebar', 'Space'].includes(e.key) || e.code === 'Space';
    if (isEnter || isSpace) { e.preventDefault(); openForCard(card); }
  });

  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  modalClose?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
  });

  // Smooth scroll for in-page anchors
  if (location.hash) {
    document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' });
  }
})();
