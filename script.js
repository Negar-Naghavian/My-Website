(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Set year in footer
  document.getElementById('year').textContent = new Date().getFullYear();

  // Intersection reveal
  const revealEls = $$('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('visible');
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));

  // Tilt effect
  const tiltEls = $$('.tilt');
  tiltEls.forEach(el => {
    el.addEventListener('mousemove', (ev) => {
      const rect = el.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / rect.width - 0.5;
      const y = (ev.clientY - rect.top) / rect.height - 0.5;
      const rx = -y * 7;
      const ry = x * 10;
      el.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href.length > 1) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Canvas background
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let DPR = Math.max(1, window.devicePixelRatio || 1);

  const cfg = { count: 100, maxRadius: 2.6, connectionDist: 120, speed: 0.35, bgHue: 210 };
  let particles = [];
  let mouse = { x: null, y: null, lastMove: 0 };

  function resize() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    const w = canvas.clientWidth = window.innerWidth;
    const h = canvas.clientHeight = window.innerHeight;
    canvas.width = Math.round(w * DPR);
    canvas.height = Math.round(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function initParticles() {
    particles = [];
    for (let i = 0; i < cfg.count; i++) {
      particles.push({
        x: rand(0, canvas.width / DPR),
        y: rand(0, canvas.height / DPR),
        vx: rand(-cfg.speed, cfg.speed),
        vy: rand(-cfg.speed, cfg.speed),
        r: rand(0.8, cfg.maxRadius),
        hue: cfg.bgHue + rand(-20, 40)
      });
    }
  }
  initParticles();

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.lastMove = performance.now();
  });
  window.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });
  window.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) { mouse.x = t.clientX; mouse.y = t.clientY; mouse.lastMove = performance.now(); }
  }, { passive: true });

  let last = performance.now();
  function step(now) {
    const dt = Math.min(40, now - last);
    last = now;
    update(dt / 16.666);
    draw();
    requestAnimationFrame(step);
  }

  function update(scale) {
    const width = canvas.width / DPR;
    const height = canvas.height / DPR;
    for (let p of particles) {
      p.x += p.vx * scale;
      p.y += p.vy * scale;
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;

      p.vx += (Math.sin((p.x + performance.now()/1000) * 0.001) * 0.02 - p.vx) * 0.005;
      p.vy += (Math.cos((p.y - performance.now()/1000) * 0.001) * 0.02 - p.vy) * 0.005;

      if (mouse.x !== null) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.0001;
        if (dist < 160) {
          const force = (160 - dist) / 160;
          p.vx += (dx / dist) * force * 0.28 * scale;
          p.vy += (dy / dist) * force * 0.28 * scale;
        }
        p.vx = Math.max(-2, Math.min(2, p.vx));
        p.vy = Math.max(-2, Math.min(2, p.vy));
      }
    }
  }

  function draw() {
    const w = canvas.width / DPR;
    const h = canvas.height / DPR;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(6,11,22,0.46)');
    g.addColorStop(1, 'rgba(2,6,23,0.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const rg = ctx.createRadialGradient(w * 0.15, h * 0.1, 0, w * 0.25, h * 0.2, Math.max(w,h));
    rg.addColorStop(0, 'rgba(124,58,237,0.03)');
    rg.addColorStop(1, 'rgba(6,182,212,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 0.6;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < cfg.connectionDist * cfg.connectionDist) {
          const t = 1 - (Math.sqrt(d2) / cfg.connectionDist);
          ctx.strokeStyle = `rgba(120,90,230,${0.11 * t})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (let p of particles) {
      const r = p.r;
      ctx.beginPath();
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 6);
      grad.addColorStop(0, `rgba(124,58,237,0.065)`);
      grad.addColorStop(1, `rgba(6,182,212,0)`);
      ctx.fillStyle = grad;
      ctx.arc(p.x, p.y, r * 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0.42, p.r / cfg.maxRadius * 0.9)})`;
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  requestAnimationFrame(step);

  // Avatar parallax
  const avatar = document.querySelector('.avatar');
  window.addEventListener('mousemove', (e) => {
    const rect = document.body.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;
    if (avatar) {
      avatar.style.transform = `translate3d(${dx * 6}px, ${dy * 6}px, 0) rotate(${dx * 3}deg)`;
    }
  });

  // Reduce motion preference
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) {
    // static background
    // (stop active animation by clearing particles and drawing a static fill)
    particles = [];
    ctx.fillStyle = 'rgba(5,10,18,1)';
    ctx.fillRect(0, 0, canvas.width / DPR, canvas.height / DPR);
  }

  // Accessibility: keyboard focus hint
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') document.body.classList.add('show-focus');
  });

})();