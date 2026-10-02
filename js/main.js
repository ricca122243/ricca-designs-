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
     Звёздное небо. Статичный слой рисуется один раз (глубина, цвет звёзд,
     ореолы ярких, лёгкая полоса Млечного Пути), сверху — маленький слой
     мерцания и редкие метеоры. Параллакс по скроллу — одним transform.
     ------------------------------------------------------------------------ */
  (function stars() {
    const base = document.getElementById('stars');
    if (!base) return;
    const twinkle = document.createElement('canvas');
    twinkle.className = 'stars stars--twinkle';
    twinkle.setAttribute('aria-hidden', 'true');
    base.after(twinkle);
    const bctx = base.getContext('2d');
    const tctx = twinkle.getContext('2d');

    let w = 0, h = 0, H = 0, dpr = 1, flick = [], meteors = [];
    const OVER = 1.18;   // запас по высоте под параллакс

    // цвет по «температуре»: от голубого через белый к тёплому
    const tint = (t) => {
      if (t < 0.25) return [196, 208, 255];
      if (t < 0.7) return [245, 243, 238];
      if (t < 0.92) return [255, 236, 205];
      return [255, 208, 160];
    };
    const rnd = (a, b) => a + Math.random() * (b - a);

    function paintBase() {
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, w, H);

      // Млечный Путь — диагональная полоса из очень мелких тусклых точек
      const mob = w < 900;
      const band = Math.round((w * H) / (mob ? 2400 : 1400));
      for (let i = 0; i < band; i++) {
        const u = Math.random();
        const g = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;   // сгущение к оси
        const x = u * w, y = H * (0.85 - u * 0.55) + g * H * 0.42;
        const c = tint(Math.random());
        bctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${rnd(0.04, 0.16)})`;
        bctx.fillRect(x, y, 1, 1);
      }

      // звёзды: степенное распределение — много мелких, единицы крупных
      const n = Math.round((w * H) / (mob ? 5000 : 3200));
      for (let i = 0; i < n; i++) {
        const x = Math.random() * w, y = Math.random() * H;
        const m = Math.pow(Math.random(), 3.2);           // 0..1, редко близко к 1
        const r = 0.3 + m * 1.6;
        const a = 0.25 + m * 0.7;
        const c = tint(Math.random());
        if (m > 0.72) {                                     // ореол у ярких
          const g = bctx.createRadialGradient(x, y, 0, x, y, r * 9);
          g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.2 * m})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          bctx.fillStyle = g;
          bctx.beginPath(); bctx.arc(x, y, r * 9, 0, Math.PI * 2); bctx.fill();
          if (m > 0.9) {                                    // крест дифракции у самых ярких
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

      // мерцающие — отдельный небольшой набор
      flick = Array.from({ length: Math.round(w / (mob ? 64 : 36)) }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: rnd(0.6, 1.4), c: tint(Math.random()),
        ph: Math.random() * Math.PI * 2, sp: rnd(0.4, 1.3), a: rnd(0.35, 0.8),
      }));
    }

    function resize() {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight; H = Math.round(h * OVER);
      base.width = w * dpr; base.height = H * dpr;
      base.style.height = `${H}px`;
      twinkle.width = w * dpr; twinkle.height = h * dpr;
      paintBase();
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
      // метеоры: короткий штрих, живёт ~0.9 с
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

    let last = 0, nextMeteor = performance.now() + rnd(6000, 14000);
    function frame(now) {
      if (!document.hidden) {
        if (now > nextMeteor) {
          meteors.push({ x: rnd(0.1, 0.9) * w, y: rnd(0.05, 0.5) * h, vx: rnd(120, 220) * (Math.random() < 0.5 ? -1 : 1), vy: rnd(60, 120), t0: now });
          nextMeteor = now + rnd(9000, 22000);
        }
        const busy = meteors.length > 0;
        if (busy || now - last > 110) { drawTwinkle(now); last = now; }
      }
      requestAnimationFrame(frame);
    }

    // параллакс: статичный слой чуть отстаёт от скролла
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const max = H - h;
        const y = Math.min(max, window.scrollY * 0.035);
        base.style.transform = `translate3d(0, ${-y}px, 0)`;
        ticking = false;
      });
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    if (!reduceMotion) requestAnimationFrame(frame);
  })();

  /* ------------------------------------------------------------------------
     Состояние сцены. Интро (время) и скролл пишут в разные объекты,
     render() их сводит — так они никогда не спорят между собой.
     ------------------------------------------------------------------------ */
  const S = {              // скролл
    lx: 30, ly: 22, lr: 1, soft: 60,
    heroS: 1, heroY: 0, heroExp: 1, rx: 0, ry: 0,
    cutO: 0, cutExp: 1, cutS: 1.04, cutX: 0, cutY: 0,
    spread: 0,             // 0..1 — насколько разошлись слои
    focus: -1,             // индекс слоя в фокусе, -1 — все
    dark: 0, brand: 0, eclipse: 1, cueO: 1,
    wmS: 1, wmY: 0, wmO: 1,
  };
  const I = {              // интро
    dark: 1, lr: 0, exp: 0, soft: 85, eclipse: 0, wmO: 1, cueO: 0, moon: 0, beam: 0, glow: 0, lift: 6, heroS: 0.96,
  };
  const P = { x: 0, y: 0 }; // указатель: параллакс камеры, градусы

  const stageEl = document.getElementById('stage');
  const wordmark = document.getElementById('wordmark');
  const exposure = document.getElementById('exposure');
  const eclipse = document.getElementById('eclipse');
  const productHero = document.getElementById('productHero');
  const productCut = document.getElementById('productCut');
  const cue = document.getElementById('cue');
  const moonHero = document.getElementById('moonHero');
  const moonGlow = document.getElementById('moonGlow');
  const moonWrap = document.getElementById('moonWrap');
  const moonbeam = document.getElementById('moonbeam');

  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

  /* ------------------------------------------------------------------------
     Разрез как последовательность кадров (видео, нарезанное на webp).
     Кадр 0 — собранный матрас, последний — слои разошлись. Прогресс S.spread
     выбирает кадр; соседние кадры смешиваются, поэтому движение гладкое даже
     при небольшом числе кадров. Кадры грузятся после старта интро.
     ------------------------------------------------------------------------ */
  // 24 кадров 1024×576 из сгенерированного видео разлёта: f01 — собранный разрез, f24 — слои разошлись
  const SEQ = { count: 24, w: 1920, h: 1080, base: 'img/seq/', pad: 2 };
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
    const dpr = dprSeq();
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
    const k = mobile ? (cw / SEQ.w) * 1.12 : Math.min(cw / SEQ.w, ch / SEQ.h) * 0.7;
    const dw = SEQ.w * k, dh = SEQ.h * k;
    const dx = (cw - dw) * (mobile ? 0.5 : 0.5), dy = (ch - dh) * (mobile ? 0.56 : 0.56);
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
    el.innerHTML = `<span class="num">${l.num}</span><span class="name">${l.name}</span><span class="spec">${Math.round(l.cm * 10)} мм</span>`;
    seqLabels.appendChild(el);
    return el;
  });
  // телефон: до 2× (иначе кадр мылит на retina), десктоп: 1.5×
  function dprSeq() { return Math.min(window.innerWidth < 900 ? 2 : 1.5, window.devicePixelRatio || 1); }
  function dpr() { return dprSeq(); }
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
    const mob = window.innerWidth < 900;   // на телефоне луна справа сверху
    root.style.setProperty('--lx', `${(mob ? 82 : S.lx) + P.x * 0.6}%`);
    root.style.setProperty('--ly', `${(mob ? 9 : S.ly) - P.y * 0.5}%`);
    root.style.setProperty('--ls', `${Math.max(0.02, I.lr * S.lr * 2.1).toFixed(4)}`);   // масштаб «дыры» света
    moonbeam.style.opacity = (I.beam * S.eclipse).toFixed(3);
    moonHero.style.opacity = (I.moon * S.eclipse).toFixed(3);
    moonGlow.style.opacity = (I.glow * S.eclipse).toFixed(3);
    // луна отстаёт от указателя в обратную сторону — глубина
    moonWrap.style.setProperty('--mpx', `${(-P.x * 2.2).toFixed(2)}px`); moonWrap.style.setProperty('--mpy', `${(-P.y * 2).toFixed(2)}px`);
    moonbeam.style.setProperty('--mpx', `${(-P.x * 2.2).toFixed(2)}px`); moonbeam.style.setProperty('--mpy', `${(-P.y * 2).toFixed(2)}px`);
    root.style.setProperty('--brand-o', `${S.brand}`);
    exposure.style.opacity = Math.max(I.dark, S.dark);
    eclipse.style.opacity = I.eclipse * S.eclipse;

    // hero: «камера» — перспектива, наклон по скроллу и указателю, наезд
    const heroExp = I.exp * S.heroExp;
    productHero.style.setProperty('--dim', `${(1 - heroExp).toFixed(3)}`);
    productHero.classList.toggle('is-lit', I.lr * S.lr >= 0.999);   // маска больше не нужна — свет открыт полностью
    productHero.style.transform =
      `perspective(1600px) rotateX(${(S.rx + P.y).toFixed(3)}deg) rotateY(${(S.ry + P.x).toFixed(3)}deg) ` +
      `translate3d(${(P.x * 3.4).toFixed(2)}px, ${S.heroY * vh / 100 + I.lift * vh / 100 - P.y * 2.6}px, 0) scale(${S.heroS * I.heroS})`;
    productHero.style.opacity = S.heroExp > 0.01 ? 1 : 0;

    // разрез: кадр последовательности по прогрессу разлёта
    productCut.style.opacity = S.cutO;
    productCut.style.setProperty('--dim', `${(1 - S.cutExp).toFixed(3)}`);
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
    // 0–1.6 с: из темноты всходит луна — единственный источник света
    .to(I, { moon: 1, duration: 1.8, ease: 'power2.out' }, 0.2)
    .to(moonHero, { scale: 1, y: 0, duration: 2.4, ease: 'power2.out' }, 0.2)
    .to(I, { glow: 1, duration: 1.8, ease: 'power2.out' }, 0.6)
    // матрас подплывает к свету
    .to(I, { lift: 0, heroS: 1, duration: 2.6, ease: 'power3.out' }, 1.8)
    // 1.0–2.8 с: логотип — знак, буквы, Sleep Tech
    .to(wmMark, { opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out' }, 1.0)
    .to(wmGlow, { opacity: 1, duration: 1.0, ease: 'power2.inOut' }, 1.1)
    .to(wmGlow, { opacity: 0, duration: 1.6, ease: 'power2.inOut' }, 2.6)
    .to(letters, { opacity: 1, y: 0, duration: 1.2, stagger: 0.07, ease: 'power3.out' }, 1.4)
    .to(wmSub, { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' }, 2.3)
    // 1.8–4.6 с: лунный свет ложится на матрас — луч, пятно растёт, экспозиция поднимается
    .to(I, { beam: 1, duration: 1.8, ease: 'power1.inOut' }, 1.8)
    .to(I, { dark: 0.6, duration: 1.2 }, 1.9)
    .to(I, { lr: 0.18, exp: 0.4, duration: 1.3, ease: 'power1.inOut' }, 2.0)
    .to(I, { dark: 0.2, duration: 1.2 }, 2.8)
    .to(I, { lr: 0.45, exp: 0.74, duration: 1.4, ease: 'power1.inOut' }, 2.9)
    .to(I, { dark: 0, lr: 1.0, exp: 1, duration: 1.6, ease: 'power2.out' }, 3.5)
    .to(I, { eclipse: 1, duration: 1.3 }, 3.6)
    // 3.8–5.2 с: текст hero
    .to(heroEyebrow, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 3.9)
    .to(heroLines, { y: 0, duration: 1.2, stagger: 0.12, ease: 'power3.out' }, 4.0)
    .to(heroSub, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' }, 4.5)
    .to(I, { cueO: 1, duration: 1.0 }, 5.2);

  if (reduceMotion) {
    intro.progress(1);
    body.classList.remove('is-intro');
    loadSeq();
    render();
  } else {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const start = () => { intro.play(); };
    const heroImg = productHero.querySelector('img');
    // не начинаем раскрытие, пока фото не загрузилось — иначе свет осветит пустоту
    if (heroImg.complete) start(); else { heroImg.addEventListener('load', start, { once: true }); heroImg.addEventListener('error', start, { once: true }); }
    // первый жест пользователя — ускоряем интро, не ломая его
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
        end: D ? '+=560%' : '+=480%',
        pin: true,
        scrub: D ? 1.1 : 0.8,
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
      .to(S, { cutExp: 0.55, cutS: 0.9, cutX: D ? 28 : 0, cutY: D ? 12 : -6, duration: 10 }, 80)
      .to(shade, { opacity: D ? 1 : 0.6, duration: 8 }, 80)
      .to(copyOutro, { opacity: 1, duration: 8 }, 84)

      /* 92–100: сцена гаснет — переход в манифест на том же тёмном */
      .to(S, { dark: 0.94, cutY: D ? 6 : -12, duration: 8, ease: 'power1.in' }, 92)
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
      toX(nx * 3.5);
      toY(-ny * 2.6);
    });
    stageEl.addEventListener('pointerleave', () => { toX(0); toY(0); });
  }

  /* ------------------------------------------------------------------------
     Сон вдвоём: поверхность матраса как цепочка масс и пружин на canvas.
     Сторона А свободно колеблется; у центрального шва связь ослаблена,
     а затухание выше — волна гаснет, сторона Б почти не двигается.
     Фиксированный шаг физики, рисование только пока есть энергия.
     ------------------------------------------------------------------------ */
  (function motion() {
    const cv = document.getElementById('motionCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const tag = document.getElementById('motionTag');
    const btn = document.getElementById('motionBtn');

    const N = 120, SEAM = 60, SRC = 27, PARTNER = 92;
    const y = new Float32Array(N), v = new Float32Array(N), a = new Float32Array(N);
    const K = 0.035, C = new Float32Array(N), D = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const gap = i >= SEAM - 5 && i <= SEAM + 9;              // зона изоляции у шва
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

      // пружины: тихие и движущиеся — два пути
      ctx.lineWidth = 1;
      const calm = new Path2D(), mv = new Path2D();
      for (let i = 2; i < N - 1; i += 4) {
        const t = Math.abs(y[i]) > 0.06 ? mv : calm;
        t.moveTo(px(i), surf(i) + 4); t.lineTo(px(i), baseY - 4);
      }
      ctx.strokeStyle = 'rgba(241,237,230,0.08)'; ctx.stroke(calm);
      ctx.strokeStyle = 'rgba(241,237,230,0.3)'; ctx.stroke(mv);
      ctx.strokeStyle = 'rgba(241,237,230,0.16)'; ctx.beginPath(); ctx.moveTo(px(0), baseY + 0.5); ctx.lineTo(px(N - 1), baseY + 0.5); ctx.stroke();

      // шов
      ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(200,168,107,0.55)';
      ctx.beginPath(); ctx.moveTo(px(SEAM), H * 0.12); ctx.lineTo(px(SEAM), baseY + 22); ctx.stroke(); ctx.setLineDash([]);

      // спящие
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

      // линия поверхности: ярче там, где движется (5 корзин прозрачности)
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

    // пока блок на экране и зритель не трогал его — поворот раз в несколько секунд
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => {
        const was = visible; visible = es[0].isIntersecting;
        if (visible && !was && !running && !reduceMotion) setTimeout(() => { if (visible && !running) turn(1); }, 500);
      }, { threshold: 0.35 }).observe(cv);
    }
    if (!reduceMotion) setInterval(() => { if (visible && Date.now() - lastUser > 7000 && !running && !document.hidden) turn(1); }, 1000);

    window.addEventListener('resize', resize);
    resize();
    if (reduceMotion) settleStatic();
  })();

  /* ------------------------------------------------------------------------
     Доставка: клик по городу — луна и подсветка контура вокруг него
     Сроки — один объект; пока везде «от 7 дней».
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
    cities.forEach((c) => {
      c.addEventListener('click', () => pick(c));
      c.addEventListener('mouseenter', () => { if (window.matchMedia('(hover: hover)').matches) pick(c); });
    });
    const first = map.querySelector('.city.is-on');
    if (first) pick(first);

    // видео облёта Земли под картой: только десктоп, без reduced-motion и Save-Data; грузится при приближении
    const video = document.getElementById('mapVideo');
    const saveData = navigator.connection && navigator.connection.saveData;
    if (video) {
      if (reduceMotion || saveData || window.innerWidth < 900 || !('IntersectionObserver' in window)) { video.remove(); }
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

  /* буквы заголовков — отдельные span, чтобы отвечать на курсор лунным светом */
  (function glowLetters() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const targets = document.querySelectorAll('.hero-title, .manifesto__text, .section-title, .motion__title, .delivery__title, .cta__title, .model__title, .diff__name, .px__pitch, .statement');
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
    if (!els.length) return;
    const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
    if (reduceMotion || !('IntersectionObserver' in window)) return;
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

  /* появление через IntersectionObserver: не зависит от расчёта позиций
     ScrollTrigger и не оставляет блоки невидимыми при резком переходе */
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
    // страховка: всё, что уже в кадре через секунду после загрузки, показываем
    setTimeout(() => els.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight && r.bottom > 0) show(el); }), 1200);
  })();

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
     Линейка: цены, модели, разрезы, WhatsApp, липкая плашка
     Цены меняются только здесь. null → «— ₸».
     ------------------------------------------------------------------------ */
  // ₸. Air / Balance / Prime — за базовый размер 160 × 200; Custom — диапазон для 1800 × 2000. null → «— ₸».
  const PRICES = { air: 120000, balance: 220000, prime: 280000, custom: { from: 350000, to: 480000 } };
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
  };

  const fmtMoney = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
  const priceText = (p) => (p == null ? '— ₸' : `${fmtMoney(p)} ₸`);
  // цена с учётом скидки: старая зачёркнута, новая крупно, бейдж выгоды
  const priceHTML = (k, compact) => {
    const p = PRICES[k], old = OLD_PRICES[k];
    if (p == null || !old) return priceText(p);
    if (compact) return `<s class="price-old">${fmtMoney(old)}</s> → ${fmtMoney(p)} ₸`;
    return `<s class="price-old">${fmtMoney(old)} ₸</s><span class="price-new">${fmtMoney(p)} ₸</span><span class="save">−${discountPct(k)} %</span>`;
  };
  const perNight = (p) => (p == null ? '≈ — ₸ за ночь' : `≈ ${fmtMoney(p / (15 * 365))} ₸ за ночь`);
  const waLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

  (function lineup() {
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    // цены и ссылки
    document.querySelectorAll('[data-price]').forEach((el) => { el.innerHTML = priceHTML(el.dataset.price, el.hasAttribute('data-compact')); });
    document.querySelectorAll('[data-night]').forEach((el) => { el.textContent = perNight(PRICES[el.dataset.night]); });
    document.querySelectorAll('[data-wa]').forEach((a) => { a.href = waLink(`Здравствуйте, интересует ${MODELS[a.dataset.wa].name}`); });

    // выбор модели: строки → свет на сцене
    (function picker() {
      const list = document.getElementById('prList');
      const stage = document.getElementById('pxStage');
      const caps = document.getElementById('pxCaps');
      const beam = document.getElementById('pxBeam');
      if (!list || !stage) return;
      const TIERS = [
        { key: 'air',     series: 'Air',     lvl: 1, tier: 'Базовая',        pitch: 'Лёгкий старт.',                      desc: 'Лёгкая модель на каждый день: пружины, кокос, ортопена.' },
        { key: 'balance', series: 'Balance', lvl: 2, tier: 'Pro',            pitch: 'Поддержка на каждый день.',          desc: 'Усиленный каркас и два слоя кокоса — для тех, кто спит на матрасе каждый день.' },
        { key: 'prime',   series: 'Prime',   lvl: 3, tier: `Выгода −${discountPct('prime')} %`, pitch: 'Самая выгодная покупка линейки.', desc: `Полная цена ${fmtMoney(OLD_PRICES.prime)} ₸, сейчас ${fmtMoney(PRICES.prime)} ₸ — хлопок ручной работы, латекс и кокос.` },
        { key: 'custom',  series: 'Custom',  lvl: 4, tier: 'Индивидуально',  pitch: 'Размер и конфигурация под вас.',     desc: 'Нестандартный размер и начинка под ваш проект.', dims: '1800 × 2000 мм' },
      ];
      const rangeText = (p) => (p == null ? '— ₸' : typeof p === 'object' ? `${fmtMoney(p.from)}–${fmtMoney(p.to)} ₸` : `${fmtMoney(p)} ₸`);
      const meter = (lvl) => `<span class="lm" aria-hidden="true">${[1, 2, 3, 4].map((k) => `<i${k <= lvl ? ' class="on"' : ''}></i>`).join('')}</span>`;
      const tier = (t) => `<span class="tier" data-lvl="${t.lvl}"><span>${esc(t.tier)}</span>${meter(t.lvl)}</span>`;
      const rows = [], cards = [];
      let cur = -1;

      TIERS.forEach((t, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<button class="pr__row" type="button" data-lvl="${t.lvl}" aria-pressed="false" aria-label="Показать модель Eluna ${t.series}">
          <span class="pr__n">0${i + 1}</span>
          <span class="pr__name">Eluna ${t.series}${tier(t)}</span>
          <span class="pr__price">${OLD_PRICES[t.key] ? `<s class="pr__old">${fmtMoney(OLD_PRICES[t.key])} ₸</s>` : ''}<span class="pr__sum">${rangeText(PRICES[t.key])}</span>${t.dims ? `<span class="pr__sub">для размера ${t.dims}</span>` : ''}${OLD_PRICES[t.key] ? `<span class="pr__sub pr__sub--gold">выгода ${fmtMoney(OLD_PRICES[t.key] - PRICES[t.key])} ₸</span>` : ''}</span>
        </button>`;
        const b = li.firstElementChild;
        b.addEventListener('mouseenter', () => select(i));
        b.addEventListener('focus', () => select(i));
        b.addEventListener('click', () => select(i));
        list.appendChild(li); rows.push(b);

        const c = document.createElement('div');
        c.className = 'px__cap';
        const more = t.key === 'custom'
          ? `<a class="button button--ghost" href="#sizes" tabindex="-1">Собрать свой размер</a>`
          : `<a class="button ${t.key === 'prime' ? 'button--primary' : 'button--ghost'}" href="${t.key === 'prime' ? '#primeBlock' : '#model-' + t.key}" tabindex="-1">Подробнее о ${esc(t.series)}</a>`;
        c.innerHTML = `${tier(t)}<h3 class="px__pitch">${esc(t.pitch)}</h3><p>${esc(t.desc)}</p>${more}`;
        caps.appendChild(c); cards.push(c);
      });

      function select(i) {
        if (i === cur) return;
        const first = cur < 0; cur = i;
        stage.setAttribute('data-lvl', TIERS[i].lvl);
        rows.forEach((r, k) => { r.classList.toggle('is-on', k === i); r.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
        cards.forEach((c, k) => {
          c.classList.toggle('is-on', k === i); c.setAttribute('aria-hidden', k === i ? 'false' : 'true');
          c.querySelectorAll('a').forEach((a) => { a.tabIndex = k === i ? 0 : -1; });
        });
        if (!first && beam && !reduceMotion) { beam.classList.remove('is-flare'); void beam.offsetWidth; beam.classList.add('is-flare'); }
      }
      select(2);
    })();


    // разрезы
    document.querySelectorAll('.xs[data-xs]').forEach((box) => {
      const m = MODELS[box.dataset.xs];
      if (!m) return;
      box.innerHTML = m.layers.map((l) => `
        <div class="xs__layer xs--${l.kind}">
          <div class="xs__fill" style="--cm:${l.cm}"></div>
          <div class="xs__text"><b>${esc(l.name)}</b>${l.spec ? `<span class="cm">${esc(l.spec)}</span>` : ''}${l.note ? `<span class="note">${esc(l.note)}</span>` : ''}</div>
        </div>`).join('');
    });

    // вид линейки: шахматка / в ряд (Prime всегда в середине)
    const modelsEl = document.getElementById('models');
    document.querySelectorAll('.view__btn').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('.view__btn').forEach((x) => x.setAttribute('aria-checked', x === b ? 'true' : 'false'));
      modelsEl.classList.toggle('models--row', b.dataset.view === 'row');
      modelsEl.classList.toggle('models--zigzag', b.dataset.view !== 'row');
      ScrollTrigger.refresh();
    }));
    // «Подробнее» — раскрывает доп. информацию карточки
    document.querySelectorAll('.more').forEach((b) => b.addEventListener('click', () => {
      const box = document.getElementById(b.getAttribute('aria-controls'));
      const open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', open ? 'false' : 'true');
      b.textContent = open ? 'Подробнее' : 'Свернуть';
      if (open) { box.classList.remove('is-open'); setTimeout(() => { box.hidden = true; ScrollTrigger.refresh(); }, 450); }
      else { box.hidden = false; requestAnimationFrame(() => box.classList.add('is-open')); setTimeout(() => ScrollTrigger.refresh(), 500); }
    }));

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
    const price = { v: 0, o: 0 };
    const oldEl = document.getElementById('sizeOld');

    function apply(btn, animate) {
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

    options.forEach((btn) => {
      btn.addEventListener('click', () => {
        options.forEach((b) => b.setAttribute('aria-checked', b === btn ? 'true' : 'false'));
        const w = +btn.dataset.w, h = +btn.dataset.h;
        const pct = (cm) => (cm / 200) * 70;   // 200 см = 70 % комнаты
        gsap.to(mat, { width: `${pct(w)}%`, height: `${pct(h)}%`, duration: 1.1, ease: 'power3.inOut' });
        wEl.textContent = w * 10; hEl.textContent = h * 10;
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
