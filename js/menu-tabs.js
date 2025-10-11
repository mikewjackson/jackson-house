// Simple accessible tabs for the menu page
(function(){
  const tabFood = document.getElementById('tab-food');
  const tabCocktail = document.getElementById('tab-cocktail');
  const foodPanel = document.getElementById('food-panel');
  const cocktailPanel = document.getElementById('cocktail-panel');
  const tabs = [tabFood, tabCocktail];

  if (!tabFood || !tabCocktail || !foodPanel || !cocktailPanel) return;

  function activate(selected){
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

  tabFood.addEventListener('click', ()=> activate(tabFood));
  tabCocktail.addEventListener('click', ()=> activate(tabCocktail));

  // keyboard navigation between tabs
  tabs.forEach((tab, idx) => {
    tab.addEventListener('keydown', (e)=>{
      if (e.key === 'ArrowRight' || e.key === 'Right') {
        e.preventDefault();
        const next = tabs[(idx+1) % tabs.length];
        activate(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
        e.preventDefault();
        const prev = tabs[(idx-1 + tabs.length) % tabs.length];
        activate(prev);
      }
    });
  });

  // Ensure initial state
  activate(tabFood);
})();
