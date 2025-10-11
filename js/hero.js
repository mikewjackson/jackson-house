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
