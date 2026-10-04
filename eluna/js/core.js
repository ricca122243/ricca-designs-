/*! © 2026 ELUNA · RICCA DESIGNS, Алматы. Все права защищены. Копирование без письменного разрешения запрещено. */
/* ==========================================================================
   ELUNA — ядро: окружение, уровень качества, единый resize, единый кадровый
   цикл и плавный скролл колесом.
   Правила, из-за которых сайт не лагает:
   • ни одной CSS-переменной на :root в кадре (это пересчёт стилей всей страницы);
   • один rAF-цикл на всё (скролл → сцена), без россыпи отдельных циклов;
   • цикл спит, когда ничего не меняется.
   ========================================================================== */
(() => {
  'use strict';

  const E = (window.ELUNA_CORE = {});
  const root = document.documentElement;
  E.root = root;
  E.body = document.body;
  E.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  E.params = new URLSearchParams(location.search);
  E.DEBUG = E.params.has('debug');
  E.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  E.smooth = (v, a, b) => { const t = E.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  E.lerp = (a, b, t) => a + (b - a) * t;

  /* ------------------------------------------------------------------------
     Единый resize + isMobile(): перерисовки только при смене ширины или
     большом скачке высоты (адресная строка телефона — не повод).
     ------------------------------------------------------------------------ */
  const mq = window.matchMedia('(max-width: 899px)');
  let mobile = mq.matches;
  E.isMobile = () => mobile;
  E.resizeHooks = [];
  let rzRaf = 0, lastW = window.innerWidth, lastH = window.innerHeight;
  E.onResize = function onResize(force) {
    if (rzRaf) return;
    rzRaf = requestAnimationFrame(() => {
      rzRaf = 0;
      const w = window.innerWidth, h = window.innerHeight;
      const wChanged = w !== lastW, hBig = Math.abs(h - lastH) > 120;
      if (!force && !wChanged && !hBig) return;
      lastW = w; lastH = h;
      E.resizeHooks.forEach((f) => f(w, h, wChanged || force));
    });
  };
  window.addEventListener('resize', () => E.onResize(false));
  mq.addEventListener('change', (e) => { mobile = e.matches; E.onResize(true); });
  E.syncSize = () => { if (window.innerWidth !== lastW || window.innerHeight !== lastH) E.onResize(true); };

  /* ------------------------------------------------------------------------
     Уровень качества: high / medium / low. Определяется по железу один раз,
     затем сам понижается, если кадры идут тяжело (см. E.watchFrames).
     ------------------------------------------------------------------------ */
  // Пробный WebGL-контекст здесь не создаём: первый контекст стоит 200–400 мс главного потока.
  // Настоящий контекст создаёт луна (js/moon.js); если видеокарта программная — луна сообщит, и уровень станет low.
  function detectTier() {
    const q = E.params.get('gl');
    if (q === 'off') return 'low';
    if (E.reduceMotion) return 'low';
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
  let TIER = E.params.get('tier') || detectTier();
  root.dataset.tier = TIER;
  const tierSubs = [];
  E.tier = () => TIER;
  E.onTier = (fn) => { tierSubs.push(fn); };
  E.setTier = (t) => { if (t === TIER) return; TIER = t; root.dataset.tier = t; tierSubs.forEach((f) => f(t)); };

  /* ------------------------------------------------------------------------
     Слои матраса (сверху вниз) — для сцены и вкладки «Слои»
     ------------------------------------------------------------------------ */
  E.LAYERS = [
    { key: 'cover',   cm: 1.5, num: '01', name: 'Стёганый чехол',        short: 'Чехол',     text: 'Органический хлопок с терморегулирующей нитью. Первый слой, который вы чувствуете — и единственный, который видите.', density: '320 г/м²', role: 'Микроклимат' },
    { key: 'latex',   cm: 3,   num: '02', name: 'Натуральный латекс',     short: 'Латекс',    text: 'Сок гевеи, вспененный по Dunlop. Перфорация в семи зонах пропускает воздух и мягко принимает плечи и бёдра.', density: '65 кг/м³', role: 'Комфорт' },
    { key: 'gel',     cm: 4,   num: '03', name: 'Memory-пена с гелем',    short: 'Гель',      text: 'Запоминает контур тела за 4–6 секунд. Гелевые микрокапсулы отводят тепло к перфорированному латексу выше.', density: '50 кг/м³', role: 'Контур тела' },
    { key: 'coir',    cm: 3,   num: '04', name: 'Кокосовая койра',        short: 'Койра',     text: 'Волокно, пропитанное латексом. Ортопедическая опора без ощущения доски — держит спину ровно, пока латекс держит плечи.', density: '110 кг/м³', role: 'Опора' },
    { key: 'hr',      cm: 4,   num: '05', name: 'Пена HR',                short: 'Пена HR',   text: 'Высокоэластичная пена распределяет нагрузку между койрой и пружинами, чтобы ни одна точка не продавливалась первой.', density: '40 кг/м³', role: 'Распределение' },
    { key: 'springs', cm: 12,  num: '06', name: 'Независимые пружины',    short: 'Пружины',   text: '1 200 пружин в индивидуальных карманах, семь зон жёсткости. Каждая работает сама по себе — партнёр не почувствует, как вы повернулись. Карманы из нетканого полотна: металл не касается металла, матрас не скрипит.', density: '500 шт/м²', role: 'Независимость' },
    { key: 'base',    cm: 2.5, num: '07', name: 'Армированное основание', short: 'Основание', text: 'Плотная пена с усиленным периметром. Матрас не «сползает» к краям и держит форму все пятнадцать лет гарантии.', density: '35 кг/м³', role: 'Геометрия' },
  ];

  /* ------------------------------------------------------------------------
     Кадровый цикл. Один rAF на всё: задачи вызываются по приоритету
     (0 — скролл, 1 — сцена, 2 — остальное). Задача возвращает false,
     когда ей больше нечего делать — цикл засыпает.
     ------------------------------------------------------------------------ */
  const tasks = [[], [], []];
  let raf = 0, tLast = 0, inRun = false;
  function run(now) {
    raf = 0; inRun = true;
    const dt = tLast ? Math.min(0.1, (now - tLast) / 1000) : 1 / 60;
    tLast = now;
    for (let p = 0; p < tasks.length; p++) {
      const snap = tasks[p].slice();
      for (let i = 0; i < snap.length; i++) {
        if (snap[i](now, dt) === false) { const k = tasks[p].indexOf(snap[i]); if (k >= 0) tasks[p].splice(k, 1); }
      }
    }
    inRun = false;
    if (tasks[0].length || tasks[1].length || tasks[2].length) raf = requestAnimationFrame(run); else tLast = 0;
  }
  E.wake = (fn, prio = 1) => {
    const list = tasks[prio];
    if (!list.includes(fn)) list.push(fn);
    if (!raf && !inRun) raf = requestAnimationFrame(run);
  };

  /* ------------------------------------------------------------------------
     Следим за кадрами: если сцена идёт тяжело — качество ступенью ниже.
     ------------------------------------------------------------------------ */
  (function watchFrames() {
    let acc = 0, n = 0, until = 0;
    E.watchFrames = (dt) => {
      if (E.reduceMotion || TIER === 'low' || document.hidden) return;
      if (dt > 0.2) { acc = 0; n = 0; return; }   // вкладка проснулась / длинная пауза — не считаем
      acc += dt; n++;
      if (n < 48) return;
      const avg = acc / n; acc = 0; n = 0;
      const now = performance.now();
      if (avg > 0.027 && now > until) { until = now + 4000; E.setTier(TIER === 'high' ? 'medium' : 'low'); }
    };
  })();

  /* ------------------------------------------------------------------------
     Плавный скролл колесом (как на портфолио Damillion): колесо задаёт цель,
     позиция плавно догоняет её независимо от частоты кадров. Только мышь —
     на телефоне и тачпаде остаётся родная прокрутка браузера. Клавиатура,
     полоса прокрутки и якоря работают как обычно.
     ------------------------------------------------------------------------ */
  E.scroll = (() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const LAMBDA = 10;                     // 1/с: чем больше, тем отзывчивее
    let enabled = fine && !E.reduceMotion && !E.params.has('native');
    let target = window.scrollY, cur = window.scrollY, running = false, tween = null, locked = false;
    const maxY = () => Math.max(0, root.scrollHeight - window.innerHeight);
    const clampY = (v) => E.clamp(v, 0, maxY());

    function step(now, dt) {
      if (!running) return false;
      if (tween) {
        const k = E.clamp((now - tween.t0) / tween.dur, 0, 1);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        cur = tween.from + (tween.to - tween.from) * e;
        if (k >= 1) { cur = tween.to; target = cur; tween = null; running = false; }
      } else {
        cur += (target - cur) * (1 - Math.exp(-dt * LAMBDA));
        if (Math.abs(target - cur) < 0.35) { cur = target; running = false; }
      }
      window.scrollTo(0, cur);
      return running;
    }
    function go() { running = true; E.wake(step, 0); }

    const skip = (t) => !!(t && t.closest && t.closest('dialog, textarea, select, input[type="range"], [data-native-scroll]'));
    window.addEventListener('wheel', (e) => {
      if (!enabled || locked || e.ctrlKey || e.defaultPrevented || e.deltaY === 0) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || skip(e.target) || document.querySelector('dialog[open]')) return;
      e.preventDefault();
      if (tween) { tween = null; }
      if (!running) { cur = window.scrollY; target = cur; }
      const dy = e.deltaMode === 1 ? e.deltaY * 34 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      target = clampY(target + E.clamp(dy, -480, 480));
      go();
    }, { passive: false });
    // скролл не от нас (клавиши, полоса, якорь) — просто синхронизируемся; пока идёт наш ход, события — наши
    window.addEventListener('scroll', () => { if (!running) cur = target = window.scrollY; }, { passive: true });

    return {
      get enabled() { return enabled; },
      // текущая позиция: при плавном скролле — «живое» дробное значение, иначе обычный scrollY
      y() { return running ? cur : window.scrollY; },
      lock(v) { locked = !!v; },
      disable() { enabled = false; running = false; tween = null; },
      // программная прокрутка с плавным ходом
      to(y, opts) {
        const to = clampY(y), from = window.scrollY;
        if (E.reduceMotion || (opts && opts.instant) || Math.abs(to - from) < 2) { window.scrollTo(0, to); cur = target = to; return; }
        const dur = (opts && opts.duration) || E.clamp(Math.abs(to - from) / 2600, 0.7, 2.0) * 1000;
        cur = from; target = to; tween = { from, to, t0: performance.now(), dur };
        go();
      },
    };
  })();
})();
