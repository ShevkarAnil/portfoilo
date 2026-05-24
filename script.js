/* ============================
   JAVASCRIPT - script.js
   Anil Shevkar Portfolio (B&W Modern)
   ============================ */

'use strict';

// ============================================================
//  1. PARTICLE SYSTEM (Black & White)
// ============================================================
const canvas = document.getElementById('particle-canvas');
const ctx    = canvas.getContext('2d');

let particles = [];
let mouse     = { x: null, y: null };

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); });

class Particle {
  constructor() { this.reset(); }

  reset() {
    this.x      = Math.random() * canvas.width;
    this.y      = Math.random() * canvas.height;
    this.size   = Math.random() * 1.5 + 0.2;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.speedY = (Math.random() - 0.5) * 0.3;
    this.life   = Math.random();
    this.alpha  = Math.random() * 0.5 + 0.1;
  }

  draw() {
    this.life += 0.003;
    const a = Math.sin(this.life * Math.PI) * this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fill();
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (mouse.x && mouse.y) {
      const dx   = this.x - mouse.x;
      const dy   = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        const force = (100 - dist) / 100;
        this.x += (dx / dist) * force * 1.2;
        this.y += (dy / dist) * force * 1.2;
      }
    }

    if (this.life >= 1 || this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
      this.reset();
    }
  }
}

const PARTICLE_COUNT = 100;
for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

function drawConnections() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx   = particles[i].x - particles[j].x;
      const dy   = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 90) {
        const alpha = (1 - dist / 90) * 0.07;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth   = 0.6;
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawConnections();
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
}
animateParticles();

window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });


// ============================================================
//  2. CUSTOM CURSOR
// ============================================================
const cursorDot      = document.getElementById('cursor');
const cursorFollower = document.getElementById('cursor-follower');

let followerX = 0, followerY = 0;
let cursorX   = 0, cursorY   = 0;

document.addEventListener('mousemove', e => {
  cursorX = e.clientX;
  cursorY = e.clientY;
  cursorDot.style.left = cursorX + 'px';
  cursorDot.style.top  = cursorY + 'px';
});

function animateCursor() {
  followerX += (cursorX - followerX) * 0.12;
  followerY += (cursorY - followerY) * 0.12;
  cursorFollower.style.left = followerX + 'px';
  cursorFollower.style.top  = followerY + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();

document.querySelectorAll('a, button, input, textarea').forEach(el => {
  el.addEventListener('mouseenter', () => cursorDot.style.transform = 'translate(-50%,-50%) scale(2.5)');
  el.addEventListener('mouseleave', () => cursorDot.style.transform = 'translate(-50%,-50%) scale(1)');
});


// ============================================================
//  3. TYPED TEXT ANIMATION
// ============================================================
const phrases = [
  'SAP ABAP Consultant',
  'ALV Report Developer',
  'OData & Fiori Engineer',
  'S/4HANA Explorer',
  'Enterprise Solution Builder',
];

let phraseIdx  = 0;
let charIdx    = 0;
let isDeleting = false;
const typedEl  = document.getElementById('typed-text');

function type() {
  const phrase  = phrases[phraseIdx];
  const current = isDeleting ? phrase.slice(0, charIdx - 1) : phrase.slice(0, charIdx + 1);

  if (typedEl) typedEl.textContent = current;
  isDeleting ? charIdx-- : charIdx++;

  let delay = isDeleting ? 42 : 90;

  if (!isDeleting && charIdx === phrase.length) {
    delay = 1800; isDeleting = true;
  } else if (isDeleting && charIdx === 0) {
    isDeleting = false;
    phraseIdx  = (phraseIdx + 1) % phrases.length;
    delay      = 400;
  }

  setTimeout(type, delay);
}
type();


// ============================================================
//  4. NAVBAR: SCROLL + ACTIVE LINK
// ============================================================
const navbar   = document.getElementById('navbar');
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 30);

  let current = '';
  sections.forEach(section => {
    if (window.scrollY >= section.offsetTop - 140) current = section.id;
  });
  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.section === current);
  });
});


// ============================================================
//  5. HAMBURGER MENU
// ============================================================
const hamburger = document.getElementById('hamburger');
const navMenu   = document.getElementById('nav-links');

hamburger.addEventListener('click', () => {
  navMenu.classList.toggle('open');
  const spans = hamburger.querySelectorAll('span');
  if (navMenu.classList.contains('open')) {
    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    spans[1].style.opacity   = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
  } else {
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }
});

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    navMenu.classList.remove('open');
    hamburger.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  });
});


// ============================================================
//  6. SCROLL REVEAL ANIMATION
// ============================================================
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right')
        .forEach(el => revealObserver.observe(el));


// ============================================================
//  7. SKILL BAR ANIMATION
// ============================================================
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.skill-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.width + '%';
      });
      barObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

const profSection = document.querySelector('.proficiency-section');
if (profSection) barObserver.observe(profSection);


// ============================================================
//  8. COUNTER ANIMATION
// ============================================================
function animateCounter(el, target, duration = 1400) {
  let start   = 0;
  const step  = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = Math.floor(start);
  }, 16);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('[data-target]').forEach(el => {
        animateCounter(el, parseInt(el.dataset.target));
      });
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) counterObserver.observe(heroStats);


// ============================================================
//  9. CARD GLOW MOUSE TRACK
// ============================================================
function addCardGlowEffect(selector) {
  document.querySelectorAll(selector).forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x    = ((e.clientX - rect.left) / rect.width)  * 100;
      const y    = ((e.clientY - rect.top)  / rect.height) * 100;
      card.style.background = `
        radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.04) 0%, transparent 60%),
        var(--bg-card)`;
    });
    card.addEventListener('mouseleave', () => { card.style.background = ''; });
  });
}

addCardGlowEffect('.skill-category');
addCardGlowEffect('.about-card');
addCardGlowEffect('.edu-card');
addCardGlowEffect('.timeline-card');


// ============================================================
//  10. FLOATING BADGES PARALLAX
// ============================================================
window.addEventListener('mousemove', e => {
  const mx = (e.clientX / window.innerWidth  - 0.5) * 16;
  const my = (e.clientY / window.innerHeight - 0.5) * 16;
  document.querySelectorAll('.floating-badge').forEach((badge, i) => {
    const depth = (i + 1) * 0.35;
    badge.style.transform = `translate(${mx * depth}px, ${my * depth}px)`;
  });
  const hex = document.querySelector('.avatar-hex');
  if (hex) hex.style.transform = `translateY(-14px) rotateY(${mx * 0.25}deg) rotateX(${-my * 0.25}deg)`;
});


// ============================================================
//  11. CONTACT FORM (visual demo)
// ============================================================
const contactForm = document.getElementById('contact-form');
const formSuccess = document.getElementById('form-success');

if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = contactForm.querySelector('.btn-submit');
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.querySelector('span').textContent = 'Sending…';

    setTimeout(() => {
      btn.disabled = false;
      btn.style.opacity = '';
      btn.querySelector('span').textContent = 'Send Message';
      formSuccess.style.display = 'block';
      contactForm.reset();
      setTimeout(() => { formSuccess.style.display = 'none'; }, 5000);
    }, 1400);
  });
}


// ============================================================
//  12. SCROLL PROGRESS BAR
// ============================================================
const progressBar = document.createElement('div');
progressBar.id = 'scroll-progress';
Object.assign(progressBar.style, {
  position: 'fixed', top: '0', left: '0',
  height: '2px', width: '0%',
  background: 'linear-gradient(90deg,#fff,#888)',
  zIndex: '9999',
  transition: 'width 0.1s linear',
  boxShadow: '0 0 6px rgba(255,255,255,0.4)',
  pointerEvents: 'none',
});
document.body.appendChild(progressBar);

window.addEventListener('scroll', () => {
  const scrollTop  = document.documentElement.scrollTop || document.body.scrollTop;
  const docHeight  = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  progressBar.style.width = ((scrollTop / docHeight) * 100) + '%';
});


// ============================================================
//  13. TILT EFFECT
// ============================================================
function addTiltEffect(selector, intensity = 7) {
  document.querySelectorAll(selector).forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect    = card.getBoundingClientRect();
      const centerX = rect.left + rect.width  / 2;
      const centerY = rect.top  + rect.height / 2;
      const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -intensity;
      const rotateY = ((e.clientX - centerX) / (rect.width  / 2)) *  intensity;
      card.style.transform  = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      card.style.transition = 'transform 0.08s ease';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform  = '';
      card.style.transition = 'transform 0.5s ease, box-shadow 0.4s ease, border-color 0.4s ease';
    });
  });
}

addTiltEffect('.edu-card', 5);
addTiltEffect('.about-card', 4);


// ============================================================
//  14. SUBTLE GLITCH ON NAME
// ============================================================
const accentGlow = document.querySelector('.accent-glow');
if (accentGlow) {
  function glitch() {
    const chars    = 'ABCD$#ΣΨΛ';
    const orig     = 'Shevkar';
    let   glitched = '';
    for (let i = 0; i < orig.length; i++) {
      glitched += Math.random() < 0.12 ? chars[Math.floor(Math.random() * chars.length)] : orig[i];
    }
    accentGlow.textContent = glitched;
    setTimeout(() => { accentGlow.textContent = orig; }, 70);
  }
  setInterval(glitch, 4000);
}


// ============================================================
//  15. HERO BG PARALLAX
// ============================================================
window.addEventListener('scroll', () => {
  const heroImg = document.querySelector('.hero-bg-img');
  if (heroImg) heroImg.style.transform = `translateY(${window.scrollY * 0.25}px)`;
});


// ============================================================
//  16. TAG RIPPLE
// ============================================================
document.querySelectorAll('.tag').forEach(tag => {
  tag.addEventListener('click', e => {
    const ripple = document.createElement('span');
    Object.assign(ripple.style, {
      position: 'absolute', borderRadius: '50%',
      width: '0', height: '0',
      background: 'rgba(255,255,255,0.25)',
      transform: 'translate(-50%,-50%)',
      animation: 'ripple 0.5s ease-out forwards',
      left: e.offsetX + 'px', top: e.offsetY + 'px',
      pointerEvents: 'none',
    });
    tag.style.position = 'relative';
    tag.style.overflow = 'hidden';
    tag.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  });
});


// ============================================================
//  17. INJECT KEYFRAMES
// ============================================================
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes ripple { to { width: 90px; height: 90px; opacity: 0; } }
  @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(styleEl);


// ============================================================
//  18. HERO STAGGER REVEAL
// ============================================================
document.querySelectorAll('.hero .reveal-up').forEach((el, i) => {
  el.style.animationDelay = (i * 0.1) + 's';
  el.style.animation      = `fadeSlideUp 0.65s ease forwards`;
  el.style.opacity        = '0';
});

const heroRight = document.querySelector('.reveal-right');
if (heroRight) setTimeout(() => { heroRight.classList.add('revealed'); }, 350);

console.log('%c⬛ Anil Shevkar Portfolio loaded', 'color:#fff;font-size:1.1rem;font-weight:bold;background:#111;padding:4px 8px;border-radius:4px;');
