/* RICCA DESIGNS — сайт в стиле ELUNA. Ванильный JS + GSAP/ScrollTrigger (vendor/, defer) только для сцены ELUNA.
   Структура: CONFIG (контакты и тексты WhatsApp) → якоря и шапка → появления → звёзды → сцена ELUNA (кадры разлёта по
   скроллу) → линейка и диалоги → размер и цена → фильм по главам (один ролик декодируется) → образцы → карта доставки →
   липкая плашка. Один владелец ссылок [data-wa]/[data-tel] — этот файл. */
(() => {
  'use strict';

  /* ---------- Константы: контакты и тексты WhatsApp — менять здесь ----------
     Номера также записаны в JSON-LD в <head> и в запасных href без JS.
     TODO (заказчик): заказы матрасов ELUNA с сайта RICCA — на основной номер 708 480-20-47 (как здесь) или на отдел заказов
     707 955-08-08 (как на сайте ELUNA)? */
  const CONFIG = {
    wa: '77084802047',
    tel: {
      main: { href: '+77084802047', text: '+7 (708) 480-20-47' },
      orders: { href: '+77079550808', text: '+7 (707) 955-08-08' }
    },
    msg: {
      general: 'Здравствуйте! Хочу узнать о мебели RICCA на заказ.',
      showroom: 'Здравствуйте! Хочу записаться на визит в шоурум RICCA на Навои, 208/2.',
      sofas: 'Здравствуйте! Интересует диван на заказ. Пришлите, пожалуйста, подборку и расскажите, что нужно для расчёта.',
      'sofas-calc': 'Здравствуйте! Хочу рассчитать диван на заказ. Размеры комнаты и фото пришлю следующим сообщением.',
      beds: 'Здравствуйте! Интересует кровать на заказ. Размер матраса: 1600 × 2000 / 1800 × 2000 / свой. Пришлите, пожалуйста, подборку.',
      armchairs: 'Здравствуйте! Интересует кресло для отдыха. Пришлите, пожалуйста, подборку.',
      tables: 'Здравствуйте! Хочу подобрать стол или консоль к мягкой мебели. Пришлите, пожалуйста, варианты.',
      c2026: 'Здравствуйте! Что из коллекции 2026 сейчас стоит в шоуруме?',
      eluna: 'Здравствуйте! Интересуют матрасы ELUNA.',
      'eluna-air': 'Здравствуйте! Хочу заказать матрас ELUNA. Модель: Eluna Air. Размер: 1600 × 2000 мм. Цена: 125 000 ₸.',
      'eluna-balance': 'Здравствуйте! Хочу заказать матрас ELUNA. Модель: Eluna Balance. Размер: 1600 × 2000 мм. Цена: 220 000 ₸.',
      'eluna-prime': 'Здравствуйте! Хочу заказать матрас ELUNA. Модель: Eluna Prime. Размер: 1600 × 2000 мм. Цена: 280 000 ₸ (без скидки 350 000 ₸, −20 %).',
      'eluna-royal': 'Здравствуйте! Хочу обсудить матрас ELUNA Royal под свой размер и проект.',
      business: 'Здравствуйте! Хочу обсудить проект для бизнеса.',
      master: 'Здравствуйте! У меня вопрос к мастеру RICCA.',
      delivery: 'Здравствуйте! Уточните, пожалуйста, условия доставки в мой город.',
      col: (name) => `Здравствуйте! Пришлите, пожалуйста, подборку: «${name}».`,
      fabric: (name) => `Здравствуйте! Хочу подобрать ткань в шоуруме. На сайте понравилась фактура «${name}».`,
      city: (city) => `Здравствуйте! Уточните, пожалуйста, условия доставки в город ${city}.`
    },
    video: 'video/',
    poster: 'img/process/',
    reelChapterMs: 4600
  };

  const root = document.documentElement;
  const body = document.body;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduceMotion = mqReduce.matches;
  if (reduceMotion) root.classList.add('reduce');
  const hasIO = 'IntersectionObserver' in window;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGsap) { gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true }); }

  /* один конвейер resize: пересчёт только при смене ширины или скачке высоты > 120px (адресная строка — не повод) */
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

  /* ---------- Деньги: узкий неразрывный пробел U+202F — «280 000 ₸» никогда не ломается ---------- */
  const NB = ' ';
  const fmtMoney = (n) => Math.round(n).toLocaleString('ru-RU').replace(/[\s ]/g, NB);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  /* ---------- Данные ELUNA (факты с сайта ELUNA, js/main.js) ---------- */
  const PRICES = { air: 125000, balance: 220000, prime: 280000, royal: 1250000 };   // ₸ за 1600 × 2000 мм
  const OLD_PRICES = { prime: 350000 };
  const discountPct = (k) => (OLD_PRICES[k] ? Math.round((1 - PRICES[k] / OLD_PRICES[k]) * 100) : 0);
  const MODELS = {
    air: { name: 'Eluna Air', meta: 'Базовая модель: армированные пружины, натуральный кокос 10 мм, двусторонний — зима / лето.', layers: [
      { kind: 'knit', cm: 0.6, name: 'Вискозный трикотаж' },
      { kind: 'foam', cm: 2, name: 'Ортопена', spec: '20 мм' },
      { kind: 'felt', cm: 0.6, name: 'Термовойлок', note: 'Долговечный, не сбивается и не собирает пыль внутри матраса' },
      { kind: 'springs', cm: 14, name: 'Армированные пружины', note: 'Без эффекта гамака — тело лежит ровно, спина в балансе' },
      { kind: 'felt', cm: 0.6, name: 'Термовойлок' },
      { kind: 'coir', cm: 1, name: 'Натуральный кокос', spec: '10 мм' },
      { kind: 'knit', cm: 0.6, name: 'Вискозный трикотаж' }
    ] },
    balance: { name: 'Eluna Balance', meta: 'Для сна каждую ночь: усиленный боковой каркас, два слоя натурального кокоса 10 и 20 мм, армированные пружины.', layers: [
      { kind: 'knit', cm: 0.6, name: 'Плотный вискозный трикотаж' },
      { kind: 'foam', cm: 2, name: 'Ортопена', spec: '20 мм' },
      { kind: 'felt', cm: 0.6, name: 'Термовойлок', note: 'Долговечный, не сбивается и не собирает пыль внутри матраса' },
      { kind: 'coir', cm: 2, name: 'Натуральный кокос', spec: '20 мм' },
      { kind: 'springs', cm: 14, name: 'Армированные пружины', spec: 'усиленный боковой каркас', note: 'Без эффекта гамака — тело лежит ровно, спина в балансе' },
      { kind: 'felt', cm: 0.6, name: 'Термовойлок' },
      { kind: 'coir', cm: 1, name: 'Натуральный кокос', spec: '10 мм' },
      { kind: 'foam', cm: 1.5, name: 'Ортопена', spec: '15 мм' },
      { kind: 'knit', cm: 0.6, name: 'Плотный вискозный трикотаж' }
    ] },
    prime: { name: 'Eluna Prime', meta: 'Выбор Eluna. Самый натуральный матрас линейки: чехол из 100 % хлопка, латекс и кокос по 20 мм, армированные пружины.', layers: [
      { kind: 'cotton', cm: 1, name: 'Чехол из 100 % хлопка', spec: 'ручная работа' },
      { kind: 'latex', cm: 2, name: 'Натуральный латекс', spec: '20 мм', note: 'Микромассажный эффект — тело расслабляется' },
      { kind: 'felt', cm: 0.6, name: 'Термовойлок', note: 'Долговечный, не сбивается и не собирает пыль внутри матраса' },
      { kind: 'coir', cm: 2, name: 'Натуральный кокос', spec: '20 мм — отвечает за жёсткость' },
      { kind: 'springs', cm: 16, name: 'Армированные пружины', note: 'Без эффекта гамака — тело лежит ровно, спина в балансе' },
      { kind: 'coir', cm: 2, name: 'Натуральный кокос', spec: '20 мм' },
      { kind: 'felt', cm: 0.6, name: 'Термовойлок' },
      { kind: 'latex', cm: 2, name: 'Натуральный латекс', spec: '20 мм' },
      { kind: 'cotton', cm: 1, name: 'Чехол из 100 % хлопка' }
    ] },
    royal: { name: 'Eluna Royal', meta: 'Флагман линейки: размер, состав и жёсткость подбираются под ваш проект. Срок изготовления — 21 день.', layers: null }
  };
  const TIERS = [
    { key: 'air', lvl: 1, tier: 'Базовая' },
    { key: 'balance', lvl: 2, tier: 'Pro' },
    { key: 'prime', lvl: 3, tier: `Выгода −${discountPct('prime')} %` },
    { key: 'royal', lvl: 4, tier: 'Флагман · индивидуально' }
  ];
  const LAYERS = [
    { num: '01', name: 'Стёганый чехол', short: 'Чехол', mm: 15 },
    { num: '02', name: 'Натуральный латекс', short: 'Латекс', mm: 30 },
    { num: '03', name: 'Memory-пена с гелем', short: 'Гель', mm: 40 },
    { num: '04', name: 'Кокосовая койра', short: 'Койра', mm: 30 },
    { num: '05', name: 'Пена HR', short: 'Пена HR', mm: 40 },
    { num: '06', name: 'Независимые пружины', short: 'Пружины', mm: 120 },
    { num: '07', name: 'Армированное основание', short: 'Основание', mm: 25 }
  ];

  /* ---------- Телефоны и WhatsApp из CONFIG ---------- */
  $$('[data-tel]').forEach((a) => {
    const t = CONFIG.tel[a.dataset.tel];
    if (!t) return;
    a.href = `tel:${t.href}`;
    if (a.classList.contains('tel')) {
      const prefix = a.textContent.includes(':') ? a.textContent.split(':')[0] + ': ' : '';
      a.textContent = prefix + t.text.replace(/ /g, ' ');
    }
  });
  const waUrl = (text) => `https://wa.me/${CONFIG.wa}?text=${encodeURIComponent(text)}`;
  const waText = (a) => {
    const key = a.dataset.wa;
    if (key === 'col') return CONFIG.msg.col(a.dataset.col || 'мебель RICCA');
    if (typeof CONFIG.msg[key] === 'string') return CONFIG.msg[key];
    return CONFIG.msg.general;
  };
  $$('[data-wa]').forEach((a) => {
    if (a.dataset.wa !== 'fabric' && a.dataset.wa !== 'eluna-size') a.href = waUrl(waText(a));
    a.target = '_blank';
    a.rel = 'noopener';
    if (!a.querySelector('.vh')) {
      const hint = document.createElement('span');
      hint.className = 'vh';
      hint.textContent = ' (откроется в новой вкладке)';
      a.append(hint);
    }
  });

  /* ---------- Шапка, меню, якоря ---------- */
  const nav = $('#nav');
  const navH = () => nav.offsetHeight;
  const menuBtn = $('.nav__menu');
  const menu = $('#menu');
  let menuOpen = false;
  const setMenu = (open) => {
    menuOpen = open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    root.classList.toggle('menu-open', open);
    $$('main, .footer, .mbar, .skip').forEach((el) => { el.inert = open; });
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      body.style.overflow = 'hidden';
      const first = $('a', menu);
      if (first) first.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      body.style.overflow = '';
      const done = () => { if (!menuOpen) menu.hidden = true; };
      reduceMotion ? done() : setTimeout(done, 650);
    }
    onScroll();
  };
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => setMenu(!menuOpen));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (!menuOpen) return;
      if (e.key === 'Escape') { setMenu(false); menuBtn.focus(); }
      if (e.key === 'Tab') {
        const items = [menuBtn, ...$$('a, button', menu)];
        const i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    mq.addEventListener('change', (e) => { if (!e.matches && menuOpen) setMenu(false); });
  }

  const scrollYFor = (target) => {
    const r = target.getBoundingClientRect();
    // цель могла ещё не «появиться» (reveal сдвигает на 26px) — считаем по итоговому месту
    const tf = getComputedStyle(target).transform;
    const shift = tf && tf !== 'none' ? new DOMMatrixReadOnly(tf).m42 : 0;
    const gap = target.id === 'stage' ? 0 : isMobile() ? 16 : 24;
    return r.top - shift + window.scrollY - navH() - gap;
  };
  const goTo = (id) => {
    if (id === 'top') { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); return true; }
    const target = document.getElementById(id);
    if (!target) return false;
    const dlg = target.closest('dialog');
    if (dlg) { openDialog(dlg); return true; }
    $$('dialog[open]').forEach((d) => d.close());
    window.scrollTo({ top: Math.max(0, scrollYFor(target)), behavior: reduceMotion ? 'auto' : 'smooth' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    return true;
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const id = a.getAttribute('href').slice(1);
    if (!id || id === 'main') return;
    if (!goTo(id)) return;
    e.preventDefault();
    history.replaceState(null, '', id === 'top' ? location.pathname : `#${id}`);
  });

  /* ---------- Первый экран ---------- */
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 500))]).then(() => requestAnimationFrame(() => root.classList.add('is-loaded')));

  /* ---------- Появления и счётчики ---------- */
  const revealEls = $$('.reveal');
  const showEl = (el) => el.classList.add('is-in');
  if (hasIO && !reduceMotion) {
    let queue = [], flushing = false;
    const flush = () => {
      queue.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
        .forEach((el, i) => { el.style.transitionDelay = `${Math.min(i, 5) * 0.09}s`; showEl(el); });
      queue = []; flushing = false;
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { queue.push(en.target); io.unobserve(en.target); } });
      if (queue.length && !flushing) { flushing = true; requestAnimationFrame(flush); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    revealEls.forEach((el) => io.observe(el));
    // страховка: всё, что оказалось выше края экрана (переход по якорю), показывается
    let sweepT = 0;
    const sweep = () => {
      const lim = window.innerHeight * 0.95;
      revealEls.forEach((el) => { if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < lim) { io.unobserve(el); showEl(el); } });
    };
    window.addEventListener('scroll', () => { clearTimeout(sweepT); sweepT = setTimeout(sweep, 180); }, { passive: true });
    setTimeout(sweep, 1200);
  } else {
    revealEls.forEach(showEl);
  }
  (function countUp() {
    const els = $$('[data-count]');
    if (!els.length || reduceMotion || !hasIO || !hasGsap) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target, to = +el.dataset.count, o = { v: 0 };
        gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = fmtMoney(o.v); }, onComplete: () => { el.textContent = fmtMoney(to); } });
      });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  })();

  /* ---------- Звёздное небо: узор рисуется один раз на ширину, дрейф — только transform ---------- */
  const stars = (function stars() {
    const far = document.getElementById('stars');
    if (!far) return { setVisible() {} };
    const near = document.createElement('canvas'); near.className = 'stars stars--near'; near.setAttribute('aria-hidden', 'true');
    const twinkle = document.createElement('canvas'); twinkle.className = 'stars stars--twinkle'; twinkle.setAttribute('aria-hidden', 'true');
    far.after(near); near.after(twinkle);
    const fctx = far.getContext('2d'), nctx = near.getContext('2d'), tctx = twinkle.getContext('2d');
    const tile = document.createElement('canvas'); const tctx0 = tile.getContext('2d');
    let w = 0, h = 0, H = 0, dpr = 1, flick = [], visible = true, driftRaf = 0, lastT = 0, scrollY0 = 0;
    const OVER = 1.18;
    const DRIFT = { far: -3.4, near: -10 };
    const off = { far: 0, near: 0, farY: 0, nearY: 0 };
    const wrap = (v, m) => ((v % m) + m) % m;
    const tint = (t) => (t < 0.25 ? [196, 208, 255] : t < 0.7 ? [245, 243, 238] : t < 0.92 ? [255, 236, 205] : [255, 208, 160]);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const density = () => (isMobile() ? 8000 * 1.56 : 5000);
    function paintLayer(ctx, kind) {
      tile.width = Math.round(w * dpr); tile.height = Math.round(H * dpr);
      tctx0.setTransform(dpr, 0, 0, dpr, 0, 0); tctx0.clearRect(0, 0, w, H);
      if (kind === 'far') {
        const band = Math.round((w * H) / (isMobile() ? 2400 : 1400));
        for (let i = 0; i < band; i++) {
          const u = Math.random(), g = (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
          const x = u * w, y = H * (0.85 - u * 0.55) + g * H * 0.42, c = tint(Math.random());
          tctx0.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${rnd(0.04, 0.16)})`;
          tctx0.fillRect(x, y, 1, 1);
        }
      }
      const n = Math.round((w * H) / density());
      for (let i = 0; i < n; i++) {
        const m = Math.pow(Math.random(), 3.2);
        if ((m > 0.5) !== (kind === 'near')) continue;
        const x = Math.random() * w, y = Math.random() * H, r = 0.3 + m * 1.6, a = 0.25 + m * 0.7, c = tint(Math.random());
        if (m > 0.72) {
          const g = tctx0.createRadialGradient(x, y, 0, x, y, r * 9);
          g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.2 * m})`); g.addColorStop(1, 'rgba(0,0,0,0)');
          tctx0.fillStyle = g; tctx0.beginPath(); tctx0.arc(x, y, r * 9, 0, Math.PI * 2); tctx0.fill();
          if (m > 0.9) {
            tctx0.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.18 * m})`; tctx0.lineWidth = 0.6;
            tctx0.beginPath(); tctx0.moveTo(x - r * 7, y); tctx0.lineTo(x + r * 7, y); tctx0.moveTo(x, y - r * 7); tctx0.lineTo(x, y + r * 7); tctx0.stroke();
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
        flick = Array.from({ length: Math.round(w / (isMobile() ? 56 : 32)) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: rnd(0.6, 1.4), c: tint(Math.random()), ph: Math.random() * Math.PI * 2, sp: rnd(0.4, 1.3), a: rnd(0.35, 0.8) }));
      }
      place(); drawTwinkle(performance.now());
    }
    function place() {
      const sy = Math.min(H - h, scrollY0 * 0.035);
      far.style.transform = `translate3d(${(wrap(off.far, w) - w).toFixed(2)}px, ${(off.farY - sy).toFixed(2)}px, 0)`;
      near.style.transform = `translate3d(${(wrap(off.near, w) - w).toFixed(2)}px, ${(off.nearY - sy * 1.3).toFixed(2)}px, 0)`;
    }
    function drawTwinkle(now) {
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0); tctx.clearRect(0, 0, w, h);
      for (const p of flick) {
        const k = 0.45 + 0.55 * Math.sin(now * 0.0011 * p.sp + p.ph);
        const x = wrap(p.x + off.near, w), y = p.y + off.nearY;
        tctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.a * k})`;
        tctx.beginPath(); tctx.arc(x, y, p.r * (0.8 + 0.4 * k), 0, Math.PI * 2); tctx.fill();
      }
    }
    function driftLoop(now) {
      driftRaf = 0;
      if (!visible || document.hidden || reduceMotion) { lastT = 0; return; }
      const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0; lastT = now;
      off.far += DRIFT.far * dt; off.near += DRIFT.near * dt;
      off.farY = Math.sin(now * 0.00004) * h * 0.004; off.nearY = Math.sin(now * 0.00007 + 1) * h * 0.014;
      place();
      driftRaf = requestAnimationFrame(driftLoop);
    }
    function startDrift() { if (driftRaf || !visible || document.hidden || reduceMotion) return; lastT = 0; driftRaf = requestAnimationFrame(driftLoop); }
    let ticking = false;
    function onScrollStars() { if (ticking) return; ticking = true; requestAnimationFrame(() => { scrollY0 = window.scrollY; place(); ticking = false; }); }
    requestAnimationFrame(() => { size(true); startDrift(); });
    resizeHooks.push((w2, h2, wChanged) => size(wChanged));
    window.addEventListener('scroll', onScrollStars, { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) startDrift(); });
    if (!reduceMotion) setInterval(() => { if (!document.hidden && visible) drawTwinkle(performance.now()); }, isMobile() ? 240 : 140);
    return { setVisible(v) { visible = v; if (v) startDrift(); } };
  })();
  // дрейф только пока на экране первый экран или сцена ELUNA; остальное — статичное небо
  if (hasIO) {
    const sky = new Set();
    const skyIO = new IntersectionObserver((es) => { es.forEach((e) => { e.isIntersecting ? sky.add(e.target) : sky.delete(e.target); }); stars.setVisible(sky.size > 0); }, { threshold: 0 });
    ['#top', '#stage', '#eluna-models'].forEach((s) => { const el = $(s); if (el) skyIO.observe(el); });
  }

  /* ---------- Сцена ELUNA: кадры разлёта по скроллу ----------
     Состояние S пишет один render(); стили — только при изменении значения. */
  const S = { cutO: 1, cutS: 1, cutX: 0, cutY: 0, spread: 0, outY: 0, outS: 1, outExp: 1, shade: 0 };
  const stageEl = $('#stage');
  const productCut = $('#productCut');
  const seqCanvas = $('#seq');
  const seqPoster = $('.seq-poster', stageEl || document);
  const shadeEl = $('#shade');
  const seqLabels = $('#seqLabels');
  const copyLayers = $('#copyLayers');
  const copyOutro = $('#copyOutro');
  const layerActiveEl = $('#layerActive');
  const stageProgress = $('#stageProgress');
  const stagePct = $('#stagePct');
  const sv = (el, p, v) => { const c = el.__sv || (el.__sv = {}); if (c[p] !== v) { c[p] = v; el.style[p] = v; } };
  const svar = (el, n, v) => { const c = el.__sv || (el.__sv = {}); if (c[n] !== v) { c[n] = v; el.style.setProperty(n, v); } };
  const svo = (el, v) => { sv(el, 'opacity', v); sv(el, 'visibility', +v > 0.004 ? 'visible' : 'hidden'); };
  const smoothstep = (v, a, b) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  if (stageEl && seqCanvas) {
    // уровень: телефон, экономия трафика или мало памяти — 1280×720; иначе 1920×1080
    const save = navigator.connection && navigator.connection.saveData;
    const lowTier = isMobile() || save || (navigator.deviceMemory && navigator.deviceMemory < 4);
    const SEQ = lowTier ? { count: 24, w: 1280, h: 720, base: 'img/eluna/seq720/' } : { count: 24, w: 1920, h: 1080, base: 'img/eluna/seq/' };
    const seqCtx = seqCanvas.getContext('2d', { alpha: true });
    const frames = new Array(SEQ.count).fill(null);
    let seqLoaded = 0, seqDirty = true, stageOff = false;
    const seqLast = { f: -1, w: 0, h: 0, loaded: 0 };
    const frameSrc = (i) => `${SEQ.base}f${String(i + 1).padStart(2, '0')}.webp`;
    // статичная сцена (reduced motion / без GSAP) показывает один кадр — грузим только его
    const seqStatic = !(hasGsap && !reduceMotion);
    const SEQ_KEYS = seqStatic ? [SEQ.count - 1] : [0, SEQ.count - 1, Math.floor(SEQ.count / 2)];
    // остальные — от крупного шага к мелкому (каждый 6-й, каждый 3-й, прочие): раскрытие уточняется по мере загрузки
    const SEQ_REST = []; if (!seqStatic) for (let i = 0; i < SEQ.count; i++) if (!SEQ_KEYS.includes(i)) SEQ_REST.push(i);
    SEQ_REST.sort((a, b) => (a % 6 ? a % 3 ? 2 : 1 : 0) - (b % 6 ? b % 3 ? 2 : 1 : 0) || a - b);
    const seqQueued = new Array(SEQ.count).fill(false), seqQueue = [];
    let seqBusy = 0;
    function loadSeq(list) {
      list.forEach((i) => { if (!seqQueued[i]) { seqQueued[i] = true; seqQueue.push(i); } });
      const next = () => {
        if (seqBusy >= 4 || !seqQueue.length) return;
        const i = seqQueue.shift();
        seqBusy++;
        const im = new Image();
        im.decoding = 'async';
        const fin = () => { seqBusy--; next(); };
        im.onload = () => { const done = () => { frames[i] = im; seqLoaded++; seqDirty = true; drawSeq(); fin(); }; if (im.decode) im.decode().then(done, done); else done(); };
        im.onerror = fin;
        im.src = frameSrc(i);
        next();
      };
      next();
    }
    // постер = f01 (720p): пока кадры не пришли, холст рисует его же — переключение постер → холст невидимо
    function seedPoster() {
      if (frames[0] || !seqPoster || !seqPoster.naturalWidth) return;
      frames[0] = seqPoster; seqLoaded++; seqDirty = true; drawSeq();
    }
    function nearestFrame(i) {
      for (let d = 0; d < SEQ.count; d++) { if (frames[i - d]) return frames[i - d]; if (frames[i + d]) return frames[i + d]; }
      return null;
    }
    const dprSeq = () => Math.min(1.5, window.devicePixelRatio || 1);
    // компьютер: сдвиг продукта (vw) и масштаб в раскрытом виде и после ухода; левая грань матраса в кадре — 15.2 % ширины кадра
    const DESK = { cutX: 5, cutS: 0.94, outX: 16, outS: 0.8 }, INK_L = 0.152;
    // геометрия кадра в device px; холст размером с кадр, не с экран. Телефон: кадр шире экрана, по центру; компьютер: 70 % вписанного
    function seqGeometry() {
      const d = dprSeq(), cw = Math.round(window.innerWidth * d), ch = Math.round(window.innerHeight * d), mob = isMobile();
      const k = mob ? (cw / SEQ.w) * 1.12 : Math.min(cw / SEQ.w, ch / SEQ.h) * 0.72;
      const dw = SEQ.w * k, dh = SEQ.h * k;
      return { cw, ch, dw, dh, dx: mob ? cw * 0.5 - dw * 0.47 : (cw - dw) * 0.5, dy: (ch - dh) * (mob ? 0.62 : 0.56) };
    }
    function sizeSeq() {
      const d = dprSeq(), g = seqGeometry();
      seqCanvas.width = Math.round(g.dw); seqCanvas.height = Math.round(g.dh);
      seqCanvas.style.left = `${(g.dx / d).toFixed(1)}px`; seqCanvas.style.top = `${(g.dy / d).toFixed(1)}px`;
      seqCanvas.style.width = `${(g.dw / d).toFixed(1)}px`; seqCanvas.style.height = `${(g.dh / d).toFixed(1)}px`;
      // постер (виден до первого кадра) — в той же геометрии, что холст: без прыжка при переключении
      if (seqPoster) { seqPoster.style.transform = 'none'; seqPoster.style.left = seqCanvas.style.left; seqPoster.style.top = seqCanvas.style.top; seqPoster.style.width = seqCanvas.style.width; seqPoster.style.height = seqCanvas.style.height; }
      placeSeqLabels(g.dx / d, g.dy / d, g.dw / d, g.dh / d);
      // ширина текстовых колонок (компьютер) — до левой грани матраса: в раскрытом виде для «Семь слоёв», после ухода — для манифеста
      const vw = window.innerWidth, w = g.dw / d, gutter = clamp(vw * 0.06, 20, 96);
      const inkL = (x, sc) => vw / 2 + vw * x / 100 - w * sc / 2 + INK_L * w * sc;
      svar(stageEl, '--stage-copy-w', `${Math.round(clamp(inkL(DESK.cutX, DESK.cutS) - gutter - 24, 240, 560))}px`);
      svar(stageEl, '--stage-outro-w', `${Math.round(clamp(inkL(DESK.outX, DESK.outS) - gutter - 24, 320, 720))}px`);
      seqDirty = true; drawSeq();
    }
    function markSeq() {
      const f = clamp(S.spread, 0, 1) * (SEQ.count - 1);
      if (Math.abs(f - seqLast.f) > 0.015 || seqCanvas.width !== seqLast.w || seqCanvas.height !== seqLast.h || seqLoaded !== seqLast.loaded) {
        seqLast.f = f; seqLast.w = seqCanvas.width; seqLast.h = seqCanvas.height; seqLast.loaded = seqLoaded; seqDirty = true;
      }
    }
    let vigCache = { w: 0, h: 0, g: null };
    function seqVignette(w, h) {
      if (vigCache.w === w && vigCache.h === h && vigCache.g) return vigCache.g;
      const mob = isMobile();
      const rx = w * (mob ? 0.66 : 0.62), ry = h * (mob ? 0.66 : 0.64);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.translate(w / 2, h / 2); x.scale(rx, ry);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(mob ? 0.5 : 0.4, 'rgba(0,0,0,1)'); g.addColorStop(mob ? 0.76 : 0.7, 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(-w / rx, -h / ry, 2 * w / rx, 2 * h / ry);
      vigCache = { w, h, g: seqCtx.createPattern(c, 'no-repeat') };
      return vigCache.g;
    }
    function drawSeq() {
      if (!seqDirty || seqLoaded === 0) return;
      const cw = seqCanvas.width, ch = seqCanvas.height;
      const f = clamp(S.spread, 0, 1) * (SEQ.count - 1), i0 = Math.floor(f), t = f - i0;
      const a = nearestFrame(i0), b = frames[Math.min(SEQ.count - 1, i0 + 1)];
      seqCtx.globalCompositeOperation = 'source-over'; seqCtx.globalAlpha = 1;
      seqCtx.clearRect(0, 0, cw, ch);
      if (a) seqCtx.drawImage(a, 0, 0, cw, ch);
      if (b && b !== a && t > 0.02) { seqCtx.globalAlpha = t; seqCtx.drawImage(b, 0, 0, cw, ch); seqCtx.globalAlpha = 1; }
      // чёрный фон кадра → цвет страницы (#07080c), виньетка краёв — в сам холст
      seqCtx.globalCompositeOperation = 'lighten'; seqCtx.fillStyle = '#07080c'; seqCtx.fillRect(0, 0, cw, ch);
      seqCtx.globalCompositeOperation = 'destination-in'; seqCtx.fillStyle = seqVignette(cw, ch); seqCtx.fillRect(0, 0, cw, ch);
      seqCtx.globalCompositeOperation = 'source-over';
      seqDirty = false;
      if (!stageEl.classList.contains('is-canvas')) stageEl.classList.add('is-canvas');
    }

    /* выноски: якоря на правой грани слоёв в % кадра f24 */
    const SEQ_LABEL_Y = [6.5, 17.6, 24.6, 30.8, 40.6, 55.5, 71.0];
    const SEQ_LABEL_X = [84.0, 84.0, 84.0, 84.0, 84.0, 81.3, 78.1];
    const seqLabelEls = LAYERS.map((l, i) => {
      const el = document.createElement('span');
      el.className = 'seq-label'; el.style.setProperty('--i', i);
      el.innerHTML = `<i class="seq-label__dot seq-label__dot--a"></i><i class="seq-label__dot seq-label__dot--b"></i><span class="seq-label__text"><span class="num">${l.num}</span><span class="name" data-short="${l.short}">${l.name}</span><span class="spec">${l.mm} мм</span></span>`;
      seqLabels.appendChild(el);
      return el;
    });
    let seqGeo = { dx: 0, dy: 0, dw: 1, dh: 1 };
    const labelW = [], labelLast = [];
    function measureLabels() { seqLabelEls.forEach((el, i) => { labelW[i] = el.querySelector('.seq-label__text').offsetWidth || 160; }); labelLast.length = 0; }
    function placeSeqLabels(x, y, w, h) { seqGeo = { dx: x, dy: y, dw: w, dh: h }; measureLabels(); }
    function labelAnchor(i, vw, vh) {
      const ax = seqGeo.dx + SEQ_LABEL_X[i] / 100 * seqGeo.dw, ay = seqGeo.dy + SEQ_LABEL_Y[i] / 100 * seqGeo.dh;
      const cx = vw / 2, cy = vh / 2, sc = S.cutS * S.outS;
      return { x: cx + (ax - cx) * sc + S.cutX * vw / 100, y: cy + (ay - cy) * sc + (S.cutY + S.outY) * vh / 100 };
    }
    function placeLabels(vw, vh) {
      const run = 32;
      for (let i = 0; i < seqLabelEls.length; i++) {
        const a = labelAnchor(i, vw, vh), el = seqLabelEls[i];
        const key = `${a.x.toFixed(1)}|${a.y.toFixed(1)}`;
        if (labelLast[i] === key) continue;
        labelLast[i] = key;
        svar(el, '--ax', `${a.x.toFixed(1)}px`); svar(el, '--ay', `${a.y.toFixed(1)}px`);
        const over = a.x + run + 9 + (labelW[i] || 160) - (vw - 12);
        svar(el, '--shift', `${over > 0 ? (-over).toFixed(1) : 0}px`);
        svar(el, '--vis', a.y < 48 || a.y > vh - 24 ? '0' : '1');
      }
    }
    let activeLayer = -2;
    function setActiveLayer(i) {
      if (i === activeLayer) return;
      activeLayer = i;
      const l = LAYERS[i];
      layerActiveEl.classList.toggle('is-on', !!l);
      if (l) {
        layerActiveEl.querySelector('.num').textContent = l.num;
        layerActiveEl.querySelector('.name').textContent = l.name;
        layerActiveEl.querySelector('.spec').textContent = `${l.mm} мм`;
      }
      seqLabelEls.forEach((el, k) => el.classList.toggle('is-active', k === i));
    }
    let labelsIn = -1;
    function render() {
      if (stageOff) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      // уход: гасим сам продукт (прозрачность), а не чёрной плашкой поверх — у плашки видны края
      svo(productCut, (S.cutO * clamp(S.outExp, 0, 1)).toFixed(3));
      svo(shadeEl, S.shade.toFixed(3));
      sv(productCut, 'transform', `translate3d(${(S.cutX * vw / 100).toFixed(2)}px, ${((S.cutY + S.outY) * vh / 100).toFixed(2)}px, 0) scale(${(S.cutS * S.outS).toFixed(4)})`);
      markSeq(); drawSeq();
      // слой «в фокусе» — по ходу раскрытия сверху вниз
      const sp = clamp(S.spread, 0, 1);
      setActiveLayer(sp < 0.04 ? -1 : Math.min(6, Math.floor(sp * 7)));
      svo(seqLabels, (smoothstep(sp, 0.78, 1) * smoothstep(S.outExp, 0.8, 1)).toFixed(3));
      const li = sp < 0.8 ? -1 : Math.min(6, Math.floor((sp - 0.8) / 0.2 * 7));
      if (li !== labelsIn) { labelsIn = li; seqLabelEls.forEach((el, k) => el.classList.toggle('is-in', k <= li)); }
      if (!isMobile()) placeLabels(vw, vh);
      svar(stageProgress, '--p', sp.toFixed(3));
      const pct = `${Math.round(sp * 100)} %`;
      if (stagePct.__t !== pct) { stagePct.__t = pct; stagePct.textContent = pct; }
    }
    sizeSeq();
    resizeHooks.push(() => { sizeSeq(); render(); });
    if (seqPoster) { if (seqPoster.complete) seedPoster(); else seqPoster.addEventListener('load', seedPoster, { once: true }); }

    // фазы текста: до 64 % — «Семь слоёв»; 64–76 % продукт уходит на чистое поле (без текста); 76–95 % — манифест
    let phase = '';
    function setPhase(p) {
      const ph = p < 0.64 ? 'layers' : p >= 0.76 && p < 0.95 ? 'outro' : 'none';
      if (ph === phase) return;
      phase = ph;
      copyLayers.classList.toggle('is-on', ph === 'layers');
      copyOutro.classList.toggle('is-on', ph === 'outro');
      stageProgress.classList.toggle('is-hidden', ph === 'outro');
      sv(stageProgress, 'opacity', ph !== 'layers' ? '0' : '1');
    }
    setPhase(0);

    if (hasGsap && !reduceMotion) {
      const mm = gsap.matchMedia();
      mm.add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)' }, (ctx) => {
        const D = ctx.conditions.desk;
        S.cutX = D ? DESK.cutX : 0;
        const tl = gsap.timeline({
          defaults: { ease: 'none' }, onUpdate: render,
          scrollTrigger: { trigger: stageEl, start: 'top top', end: D ? '+=170%' : '+=120%', pin: true, scrub: D ? 0.6 : 0.4, anticipatePin: 1, invalidateOnRefresh: true, onUpdate: (self) => setPhase(self.progress) }
        });
        /* 0–56 раскрытие (выноски заходят в конце), 56–64 пауза с подписями, 64–78 продукт уходит вправо/вверх и гаснет до .4
           (выноски гаснут первыми), 76–95 манифест на тёмном поле, 84–96 дожим: компьютер → .1, телефон → .3 — матрас остаётся
           призраком, пока снизу заходит «концепция» (её margin-top отрицательный), чёрной паузы нет */
        tl.to(S, { spread: 1, cutS: D ? DESK.cutS : 0.97, duration: 56, ease: 'power1.inOut' }, 0)
          .to(S, { outExp: 0.4, outS: D ? DESK.outS : 0.72, outY: D ? -4 : -18, cutX: D ? DESK.outX : 0, shade: D ? 0.85 : 0.55, duration: 14, ease: 'power2.inOut' }, 64)
          .to(S, { outExp: D ? 0.1 : 0.3, outY: D ? -12 : -24, duration: 12, ease: 'power1.in' }, 84)
          .to(S, { shade: 0, duration: 8 }, 90);
        return () => { S.spread = 0; S.cutS = 1; S.outExp = 1; S.outS = 1; S.outY = 0; S.shade = 0; S.cutX = 0; render(); setPhase(0); };
      });
    } else {
      // без GSAP или с reduced motion: статичный разложенный матрас, все выноски на месте
      S.spread = 1; S.cutS = isMobile() ? 0.97 : DESK.cutS; S.cutX = isMobile() ? 0 : DESK.cutX;
      stageEl.classList.add('is-static');
      render();
      stagePct.textContent = '';
    }

    // кадры — лениво: после полной загрузки страницы и паузы в работе браузера; опорные (f01/f12/f24) — за ¾ экрана до сцены,
    // остальные — за полэкрана (на телефоне сцена начинается через ~2 экрана: в покое наверху страницы кадры не грузятся). Статичная сцена грузит один кадр.
    const whenLoaded = new Promise((r) => { if (document.readyState === 'complete') r(); else window.addEventListener('load', r, { once: true }); });
    const whenIdle = () => new Promise((r) => { if ('requestIdleCallback' in window) requestIdleCallback(() => r(), { timeout: 1500 }); else setTimeout(r, 600); });
    const startSeq = (list) => whenLoaded.then(whenIdle).then(() => { loadSeq(list); });
    if (hasIO) {
      const near = (margin, list) => { const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); startSeq(list); } }, { rootMargin: margin }); io.observe(stageEl); };
      near('75% 0px', SEQ_KEYS);
      if (SEQ_REST.length) near('50% 0px', SEQ_KEYS.concat(SEQ_REST));
      new IntersectionObserver((es) => {
        const on = es[es.length - 1].isIntersecting;   // пин переподвешивает сцену — записи приходят пачкой, важна последняя
        stageOff = !on;
        if (on) render();
      }, { threshold: 0 }).observe(stageEl);
    } else startSeq(SEQ_KEYS.concat(SEQ_REST));
    document.fonts && document.fonts.ready && document.fonts.ready.then(() => { measureLabels(); render(); });
    window.__ricca_render = render;
  }

  /* ---------- Линейка ELUNA: цены, метки, разрезы, рельс света, диалоги ---------- */
  const priceHTML = (k) => {
    const p = PRICES[k], old = OLD_PRICES[k];
    if (!old) return `${fmtMoney(p)} ₸`;
    return `<s class="price-old"><span class="vh">старая цена </span>${fmtMoney(old)} ₸</s><span class="price-new">${fmtMoney(p)} ₸</span><span class="save">−${discountPct(k)} %</span>`;
  };
  $$('[data-price]').forEach((el) => { el.innerHTML = priceHTML(el.dataset.price); });
  const meter = (lvl) => `<span class="lm" aria-hidden="true">${[1, 2, 3, 4].map((k) => `<i${k <= lvl ? ' class="on"' : ''}></i>`).join('')}</span>`;
  $$('[data-tier]').forEach((el) => {
    const t = TIERS.find((x) => x.key === el.dataset.tier);
    if (t) el.innerHTML = `<span class="tier" data-lvl="${t.lvl}"><span>${esc(t.tier)}</span>${meter(t.lvl)}</span>`;
  });
  $$('.xs[data-xs]').forEach((box) => {
    const m = MODELS[box.dataset.xs];
    if (!m || !m.layers) return;
    box.innerHTML = m.layers.map((l) => `<div class="xs__layer xs--${l.kind}"><div class="xs__fill" style="--cm:${l.cm}"></div><div class="xs__text"><b>${esc(l.name)}</b>${l.spec ? `<span class="cm">${esc(l.spec)}</span>` : ''}${l.note ? `<span class="note-s">${esc(l.note)}</span>` : ''}</div></div>`).join('');
  });

  function openDialog(dlg, opener) {
    if (dlg.open) return;
    dlg._opener = opener || document.activeElement;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    dlg.scrollTop = 0;
    body.style.overflow = 'hidden';
    if (hasGsap && !reduceMotion) gsap.fromTo(dlg, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .4, ease: 'power3.out', clearProps: 'transform' });
    onScroll();
  }
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => { const dlg = document.getElementById(b.dataset.open); if (dlg) openDialog(dlg, b); }));
  $$('dialog.mdl').forEach((dlg) => {
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => { body.style.overflow = ''; const o = dlg._opener; if (o && o.focus) o.focus(); onScroll(); });
  });

  (function lineup() {
    const rail = $('#mrail'), track = $('#mcards');
    if (!rail || !track) return;
    const cards = $$('.mcard', track);
    const keys = cards.map((c) => c.dataset.model);
    let cur = -1;
    function select(i) {
      if (i === cur || !cards[i]) return;
      cur = i;
      cards.forEach((c, k) => { c.classList.toggle('is-on', k === i); c.classList.toggle('is-dim', k !== i); });
      const t = TIERS.find((x) => x.key === keys[i]) || { lvl: 2 };
      rail.style.setProperty('--lc', keys[i] === 'prime' ? 'var(--warm)' : keys[i] === 'royal' ? '190, 170, 230' : 'var(--cool)');
      if (!isMobile()) {
        const r = rail.getBoundingClientRect(), cr = cards[i].getBoundingClientRect();
        rail.style.setProperty('--lx', `${(clamp((cr.left + cr.width / 2 - r.left) / Math.max(1, r.width), 0, 1) * 100).toFixed(2)}%`);
        rail.style.setProperty('--li', (0.5 + t.lvl * 0.12).toFixed(3));
      }
    }
    cards.forEach((c, i) => {
      c.addEventListener('mouseenter', () => { if (!isMobile()) select(i); });
      c.addEventListener('focusin', () => select(i));
      c.addEventListener('click', (e) => { if (!e.target.closest('a,button')) select(i); });
    });
    function centerCard(el) {
      if (!isMobile() || !el) return;
      requestAnimationFrame(() => { track.scrollTo({ left: el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2, behavior: 'instant' }); markCenter(); });
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
    select(2);
    centerCard(cards[2]);
  })();

  /* ---------- Размер и цена: модель → размер → WhatsApp (правило сайта ELUNA: +40 000 ₸ за м² сверх 3,2 м²) ---------- */
  (function configurator() {
    const models = $('#cfgModels'), sizes = $('#cfgSizes'), custom = $('#cfgCustom'), wIn = $('#cfgW'), hIn = $('#cfgH');
    if (!models || !sizes) return;
    const sumName = $('#sumName'), sumDim = $('#sumDim'), sumPrice = $('#sumPrice'), sumMeta = $('#sumMeta');
    const o = { model: 'prime', size: '1600x2000', w: 1700, h: 2000 };
    const PER_M2 = 40000;
    const dims = () => (o.size === 'custom' ? [o.w, o.h] : o.size.split('x').map(Number));
    function priceOf() {
      const [w, h] = dims();
      const base = PRICES[o.model], old = OLD_PRICES[o.model];
      const v = Math.round((base + ((w * h) / 1e6 - 3.2) * PER_M2) / 1000) * 1000;
      return { v, o: old ? Math.round(v * old / base / 1000) * 1000 : null };
    }
    const sizeText = () => { const [w, h] = dims(); return `${w} × ${h} мм`; };
    function message() {
      const p = priceOf();
      if (o.model === 'royal') return `Здравствуйте! Хочу обсудить матрас ELUNA Royal под проект. Размер: ${sizeText()}. Ориентир по цене: ${fmtMoney(p.v)} ₸.`;
      return `Здравствуйте! Хочу заказать матрас ELUNA. Модель: ${MODELS[o.model].name}. Размер: ${sizeText()}${o.size === 'custom' ? ' (свой размер, изготовление 21 день)' : ''}. Цена: ${fmtMoney(p.v)} ₸${p.o ? ` (без скидки ${fmtMoney(p.o)} ₸, −${discountPct(o.model)} %)` : ''}.`;
    }
    function renderCfg() {
      $$('button', models).forEach((b) => { b.setAttribute('aria-checked', String(b.dataset.m === o.model)); });
      $$('button', sizes).forEach((b) => { b.setAttribute('aria-checked', String(b.dataset.s === o.size)); });
      custom.hidden = o.size !== 'custom';
      const p = priceOf();
      sumName.textContent = MODELS[o.model].name;
      sumDim.textContent = sizeText().replace(/ /g, ' ');
      if (p.v == null) sumPrice.innerHTML = `<span style="font-size:.6em">по запросу</span>`;
      else sumPrice.innerHTML = p.o ? `<s class="price-old">${fmtMoney(p.o)} ₸</s><span class="price-new">${fmtMoney(p.v)} ₸</span><span class="save">−${discountPct(o.model)} %</span>` : `${fmtMoney(p.v)} ₸`;
      sumMeta.textContent = MODELS[o.model].meta + (o.size === 'custom' ? ' Свой размер — изготовление 21 день.' : '');
      const href = waUrl(message());
      $$('[data-wa="eluna-size"]').forEach((a) => { a.href = href; });
    }
    models.addEventListener('click', (e) => { const b = e.target.closest('button[data-m]'); if (!b) return; o.model = b.dataset.m; renderCfg(); });
    sizes.addEventListener('click', (e) => { const b = e.target.closest('button[data-s]'); if (!b) return; o.size = b.dataset.s; renderCfg(); if (o.size === 'custom') wIn.focus({ preventScroll: true }); });
    const onNum = () => { o.w = clamp(Math.round((+wIn.value || 1600) / 10) * 10, 1400, 2200); o.h = clamp(Math.round((+hIn.value || 2000) / 10) * 10, 1900, 2200); renderCfg(); };
    [wIn, hIn].forEach((inp) => { inp.addEventListener('input', onNum); inp.addEventListener('change', () => { onNum(); wIn.value = o.w; hIn.value = o.h; }); });
    [models, sizes].forEach((grp) => grp.addEventListener('keydown', (e) => {
      const btns = $$('button', grp), i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      let n = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % btns.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + btns.length) % btns.length;
      if (n >= 0) { e.preventDefault(); btns[n].click(); btns[n].focus(); }
    }));
    renderCfg();
  })();

  /* ---------- Ателье: фильм по главам. Одновременно декодируется ОДИН ролик ---------- */
  const safePlay = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const canWebm = (() => { const v = document.createElement('video'); return !!v.canPlayType && v.canPlayType('video/webm; codecs="vp9"') !== ''; })();
  const clipSrc = (name) => `${CONFIG.video}${name}.${canWebm ? 'webm' : 'mp4'}`;
  const reel = $('[data-reel]');
  const reelApi = { pause() {}, resume() {} };
  if (reel) {
    const chs = $$('.ch'), vids = $$('.reel__v', reel);
    const countEl = $('[data-reel-count]', reel), railEl = $('[data-reel-rail]', reel), desc = $('[data-reel-desc]', reel), live = $('[data-reel-live]', reel), toggle = $('[data-reel-toggle]', reel);
    const STEPS = chs.filter((c) => !c.classList.contains('ch--final')).length;
    let active = 0, front = 0, clips = [], clipPos = 0, inView = false, timer = 0, started = false, releaseT = 0;
    let auto = !reduceMotion;
    const descs = [];
    if (desc) {
      desc.replaceChildren(...chs.map((c, i) => {
        const sp = document.createElement('span');
        sp.innerHTML = c.dataset.text;
        if (i === 0) sp.className = 'is-on'; else sp.setAttribute('aria-hidden', 'true');
        descs.push(sp);
        return sp;
      }));
    }
    const posterOf = (n) => `${CONFIG.poster}${n}.webp`;
    const setAuto = (on) => { auto = on && !reduceMotion; reel.classList.toggle('is-auto', auto); if (toggle) toggle.textContent = auto ? 'Пауза' : 'Смотреть'; };
    const setUI = (idx) => {
      const ch = chs[idx], final = ch.classList.contains('ch--final');
      chs.forEach((c, i) => { c.classList.toggle('is-active', i === idx); c.setAttribute('aria-pressed', String(i === idx)); });
      const bar = $('.ch__bar', ch);
      if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
      if (countEl) countEl.innerHTML = final ? '<b>Готово</b>' : `Шаг <b>${String(idx + 1).padStart(2, '0')}</b> / ${String(STEPS).padStart(2, '0')}`;
      if (railEl) railEl.style.transform = `scaleX(${Math.min(1, (idx + 1) / STEPS).toFixed(4)})`;
      descs.forEach((d, i) => { d.classList.toggle('is-on', i === idx); if (i === idx) d.removeAttribute('aria-hidden'); else d.setAttribute('aria-hidden', 'true'); });
      vids.forEach((v) => v.setAttribute('aria-label', `Кадры из ателье RICCA: ${$('.ch__t', ch).textContent}`));
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!auto || !inView) return;
      const d = chs[active].classList.contains('ch--final') ? CONFIG.reelChapterMs + 1800 : CONFIG.reelChapterMs;
      reel.style.setProperty('--dur', `${d}ms`);
      timer = setTimeout(() => select((active + 1) % chs.length, false), d);
    };
    const select = (idx, byUser) => {
      if (byUser && auto) setAuto(false);
      const changed = idx !== active || !started || byUser;
      active = idx;
      setUI(idx);
      if (byUser && live) live.textContent = chs[idx].dataset.text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
      if (changed) {
        started = true;
        clips = chs[idx].dataset.clips.split(' ');
        clipPos = 0;
        clearTimeout(releaseT);
        const back = vids[1 - front], cur = vids[front];
        back.loop = auto && clips.length === 1;
        back.poster = posterOf(clips[0]);
        const swap = () => {
          back.classList.add('is-on'); cur.classList.remove('is-on');
          back.removeAttribute('aria-hidden'); cur.setAttribute('aria-hidden', 'true');
          front = 1 - front;
          clearTimeout(releaseT);
          releaseT = setTimeout(() => { if (!cur.classList.contains('is-on') && cur.hasAttribute('src')) { cur.removeAttribute('src'); cur.load(); } }, reduceMotion ? 0 : 1100);
        };
        cur.pause();
        if (reduceMotion) { back.removeAttribute('src'); swap(); }
        else {
          back.defaultPlaybackRate = 0.8;
          back.src = clipSrc(clips[0]);
          back.addEventListener('loadeddata', function once() { back.removeEventListener('loadeddata', once); back.playbackRate = 0.8; swap(); if (inView && (auto || byUser)) safePlay(back); });
          back.load();
        }
      }
      schedule();
    };
    setAuto(auto);
    if (reduceMotion && toggle) toggle.hidden = true;
    chs.forEach((c, i) => c.addEventListener('click', () => select(i, true)));
    if (toggle) toggle.addEventListener('click', () => {
      if (auto) { setAuto(false); clearTimeout(timer); vids.forEach((v) => v.pause()); }
      else { setAuto(true); const v = vids[front]; v.loop = clips.length === 1; if (inView && v.src) safePlay(v); setUI(active); schedule(); }
    });
    vids.forEach((v) => v.addEventListener('ended', () => {
      if (!v.classList.contains('is-on') || clips.length < 2) return;
      if (!auto && clipPos === clips.length - 1) return;
      clipPos = (clipPos + 1) % clips.length;
      v.poster = posterOf(clips[clipPos]); v.src = clipSrc(clips[clipPos]); v.playbackRate = 0.8; safePlay(v);
    }));
    reelApi.pause = () => { clearTimeout(timer); vids.forEach((v) => v.pause()); };
    reelApi.resume = () => { if (auto && inView && !reduceMotion && vids[front].src) safePlay(vids[front]); schedule(); };
    if (hasIO) {
      const prime = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { vids[0].poster = vids[0].dataset.poster; prime.disconnect(); } }, { rootMargin: '100% 0px' });
      prime.observe(reel);
      new IntersectionObserver((es) => {
        es.forEach((e) => {
          inView = e.isIntersecting;
          if (inView) { if (!started) select(active, false); else if (auto && !reduceMotion && vids[front].src) safePlay(vids[front]); schedule(); }
          else reelApi.pause();
        });
      }, { threshold: 0.35 }).observe(reel);
    } else vids[0].poster = vids[0].dataset.poster;
  }

  /* ---------- Материалы: образцы (radiogroup) → превью и сообщение в WhatsApp ---------- */
  const swWrap = $('[data-swatches]');
  let fabricHref = '';
  if (swWrap) {
    const btns = $$('.swatch', swWrap);
    const nameEl = $('[data-sample-name]'), toneEl = $('[data-sample-tone]'), descEl = $('[data-sample-desc]'), cta = $('[data-fabric-cta]');
    const texA = $('[data-sample-tex]'), texB = $('[data-sample-tex-next]');
    let swapT = 0, frontTex = texA;
    const texUrl = (t) => `img/nera/tex-${t}.webp`;
    const paint = (b) => {
      const url = `url(${texUrl(b.dataset.tex)})`;
      if (reduceMotion || !texB) { frontTex.style.backgroundImage = url; return; }
      const back = frontTex === texA ? texB : texA;
      clearTimeout(swapT);
      back.style.backgroundImage = url;
      back.classList.remove('is-out');
      frontTex.classList.add('is-out');
      frontTex = back;
    };
    const pick = (i, focus) => {
      btns.forEach((b, j) => { b.setAttribute('aria-checked', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
      const b = btns[i];
      if (nameEl) nameEl.textContent = b.dataset.name;
      if (toneEl) toneEl.textContent = b.dataset.tone;
      if (descEl) descEl.textContent = b.dataset.desc;
      fabricHref = waUrl(CONFIG.msg.fabric(`${b.dataset.name.toLowerCase()}, ${b.dataset.tone.toLowerCase()}`));
      if (cta) cta.href = fabricHref;
      paint(b);
      if (focus) b.focus();
      requestAnimationFrame(() => onScroll());
    };
    btns.forEach((b, i) => b.addEventListener('click', () => pick(i, false)));
    swWrap.addEventListener('keydown', (e) => {
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      let n = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % btns.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + btns.length) % btns.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = btns.length - 1;
      if (n >= 0) { e.preventDefault(); pick(n, true); }
    });
    const first = Math.max(0, btns.findIndex((b) => b.getAttribute('aria-checked') === 'true'));
    btns.forEach((b, j) => { b.tabIndex = j === first ? 0 : -1; });
    const b0 = btns[first];
    fabricHref = waUrl(CONFIG.msg.fabric(`${b0.dataset.name.toLowerCase()}, ${b0.dataset.tone.toLowerCase()}`));
    if (cta) cta.href = fabricHref;
  }

  /* ---------- Доставка: карта и города (координаты — % кадра 2080 × 1174, как на сайте ELUNA) ---------- */
  (function delivery() {
    const box = $('#cities'), nameEl = $('#cityName'), termEl = $('#cityTerm'), elunaEl = $('#cityEluna'), waEl = $('#cityWa');
    if (!box) return;
    const CITIES = [['Астана', 61.0, 31.37], ['Алматы', 73.21, 78.03], ['Шымкент', 56.87, 83.31], ['Караганда', 64.63, 39.39], ['Актобе', 29.26, 36.58], ['Тараз', 60.82, 80.02], ['Павлодар', 73.26, 24.79], ['Усть-Каменогорск', 85.84, 38.55], ['Семей', 80.5, 35.83], ['Атырау', 17.61, 55.34], ['Костанай', 43.63, 19.33], ['Кызылорда', 47.8, 68.53], ['Уральск', 16.38, 31.16], ['Петропавловск', 55.86, 9.61], ['Актау', 16.0, 75.6], ['Талдыкорган', 76.38, 67.57], ['Кокшетау', 56.44, 18.93], ['Туркестан', 53.89, 77.69]];
    const btns = CITIES.map(([c, x, y], i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'city' + (c === 'Алматы' ? ' is-on city--main' : '') + (x > 78 ? ' city--home' : '');
      b.style.setProperty('--x', `${x}%`); b.style.setProperty('--y', `${y}%`); b.style.setProperty('--d', `${(i * 0.37) % 3.4}s`);
      b.setAttribute('aria-pressed', String(c === 'Алматы'));
      b.setAttribute('aria-label', `Доставка в город ${c}`);
      b.innerHTML = `<i aria-hidden="true"></i><span>${c}</span>`;
      b.addEventListener('click', () => pick(c));
      box.appendChild(b);
      return b;
    });
    function pick(c) {
      btns.forEach((b, i) => { const on = CITIES[i][0] === c; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      nameEl.textContent = c;
      if (c === 'Алматы') {
        termEl.innerHTML = '<b>Мы здесь.</b> Матрасы ELUNA привезём и&nbsp;установим сами; мебель&nbsp;— доставка по&nbsp;городу, условия при заказе.';
        elunaEl.textContent = 'Доставка по городу, установка включена';
      } else {
        termEl.innerHTML = `<b>${esc(c)}.</b> Матрасы ELUNA&nbsp;— от&nbsp;7&nbsp;дней до&nbsp;двери, подъём включён. Мебель RICCA&nbsp;— срок и&nbsp;условия называем при заказе.`;
        elunaEl.textContent = 'От 7 дней до двери, подъём включён';
      }
      waEl.href = waUrl(CONFIG.msg.city(c));
    }
    waEl.href = waUrl(CONFIG.msg.city('Алматы'));
  })();

  /* ---------- Шапка при скролле, активный раздел, липкая плашка (телефон) ---------- */
  const navLinks = $$('.nav__links a');
  const sections = navLinks.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  const mbar = $('[data-mbar]');
  const mbarWa = $('[data-mbar-wa]');
  const mbarWaGeneral = mbarWa ? mbarWa.href : '';
  const heroCta = $('[data-hero-cta]');
  const showroom = $('#showroom');
  const materials = $('#materials');
  const elunaSec = $('#eluna');
  const elunaWaHref = waUrl(CONFIG.msg.eluna);
  if (mbar && isMobile()) body.classList.add('has-mbar');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY, vh = window.innerHeight;
      nav.classList.toggle('is-solid', y > 24 || menuOpen);
      // активный раздел
      let current = null;
      for (const s of sections) { if (s.getBoundingClientRect().top <= vh * 0.42) current = s; }
      navLinks.forEach((a) => a.classList.toggle('is-active', !!current && a.getAttribute('href') === `#${current.id}`));
      // плашка на телефоне: после кнопок первого экрана, до шоурума, не поверх сцены, меню и диалога
      if (mbar) {
        const ctaGone = heroCta ? heroCta.getBoundingClientRect().bottom < 0 : y > vh;
        const showroomReached = showroom ? showroom.getBoundingClientRect().top < vh * 0.7 : false;
        const st = stageEl ? stageEl.getBoundingClientRect() : null;
        const overStage = st ? st.top < vh * 0.5 && st.bottom > vh * 0.5 : false;
        const dlgOpen = !!$('dialog[open]');
        const on = isMobile() && ctaGone && !showroomReached && !overStage && !menuOpen && !dlgOpen;
        mbar.classList.toggle('is-on', on);
        mbar.setAttribute('aria-hidden', String(!on));
        $$('a', mbar).forEach((a) => { a.tabIndex = on ? 0 : -1; });
        if (mbarWa) {
          let href = mbarWaGeneral;
          const mid = vh * 0.5;
          if (materials && fabricHref) { const m = materials.getBoundingClientRect(); if (m.top < mid && m.bottom > mid) href = fabricHref; }
          if (elunaSec) { const e = elunaSec.getBoundingClientRect(); if (e.top < mid && e.bottom > mid) href = elunaWaHref; }
          if (mbarWa.href !== href) mbarWa.href = href;
        }
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  mq.addEventListener('change', (e) => { body.classList.toggle('has-mbar', e.matches && !!mbar); });
  onScroll();

  /* ---------- Пересчёт пинов после шрифтов и полной загрузки; поздний viewport ---------- */
  if (hasGsap) {
    fontsReady.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }
  requestAnimationFrame(() => { if (window.innerWidth !== lastW || window.innerHeight !== lastH) onResize(true); });
})();
