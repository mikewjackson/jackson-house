// Simple accessible tabs for the menu page
(function () {
  const tabs = [
    document.getElementById('tab-food'),
    document.getElementById('tab-cocktail'),
    document.getElementById('tab-mocktail'),
    document.getElementById('tab-beer'),
    document.getElementById('tab-wine'),
    document.getElementById('tab-happy-hour'),
  ];

  if (!tabs.every(element => element !== null)) {
    return;
  }

  function activate(selected) {
    tabs.forEach(tab => {
      const controls = document.getElementById(tab.getAttribute('aria-controls'));
      const isSelected = tab === selected;
      tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      tab.tabIndex = isSelected ? 0 : -1;
      if (controls) controls.hidden = !isSelected;
    });
    // move focus to the selected tab for keyboard users
    selected.focus();
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => activate(tab));
  });

  // keyboard navigation between tabs
  tabs.forEach((tab, idx) => {
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Right') {
        e.preventDefault();
        const next = tabs[(idx + 1) % tabs.length];
        activate(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
        e.preventDefault();
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
        activate(prev);
      }
    });
  });
})();
