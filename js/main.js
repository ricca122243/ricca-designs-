/* ==========================================================================
   ELUNA — сцена, свет, скролл
   ========================================================================== */
(() => {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const body = document.body;

  /* ------------------------------------------------------------------------
     Слои матраса (сверху вниз)
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
     Звёздное поле — одно на всю страницу, редкое и тихое
     ------------------------------------------------------------------------ */
  (function stars() {
    const canvas = document.getElementById('stars');
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, pts = [];

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / 9000);
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() < 0.08 ? 1.1 + Math.random() * 0.7 : 0.35 + Math.random() * 0.6,
        a: 0.25 + Math.random() * 0.55,
        ph: Math.random() * Math.PI * 2,
        tw: 0.3 + Math.random() * 0.9,
        cool: Math.random() < 0.35,
      }));
      draw(performance.now());
    }
    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        const k = 0.6 + 0.4 * Math.sin(now * 0.0006 * p.tw + p.ph);
        ctx.beginPath();
        ctx.fillStyle = p.cool ? `rgba(196,208,255,${p.a * k})` : `rgba(255,243,226,${p.a * k})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    let last = 0;
    function frame(now) {
      if (!document.hidden && now - last > 80) { draw(now); last = now; }
      requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    if (!reduceMotion) requestAnimationFrame(frame);
  })();

  /* ------------------------------------------------------------------------
     Состояние сцены. Интро (время) и скролл пишут в разные объекты,
     render() их сводит — так они никогда не спорят между собой.
     ------------------------------------------------------------------------ */
  const S = {              // скролл
    lx: 66, ly: 44, lr: 1, soft: 60,
    heroS: 1, heroY: 0, heroExp: 1, rx: 0, ry: 0,
    cutO: 0, cutExp: 1, cutS: 1.04, cutX: 0, cutY: 0,
    spread: 0,             // 0..1 — насколько разошлись слои
    focus: -1,             // индекс слоя в фокусе, -1 — все
    dark: 0, brand: 0, eclipse: 1, cueO: 1,
    wmS: 1, wmY: 0, wmO: 1,
  };
  const I = {              // интро
    dark: 1, lr: 0, exp: 0, soft: 85, eclipse: 0, wmO: 1, cueO: 0,
  };
  const P = { x: 0, y: 0 }; // указатель: параллакс камеры, градусы

  const stageEl = document.getElementById('stage');
  const wordmark = document.getElementById('wordmark');
  const exposure = document.getElementById('exposure');
  const eclipse = document.getElementById('eclipse');
  const productHero = document.getElementById('productHero');
  const productCut = document.getElementById('productCut');
  const cue = document.getElementById('cue');

  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

  /* ------------------------------------------------------------------------
     Разрез как последовательность кадров (видео, нарезанное на webp).
     Кадр 0 — собранный матрас, последний — слои разошлись. Прогресс S.spread
     выбирает кадр; соседние кадры смешиваются, поэтому движение гладкое даже
     при небольшом числе кадров. Кадры грузятся после старта интро.
     ------------------------------------------------------------------------ */
  // 24 кадров 1024×576 из сгенерированного видео разлёта: f01 — собранный разрез, f24 — слои разошлись
  const SEQ = { count: 24, w: 1024, h: 576, base: 'img/seq/', pad: 2 };
  const seqCanvas = document.getElementById('seq');
  const seqCtx = seqCanvas.getContext('2d', { alpha: false });
  const frames = new Array(SEQ.count).fill(null);
  let seqLoaded = 0, seqStarted = false, seqDirty = true;

  function frameSrc(i) { return `${SEQ.base}f${String(i + 1).padStart(SEQ.pad, '0')}.webp`; }
  function loadSeq() {
    if (seqStarted) return;
    seqStarted = true;
    // порядок: первый, последний, середина, затем остальные — чтобы разлёт был виден как можно раньше
    const order = [0, SEQ.count - 1, Math.floor(SEQ.count / 2)];
    for (let i = 0; i < SEQ.count; i++) if (!order.includes(i)) order.push(i);
    let k = 0;
    const next = () => {
      if (k >= order.length) return;
      const i = order[k++];
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { frames[i] = im; seqLoaded++; seqDirty = true; drawSeq(); next(); };
      im.onerror = next;
      im.src = frameSrc(i);
      if (k < 4) next();   // первые кадры — параллельно
    };
    next();
  }
  function nearestFrame(i) {
    // ближайший загруженный кадр, если нужный ещё не пришёл
    for (let d = 0; d < SEQ.count; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }
  function sizeSeq() {
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    seqCanvas.width = Math.round(window.innerWidth * dpr);
    seqCanvas.height = Math.round(window.innerHeight * dpr);
    seqDirty = true;
    drawSeq();
  }
  function drawSeq() {
    if (!seqDirty || seqLoaded === 0) return;
    const cw = seqCanvas.width, ch = seqCanvas.height;
    // десктоп: кадр вписан целиком (фон кадра чёрный, швов не видно), чтобы разлетевшиеся
    // слои не уходили под навигацию; мобильный: кадр покрывает экран, фокус правее центра
    const mobile = window.innerWidth < 900;
    // десктоп: 78 % от «вписанного» размера — кадр не растягивается и остаётся резким
    const k = mobile ? (cw / SEQ.w) * 1.7 : Math.min(cw / SEQ.w, ch / SEQ.h) * 0.78;
    const dw = SEQ.w * k, dh = SEQ.h * k;
    const dx = (cw - dw) * (mobile ? 0.45 : 0.5), dy = (ch - dh) * (mobile ? 0.62 : 0.56);
    placeSeqLabels(dx / dpr(), dy / dpr(), dw / dpr(), dh / dpr());
    const f = Math.min(1, Math.max(0, S.spread)) * (SEQ.count - 1);
    const i0 = Math.floor(f), t = f - i0;
    const a = nearestFrame(i0), b = frames[Math.min(SEQ.count - 1, i0 + 1)];
    seqCtx.fillStyle = '#000';
    seqCtx.fillRect(0, 0, cw, ch);
    seqCtx.globalAlpha = 1;
    if (a) seqCtx.drawImage(a, dx, dy, dw, dh);
    if (b && b !== a && t > 0.02) { seqCtx.globalAlpha = t; seqCtx.drawImage(b, dx, dy, dw, dh); seqCtx.globalAlpha = 1; }
    seqDirty = false;
  }
  sizeSeq();
  window.addEventListener('resize', sizeSeq);

  /* подписи к слоям на последнем кадре разлёта: позиции заданы под f24 */
  const seqLabels = document.getElementById('seqLabels');
  const SEQ_LABEL_Y = [9, 21, 30, 39, 49, 67, 87];   // % высоты кадра, слои сверху вниз
  const seqLabelEls = LAYERS.map((l, i) => {
    const el = document.createElement('span');
    el.className = 'seq-label';
    el.style.setProperty('--y', `${SEQ_LABEL_Y[i]}%`);
    el.innerHTML = `<span class="num">${l.num}</span><span class="name">${l.name}</span><span class="spec">${String(l.cm).replace('.', ',')} см</span>`;
    seqLabels.appendChild(el);
    return el;
  });
  function dpr() { return Math.min(1.5, window.devicePixelRatio || 1); }
  function placeSeqLabels(x, y, w, h) {
    seqLabels.style.left = `${x}px`; seqLabels.style.top = `${y}px`;
    seqLabels.style.width = `${w}px`; seqLabels.style.height = `${h}px`;
  }
  const smoothstep = (v, a, b) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  let activeLayer = -1;
  const layerItems = Array.from(document.querySelectorAll('#layerList li'));
  const layerActiveEl = document.getElementById('layerActive');

  function setActiveLayer(i) {
    if (i === activeLayer) return;
    activeLayer = i;
    layerItems.forEach((li, k) => {
      li.classList.toggle('is-active', k === i);
      li.classList.toggle('is-done', k < i);
    });
    if (i >= 0) {
      layerActiveEl.querySelector('.num').textContent = LAYERS[i].num;
      layerActiveEl.querySelector('.name').textContent = layerItems[i].querySelector('.name').textContent;
    }
  }

  function render() {
    const vh = window.innerHeight;
    const diag = Math.hypot(window.innerWidth, vh);

    // свет на фото: радиус в px от диагонали, экспозиция — произведение интро и скролла
    root.style.setProperty('--lx', `${S.lx}%`);
    root.style.setProperty('--ly', `${S.ly}%`);
    root.style.setProperty('--lr', `${Math.max(0, I.lr * S.lr) * diag}px`);
    root.style.setProperty('--soft', `${Math.min(I.soft, S.soft)}%`);
    root.style.setProperty('--brand-o', `${S.brand}`);
    exposure.style.opacity = Math.max(I.dark, S.dark);
    eclipse.style.opacity = I.eclipse * S.eclipse;

    // hero: «камера» — перспектива, наклон по скроллу и указателю, наезд
    productHero.style.setProperty('--exp', `${I.exp * S.heroExp}`);
    productHero.style.transform =
      `perspective(1600px) rotateX(${(S.rx + P.y).toFixed(3)}deg) rotateY(${(S.ry + P.x).toFixed(3)}deg) ` +
      `translate3d(0, ${S.heroY * vh / 100}px, 0) scale(${S.heroS})`;
    productHero.style.opacity = S.heroExp > 0.01 ? 1 : 0;

    // разрез: кадр последовательности по прогрессу разлёта
    productCut.style.opacity = S.cutO;
    productCut.style.setProperty('--exp', `${S.cutExp}`);
    productCut.style.transform = `translate3d(${S.cutX * window.innerWidth / 100}px, ${S.cutY * vh / 100}px, 0) scale(${S.cutS})`;
    if (S.cutO > 0.001) { seqDirty = true; drawSeq(); }
    setActiveLayer(S.cutO > 0.5 ? S.focus : -1);
    seqLabels.style.opacity = (S.cutO * smoothstep(S.spread, 0.8, 1)).toFixed(3);
    seqLabelEls.forEach((el, i) => el.classList.toggle('is-active', i === S.focus && S.cutO > 0.5));

    wordmark.style.transform = `translate(-50%, calc(-50% + ${S.wmY}vh)) scale(${S.wmS})`;
    wordmark.style.opacity = S.wmO * I.wmO;
    cue.style.opacity = S.cueO * I.cueO;   // подсказка «листайте»: интро показывает, скролл прячет
  }
  window.addEventListener('resize', render);

  /* ------------------------------------------------------------------------
     Интро: темнота → пятно света → силуэт → фактура → имя
     ------------------------------------------------------------------------ */
  const letters = wordmark.querySelectorAll('span');
  const heroLines = document.querySelectorAll('#copyHero .line > span');
  const heroEyebrow = document.querySelector('#copyHero .eyebrow');
  const heroSub = document.querySelector('#copyHero .hero-sub');

  const intro = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.inOut' },
    onUpdate: render,
    onComplete: () => body.classList.remove('is-intro'),
  });

  intro
    // 0–1 с: темнота; затем проступает кольцо затмения и первое пятно света
    .to(I, { dark: 0.6, duration: 1.4 }, 0.8)
    .to(I, { eclipse: 0.7, duration: 2.2 }, 1.0)
    .to(I, { lr: 0.16, exp: 0.38, duration: 1.8, ease: 'power1.inOut' }, 1.2)
    // 2.6–4.6 с: силуэт — пятно растёт, экспозиция поднимается
    .to(I, { dark: 0.2, duration: 1.6 }, 2.4)
    .to(I, { lr: 0.42, exp: 0.72, soft: 70, duration: 2.0, ease: 'power1.inOut' }, 2.6)
    // 4.4–6.4 с: свет заливает весь продукт
    .to(I, { dark: 0, lr: 1.0, exp: 1, soft: 60, duration: 2.2, ease: 'power2.out' }, 4.4)
    .to(I, { eclipse: 1, duration: 1.6 }, 4.8)
    // 5.4 с+: имя и текст
    .to(letters, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.6, stagger: 0.09, ease: 'power3.out' }, 5.4)
    .to(heroEyebrow, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 6.1)
    .to(heroLines, { y: 0, duration: 1.3, stagger: 0.12, ease: 'power3.out' }, 6.2)
    .to(heroSub, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }, 6.7)
    .to(I, { cueO: 1, duration: 1.2 }, 7.1);

  if (reduceMotion) {
    intro.progress(1);
    body.classList.remove('is-intro');
    loadSeq();
    render();
  } else {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const start = () => { intro.play(); loadSeq(); };
    const heroImg = productHero.querySelector('img');
    // не начинаем раскрытие, пока фото не загрузилось — иначе свет осветит пустоту
    if (heroImg.complete) start(); else { heroImg.addEventListener('load', start, { once: true }); heroImg.addEventListener('error', start, { once: true }); }
    // первый жест пользователя — ускоряем интро, не ломая его
    const hurry = () => {
      if (intro.progress() < 1) intro.timeScale(3.2);
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
     Скролл-сцена
     ------------------------------------------------------------------------ */
  const copyHero = document.getElementById('copyHero');
  const copyLayers = document.getElementById('copyLayers');
  const copyOutro = document.getElementById('copyOutro');
  const shade = document.getElementById('shade');

  const mm = gsap.matchMedia();

  function buildStage(isDesktop) {
    const D = isDesktop;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: render,
      scrollTrigger: {
        trigger: stageEl,
        start: 'top top',
        end: '+=560%',
        pin: true,
        scrub: 1.1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    tl
      /* 0–18: hero → камера облетает продукт: наклон, наезд; свет к центру; имя уходит в nav */
      .to(S, { lx: 50, ly: 50, heroS: 1.1, heroY: -4, rx: 7, ry: -5, duration: 18, ease: 'power1.inOut' }, 0)
      .to(S, { wmS: 0.7, wmY: -18, wmO: 0, duration: 15, ease: 'power1.in' }, 0)
      .to(S, { brand: 1, duration: 8 }, 9)
      .to(S, { eclipse: 0.35, duration: 18 }, 0)
      .to(copyHero, { opacity: 0, y: -40, duration: 9 }, 2)
      .to(S, { cueO: 0, duration: 5 }, 0)

      /* 18–30: фото уходит в темноту, разрез собранным проявляется на его месте */
      .to(S, { heroExp: 0, heroS: 1.18, heroY: -9, rx: 10, duration: 11, ease: 'power1.in' }, 18)
      .to(S, { cutO: 1, cutS: 1.0, cutX: D ? 9 : 0, duration: 10 }, 22)
      .to(S, { eclipse: 0, duration: 8 }, 20)
      .to(copyLayers, { opacity: 1, duration: 8 }, 26)

      /* 30–44: слои упруго расходятся — лёгкий перелёт и возврат, как у пружины */
      .to(S, { spread: 1, duration: 14, ease: 'back.out(1.7)' }, 30)
      .to(S, { cutS: 0.9, cutY: D ? 1 : 0, duration: 14, ease: 'power1.inOut' }, 30)

      /* 44–72: фокус идёт по слоям сверху вниз, остальные уходят в тень */
      .to(S, { focus: 0, duration: 0.01 }, 44)
      .to(S, { focus: 1, duration: 0.01 }, 48)
      .to(S, { focus: 2, duration: 0.01 }, 52)
      .to(S, { focus: 3, duration: 0.01 }, 56)
      .to(S, { focus: 4, duration: 0.01 }, 60)
      .to(S, { focus: 5, duration: 0.01 }, 64)
      .to(S, { focus: 6, duration: 0.01 }, 68)
      .to(S, { focus: -1, duration: 0.01 }, 72)

      /* 72–82: слои собираются обратно в целый матрас */
      .to(S, { spread: 0, duration: 10, ease: 'back.inOut(1.2)' }, 72)
      .to(S, { cutS: 1.0, duration: 10, ease: 'power2.inOut' }, 72)
      .to(copyLayers, { opacity: 0, duration: 6 }, 72)

      /* 82–92: финальное утверждение над целым продуктом */
      .to(S, { cutExp: 0.55, cutS: 0.9, cutX: D ? 28 : 0, cutY: D ? 12 : -14, duration: 10 }, 80)
      .to(shade, { opacity: D ? 1 : 0.6, duration: 8 }, 80)
      .to(copyOutro, { opacity: 1, duration: 8 }, 84)

      /* 92–100: сцена гаснет — переход в манифест на том же тёмном */
      .to(S, { dark: 0.94, cutY: D ? 6 : -20, duration: 8, ease: 'power1.in' }, 92)
      .to(copyOutro, { opacity: 0, y: -30, duration: 8, ease: 'power1.in' }, 93);

    return tl;
  }

  mm.add('(min-width: 900px)', () => { buildStage(true); return () => {}; });
  mm.add('(max-width: 899px)', () => { buildStage(false); return () => {}; });

  // параллакс камеры от указателя: инерционный, с длинным выбегом
  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const toX = gsap.quickTo(P, 'x', { duration: 1.6, ease: 'power3.out', onUpdate: render });
    const toY = gsap.quickTo(P, 'y', { duration: 1.6, ease: 'power3.out', onUpdate: render });
    stageEl.addEventListener('pointermove', (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      toX(nx * 3.2);
      toY(-ny * 2.2);
    });
    stageEl.addEventListener('pointerleave', () => { toX(0); toY(0); });
  }

  // над светлой главой навигация становится тёмной
  (function navTheme() {
    const light = document.querySelectorAll('.motion');
    if (!('IntersectionObserver' in window) || !light.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => body.classList.toggle('on-light', en.isIntersecting));
    }, { rootMargin: '-40px 0px -92% 0px' });
    light.forEach((el) => io.observe(el));
  })();

  /* ------------------------------------------------------------------------
     Технология: изоляция движения. Разрез пружинного блока на canvas —
     груз опускается слева, пружины гасят нагрузку локально, правая половина
     остаётся неподвижной. Отпускание — упругое, с затухающим перелётом.
     ------------------------------------------------------------------------ */
  (function motion() {
    const canvas = document.getElementById('motionCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const leftEl = document.getElementById('motionLeft');
    const rightEl = document.getElementById('motionRight');
    const state = { drop: 0, xw: 0.27 };
    let w = 0, h = 0, dpr = 1, playing = false;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    const fmt = (mm) => (mm === 0 ? '0,0' : mm.toFixed(1).replace('.', ',').replace('-0,0', '0,0')) + ' мм';

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const N = w < 600 ? 22 : 36;
      const pad = w * 0.04;
      const cell = (w - pad * 2) / N;
      const springW = cell * 0.62;
      const baseY = h * 0.86;
      const springH = h * 0.42;
      const topY = baseY - springH;          // верх пружин в покое
      const comfortH = h * 0.075;            // слои комфорта над пружинами
      const sigma = w * 0.085;
      const xw = pad + state.xw * (w - pad * 2);
      const maxDip = springH * 0.34;

      const dipAt = (x) => maxDip * state.drop * Math.exp(-((x - xw) ** 2) / (2 * sigma * sigma));

      // основание
      ctx.fillStyle = '#d9d2c6';
      ctx.fillRect(pad, baseY, w - pad * 2, h * 0.035);

      // пружины в карманах
      for (let i = 0; i < N; i++) {
        const x = pad + cell * i + (cell - springW) / 2;
        const cx = x + springW / 2;
        const dip = dipAt(cx);
        const y = topY + dip;
        const hh = springH - dip;
        const k = dip / maxDip;
        ctx.fillStyle = `rgb(${255 - 20 * k}, ${255 - 24 * k}, ${255 - 30 * k})`;
        ctx.strokeStyle = 'rgba(21,22,27,0.14)';
        ctx.lineWidth = 1;
        roundRect(x, y, springW, hh, springW * 0.3);
        ctx.fill(); ctx.stroke();
        // витки
        ctx.strokeStyle = 'rgba(21,22,27,0.10)';
        const coils = 5;
        for (let c = 1; c < coils; c++) {
          const yy = y + (hh / coils) * c;
          ctx.beginPath(); ctx.moveTo(x + 3, yy); ctx.lineTo(x + springW - 3, yy); ctx.stroke();
        }
      }

      // слои комфорта — плавная поверхность по вершинам пружин
      ctx.beginPath();
      ctx.moveTo(pad, baseY);
      ctx.lineTo(pad, topY - comfortH + dipAt(pad));
      const steps = 80;
      for (let s = 0; s <= steps; s++) {
        const x = pad + ((w - pad * 2) * s) / steps;
        ctx.lineTo(x, topY - comfortH + dipAt(x));
      }
      ctx.lineTo(w - pad, baseY);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#f7f3ec';
      ctx.fillRect(pad, topY - comfortH - 2, w - pad * 2, comfortH + 4);
      ctx.restore();
      // контур поверхности
      ctx.beginPath();
      for (let s = 0; s <= steps; s++) {
        const x = pad + ((w - pad * 2) * s) / steps;
        const y = topY - comfortH + dipAt(x);
        s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = 'rgba(21,22,27,0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // груз слева
      const r = Math.max(22, h * 0.085);
      const gy = topY - comfortH + dipAt(xw) - r + 2;
      const grad = ctx.createRadialGradient(xw - r * 0.35, gy - r * 0.4, r * 0.1, xw, gy, r);
      grad.addColorStop(0, '#4a4b52'); grad.addColorStop(1, '#15161b');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(xw, gy, r, 0, Math.PI * 2); ctx.fill();
      // мягкая тень под грузом
      ctx.fillStyle = `rgba(21,22,27,${0.08 + 0.1 * state.drop})`;
      ctx.beginPath(); ctx.ellipse(xw, gy + r + 6, r * 1.15, r * 0.18, 0, 0, Math.PI * 2); ctx.fill();

      // уровень справа: стакан воды, который не шелохнулся
      const xr = pad + 0.78 * (w - pad * 2);
      const ys = topY - comfortH + dipAt(xr);
      const gw = Math.max(26, h * 0.085), gh = gw * 1.35;
      ctx.strokeStyle = 'rgba(21,22,27,0.55)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(xr - gw / 2, ys - gh); ctx.lineTo(xr - gw / 2 + gw * 0.08, ys); ctx.lineTo(xr + gw / 2 - gw * 0.08, ys); ctx.lineTo(xr + gw / 2, ys - gh);
      ctx.stroke();
      ctx.fillStyle = 'rgba(120, 150, 200, 0.22)';
      ctx.beginPath();
      ctx.moveTo(xr - gw / 2 + gw * 0.03, ys - gh * 0.62); ctx.lineTo(xr - gw / 2 + gw * 0.08, ys); ctx.lineTo(xr + gw / 2 - gw * 0.08, ys); ctx.lineTo(xr + gw / 2 - gw * 0.03, ys - gh * 0.62);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(80, 110, 170, 0.6)';
      ctx.beginPath(); ctx.moveTo(xr - gw / 2 + gw * 0.03, ys - gh * 0.62); ctx.lineTo(xr + gw / 2 - gw * 0.03, ys - gh * 0.62); ctx.stroke();

      // линия-уровень от стакана к правому краю
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = 'rgba(21,22,27,0.3)';
      ctx.beginPath(); ctx.moveTo(xr + gw / 2 + 12, ys - gh * 0.62); ctx.lineTo(w - pad, ys - gh * 0.62); ctx.stroke();
      ctx.setLineDash([]);

      const mmScale = 60 / maxDip;           // 60 мм при полном прогибе
      leftEl.textContent = (state.drop > 0.005 ? '−' : '') + fmt(dipAt(xw) * mmScale);
      rightEl.textContent = fmt(dipAt(xr) * mmScale);
    }

    function roundRect(x, y, ww, hh, rr) {
      rr = Math.min(rr, ww / 2, hh / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + ww, y, x + ww, y + hh, rr);
      ctx.arcTo(x + ww, y + hh, x, y + hh, rr);
      ctx.arcTo(x, y + hh, x, y, rr);
      ctx.arcTo(x, y, x + ww, y, rr);
      ctx.closePath();
    }

    const loop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6, onUpdate: draw });
    loop
      .to(state, { drop: 1, duration: 1.1, ease: 'power2.in' })
      .to(state, { drop: 0.86, duration: 0.5, ease: 'sine.inOut' })
      .to(state, { drop: 1, duration: 0.5, ease: 'sine.inOut' })
      .to(state, { drop: 0, duration: 1.5, ease: 'elastic.out(1, 0.42)' }, '+=0.5')
      .to(state, { xw: 0.33, duration: 2.4, ease: 'power2.inOut' }, 0.2)
      .to(state, { xw: 0.27, duration: 1.2, ease: 'power2.inOut' }, 3.2);

    ScrollTrigger.create({
      trigger: canvas, start: 'top 85%', end: 'bottom 15%',
      onEnter: () => { if (!reduceMotion) loop.play(); },
      onEnterBack: () => { if (!reduceMotion) loop.play(); },
      onLeave: () => loop.pause(),
      onLeaveBack: () => loop.pause(),
    });

    if (reduceMotion) { state.drop = 1; }
    resize();
    window.addEventListener('resize', resize);
  })();

  /* ------------------------------------------------------------------------
     Появление по скроллу для остальных секций
     ------------------------------------------------------------------------ */
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.4, stagger: 0.1, ease: 'power3.out', overwrite: true }),
  });
  document.querySelectorAll('.manifesto__text').forEach((block) => {
    gsap.to(block.querySelectorAll('.reveal-line > span'), {
      y: 0, duration: 1.6, stagger: 0.14, ease: 'power3.out',
      scrollTrigger: { trigger: block, start: 'top 80%' },
    });
  });

  // плавный скролл по якорям (учитывает pin)
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      body.classList.remove('is-intro');
      intro.progress(1);
      const y = id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 40;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ------------------------------------------------------------------------
     Конструкция: интерактивный разрез
     ------------------------------------------------------------------------ */
  (function construction() {
    const cutaway = document.getElementById('cutaway');
    const detail = document.getElementById('layerDetail');
    if (!cutaway || !detail) return;

    const FIRMNESS = {
      soft:   { cm: { latex: 4, coir: 1.5, gel: 5 }, springs: '1 200 шт · 7 зон, мягкая проволока 1,8 мм' },
      medium: { cm: { latex: 3, coir: 3,   gel: 4 }, springs: '1 200 шт · 7 зон, проволока 2,0 мм' },
      firm:   { cm: { latex: 2, coir: 5,   gel: 3 }, springs: '1 200 шт · 7 зон, усиленная проволока 2,2 мм' },
    };
    let firmness = 'medium';
    let active = 0;

    const buttons = LAYERS.map((l, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `cut-layer cut-layer--${l.key}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.style.setProperty('--cm', l.cm);
      b.innerHTML = `<span class="cut-layer__fill"></span><span class="cut-layer__label"><span class="num">${l.num}</span><span class="name">${l.name}</span></span>`;
      b.addEventListener('click', () => select(i));
      b.addEventListener('mouseenter', () => select(i, true));
      cutaway.appendChild(b);
      return b;
    });
    buttons[0].classList.add('is-active');

    const fmtCm = (v) => String(v).replace('.', ',') + ' см';
    const currentCm = (i) => {
      const o = FIRMNESS[firmness].cm[LAYERS[i].key];
      return o != null ? o : LAYERS[i].cm;
    };

    function select(i, hover) {
      active = i;
      buttons.forEach((b, k) => {
        b.classList.toggle('is-active', k === i);
        b.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
      const l = LAYERS[i];
      gsap.killTweensOf(detail);
      gsap.fromTo(detail, { opacity: 0.35, x: 10 }, { opacity: 1, x: 0, duration: hover ? 0.5 : 0.7, ease: 'power3.out' });
      detail.querySelector('.layer-detail__num').textContent = l.num;
      detail.querySelector('.layer-detail__name').textContent = l.name;
      detail.querySelector('.layer-detail__text').textContent = l.key === 'springs' ? `${l.text} ${FIRMNESS[firmness].springs}.` : l.text;
      detail.querySelector('[data-k="thickness"]').textContent = fmtCm(currentCm(i));
      detail.querySelector('[data-k="density"]').textContent = l.density;
      detail.querySelector('[data-k="role"]').textContent = l.role;
    }

    document.querySelectorAll('[data-firmness]').forEach((btn) => {
      btn.addEventListener('click', () => {
        firmness = btn.dataset.firmness;
        document.querySelectorAll('[data-firmness]').forEach((b) => b.setAttribute('aria-checked', b === btn ? 'true' : 'false'));
        buttons.forEach((b, i) => gsap.to(b, { '--cm': currentCm(i), duration: 0.9, ease: 'power3.inOut' }));
        select(active);
      });
    });

    select(0);
  })();

  /* ------------------------------------------------------------------------
     Линейка: цены, модели, разрезы, WhatsApp, липкая плашка
     Цены меняются только здесь. null → «— ₸».
     ------------------------------------------------------------------------ */
  const PRICES = { air: null, balance: null, prime: null };   // ₸ за базовый размер 160 × 200
  const WHATSAPP = '77079550808';
  const MODELS = {
    air: {
      name: 'Eluna Air',
      layers: [
        { kind: 'knit',    cm: 0.6, name: 'Вискозный трикотаж' },
        { kind: 'foam',    cm: 2,   name: 'Ортопена', spec: '2 см' },
        { kind: 'felt',    cm: 0.6, name: 'Термовойлок', note: 'Долговечный, не сбивается и не собирает пыль внутри матраса' },
        { kind: 'springs', cm: 14,  name: 'Армированные пружины', note: 'Без эффекта гамака — тело лежит ровно, спина в балансе' },
        { kind: 'felt',    cm: 0.6, name: 'Термовойлок' },
        { kind: 'coir',    cm: 1,   name: 'Натуральный кокос', spec: '1 см' },
        { kind: 'knit',    cm: 0.6, name: 'Вискозный трикотаж' },
      ],
    },
    balance: {
      name: 'Eluna Balance',
      layers: [
        { kind: 'knit',    cm: 0.6, name: 'Плотный вискозный трикотаж' },
        { kind: 'foam',    cm: 2,   name: 'Ортопена' },
        { kind: 'felt',    cm: 0.6, name: 'Термовойлок', note: 'Долговечный, не сбивается и не собирает пыль внутри матраса' },
        { kind: 'coir',    cm: 2,   name: 'Натуральный кокос', spec: '2 см' },
        { kind: 'springs', cm: 14,  name: 'Армированные пружины', spec: 'усиленный боковой каркас', note: 'Без эффекта гамака — тело лежит ровно, спина в балансе' },
        { kind: 'felt',    cm: 0.6, name: 'Термовойлок' },
        { kind: 'coir',    cm: 1,   name: 'Натуральный кокос', spec: '1 см' },
        { kind: 'foam',    cm: 1.5, name: 'Ортопена' },
        { kind: 'knit',    cm: 0.6, name: 'Плотный вискозный трикотаж' },
      ],
    },
    prime: {
      name: 'Eluna Prime',
      layers: [
        { kind: 'cotton',  cm: 1,   name: 'Чехол из 100 % хлопка', spec: 'ручная работа' },
        { kind: 'latex',   cm: 2,   name: 'Натуральный латекс', spec: '2 см', note: 'Микромассажный эффект — тело расслабляется' },
        { kind: 'felt',    cm: 0.6, name: 'Термовойлок', note: 'Долговечный, не сбивается и не собирает пыль внутри матраса' },
        { kind: 'coir',    cm: 2,   name: 'Натуральный кокос', spec: '2 см — отвечает за жёсткость' },
        { kind: 'springs', cm: 16,  name: 'Армированные пружины', note: 'Без эффекта гамака — тело лежит ровно, спина в балансе' },
        { kind: 'coir',    cm: 2,   name: 'Натуральный кокос', spec: '2 см' },
        { kind: 'felt',    cm: 0.6, name: 'Термовойлок' },
        { kind: 'latex',   cm: 2,   name: 'Натуральный латекс', spec: '2 см' },
        { kind: 'cotton',  cm: 1,   name: 'Чехол из 100 % хлопка' },
      ],
    },
  };

  const fmtMoney = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
  const priceText = (p) => (p == null ? '— ₸' : `${fmtMoney(p)} ₸`);
  const perNight = (p) => (p == null ? '≈ — ₸ за ночь' : `≈ ${fmtMoney(p / (15 * 365))} ₸ за ночь`);
  const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

  (function lineup() {
    // цены и ссылки
    document.querySelectorAll('[data-price]').forEach((el) => { el.textContent = priceText(PRICES[el.dataset.price]); });
    document.querySelectorAll('[data-night]').forEach((el) => { el.textContent = perNight(PRICES[el.dataset.night]); });
    document.querySelectorAll('[data-wa]').forEach((a) => { a.href = waLink(`Здравствуйте, интересует ${MODELS[a.dataset.wa].name}`); });

    // разрезы
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    document.querySelectorAll('.xs[data-xs]').forEach((box) => {
      const m = MODELS[box.dataset.xs];
      if (!m) return;
      box.innerHTML = m.layers.map((l) => `
        <div class="xs__layer xs--${l.kind}">
          <div class="xs__fill" style="--cm:${l.cm}"></div>
          <div class="xs__text"><b>${esc(l.name)}</b>${l.spec ? `<span class="cm">${esc(l.spec)}</span>` : ''}${l.note ? `<span class="note">${esc(l.note)}</span>` : ''}</div>
        </div>`).join('');
    });

    // Prime: разлёт слоёв при появлении + липкая плашка на мобильном
    const prime = document.getElementById('primeBlock');
    const primeXs = prime && prime.querySelector('.xs--prime');
    const sticky = document.getElementById('stickyCta');
    if (!prime || !('IntersectionObserver' in window)) return;
    if (reduceMotion && primeXs) primeXs.classList.add('is-open');

    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && primeXs) primeXs.classList.add('is-open');
      });
    }, { threshold: 0.35 }).observe(prime);

    if (sticky) {
      new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const on = en.isIntersecting;
          sticky.classList.toggle('is-on', on);
          sticky.setAttribute('aria-hidden', on ? 'false' : 'true');
          sticky.querySelector('a').tabIndex = on ? 0 : -1;
        });
      }, { threshold: 0.05 }).observe(prime);
    }
  })();

  /* ------------------------------------------------------------------------
     Размеры Eluna Prime: цена = PRICES.prime × коэффициент размера
     ------------------------------------------------------------------------ */
  (function sizes() {
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
    if (!options.length) return;

    const SIZE_K = { 80: 0.6, 90: 0.65, 140: 0.9, 160: 1, 180: 1.1, 200: 1.2 };   // относительно 160 × 200
    const price = { v: 0 };

    function apply(btn, animate) {
      const w = +btn.dataset.w, h = +btn.dataset.h;
      const base = PRICES.prime;
      const p = base == null ? null : Math.round(base * (SIZE_K[w] || 1) / 1000) * 1000;
      labelEl.textContent = `${w} × ${h}`;
      ctaLabel.textContent = `${w} × ${h}`;
      cta.href = waLink(`Здравствуйте, интересует Eluna Prime, размер ${w} × ${h}`);
      installment.hidden = p == null;
      if (p == null) { priceEl.textContent = '—'; return; }
      if (!animate) { price.v = p; priceEl.textContent = fmtMoney(p); monthlyEl.textContent = fmtMoney(p / 12); return; }
      gsap.to(price, {
        v: p, duration: 0.9, ease: 'power2.out',
        onUpdate: () => { priceEl.textContent = fmtMoney(price.v); monthlyEl.textContent = fmtMoney(price.v / 12); },
      });
    }

    options.forEach((btn) => {
      btn.addEventListener('click', () => {
        options.forEach((b) => b.setAttribute('aria-checked', b === btn ? 'true' : 'false'));
        const w = +btn.dataset.w, h = +btn.dataset.h;
        const pct = (cm) => (cm / 200) * 70;   // 200 см = 70 % комнаты
        gsap.to(mat, { width: `${pct(w)}%`, height: `${pct(h)}%`, duration: 1.1, ease: 'power3.inOut' });
        wEl.textContent = w; hEl.textContent = h;
        apply(btn, true);
      });
    });
    apply(document.querySelector('#sizeOptions button[aria-checked="true"]') || options[0], false);
  })();

  // пересчёт ScrollTrigger после загрузки шрифтов и картинок
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
  render();
})();
