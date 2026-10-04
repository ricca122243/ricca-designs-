/*! © 2026 ELUNA · RICCA DESIGNS, Алматы. Все права защищены. Копирование без письменного разрешения запрещено. */
/* ==========================================================================
   ELUNA — hero-сцена: космос, луна, интро, логотип.

   Как устроена сцена:
   • Блок .stage-wrap — короткая «дорожка» скролла; .stage внутри него липнет к экрану (sticky).
   • Состояние сцены — чистая функция от положения скролла (в «vh»), см. scene():
     луна уходит вправо-вверх, логотип уменьшается, заголовок гаснет.
   • Матрас и его слои — отдельная секция «Расслойка» (js/strata.js): открывается
     только по кнопке, никакой автоматики по скроллу.
   ========================================================================== */
(() => {
  'use strict';

  const E = window.ELUNA_CORE;
  const { body, reduceMotion, params, clamp, smooth } = E;
  const isMobile = E.isMobile;
  const $ = (id) => document.getElementById(id);

  // запись стиля только при изменении значения — без лишнего пересчёта стилей на каждом кадре
  const sv = (el, p, v) => { const c = el.__sv || (el.__sv = {}); if (c[p] !== v) { c[p] = v; el.style[p] = v; } };
  const svar = (el, n, v) => { const c = el.__sv || (el.__sv = {}); if (c[n] !== v) { c[n] = v; el.style.setProperty(n, v); } };
  // прозрачность полноэкранных слоёв: при нуле слой прячется целиком — компоновщик его не считает
  const svo = (el, v) => { const n = +v; sv(el, 'opacity', n < 0.004 ? '0' : n > 0.996 ? '1' : n.toFixed(3)); sv(el, 'visibility', n > 0.004 ? 'visible' : 'hidden'); };
  const easeIn = (t) => t * t;

  const stageWrap = $('stageWrap');
  const stage = $('stage');
  const navEl = $('nav');
  if (!stageWrap || !stage) return;

  /* ========================================================================
     Звёздное небо. Основа — снимок глубокого космоса (img/space-*.webp: navy,
     Млечный путь, пыль, тысячи звёзд), поверх — один canvas-слой редких ярких
     звёзд, который медленно дрейфует (глубина), мерцание и метеоры.
     Дрейф и параллакс — на компоновщике; ни одного цикла на главном потоке.
     ======================================================================== */
  const sky = (function skyField() {
    const host = $('sky');
    if (!host) return { setVisible() {} };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const tint = (t) => (t < 0.25 ? [196, 208, 255] : t < 0.7 ? [245, 243, 238] : t < 0.92 ? [255, 236, 205] : [255, 208, 160]);
    const OVER = 1.14;                              // слой выше экрана — запас под параллакс скролла
    let w = 0, h = 0, H = 0, layers = null, visible = true, meteorTo = 0, scrollRaf = 0, scrollY0 = 0;

    function make(cls, drift) {
      const layer = document.createElement('div'); layer.className = `sky__layer sky__layer--${cls}`;
      const dr = document.createElement('div'); dr.className = 'sky__drift'; dr.style.setProperty('--drift', `${drift}s`);
      const cv = document.createElement('canvas');
      dr.appendChild(cv); layer.appendChild(dr); host.appendChild(layer);
      return { layer, dr, cv, cx: cv.getContext('2d') };
    }
    function paint(L, kind, tile, tctx, dpr) {
      const mob = isMobile(), tier = E.tier();
      tile.width = Math.round(w * dpr); tile.height = Math.round(H * dpr);
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0); tctx.clearRect(0, 0, w, H);
      // плотное поле звёзд уже в снимке — здесь только редкие яркие, для глубины
      const density = (tier === 'high' ? 3200 : tier === 'medium' ? 5000 : 8000) * (mob ? 1.56 : 1) * 3.2;
      const n = Math.round((w * H) / density);
      for (let i = 0; i < n; i++) {
        const m = Math.pow(Math.random(), 3.2);
        if ((m > 0.5) !== (kind === 'near')) continue;
        const x = Math.random() * w, y = Math.random() * H;
        const r = 0.3 + m * 1.6, a = 0.25 + m * 0.7;
        const c = tint(Math.random());
        if (m > 0.72) {
          const g = tctx.createRadialGradient(x, y, 0, x, y, r * 9);
          g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.2 * m})`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          tctx.fillStyle = g;
          tctx.beginPath(); tctx.arc(x, y, r * 9, 0, Math.PI * 2); tctx.fill();
          if (m > 0.9) {
            tctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.18 * m})`;
            tctx.lineWidth = 0.6;
            tctx.beginPath();
            tctx.moveTo(x - r * 7, y); tctx.lineTo(x + r * 7, y);
            tctx.moveTo(x, y - r * 7); tctx.lineTo(x, y + r * 7);
            tctx.stroke();
          }
        }
        tctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
        tctx.beginPath(); tctx.arc(x, y, r, 0, Math.PI * 2); tctx.fill();
      }
      // слой шириной в два экрана: узор подряд дважды — дрейф на -50% бесшовен
      const el = L.cv;
      el.width = tile.width * 2; el.height = tile.height;
      L.cx.setTransform(1, 0, 0, 1, 0, 0);
      L.cx.drawImage(tile, 0, 0); L.cx.drawImage(tile, tile.width, 0);
    }

    function build() {
      w = window.innerWidth; h = window.innerHeight; H = Math.round(h * OVER);
      host.textContent = '';
      // снимок космоса — неподвижный, только параллакс скролла
      const photo = document.createElement('div'); photo.className = 'sky__layer sky__photo'; host.appendChild(photo);
      // ближние звёзды дрейфуют медленно: −5 px/с
      layers = { far: { layer: photo }, near: make('near', Math.round(w / 5)) };
      const tier = E.tier();
      const dpr = Math.min(1.25, window.devicePixelRatio || 1, 8192 / (2 * w));   // редкие звёзды мягкие — больше плотности пикселей им не нужно
      const tile = document.createElement('canvas'), tctx = tile.getContext('2d');
      paint(layers.near, 'near', tile, tctx, dpr);
      // мерцающие звёзды — в ближнем слое, дважды (x и x + экран): дрейф идёт вместе с небом
      const count = Math.round(w / (isMobile() ? 56 : 32)) * (tier === 'low' ? 0 : 1);
      const frag = document.createDocumentFragment();
      for (let i = 0; i < count; i++) {
        const c = tint(Math.random()), x = Math.random() * 50, y = Math.random() * 100, r = rnd(3, 6);
        for (const dx of [0, 50]) {
          const s = document.createElement('i'); s.className = 'tw';
          s.style.cssText = `left:${(x + dx).toFixed(2)}%;top:${y.toFixed(2)}%;width:${r.toFixed(1)}px;height:${r.toFixed(1)}px;--c:${c[0]},${c[1]},${c[2]};--d:${rnd(2.6, 6.2).toFixed(2)}s;--dl:${(-rnd(0, 6)).toFixed(2)}s;--a:${rnd(0.55, 1).toFixed(2)}`;
          frag.appendChild(s);
        }
      }
      layers.near.dr.appendChild(frag);
      place();
    }

    // параллакс скролла: два transform на слоях, ничего больше
    function place() {
      if (!layers) return;
      const max = h * (OVER - 1);
      const sy = Math.min(max, scrollY0 * 0.02);
      layers.far.layer.style.transform = `translate3d(0, ${(-sy).toFixed(1)}px, 0)`;
      layers.near.layer.style.transform = `translate3d(0, ${(-Math.min(max, sy * 1.3)).toFixed(1)}px, 0)`;
    }
    window.addEventListener('scroll', () => {
      if (scrollRaf || !visible) return;
      scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; scrollY0 = E.scroll.y(); place(); });   // значение из ядра: чтение window.scrollY посреди кадра заставило бы браузер досрочно пересчитать стили
    }, { passive: true });

    // метеор: короткий штрих по небу, раз в 6–14 секунд, только пока сцена на экране
    function meteor() {
      meteorTo = 0;
      if (!visible || document.hidden || E.tier() === 'low' || reduceMotion || !host.animate) { schedule(); return; }
      const m = document.createElement('i'); m.className = 'meteor';
      const x0 = rnd(0.1, 0.9) * w, y0 = rnd(0.05, 0.45) * h, dir = Math.random() < 0.5 ? -1 : 1;
      const dx = dir * rnd(120, 240), dy = rnd(60, 130), ang = Math.atan2(dy, dx) * 180 / Math.PI;
      m.style.cssText = `left:${x0}px;top:${y0}px;transform:rotate(${ang}deg)`;
      host.appendChild(m);
      const a = m.animate([
        { transform: `translate3d(0,0,0) rotate(${ang}deg)`, opacity: 0 },
        { opacity: 0.9, offset: 0.35 },
        { transform: `translate3d(${dx}px,${dy}px,0) rotate(${ang}deg)`, opacity: 0 },
      ], { duration: 900, easing: 'ease-out' });
      a.onfinish = () => m.remove();
      schedule();
    }
    function schedule() { clearTimeout(meteorTo); meteorTo = setTimeout(meteor, rnd(6000, 14000)); }

    // небо рисуется после первого кадра — до старта интро, пока сцена тёмная
    requestAnimationFrame(() => { build(); schedule(); });
    E.resizeHooks.push((w2, h2, wChanged) => { if (wChanged) build(); else { h = window.innerHeight; } });
    return {
      setVisible(v) { visible = v; host.classList.toggle('is-off', !v); if (v) { scrollY0 = E.scroll.y(); place(); } },
    };
  })();

  /* ========================================================================
     Состояние кадра. Интро (время) и скролл (положение) пишут в разные
     объекты; apply() их сводит — они никогда не спорят между собой.
     ======================================================================== */
  const I = { dark: 1, wmO: 1, cueO: 0, moon: 0, term: 30, ms: 1.06, mx: 2 };   // term 30 — луна входит уже освещённым серпом, не чёрным диском
  const P = { x: 0, y: 0, tx: 0, ty: 0 };                                       // параллакс от указателя

  const wordmark = $('wordmark');
  const brandEl = navEl.querySelector('.nav__brand');
  const exposure = $('exposure');
  const moonBig = $('moonBig');
  const moonGlCanvas = $('moonGl');
  const copyHero = $('copyHero');
  const cue = $('cue');
  const nebula = stage.querySelector('.nebula');

  /* ------------------------------------------------------------------------
     Луна: WebGL-шар, если устройство тянет; иначе остаётся фото с CSS-терминатором
     ------------------------------------------------------------------------ */
  let moonGL = null;
  const MAP_S = 'img/moon-map-1024.webp';
  const moonNeed = () => {   // пикселей по диаметру диска × 2 — ширина карты, при которой её видно 1:1
    const d = Math.min(isMobile() ? 1.5 : 2, window.devicePixelRatio || 1);
    return (moonBig.offsetWidth || 600) * d * 2;
  };
  let moonReadyCb = null;
  // true — шар создаётся и скоро сообщит о готовности (onReady) или откажется (onFallback)
  function initMoonGL() {
    if (moonGL || E.tier() === 'low' || reduceMotion || !window.MoonGL || !moonGlCanvas) return false;
    const need = moonNeed();
    const inst = window.MoonGL.create({
      canvas: moonGlCanvas, tier: isMobile() ? 'medium' : E.tier(), force: params.get('gl') === 'force',
      src: need > 1150 ? 'img/moon-map-2048.webp' : MAP_S,
      srcSmall: MAP_S,
      onReady: () => {
        moonBig.classList.add('is-gl'); sizeMoonGL(); apply();
        // фото-постер больше не нужен: освобождаем его после плавной смены
        setTimeout(() => { const im = moonBig.querySelector('img'); if (im && moonBig.classList.contains('is-gl')) im.style.display = 'none'; }, 1600);
        if (moonReadyCb) moonReadyCb();
      },
      onFallback: () => {
        const g = moonGL; moonGL = null; moonBig.classList.remove('is-gl');
        const im = moonBig.querySelector('img'); if (im) im.style.display = '';
        if (g) try { g.destroy(); } catch (e) { /* уже потерян */ }
        apply(); if (moonReadyCb) moonReadyCb();
      },
    });
    if (!inst) { if (E.tier() !== 'low') E.setTier('low'); return false; }   // нет WebGL или программный — фото вместо шара
    moonGL = inst;
    sizeMoonGL();
    return true;
  }
  function sizeMoonGL() {
    if (!moonGL) return;
    const d = Math.min(isMobile() ? 1.5 : E.tier() === 'high' ? 2 : 1.5, window.devicePixelRatio || 1);
    moonGL.resize(moonBig.offsetWidth * d, moonBig.offsetHeight * d);
  }
  // направление света из «процента терминатора» интро: −18 % — источник за шаром, 112 % — спереди-слева
  function lightFromTerm(t) {
    const k = Math.min(1, Math.max(0, (t + 18) / 130));
    const a = Math.PI * (1.0 - 0.72 * k);          // от 180° (сзади) к ≈50° (спереди-слева)
    return [-Math.sin(a) * 0.95, 0.3, Math.cos(a)];
  }

  /* ========================================================================
     Раскладка: короткая дорожка скролла — луна уходит, логотип уменьшается,
     заголовок гаснет; дальше сцена отпускается и снизу выходит «Расслойка».
     ======================================================================== */
  const G = { VW: 1440, VH: 900 };
  const RUN = 46;                       // длина дорожки в vh
  let wrapTop = 0, range = 1, runVh = RUN;

  function layout() {
    const VW = window.innerWidth, VH = stage.clientHeight || window.innerHeight;
    G.VW = VW; G.VH = VH;
    runVh = reduceMotion ? 0 : RUN;
    SC.wmOut[1] = VH < 560 ? 16 : 30;   // невысокий экран (телефон «лёжа»): большой логотип гаснет раньше, чем дойдёт до меню
    stageWrap.style.height = `${(runVh + 100) * VH / 100}px`;
    stageWrap.dataset.run = String(runVh);
    wrapTop = stageWrap.getBoundingClientRect().top + window.scrollY;
    range = Math.max(1, runVh * VH / 100);
    if (moonGL) sizeMoonGL();
  }

  /* ========================================================================
     Сценарий. Единицы — vh скролла от начала дорожки.
     ======================================================================== */
  const SC = { moonOut: [0, 44], wmOut: [0, 30], brandIn: [10, 40], heroOut: [0, 28], cueOut: [0, 10] };
  const sc = { s: 0, heroO: 1, moonX: 0, moonY: 0, moonO: 1, wmS: 1, wmY: 0, wmO: 1, brand: 0, cueO: 1, dark: 0, nebulaO: 1 };

  function scene(s) {
    sc.s = s;
    const r = (a) => clamp((s - a[0]) / (a[1] - a[0]), 0, 1);
    const mo = r(SC.moonOut), wo = r(SC.wmOut);
    // луна уходит вправо-вверх и гаснет к концу дорожки: когда сцена отпускается, её край не режет шар
    sc.moonX = 12 * easeIn(mo); sc.moonY = -26 * easeIn(mo); sc.moonO = 1 - smooth(s, 4, SC.moonOut[1]);
    sc.nebulaO = 1 - smooth(s, 8, SC.moonOut[1]);
    sc.wmS = 1 - 0.42 * easeIn(wo); sc.wmY = -34 * easeIn(wo); sc.wmO = 1 - smooth(s, 0, SC.wmOut[1]);   // гаснет раньше, чем дойдёт до строки меню
    // логотип в меню не появляется, пока большой логотип ещё виден: двух ELUNA одновременно не бывает
    sc.brand = Math.min(r(SC.brandIn), 1 - sc.wmO);
    sc.heroO = 1 - smooth(s, SC.heroOut[0], SC.heroOut[1]);
    sc.cueO = 1 - smooth(s, SC.cueOut[0], SC.cueOut[1]);
    sc.dark = 0;
    return sc;
  }

  /* ========================================================================
     apply(): сводит интро, скролл и указатель в DOM. Переменные пишутся на
     владельцев (луна, подписи), не на :root.
     ======================================================================== */
  let stageOff = false;
  function apply() {
    if (stageOff) return;
    const VW = G.VW, VH = G.VH;
    // луна: проявляется терминатором в интро, по скроллу уходит вправо-вверх и гаснет; лёгкий параллакс от указателя
    sv(moonBig, 'opacity', (I.moon * sc.moonO).toFixed(3));
    svar(moonBig, '--term', `${I.term.toFixed(2)}%`);
    if (moonGL) {
      const vis = sc.moonO > 0.02;
      if (vis) { moonGL.wake(); moonGL.set({ light: lightFromTerm(I.term), tiltY: -0.08 + P.x * 0.012, tiltX: 0.12 - P.y * 0.012 }); } else moonGL.sleep();
    }
    sv(moonBig, 'transform', `translate3d(${((sc.moonX + I.mx) * VW / 100 - P.x * 3).toFixed(2)}px, ${(sc.moonY * VH / 100 - P.y * 2.6).toFixed(2)}px, 0) scale(${I.ms.toFixed(4)})`);
    svar(navEl, '--brand-o', sc.brand.toFixed(3));
    const bOn = sc.brand > 0.05 || navSolid;
    if (brandEl && brandEl.__on !== bOn) { brandEl.__on = bOn; brandEl.tabIndex = bOn ? 0 : -1; }
    svo(exposure, Math.max(I.dark, sc.dark).toFixed(3));
    if (nebula) svo(nebula, sc.nebulaO.toFixed(3));

    // hero-тексты и логотип
    svo(copyHero, sc.heroO.toFixed(3));
    sv(copyHero, 'transform', `translate3d(0, ${(-26 * (1 - sc.heroO)).toFixed(1)}px, 0)`);
    sv(wordmark, 'transform', `translate(0, calc(-50% + ${sc.wmY.toFixed(3)}vh)) scale(${sc.wmS.toFixed(4)})`);
    svo(wordmark, (sc.wmO * I.wmO).toFixed(3));
    svo(cue, (sc.cueO * I.cueO).toFixed(3));

  }

  /* ========================================================================
     Главный кадр сцены: скролл → сглаживание → scene() → apply()
     ======================================================================== */
  let sTarget = 0, sDamped = 0, needFrame = true, pointerMoving = false, navSolid = false;
  const readTarget = () => (runVh ? clamp((E.scroll.y() - wrapTop) / (range / runVh), 0, runVh) : 0);   // vh от начала дорожки
  function render() { needFrame = true; if (!stageOff) E.wake(stageTask, 1); }
  function stageTask(now, dt) {
    if (stageOff) return false;
    sTarget = readTarget();
    const lam = reduceMotion ? 1e3 : E.scroll.enabled ? 16 : 13;
    const dSt = sTarget - sDamped;
    if (Math.abs(dSt) > 0.004) sDamped += dSt * (1 - Math.exp(-dt * lam)); else sDamped = sTarget;
    // указатель: инерционный параллакс луны
    let pAnim = false;
    if (pointerMoving) {
      const k = 1 - Math.exp(-dt * 5);
      P.x += (P.tx - P.x) * k; P.y += (P.ty - P.y) * k;
      if (Math.abs(P.tx - P.x) < 0.01 && Math.abs(P.ty - P.y) < 0.01) { P.x = P.tx; P.y = P.ty; pointerMoving = false; } else pAnim = true;
    }
    scene(sDamped);
    apply();
    const solid = E.scroll.y() > wrapTop + range + G.VH * 0.55;
    if (solid !== navSolid) { navSolid = solid; navEl.classList.toggle('is-solid', solid); }
    E.watchFrames(dt);
    const moving = Math.abs(sTarget - sDamped) > 0.004 || pAnim || needFrame;
    needFrame = false;
    return moving ? true : false;
  }

  /* ---- видимость сцены: за её пределами циклы стоят ---- */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      const on = es[es.length - 1].isIntersecting;
      stageOff = !on;
      stage.classList.toggle('is-off', !on);
      // сцена ушла с экрана (в т.ч. прыжком: якорь, восстановленный скролл, End) — меню в финальном виде
      if (!on && E.scroll.y() > wrapTop) {
        svar(navEl, '--brand-o', '1');
        if (!navSolid) { navSolid = true; navEl.classList.add('is-solid'); }
        if (brandEl) { brandEl.__on = true; brandEl.tabIndex = 0; }
      }
      sky.setVisible(true);
      if (moonGL && !on) moonGL.sleep();
      if (on) render();
    }, { threshold: 0, rootMargin: '80px 0px' }).observe(stageWrap);
  }
  window.addEventListener('scroll', () => { if (!stageOff) render(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !stageOff) render(); });
  E.resizeHooks.push(() => { layout(); sizeMoonGL(); sDamped = readTarget(); render(); });
  E.onTier(() => { sizeMoonGL(); render(); });

  /* ---- параллакс луны от указателя ---- */
  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    stage.addEventListener('pointermove', (e) => {
      if (stageOff || sc.moonO < 0.05) return;
      P.tx = (e.clientX / window.innerWidth - 0.5) * 3.5;
      P.ty = -(e.clientY / window.innerHeight - 0.5) * 2.6;
      pointerMoving = true; render();
    });
    stage.addEventListener('pointerleave', () => { P.tx = 0; P.ty = 0; pointerMoving = true; render(); });
  }

  /* ========================================================================
     Интро (≈6,3 с, только при входе): по луне идёт терминатор → логотип → заголовок
     ======================================================================== */
  const letters = wordmark.querySelectorAll('.wordmark__word span');
  const wmMark = $('wordmarkMark');
  const wmGlow = $('wordmarkGlow');
  const wmSub = $('wordmarkSub');
  const heroLines = document.querySelectorAll('#copyHero .line > span');
  const heroEyebrow = document.querySelector('#copyHero .eyebrow');
  const heroSub = document.querySelector('#copyHero .hero-sub');

  const intro = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.inOut' },
    onUpdate: render,
    onComplete: () => { finishIntro(); },
  });
  intro
    .to(I, { moon: 1, duration: 1.0, ease: 'power2.out' }, 0.1)
    .to(I, { term: 112, duration: 2.8, ease: 'power2.out' }, 0.3)
    // наезд — через значения, а не transform элемента: луна параллельно двигается по скроллу
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

  let introDone = false;
  function finishIntro() {
    if (introDone) return; introDone = true;
    body.classList.remove('is-intro');
    E.scroll.lock(false);
    if (moonGL) { moonGL.setSpin(2 * Math.PI / 180); if (moonNeed() > 2200 && !isMobile()) setTimeout(() => (window.requestIdleCallback || ((f) => setTimeout(f, 0)))(() => moonGL && moonGL.upgrade('img/moon-map-4096.webp'), { timeout: 5000 }), 1500); }
    document.dispatchEvent(new Event('eluna:introdone'));
    render();
  }

  // Интро стартует, когда шар луны готов (экран пока тёмный — подвисание контекста и шейдера никто не увидит),
  // но не позже чем через 1,1 с: на медленной сети луна появится фото-постером и плавно сменится шаром
  function startIntro() {
    if (reduceMotion) { initMoonGL(); intro.progress(1); finishIntro(); render(); return; }
    let played = false, cap = 0;
    const play = () => { if (played) return; played = true; clearTimeout(cap); moonReadyCb = null; intro.play(); };
    moonReadyCb = play;
    if (initMoonGL()) cap = setTimeout(play, 1100); else play();
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!reduceMotion) window.scrollTo(0, 0);
  E.scroll.lock(true);

  // колесо / касание / клавиша — интро ускоряется, прокрутка открывается
  if (!reduceMotion) {
    const hurry = () => {
      if (intro.progress() < 1) intro.timeScale(3.2);
      body.classList.add('is-scrolling');
      E.scroll.lock(false);
      window.removeEventListener('wheel', hurry);
      window.removeEventListener('touchstart', hurry);
      window.removeEventListener('keydown', hurry);
    };
    window.addEventListener('wheel', hurry, { passive: true });
    window.addEventListener('touchstart', hurry, { passive: true });
    window.addEventListener('keydown', hurry);
  }

  /* ---- старт ---- */
  layout();
  sDamped = readTarget();
  scene(sDamped); apply();
  // фон уже рисуется — интро стартует со второго кадра
  requestAnimationFrame(() => requestAnimationFrame(startIntro));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); render(); });
  window.addEventListener('load', () => { layout(); sDamped = readTarget(); render(); });
  requestAnimationFrame(E.syncSize);

  // чтобы анкоры и пересчёты видели сцену
  E.stage = { get wrapTop() { return wrapTop; }, get range() { return range; }, get runVh() { return runVh; }, intro, finishIntro, G, sc, SC };
  if (E.DEBUG) {
    window.ELUNA = { intro, I, sc, G, E, get moon() { return moonGL; }, scene, layout };
  }
})();
