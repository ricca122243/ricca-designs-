/*! © 2026 ELUNA · RICCA DESIGNS, Алматы. Все права защищены. Копирование без письменного разрешения запрещено. */
/* ==========================================================================
   ELUNA — сцена, свет, скролл, линейка
   Структура: качество устройства → свет (общий контроллер) → звёзды → сцена
   (интро, скролл, луна) → технология → модели (рельс, модальные окна,
   размеры) → доставка → прочее. Все resize-обработчики — через один конвейер.
   ========================================================================== */
(() => {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);
  // адресная строка телефона меняет высоту окна — это не повод пересчитывать пины посреди скролла
  ScrollTrigger.config({ ignoreMobileResize: true });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const body = document.body;
  const params = new URLSearchParams(location.search);
  const DEBUG = params.has('debug');

  /* ------------------------------------------------------------------------
     Один конвейер resize + isMobile(): перерисовки только при смене ширины
     или большом скачке высоты (адресная строка телефона — не повод).
     ------------------------------------------------------------------------ */
  const mq = window.matchMedia('(max-width: 899px)');
  let mobile = mq.matches;
  const isMobile = () => mobile;
  const resizeHooks = [];
  let rzRaf = 0, lastW = window.innerWidth, lastH = window.innerHeight;
  function onResize(force) {
    if (rzRaf) return;
    rzRaf = requestAnimationFrame(() => {
      rzRaf = 0;
      const w = window.innerWidth, h = window.innerHeight;
      const wChanged = w !== lastW, hBig = Math.abs(h - lastH) > 120;
      if (!force && !wChanged && !hBig) return;
      lastW = w; lastH = h;
      resizeHooks.forEach((f) => f(w, h, wChanged || force));
    });
  }
  window.addEventListener('resize', () => onResize(false));
  mq.addEventListener('change', (e) => { mobile = e.matches; onResize(true); });

  /* ------------------------------------------------------------------------
     Уровень качества: HIGH / MEDIUM / LOW. LOW — без мерцания звёзд
     и метеоров, кадры разлёта 1280×720.
     ------------------------------------------------------------------------ */
  function probeGL(force) {
    try {
      const c = document.createElement('canvas');
      const a = { failIfMajorPerformanceCaveat: !force };
      return !!(c.getContext('webgl2', a) || c.getContext('webgl', a));
    } catch (e) { return false; }
  }
  function detectTier() {
    const q = params.get('gl');
    if (q === 'off') return 'low';
    if (reduceMotion) return 'low';
    if (q === 'force') return 'high';
    if (!probeGL(false)) return 'low';
    const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
    const dpr = window.devicePixelRatio || 1, w = window.innerWidth;
    const save = navigator.connection && navigator.connection.saveData;
    let s = 0;
    s += mem >= 8 ? 2 : mem >= 4 ? 1 : 0;
    s += cores >= 8 ? 2 : cores >= 4 ? 1 : 0;
    s += w >= 1200 ? 1 : 0;
    s -= dpr >= 3 ? 1 : 0;
    if (save) s -= 2;
    return s >= 4 ? 'high' : s >= 2 ? 'medium' : 'low';
  }
  let TIER = detectTier();
  root.dataset.tier = TIER;

  /* ------------------------------------------------------------------------
     Слои матраса (сверху вниз) — для сцены и вкладки «Слои»
     ------------------------------------------------------------------------ */
  const LAYERS = [
    { key: 'cover',   cm: 1.5, num: '01', name: 'Стёганый чехол',        text: 'Органический хлопок с терморегулирующей нитью. Первый слой, который вы чувствуете — и единственный, который видите.', density: '320 г/м²', role: 'Микроклимат' },
    { key: 'latex',   cm: 3,   num: '02', name: 'Натуральный латекс',     text: 'Сок гевеи, вспененный по Dunlop. Перфорация в семи зонах пропускает воздух и мягко принимает плечи и бёдра.', density: '65 кг/м³', role: 'Комфорт' },
    { key: 'gel',     cm: 4,   num: '03', name: 'Memory-пена с гелем',    text: 'Запоминает контур тела за 4–6 секунд. Гелевые микрокапсулы отводят тепло к перфорированному латексу выше.', density: '50 кг/м³', role: 'Контур тела' },
    { key: 'coir',    cm: 3,   num: '04', name: 'Кокосовая койра',        text: 'Волокно, пропитанное латексом. Ортопедическая опора без ощущения доски — держит спину ровно, пока латекс держит плечи.', density: '110 кг/м³', role: 'Опора' },
    { key: 'hr',      cm: 4,   num: '05', name: 'Пена HR',                text: 'Высокоэластичная пена распределяет нагрузку между койрой и пружинами, чтобы ни одна точка не продавливалась первой.', density: '40 кг/м³', role: 'Распределение' },
    { key: 'springs', cm: 12,  num: '06', name: 'Независимые пружины',    text: '1 200 пружин в индивидуальных карманах, семь зон жёсткости. Каждая работает сама по себе — партнёр не почувствует, как вы повернулись. Карманы из нетканого полотна: металл не касается металла, матрас не скрипит.', density: '500 шт/м²', role: 'Независимость' },
    { key: 'base',    cm: 2.5, num: '07', name: 'Армированное основание', text: 'Плотная пена с усиленным периметром. Матрас не «сползает» к краям и держит форму все пятнадцать лет гарантии.', density: '35 кг/м³', role: 'Геометрия' },
  ];

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
    const tx = gsap.quickTo(st, 'x', { duration: .9, ease: 'power3.out', onUpdate: emit });
    const ty = gsap.quickTo(st, 'y', { duration: .9, ease: 'power3.out', onUpdate: emit });
    const ti = gsap.quickTo(st, 'i', { duration: .7, ease: 'power2.out', onUpdate: emit });
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
     Звёздное небо. Статичный слой рисуется один раз на ширину экрана;
     мерцание — по таймеру и только пока сцена на экране и вкладка активна;
     метеор — короткий rAF, пока летит. Нет вечного цикла.
     ------------------------------------------------------------------------ */
  const stars = (function stars() {
    const far = document.getElementById('stars');
    if (!far) return { setVisible() {} };
    const moonEl = document.getElementById('moonBig');
    // ближний слой (яркие звёзды с ореолом) и мерцание — отдельные canvas
    const near = document.createElement('canvas');
    near.className = 'stars stars--near'; near.setAttribute('aria-hidden', 'true');
    const twinkle = document.createElement('canvas');
    twinkle.className = 'stars stars--twinkle'; twinkle.setAttribute('aria-hidden', 'true');
    far.after(near); near.after(twinkle);
    const fctx = far.getContext('2d'), nctx = near.getContext('2d'), tctx = twinkle.getContext('2d');
    // узор рисуется один раз во временный canvas и кладётся дважды подряд — слой шириной 2 экрана
    const tile = document.createElement('canvas'); const tctx0 = tile.getContext('2d');

    let w = 0, h = 0, H = 0, dpr = 1, flick = [], meteors = [], visible = true, meteorRaf = 0, driftRaf = 0, lastT = 0, scrollY0 = 0;
    const OVER = 1.18;
    // дрейф неба, px/с: ближний слой заметно быстрее дальнего — появляется глубина. Только transform: ни одной перерисовки.
    const DRIFT = { far: -3.4, near: -10 };
    const off = { far: 0, near: 0, farY: 0, nearY: 0 };
    const wrap = (v, m) => ((v % m) + m) % m;
    const tint = (t) => {
      if (t < 0.25) return [196, 208, 255];
      if (t < 0.7) return [245, 243, 238];
      if (t < 0.92) return [255, 236, 205];
      return [255, 208, 160];
    };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const density = () => (TIER === 'high' ? 3200 : TIER === 'medium' ? 5000 : 8000) * (isMobile() ? 1.56 : 1);

    function paintLayer(ctx, kind) {
      tile.width = Math.round(w * dpr); tile.height = Math.round(H * dpr);
      tctx0.setTransform(dpr, 0, 0, dpr, 0, 0); tctx0.clearRect(0, 0, w, H);
      const mob = isMobile();
      if (kind === 'far') {
        // Млечный Путь: мягкие облака света вдоль диагонали (холодный край, тёплое ядро), рисуются один раз
        const clouds = mob ? 9 : 16;
        for (let i = 0; i < clouds; i++) {
          const u = (i + Math.random() * 0.8) / clouds;
          const x = u * w, y = H * (0.85 - u * 0.55) + (Math.random() - 0.5) * H * 0.16;
          const r = w * rnd(0.08, 0.2) * (mob ? 1.6 : 1);
          const core = Math.abs(u - 0.55) < 0.18;
          const c = core ? [255, 226, 196] : Math.random() < 0.5 ? [124, 146, 230] : [168, 150, 214];
          const g = tctx0.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${core ? 0.05 : 0.045})`);
          g.addColorStop(0.5, `rgba(${c[0]},${c[1]},${c[2]},${core ? 0.022 : 0.018})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          tctx0.fillStyle = g; tctx0.fillRect(x - r, y - r, r * 2, r * 2);
        }
        // пыль: очень мелкие слабые звёзды по всему небу — та же «зернистость», что на фото матраса
        const dust = Math.round((w * H) / (mob ? 1100 : 700) / (TIER === 'low' ? 2 : 1));
        for (let i = 0; i < dust; i++) {
          const c = tint(Math.random() * 0.8);
          tctx0.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${rnd(0.06, 0.3)})`;
          const s = Math.random() < 0.85 ? 0.7 : 1.1;
          tctx0.fillRect(Math.random() * w, Math.random() * H, s, s);
        }
        const band =Math.round((w * H) / (mob ? 2400 : 1400) / (TIER === 'low' ? 2 : 1));
        for (let i = 0; i < band; i++) {
          const u = Math.random();
          const g = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
          const x = u * w, y = H * (0.85 - u * 0.55) + g * H * 0.42;
          const c = tint(Math.random());
          tctx0.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${rnd(0.04, 0.16)})`;
          tctx0.fillRect(x, y, 1, 1);
        }
      }
      const n = Math.round((w * H) / density());
      for (let i = 0; i < n; i++) {
        const m = Math.pow(Math.random(), 3.2);
        if ((m > 0.5) !== (kind === 'near')) continue;
        const x = Math.random() * w, y = Math.random() * H;
        const r = 0.3 + m * 1.6, a = 0.25 + m * 0.7;
        const c = tint(Math.random());
        if (m > 0.72) {
          const g = tctx0.createRadialGradient(x, y, 0, x, y, r * 9);
          g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.2 * m})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          tctx0.fillStyle = g;
          tctx0.beginPath(); tctx0.arc(x, y, r * 9, 0, Math.PI * 2); tctx0.fill();
          if (m > 0.9) {
            tctx0.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.18 * m})`;
            tctx0.lineWidth = 0.6;
            tctx0.beginPath();
            tctx0.moveTo(x - r * 7, y); tctx0.lineTo(x + r * 7, y);
            tctx0.moveTo(x, y - r * 7); tctx0.lineTo(x, y + r * 7);
            tctx0.stroke();
          }
        }
        tctx0.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
        tctx0.beginPath(); tctx0.arc(x, y, r, 0, Math.PI * 2); tctx0.fill();
      }
      const el = ctx.canvas;
      el.width = tile.width * 2; el.height = tile.height;
      el.style.width = `${w * 2}px`; el.style.height = `${H}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(tile, 0, 0); ctx.drawImage(tile, tile.width, 0);
    }

    function size(full) {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight; H = Math.round(h * OVER);
      twinkle.width = w * dpr; twinkle.height = h * dpr;
      if (full) {
        paintLayer(fctx, 'far'); paintLayer(nctx, 'near');
        flick = Array.from({ length: Math.round(w / (isMobile() ? 56 : 32)) }, () => ({
          x: Math.random() * w, y: Math.random() * h,
          r: rnd(0.6, 1.4), c: tint(Math.random()),
          ph: Math.random() * Math.PI * 2, sp: rnd(0.4, 1.3), a: rnd(0.35, 0.8),
        }));
      }
      place();
      drawTwinkle(performance.now());
    }

    // положение слоёв: дрейф по x (с переносом в пределах ширины экрана), качание по y, параллакс скролла
    function place() {
      const sy = Math.min(H - h, scrollY0 * 0.035);
      far.style.transform = `translate3d(${(wrap(off.far, w) - w).toFixed(2)}px, ${(off.farY - sy).toFixed(2)}px, 0)`;
      near.style.transform = `translate3d(${(wrap(off.near, w) - w).toFixed(2)}px, ${(off.nearY - sy * 1.3).toFixed(2)}px, 0)`;
    }

    function drawTwinkle(now) {
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tctx.clearRect(0, 0, w, h);
      for (const p of flick) {
        const k = 0.45 + 0.55 * Math.sin(now * 0.0011 * p.sp + p.ph);
        const x = wrap(p.x + off.near, w), y = p.y + off.nearY;
        tctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.a * k})`;
        tctx.beginPath(); tctx.arc(x, y, p.r * (0.8 + 0.4 * k), 0, Math.PI * 2); tctx.fill();
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        const t = (now - m.t0) / 900;
        if (t >= 1) { meteors.splice(i, 1); continue; }
        const x = m.x + m.vx * t, y = m.y + m.vy * t;
        const g = tctx.createLinearGradient(x - m.vx * 0.12, y - m.vy * 0.12, x, y);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, `rgba(255,250,240,${0.9 * Math.sin(Math.PI * t)})`);
        tctx.strokeStyle = g; tctx.lineWidth = 1.2;
        tctx.beginPath(); tctx.moveTo(x - m.vx * 0.12, y - m.vy * 0.12); tctx.lineTo(x, y); tctx.stroke();
      }
    }

    // дрейф: пока сцена на экране и вкладка активна; на каждом кадре — только два transform
    function driftLoop(now) {
      driftRaf = 0;
      if (!visible || document.hidden || reduceMotion) { lastT = 0; return; }
      const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0; lastT = now;
      off.far += DRIFT.far * dt; off.near += DRIFT.near * dt;
      off.farY = Math.sin(now * 0.00004) * h * 0.004;
      off.nearY = Math.sin(now * 0.00007 + 1) * h * 0.014;
      // луна плывёт вместе с небом: медленное покачивание в такт дальнему слою.
      // Переменные — на самой луне, не на :root (иначе каждый кадр пересчитывались стили всей страницы), и только пока она видна
      if (moonEl && +(moonEl.style.opacity || 1) > 0.02) {
        moonEl.style.setProperty('--skyx', `${(Math.sin(now * 0.00003) * w * 0.012).toFixed(2)}px`);
        moonEl.style.setProperty('--skyy', `${(off.farY * 1.6).toFixed(2)}px`);
      }
      place();
      driftRaf = requestAnimationFrame(driftLoop);
    }
    function startDrift() {
      if (driftRaf || !visible || document.hidden || reduceMotion) return;
      lastT = 0;
      driftRaf = requestAnimationFrame(driftLoop);
    }

    // метеор: короткий цикл, заканчивается вместе со штрихом
    function meteorLoop(now) {
      meteorRaf = 0;
      if (!meteors.length) return;
      drawTwinkle(now);
      meteorRaf = requestAnimationFrame(meteorLoop);
    }
    let nextMeteor = performance.now() + rnd(3000, 8000);
    function tick() {
      if (document.hidden || !visible) return;
      const now = performance.now();
      if (now > nextMeteor && TIER !== 'low') {
        meteors.push({ x: rnd(0.1, 0.9) * w, y: rnd(0.05, 0.5) * h, vx: rnd(120, 240) * (Math.random() < 0.5 ? -1 : 1), vy: rnd(60, 130), t0: now });
        nextMeteor = now + rnd(5000, 12000);
        if (!meteorRaf) meteorRaf = requestAnimationFrame(meteorLoop);
      }
      if (!meteorRaf) drawTwinkle(now);
    }

    let ticking = false;
    function onScroll() {
      if (ticking || !visible) return;
      ticking = true;
      requestAnimationFrame(() => { scrollY0 = window.scrollY; place(); ticking = false; });
    }

    // фон рисуем в первом кадре — после разметки, до старта интро
    requestAnimationFrame(() => { size(true); startDrift(); });
    resizeHooks.push((w2, h2, wChanged) => size(wChanged));
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) startDrift(); });
    if (!reduceMotion) setInterval(tick, isMobile() ? 240 : TIER === 'high' ? 110 : 160);
    return { setVisible(v) { visible = v; if (v) startDrift(); } };
  })();

  /* ------------------------------------------------------------------------
     Состояние сцены. Интро (время) и скролл пишут в разные объекты,
     render() их сводит — так они никогда не спорят между собой.
     ------------------------------------------------------------------------ */
  const S = {
    cutO: 0, cutExp: 1, cutS: 1.04, cutX: 0, cutY: 0,
    spread: 0, focus: -1,
    spot: 0, spotY: 50,
    outY: 0, outS: 1, outExp: 1,
    dark: 0, brand: 0, moonO: 1, moonX: 0, moonY: 0, cueO: 1,
    wmS: 1, wmY: 0, wmO: 1,
    lightDrift: 0,
  };
  const I = { dark: 1, wmO: 1, cueO: 0, moon: 0, term: 30, ms: 1.06, mx: 2, hero: 1 };   // term 30 — луна входит уже освещённым серпом, не чёрным диском
  const P = { x: 0, y: 0 };

  const stageEl = document.getElementById('stage');
  const navEl = document.getElementById('nav');
  const wordmark = document.getElementById('wordmark');
  const exposure = document.getElementById('exposure');
  const productCut = document.getElementById('productCut');
  const seqSpot = document.getElementById('seqSpot');
  const seqDim = document.getElementById('seqDim');
  // запись стиля только при изменении значения — без лишнего пересчёта стилей на каждом кадре
  const sv = (el, p, v) => { const c = el.__sv || (el.__sv = {}); if (c[p] !== v) { c[p] = v; el.style[p] = v; } };
  const svar = (el, n, v) => { const c = el.__sv || (el.__sv = {}); if (c[n] !== v) { c[n] = v; el.style.setProperty(n, v); } };
  // прозрачность полноэкранных слоёв: при нуле слой прячется целиком — компоновщик его не считает (меньше слоёв на кадр)
  const svo = (el, v) => { sv(el, 'opacity', v); sv(el, 'visibility', +v > 0.004 ? 'visible' : 'hidden'); };
  const cue = document.getElementById('cue');
  const moonBig = document.getElementById('moonBig');
  const moonGlCanvas = document.getElementById('moonGl');
  // шар луны: WebGL, если устройство тянет; иначе остаётся картинка с CSS-терминатором
  let moonGL = null;
  function initMoonGL() {
    if (moonGL || TIER === 'low' || reduceMotion || !window.MoonGL || !moonGlCanvas) return;
    const inst = window.MoonGL.create({
      canvas: moonGlCanvas, tier: isMobile() ? 'medium' : TIER, force: params.get('gl') === 'force',
      // компьютер — карта 4096 (резкие кратеры на большой луне), телефон — 2048/1024
      src: !isMobile() ? 'img/moon-map-4096.webp' : TIER === 'high' ? 'img/moon-map-2048.webp' : 'img/moon-map-1024.webp',
      srcSmall: 'img/moon-map-2048.webp',
      onReady: () => { moonBig.classList.add('is-gl'); sizeMoonGL(); render(); },
      onFallback: () => { const g = moonGL; moonGL = null; moonBig.classList.remove('is-gl'); if (g) try { g.destroy(); } catch (e) { /* уже потерян */ } render(); },
    });
    if (!inst) return;
    moonGL = inst;
    sizeMoonGL();
  }
  function sizeMoonGL() {
    if (!moonGL) return;
    const r = moonBig.getBoundingClientRect();
    const d = Math.min(isMobile() ? 1.5 : 2, window.devicePixelRatio || 1);   // компьютер — до 2 (Retina), телефон — 1.5
    moonGL.resize(r.width * d, r.height * d);
  }
  // направление света из «процента терминатора» интро: −18 % — источник за шаром, 112 % — спереди-слева
  function lightFromTerm(t) {
    const k = Math.min(1, Math.max(0, (t + 18) / 130));
    const a = Math.PI * (1.0 - 0.72 * k);          // от 180° (сзади) к ≈50° (спереди-слева)
    return [-Math.sin(a) * 0.95, 0.3, Math.cos(a)];
  }

  /* ------------------------------------------------------------------------
     Разрез как последовательность кадров. Перерисовка только когда кадр,
     размер или число загруженных кадров изменились.
     ------------------------------------------------------------------------ */
  // кадры раскрытия (фото матраса → семь слоёв; видео Higgsfield по двум ключевым кадрам), 3:4:
  // HIGH — 1440×1920, MEDIUM — 1080×1440, LOW — 720×960. Кадр 1 — закрытый матрас
  const SEQ = TIER === 'high'
    ? { count: 36, w: 1440, h: 1920, base: 'img/layers/1440/', pad: 2, fallback: 'img/layers/1080/' }
    : TIER === 'medium'
      ? { count: 36, w: 1080, h: 1440, base: 'img/layers/1080/', pad: 2 }
      : { count: 36, w: 720, h: 960, base: 'img/layers/720/', pad: 2 };
  const seqCanvas = document.getElementById('seq');
  const seqCtx = seqCanvas.getContext('2d', { alpha: true });
  const frames = new Array(SEQ.count).fill(null);
  let seqLoaded = 0, seqStarted = false, seqDirty = true;
  const seqLast = { f: -1, w: 0, h: 0, loaded: 0 };

  function frameSrc(i, fb) { return `${fb ? SEQ.fallback : SEQ.base}f${String(i + 1).padStart(SEQ.pad, '0')}.webp`; }
  // кадр → готовая к рисованию картинка ровно размера canvas с уже вшитой виньеткой (ImageBitmap, иначе canvas).
  // Так в кадре анимации нет ни масштабирования, ни маски, ни повторного декодирования, а память — в 3–8 раз меньше,
  // чем у исходных картинок 1440×1920 (браузер на телефоне выгружал их и декодировал заново прямо во время «Открыть»)
  function fetchFrame(i) {
    return new Promise((res) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => (im.decode ? im.decode() : Promise.resolve()).then(() => res(im), () => res(im));
      // кадр 1440 не пришёл — берём тот же кадр из 1080 (геометрия та же)
      im.onerror = () => { if (SEQ.fallback && !im.dataset.fb) { im.dataset.fb = '1'; im.src = frameSrc(i, true); } else res(null); };
      im.src = frameSrc(i);
    });
  }
  function bakeFrame(im) {
    const w = seqCanvas.width, h = seqCanvas.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0, w, h);
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(seqVignette(w, h), 0, 0);
    if (!window.createImageBitmap) return Promise.resolve(c);
    return createImageBitmap(c).then((bm) => { c.width = c.height = 0; return bm; }, () => c);
  }
  let bakeGen = 0, bakeW = 0, bakeH = 0;
  function loadSeq() {
    if (seqStarted) return;
    seqStarted = true;
    bakeAll();
  }
  // загрузка (первым — закрытый матрас, потом раскрытый и середина) и запекание под текущий размер canvas
  function bakeAll() {
    const gen = ++bakeGen;
    bakeW = seqCanvas.width; bakeH = seqCanvas.height;
    const order = [0, SEQ.count - 1, Math.floor(SEQ.count / 2)];
    for (let i = 0; i < SEQ.count; i++) if (!order.includes(i)) order.push(i);
    let k = 0;
    const next = () => {
      if (k >= order.length || gen !== bakeGen) return;
      const i = order[k++];
      fetchFrame(i).then((im) => (im ? bakeFrame(im) : null)).then((fr) => {
        if (gen !== bakeGen) { if (fr && fr.close) fr.close(); return; }
        if (fr) {
          const old = frames[i];
          if (!old) seqLoaded++;
          frames[i] = fr;
          if (old && old.close) old.close();
          if (S.cutO > 0.001) { seqDirty = true; drawSeq(); }
        }
        next();
      });
      if (k < 3) next();
    };
    next();
  }
  function nearestFrame(i) {
    for (let d = 0; d < SEQ.count; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }
  function dprSeq() { return Math.min(1.5, window.devicePixelRatio || 1); }
  // геометрия кадра в device px относительно сцены; canvas имеет размер самого кадра (dw × dh), а не экрана.
  // Матрас на фото обрезан справа — кадр прижат к правому краю экрана, слева остаётся место под список слоёв (как на макете)
  function seqGeometry() {
    const d = dprSeq();
    const cw = Math.round(window.innerWidth * d), ch = Math.round(window.innerHeight * d);
    const mob = isMobile();
    let dw, dh;
    if (mob) {
      // телефон: кадр под заголовком, над кнопкой и списком
      dh = ch * 0.47; dw = dh * SEQ.w / SEQ.h;
      if (dw > cw * 0.9) { dw = cw * 0.9; dh = dw * SEQ.h / SEQ.w; }
      return { cw, ch, dw, dh, dx: cw - dw, dy: ch * 0.215 };
    }
    dh = ch; dw = dh * SEQ.w / SEQ.h;
    if (dw > cw * 0.58) { dw = cw * 0.58; dh = dw * SEQ.h / SEQ.w; }
    return { cw, ch, dw, dh, dx: cw - dw, dy: (ch - dh) * 0.5 };
  }
  function sizeSeq() {
    const d = dprSeq();
    const g = seqGeometry();
    seqCanvas.width = Math.round(g.dw); seqCanvas.height = Math.round(g.dh);
    seqCanvas.style.left = `${(g.dx / d).toFixed(1)}px`; seqCanvas.style.top = `${(g.dy / d).toFixed(1)}px`;
    seqCanvas.style.width = `${(g.dw / d).toFixed(1)}px`; seqCanvas.style.height = `${(g.dh / d).toFixed(1)}px`;
    placeSeqLabels(g.dx / d, g.dy / d, g.dw / d, g.dh / d);
    seqDirty = true;
    if (S.cutO > 0.001) drawSeq();
    // размер canvas поменялся — кадры перепекаются (пока идёт — рисуются прежние с масштабом)
    if (seqStarted && (seqCanvas.width !== bakeW || seqCanvas.height !== bakeH)) {
      clearTimeout(sizeSeq.t); sizeSeq.t = setTimeout(bakeAll, 400);
    }
  }
  function markSeq() {
    const f = Math.min(1, Math.max(0, S.spread)) * (SEQ.count - 1);
    if (Math.abs(f - seqLast.f) > 0.015 || seqCanvas.width !== seqLast.w || seqCanvas.height !== seqLast.h || seqLoaded !== seqLast.loaded) {
      seqLast.f = f; seqLast.w = seqCanvas.width; seqLast.h = seqCanvas.height; seqLast.loaded = seqLoaded;
      seqDirty = true;
    }
  }
  let vigCache = { w: 0, h: 0, c: null };
  function seqVignette(w, h) {
    if (vigCache.w === w && vigCache.h === h && vigCache.c) return vigCache.c;
    // край кадра растворяется в небе страницы: слева широко (там текст), сверху и снизу мягко, справа — узкая кромка у края экрана
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    const gx = x.createLinearGradient(0, 0, w, 0);
    gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.2, 'rgba(0,0,0,.55)'); gx.addColorStop(0.36, 'rgba(0,0,0,1)'); gx.addColorStop(0.97, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,.6)');
    x.fillStyle = gx; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-in';
    const gy = x.createLinearGradient(0, 0, 0, h);
    gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.14, 'rgba(0,0,0,1)'); gy.addColorStop(0.84, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gy; x.fillRect(0, 0, w, h);
    vigCache = { w, h, c };
    return c;
  }
  function drawSeq() {
    if (!seqDirty || seqLoaded === 0) return;
    const cw = seqCanvas.width, ch = seqCanvas.height;
    const f = Math.min(1, Math.max(0, S.spread)) * (SEQ.count - 1);
    const i0 = Math.floor(f), t = f - i0;
    const a = nearestFrame(i0), b = frames[Math.min(SEQ.count - 1, i0 + 1)];
    seqCtx.globalCompositeOperation = 'source-over';
    seqCtx.globalAlpha = 1;
    seqCtx.clearRect(0, 0, cw, ch);
    // виньетка уже вшита в кадр (bakeFrame); между соседними кадрами — лёгкое смешивание
    if (a) seqCtx.drawImage(a, 0, 0, cw, ch);
    if (b && b !== a && t > 0.02) { seqCtx.globalAlpha = t; seqCtx.drawImage(b, 0, 0, cw, ch); seqCtx.globalAlpha = 1; }
    seqDirty = false;
  }

  /* Слои в кадре: центр каждого слоя по вертикали, % высоты кадра (сняты по пикселям последнего кадра) —
     туда встаёт прожектор, когда выбран пункт списка */
  const SEQ_LAYER_Y = [29.2, 38.2, 45.0, 51.7, 58.5, 69.0, 78.7];
  let seqGeo = { dx: 0, dy: 0, dw: 1, dh: 1 };
  function placeSeqLabels(x, y, w, h) {
    seqGeo = { dx: x, dy: y, dw: w, dh: h };
    // прожектор — по центру кадра по горизонтали
    svar(seqSpot, '--sx', `${((x + w * 0.62) / window.innerWidth * 100).toFixed(2)}%`);
  }
  // где слой i лежит на экране (CSS px от верха сцены) на последнем кадре раскрытия
  function layerScreenY(i) { return seqGeo.dy + SEQ_LAYER_Y[i] / 100 * seqGeo.dh; }
  // центр прожектора (% высоты разреза)
  function spotY(i) { return layerScreenY(i) / window.innerHeight * 100; }
  const smoothstep = (v, a, b) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  /* Список слоёв слева (как на макете): номер, название, толщина. Строится из LAYERS */
  const lysEl = document.getElementById('lys');
  const SHORT = ['Чехол', 'Латекс', 'Гель', 'Койра', 'Пена HR', 'Пружины', 'Основание'];
  const lysItems = LAYERS.map((l, i) => {
    const li = document.createElement('li');
    li.style.setProperty('--i', i);
    li.innerHTML = `<button type="button" class="lys__item" data-i="${i}"><span class="lys__num">${l.num}</span><span class="lys__name" data-short="${SHORT[i]}">${l.name}</span><span class="lys__spec">${Math.round(l.cm * 10)} мм</span></button>`;
    lysEl.appendChild(li);
    return li.firstChild;
  });
  let activeLayer = -2;
  function setActiveLayer(i) {
    if (i === activeLayer) return;
    activeLayer = i;
    lysItems.forEach((el, k) => el.classList.toggle('is-active', k === i));
    lysEl.classList.toggle('is-focus', i >= 0);
  }

  /* ------------------------------------------------------------------------
     render(): сводит интро, скролл и указатель. Переменные пишутся на
     владельцев (сцена, разрез, nav), не на :root.
     ------------------------------------------------------------------------ */
  let stageOff = false;
  function render() {
    if (stageOff) return;
    const vw = window.innerWidth, vh = window.innerHeight;

    // луна: проявляется терминатором в интро, по скроллу уходит вправо-вверх и гаснет; лёгкий параллакс от указателя
    sv(moonBig, 'opacity', (I.moon * S.moonO).toFixed(3));   // без visibility: шар и фото всегда в слое, ничего не теряется
    svar(moonBig, '--term', `${I.term.toFixed(2)}%`);
    if (moonGL) {
      // луна ушла со сцены — шар спит и не тратит кадры на расслойку
      const vis = S.moonO > 0.02;   // спит только когда луна ушла со сцены по скроллу, не во время входа
      if (vis) { moonGL.wake(); moonGL.set({ light: lightFromTerm(I.term), tiltY: -0.08 + P.x * 0.012, tiltX: 0.12 - P.y * 0.012 }); } else moonGL.sleep();
    }
    svar(moonBig, '--mpx', `${((S.moonX + I.mx) * vw / 100 - P.x * 3).toFixed(2)}px`);
    svar(moonBig, '--ms', I.ms.toFixed(4));
    svar(moonBig, '--mpy', `${(S.moonY * vh / 100 - P.y * 2.6).toFixed(2)}px`);
    svar(navEl, '--brand-o', S.brand.toFixed(3));
    svo(exposure, Math.max(I.dark, S.dark).toFixed(3));

    svo(productCut, S.cutO.toFixed(3));
    svo(seqDim, (1 - S.cutExp * S.outExp).toFixed(3));
    sv(productCut, 'transform', `translate3d(${(S.cutX * vw / 100).toFixed(2)}px, ${((S.cutY + S.outY) * vh / 100).toFixed(2)}px, 0) scale(${(S.cutS * S.outS).toFixed(4)})`);
    if (S.cutO > 0.001) { markSeq(); drawSeq(); }
    setActiveLayer(S.cutO > 0.5 && S.spread > 0.9 ? Math.round(S.focus) : -1);
    svo(seqSpot, S.spot.toFixed(3));
    svar(seqSpot, '--sy', `${S.spotY.toFixed(2)}%`);

    sv(wordmark, 'transform', `translate(0, calc(-50% + ${S.wmY.toFixed(3)}vh)) scale(${S.wmS.toFixed(4)})`);
    svo(wordmark, (S.wmO * I.wmO * I.hero).toFixed(3));
    svo(cue, (S.cueO * I.cueO).toFixed(3));
  }

  sizeSeq();
  resizeHooks.push(() => { sizeSeq(); sizeMoonGL(); render(); });

  // сцена вне экрана: анимации стоят, звёзды не мерцают, render не нужен; свет принадлежит сцене, пока она видна
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      const on = es[es.length - 1].isIntersecting; // пин ScrollTrigger переподвешивает сцену: записи «вне/внутри» приходят пачкой — важна последняя
      stageOff = !on;
      stageEl.classList.toggle('is-off', !on);
      stars.setVisible(on);
      if (moonGL && !on) moonGL.sleep();
      if (on) { Light.claim('hero'); render(); }
    }, { threshold: 0 }).observe(stageEl);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !stageOff) render(); });

  /* ------------------------------------------------------------------------
     Интро (≈6.3 с, только при входе): по луне идёт терминатор → логотип → заголовок
     ------------------------------------------------------------------------ */
  const letters = wordmark.querySelectorAll('.wordmark__word span');
  const wmMark = document.getElementById('wordmarkMark');
  const wmGlow = document.getElementById('wordmarkGlow');
  const wmSub = document.getElementById('wordmarkSub');
  const heroLines = document.querySelectorAll('#copyHero .line > span');
  const heroEyebrow = document.querySelector('#copyHero .eyebrow');
  const heroSub = document.querySelector('#copyHero .hero-sub');

  const intro = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.inOut' },
    onUpdate: render,
    onComplete: () => { body.classList.remove('is-intro'); loadSeq(); if (moonGL) moonGL.setSpin(2 * Math.PI / 180); },
  });

  intro
    .to(I, { moon: 1, duration: 1.0, ease: 'power2.out' }, 0.1)
    .to(I, { term: 112, duration: 2.8, ease: 'power2.out' }, 0.3)
    // наезд — через переменные, а не transform: иначе GSAP «замораживает» transform и луна перестаёт двигаться по скроллу
    .to(I, { ms: 1, mx: 0, duration: 5.2, ease: 'power2.out' }, 0.3)
    .to(I, { dark: 0, duration: 1.3, ease: 'power2.out' }, 0.3)
    .to(wmMark, { opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out' }, 1.8)
    .to(wmGlow, { opacity: 1, duration: 1.0, ease: 'power2.inOut' }, 1.9)
    .to(wmGlow, { opacity: 0, duration: 1.6, ease: 'power2.inOut' }, 3.2)
    .to(letters, { opacity: 1, y: 0, duration: 1.2, stagger: 0.06, ease: 'power3.out' }, 2.0)
    .to(wmSub, { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }, 2.8)
    .to(heroEyebrow, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 4.2)
    .to(heroLines, { y: 0, duration: 1.2, stagger: 0.12, ease: 'power3.out' }, 4.3)
    .to(heroSub, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, 4.8)
    .to(I, { cueO: 1, duration: 1.0 }, 5.2);

  // проба кадра: 300 мс после старта интро; тяжёлый кадр → уровень ниже, пока сцена ещё тёмная
  function probeFrames() {
    if (reduceMotion || TIER === 'low') return;
    const deltas = []; let last = 0; const t0 = performance.now();
    const step = (now) => {
      if (last) deltas.push(now - last);
      last = now;
      if (now - t0 < 300) { requestAnimationFrame(step); return; }
      if (deltas.length < 6) return;
      const d = deltas.slice(2).sort((a, b) => a - b);
      const p90 = d[Math.floor(d.length * 0.9)];
      if (p90 > 34) { TIER = TIER === 'high' ? 'medium' : 'low'; root.dataset.tier = TIER; if (moonGL) moonGL.setTier(TIER); }
    };
    requestAnimationFrame(step);
  }

  function startIntro() {
    initMoonGL();
    if (reduceMotion) {
      intro.progress(1);
      body.classList.remove('is-intro');
      loadSeq();
      render();
      return;
    }
    intro.play();
    probeFrames();
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!reduceMotion) window.scrollTo(0, 0);
  // фон уже нарисован — интро стартует со второго кадра
  requestAnimationFrame(() => requestAnimationFrame(startIntro));

  if (!reduceMotion) {
    const hurry = () => {
      if (intro.progress() < 1) intro.timeScale(3.2);
      loadSeq();
      body.classList.add('is-scrolling');
      window.removeEventListener('wheel', hurry);
      window.removeEventListener('touchstart', hurry);
      window.removeEventListener('keydown', hurry);
    };
    window.addEventListener('wheel', hurry, { passive: true });
    window.addEventListener('touchstart', hurry, { passive: true });
    window.addEventListener('keydown', hurry);
  }

  /* ------------------------------------------------------------------------
     Скролл-сцена (pinned): 170 % на десктопе, 130 % на телефоне.
     ------------------------------------------------------------------------ */
  const copyHero = document.getElementById('copyHero');
  const copyLayers = document.getElementById('copyLayers');
  const copyOutro = document.getElementById('copyOutro');
  const shade = document.getElementById('shade');
  const mm = gsap.matchMedia();

  // концепция показывается, когда сцена заканчивается, — без пустого экрана между ними
  let conceptShown = false;
  function revealConcept() {
    if (conceptShown) return; conceptShown = true;
    document.querySelectorAll('#concept .reveal, #concept .manifesto__text').forEach((el) => el.classList.add('is-in'));
  }
  /* Расслойка — по желанию клиента: на сцене стоит закрытый матрас (фото), кнопка «Открыть» раскрывает
     его на семь слоёв, «Закрыть» — собирает обратно. Сама расслойка не запускается.
     Пункт списка (наведение, фокус, нажатие) — прожектор на этот слой; нажатие при закрытом матрасе сначала открывает его. */
  const lysToggle = document.getElementById('lysToggle');
  const lysLabel = lysToggle.querySelector('.lys-toggle__label');
  const SPOT_PICK = () => (isMobile() ? 0.5 : 0.8);
  let layersOpen = false, openTw = null, pinned = -1, tourOut = false;
  function setOpen(on) {
    if (on === layersOpen) return;
    layersOpen = on;
    lysToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    lysLabel.textContent = on ? 'Закрыть' : 'Открыть';
    copyLayers.classList.toggle('is-open', on);
    stageEl.classList.toggle('is-open', on);
    if (!on) { pinned = -1; focusLayer(-1); }
    if (openTw) openTw.kill();
    openTw = gsap.to(S, {
      spread: on ? 1 : 0, cutS: on ? 1 : 1.04,
      duration: reduceMotion ? 0.01 : on ? 3.2 : 2.2, ease: 'sine.inOut',
      onUpdate: render, onComplete: () => { openTw = null; if (on && pinned >= 0) focusLayer(pinned); },
    });
  }
  // прожектор на слой i (−1 — общий вид); работает только у раскрытого матраса
  function focusLayer(i) {
    if (i >= 0 && (!layersOpen || S.spread < 0.98 || tourOut)) return;
    gsap.to(S, { spot: i >= 0 ? SPOT_PICK() : 0, spotY: i >= 0 ? spotY(i) : S.spotY, duration: reduceMotion ? 0.01 : 0.5, ease: 'power2.out', onUpdate: render, overwrite: 'auto' });
    S.focus = i; render();
  }
  lysToggle.addEventListener('click', () => setOpen(!layersOpen));
  lysItems.forEach((el, i) => {
    el.addEventListener('pointerenter', () => { if (pinned < 0) focusLayer(i); });
    el.addEventListener('pointerleave', () => { if (pinned < 0) focusLayer(-1); });
    el.addEventListener('focus', () => focusLayer(i));
    el.addEventListener('blur', () => { if (pinned < 0) focusLayer(-1); });
    el.addEventListener('click', () => {
      if (!layersOpen) { pinned = i; setOpen(true); return; }
      pinned = pinned === i ? -1 : i;
      focusLayer(pinned);
    });
  });
  function layersCtl(p) {
    // финал сцены: прожектор гаснет; вернулся назад — выбранный слой снова в свете
    const out = p > 0.7;
    if (out !== tourOut) {
      tourOut = out;
      if (out) { S.focus = -1; gsap.to(S, { spot: 0, duration: 0.4, onUpdate: render, overwrite: 'auto' }); }
      else if (pinned >= 0) focusLayer(pinned);
    }
  }


  /* Тексты сцены строго по очереди: hero → (пусто) → «Семь слоёв» → финал. Не в scrub-таймлайне:
     при быстром скролле вверх на телефоне (весь переход ≈ 100 px) они раньше проявлялись одновременно и наезжали */
  let phase = 'hero';
  function setPhase(p) {
    const ph = p < 0.05 ? 'hero' : p < 0.09 ? 'gap' : p < 0.66 ? 'layers' : 'out';
    if (ph === phase) return;
    phase = ph;
    stageEl.classList.toggle('is-layers', ph === 'layers');
    // уходящий текст гаснет за 0.2 с, входящий появляется после — двух текстов на экране не бывает
    const out = reduceMotion ? 0 : 0.2, inn = reduceMotion ? 0 : 0.35, wait = reduceMotion ? 0 : 0.22;
    const show = (el, on, extra) => gsap.to(el, Object.assign({ autoAlpha: on ? 1 : 0, duration: on ? inn : out, delay: on ? wait : 0, ease: 'power2.out', overwrite: true }, extra));
    show(copyHero, ph === 'hero', { y: ph === 'hero' ? 0 : -24 });
    show(copyLayers, ph === 'layers');
    gsap.to(I, { hero: ph === 'hero' ? 1 : 0, duration: ph === 'hero' ? inn : out, delay: ph === 'hero' ? wait : 0, ease: 'power2.out', overwrite: 'auto', onUpdate: render });
  }

  function buildStage(isDesktop) {
    const D = isDesktop;
    const END = D ? '+=170%' : '+=150%';   // дольше «припаркована»: клиенту нужно время нажать «Открыть» и рассмотреть слои
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: render,
      scrollTrigger: {
        trigger: stageEl, start: 'top top',
        end: END,
        pin: true, scrub: D ? 0.5 : 0.35, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: (self) => {
          setPhase(self.progress);
          layersCtl(self.progress);
          if (self.progress > 0.78) revealConcept();
        },
      },
    });

    tl
      /* 0–8: имя уходит в nav, луна уходит вправо-вверх и гаснет, hero-текст уходит */
      .to(S, { lightDrift: 0.05, duration: 12, ease: 'power1.inOut' }, 0)
      .to(S, { wmS: 0.5, wmY: -40, wmO: 0, duration: 8, ease: 'power1.in' }, 0)
      .to(S, { moonX: 16, moonY: -12, moonO: 0, duration: 9, ease: 'power1.in' }, 0)
      .to(S, { brand: 1, duration: 5 }, 4)
      .to(S, { cueO: 0, duration: 4 }, 0)
      /* 4–12: закрытый матрас (фото) проявляется справа; дальше сцена «припаркована» — раскрывает его клиент кнопкой «Открыть» */
      .to(S, { cutO: 1, duration: 8 }, 4)
      /* 66–84: выход из расслойки — стопка мягко отходит вглубь и тает, подписи гаснут, появляется утверждение */
      .to(S, { outExp: 0.35, outS: 0.94, outY: -6, duration: 18, ease: 'power1.inOut' }, 66)
      .to(shade, { autoAlpha: D ? 0.9 : 0.7, duration: 10, ease: 'power1.inOut' }, 68)
      .to(copyOutro, { autoAlpha: 1, duration: 8, ease: 'power1.out' }, 72)
      /* 84–100: сцена темнеет до 55 %, стопка растворяется, утверждение уходит вверх — концепция подхватывает без разрыва */
      .to(S, { dark: 0.55, outY: -14, outExp: 0, duration: 16, ease: 'power1.in' }, 84)
      .to(copyOutro, { autoAlpha: 0, y: -24, duration: 8, ease: 'power1.in' }, 82)
      .to(shade, { autoAlpha: 0, duration: 12 }, 88);
    return tl;
  }
  mm.add('(min-width: 900px)', () => { buildStage(true); return () => {}; });
  mm.add('(max-width: 899px)', () => { buildStage(false); return () => {}; });

  // параллакс камеры от указателя: инерционный
  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const toX = gsap.quickTo(P, 'x', { duration: 1.6, ease: 'power3.out', onUpdate: render });
    const toY = gsap.quickTo(P, 'y', { duration: 1.6, ease: 'power3.out' });
    stageEl.addEventListener('pointermove', (e) => {
      toX((e.clientX / window.innerWidth - 0.5) * 3.5);
      toY(-(e.clientY / window.innerHeight - 0.5) * 2.6);
    });
    stageEl.addEventListener('pointerleave', () => { toX(0); toY(0); });
  }

  /* ------------------------------------------------------------------------
     Технология: список слоёв из данных + вкладки
     ------------------------------------------------------------------------ */
  const techLayers = document.getElementById('techLayers');
  if (techLayers) {
    techLayers.innerHTML = LAYERS.map((l) => `<li>
      <span class="num">${l.num}</span>
      <span class="name">${l.name}<span class="role">${l.role}</span></span>
      <span class="text">${l.text}</span>
      <span class="spec"><b>${Math.round(l.cm * 10)} мм</b>${l.density}</span>
    </li>`).join('');
  }

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
      const baseY = H * 0.86, top = H * 0.56, amp = H * 0.24;
      const surf = (j) => top + y[j] * amp * 0.5;
      if (!bodyGrad || gradH !== H) {
        gradH = H; bodyGrad = ctx.createLinearGradient(0, top - 10, 0, baseY);
        bodyGrad.addColorStop(0, 'rgba(241,237,230,0.20)'); bodyGrad.addColorStop(1, 'rgba(241,237,230,0.025)');
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
      ctx.strokeStyle = 'rgba(241,237,230,0.08)'; ctx.stroke(calm);
      ctx.strokeStyle = 'rgba(241,237,230,0.3)'; ctx.stroke(mv);
      ctx.strokeStyle = 'rgba(241,237,230,0.16)'; ctx.beginPath(); ctx.moveTo(px(0), baseY + 0.5); ctx.lineTo(px(N - 1), baseY + 0.5); ctx.stroke();
      ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(200,168,107,0.55)';
      ctx.beginPath(); ctx.moveTo(px(SEAM), H * 0.12); ctx.lineTo(px(SEAM), baseY + 22); ctx.stroke(); ctx.setLineDash([]);
      const sleeper = (c, filled, ang) => {
        const cx = px(c), cy = surf(c) - H * 0.072, w = Math.min(W * 0.2, 230), h = H * 0.13, r = h / 2;
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(-w / 2 + r, -h / 2); ctx.lineTo(w / 2 - r, -h / 2); ctx.arc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(-w / 2 + r, h / 2); ctx.arc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath();
        if (filled) { ctx.fillStyle = 'rgba(241,237,230,0.94)'; ctx.fill(); }
        else { ctx.fillStyle = 'rgba(241,237,230,0.14)'; ctx.fill(); ctx.strokeStyle = 'rgba(241,237,230,0.5)'; ctx.stroke(); }
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
      for (let i = 0; i < 5; i++) { ctx.strokeStyle = `rgba(241,237,230,${(0.5 + (i / 4) * 0.5).toFixed(2)})`; ctx.stroke(paths[i]); }
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
      ScrollTrigger.refresh();
    }
    tabsEls.forEach((t, i) => {
      t.addEventListener('click', () => show(i, false));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); show((i + 1) % tabsEls.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); show((i - 1 + tabsEls.length) % tabsEls.length, true); }
      });
    });
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

    const animate = !reduceMotion && TIER !== 'low';
    let pickR = null, pickT = -1e9;
    let paint = () => {};
    function pick(btn) {
      cities.forEach((c) => { const on = c === btn; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
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
      c.addEventListener('mouseenter', () => { if (!hoverable) return; clearTimeout(hoverTo); hoverTo = setTimeout(() => pick(c), 90); });
      c.addEventListener('mouseleave', () => clearTimeout(hoverTo));
    });
    chosen = map.querySelector('.city.is-on') || home;
    pick(chosen);
    document.addEventListener('eluna:setcity', (e) => { const c = cities.find((x) => x.dataset.city === e.detail); if (c) { chosen = c; if (!c.classList.contains('is-on')) pick(c); } });

    // ---- холст эффектов ----
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
    const minStep = isMobile() || TIER !== 'high' ? 32 : 15;
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

  (function lineup() {
    document.querySelectorAll('[data-price]').forEach((el) => { el.innerHTML = priceHTML(el.dataset.price, el.hasAttribute('data-compact')); });

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
      dlg.scrollTop = 0;
      if (!reduceMotion) gsap.fromTo(dlg, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .4, ease: 'power3.out', clearProps: 'transform' });
    }
    document.querySelectorAll('dialog.mdl').forEach((dlg) => {
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', () => { const o = dlg._opener; if (o && o.focus) o.focus(); });
    });
    window.ELUNA_openDialog = openDialog;

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
    const pvW = document.getElementById('sizePreviewW'), pvH = document.getElementById('sizePreviewH');
    const priceEl = document.getElementById('sizePrice'), oldEl = document.getElementById('sizeOld');
    const monthlyEl = document.getElementById('sizeMonthly');
    const shown = { v: 0, o: 0 };

    function render(animate) {
      const o = order, p = priceOf(o), name = MODELS[o.model].name;
      models.forEach((b) => b.setAttribute('aria-checked', b.dataset.m === o.model ? 'true' : 'false'));
      opts.forEach((b) => b.setAttribute('aria-checked', (b.hasAttribute('data-custom') ? o.custom : !o.custom && +b.dataset.w === o.w && +b.dataset.h === o.h) ? 'true' : 'false'));
      if (custom) custom.hidden = !o.custom;
      [[rW, nW, o.w], [rH, nH, o.h]].forEach(([r, n, v]) => { if (r && +r.value !== v) r.value = v; if (n && document.activeElement !== n && +n.value !== v) n.value = v; });
      const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
      set('sizeModel', name); set('sizeLabel', `${o.w} × ${o.h}`);
      if (pvW) pvW.textContent = o.w; if (pvH) pvH.textContent = o.h;
      // превью: 2200 мм по большей стороне = 76 % поля
      if (mat) gsap.to(mat, { width: `${(o.w / 2200) * 76}%`, height: `${(o.h / 2200) * 76}%`, duration: animate ? 0.8 : 0, ease: 'power3.inOut', overwrite: 'auto' });
      const paint = () => {
        if (priceEl) priceEl.textContent = p.v == null ? '—' : fmtMoney(shown.v);
        if (oldEl) oldEl.textContent = p.o ? `${fmtMoney(shown.o)} ₸` : '';
        if (monthlyEl) monthlyEl.textContent = p.v == null ? '—' : fmtMoney(shown.v / 12);
      };
      if (p.v != null && animate && !reduceMotion) gsap.to(shown, { v: p.v, o: p.o || 0, duration: 0.7, ease: 'power2.out', onUpdate: paint, overwrite: 'auto' });
      else { shown.v = p.v || 0; shown.o = p.o || 0; paint(); }

      // «Ваш выбор» у карты, итог внизу, липкая кнопка
      const priceStr = p.v == null ? '' : ` · ${fmtMoney(p.v)} ₸`;
      set('orderPickText', `${name} · ${sizeText(o)}${priceStr}`);
      const sum = document.getElementById('checkoutSum');
      if (sum) {
        sum.querySelector('[data-o="model"]').textContent = name;
        sum.querySelector('[data-o="size"]').textContent = sizeText(o) + (o.custom ? ' · свой' : '');
        sum.querySelector('[data-o="price"]').innerHTML = p.v == null ? 'уточнит мастер' : `${p.o ? `<s class="price-old">${fmtMoney(p.o)}</s> ` : ''}${fmtMoney(p.v)} ₸`;
        sum.querySelector('[data-o="city"]').textContent = cityText(o.city);
      }
      const sticky = document.getElementById('stickyText');
      if (sticky) sticky.textContent = `${name} · ${o.w}×${o.h}${p.v == null ? '' : ` — ${fmtMoney(p.v)} ₸`}`;
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
      update(patch);
      const dlg = b.closest('dialog');
      if (dlg && dlg.open) dlg.close();
      requestAnimationFrame(goSizes);
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
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const w = document.createElement('span'); w.className = 'word';
        for (const ch of part) { const sp = document.createElement('span'); sp.className = 'char'; sp.textContent = ch; w.appendChild(sp); }
        frag.appendChild(w);
      });
      node.replaceWith(frag);
    };
    targets.forEach((el) => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const texts = []; while (walker.nextNode()) if (walker.currentNode.textContent.trim()) texts.push(walker.currentNode);
      texts.forEach(wrap);
    });
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

  // плавный скролл по якорям (учитывает pin); цель внутри окна — открыть окно
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      body.classList.remove('is-intro');
      intro.progress(1);
      const dlg = target.closest('dialog');
      if (dlg) { window.ELUNA_openDialog(dlg, a); return; }
      const y = id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 40;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { ScrollTrigger.refresh(); });
  window.addEventListener('load', () => ScrollTrigger.refresh());
  // эмуляция телефона / поздний viewport meta: если ширина успела измениться — пересчитать всё
  requestAnimationFrame(() => { if (window.innerWidth !== lastW || window.innerHeight !== lastH) onResize(true); });
  render();

  if (DEBUG) {
    window.ELUNA = { intro, Light, get tier() { return TIER; }, get moon() { return moonGL; }, get layers() { return layersState; }, S, I, render };
  }
})();
