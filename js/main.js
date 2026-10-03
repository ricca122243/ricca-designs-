/* ==========================================================================
   ELUNA — сцена, свет, скролл, линейка
   Структура: качество устройства → свет (общий контроллер) → звёзды → сцена
   (интро, скролл, WebGL-луна) → технология → модели (рельс, модальные окна,
   размеры) → доставка → прочее. Все resize-обработчики — через один конвейер.
   ========================================================================== */
(() => {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

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
     Уровень качества: HIGH / MEDIUM / LOW. LOW — без WebGL (CSS-свет),
     без мерцания звёзд и метеоров, кадры разлёта 1280×720.
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
    if (!window.Moonlight || !probeGL(q === 'force')) return 'low';
    if (q === 'force') return 'high';
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
    { key: 'springs', cm: 12,  num: '06', name: 'Независимые пружины',    text: '1 200 пружин в индивидуальных карманах, семь зон жёсткости. Каждая работает сама по себе — партнёр не почувствует, как вы повернулись.', density: '500 шт/м²', role: 'Независимость' },
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
    const base = document.getElementById('stars');
    if (!base) return { setVisible() {} };
    const twinkle = document.createElement('canvas');
    twinkle.className = 'stars stars--twinkle';
    twinkle.setAttribute('aria-hidden', 'true');
    base.after(twinkle);
    const bctx = base.getContext('2d');
    const tctx = twinkle.getContext('2d');

    let w = 0, h = 0, H = 0, dpr = 1, flick = [], meteors = [], visible = true, meteorRaf = 0;
    const OVER = 1.18;
    const tint = (t) => {
      if (t < 0.25) return [196, 208, 255];
      if (t < 0.7) return [245, 243, 238];
      if (t < 0.92) return [255, 236, 205];
      return [255, 208, 160];
    };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const density = () => (TIER === 'high' ? 3200 : TIER === 'medium' ? 5000 : 8000) * (isMobile() ? 1.56 : 1);

    function paintBase() {
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, w, H);
      const mob = isMobile();
      const band = Math.round((w * H) / (mob ? 2400 : 1400) / (TIER === 'low' ? 2 : 1));
      for (let i = 0; i < band; i++) {
        const u = Math.random();
        const g = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
        const x = u * w, y = H * (0.85 - u * 0.55) + g * H * 0.42;
        const c = tint(Math.random());
        bctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${rnd(0.04, 0.16)})`;
        bctx.fillRect(x, y, 1, 1);
      }
      const n = Math.round((w * H) / density());
      for (let i = 0; i < n; i++) {
        const x = Math.random() * w, y = Math.random() * H;
        const m = Math.pow(Math.random(), 3.2);
        const r = 0.3 + m * 1.6, a = 0.25 + m * 0.7;
        const c = tint(Math.random());
        if (m > 0.72) {
          const g = bctx.createRadialGradient(x, y, 0, x, y, r * 9);
          g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.2 * m})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          bctx.fillStyle = g;
          bctx.beginPath(); bctx.arc(x, y, r * 9, 0, Math.PI * 2); bctx.fill();
          if (m > 0.9) {
            bctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.18 * m})`;
            bctx.lineWidth = 0.6;
            bctx.beginPath();
            bctx.moveTo(x - r * 7, y); bctx.lineTo(x + r * 7, y);
            bctx.moveTo(x, y - r * 7); bctx.lineTo(x, y + r * 7);
            bctx.stroke();
          }
        }
        bctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
        bctx.beginPath(); bctx.arc(x, y, r, 0, Math.PI * 2); bctx.fill();
      }
      flick = Array.from({ length: Math.round(w / (mob ? 64 : 36)) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: rnd(0.6, 1.4), c: tint(Math.random()),
        ph: Math.random() * Math.PI * 2, sp: rnd(0.4, 1.3), a: rnd(0.35, 0.8),
      }));
    }

    function size(full) {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight; H = Math.round(h * OVER);
      twinkle.width = w * dpr; twinkle.height = h * dpr;
      if (full) { base.width = w * dpr; base.height = H * dpr; base.style.height = `${H}px`; paintBase(); }
      drawTwinkle(performance.now());
    }

    function drawTwinkle(now) {
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tctx.clearRect(0, 0, w, h);
      for (const p of flick) {
        const k = 0.45 + 0.55 * Math.sin(now * 0.0011 * p.sp + p.ph);
        tctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.a * k})`;
        tctx.beginPath(); tctx.arc(p.x, p.y, p.r * (0.8 + 0.4 * k), 0, Math.PI * 2); tctx.fill();
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

    // метеор: короткий цикл, заканчивается вместе со штрихом
    function meteorLoop(now) {
      meteorRaf = 0;
      if (!meteors.length) return;
      drawTwinkle(now);
      meteorRaf = requestAnimationFrame(meteorLoop);
    }
    let nextMeteor = performance.now() + rnd(6000, 14000);
    function tick() {
      if (document.hidden || !visible || TIER === 'low') return;
      const now = performance.now();
      if (now > nextMeteor) {
        meteors.push({ x: rnd(0.1, 0.9) * w, y: rnd(0.05, 0.5) * h, vx: rnd(120, 220) * (Math.random() < 0.5 ? -1 : 1), vy: rnd(60, 120), t0: now });
        nextMeteor = now + rnd(9000, 22000);
        if (!meteorRaf) meteorRaf = requestAnimationFrame(meteorLoop);
      }
      if (!meteorRaf) drawTwinkle(now);
    }

    // параллакс: статичный слой чуть отстаёт от скролла
    let ticking = false;
    function onScroll() {
      if (ticking || !visible) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = Math.min(H - h, window.scrollY * 0.035);
        base.style.transform = `translate3d(0, ${-y}px, 0)`;
        ticking = false;
      });
    }

    // фон рисуем в первом кадре — после разметки, до старта интро
    requestAnimationFrame(() => size(true));
    resizeHooks.push((w2, h2, wChanged) => size(wChanged));
    window.addEventListener('scroll', onScroll, { passive: true });
    if (!reduceMotion) setInterval(tick, TIER === 'medium' ? 160 : 110);
    return { setVisible(v) { visible = v; } };
  })();

  /* ------------------------------------------------------------------------
     Состояние сцены. Интро (время) и скролл пишут в разные объекты,
     render() их сводит — так они никогда не спорят между собой.
     ------------------------------------------------------------------------ */
  const S = {
    lr: 1, heroS: 1, heroY: 0, heroExp: 1, rx: 0, ry: 0,
    cutO: 0, cutExp: 1, cutS: 1.04, cutX: 0, cutY: 0,
    spread: 0, focus: -1,
    dark: 0, brand: 0, eclipse: 1, cueO: 1,
    wmS: 1, wmY: 0, wmO: 1,
    lightDrift: 0,
  };
  const I = { dark: 1, lr: 0, exp: 0, eclipse: 0, wmO: 1, cueO: 0, moon: 0, beam: 0, glow: 0, lift: 6, heroS: 0.96 };
  const P = { x: 0, y: 0 };

  const stageEl = document.getElementById('stage');
  const navEl = document.getElementById('nav');
  const wordmark = document.getElementById('wordmark');
  const exposure = document.getElementById('exposure');
  const eclipse = document.getElementById('eclipse');
  const productHero = document.getElementById('productHero');
  const productMedia = document.getElementById('productMedia');
  const heroImg = document.getElementById('heroImg');
  const heroGlCanvas = document.getElementById('heroGl');
  const productCut = document.getElementById('productCut');
  const cue = document.getElementById('cue');
  const moonHero = document.getElementById('moonHero');
  const moonGlow = document.getElementById('moonGlow');
  const moonWrap = document.getElementById('moonWrap');
  const moonbeam = document.getElementById('moonbeam');

  /* ------------------------------------------------------------------------
     Разрез как последовательность кадров. Перерисовка только когда кадр,
     размер или число загруженных кадров изменились.
     ------------------------------------------------------------------------ */
  const SEQ = TIER === 'high'
    ? { count: 24, w: 1920, h: 1080, base: 'img/seq/', pad: 2 }
    : { count: 24, w: 1280, h: 720, base: 'img/seq720/', pad: 2 };
  const seqCanvas = document.getElementById('seq');
  const seqCtx = seqCanvas.getContext('2d', { alpha: false });
  const frames = new Array(SEQ.count).fill(null);
  let seqLoaded = 0, seqStarted = false, seqDirty = true;
  const seqLast = { f: -1, w: 0, h: 0, loaded: 0 };

  function frameSrc(i) { return `${SEQ.base}f${String(i + 1).padStart(SEQ.pad, '0')}.webp`; }
  function loadSeq() {
    if (seqStarted) return;
    seqStarted = true;
    const order = [0, SEQ.count - 1, Math.floor(SEQ.count / 2)];
    for (let i = 0; i < SEQ.count; i++) if (!order.includes(i)) order.push(i);
    let k = 0;
    const next = () => {
      if (k >= order.length) return;
      const i = order[k++];
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { frames[i] = im; seqLoaded++; if (S.cutO > 0.001) { seqDirty = true; drawSeq(); } next(); };
      im.onerror = next;
      im.src = frameSrc(i);
      if (k < 4) next();
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
  function dprSeq() { return Math.min(isMobile() ? 2 : 1.5, window.devicePixelRatio || 1); }
  function seqGeometry() {
    const cw = seqCanvas.width, ch = seqCanvas.height;
    const mob = isMobile();
    const k = mob ? (cw / SEQ.w) * 1.22 : Math.min(cw / SEQ.w, ch / SEQ.h) * 0.7;
    const dw = SEQ.w * k, dh = SEQ.h * k;
    return { cw, ch, dw, dh, dx: (cw - dw) * 0.5, dy: (ch - dh) * 0.56 };
  }
  function sizeSeq() {
    const d = dprSeq();
    seqCanvas.width = Math.round(window.innerWidth * d);
    seqCanvas.height = Math.round(window.innerHeight * d);
    const g = seqGeometry();
    placeSeqLabels(g.dx / d, g.dy / d, g.dw / d, g.dh / d);
    seqDirty = true;
    if (S.cutO > 0.001) drawSeq();
  }
  function markSeq() {
    const f = Math.min(1, Math.max(0, S.spread)) * (SEQ.count - 1);
    if (Math.abs(f - seqLast.f) > 0.015 || seqCanvas.width !== seqLast.w || seqCanvas.height !== seqLast.h || seqLoaded !== seqLast.loaded) {
      seqLast.f = f; seqLast.w = seqCanvas.width; seqLast.h = seqCanvas.height; seqLast.loaded = seqLoaded;
      seqDirty = true;
    }
  }
  function drawSeq() {
    if (!seqDirty || seqLoaded === 0) return;
    const g = seqGeometry();
    const f = Math.min(1, Math.max(0, S.spread)) * (SEQ.count - 1);
    const i0 = Math.floor(f), t = f - i0;
    const a = nearestFrame(i0), b = frames[Math.min(SEQ.count - 1, i0 + 1)];
    seqCtx.fillStyle = '#000';
    seqCtx.fillRect(0, 0, g.cw, g.ch);
    seqCtx.globalAlpha = 1;
    if (a) seqCtx.drawImage(a, g.dx, g.dy, g.dw, g.dh);
    if (b && b !== a && t > 0.02) { seqCtx.globalAlpha = t; seqCtx.drawImage(b, g.dx, g.dy, g.dw, g.dh); seqCtx.globalAlpha = 1; }
    seqDirty = false;
  }

  // позиция луны (= источника света) — из CSS-переменных --moon-x/--moon-y: одна ось для всего
  const MOON = { x: 12, y: 18 };
  function readMoon() {
    const cs = getComputedStyle(root);
    const x = parseFloat(cs.getPropertyValue('--moon-x')), y = parseFloat(cs.getPropertyValue('--moon-y'));
    if (!Number.isNaN(x)) MOON.x = x; if (!Number.isNaN(y)) MOON.y = y;
  }
  function aimBeam() {
    readMoon();
    const mx = MOON.x / 100 * window.innerWidth, my = MOON.y / 100 * window.innerHeight;
    const tx = 0.5 * window.innerWidth, ty = 0.58 * window.innerHeight;
    const deg = (Math.atan2(tx - mx, -(ty - my)) * 180 / Math.PI + 360) % 360;
    stageEl.style.setProperty('--beam-angle', `${(deg - 16).toFixed(1)}deg`);
  }

  /* подписи к слоям на последнем кадре разлёта */
  const seqLabels = document.getElementById('seqLabels');
  const SEQ_LABEL_Y = [9, 21, 30, 39, 49, 67, 87];
  const seqLabelEls = LAYERS.map((l, i) => {
    const el = document.createElement('span');
    el.className = 'seq-label';
    el.style.setProperty('--y', `${SEQ_LABEL_Y[i]}%`);
    el.innerHTML = `<span class="num">${l.num}</span><span class="name">${l.name}</span><span class="spec">${Math.round(l.cm * 10)} мм</span>`;
    seqLabels.appendChild(el);
    return el;
  });
  function placeSeqLabels(x, y, w, h) {
    seqLabels.style.left = `${x}px`; seqLabels.style.top = `${y}px`;
    seqLabels.style.width = `${w}px`; seqLabels.style.height = `${h}px`;
  }
  const smoothstep = (v, a, b) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  let activeLayer = -2;
  const layerActiveEl = document.getElementById('layerActive');
  function setActiveLayer(i) {
    if (i === activeLayer) return;
    activeLayer = i;
    const l = LAYERS[i];
    layerActiveEl.classList.toggle('is-on', !!l);
    if (l) {
      layerActiveEl.querySelector('.num').textContent = l.num;
      layerActiveEl.querySelector('.name').textContent = l.name;
      layerActiveEl.querySelector('.spec').textContent = `${Math.round(l.cm * 10)} мм`;
    }
  }

  /* ------------------------------------------------------------------------
     WebGL-луна: фото как текстура + карта нормалей, свет из позиции луны
     ------------------------------------------------------------------------ */
  let GL = null;
  function glCover() { return isMobile() ? { posX: 0.52, posY: 0.60 } : { posX: 0.50, posY: 0.56 }; }
  function glScale(t) { return t === 'high' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1; }
  function dropGL() {
    if (GL) { GL.destroy(); GL = null; }
    productHero.classList.remove('has-gl');
    TIER = 'low'; root.dataset.tier = TIER;
    render();
  }
  function initGL() {
    if (TIER === 'low' || !window.Moonlight || GL) return;
    if (!(heroImg.complete && heroImg.naturalWidth)) return;
    const inst = window.Moonlight.create({
      canvas: heroGlCanvas, img: heroImg, tier: TIER,
      normalSrc: TIER === 'high' ? 'img/hero-normal.webp' : 'img/hero-normal-640.webp',
      scale: glScale(TIER), cover: glCover(), force: params.get('gl') === 'force',
      onFallback: dropGL,
    });
    if (!inst) { TIER = 'low'; root.dataset.tier = TIER; return; }
    GL = inst;
    GL.setTier(TIER);
    GL.resize(stageEl.clientWidth || window.innerWidth, stageEl.clientHeight || window.innerHeight);
    productHero.classList.add('has-gl');
    render();
  }
  function setTier(t) {
    TIER = t; root.dataset.tier = t;
    if (t === 'low') { dropGL(); return; }
    if (GL) { GL.setTier(t); GL.setScale(glScale(t)); GL.resize(stageEl.clientWidth, stageEl.clientHeight); }
  }

  /* ------------------------------------------------------------------------
     render(): сводит интро, скролл и указатель. Переменные пишутся на
     владельцев (сцена, продукт, nav), не на :root.
     ------------------------------------------------------------------------ */
  let stageOff = false;
  function render() {
    if (stageOff) return;
    const vw = window.innerWidth, vh = window.innerHeight;

    // свет идёт из точки луны (+ указатель, + лёгкий дрейф по скроллу)
    const lx = (MOON.x + P.x * 0.6) / 100, ly = (MOON.y - P.y * 0.5) / 100 + S.lightDrift;
    Light.set('hero', lx, ly, 0.35 + 0.65 * I.beam);
    const L = Light.get();
    const ls = Math.max(0.02, I.lr * S.lr * 2.1);
    const heroExp = I.exp * S.heroExp;

    if (GL) {
      GL.set({ lightX: L.x, lightY: L.y, lightZ: isMobile() ? 0.46 : 0.38, intensity: L.i, exposure: heroExp, reveal: ls, revealX: lx, revealY: ly });
    } else {
      productHero.style.setProperty('--lx', `${(lx * 100).toFixed(2)}%`);
      productHero.style.setProperty('--ly', `${(ly * 100).toFixed(2)}%`);
      productHero.style.setProperty('--ls', ls.toFixed(4));
      productHero.style.setProperty('--dim', `${(1 - heroExp).toFixed(3)}`);
      productHero.classList.toggle('is-lit', I.lr * S.lr >= 0.999);
    }
    moonbeam.style.opacity = (I.beam * S.eclipse * (GL ? 0.8 : 1)).toFixed(3);
    moonHero.style.opacity = (I.moon * S.eclipse).toFixed(3);
    moonGlow.style.opacity = (I.glow * S.eclipse).toFixed(3);
    const mpx = `${(-P.x * 2.2).toFixed(2)}px`, mpy = `${(-P.y * 2).toFixed(2)}px`;
    moonWrap.style.setProperty('--mpx', mpx); moonWrap.style.setProperty('--mpy', mpy);
    moonbeam.style.setProperty('--mpx', mpx); moonbeam.style.setProperty('--mpy', mpy);
    navEl.style.setProperty('--brand-o', `${S.brand}`);
    exposure.style.opacity = Math.max(I.dark, S.dark);
    eclipse.style.opacity = I.eclipse * S.eclipse;

    productHero.style.transform =
      `perspective(1600px) rotateX(${(S.rx + P.y).toFixed(3)}deg) rotateY(${(S.ry + P.x).toFixed(3)}deg) ` +
      `translate3d(${(P.x * 3.4).toFixed(2)}px, ${S.heroY * vh / 100 + I.lift * vh / 100 - P.y * 2.6}px, 0) scale(${S.heroS * I.heroS})`;
    productHero.style.opacity = S.heroExp > 0.01 ? 1 : 0;

    productCut.style.opacity = S.cutO;
    productCut.style.setProperty('--dim', `${(1 - S.cutExp).toFixed(3)}`);
    productCut.style.transform = `translate3d(${S.cutX * vw / 100}px, ${S.cutY * vh / 100}px, 0) scale(${S.cutS})`;
    if (S.cutO > 0.001) { markSeq(); drawSeq(); }
    const focusI = Math.round(S.focus);
    setActiveLayer(S.cutO > 0.5 ? focusI : -1);
    seqLabels.style.opacity = (S.cutO * smoothstep(S.spread, 0.8, 1)).toFixed(3);
    seqLabelEls.forEach((el, i) => el.classList.toggle('is-active', i === focusI && S.cutO > 0.5));

    wordmark.style.transform = `translate(-50%, calc(-50% + ${S.wmY}vh)) scale(${S.wmS})`;
    wordmark.style.opacity = S.wmO * I.wmO;
    cue.style.opacity = S.cueO * I.cueO;
  }

  sizeSeq(); aimBeam();
  resizeHooks.push((w, h) => { sizeSeq(); aimBeam(); if (GL) GL.resize(stageEl.clientWidth || w, stageEl.clientHeight || h); render(); });

  // сцена вне экрана: анимации стоят, звёзды не мерцают, render не нужен; свет принадлежит сцене, пока она видна
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      const on = es[0].isIntersecting;
      stageOff = !on;
      stageEl.classList.toggle('is-off', !on);
      stars.setVisible(on);
      if (on) { Light.claim('hero'); render(); }
    }, { threshold: 0 }).observe(stageEl);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !stageOff) render(); });

  /* ------------------------------------------------------------------------
     Интро: луна всходит → логотип → свет ложится на матрас → текст
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
    onComplete: () => { body.classList.remove('is-intro'); loadSeq(); },
  });

  intro
    .to(I, { moon: 1, duration: 1.8, ease: 'power2.out' }, 0.2)
    .to(moonHero, { scale: 1, y: 0, duration: 2.4, ease: 'power2.out' }, 0.2)
    .to(I, { glow: 1, duration: 1.8, ease: 'power2.out' }, 0.6)
    .to(I, { lift: 0, heroS: 1, duration: 2.6, ease: 'power3.out' }, 1.8)
    .to(wmMark, { opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out' }, 1.0)
    .to(wmGlow, { opacity: 1, duration: 1.0, ease: 'power2.inOut' }, 1.1)
    .to(wmGlow, { opacity: 0, duration: 1.6, ease: 'power2.inOut' }, 2.6)
    .to(letters, { opacity: 1, y: 0, duration: 1.2, stagger: 0.07, ease: 'power3.out' }, 1.4)
    .to(wmSub, { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }, 2.3)
    .to(I, { beam: 1, duration: 1.8, ease: 'power1.inOut' }, 1.8)
    .to(I, { dark: 0.6, duration: 1.2 }, 1.9)
    .to(I, { lr: 0.18, exp: 0.4, duration: 1.3, ease: 'power1.inOut' }, 2.0)
    .to(I, { dark: 0.2, duration: 1.2 }, 2.8)
    .to(I, { lr: 0.45, exp: 0.74, duration: 1.4, ease: 'power1.inOut' }, 2.9)
    .to(I, { dark: 0, lr: 1.0, exp: 1, duration: 1.6, ease: 'power2.out' }, 3.5)
    .to(I, { eclipse: 1, duration: 1.3 }, 3.6)
    .to(heroEyebrow, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 3.9)
    .to(heroLines, { y: 0, duration: 1.2, stagger: 0.12, ease: 'power3.out' }, 4.0)
    .to(heroSub, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, 4.5)
    .to(I, { cueO: 1, duration: 1.0 }, 5.2);

  // проба кадра: 300 мс после старта интро; тяжёлый кадр → уровень ниже, пока сцена ещё тёмная
  function probeFrames() {
    if (reduceMotion || TIER === 'low' || params.get('gl') === 'force') return;
    const deltas = []; let last = 0; const t0 = performance.now();
    const step = (now) => {
      if (last) deltas.push(now - last);
      last = now;
      if (now - t0 < 300) { requestAnimationFrame(step); return; }
      if (deltas.length < 6) return;
      const d = deltas.slice(2).sort((a, b) => a - b);
      const p90 = d[Math.floor(d.length * 0.9)];
      if (p90 > 34) setTier(TIER === 'high' ? 'medium' : 'low');
    };
    requestAnimationFrame(step);
  }

  function startIntro() {
    initGL();
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
  // не начинаем раскрытие, пока фото не загрузилось — иначе свет осветит пустоту
  if (heroImg.complete && heroImg.naturalWidth) startIntro();
  else { heroImg.addEventListener('load', startIntro, { once: true }); heroImg.addEventListener('error', startIntro, { once: true }); }

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
     Скролл-сцена (pinned). Короче: 380 % на десктопе, 260 % на телефоне.
     ------------------------------------------------------------------------ */
  const copyHero = document.getElementById('copyHero');
  const copyLayers = document.getElementById('copyLayers');
  const copyOutro = document.getElementById('copyOutro');
  const shade = document.getElementById('shade');
  const mm = gsap.matchMedia();

  let autoTween = null, autoArmed = true;
  function stopAuto() { if (autoTween) { autoTween.kill(); autoTween = null; } }
  ['touchstart', 'wheel', 'keydown', 'pointerdown'].forEach((ev) => window.addEventListener(ev, stopAuto, { passive: true }));

  function buildStage(isDesktop) {
    const D = isDesktop;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: render,
      scrollTrigger: {
        trigger: stageEl, start: 'top top',
        end: D ? '+=380%' : '+=260%',
        pin: true, scrub: D ? 1.1 : 0.8, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: D ? undefined : autoPlayLayers,
      },
    });

    /* телефон: довели сцену до разлёта — дальше она едет сама до сборки; любое касание возвращает управление */
    function autoPlayLayers(self) {
      if (reduceMotion) return;
      if (self.progress < 0.08) autoArmed = true;
      if (!autoArmed || autoTween || self.direction < 0) return;
      if (self.progress < 0.22 || self.progress > 0.34) return;
      autoArmed = false;
      const from = self.progress, to = 0.80, dist = self.end - self.start;
      const o = { p: from };
      autoTween = gsap.to(o, {
        p: to, duration: 9 * (to - from) / 0.58, ease: 'none',
        onUpdate: () => window.scrollTo(0, self.start + dist * o.p),
        onComplete: () => { autoTween = null; },
      });
    }

    tl
      /* 0–14: камера облетает продукт, имя уходит в nav, свет чуть дрейфует */
      .to(S, { heroS: 1.1, heroY: -4, rx: 7, ry: -5, lightDrift: 0.05, duration: 14, ease: 'power1.inOut' }, 0)
      .to(S, { wmS: 0.7, wmY: -18, wmO: 0, duration: 12, ease: 'power1.in' }, 0)
      .to(S, { brand: 1, duration: 7 }, 7)
      .to(S, { eclipse: 0.35, duration: 14 }, 0)
      .to(copyHero, { opacity: 0, y: -40, duration: 7 }, 2)
      .to(S, { cueO: 0, duration: 4 }, 0)
      /* 14–25: фото уходит в темноту, разрез проявляется */
      .to(S, { heroExp: 0, heroS: 1.18, heroY: -9, rx: 10, duration: 10, ease: 'power1.in' }, 14)
      .to(S, { cutO: 1, cutS: 1.0, cutX: D ? 9 : 0, duration: 8 }, 17)
      .to(S, { eclipse: 0, duration: 6 }, 16)
      .to(copyLayers, { opacity: 1, duration: 6 }, 21)
      /* 24–34: слои упруго расходятся */
      .to(S, { spread: 1, duration: 10, ease: 'back.out(1.7)' }, 24)
      .to(S, { cutS: 0.9, cutY: D ? 1 : 0, duration: 10, ease: 'power1.inOut' }, 24)
      /* 34–69: фокус по слоям сверху вниз */
      .to(S, { focus: 0, duration: 0.01 }, 34)
      .to(S, { focus: 1, duration: 0.01 }, 39)
      .to(S, { focus: 2, duration: 0.01 }, 44)
      .to(S, { focus: 3, duration: 0.01 }, 49)
      .to(S, { focus: 4, duration: 0.01 }, 54)
      .to(S, { focus: 5, duration: 0.01 }, 59)
      .to(S, { focus: 6, duration: 0.01 }, 64)
      .to(S, { focus: -1, duration: 0.01 }, 69)
      /* 69–78: слои собираются */
      .to(S, { spread: 0, duration: 9, ease: 'back.inOut(1.2)' }, 69)
      .to(S, { cutS: 1.0, duration: 9, ease: 'power2.inOut' }, 69)
      .to(copyLayers, { opacity: 0, duration: 6 }, 69)
      /* 78–90: финальное утверждение */
      .to(S, { cutExp: 0.55, cutS: 0.9, cutX: D ? 28 : 0, cutY: D ? 12 : -6, duration: 10 }, 78)
      .to(shade, { opacity: D ? 1 : 0.6, duration: 8 }, 78)
      .to(copyOutro, { opacity: 1, duration: 8 }, 82)
      /* 90–100: сцена гаснет */
      .to(S, { dark: 0.94, cutY: D ? 6 : -12, duration: 8, ease: 'power1.in' }, 90)
      .to(copyOutro, { opacity: 0, y: -30, duration: 8, ease: 'power1.in' }, 91);
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

  // нажатие на матрас: вмятина в точке касания и упругий возврат
  (function press() {
    const dent = document.getElementById('dent');
    const media = productMedia;
    if (!dent || !media) return;
    let last = 0, held = false, rect = null;
    const place = (e) => {
      if (!rect) rect = productHero.getBoundingClientRect();
      dent.style.setProperty('--dx', `${((e.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
      dent.style.setProperty('--dy', `${((e.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
    };
    const down = (e) => {
      const now = performance.now(); if (now - last < 150) return; last = now;
      held = true; rect = null; place(e);
      if (navigator.vibrate) navigator.vibrate(8);
      if (reduceMotion) { gsap.set(dent, { opacity: .7, scale: 1 }); return; }
      gsap.killTweensOf([dent, media]);
      gsap.to(dent, { opacity: .85, scale: 1, duration: .14, ease: 'power2.out' });
      gsap.to(media, { scale: .986, y: 5, transformOrigin: '50% 60%', duration: .16, ease: 'power2.out' });
    };
    const move = (e) => { if (held) place(e); };
    const up = () => {
      if (!held) return; held = false;
      gsap.killTweensOf([dent, media]);
      gsap.to(dent, { opacity: 0, scale: .6, duration: .5, ease: 'power2.out' });
      gsap.to(media, { scale: 1, y: 0, duration: .9, ease: 'elastic.out(1, 0.45)' });
    };
    productHero.addEventListener('pointerdown', down);
    productHero.addEventListener('pointermove', move);
    productHero.addEventListener('pointerup', up);
    productHero.addEventListener('pointercancel', up);
    productHero.addEventListener('pointerleave', up);
  })();

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
     Доставка: клик по городу — луна и подсветка контура вокруг него
     ------------------------------------------------------------------------ */
  (function delivery() {
    const map = document.getElementById('map');
    if (!map) return;
    const DELIVERY = { default: 'от 7 дней', 'Алматы': 'мы здесь · доставка по городу' };
    const cityEl = document.getElementById('deliveryCity');
    const daysEl = document.getElementById('deliveryDays');
    const cities = Array.from(map.querySelectorAll('.city'));
    function pick(btn) {
      cities.forEach((c) => { const on = c === btn; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      map.classList.add('has-pick');
      map.style.setProperty('--mx', btn.style.getPropertyValue('--x'));
      map.style.setProperty('--my', btn.style.getPropertyValue('--y'));
      const name = btn.dataset.city;
      cityEl.textContent = name;
      daysEl.textContent = DELIVERY[name] || DELIVERY.default;
    }
    const hoverable = window.matchMedia('(hover: hover)').matches;
    cities.forEach((c) => {
      c.addEventListener('click', () => pick(c));
      c.addEventListener('mouseenter', () => { if (hoverable) pick(c); });
    });
    const first = map.querySelector('.city.is-on');
    if (first) pick(first);

    const video = document.getElementById('mapVideo');
    const saveData = navigator.connection && navigator.connection.saveData;
    if (video) {
      if (reduceMotion || saveData || isMobile() || TIER === 'low' || !('IntersectionObserver' in window)) { video.remove(); }
      else {
        new IntersectionObserver((es, io) => {
          if (!es[0].isIntersecting) return;
          io.disconnect();
          video.autoplay = true;
          video.src = video.dataset.src;
          const tryPlay = () => { video.play().catch(() => {}); };
          video.addEventListener('loadeddata', tryPlay, { once: true });
          video.addEventListener('canplay', tryPlay, { once: true });
        }, { rootMargin: '600px 0px' }).observe(map);
      }
    }
  })();

  /* ------------------------------------------------------------------------
     Линейка: цены, модели, рельс света, модальные окна, размеры
     Цены меняются только здесь. null → «— ₸».
     ------------------------------------------------------------------------ */
  // ₸. Air / Balance / Prime — за базовый размер 1600 × 2000; Royal — диапазон для 1800 × 2000.
  const PRICES = { air: 125000, balance: 220000, prime: 280000, royal: { from: 350000, to: 480000 } };
  const OLD_PRICES = { prime: 350000 };   // полная цена до скидки; нет ключа → скидки нет
  const discountPct = (k) => (OLD_PRICES[k] ? Math.round((1 - PRICES[k] / OLD_PRICES[k]) * 100) : 0);
  const WHATSAPP = '77079550808';
  const SIZE_K = { 80: 0.6, 90: 0.65, 140: 0.9, 160: 1, 180: 1.1, 200: 1.2 };   // относительно 1600 × 2000
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
    royal: { name: 'Eluna Royal', layers: null, dims: '1800 × 2000 мм' },
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
  const perNight = (p) => (p == null || typeof p === 'object' ? '' : `≈ ${fmtMoney(p / (15 * 365))} ₸ за ночь`);
  const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  (function lineup() {
    document.querySelectorAll('[data-price]').forEach((el) => { el.innerHTML = priceHTML(el.dataset.price, el.hasAttribute('data-compact')); });
    document.querySelectorAll('[data-night]').forEach((el) => { el.textContent = perNight(PRICES[el.dataset.night]); });
    document.querySelectorAll('[data-wa]').forEach((a) => { const m = MODELS[a.dataset.wa]; if (m) a.href = waLink(`Здравствуйте, интересует ${m.name}`); });

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

    // таблицы размеров (Air / Balance): цена = базовая × коэффициент, округление до 1 000
    document.querySelectorAll('.size-table[data-sizes]').forEach((box) => {
      const base = PRICES[box.dataset.sizes];
      if (base == null || typeof base === 'object') return;
      box.innerHTML = Object.keys(SIZE_K).map((w) => `<div><span>${w * 10} × 2000 мм</span><b>${fmtMoney(Math.round(base * SIZE_K[w] / 1000) * 1000)} ₸</b></div>`).join('');
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
    }
    Light.on((L) => {
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
      if (dlg.id === 'mdl-prime') requestAnimationFrame(() => sizesApi.refresh());
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
     Размеры Eluna Prime: цена = PRICES.prime × коэффициент размера
     ------------------------------------------------------------------------ */
  const sizesApi = (function sizes() {
    const options = document.querySelectorAll('#sizeOptions button');
    const mat = document.getElementById('sizePreviewMat');
    const wEl = document.getElementById('sizePreviewW');
    const hEl = document.getElementById('sizePreviewH');
    const priceEl = document.getElementById('sizePrice');
    const monthlyEl = document.getElementById('sizeMonthly');
    const installment = document.getElementById('sizeInstallment');
    const labelEl = document.getElementById('sizeLabel');
    const ctaLabel = document.getElementById('sizeCtaLabel');
    const cta = document.getElementById('sizeCta');
    const oldEl = document.getElementById('sizeOld');
    if (!options.length) return { refresh() {} };
    const price = { v: 0, o: 0 };
    let current = null;

    function apply(btn, animate) {
      current = btn;
      const w = +btn.dataset.w, h = +btn.dataset.h;
      const base = PRICES.prime;
      const p = base == null ? null : Math.round(base * (SIZE_K[w] || 1) / 1000) * 1000;
      const o = OLD_PRICES.prime ? Math.round(OLD_PRICES.prime * (SIZE_K[w] || 1) / 1000) * 1000 : null;
      const paint = () => { priceEl.textContent = fmtMoney(price.v); monthlyEl.textContent = fmtMoney(price.v / 12); if (oldEl) oldEl.textContent = o == null ? '' : `${fmtMoney(price.o)} ₸`; };
      labelEl.textContent = `${w * 10} × ${h * 10}`;
      ctaLabel.textContent = `${w * 10} × ${h * 10}`;
      cta.href = waLink(`Здравствуйте, интересует Eluna Prime, размер ${w * 10} × ${h * 10} мм`);
      installment.hidden = p == null;
      if (p == null) { priceEl.textContent = '—'; return; }
      if (!animate) { price.v = p; price.o = o || 0; paint(); return; }
      gsap.to(price, { v: p, o: o || 0, duration: 0.9, ease: 'power2.out', onUpdate: paint });
    }
    const pct = (cm) => (cm / 200) * 70;
    options.forEach((btn) => {
      btn.addEventListener('click', () => {
        options.forEach((b) => b.setAttribute('aria-checked', b === btn ? 'true' : 'false'));
        const w = +btn.dataset.w, h = +btn.dataset.h;
        gsap.to(mat, { width: `${pct(w)}%`, height: `${pct(h)}%`, duration: 1.1, ease: 'power3.inOut' });
        wEl.textContent = w * 10; hEl.textContent = h * 10;
        apply(btn, true);
      });
    });
    apply(document.querySelector('#sizeOptions button[aria-checked="true"]') || options[0], false);
    return { refresh() { if (current) { const w = +current.dataset.w, h = +current.dataset.h; gsap.set(mat, { width: `${pct(w)}%`, height: `${pct(h)}%` }); } } };
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

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
  render();

  if (DEBUG) {
    window.ELUNA = { intro, Light, get gl() { return GL; }, get tier() { return TIER; }, S, I, render, setTier };
  }
})();
