// Minimal site header/mobile nav behavior
(function(){
    const toggle = document.getElementById('siteNavToggle');
    const mobileNav = document.getElementById('siteMobileNav');
    const mobileClose = document.getElementById('siteMobileClose');
    const overlay = document.getElementById('siteMobileOverlay');

    if(!toggle || !mobileNav || !overlay) return;

    let focusable = [];
    let firstFocusable = null;
    let lastFocusable = null;

    function updateFocusables(){
        focusable = Array.from(mobileNav.querySelectorAll('a, button, input, textarea, [tabindex]:not([tabindex="-1"])'))
            .filter(el => !el.hasAttribute('disabled'));
        firstFocusable = focusable[0];
        lastFocusable = focusable[focusable.length - 1];
    }

    function openNav(){
        mobileNav.setAttribute('aria-hidden', 'false');
        overlay.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.classList.add('menu-open');
        // focus management
        updateFocusables();
        if(firstFocusable) firstFocusable.focus();
        document.addEventListener('keydown', onKeyDown);
    }

    function closeNav(){
        mobileNav.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
        toggle.focus();
        document.removeEventListener('keydown', onKeyDown);
    }

    function onKeyDown(e){
        if(e.key === 'Escape') return closeNav();
        if(e.key === 'Tab'){
            // ensure focus wraps inside the mobileNav
            updateFocusables();
            if(!focusable.length) return;
            const active = document.activeElement;
            if(e.shiftKey){
                if(active === firstFocusable || mobileNav === active){
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if(active === lastFocusable){
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }

        // Arrow key navigation between focusable items
        if(e.key === 'ArrowDown' || e.key === 'Down'){
            updateFocusables();
            if(!focusable.length) return;
            e.preventDefault();
            const active = document.activeElement;
            let idx = focusable.indexOf(active);
            if(idx === -1){
                // try to find a container that contains active
                idx = focusable.findIndex(el => el.contains(active));
            }
            const next = focusable[(idx + 1) >= focusable.length ? 0 : idx + 1];
            if(next) next.focus();
        }

        if(e.key === 'ArrowUp' || e.key === 'Up'){
            updateFocusables();
            if(!focusable.length) return;
            e.preventDefault();
            const active = document.activeElement;
            let idx = focusable.indexOf(active);
            if(idx === -1){
                idx = focusable.findIndex(el => el.contains(active));
            }
            const prev = focusable[(idx - 1) < 0 ? focusable.length - 1 : idx - 1];
            if(prev) prev.focus();
        }
    }

    toggle.addEventListener('click', function(){
        const open = mobileNav.getAttribute('aria-hidden') === 'false';
        if(open) closeNav(); else openNav();
    });

    if(mobileClose) mobileClose.addEventListener('click', closeNav);

    overlay.addEventListener('click', function(e){
        // click outside closes
        closeNav();
    });

    // ensure links inside mobile nav close the menu when activated
    mobileNav.addEventListener('click', function(e){
        const a = e.target.closest('a');
        if(a && a.getAttribute('href') && a.getAttribute('href').startsWith('#')){
            // allow hash navigation but close menu
            closeNav();
        }
    });
})();
