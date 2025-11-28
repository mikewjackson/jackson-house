// Hero Slideshow Component
class HeroSlideshow {
  constructor(rootId, interval = 5000) {
    this.root = document.getElementById(rootId);
    if (!this.root) return;

    this.slides = [...this.root.querySelectorAll('.slide')];
    this.prevBtn = this.root.querySelector('.slideshow-prev');
    this.nextBtn = this.root.querySelector('.slideshow-next');
    this.indicators = this.root.querySelector('.slideshow-indicators');
    this.current = this.slides.findIndex(s => s.classList.contains('active'));
    if (this.current < 0) this.current = 0;
    this.timer = null;
    this.INTERVAL = interval;
    this.init();
  }

  goTo(index) {
    this.current = (index + this.slides.length) % this.slides.length;
    this.slides.forEach((s, i) => {
      const active = i === this.current;
      s.classList.toggle('active', active);
      s.setAttribute('aria-hidden', !active);
    });
    this.updateIndicators();
  }

  next = () => this.goTo(this.current + 1);
  prev = () => this.goTo(this.current - 1);

  start() {
    this.stop();
    this.timer = setInterval(this.next, this.INTERVAL);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  updateIndicators() {
    if (!this.indicators) return;
    this.indicators.replaceChildren(...this.slides.map((_, i) => {
      const btn = document.createElement('button');
      btn.className = `indicator${i === this.current ? ' active' : ''}`;
      btn.setAttribute('aria-label', `Show image ${i + 1}`);
      btn.dataset.index = i;
      btn.onclick = () => { this.goTo(i); this.start(); };
      return btn;
    }));
  }

  wireEvents() {
    this.nextBtn?.addEventListener('click', () => { this.next(); this.start(); });
    this.prevBtn?.addEventListener('click', () => { this.prev(); this.start(); });

    ['mouseenter','focusin'].forEach(ev => this.root.addEventListener(ev, () => this.stop()));
    ['mouseleave','focusout'].forEach(ev => this.root.addEventListener(ev, () => this.start()));

    this.root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { this.next(); this.start(); }
      else if (e.key === 'ArrowLeft') { this.prev(); this.start(); }
    });
  }

  init() {
    this.slides.forEach((s, i) => {
      s.setAttribute('role', 'group');
      s.setAttribute('aria-roledescription', 'slide');
      s.setAttribute('aria-hidden', i !== this.current);
      if (i !== this.current) s.classList.remove('active');
    });
    this.updateIndicators();
    this.wireEvents();
    this.start();
  }
}

// Reviews Carousel Component
class ReviewsCarousel {
  constructor(selector) {
    this.carousel = document.querySelector(selector);
    if (!this.carousel) return;

    this.track = this.carousel.querySelector('.reviews-track');
    this.cards = [...this.track.querySelectorAll('.review-card')];
    this.leftArrow = this.carousel.querySelector('.carousel-arrow.left');
    this.rightArrow = this.carousel.querySelector('.carousel-arrow.right');

    if (!this.cards.length) return;
    this.init();
  }

  getGapPx(el) {
    const cs = getComputedStyle(el);
    return parseFloat(cs.columnGap || cs.gap) || 0;
  }

  getStep() {
    return this.cards[0]?.offsetWidth + this.getGapPx(this.track) || 0;
  }

  updateArrows = () => {
    const maxScroll = this.track.scrollWidth - this.track.clientWidth;
    const atStart = this.track.scrollLeft <= 1;
    const atEnd = this.track.scrollLeft >= maxScroll - 1;
    const visible = maxScroll > 1;
    this.leftArrow.style.visibility = visible && !atStart ? 'visible' : 'hidden';
    this.rightArrow.style.visibility = visible && !atEnd ? 'visible' : 'hidden';
  }

  scrollByCard(direction) {
    const step = this.getStep();
    if (step) this.track.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  wireEvents() {
    this.leftArrow?.addEventListener('click', () => this.scrollByCard(-1));
    this.rightArrow?.addEventListener('click', () => this.scrollByCard(1));
    this.track.addEventListener('scroll', this.updateArrows);
    window.addEventListener('resize', () => requestAnimationFrame(this.updateArrows));
  }

  init() {
    this.wireEvents();
    this.updateArrows();
  }
}

// Instantiate components
document.addEventListener('DOMContentLoaded', () => {
  new HeroSlideshow('heroSlideshow');
  new ReviewsCarousel('.reviews-carousel');
});
