// Accessible, minimal slideshow for the hero section
(function(){
    const root = document.getElementById('heroSlideshow');
    if(!root) return;

    const slides = Array.from(root.querySelectorAll('.slide'));
    const prevBtn = root.querySelector('.slideshow-prev');
    const nextBtn = root.querySelector('.slideshow-next');
    const indicators = root.querySelector('.slideshow-indicators');
    let current = slides.findIndex(s => s.classList.contains('active')) || 0;
    let timer = null;
    const INTERVAL = 5000; // 5s

    function goTo(index){
        if(index < 0) index = slides.length -1;
        if(index >= slides.length) index = 0;
        slides.forEach((s,i)=>{
            s.classList.toggle('active', i === index);
            s.setAttribute('aria-hidden', i===index? 'false' : 'true');
        });
        updateIndicators(index);
        current = index;
    }

    function next(){ goTo(current+1); }
    function prev(){ goTo(current-1); }

    function start(){ stop(); timer = setInterval(next, INTERVAL); }
    function stop(){ if(timer) { clearInterval(timer); timer = null; } }

    function updateIndicators(activeIndex){
        if(!indicators) return;
        indicators.innerHTML = '';
        slides.forEach((s, i)=>{
            const btn = document.createElement('button');
            btn.className = 'indicator';
            btn.setAttribute('aria-label', `Show image ${i+1}`);
            btn.setAttribute('data-index', String(i));
            if(i===activeIndex) btn.classList.add('active');
            btn.addEventListener('click', ()=>{ goTo(i); start(); });
            indicators.appendChild(btn);
        });
    }

    // wire buttons
    if(nextBtn) nextBtn.addEventListener('click', ()=>{ next(); start(); });
    if(prevBtn) prevBtn.addEventListener('click', ()=>{ prev(); start(); });

    // pause on hover/focus
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', start);

    // keyboard support
    root.addEventListener('keydown', (e)=>{
        if(e.key === 'ArrowRight') { next(); start(); }
        if(e.key === 'ArrowLeft') { prev(); start(); }
    });

    // init
    slides.forEach((s,i)=>{
        s.setAttribute('role','group');
        s.setAttribute('aria-roledescription','slide');
        s.setAttribute('aria-hidden', i===current? 'false':'true');
        if(i!==current) s.classList.remove('active');
    });
    updateIndicators(current);
    start();
})();

(function(){
  const carousel = document.querySelector('.reviews-carousel');
  const track = carousel.querySelector('.reviews-track');
  const cards = Array.from(track.querySelectorAll('.review-card'));
  const leftArrow = carousel.querySelector('.carousel-arrow.left');
  const rightArrow = carousel.querySelector('.carousel-arrow.right');

  if (!cards.length) return;

  // Compute gap robustly
  function getGapPx(el) {
    const cs = getComputedStyle(el);
    const gap = parseFloat(cs.columnGap || cs.gap || '0');
    return isNaN(gap) ? 0 : gap;
  }

  function getStep() {
    const firstCard = track.querySelector('.review-card');
    if (!firstCard) return 0;
    return firstCard.offsetWidth + getGapPx(track);
  }

  // Arrow visibility: hide when no overflow, or at edges
  function updateArrows() {
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const hasOverflow = maxScroll > 1;
    const atStart = track.scrollLeft <= 1;
    const atEnd = track.scrollLeft >= maxScroll - 1;

    leftArrow.style.visibility = hasOverflow && !atStart ? 'visible' : 'hidden';
    rightArrow.style.visibility = hasOverflow && !atEnd ? 'visible' : 'hidden';
  }

  function scrollByCard(direction) {
    const step = getStep();
    if (step <= 0) return;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  leftArrow.addEventListener('click', () => scrollByCard(-1));
  rightArrow.addEventListener('click', () => scrollByCard(1));
  track.addEventListener('scroll', updateArrows);
  window.addEventListener('resize', () => requestAnimationFrame(updateArrows));

  // Initialize
  updateArrows();
})();  