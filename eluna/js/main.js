/*! © 2026 ELUNA · RICCA DESIGNS, Алматы. Все права защищены. Копирование без письменного разрешения запрещено. */
/* ==========================================================================
   ELUNA — технология, модели, размеры, доставка, заказ.
   Hero-сцена живёт в hero.js, расслойка — в strata.js, ядро (скролл, цикл, качество) — в core.js.
   ========================================================================== */
(() => {
  'use strict';

  const E = window.ELUNA_CORE;
  const { reduceMotion, root, body } = E;
  const isMobile = E.isMobile;
  const resizeHooks = E.resizeHooks;

  // «после интро»: когда сцена доиграла (или через 9 с), в простое браузера
  const afterIntro = (fn) => {
    let done = false;
    const run = () => { if (done) return; done = true; (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(fn, { timeout: 2500 }); };
    document.addEventListener('eluna:introdone', run, { once: true });
    setTimeout(run, 9000);
  };

  /* ------------------------------------------------------------------------
     Единый свет. Состояние {x, y, i} в долях экрана/секции, плавно
     интерполируется quickTo. Источники: hero (луна + указатель + скролл),
     рельс моделей (выбранная карточка). Потребители подписываются через on().
     ------------------------------------------------------------------------ */
  const Light = (() => {
    const st = { x: 0.12, y: 0.18, i: 1 };
    const subs = new Set();
    let owner = 'hero';
    const emit = () => subs.forEach((f) => f(st));
    const now = (k) => (v) => { st[k] = v; emit(); };
    const tx = reduceMotion ? now('x') : gsap.quickTo(st, 'x', { duration: .9, ease: 'power3.out', onUpdate: emit });
    const ty = reduceMotion ? now('y') : gsap.quickTo(st, 'y', { duration: .9, ease: 'power3.out', onUpdate: emit });
    const ti = reduceMotion ? now('i') : gsap.quickTo(st, 'i', { duration: .7, ease: 'power2.out', onUpdate: emit });
    return {
      get: () => st,
      owner: () => owner,
      claim(who) { owner = who; },
      aim(who, x, y, i) { if (who !== owner) return; if (x != null) tx(x); if (y != null) ty(y); if (i != null) ti(i); },
      set(who, x, y, i) { if (who !== owner) return; if (x != null) st.x = x; if (y != null) st.y = y; if (i != null) st.i = i; emit(); },
      on(fn) { subs.add(fn); fn(st); return () => subs.delete(fn); },
    };
  })();

  /* ------------------------------------------------------------------------
     Сон вдвоём: цепочка масс и пружин на canvas (внутри вкладки)
     ------------------------------------------------------------------------ */
  const motionApi = (function motion() {
    const cv = document.getElementById('motionCanvas');
    if (!cv) return { resize() {} };
    const ctx = cv.getContext('2d');
    const tag = document.getElementById('motionTag');
    const btn = document.getElementById('motionBtn');

    const N = 120, SEAM = 60, SRC = 27, PARTNER = 92;
    const y = new Float32Array(N), v = new Float32Array(N), a = new Float32Array(N);
    const K = 0.035, C = new Float32Array(N), D = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const gap = i >= SEAM - 5 && i <= SEAM + 9;
      C[i] = gap ? 0.2 : 0.26;
      D[i] = gap ? 0.05 : (i > SEAM ? 0.03 : 0.0075);
    }
    const STEP = 1 / 100;
    let acc = 0, last = 0, running = false, visible = false, roll = 0, rollV = 0, pulses = [];
    let W = 0, H = 0, dpr = 1, bodyGrad = null, gradH = 0;

    function step() {
      for (let i = 0; i < N; i++) {
        const l = i > 0 ? y[i - 1] : 0, r = i < N - 1 ? y[i + 1] : 0;
        a[i] = -K * y[i] + C[i] * (l + r - 2 * y[i]) - D[i] * v[i];
      }
      for (let i = 0; i < N; i++) { v[i] += a[i]; y[i] += v[i]; }
      rollV += -0.03 * roll - 0.05 * rollV; roll += rollV * 0.9;
      for (let p = pulses.length - 1; p >= 0; p--) {
        const q = pulses[p]; q.t--;
        if (q.t <= 0) {
          for (let i = 0; i < N; i++) { const x = (i - SRC) / 7; v[i] += q.a * Math.exp(-x * x); }
          rollV += q.a * 0.11; pulses.splice(p, 1);
        }
      }
    }
    const energy = () => { let e = 0; for (let i = 0; i < N; i++) e += v[i] * v[i] + y[i] * y[i]; return e / N; };
    function px(i) { return 6 + (W - 12) * i / (N - 1); }
    function draw() {
      if (!W || !H) return;
      ctx.clearRect(0, 0, W, H);
      const baseY = H * 0.82, top = H * 0.48, amp = H * 0.24;
      const surf = (j) => top + y[j] * amp * 0.5;
      if (!bodyGrad || gradH !== H) {
        gradH = H; bodyGrad = ctx.createLinearGradient(0, top - 10, 0, baseY);
        bodyGrad.addColorStop(0, 'rgba(214,224,250,0.20)'); bodyGrad.addColorStop(1, 'rgba(214,224,250,0.025)');
      }
      ctx.beginPath(); ctx.moveTo(px(0), baseY); ctx.lineTo(px(0), surf(0));
      for (let i = 1; i < N; i++) ctx.lineTo(px(i), surf(i));
      ctx.lineTo(px(N - 1), baseY); ctx.closePath(); ctx.fillStyle = bodyGrad; ctx.fill();
      ctx.lineWidth = 1;
      const calm = new Path2D(), mv = new Path2D();
      for (let i = 2; i < N - 1; i += 4) {
        const t = Math.abs(y[i]) > 0.06 ? mv : calm;
        t.moveTo(px(i), surf(i) + 4); t.lineTo(px(i), baseY - 4);
      }
      ctx.strokeStyle = 'rgba(214,224,250,0.08)'; ctx.stroke(calm);
      ctx.strokeStyle = 'rgba(214,224,250,0.3)'; ctx.stroke(mv);
      ctx.strokeStyle = 'rgba(214,224,250,0.16)'; ctx.beginPath(); ctx.moveTo(px(0), baseY + 0.5); ctx.lineTo(px(N - 1), baseY + 0.5); ctx.stroke();
      ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(216,191,138,0.6)';
      ctx.beginPath(); ctx.moveTo(px(SEAM), H * 0.12); ctx.lineTo(px(SEAM), baseY + 22); ctx.stroke(); ctx.setLineDash([]);
      const sleeper = (c, filled, ang) => {
        const cx = px(c), cy = surf(c) - H * 0.072, w = Math.min(W * 0.2, 230), h = H * 0.13, r = h / 2;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(-w / 2 + r, -h / 2); ctx.lineTo(w / 2 - r, -h / 2); ctx.arc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-w / 2 + r, h / 2); ctx.arc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
        if (filled) { ctx.fillStyle = 'rgba(214,224,250,0.94)'; ctx.fill(); }
        else { ctx.fillStyle = 'rgba(214,224,250,0.14)'; ctx.fill(); ctx.strokeStyle = 'rgba(214,224,250,0.5)'; ctx.stroke(); }
        ctx.restore();
      };
      const slope = (c) => Math.atan((surf(Math.min(N - 1, c + 6)) - surf(c - 6)) / (px(c + 6) - px(c - 6)));
      sleeper(SRC, true, slope(SRC) + roll * 0.9);
      sleeper(PARTNER, false, slope(PARTNER));
      ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
      const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      for (let i = 0; i < N - 1; i++) {
        const bk = Math.min(4, (Math.min(1, Math.abs(y[i]) * 0.9) * 5) | 0);
        paths[bk].moveTo(px(i), surf(i)); paths[bk].lineTo(px(i + 1), surf(i + 1));
      }
      for (let i = 0; i < 5; i++) { ctx.strokeStyle = `rgba(214,224,250,${(0.5 + (i / 4) * 0.5).toFixed(2)})`; ctx.stroke(paths[i]); }
    }
    function frame(now) {
      if (!last) last = now;
      acc += Math.min(0.035, (now - last) / 1000); last = now;
      let n = 0;
      while (acc >= STEP && n < 3) { step(); acc -= STEP; n++; }
      if (n === 3) acc = 0;
      draw();
      if (!pulses.length && energy() < 0.00008) { running = false; last = 0; return; }
      requestAnimationFrame(frame);
    }
    function start() { if (reduceMotion) { settleStatic(); return; } if (!running) { running = true; last = 0; requestAnimationFrame(frame); } }
    function turn(s = 1) {
      pulses.push({ t: 0, a: 0.27 * s }, { t: 26, a: -0.18 * s }, { t: 58, a: 0.1 * s });
      if (tag) { tag.classList.remove('is-on'); clearTimeout(turn.to); turn.to = setTimeout(() => tag.classList.add('is-on'), 2600); }
      start();
    }
    function settleStatic() {
      for (let i = 0; i < N; i++) { const x = (i - SRC) / 9; y[i] = -0.8 * Math.exp(-x * x) * (i > SEAM ? 0.03 : 1); v[i] = 0; }
      draw(); if (tag) tag.classList.add('is-on');
    }
    function resize() {
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bodyGrad = null; draw();
    }
    let lastUser = 0;
    const user = () => { lastUser = Date.now(); turn(1); };
    btn.addEventListener('click', user);
    cv.addEventListener('pointerdown', user);
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); user(); } });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        const was = visible; visible = es[0].isIntersecting;
        if (visible && !was && !running && !reduceMotion) setTimeout(() => { if (visible && !running) turn(1); }, 500);
      }, { threshold: 0.35 }).observe(cv);
    }
    if (!reduceMotion) setInterval(() => { if (visible && Date.now() - lastUser > 7000 && !running && !document.hidden) turn(1); }, 1000);
    resizeHooks.push(() => { if (cv.offsetParent) resize(); });
    if (reduceMotion) settleStatic();
    return { resize: () => { resize(); if (reduceMotion) settleStatic(); } };
  })();

  if (reduceMotion) document.querySelectorAll('.wave animate').forEach((n) => n.remove());

  (function tabs() {
    const list = document.querySelector('.tabs[role="tablist"]');
    if (!list) return;
    const tabsEls = Array.from(list.querySelectorAll('[role="tab"]'));
    const panels = tabsEls.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    function show(i, focus) {
      tabsEls.forEach((t, k) => { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach((p, k) => { if (p) p.hidden = k !== i; });
      if (focus) tabsEls[i].focus();
      if (panels[i] && panels[i].id === 'panel-motion') requestAnimationFrame(() => motionApi.resize());
    }
    tabsEls.forEach((t, i) => {
      t.addEventListener('click', () => show(i, false));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); show((i + 1) % tabsEls.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); show((i - 1 + tabsEls.length) % tabsEls.length, true); }
        if (e.key === 'Home') { e.preventDefault(); show(0, true); }
        if (e.key === 'End') { e.preventDefault(); show(tabsEls.length - 1, true); }
      });
    });
    panels.forEach((p) => { if (p && !p.hasAttribute('tabindex')) p.tabIndex = 0; });
  })();

  /* ------------------------------------------------------------------------
     Доставка: Казахстан с орбиты. При появлении — волна света от Алматы,
     граница прорисовывается, города загораются по мере прохода волны.
     Дальше — пунктирные маршруты из Алматы с бегущими огнями, свет по
     границе, полоса «рассвета» поперёк страны. Клик/наведение на город —
     золотая дуга доставки из Алматы с кометой. Всё — один холст поверх
     снимка, кадры идут только пока карта на экране.
     ------------------------------------------------------------------------ */
  (function delivery() {
    const map = document.getElementById('map');
    if (!map) return;
    const DELIVERY = { default: 'от 7 дней', 'Алматы': 'мы здесь · доставка по городу' };
    const cityEl = document.getElementById('deliveryCity');
    const daysEl = document.getElementById('deliveryDays');
    const cities = Array.from(map.querySelectorAll('.city'));
    if (!cities.length) return;

    const VW = 2080, VH = 1174;                         // система координат снимка и контура
    const pos = (c) => [parseFloat(c.style.getPropertyValue('--x')) / 100 * VW, parseFloat(c.style.getPropertyValue('--y')) / 100 * VH];
    const home = cities.find((c) => c.dataset.city === 'Алматы') || cities[0];
    const A = pos(home);
    // маршрут — квадратичная дуга из Алматы, выгнутая к северу
    const routes = cities.filter((c) => c !== home).map((c, i) => {
      const B = pos(c), dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1;
      let nx = -dy / len, ny = dx / len; if (ny > 0) { nx = -nx; ny = -ny; }
      const C = [(A[0] + B[0]) / 2 + nx * len * 0.2, (A[1] + B[1]) / 2 + ny * len * 0.2];
      return { el: c, B, C, len, period: 3.4 + len / 650, phase: (i * 0.618) % 1 };
    });
    const maxD = Math.max(1, ...routes.map((r) => r.len));
    cities.forEach((c, i) => {
      const B = pos(c);
      c.style.setProperty('--dl', `${(0.2 + Math.hypot(B[0] - A[0], B[1] - A[1]) / maxD * 1.5).toFixed(2)}s`);
      c.style.setProperty('--tw', `${(-((i * 1.37) % 3.4)).toFixed(2)}s`);
    });

    const animate = !reduceMotion && E.tier() !== 'low';
    let pickR = null, pickT = -1e9;
    let paint = () => {};
    const citySel = document.getElementById('citySelect');
    if (citySel && !citySel.options.length) citySel.innerHTML = cities.map((c) => `<option value="${c.dataset.city}">${c.dataset.city}</option>`).join('');
    function pick(btn, preview) {
      cities.forEach((c) => { const on = c === btn; c.classList.toggle('is-on', on); if (!preview) c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      if (!preview && citySel) citySel.value = btn.dataset.city;
      map.classList.add('has-pick');
      map.style.setProperty('--mx', btn.style.getPropertyValue('--x'));
      map.style.setProperty('--my', btn.style.getPropertyValue('--y'));
      const name = btn.dataset.city;
      cityEl.textContent = name;
      daysEl.textContent = DELIVERY[name] || DELIVERY.default;
      const r = routes.find((x) => x.el === btn) || null;
      if (r !== pickR) { pickR = r; pickT = animate ? performance.now() / 1000 : -1e9; paint(); }
    }
    const hoverable = window.matchMedia('(hover: hover)').matches;
    let hoverTo = 0, chosen = null;   // chosen — город, выбранный нажатием (идёт в заказ); наведение — только просмотр
    map.addEventListener('mouseleave', () => { clearTimeout(hoverTo); if (chosen && !chosen.classList.contains('is-on')) pick(chosen); });
    cities.forEach((c) => {
      c.addEventListener('click', () => { clearTimeout(hoverTo); chosen = c; pick(c); document.dispatchEvent(new CustomEvent('eluna:city', { detail: c.dataset.city })); });
      // наведение — с короткой задержкой, чтобы дуга не дёргалась, пока курсор пролетает над точками
      c.addEventListener('mouseenter', () => { if (!hoverable) return; clearTimeout(hoverTo); hoverTo = setTimeout(() => pick(c, true), 90); });
      c.addEventListener('mouseleave', () => { clearTimeout(hoverTo); hoverTo = setTimeout(() => { if (chosen && !chosen.classList.contains('is-on')) pick(chosen); }, 140); });
    });
    if (citySel) citySel.addEventListener('change', () => {
      const c = cities.find((x) => x.dataset.city === citySel.value); if (!c) return;
      clearTimeout(hoverTo); chosen = c; pick(c); document.dispatchEvent(new CustomEvent('eluna:city', { detail: c.dataset.city }));
    });
    chosen = map.querySelector('.city.is-on') || home;
    pick(chosen);
    document.addEventListener('eluna:setcity', (e) => { const c = cities.find((x) => x.dataset.city === e.detail); if (c) { chosen = c; if (!c.classList.contains('is-on')) pick(c); } });

    // ---- холст эффектов: строится, когда карта подошла к экрану (на старте страницы это ~40 мс главного потока впустую) ----
    function initFx() {
    const lineEl = map.querySelector('.map__line');
    const dStr = lineEl ? lineEl.getAttribute('d') : '';
    let border = null;
    try { border = new Path2D(dStr); } catch (e) { border = null; }
    const cv = document.createElement('canvas');
    const ctx = border && cv.getContext ? cv.getContext('2d') : null;
    if (!ctx) { map.classList.add('is-in'); return; }
    cv.className = 'map__fx'; cv.setAttribute('aria-hidden', 'true');
    map.insertBefore(cv, cities[0]);
    map.classList.add('is-fx');

    // главный контур как ломаная: для прорисовки и бегущего света
    const ring = [];
    (dStr.split('Z')[0].match(/-?\d+(?:\.\d+)?/g) || []).forEach((n, i, a) => { if (i % 2) ring.push([+a[i - 1], +n]); });
    if (ring.length > 1) ring.push(ring[0]);
    const cum = [0];
    for (let i = 1; i < ring.length; i++) cum.push(cum[i - 1] + Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]));
    const PER = cum[cum.length - 1] || 1;
    function along(s, o) {
      s = ((s % PER) + PER) % PER;
      let lo = 0, hi = cum.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
      const f = (s - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
      o[0] = ring[lo][0] + (ring[hi][0] - ring[lo][0]) * f; o[1] = ring[lo][1] + (ring[hi][1] - ring[lo][1]) * f;
      return o;
    }
    const qb = (r, t, o) => { const u = 1 - t; o[0] = u * u * A[0] + 2 * u * t * r.C[0] + t * t * r.B[0]; o[1] = u * u * A[1] + 2 * u * t * r.C[1] + t * t * r.B[1]; return o; };
    // часть дуги 0..t (де Кастельжо)
    function arc(c, r, t) {
      const c1x = A[0] + (r.C[0] - A[0]) * t, c1y = A[1] + (r.C[1] - A[1]) * t, e = qb(r, t, [0, 0]);
      c.moveTo(A[0], A[1]); c.quadraticCurveTo(c1x, c1y, e[0], e[1]);
    }
    function sprite(rgb) {
      const s = document.createElement('canvas'); s.width = s.height = 64;
      const g = s.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.16, `rgba(${rgb},.9)`); gr.addColorStop(0.42, `rgba(${rgb},.22)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return s;
    }
    const WARM = sprite('255,222,165'), ICE = sprite('185,212,255'), WHITE = sprite('255,248,236');

    let k = 1, u = 1, stat = null;
    const q = [0, 0], q2 = [0, 0];
    const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
    function dot(spr, x, y, rPx, a) { if (a <= 0.003) return; const r = rPx * u; ctx.globalAlpha = a; ctx.drawImage(spr, x - r, y - r, r * 2, r * 2); }
    function strokeBorder(c, path) {
      c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = 'rgba(110,150,255,0.10)'; c.lineWidth = 8 * u; c.stroke(path);
      c.strokeStyle = 'rgba(150,185,255,0.24)'; c.lineWidth = 2.8 * u; c.stroke(path);
      c.strokeStyle = 'rgba(218,230,255,0.78)'; c.lineWidth = 1 * u; c.stroke(path);
    }
    function strokeRoute(c, r, t, a) {
      c.globalAlpha = a; c.beginPath(); arc(c, r, t); c.stroke();
    }
    function routesStyle(c) { c.setLineDash([2.5 * u, 6 * u]); c.lineWidth = 1 * u; c.lineCap = 'round'; c.strokeStyle = 'rgb(200,216,255)'; }
    // статичный слой: граница и пунктир маршрутов — рисуется один раз на размер
    function buildStatic() {
      stat = stat || document.createElement('canvas');
      stat.width = cv.width; stat.height = cv.height;
      const s = stat.getContext('2d');
      s.setTransform(k, 0, 0, k, 0, 0);
      strokeBorder(s, border);
      routesStyle(s); routes.forEach((r) => strokeRoute(s, r, 1, 0.26)); s.setLineDash([]); s.globalAlpha = 1;
    }
    function size() {
      const rc = map.getBoundingClientRect();
      if (!rc.width) return;
      const d = Math.min(isMobile() ? 1.5 : 2, window.devicePixelRatio || 1);
      const w = Math.round(rc.width * d), h = Math.round(rc.height * d);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      k = w / VW; u = d / k;                            // u — единиц снимка в одном CSS-пикселе
      buildStatic(); if (animate) buildDay(); paint();
    }

    const REVEAL = 2.9;
    let revealAt = animate ? -1 : -1e9;                  // −1 — ещё не на экране
    let live = false, raf = 0, last = 0;

    function borderPart(f) {
      const end = f * PER; ctx.beginPath(); ctx.moveTo(ring[0][0], ring[0][1]);
      for (let i = 1; i < ring.length && cum[i] <= end; i++) ctx.lineTo(ring[i][0], ring[i][1]);
      along(end, q); ctx.lineTo(q[0], q[1]);
    }
    function draw(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      if (revealAt === -1) return;                       // до появления — пусто (снимок тоже скрыт)
      const rt = t - revealAt;
      if (rt < REVEAL) {
        // граница прорисовывается, волна от Алматы зажигает маршруты
        const f = clamp((rt - 0.25) / 2.3), fe = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
        if (fe > 0) {
          ctx.lineJoin = 'round'; ctx.lineCap = 'round';
          borderPart(fe);
          ctx.strokeStyle = 'rgba(110,150,255,0.10)'; ctx.lineWidth = 8 * u; ctx.stroke();
          ctx.strokeStyle = 'rgba(150,185,255,0.24)'; ctx.lineWidth = 2.8 * u; ctx.stroke();
          ctx.strokeStyle = 'rgba(218,230,255,0.78)'; ctx.lineWidth = 1 * u; ctx.stroke();
          along(fe * PER, q); dot(ICE, q[0], q[1], 14, 1 - clamp((rt - 2.3) / 0.5));
        }
        const wp = clamp((rt - 0.1) / 1.7), R = (1 - Math.pow(1 - wp, 3)) * maxD * 1.1;
        if (wp < 1) {
          ctx.globalAlpha = 1;
          ctx.lineWidth = 1.6 * u; ctx.strokeStyle = `rgba(255,226,178,${(0.6 * (1 - wp)).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(A[0], A[1], R, 0, Math.PI * 2); ctx.stroke();
          ctx.lineWidth = 7 * u; ctx.strokeStyle = `rgba(255,210,150,${(0.12 * (1 - wp)).toFixed(3)})`;
          ctx.beginPath(); ctx.arc(A[0], A[1], R * 0.97, 0, Math.PI * 2); ctx.stroke();
        }
        routesStyle(ctx);
        routes.forEach((r) => { const a = clamp((R - r.len * 0.35) / (r.len * 0.65)); if (a > 0) strokeRoute(ctx, r, a, 0.26); });
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(stat, 0, 0, VW, VH);
      }
      const amb = clamp((rt - 2.0) / 1.2);
      if (amb > 0 && animate) { sweep(t, amb); runners(t, amb); packets(t, amb); }
      selected(t);
      ctx.globalAlpha = 1;
    }
    // «рассвет»: раз в 12 с с востока на запад идёт полоса дня — внутри неё снимок в настоящих цветах
    // (ночной сине-серебряный вид — CSS-фильтр картинки). Дневной слой (снимок, обрезанный по границе)
    // готовится один раз на размер; полоса — узкие вертикальные срезы этого слоя с плавной прозрачностью
    const img = map.querySelector('.map__img');
    let day = null, glow = null;
    function buildDay() {
      day = glow = null;
      if (!img || !img.complete || !img.naturalWidth) return;
      day = document.createElement('canvas'); day.width = cv.width; day.height = cv.height;
      const d = day.getContext('2d'); d.setTransform(k, 0, 0, k, 0, 0); d.clip(border); d.drawImage(img, 0, 0, VW, VH);
      glow = document.createElement('canvas'); glow.width = cv.width; glow.height = cv.height;
      const g = glow.getContext('2d'); g.setTransform(k, 0, 0, k, 0, 0); g.fillStyle = 'rgb(226,236,255)'; g.fill(border);
    }
    if (img && !img.complete) img.addEventListener('load', () => { buildDay(); paint(); }, { once: true });
    const BAND = 920, STRIPS = 56;
    const sstep = (e0, e1, v) => { const x = clamp((v - e0) / (e1 - e0)); return x * x * (3 - 2 * x); };
    function sweep(t, a) {
      const ph = (t % 12) / 7; if (ph >= 1 || !day) return;
      const x = VW + BAND / 2 - ph * (VW + BAND);
      const env = a * Math.min(1, Math.sin(Math.PI * ph) * 2.2);
      const left = (x - BAND / 2) * k, sw = BAND * k / STRIPS, H = cv.height, W = cv.width;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < STRIPS; i++) {
        const sx = Math.round(left + i * sw), ex = Math.round(left + (i + 1) * sw);
        const x0 = Math.max(0, sx), x1 = Math.min(W, ex);
        if (x1 <= x0) continue;
        const v = (i + 0.5) / STRIPS;                    // 0 — передний (западный) край полосы
        const al = sstep(0.1, 0.3, v) * (1 - sstep(0.3, 1, v));
        if (al > 0.01) { ctx.globalAlpha = 0.62 * env * al; ctx.drawImage(day, x0, 0, x1 - x0, H, x0, 0, x1 - x0, H); }
        const edge = sstep(0.12, 0.26, v) * (1 - sstep(0.26, 0.34, v));   // светлая кромка терминатора
        if (edge > 0.01) { ctx.globalAlpha = 0.13 * env * edge; ctx.drawImage(glow, x0, 0, x1 - x0, H, x0, 0, x1 - x0, H); }
      }
      ctx.setTransform(k, 0, 0, k, 0, 0);
    }
    // два огня бегут по границе с хвостом
    function runners(t, a) {
      const tail = PER * 0.05, N = 26;
      ctx.lineCap = 'round'; ctx.strokeStyle = 'rgb(205,224,255)';
      for (const off of [0, 0.5]) {
        const s = ((t / 18 + off) % 1) * PER;
        for (let i = 0; i < N; i++) {
          const f0 = i / N, f1 = (i + 1) / N;
          along(s - tail * (1 - f0), q); along(s - tail * (1 - f1), q2);
          ctx.globalAlpha = a * f1 * 0.85; ctx.lineWidth = (0.5 + 1.8 * f1) * u;
          ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(q2[0], q2[1]); ctx.stroke();
        }
        along(s, q); dot(ICE, q[0], q[1], 10, a * 0.9);
      }
    }
    // посылки: огонёк с коротким хвостом летит из Алматы по каждому маршруту
    function packets(t, a) {
      for (const r of routes) {
        if (r === pickR) continue;
        const p = (t / r.period + r.phase) % 1, s = p * p * (3 - 2 * p), fade = Math.sin(Math.PI * p) * a;
        for (let j = 3; j >= 0; j--) { qb(r, Math.max(0, s - j * 0.03), q); dot(WARM, q[0], q[1], j ? 4 - j * 0.7 : 5.5, fade * (j ? 0.32 - j * 0.07 : 0.95)); }
      }
    }
    // выбранный город: золотая дуга прорисовывается за 1 с, затем по ней кругами идёт комета
    function selected(t) {
      if (!pickR) return;
      const r = pickR, dt = t - pickT, d = clamp(dt / 1.0), e = 1 - Math.pow(1 - d, 3);
      if (dt < 0) return;
      ctx.lineCap = 'round'; ctx.globalAlpha = 1;
      ctx.beginPath(); arc(ctx, r, e);
      ctx.strokeStyle = 'rgba(255,205,140,0.16)'; ctx.lineWidth = 7 * u; ctx.stroke();
      const g = ctx.createLinearGradient(A[0], A[1], r.B[0], r.B[1]);
      g.addColorStop(0, 'rgba(200,168,107,0.95)'); g.addColorStop(1, 'rgba(255,244,222,0.95)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.7 * u; ctx.stroke();
      if (d < 1) { qb(r, e, q); dot(WHITE, q[0], q[1], 16, 1); return; }
      if (!animate) return;
      const p = ((dt - 1.0) % 2.6) / 2.6, s = p * p * (3 - 2 * p), fade = Math.sin(Math.PI * p);
      for (let j = 5; j >= 0; j--) { qb(r, Math.max(0, s - j * 0.025), q); dot(j ? WARM : WHITE, q[0], q[1], j ? 6 - j * 0.8 : 11, fade * (j ? 0.4 - j * 0.06 : 1)); }
    }

    // компьютер — до 60 кадров/с (на 120-герцовых экранах лишнее не рисуем), телефон и средний уровень — 30
    const minStep = isMobile() || E.tier() !== 'high' ? 32 : 15;
    function frame(now) {
      raf = 0;
      if (!live) return;
      if (now - last >= minStep) { last = now; draw(now / 1000); }
      raf = requestAnimationFrame(frame);
    }
    // без анимации (reduced motion, слабое устройство) — один кадр по требованию
    paint = () => { if (!live && cv.width) draw(performance.now() / 1000); };

    if (animate) map.classList.add('is-anim');
    else map.classList.add('is-in', 'is-done');
    size();
    if ('ResizeObserver' in window) new ResizeObserver(() => size()).observe(map);
    else resizeHooks.push(size);

    if (!animate) return;
    if (!('IntersectionObserver' in window)) { map.classList.add('is-in', 'is-done'); revealAt = -1e9; paint(); return; }
    new IntersectionObserver((es) => {
      const en = es[es.length - 1];
      if (revealAt === -1 && en.isIntersecting && en.intersectionRatio >= 0.3) {
        revealAt = performance.now() / 1000;
        pickT = Math.max(pickT, revealAt + 1.6);         // дуга выбранного города — после волны
        map.classList.add('is-in');
        setTimeout(() => map.classList.add('is-done'), 3600);
      }
      live = en.isIntersecting;
      map.classList.toggle('is-live', live);
      if (live && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      if (!live) paint();
    }, { threshold: [0, 0.3] }).observe(map);
    }
    // пока холст не построен, выбор города работает без дуги — она нарисуется при первом показе (pickT уже стоит)
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es.some((en) => en.isIntersecting)) { io.disconnect(); initFx(); } }, { rootMargin: '900px 0px' });
      io.observe(map);
    } else initFx();
  })();

  /* ------------------------------------------------------------------------
     Линейка: цены, модели, рельс света, модальные окна, размеры
     Цены меняются только здесь. null → «— ₸».
     ------------------------------------------------------------------------ */
  // ₸. Все цены — за размер 1600 × 2000 мм (Royal — фиксированная цена флагмана).
  const PRICES = { air: 125000, balance: 220000, prime: 280000, royal: 1250000 };
  const OLD_PRICES = { prime: 350000 };   // полная цена до скидки; нет ключа → скидки нет
  const discountPct = (k) => (OLD_PRICES[k] ? Math.round((1 - PRICES[k] / OLD_PRICES[k]) * 100) : 0);
  const WHATSAPP = '77079550808';
  const MODELS = {
    air: {
      name: 'Eluna Air',
      layers: [
        { kind: 'knit',    cm: 0.6, name: 'Вискозный трикотаж' },
        { kind: 'foam',    cm: 2,   name: 'Ортопена', spec: '20 мм' },
        { kind: 'felt',    cm: 0.6, name: 'Термовойлок', note: 'Долговечный, не сбивается и не собирает пыль внутри матраса' },
        { kind: 'springs', cm: 14,  name: 'Армированные пружины', note: 'Без эффекта гамака — тело лежит ровно, спина в балансе' },
        { kind: 'felt',    cm: 0.6, name: 'Термовойлок' },
        { kind: 'coir',    cm: 1,   name: 'Натуральный кокос', spec: '10 мм' },
        { kind: 'knit',    cm: 0.6, name: 'Вискозный трикотаж' },
      ],
    },
    balance: {
      name: 'Eluna Balance',
      layers: [
        { kind: 'knit',    cm: 0.6, name: 'Плотный вискозный трикотаж' },
        { kind: 'foam',    cm: 2,   name: 'Ортопена' },
        { kind: 'felt',    cm: 0.6, name: 'Термовойлок', note: 'Долговечный, не сбивается и не собирает пыль внутри матраса' },
        { kind: 'coir',    cm: 2,   name: 'Натуральный кокос', spec: '20 мм' },
        { kind: 'springs', cm: 14,  name: 'Армированные пружины', spec: 'усиленный боковой каркас', note: 'Без эффекта гамака — тело лежит ровно, спина в балансе' },
        { kind: 'felt',    cm: 0.6, name: 'Термовойлок' },
        { kind: 'coir',    cm: 1,   name: 'Натуральный кокос', spec: '10 мм' },
        { kind: 'foam',    cm: 1.5, name: 'Ортопена' },
        { kind: 'knit',    cm: 0.6, name: 'Плотный вискозный трикотаж' },
      ],
    },
    prime: {
      name: 'Eluna Prime',
      layers: [
        { kind: 'cotton',  cm: 1,   name: 'Чехол из 100 % хлопка', spec: 'ручная работа' },
        { kind: 'latex',   cm: 2,   name: 'Натуральный латекс', spec: '20 мм', note: 'Микромассажный эффект — тело расслабляется' },
        { kind: 'felt',    cm: 0.6, name: 'Термовойлок', note: 'Долговечный, не сбивается и не собирает пыль внутри матраса' },
        { kind: 'coir',    cm: 2,   name: 'Натуральный кокос', spec: '20 мм — отвечает за жёсткость' },
        { kind: 'springs', cm: 16,  name: 'Армированные пружины', note: 'Без эффекта гамака — тело лежит ровно, спина в балансе' },
        { kind: 'coir',    cm: 2,   name: 'Натуральный кокос', spec: '20 мм' },
        { kind: 'felt',    cm: 0.6, name: 'Термовойлок' },
        { kind: 'latex',   cm: 2,   name: 'Натуральный латекс', spec: '20 мм' },
        { kind: 'cotton',  cm: 1,   name: 'Чехол из 100 % хлопка' },
      ],
    },
    royal: { name: 'Eluna Royal', layers: null, dims: '1600 × 2000 мм' },
  };
  // уровни: метка и шкала света (1..4) — для карточек и силы прожектора
  const TIERS = [
    { key: 'air',     series: 'Air',     lvl: 1, tier: 'Базовая' },
    { key: 'balance', series: 'Balance', lvl: 2, tier: 'Pro' },
    { key: 'prime',   series: 'Prime',   lvl: 3, tier: `Выгода −${discountPct('prime')} %` },
    { key: 'royal',   series: 'Royal',   lvl: 4, tier: 'Флагман · индивидуально' },
  ];

  const fmtMoney = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
  const priceText = (p) => (p == null ? '— ₸' : typeof p === 'object' ? `${fmtMoney(p.from)}–${fmtMoney(p.to)} ₸` : `${fmtMoney(p)} ₸`);
  const priceHTML = (k, compact) => {
    const p = PRICES[k], old = OLD_PRICES[k];
    if (p == null || !old || typeof p === 'object') return priceText(p);
    if (compact) return `<s class="price-old">${fmtMoney(old)}</s> → ${fmtMoney(p)} ₸`;
    return `<s class="price-old">${fmtMoney(old)} ₸</s><span class="price-new">${fmtMoney(p)} ₸</span><span class="save">−${discountPct(k)} %</span>`;
  };
  const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  /* ------------------------------------------------------------------------
     Отзывы в окне «Подробнее» — бегущая лента + форма «Оставить отзыв».
     REVIEWS — только НАСТОЯЩИЕ отзывы покупателей (text, name, city, size, rate 1–5).
     Мнение специалиста — с его согласия: добавьте role (например, «Врач-ортопед»)
     и clinic — карточка получит отдельный бейдж «Мнение специалиста».
     Пока список пуст, в ленте аккуратные шаблоны «здесь появится отзыв».
     Новые отзывы с сайта приходят в WhatsApp — после проверки впишите их сюда.
     ------------------------------------------------------------------------ */
  const REVIEWS = {
    prime: [
      // { text: 'Текст отзыва покупателя', name: 'Имя', city: 'Алматы', size: '1600 × 2000', rate: 5 },
      // { text: 'Слова врача', name: 'Имя Фамилия', role: 'Врач-ортопед', clinic: 'Клиника, город' },
    ],
  };
  const stars = (n) => `<span class="rv__stars-row" aria-label="Оценка ${n} из 5">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
  function reviewCard(r, dup, kind) {
    const hide = dup ? ' aria-hidden="true"' : '';
    if (!r && kind === 'expert') return `<li class="rv__card rv__card--empty rv__card--expert"${hide}><span class="rv__badge">Мнение специалиста</span><blockquote><p>Здесь появится мнение врача-ортопеда о Eluna Prime.</p></blockquote><p class="rv__who"><b>Имя врача</b><span>Врач-ортопед · клиника</span></p></li>`;
    if (!r) return `<li class="rv__card rv__card--empty"${hide}><blockquote><p>Здесь появится отзыв покупателя Eluna Prime — о том, как изменился его сон.</p></blockquote><p class="rv__who"><b>Имя покупателя</b><span>Город · размер</span></p></li>`;
    const expert = !!r.role;
    const meta = expert ? [r.role, r.clinic].filter(Boolean).join(' · ') : [r.city, r.size].filter(Boolean).join(' · ');
    const rate = r.rate ? stars(Math.max(1, Math.min(5, Math.round(r.rate)))) : '';
    return `<li class="rv__card${expert ? ' rv__card--expert' : ''}${r.pending ? ' rv__card--pending' : ''}"${hide}>${expert ? '<span class="rv__badge">Мнение специалиста</span>' : ''}${r.pending ? '<span class="rv__badge rv__badge--pending">Ваш отзыв · на проверке</span>' : ''}${rate}<blockquote><p>${esc(r.text)}</p></blockquote><p class="rv__who"><b>${esc(r.name || 'Покупатель Eluna')}</b>${meta ? `<span>${esc(meta)}</span>` : ''}</p></li>`;
  }
  (function reviews() {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    document.querySelectorAll('[data-reviews]').forEach((vp) => {
      const key = vp.dataset.reviews;
      const track = vp.querySelector('.rv__track'); if (!track) return;
      const extra = [];   // отзыв, который посетитель только что отправил (виден только ему, с пометкой «на проверке»)
      const paint = () => {
        const real = extra.concat((REVIEWS[key] || []).filter((r) => r && r.text));
        const hasExpert = real.some((r) => r.role);
        const empties = Math.max(0, 5 - real.length) - (hasExpert ? 0 : 1);
        // карточка специалиста — второй в ленте, пока настоящей нет
        const list = real.map((r) => ({ r })).concat(Array.from({ length: Math.max(0, empties) }, () => ({ r: null })));
        if (!hasExpert) list.splice(Math.min(1, list.length), 0, { r: null, kind: 'expert' });
        track.innerHTML = list.map((x) => reviewCard(x.r, false, x.kind)).join('') + (reduceMotion ? '' : list.map((x) => reviewCard(x.r, true, x.kind)).join(''));
        vp.style.setProperty('--rv-dur', `${Math.max(28, list.length * 9)}s`);
      };
      paint();
      vp.classList.toggle('is-static', reduceMotion);
      const sec = vp.closest('.rv');
      const hint = sec.querySelector('.rv__hint');
      if (hint) hint.textContent = reduceMotion ? 'листайте вбок' : canHover ? 'наведите, чтобы остановить' : 'нажмите, чтобы остановить';
      // на телефоне наведения нет: касание ставит ленту на паузу и снимает её
      if (!reduceMotion) vp.addEventListener('click', () => vp.classList.toggle('is-paused'));

      // ---- форма «Оставить отзыв»: отзыв уходит в WhatsApp на проверку ----
      const btn = sec.querySelector('.rv__write'), form = sec.querySelector('.rv__form');
      if (!btn || !form) return;
      const rateBox = form.querySelector('.rv__rate'), err = form.querySelector('.rv__error'), thanks = form.querySelector('.rv__thanks');
      btn.addEventListener('click', () => {
        const show = form.hidden;
        form.hidden = !show; btn.setAttribute('aria-expanded', show ? 'true' : 'false');
        btn.textContent = show ? 'Свернуть форму' : 'Оставить отзыв';
        if (show) { thanks.hidden = true; requestAnimationFrame(() => { form.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); form.querySelector('input[name="name"]').focus({ preventScroll: true }); }); }
      });
      form.addEventListener('change', (e) => { if (e.target.name === 'rate') rateBox.dataset.value = e.target.value; });
      form.addEventListener('input', () => { if (!err.hidden) err.hidden = true; });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const name = String(fd.get('name') || '').trim(), city = String(fd.get('city') || '').trim(), text = String(fd.get('text') || '').trim();
        const rate = +fd.get('rate') || 5;
        const bad = !name ? 'Напишите, как вас зовут.' : text.length < 20 ? 'Пара предложений о сне на Eluna Prime — хотя бы 20 символов.' : '';
        err.hidden = !bad; err.textContent = bad;
        if (bad) { (name ? form.querySelector('textarea') : form.querySelector('input[name="name"]')).focus(); return; }
        const o = window.ELUNA_ORDER ? window.ELUNA_ORDER.get() : {};
        const size = o && o.model === key && o.w ? `${o.w} × ${o.h}` : '';
        const head = [`Отзыв о Eluna ${key[0].toUpperCase()}${key.slice(1)} — с сайта`, `Оценка: ${'★'.repeat(rate)}${'☆'.repeat(5 - rate)} (${rate}/5)`, `Имя: ${name}`, city && `Город: ${city}`, size && `Размер: ${size}`].filter(Boolean);
        const msg = `${head.join('\n')}\n\n«${text}»`;
        window.open(waLink(msg), '_blank', 'noopener');
        extra.unshift({ text, name, city, size, rate, pending: true });
        paint();
        form.reset(); rateBox.dataset.value = '5';
        thanks.hidden = false;
        btn.textContent = 'Оставить ещё отзыв'; btn.setAttribute('aria-expanded', 'true');
      });
    });
  })();

  (function lineup() {
    document.querySelectorAll('[data-price]').forEach((el) => { el.innerHTML = priceHTML(el.dataset.price, el.hasAttribute('data-compact')); });
    // под ценой в карточке — платёж в рассрочку 0 % на 12 месяцев
    document.querySelectorAll('.mcard__price').forEach((box) => {
      const el = box.querySelector('[data-price]'), p = el && PRICES[el.dataset.price];
      if (typeof p !== 'number' || box.querySelector('.mcard__night')) return;
      box.insertAdjacentHTML('beforeend', `<span class="mcard__night">или <span class="nw">${fmtMoney(p / 12)} ₸</span>/мес · рассрочка <span class="nw">0 %</span></span>`);
    });

    // метки уровня
    const meter = (lvl) => `<span class="lm" aria-hidden="true">${[1, 2, 3, 4].map((k) => `<i${k <= lvl ? ' class="on"' : ''}></i>`).join('')}</span>`;
    document.querySelectorAll('[data-tier]').forEach((el) => {
      const t = TIERS.find((x) => x.key === el.dataset.tier);
      if (t) el.innerHTML = `<span class="tier" data-lvl="${t.lvl}"><span>${esc(t.tier)}</span>${meter(t.lvl)}</span>`;
    });

    // разрезы
    document.querySelectorAll('.xs[data-xs]').forEach((box) => {
      const m = MODELS[box.dataset.xs];
      if (!m || !m.layers) return;
      box.innerHTML = m.layers.map((l) => `
        <div class="xs__layer xs--${l.kind}">
          <div class="xs__fill" style="--cm:${l.cm}"></div>
          <div class="xs__text"><b>${esc(l.name)}</b>${l.spec ? `<span class="cm">${esc(l.spec)}</span>` : ''}${l.note ? `<span class="note">${esc(l.note)}</span>` : ''}</div>
        </div>`).join('');
    });

    /* рельс: выбранная карточка получает свет; остальные чуть в тени */
    const rail = document.getElementById('mrail');
    const track = document.getElementById('mcards');
    if (!rail || !track) return;
    const cards = Array.from(track.querySelectorAll('.mcard'));
    const keys = cards.map((c) => c.dataset.model);
    let cur = -1;
    function select(i) {
      if (i === cur || !cards[i]) return;
      cur = i;
      cards.forEach((c, k) => { c.classList.toggle('is-on', k === i); c.classList.toggle('is-dim', k !== i); });
      const r = rail.getBoundingClientRect(), cr = cards[i].getBoundingClientRect();
      const t = TIERS.find((x) => x.key === keys[i]) || { lvl: 2 };
      Light.aim('rail', Math.min(1, Math.max(0, (cr.left + cr.width / 2 - r.left) / Math.max(1, r.width))), 0.5, 0.5 + t.lvl * 0.12);
      // цвет прожектора по уровню: Balance — холодное серебро, Prime — тёплое золото, Royal — смесь
      rail.style.setProperty('--lc', keys[i] === 'prime' ? 'var(--warm)' : keys[i] === 'royal' ? '190, 170, 230' : 'var(--cool)');
    }
    Light.on((L) => {
      if (isMobile()) return;   // большой градиент перерисовывается при каждом изменении — на телефоне он статичен
      rail.style.setProperty('--lx', `${(L.x * 100).toFixed(2)}%`);
      rail.style.setProperty('--li', L.i.toFixed(3));
    });
    cards.forEach((c, i) => {
      c.addEventListener('mouseenter', () => { if (!isMobile()) select(i); });
      c.addEventListener('focusin', () => select(i));
      c.addEventListener('click', (e) => { if (!e.target.closest('a,button')) select(i); });
    });
    // телефон: лента со снапом — центральная карточка становится выбранной
    function centerCard(el) {
      if (!isMobile() || !el) return;
      requestAnimationFrame(() => {
        track.scrollTo({ left: el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2, behavior: 'instant' });
        markCenter();
      });
    }
    function markCenter() {
      if (!isMobile()) { cards.forEach((m) => m.classList.remove('is-center')); return; }
      const mid = track.scrollLeft + track.clientWidth / 2;
      let best = -1, bd = 1e9;
      cards.forEach((m, k) => { const d = Math.abs(m.offsetLeft + m.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
      cards.forEach((m, k) => m.classList.toggle('is-center', k === best));
      if (best >= 0) select(best);
    }
    let mcRaf = 0;
    track.addEventListener('scroll', () => { if (!mcRaf) mcRaf = requestAnimationFrame(() => { mcRaf = 0; markCenter(); }); }, { passive: true });
    resizeHooks.push(() => { centerCard(cards[cur < 0 ? 2 : cur]); if (cur >= 0) { const k = cur; cur = -1; select(k); } });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        if (!es[0].isIntersecting) return;
        Light.claim('rail');
        const k = cur < 0 ? 2 : cur; cur = -1; select(k);
      }, { threshold: 0.2 }).observe(rail);
    }
    select(2);
    centerCard(cards[2]);

    /* «Подробнее» — модальные окна */
    const openers = document.querySelectorAll('[data-open]');
    openers.forEach((b) => b.addEventListener('click', () => {
      const dlg = document.getElementById(b.dataset.open);
      if (!dlg) return;
      openDialog(dlg, b);
    }));
    function openDialog(dlg, opener) {
      if (dlg.open) return;
      dlg._opener = opener || document.activeElement;
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      root.classList.add('is-modal');                // страница под окном не прокручивается
      dlg.scrollTop = 0;
      if (!reduceMotion) gsap.fromTo(dlg, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .4, ease: 'power3.out', clearProps: 'transform' });
    }
    document.querySelectorAll('dialog.mdl').forEach((dlg) => {
      let downOnBackdrop = false;
      dlg.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === dlg; });
      dlg.addEventListener('click', (e) => { if (e.target === dlg && downOnBackdrop) dlg.close(); downOnBackdrop = false; });
      dlg.addEventListener('close', () => {
        if (!document.querySelector('dialog.mdl[open]')) root.classList.remove('is-modal');
        const o = dlg._opener; if (o && o.focus) o.focus({ preventScroll: true });
      });
    });
    window.ELUNA_openDialog = openDialog;
    // ссылка вида …#privacy на элемент внутри окна — открыть окно (встроенные документы в едином файле)
    const openFromHash = () => {
      const t = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      const d = t && t.closest('dialog'); if (d) openDialog(d);
    };
    window.addEventListener('hashchange', openFromHash);
    openFromHash();

    // липкая плашка Prime на телефоне — пока на экране секция моделей
    const sticky = document.getElementById('stickyCta');
    const modelsSection = document.getElementById('models');
    if (sticky && modelsSection && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const on = en.isIntersecting;
          sticky.classList.toggle('is-on', on);
          sticky.setAttribute('aria-hidden', on ? 'false' : 'true');
          sticky.querySelector('a').tabIndex = on ? 0 : -1;
        });
      }, { threshold: 0.05 }).observe(modelsSection);
    }
  })();

  /* ------------------------------------------------------------------------
     Заказ: модель → размер → город → WhatsApp. Одно состояние order, хранится
     в localStorage (если доступен) и рисуется во всех местах сразу:
     секция «Размер», «Ваш выбор» у карты, итог внизу, липкая кнопка, ссылки WhatsApp.
     Цена: 1600 × 2000 — базовая; каждый м² сверх 3,2 м² — +40 000 ₸ (1800 × 2000 = +16 000 ₸);
     округление до 1 000 ₸.
     ------------------------------------------------------------------------ */
  (function orderFlow() {
    const KEY = 'eluna-order-v1';
    const W = { min: 1400, max: 2200 }, H = { min: 1900, max: 2200 };
    const clampN = (v, a, b) => Math.min(b, Math.max(a, Math.round(v / 10) * 10 || a));
    let order = { model: 'prime', w: 1600, h: 2000, custom: false, city: '' };
    try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && MODELS[saved.model]) order = Object.assign(order, saved); } catch (e) { /* без хранилища — по умолчанию */ }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(order)); } catch (e) { /* приватный режим */ } };

    // 1800 × 2000 дороже 1600 × 2000 на 16 000 ₸ (+0,4 м²) → 40 000 ₸ за каждый м² сверх/меньше 3,2 м².
    // Свой размер считается так же по площади; старая цена (Prime) — та же скидка в процентах.
    const PER_M2 = 40000;
    function priceOf(o) {
      const base = PRICES[o.model], old = OLD_PRICES[o.model];
      if (base == null || typeof base === 'object') return { v: null, o: null };
      const dA = (o.w * o.h) / 1e6 - 3.2;
      const v = Math.round((base + dA * PER_M2) / 1000) * 1000;
      return { v, o: old ? Math.round(v * old / base / 1000) * 1000 : null };
    }
    const sizeText = (o) => `${o.w} × ${o.h} мм`;
    const cityText = (c) => (!c ? 'город не выбран' : c === 'Алматы' ? 'Алматы — привезём и установим сами' : `${c} — от 7 дней до двери`);

    function message(o, extra) {
      const p = priceOf(o);
      const lines = [
        'Здравствуйте! Хочу заказать матрас ELUNA.',
        `Модель: ${MODELS[o.model].name}`,
        `Размер: ${sizeText(o)}${o.custom ? ' (свой размер, изготовление 21 день)' : ''}`,
        `Цена: ${p.v == null ? 'уточнить' : `${fmtMoney(p.v)} ₸`}${p.o ? ` (без скидки ${fmtMoney(p.o)} ₸, −${discountPct(o.model)} %)` : ''}`,
        `Доставка: ${cityText(o.city)}`,
      ];
      if (extra) {
        if (extra.name) lines.push(`Имя: ${extra.name}`);
        if (extra.phone) lines.push(`Телефон: ${extra.phone}`);
        if (extra.note) lines.push(`Комментарий: ${extra.note}`);
      }
      return lines.join('\n');
    }

    // ---- секция «Размер» ----
    const models = Array.from(document.querySelectorAll('#cfgModels [data-m]'));
    const opts = Array.from(document.querySelectorAll('#sizeOptions button'));
    const custom = document.getElementById('cfgCustom');
    const rW = document.getElementById('cfgW'), rH = document.getElementById('cfgH');
    const nW = document.getElementById('cfgWn'), nH = document.getElementById('cfgHn');
    const mat = document.getElementById('sizePreviewMat');
    [models, opts].forEach((g) => g.forEach((b, i) => b.addEventListener('keydown', (e) => {
      const n = g.length;
      const j = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % n : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
      if (j < 0) return;
      e.preventDefault(); g[j].focus(); g[j].click();
    })));
    const pvW = document.getElementById('sizePreviewW'), pvH = document.getElementById('sizePreviewH');
    const priceEl = document.getElementById('sizePrice'), oldEl = document.getElementById('sizeOld');
    const monthlyEl = document.getElementById('sizeMonthly');
    const shown = { v: 0, o: 0 };

    function render(animate) {
      const o = order, p = priceOf(o), name = MODELS[o.model].name;
      models.forEach((b) => b.setAttribute('aria-checked', b.dataset.m === o.model ? 'true' : 'false'));
      opts.forEach((b) => b.setAttribute('aria-checked', (b.hasAttribute('data-custom') ? o.custom : !o.custom && +b.dataset.w === o.w && +b.dataset.h === o.h) ? 'true' : 'false'));
      [models, opts].forEach((g) => { const on = g.find((b) => b.getAttribute('aria-checked') === 'true') || g[0]; g.forEach((b) => { b.tabIndex = b === on ? 0 : -1; }); });
      if (custom) custom.hidden = !o.custom;
      [[rW, nW, o.w], [rH, nH, o.h]].forEach(([r, n, v]) => { if (r && +r.value !== v) r.value = v; if (n && document.activeElement !== n && +n.value !== v) n.value = v; });
      const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
      set('sizeModel', name); set('sizeLabel', `${o.w} × ${o.h}`);
      if (pvW) pvW.textContent = o.w; if (pvH) pvH.textContent = o.h;
      // превью: 2200 мм по большей стороне = 76 % поля
      if (mat) gsap.to(mat, { width: `${(o.w / 2200) * 76}%`, height: `${(o.h / 2200) * 76}%`, duration: animate && !reduceMotion ? 0.8 : 0, ease: 'power3.inOut', overwrite: 'auto' });
      const paint = () => {
        if (priceEl) priceEl.textContent = p.v == null ? '—' : fmtMoney(shown.v);
        if (oldEl) oldEl.textContent = p.o ? `${fmtMoney(shown.o)} ₸` : '';
        if (monthlyEl) monthlyEl.textContent = p.v == null ? '—' : fmtMoney(shown.v / 12);
      };
      if (p.v != null && animate && !reduceMotion) gsap.to(shown, { v: p.v, o: p.o || 0, duration: 0.7, ease: 'power2.out', onUpdate: paint, overwrite: 'auto' });
      else { shown.v = p.v || 0; shown.o = p.o || 0; paint(); }

      // «Ваш выбор» у карты, итог внизу, липкая кнопка
      const nw = (t) => `<span class="nw">${esc(t)}</span>`;
      const opt = document.getElementById('orderPickText');
      if (opt) opt.innerHTML = `${esc(name)} · ${nw(sizeText(o))}${p.v == null ? '' : ` · ${nw(`${fmtMoney(p.v)} ₸`)}`}`;
      const sum = document.getElementById('checkoutSum');
      if (sum) {
        sum.querySelector('[data-o="model"]').textContent = name;
        sum.querySelector('[data-o="size"]').innerHTML = nw(sizeText(o)) + (o.custom ? ' · свой' : '');
        sum.querySelector('[data-o="price"]').innerHTML = p.v == null ? 'уточнит мастер' : `${p.o ? `<s class="price-old">${fmtMoney(p.o)}</s> ` : ''}${nw(`${fmtMoney(p.v)} ₸`)}`;
        sum.querySelector('[data-o="city"]').textContent = cityText(o.city);
      }
      const sticky = document.getElementById('stickyText');
      // цена — отдельным золотым span, как в карточке Prime
      if (sticky) sticky.innerHTML = `${esc(name)} · ${nw(`${o.w}×${o.h}`)}${p.v == null ? '' : ` — <span class="price-new nw">${fmtMoney(p.v)} ₸</span>`}`;
      // все ссылки WhatsApp несут текущий выбор (модель — своя у кнопки)
      document.querySelectorAll('[data-wa]').forEach((a) => { a.href = waLink(message(Object.assign({}, o, { model: a.dataset.wa }))); });
      const co = document.getElementById('checkoutWa'); if (co) co.href = waLink(message(o));
      // таблицы размеров в окнах «Подробнее»
      document.querySelectorAll('.size-table[data-sizes]').forEach((box) => {
        const m = box.dataset.sizes;
        const row = (w, h, cust, label) => {
          const pr = priceOf({ model: m, w, h, custom: cust });
          const on = o.model === m && (cust ? o.custom : !o.custom && o.w === w && o.h === h);
          return `<button type="button" class="size-row${on ? ' is-on' : ''}" data-pick="${m}" data-w="${w}" data-h="${h}"${cust ? ' data-custom' : ''}><span>${label}</span><b>${cust ? 'по площади' : pr.v == null ? '—' : `${fmtMoney(pr.v)} ₸`}</b></button>`;
        };
        box.innerHTML = row(1600, 2000, false, '1600 × 2000 мм') + row(1800, 2000, false, '1800 × 2000 мм') + row(o.custom && o.model === m ? o.w : 1700, o.custom && o.model === m ? o.h : 2000, true, 'Свой размер →');
      });
    }
    function update(patch, animate) { Object.assign(order, patch); save(); render(animate !== false); }
    const goSizes = () => { const el = document.getElementById('sizes'); if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); };

    models.forEach((b) => b.addEventListener('click', () => update({ model: b.dataset.m })));
    opts.forEach((b) => b.addEventListener('click', () => {
      if (b.hasAttribute('data-custom')) update({ custom: true });
      else update({ custom: false, w: +b.dataset.w, h: +b.dataset.h });
    }));
    [[rW, 'w', W], [rH, 'h', H]].forEach(([r, k, lim]) => { if (r) r.addEventListener('input', () => update({ custom: true, [k]: clampN(+r.value, lim.min, lim.max) })); });
    [[nW, 'w', W], [nH, 'h', H]].forEach(([n, k, lim]) => {
      if (!n) return;
      n.addEventListener('change', () => { n.value = clampN(+n.value, lim.min, lim.max); update({ custom: true, [k]: +n.value }); });
    });
    // «Выбрать» на карточках и строки размеров в окнах: выбор → к секции «Размер»
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]');
      if (!b) return;
      const patch = { model: b.dataset.pick };
      if (b.dataset.w) Object.assign(patch, { w: +b.dataset.w, h: +b.dataset.h, custom: b.hasAttribute('data-custom') });
      const dlg = b.closest('dialog');
      update(patch);
      if (dlg && dlg.open) { dlg._opener = null; dlg.close(); }
      requestAnimationFrame(goSizes);
      if (e.detail === 0 || dlg) {   // с клавиатуры или из окна — фокус туда, куда приехали
        const f = document.querySelector('#sizeOptions [aria-checked="true"]');
        if (f) setTimeout(() => f.focus({ preventScroll: true }), 60);
      }
    });
    // город с карты
    document.addEventListener('eluna:city', (e) => { if (order.city !== e.detail) update({ city: e.detail }, false); });
    const cur = document.querySelector('#map .city.is-on');
    if (order.city) document.dispatchEvent(new CustomEvent('eluna:setcity', { detail: order.city }));
    else if (cur) order.city = cur.dataset.city;
    render(false);

    // ---- оформление в WhatsApp ----
    window.ELUNA_ORDER = { get: () => Object.assign({}, order), message: () => message(order) };
  })();

  /* буквы заголовков — отдельные span, чтобы отвечать на курсор / палец лунным светом */
  (function glowLetters() {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine && !reduceMotion) {
      let lit = [];
      const touchGlow = (e) => {
        const t = e.touches[0]; if (!t) return;
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if (!el || !el.classList.contains('char')) return;
        Array.from(el.parentElement.children).forEach((c) => { if (Math.abs(c.getBoundingClientRect().x - t.clientX) < 28) { c.classList.add('is-lit'); lit.push(c); } });
        if (lit.length > 24) lit.splice(0, lit.length - 24).forEach((c) => c.classList.remove('is-lit'));
      };
      const fade = () => { lit.forEach((c) => c.classList.remove('is-lit')); lit = []; };
      document.addEventListener('touchmove', touchGlow, { passive: true });
      document.addEventListener('touchstart', touchGlow, { passive: true });
      document.addEventListener('touchend', () => setTimeout(fade, 500), { passive: true });
    }
    const targets = document.querySelectorAll('.hero-title, .concept__text, .section-title, .motion__title, .delivery__title, .cta__title, .mcard__title, .statement');
    const wrap = (node) => {
      const outer = document.createDocumentFragment();
      const sr = document.createElement('span'); sr.className = 'sr-only split-sr'; sr.textContent = node.textContent;
      const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
      outer.appendChild(sr); outer.appendChild(vis);
      const frag = vis;
      node.textContent.split(/([ \t\n\r\f]+)/).forEach((part) => {
        if (!part) return;
        if (/^[ \t\n\r\f]+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const w = document.createElement('span'); w.className = 'word';
        for (const ch of part) { const sp = document.createElement('span'); sp.className = 'char'; sp.textContent = ch; w.appendChild(sp); }
        frag.appendChild(w);
      });
      node.replaceWith(outer);
    };
    // разбивка на буквы — после интро, в простое: это сотни элементов, и делать её посреди анимации незачем
    afterIntro(() => targets.forEach((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const texts = []; while (walker.nextNode()) if (walker.currentNode.textContent.trim()) texts.push(walker.currentNode);
      texts.forEach(wrap);
    }));
  })();

  /* числа считают вверх при появлении */
  (function countUp() {
    const els = document.querySelectorAll('[data-count]');
    if (!els.length || reduceMotion || !('IntersectionObserver' in window)) return;
    const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target, to = +el.dataset.count, o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); }, onComplete: () => { el.textContent = fmt(to); } });
      });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  })();

  /* появление блоков — IntersectionObserver */
  (function reveals() {
    const els = Array.from(document.querySelectorAll('.reveal, .manifesto__text'));
    const show = (el) => el.classList.add('is-in');
    if (reduceMotion || !('IntersectionObserver' in window)) { els.forEach(show); return; }
    let queue = [], flushing = false;
    const flush = () => {
      queue.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
        .forEach((el, i) => { el.style.transitionDelay = `${Math.min(i, 5) * 0.09}s`; show(el); });
      queue = []; flushing = false;
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { queue.push(en.target); io.unobserve(en.target); } });
      if (queue.length && !flushing) { flushing = true; requestAnimationFrame(flush); }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
    els.forEach((el) => io.observe(el));
    setTimeout(() => els.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) show(el); }), 1200);
  })();

  // плавный скролл по якорям; цель внутри окна — открыть окно
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      // якорь — повод закончить интро сразу
      if (E.stage) { E.stage.intro.progress(1); E.stage.finishIntro(); } else body.classList.remove('is-intro');
      const dlg = target.closest('dialog');
      if (dlg) { window.ELUNA_openDialog(dlg, a); return; }
      let y = id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 40;
      const fit = window.innerWidth >= 1100 && target.hasAttribute('data-anchor-fit') && target.querySelector('.container');
      if (fit) {
        // секция целиком: от верха сетки до низа картинки с переключателем — по центру под меню, если помещается
        const g = fit.getBoundingClientRect(), navH = (document.getElementById('nav') || {}).offsetHeight || 72;
        const top = g.top + window.scrollY, h = g.height, avail = window.innerHeight - navH;
        y = top - navH - (h <= avail - 16 ? (avail - h) / 2 : 8);
      }
      E.scroll.to(y);
      if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
    });
  });

  // эмуляция телефона / поздний viewport meta: если ширина успела измениться — пересчитать всё
  requestAnimationFrame(E.syncSize);
})();
