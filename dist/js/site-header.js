(function () {
    const toggle = document.getElementById('siteNavToggle');
    const mobileNav = document.getElementById('siteMobileNav');
    const mobileClose = document.getElementById('siteMobileClose');
    const overlay = document.getElementById('siteMobileOverlay');

    if (!toggle || !mobileNav || !overlay) return;

    let focusable = [];
    let firstFocusable, lastFocusable;

    const updateFocusables = () => {
        focusable = [...mobileNav.querySelectorAll(
            'a, button, input, textarea, [tabindex]:not([tabindex="-1"])'
        )].filter(el => !el.disabled);
        [firstFocusable] = focusable;
        lastFocusable = focusable.at(-1);
    };

    const setNavState = (open) => {
        mobileNav.setAttribute('aria-hidden', String(!open));
        overlay.setAttribute('aria-hidden', String(!open));
        toggle.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('menu-open', open);

        if (open) {
            updateFocusables();
            firstFocusable?.focus();
            document.addEventListener('keydown', onKeyDown);
        } else {
            toggle.focus();
            document.removeEventListener('keydown', onKeyDown);
        }
    };

    const openNav = () => setNavState(true);
    const closeNav = () => setNavState(false);

    const cycleFocus = (direction) => {
        if (!focusable.length) return;
        const active = document.activeElement;
        let idx = focusable.indexOf(active);
        if (idx === -1) idx = focusable.findIndex(el => el.contains(active));
        const nextIdx = (idx + direction + focusable.length) % focusable.length;
        focusable[nextIdx]?.focus();
    };

    function onKeyDown(e) {
        switch (e.key) {
            case 'Escape':
                return closeNav();
            case 'Tab':
                updateFocusables();
                if (!focusable.length) return;
                if (e.shiftKey && (document.activeElement === firstFocusable || document.activeElement === mobileNav)) {
                    e.preventDefault();
                    lastFocusable.focus();
                } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
                break;
            case 'ArrowDown':
            case 'Down':
                e.preventDefault();
                cycleFocus(1);
                break;
            case 'ArrowUp':
            case 'Up':
                e.preventDefault();
                cycleFocus(-1);
                break;
        }
    }

    // Event wiring
    toggle.addEventListener('click', () => {
        const isOpen = mobileNav.getAttribute('aria-hidden') === 'false';
        isOpen ? closeNav() : openNav();
    });

    mobileClose?.addEventListener('click', closeNav);
    overlay.addEventListener('click', closeNav);

    mobileNav.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (a) closeNav();
    });
})();
