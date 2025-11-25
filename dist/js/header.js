// Header navigation toggle (mobile)
(function(){
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('primaryNav');
  if (!toggle || !nav) return;
  let previouslyFocused = null;

  function openNav(){
    previouslyFocused = document.activeElement;
    toggle.setAttribute('aria-expanded','true');
    nav.setAttribute('aria-hidden','false');
    // focus first link
    const first = nav.querySelector('a');
    if (first) first.focus();
    document.body.style.overflow = 'hidden';
    trapFocus(nav);
  }
  function closeNav(){
    toggle.setAttribute('aria-expanded','false');
    nav.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    releaseFocusTrap();
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
  }

  toggle.addEventListener('click', ()=>{
    const open = toggle.getAttribute('aria-expanded') === 'true';
    if (open) closeNav(); else openNav();
  });

  // close on Escape
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && nav.getAttribute('aria-hidden') === 'false') closeNav(); });

  function trapFocus(container){
    const focusables = Array.from(container.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length-1];
    function keyHandler(e){
      if (e.key === 'Tab'){
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    container.__headerKeyHandler = keyHandler;
    document.addEventListener('keydown', keyHandler);
  }
  function releaseFocusTrap(){
    document.querySelectorAll('[aria-hidden="false"]').forEach(el => { if (el.__headerKeyHandler) { document.removeEventListener('keydown', el.__headerKeyHandler); delete el.__headerKeyHandler; } });
  }
})();
