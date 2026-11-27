/* RICCA · новогодний вайб на первом экране (24 ноября, владелец: «новогодний вайб»).
   Работает, только когда у <html> есть data-ny — его ставит js/season.js с 1 декабря по 14 января (заранее — ?ny=1).
   Первый экран сайта — заголовок и линейные рисунки категорий на светлом (зимой — светло-голубом) фоне. Поэтому:
   1) поздравление над заголовком: до праздника «С наступающим 2027», после 1 января «С Новым 2027 годом»;
   2) снежинки тонкой линией 1,1 px, тем же чернилом, что рисунки категорий, — медленно падают и чуть поворачиваются.
      Прозрачные (0,12–0,3), их немного: 10–26 по площади экрана; лежат под текстом и рисунками, к низу блока сходят на нет.
      Холст 2D (не WebGL). Если на первом экране фото (?hero=1|2), снег — мягкие белые точки над фото, под текстом.
   Бесконечное движение — то же исключение, что смена кадров первого экрана (DESIGN.md, 3.2, п. 10): снег стоит, когда блок
   прокручен, вкладка в фоне или нажата пауза кадров; при «меньше движения» снега нет. Стартует после того, как рисунки
   категорий нарисовались, — один заметный эффект за раз. Без JS ничего не меняется. */
(() => {
  'use strict';
  const root = document.documentElement, ny = root.dataset.ny;
  if (!ny) return;
  const EN = root.lang === 'en';
  const photo = root.dataset.hero && root.dataset.hero !== '0' ? document.querySelector('.hero') : null;
  const box = photo || document.querySelector('#catalog .intro');
  if (!box) return;

  /* ---------- поздравление ---------- */
  let year = new Date().getFullYear();
  if (ny === 'pre' && new Date().getMonth() >= 10) year += 1;   // ноябрь (показ) и декабрь — наступающий год
  const text = ny === 'pre' ? (EN ? `Happy New Year ${year}` : `С наступающим ${year}`) : (EN ? `Happy New Year ${year}` : `С Новым ${year} годом`);
  if (photo) { const eye = photo.querySelector('.hero__eye'); if (eye) eye.textContent = text; }
  else {
    const h1 = box.querySelector('.intro__title');
    if (h1) { const p = document.createElement('p'); p.className = 'intro__ny'; p.textContent = text; h1.before(p); }
  }

  /* ---------- снег ---------- */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const host = photo ? photo.querySelector('.hero__media') : box;
  if (!host) return;
  const cv = document.createElement('canvas');
  cv.className = photo ? 'hero__snow' : 'intro__snow'; cv.setAttribute('aria-hidden', 'true');
  host.prepend(cv);
  if (photo) host.appendChild(cv);   // над фото и затемнением, под текстом
  const ctx = cv.getContext('2d');
  if (!ctx) { cv.remove(); return; }

  /* фото: мягкая белая точка — рисуем один раз и дальше только переносим */
  let dot = null;
  if (photo) {
    const SP = 32; dot = document.createElement('canvas'); dot.width = dot.height = SP;
    const g = dot.getContext('2d'), rg = g.createRadialGradient(SP / 2, SP / 2, 0, SP / 2, SP / 2, SP / 2);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.45, 'rgba(255,255,255,.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, SP, SP);
  }
  const ink = getComputedStyle(box).color || '#0A0A0A';

  let W = 0, H = 0, dpr = 1, flakes = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const make = (y) => {
    if (photo) {
      const r = 0.7 + Math.pow(Math.random(), 2.2) * 2.1;   // больше мелких, редкие крупные: 0,7–2,8 px; крупные быстрее и ярче
      return { x: rnd(0, W), y: y == null ? rnd(-H, H) : y, r, vy: 14 + r * 13 + rnd(-3, 3), vx: rnd(-3, 5), amp: rnd(4, 16), fr: rnd(0.15, 0.45), ph: rnd(0, Math.PI * 2), a: Math.min(0.92, 0.3 + r * 0.22), rot: 0, vr: 0 };
    }
    const r = rnd(5, 11);   // радиус снежинки 5–11 px
    return { x: rnd(0, W), y: y == null ? rnd(-H * 0.2, H) : y, r, vy: 7 + r * 1.2 + rnd(-2, 2), vx: rnd(-2, 3), amp: rnd(5, 14), fr: rnd(0.08, 0.2), ph: rnd(0, Math.PI * 2),
      a: rnd(0.12, 0.3), rot: rnd(0, Math.PI), vr: rnd(-0.25, 0.25) };
  };
  /* снежинка линией: шесть лучей, на каждом — «галочка» ближе к концу */
  function flake(f, x) {
    ctx.save(); ctx.translate(x, f.y); ctx.rotate(f.rot);
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3, c = Math.cos(a), s = Math.sin(a), b = f.r * 0.58, t = f.r * 0.3;
      ctx.moveTo(0, 0); ctx.lineTo(c * f.r, s * f.r);
      for (const side of [-1, 1]) { const a2 = a + side * 0.75; ctx.moveTo(c * b, s * b); ctx.lineTo(c * b + Math.cos(a2) * t, s * b + Math.sin(a2) * t); }
    }
    ctx.stroke(); ctx.restore();
  }
  function size() {
    const rc = (photo || host).getBoundingClientRect();
    W = Math.max(1, Math.round(rc.width)); H = Math.max(1, Math.round(rc.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const n = photo ? Math.max(30, Math.min(90, Math.round((W * H) / 9000))) : Math.max(10, Math.min(26, Math.round((W * H) / 26000)));
    while (flakes.length < n) flakes.push(make());
    flakes.length = n;
    draw(0);
  }
  function draw(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!photo) { ctx.strokeStyle = ink; ctx.lineWidth = 1.1; ctx.lineCap = 'round'; }
    for (const f of flakes) {
      f.ph += f.fr * Math.PI * 2 * dt; f.rot += f.vr * dt;
      f.y += f.vy * dt; f.x += f.vx * dt;
      if (f.y - f.r * 3 > H) Object.assign(f, make(-f.r * 3 - rnd(0, 40)));
      if (f.x < -30) f.x += W + 60; else if (f.x > W + 30) f.x -= W + 60;
      const x = f.x + Math.sin(f.ph) * f.amp;
      ctx.globalAlpha = f.a;
      if (photo) { const d = f.r * 3.2; ctx.drawImage(dot, x - d / 2, f.y - d / 2, d, d); } else flake(f, x);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- когда идёт: блок виден, вкладка открыта, пауза кадров не нажата ---------- */
  const on = { view: true, tab: !document.hidden, pp: true };
  let raf = 0, t0 = 0, started = false;
  const loop = (t) => {
    const dt = t0 ? Math.min(0.05, (t - t0) / 1000) : 0;   // после паузы не «прыгаем»: шаг не больше 50 мс
    t0 = t; draw(dt); raf = requestAnimationFrame(loop);
  };
  const sync = () => {
    const go = started && on.view && on.tab && on.pp;
    if (go && !raf) { t0 = 0; raf = requestAnimationFrame(loop); }
    else if (!go && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { on.view = es[0].isIntersecting; sync(); }, { threshold: 0.05 }).observe(photo || host);
  document.addEventListener('visibilitychange', () => { on.tab = !document.hidden; sync(); });
  /* кнопка паузы смены кадров (js/hero.js, aria-pressed="true" — на паузе) останавливает и снег над фото */
  const ppState = () => { const b = photo && photo.querySelector('.hero__pp'); on.pp = !(b && b.getAttribute('aria-pressed') === 'true'); sync(); };
  if (photo) photo.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.hero__pp')) setTimeout(ppState, 0); });
  if ('ResizeObserver' in window) new ResizeObserver(() => size()).observe(photo || host); else window.addEventListener('resize', size);

  /* старт после загрузки и после рисования категорий (~1,8 с; занавес входа — ещё позже), появление — плавно, 1,2 с */
  const start = () => { started = true; size(); ppState(); requestAnimationFrame(() => cv.classList.add('is-on')); };
  const later = () => setTimeout(start, root.classList.contains('intro') ? 2600 : photo ? 300 : 1800);
  if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
})();
