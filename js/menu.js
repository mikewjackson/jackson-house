// Menu behavior: open/close, overlay, focus trap
(function(){
  const hamburger = document.getElementById('hamburger');
  const siteMenu = document.getElementById('siteMenu');
  const menuOverlay = document.getElementById('menuOverlay');
  const menuClose = document.getElementById('menuClose');
  if (!hamburger || !siteMenu) return;

  let previouslyFocused = null;

  function openMenu(){
    previouslyFocused = document.activeElement;
    hamburger.setAttribute('aria-expanded','true');
    siteMenu.setAttribute('aria-hidden','false');
    menuOverlay.setAttribute('aria-hidden','false');
    menuOverlay.style.display = '';
    document.body.style.overflow = 'hidden';
    // focus first focusable in menu
    const first = siteMenu.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
    if (first) first.focus();
    trapFocus(siteMenu);
  }

  function closeMenu(){
    hamburger.setAttribute('aria-expanded','false');
    siteMenu.setAttribute('aria-hidden','true');
    menuOverlay.setAttribute('aria-hidden','true');
    menuOverlay.style.display = 'none';
    document.body.style.overflow = '';
    releaseFocusTrap();
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
  }

  function onOverlayClick(e){ if (e.target === menuOverlay) closeMenu(); }

  function trapFocus(container){
    const focusables = Array.from(container.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length-1];
    function keyHandler(e){
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
      if (e.key === 'Tab'){
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      // Up/Down arrow navigation between focusable items
      if (e.key === 'ArrowDown' || e.key === 'Down') {
        e.preventDefault();
        // find the focusable that either is document.activeElement or contains it
        let idx = focusables.findIndex(el => el === document.activeElement || el.contains(document.activeElement));
        if (idx === -1) idx = focusables.indexOf(document.activeElement);
        const next = focusables[(idx + 1) >= focusables.length ? 0 : idx + 1];
        if (next) next.focus();
      }
      if (e.key === 'ArrowUp' || e.key === 'Up') {
        e.preventDefault();
        let idx = focusables.findIndex(el => el === document.activeElement || el.contains(document.activeElement));
        if (idx === -1) idx = focusables.indexOf(document.activeElement);
        const prev = focusables[(idx - 1) < 0 ? focusables.length - 1 : idx - 1];
        if (prev) prev.focus();
      }
    }
    container.__menuKeyHandler = keyHandler;
    document.addEventListener('keydown', keyHandler);
  }

  function releaseFocusTrap(){
    const handler = document && document.__menuKeyHandler;
    if (handler) document.removeEventListener('keydown', handler);
    // remove from container if stored
    // find any container that stored handler
    document.querySelectorAll('[aria-hidden="false"]').forEach(el => { if (el.__menuKeyHandler) { document.removeEventListener('keydown', el.__menuKeyHandler); delete el.__menuKeyHandler; } });
  }

  hamburger.addEventListener('click', (e)=>{ openMenu(); });
  if (menuClose) menuClose.addEventListener('click', closeMenu);
  if (menuOverlay) menuOverlay.addEventListener('click', onOverlayClick);
  // close on Escape globally as well
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && siteMenu.getAttribute('aria-hidden') === 'false') closeMenu(); });

})();
