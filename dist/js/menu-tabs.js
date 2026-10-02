// Simple accessible tabs for the menu page
(function () {
  // Dynamically find all tabs instead of hardcoding specific ones
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));

  if (tabs.length === 0) {
    return;
  }

  function fragment(tab) {
    return '#' + tab.getAttribute('aria-controls').replace(/-panel$/, '');
  }

  function activate(selected, { focus = false, updateUrl = false } = {}) {
    tabs.forEach(tab => {
      const controls = document.getElementById(tab.getAttribute('aria-controls'));
      const isSelected = tab === selected;
      tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      tab.tabIndex = isSelected ? 0 : -1;
      if (controls) controls.hidden = !isSelected;
    });
    if (updateUrl && window.location.hash !== fragment(selected)) {
      window.history.pushState(null, '', fragment(selected));
    }
    if (focus) selected.focus();
  }

  function activateFromUrl() {
    const selected = tabs.find(tab => fragment(tab) === window.location.hash) || tabs[0];
    activate(selected);
  }

  activateFromUrl();
  window.addEventListener('hashchange', activateFromUrl);
  window.addEventListener('popstate', activateFromUrl);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activate(tab, { focus: true, updateUrl: true }));
  });

  // keyboard navigation between tabs
  tabs.forEach((tab, idx) => {
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Right') {
        e.preventDefault();
        const next = tabs[(idx + 1) % tabs.length];
        activate(next, { focus: true, updateUrl: true });
      } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
        e.preventDefault();
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
        activate(prev, { focus: true, updateUrl: true });
      }
    });
  });
})();
