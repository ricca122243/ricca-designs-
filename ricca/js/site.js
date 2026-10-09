/* RICCA DESIGNS — сайт «Chapitres». Ванильный JS; GSAP + ScrollTrigger (vendor/, defer) — только для сцены ELUNA.
   Порядок: CONFIG (контакты и тексты WhatsApp) → шапка, меню, якоря → свёртки, чипы, появления → ELUNA (звёзды, сцена
   кадров, линейка, сравнение, конфигуратор) → фильм по главам → образцы → доставка → проекты и лайтбокс → «Подборка» →
   липкая плашка. Единственный владелец ссылок [data-wa] / [data-tel] — этот файл. */
(() => {
  'use strict';

  /* ---------- CONFIG: номера и готовые тексты WhatsApp (CONTENT-V3 §27) — менять здесь ----------
     TODO (заказчик): заказы ELUNA с сайта RICCA — на основной 708 480-20-47 (как здесь) или на отдел заказов 707 955-08-08? */
  const CONFIG = {
    wa: '77084802047',
    tel: { main: { href: '+77084802047' }, orders: { href: '+77079550808' } },
    msg: {
      general: 'Здравствуйте! Хочу узнать о мебели RICCA на заказ.',
      question: 'Здравствуйте! У меня вопрос по мебели RICCA.',
      showroom: 'Здравствуйте! Хочу записаться на визит в шоурум RICCA на Навои, 208/2.',
      sofas: 'Здравствуйте! Интересует диван на заказ. Пришлите, пожалуйста, подборку и расскажите, что нужно для расчёта.',
      beds: 'Здравствуйте! Интересует кровать на заказ. Размер матраса: 1600 × 2000 / 1800 × 2000 / свой. Пришлите, пожалуйста, подборку.',
      armchairs: 'Здравствуйте! Интересует кресло для отдыха. Пришлите, пожалуйста, подборку.',
      tables: 'Здравствуйте! Хочу подобрать стол или консоль к мягкой мебели. Пришлите, пожалуйста, варианты.',
      c2026: 'Здравствуйте! Что из коллекции 2026 сейчас стоит в шоуруме?',
      projects: 'Здравствуйте! Хочу обсудить мебель для своей комнаты: гостиная / спальня / столовая / кабинет / другое. Размеры и фото пришлю следующим сообщением.',
      business: 'Здравствуйте! Хочу обсудить проект для бизнеса: отель / ресторан / апарт-комплекс / жилой проект / офис.',
      master: 'Здравствуйте! У меня вопрос к мастеру RICCA.',
      eluna: 'Здравствуйте! Интересуют матрасы ELUNA.',
      'eluna:air': 'Здравствуйте! Хочу заказать матрас ELUNA. Модель: Eluna Air. Размер: 1600 × 2000 мм. Цена: 125 000 ₸.',
      'eluna:balance': 'Здравствуйте! Хочу заказать матрас ELUNA. Модель: Eluna Balance. Размер: 1600 × 2000 мм. Цена: 220 000 ₸.',
      'eluna:prime': 'Здравствуйте! Хочу заказать матрас ELUNA. Модель: Eluna Prime. Размер: 1600 × 2000 мм. Цена: 280 000 ₸ (без скидки 350 000 ₸, −20 %).',
      'eluna:royal': 'Здравствуйте! Хочу обсудить матрас Eluna Royal под свой размер и проект.',
      'project:living': 'Здравствуйте! Хочу так же: гостиная — диван в светлом букле с мягкими округлыми формами. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
      'project:bedroom': 'Здравствуйте! Хочу так же: спальня — кровать с высоким мягким изголовьем в велюре и обитым основанием. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
      'project:dining': 'Здравствуйте! Хочу так же: столовая — мягкие полукресла в букле и стол. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
      'project:study': 'Здравствуйте! Хочу так же: кабинет — кресло для отдыха на стальной раме и письменный стол. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
      'project:lobby': 'Здравствуйте! Хочу так же: лобби отеля — модульные диваны в букле, кресло и низкий стол. Объект: название / город. Расскажите, пожалуйста, как вы работаете с объектами.',
      'project:restaurant': 'Здравствуйте! Хочу так же: ресторан — диваны-банкетки в букле с кантом и круглые столы. Объект: название / город. Расскажите, пожалуйста, как вы работаете с объектами.',
      'project:apartment': 'Здравствуйте! Хочу так же: апартаменты — угловой модульный диван в букле и низкий стол. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
      'project:media': 'Здравствуйте! Хочу так же: медиакомната — глубокий модульный диван в велюре, оттоманка и низкий стол. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
      fabric: (name) => `Здравствуйте! Хочу подобрать ткань в шоуруме. На сайте понравилась фактура «${name}».`,
      city: (city) => `Здравствуйте! Уточните, пожалуйста, условия доставки в город ${city}.`
    },
    video: 'video/',
    reelChapterMs: 4600
  };

  const root = document.documentElement;
  const body = document.body;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  /* GSAP + ScrollTrigger грузятся лениво — когда сцена ELUNA в полутора экранах (первая загрузка легче на ~115 КБ).
     Место под пин резервируется заранее (margin-bottom сцены = длина пина), поэтому подключение ничего не сдвигает. */
  const loadScript = (src) => new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el); });
  let gsapP = null;
  const loadGsap = () => gsapP || (gsapP = (window.gsap && window.ScrollTrigger ? Promise.resolve() : loadScript('vendor/gsap.min.js').then(() => loadScript('vendor/ScrollTrigger.min.js'))).then(() => {
    gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true });
    ScrollTrigger.addEventListener('refresh', () => reissueGo());
  }));
  const stRefresh = () => { if (window.ScrollTrigger) ScrollTrigger.refresh(); };
  let barRaf = 0, slReady = false;
  let scenePin = null, scenePinned = false;   // пин сцены ELUNA создаётся лениво; goTo() умеет создать его до прыжка
  const hasHistory = !!(window.history && history.pushState);
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* приватный режим */ } }
  };

  /* один конвейер resize: пересчёт только при смене ширины или скачке высоты > 120px (адресная строка — не повод) */
  const mq = window.matchMedia('(max-width: 899px)');
  const mqPhone = window.matchMedia('(max-width: 599px)');
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
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/[\s  ]/g, NB);
  const money = (n) => `${fmt(n)} ₸`;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  /* ---------- Данные ELUNA (сайт ELUNA, js/main.js) ---------- */
  const PRICES = { air: 125000, balance: 220000, prime: 280000, royal: 1250000 };   // ₸ за 1600 × 2000 мм
  const OLD_PRICES = { prime: 350000 };
  const discountPct = (k) => (OLD_PRICES[k] ? Math.round((1 - PRICES[k] / OLD_PRICES[k]) * 100) : 0);
  const MODELS = {
    air: { name: 'Eluna Air', short: 'Air', meta: 'Базовая модель: армированные пружины, натуральный кокос 10 мм, двусторонний — зима / лето.', layers: [
      { kind: 'knit', cm: 0.6, name: 'Вискозный трикотаж' },
      { kind: 'foam', cm: 2, name: 'Ортопена', spec: '20 мм' },
      { kind: 'felt', cm: 0.6, name: 'Термовойлок', note: 'Долговечный, не сбивается и не собирает пыль внутри матраса' },
      { kind: 'springs', cm: 14, name: 'Армированные пружины', note: 'Без эффекта гамака — тело лежит ровно, спина в балансе' },
      { kind: 'felt', cm: 0.6, name: 'Термовойлок' },
      { kind: 'coir', cm: 1, name: 'Натуральный кокос', spec: '10 мм' },
      { kind: 'knit', cm: 0.6, name: 'Вискозный трикотаж' }
    ] },
    balance: { name: 'Eluna Balance', short: 'Balance', meta: 'Для сна каждую ночь: усиленный боковой каркас, два слоя натурального кокоса 10 и 20 мм, армированные пружины.', layers: [
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
    prime: { name: 'Eluna Prime', short: 'Prime', meta: 'Выбор ELUNA. Самый натуральный матрас линейки: чехол из 100 % хлопка, латекс и кокос по 20 мм, армированные пружины.', layers: [
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
    royal: { name: 'Eluna Royal', short: 'Royal', meta: 'Флагман линейки: размер, состав и жёсткость подбираются под ваш проект. Срок изготовления — 21 день.', layers: null }
  };
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
  const waUrl = (text) => `https://wa.me/${CONFIG.wa}?text=${encodeURIComponent(text)}`;
  $$('[data-tel]').forEach((a) => { const t = CONFIG.tel[a.dataset.tel]; if (t) a.href = `tel:${t.href}`; });
  const DYNAMIC_WA = ['fabric', 'eluna-size', 'delivery'];
  $$('[data-wa]').forEach((a) => {
    const key = a.dataset.wa;
    if (!DYNAMIC_WA.includes(key)) a.href = waUrl(typeof CONFIG.msg[key] === 'string' ? CONFIG.msg[key] : CONFIG.msg.general);
    a.target = '_blank';
    a.rel = 'noopener';
    if (!a.hasAttribute('aria-label') && !a.querySelector('.sr-only')) {
      const hint = document.createElement('span');
      hint.className = 'sr-only';
      hint.textContent = ' (откроется в WhatsApp)';
      a.append(hint);
    }
  });

  /* ---------- Шапка: линия при скролле, прячется на телефоне при скролле вниз ---------- */
  const nav = $('#nav');
  const navH = () => (nav.classList.contains('is-hidden') ? 0 : nav.offsetHeight);
  let programmatic = 0;   // во время перехода по якорю шапка не прячется

  /* ---------- Меню (телефон/планшет): фокус заперт, Esc и «Закрыть» ---------- */
  /* Меню кладёт запись в историю (как диалоги): системный «Назад» закрывает меню, а не уводит с сайта (трафик из Instagram).
     ✕ / Esc снимают запись (history.back()); переход по пункту меню ждёт этот popstate и только потом прокручивает. */
  const menu = $('#menu'), menuOpenBtn = $('#menu-open'), menuCloseBtn = $('#menu-close');
  let menuOpen = false, menuPushed = false, menuGo = null, menuGoT = 0;
  const lock = () => root.classList.toggle('is-locked', menuOpen || !!$('dialog[open]'));
  function setMenu(open, restore = true, viaPop = false) {
    if (open === menuOpen) return;
    menuOpen = open;
    menuOpenBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    $$('main, .sticky, .skip-link').forEach((el) => { el.inert = open; });
    lock();
    if (open) menuCloseBtn.focus({ preventScroll: true });
    else if (restore) menuOpenBtn.focus({ preventScroll: true });
    if (open && hasHistory && !menuPushed) {
      try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; history.pushState({ menu: 1 }, ''); menuPushed = true; } catch (_) { menuPushed = false; }
    } else if (!open && menuPushed) {
      menuPushed = false;
      if (!viaPop) { try { history.back(); } catch (_) { /* */ } }
    }
    if (open && !reduceMotion && !scenePinned) loadGsap().catch(() => {});   // скорее всего следом будет переход по разделу
    updateBar();
  }
  const runMenuGo = () => { clearTimeout(menuGoT); const f = menuGo; menuGo = null; if (f) f(); };
  if (hasHistory) window.addEventListener('popstate', () => {
    if (menuOpen) setMenu(false, true, true);
    else menuPushed = false;
    if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    if (menuGo) requestAnimationFrame(runMenuGo);
  });
  menuOpenBtn.addEventListener('click', () => setMenu(true));
  menuCloseBtn.addEventListener('click', () => setMenu(false));
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setMenu(false); return; }
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button', menu); const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  mq.addEventListener('change', (e) => { if (!e.matches && menuOpen) setMenu(false, false); });

  /* ---------- Якоря: место с учётом шапки и липких чипов каталога; цель в диалоге — открыть диалог ---------- */
  const chipsBar = $('[data-chips]');
  const chipsH = (t) => (chipsBar && t.closest('.catwrap') && getComputedStyle(chipsBar).display !== 'none' ? chipsBar.offsetHeight : 0);
  function scrollYFor(target) {
    const r = target.getBoundingClientRect();
    const tf = getComputedStyle(target).transform;
    const shift = tf && tf !== 'none' ? new DOMMatrixReadOnly(tf).m42 : 0;
    if (target.id === 'eluna-stage') return r.top - shift + window.scrollY;
    return r.top - shift + window.scrollY - nav.offsetHeight - chipsH(target) - (isMobile() ? 12 : 24);
  }
  /* Прыжок по якорю мимо сцены ELUNA: пин (pin-spacer + ScrollTrigger.refresh) создаётся лениво и, появившись посреди
     плавной прокрутки, обрывает её — посетитель застревал на карточках моделей. Поэтому: (1) если путь проходит рядом со
     сценой, а пина ещё нет — сначала создаём пин, потом прокручиваем; (2) страховка: ~2,5 с после прыжка каждый refresh
     ScrollTrigger довозит до той же цели. Любое касание/колесо/клавиша посетителя отменяет довоз. */
  let pendingGo = null;
  const needsPin = (y) => {
    const st = document.getElementById('eluna-stage');
    if (!scenePin || scenePinned || !st || reduceMotion) return false;
    const vh = window.innerHeight, top = st.getBoundingClientRect().top + window.scrollY, bottom = top + st.offsetHeight;
    const lo = Math.min(window.scrollY, y), hi = Math.max(window.scrollY, y);
    return hi + vh * 2.6 > top && lo - vh * 1.6 < bottom;
  };
  function reissueGo() {
    const g = pendingGo;
    if (!g || Date.now() - g.t > 2500) return;
    requestAnimationFrame(() => {
      const t = document.getElementById(g.id);
      if (!t || pendingGo !== g) return;
      const y = Math.max(0, scrollYFor(t));
      if (Math.abs(window.scrollY - y) < 3) return;
      programmatic = Date.now();
      window.scrollTo({ top: y, behavior: g.smooth ? 'smooth' : 'auto' });
    });
  }
  ['wheel', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { pendingGo = null; }, { passive: true, capture: true }));
  function goTo(id, smooth = true) {
    const beh = reduceMotion || !smooth ? 'auto' : 'smooth';
    if (id === 'top') { programmatic = Date.now(); pendingGo = null; window.scrollTo({ top: 0, behavior: beh }); return true; }
    const target = document.getElementById(id);
    if (!target) return false;
    if (target.tagName === 'DETAILS') target.open = true;
    if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|DETAILS)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
    programmatic = Date.now();
    nav.classList.remove('is-hidden'); root.classList.remove('nav-hidden');
    const g = pendingGo = { id, t: Date.now(), smooth: beh === 'smooth' };
    const run = () => { if (pendingGo !== g) return; g.t = Date.now(); programmatic = Date.now(); window.scrollTo({ top: Math.max(0, scrollYFor(target)), behavior: beh }); };
    if (needsPin(Math.max(0, scrollYFor(target)))) scenePin().then(() => requestAnimationFrame(run), () => requestAnimationFrame(run));
    else run();
    target.focus({ preventScroll: true });
    return true;
  }
  // GSAP — заранее, как только палец лёг на ссылку-якорь (до click ~100 мс)
  document.addEventListener('pointerdown', (e) => { if (!reduceMotion && !scenePinned && e.target.closest && e.target.closest('a[href^="#"]')) loadGsap().catch(() => {}); }, { passive: true, capture: true });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const id = a.getAttribute('href').slice(1);
    if (!id || id === 'main') return;
    if (a.dataset.pick) setCfgModel(a.dataset.pick);
    const dlg = $('dialog[open]');
    e.preventDefault();
    const go = () => { if (goTo(id)) { try { history.replaceState(history.state, '', id === 'top' ? location.pathname : `#${id}`); } catch (_) { /* file:// */ } } };
    if (menuOpen) {
      const viaHistory = menuPushed;
      setMenu(false, false);
      if (viaHistory) { menuGo = go; clearTimeout(menuGoT); menuGoT = setTimeout(runMenuGo, 450); return; }   // ждём popstate от history.back()
    }
    if (dlg) { Modal.close(dlg, { then: () => goTo(id, false) }); return; }
    go();
  });

  /* пять шагов на телефоне — горизонтальная лента: доступна с клавиатуры как один именованный стоп (на компьютере — обычный список) */
  const howSteps = $('.how__steps');
  if (howSteps) { const setSteps = () => { if (mqPhone.matches) howSteps.tabIndex = 0; else howSteps.removeAttribute('tabindex'); }; setSteps(); mqPhone.addEventListener('change', setSteps); }

  /* ---------- Свёртки [data-fold]: на компьютере раскрыты (summary скрыт в CSS), на телефоне закрыты ---------- */
  const folds = $$('details[data-fold]');
  const setFolds = (m) => folds.forEach((d) => { d.open = !m; });
  setFolds(isMobile());
  mq.addEventListener('change', (e) => setFolds(e.matches));

  /* ---------- Чипы залов (телефон): активный зал — тот, что пересекает линию 40 % экрана ---------- */
  if (chipsBar && hasIO) {
    const chipLinks = $$('a', chipsBar);
    const setChip = (id) => {
      let active = null;
      chipLinks.forEach((a) => { const on = a.getAttribute('href') === `#${id}`; a.classList.toggle('is-active', on); if (on) active = a; });
      if (active && chipsBar.clientWidth) chipsBar.scrollTo({ left: active.offsetLeft - (chipsBar.clientWidth - active.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    const chipIO = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) setChip(e.target.id); }); }, { rootMargin: '-40% 0px -59% 0px' });
    $$('.cat').forEach((s) => chipIO.observe(s));
  }

  /* ---------- Первый экран и появления: контент виден по умолчанию; прячем только то, что ниже экрана ---------- */
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 500))]).then(() => requestAnimationFrame(() => root.classList.add('is-ready')));
  const revealEls = $$('.reveal');
  if (hasIO && !reduceMotion) {
    const vh0 = window.innerHeight;
    revealEls.forEach((el) => { if (el.getBoundingClientRect().top > vh0 * 0.98) el.classList.add('is-pre'); });
    let queue = [], flushing = false;
    const show = (el) => el.classList.remove('is-pre');
    const flush = () => {
      queue.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)
        .forEach((el, i) => { el.style.transitionDelay = `${Math.min(i, 5) * 70}ms`; show(el); setTimeout(() => { el.style.transitionDelay = ''; }, 1200); });
      queue = []; flushing = false;
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { queue.push(en.target); io.unobserve(en.target); } });
      if (queue.length && !flushing) { flushing = true; requestAnimationFrame(flush); }
    }, { rootMargin: '0px 0px 8% 0px', threshold: 0 });
    revealEls.forEach((el) => { if (el.classList.contains('is-pre')) io.observe(el); });
    // страховка от «пустых» блоков при быстром скролле и переходах по якорю
    let sweepRaf = 0;
    const sweep = () => { sweepRaf = 0; const lim = window.innerHeight; $$('.reveal.is-pre').forEach((el) => { if (el.getBoundingClientRect().top < lim) { io.unobserve(el); el.style.transitionDelay = ''; show(el); } }); };
    window.addEventListener('scroll', () => { if (!sweepRaf) sweepRaf = requestAnimationFrame(sweep); }, { passive: true });
    // фокус с клавиатуры не ждёт появления: блок с фокусом сразу виден целиком (и тот, что ещё проявляется)
    document.addEventListener('focusin', (e) => {
      let el = e.target.closest && e.target.closest('.reveal');
      while (el) {
        if (el.classList.contains('is-pre') || el.style.transitionDelay || getComputedStyle(el).opacity !== '1') {
          io.unobserve(el); el.style.transition = 'none'; el.style.transitionDelay = ''; show(el);
          const r = el; requestAnimationFrame(() => requestAnimationFrame(() => { r.style.transition = ''; }));
        }
        el = el.parentElement && el.parentElement.closest('.reveal');
      }
    }, true);
  }
  (function countUp() {
    const els = $$('[data-count]');
    if (!els.length || reduceMotion || !hasIO) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const el = en.target, to = +el.dataset.count, t0 = performance.now(), D = 1800;
        const step = (now) => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  })();


  /* ---------- ELUNA: слабое звёздное поле — один раз в плитку фона секции (без холста на всю высоту) ---------- */
  const eluna = $('#eluna');
  if (eluna) {
    const paintStars = () => {
      const w = Math.min(1600, window.innerWidth), h = 1100, dpr = Math.min(window.devicePixelRatio || 1, 2);
      const c = document.createElement('canvas'); c.width = w * dpr; c.height = h * dpr;
      const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
      const n = Math.floor((w * h) / (isMobile() ? 14000 : 9000));
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      for (let i = 0; i < n; i++) {
        const x = rnd() * w, y = rnd() * h, r = 0.3 + rnd() * 1.1, a = 0.18 + rnd() * 0.42;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = `rgba(247,245,240,${a.toFixed(2)})`; ctx.fill();
      }
      c.toBlob((b) => { if (!b) return; const u = URL.createObjectURL(b); eluna.style.backgroundImage = `url(${u})`; eluna.style.backgroundSize = `${w}px ${h}px`; });
    };
    if (hasIO) new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { o.disconnect(); paintStars(); } }, { rootMargin: '100% 0px' }).observe(eluna);
    else paintStars();
  }

  /* ---------- Сцена ELUNA: кадры разлёта по скроллу (механика n4) ----------
     Состояние S пишет один render(); стили — только при изменении значения. */
  const S = { cutO: 1, cutS: 1, cutX: 0, cutY: 0, spread: 0, outY: 0, outS: 1, outExp: 1, shade: 0 };
  const stageEl = $('#eluna-stage');
  const productCut = $('#productCut'), seqCanvas = $('#seq'), seqPoster = stageEl ? $('.seq-poster', stageEl) : null;
  const shadeEl = $('#shade'), seqLabels = $('#seqLabels'), copyLayers = $('#copyLayers'), copyOutro = $('#copyOutro');
  const layerActiveEl = $('#layerActive'), stageProgress = $('#stageProgress'), stagePct = $('#stagePct');
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
    // статичная сцена (reduced motion / без GSAP) показывает один, последний кадр — грузим только его
    const seqStatic = reduceMotion;
    const SEQ_KEYS = seqStatic ? [SEQ.count - 1] : [0, SEQ.count - 1, Math.floor(SEQ.count / 2)];
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
    // статичная сцена: постер сразу указывает на последний кадр своего уровня и сам становится этим кадром —
    // f01 не качаем, f24 не дублируем; пока постер не пришёл, ничего лишнего не грузится (он lazy)
    function seedPoster() {
      const i = seqStatic ? SEQ.count - 1 : 0;
      if (frames[i] || !seqPoster || !seqPoster.naturalWidth) return;
      frames[i] = seqPoster; seqLoaded++; seqDirty = true; drawSeq();
    }
    if (seqStatic && seqPoster) {
      seqQueued[SEQ.count - 1] = true;
      seqPoster.addEventListener('error', () => { seqQueued[SEQ.count - 1] = false; loadSeq([SEQ.count - 1]); }, { once: true });
      seqPoster.src = frameSrc(SEQ.count - 1);
    }
    function nearestFrame(i) {
      for (let d = 0; d < SEQ.count; d++) { if (frames[i - d]) return frames[i - d]; if (frames[i + d]) return frames[i + d]; }
      return null;
    }
    const dprSeq = () => Math.min(1.5, window.devicePixelRatio || 1);
    // компьютер: сдвиг продукта (vw) и масштаб в раскрытом виде и после ухода; левая грань матраса в кадре — 15.2 % ширины кадра
    const DESK0 = { cutX: 8, cutS: 0.94 }, DESK = { cutX: 8, cutS: 0.94, outX: 16, outS: 0.8 }, INK_L = 0.152;
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
      if (seqPoster) { seqPoster.style.transform = 'none'; seqPoster.style.left = seqCanvas.style.left; seqPoster.style.top = seqCanvas.style.top; seqPoster.style.width = seqCanvas.style.width; seqPoster.style.height = seqCanvas.style.height; }
      placeSeqLabels(g.dx / d, g.dy / d, g.dw / d, g.dh / d);
      fitDesk();
      const vw = window.innerWidth, w = g.dw / d, gutter = clamp(vw * 0.05, 20, 72);
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
      // чёрный фон кадра → цвет главы (#08090d), виньетка краёв — в сам холст
      seqCtx.globalCompositeOperation = 'lighten'; seqCtx.fillStyle = '#08090d'; seqCtx.fillRect(0, 0, cw, ch);
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
      el.innerHTML = `<i class="seq-label__dot seq-label__dot--a"></i><i class="seq-label__dot seq-label__dot--b"></i><span class="seq-label__text"><span class="num">${l.num}</span><span class="name">${l.name}</span><span class="spec">${l.mm} мм</span></span>`;
      seqLabels.appendChild(el);
      return el;
    });
    let seqGeo = { dx: 0, dy: 0, dw: 1, dh: 1 };
    const labelW = [], labelWS = [], labelLast = [];
    let callouts = 'full';   // 'full' | 'short' (без «мм») | 'off' — решает fitDesk()
    // ширина подписи полностью и без «мм» (имя кончается — дальше только миллиметры)
    function measureLabels() {
      seqLabels.classList.remove('is-short', 'is-off');
      seqLabelEls.forEach((el, i) => {
        const t = el.querySelector('.seq-label__text'), n = t.querySelector('.name');
        labelW[i] = t.offsetWidth || 300; labelWS[i] = n.offsetWidth ? n.offsetLeft + n.offsetWidth : 250;
      });
      seqLabels.classList.toggle('is-short', callouts === 'short'); seqLabels.classList.toggle('is-off', callouts === 'off');
      labelLast.length = 0;
    }
    function placeSeqLabels(x, y, w, h) { seqGeo = { dx: x, dy: y, dw: w, dh: h }; measureLabels(); }
    /* компьютер: место под выноски резервируется заранее — продукт сдвигается влево (а при нужде чуть уменьшается),
       чтобы правая подпись + поле ≤ ширины экрана, а слева оставалось ≥ 240 px под «Семь слоёв». Не помещается и без «мм» —
       выноски скрываем, слой называет строка #layerActive. Текст никогда не съезжает на свои и чужие линии. */
    function fitDesk() {
      const prev = `${DESK.cutX}|${DESK.cutS}|${callouts}`;
      if (isMobile()) { DESK.cutX = DESK0.cutX; DESK.cutS = DESK0.cutS; callouts = 'off'; }
      else {
        const vw = window.innerWidth, cx = vw / 2, gutter = clamp(vw * 0.05, 20, 72), rm = clamp(gutter * 0.5, 20, 40), lead = 32 + 10;
        const right = (sc, short) => Math.max(...SEQ_LABEL_X.map((x, i) => cx + (seqGeo.dx + x / 100 * seqGeo.dw - cx) * sc + lead + (short ? labelWS[i] : labelW[i])));
        const inkLeft = (sc, px) => cx + (seqGeo.dx + INK_L * seqGeo.dw - cx) * sc + px;
        const def = DESK0.cutX * vw / 100;
        let fit = null;
        for (let k = 0; k <= 8 && !fit; k++) {
          const sc = DESK0.cutS - k * 0.01;
          for (const short of [false, true]) {
            const px = Math.min(def, vw - rm - right(sc, short));
            if (inkLeft(sc, px) - gutter - 24 >= 240) { fit = { sc, px, short }; break; }
          }
        }
        if (fit) { DESK.cutS = +fit.sc.toFixed(3); DESK.cutX = +(fit.px / vw * 100).toFixed(3); callouts = fit.short ? 'short' : 'full'; }
        else { DESK.cutX = DESK0.cutX; DESK.cutS = DESK0.cutS; callouts = 'off'; }
      }
      seqLabels.classList.toggle('is-short', callouts === 'short'); seqLabels.classList.toggle('is-off', callouts === 'off');
      if (stageEl.classList.contains('is-static')) { S.cutX = isMobile() ? 0 : DESK.cutX; S.cutS = isMobile() ? 0.97 : DESK.cutS; }
      return prev !== `${DESK.cutX}|${DESK.cutS}|${callouts}`;
    }
    function labelAnchor(i, vw, vh) {
      const ax = seqGeo.dx + SEQ_LABEL_X[i] / 100 * seqGeo.dw, ay = seqGeo.dy + SEQ_LABEL_Y[i] / 100 * seqGeo.dh;
      const cx = vw / 2, cy = vh / 2, sc = S.cutS * S.outS;
      return { x: cx + (ax - cx) * sc + S.cutX * vw / 100, y: cy + (ay - cy) * sc + (S.cutY + S.outY) * vh / 100 };
    }
    function placeLabels(vw, vh) {
      for (let i = 0; i < seqLabelEls.length; i++) {
        const a = labelAnchor(i, vw, vh), el = seqLabelEls[i];
        const key = `${a.x.toFixed(1)}|${a.y.toFixed(1)}`;
        if (labelLast[i] === key) continue;
        labelLast[i] = key;
        svar(el, '--ax', `${a.x.toFixed(1)}px`); svar(el, '--ay', `${a.y.toFixed(1)}px`);
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
        layerActiveEl.querySelector('.spec').textContent = `${l.mm} мм`;
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
      const sp = clamp(S.spread, 0, 1);
      setActiveLayer(sp < 0.04 ? -1 : Math.min(6, Math.floor(sp * 7)));
      // выноски появляются в конце раскрытия и гаснут раньше, чем начинается манифест
      svo(seqLabels, (smoothstep(sp, 0.78, 1) * smoothstep(S.outExp, 0.8, 1)).toFixed(3));
      const li = sp < 0.8 ? -1 : Math.min(6, Math.floor((sp - 0.8) / 0.2 * 7));
      if (li !== labelsIn) { labelsIn = li; seqLabelEls.forEach((el, k) => el.classList.toggle('is-in', k <= li)); }
      if (callouts !== 'off') placeLabels(vw, vh);
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
      sv(stageProgress, 'opacity', ph !== 'layers' ? '0' : '1');
    }
    setPhase(0);

    const goStatic = () => {
      // reduced motion или GSAP не загрузился: статичный разложенный матрас (последний кадр), выноски на месте, без пина
      stageEl.style.height = ''; scenePinned = true;   // сцена «устоялась»: goTo() больше не ждёт пина
      S.spread = 1; S.cutS = isMobile() ? 0.97 : DESK.cutS; S.cutX = isMobile() ? 0 : DESK.cutX; S.outExp = 1; S.outS = 1; S.outY = 0; S.shade = 0;
      stageEl.classList.add('is-static');
      if (eluna) eluna.classList.add('is-static-scene');
      setPhase(0); render();
      stagePct.textContent = '';
      // reduced motion: кадр f24 придёт лениво (постер / наблюдатель «за ¾ экрана»); сюда попадаем сразу — только если GSAP не загрузился у самой сцены
      if (!reduceMotion && !frames[SEQ.count - 1]) loadSeq([SEQ.count - 1]);
    };
    if (reduceMotion) goStatic();
    else {
      let pinned = false;
      // до подключения GSAP сцена сама держит длину будущего пина (высота = экран + пин), экран сцены — вверху
      const reserve = () => { if (!pinned) stageEl.style.height = `calc(100svh + ${Math.round(window.innerHeight * (isMobile() ? 1.2 : 1.7))}px)`; };
      reserve();
      resizeHooks.push(reserve);
      const pin = () => loadGsap().then(() => {
        if (pinned) return;
        pinned = true; scenePinned = true;
        stageEl.style.height = '';
        const mmx = gsap.matchMedia();
        mmx.add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)' }, (ctx) => {
          const D = ctx.conditions.desk;
          // закрытый матрас стоит, как задумано (8vw); раскрываясь, отъезжает на решённое fitDesk() место — освобождает поле выноскам
          const cutXa = () => (D ? DESK0.cutX : 0), cutX0 = () => (D ? DESK.cutX : 0);
          S.cutX = cutXa();
          const tl = gsap.timeline({
            defaults: { ease: 'none' }, onUpdate: render,
            scrollTrigger: { trigger: stageEl, start: 'top top', end: D ? '+=170%' : '+=120%', pin: true, scrub: D ? 0.6 : 0.4, anticipatePin: 1, invalidateOnRefresh: true, onUpdate: (self) => setPhase(self.progress) }
          });
          /* 0–56 раскрытие (выноски заходят в конце), 56–64 пауза с подписями, 64–78 продукт уходит и гаснет до .4 (выноски
             гаснут первыми), 76–95 манифест, 84–96 дожим: компьютер → .1, телефон → .3 — матрас остаётся призраком, пока снизу
             заходит «концепция» (её margin-top отрицательный), чёрной паузы нет */
          tl.fromTo(S, { spread: 0, cutS: 1, cutX: cutXa }, { spread: 1, cutS: () => (D ? DESK.cutS : 0.97), cutX: cutX0, duration: 56, ease: 'power1.inOut', immediateRender: false }, 0)
            .to(S, { outExp: 0.4, outS: D ? DESK.outS : 0.72, outY: D ? -4 : -18, cutX: () => (D ? DESK.outX : 0), shade: D ? 0.85 : 0.55, duration: 14, ease: 'power2.inOut' }, 64)
            .to(S, { outExp: D ? 0.1 : 0.3, outY: D ? -12 : -24, duration: 12, ease: 'power1.in' }, 84)
            .to(S, { shade: 0, duration: 8 }, 90);
          return () => { S.spread = 0; S.cutS = 1; S.outExp = 1; S.outS = 1; S.outY = 0; S.shade = 0; S.cutX = 0; render(); setPhase(0); };
        });
        fontsReady.then(stRefresh);
        if (document.readyState !== 'complete') window.addEventListener('load', stRefresh, { once: true });
      }).catch(goStatic);
      if (hasIO) new IntersectionObserver((es, o) => { if (es.some((e) => e.isIntersecting)) { o.disconnect(); pin(); } }, { rootMargin: '150% 0px' }).observe(stageEl);
      else pin();
      window.__ricca_pin = pin;
      scenePin = pin;
    }

    // кадры — лениво: после загрузки страницы и паузы браузера; опорные (f01/f24/f12) — за ¾ экрана до сцены, остальные — за полэкрана
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
    fontsReady.then(() => { const before = `${DESK.cutX}|${DESK.cutS}`; sizeSeq(); if (before !== `${DESK.cutX}|${DESK.cutS}` && window.ScrollTrigger && !stageEl.classList.contains('is-static')) stRefresh(); render(); });
  }
  if (eluna && document.fonts && hasIO) {
    new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { document.fonts.load('500 1em Unbounded'); document.fonts.load('300 1em Unbounded'); o.disconnect(); } }, { rootMargin: '75% 0px' }).observe(eluna);
  }

  /* ---------- Диалоги: фиксированный ✕, «Закрыть», Esc, подложка и системный «Назад» ----------
     При открытии кладём запись в историю; popstate закрывает диалог; закрытие кнопкой снимает запись (history.back()). */
  const Modal = (() => {
    let pushed = null;
    function open(dlg, opener) {
      if (dlg.open) return;
      const prev = $('dialog[open]');
      if (prev) { prev._transfer = true; prev._noFocus = true; prev.close(); }
      dlg._opener = opener || document.activeElement;
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      lock();
      if (hasHistory && !pushed) {
        try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; history.pushState({ mdl: dlg.id }, ''); pushed = dlg; } catch (_) { pushed = null; }
      } else if (pushed) pushed = dlg;
      requestAnimationFrame(() => dlg.classList.add('is-in'));
      const f = $('[data-close]', dlg) || dlg; f.focus({ preventScroll: true });
      updateBar();
    }
    function close(dlg, opts = {}) {
      if (!dlg || !dlg.open) { if (opts.then) opts.then(); return; }
      dlg._then = opts.then || null;
      dlg.classList.remove('is-in');
      const done = () => { if (dlg.open) dlg.close(); };
      if (reduceMotion || !dlg.classList.contains('shortlist')) done(); else setTimeout(done, 260);
    }
    if (hasHistory) window.addEventListener('popstate', () => {
      const d = pushed; pushed = null;
      if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
      if (d && d.open) { d._viaPop = true; close(d); }
    });
    $$('dialog').forEach((dlg) => {
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(dlg); });
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg || e.target.classList.contains('lightbox__in')) close(dlg);
        if (e.target.closest('[data-close]')) close(dlg);
      });
      dlg.addEventListener('close', () => {
        const viaPop = dlg._viaPop, transfer = dlg._transfer, noFocus = dlg._noFocus;
        dlg._viaPop = dlg._transfer = dlg._noFocus = false;
        dlg.classList.remove('is-in');
        if (pushed === dlg && !transfer) { pushed = null; if (!viaPop) { try { history.back(); } catch (_) { /* */ } } }
        lock();
        const then = dlg._then; dlg._then = null;
        if (then) setTimeout(then, viaPop ? 0 : 30);
        else if (!noFocus && dlg._opener && dlg._opener.focus && document.contains(dlg._opener)) dlg._opener.focus({ preventScroll: true });
        updateBar();
      });
    });
    return { open, close };
  })();
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => { const d = document.getElementById(b.dataset.open); if (d) Modal.open(d, b); }));
  // составы моделей (MODELS) — в диалогах
  $$('.xs[data-xs]').forEach((box) => {
    const m = MODELS[box.dataset.xs];
    if (!m || !m.layers) return;
    box.innerHTML = m.layers.map((l) => `<div class="xs__layer xs--${l.kind}"><div class="xs__fill" style="--cm:${l.cm}"></div><div class="xs__text"><b>${esc(l.name)}</b>${l.spec ? `<span class="cm">${esc(l.spec)}</span>` : ''}${l.note ? `<span class="note-s">${esc(l.note)}</span>` : ''}</div></div>`).join('');
  });

  /* ---------- Белый лист: «Все 7 слоёв» на телефоне ---------- */
  const strip = $('.strip'), stripBtn = $('[data-strip-toggle]');
  if (strip && stripBtn) stripBtn.addEventListener('click', () => {
    const on = !strip.classList.contains('is-open');
    strip.classList.toggle('is-open', on); stripBtn.setAttribute('aria-expanded', String(on));
    stripBtn.firstChild.textContent = on ? 'Свернуть ' : 'Все 7 слоёв ';
  });
  /* «Общее для всех моделей» на телефоне: четыре пункта, остальные — по «Ещё 5» */
  const perksList = $('#perksList'), perksBtn = $('[data-perks-toggle]');
  if (perksList && perksBtn) perksBtn.addEventListener('click', () => {
    const on = !perksList.classList.contains('is-open');
    perksList.classList.toggle('is-open', on); perksBtn.setAttribute('aria-expanded', String(on));
    perksBtn.firstChild.textContent = on ? 'Свернуть ' : 'Ещё 5 ';
    stRefresh();
  });

  /* ---------- Линейка: на телефоне лента Air · Balance · Prime (старт на Prime), Royal — панелью ниже ---------- */
  (function lineup() {
    const lane = $('#mcards'), dots = $('#mdots');
    if (!lane) return;
    const royal = $('.mcard--royal', lane.parentElement);
    const placeRoyal = () => {
      const phone = mqPhone.matches;
      if (phone && royal.parentElement === lane) dots.after(royal);
      else if (!phone && royal.parentElement !== lane) lane.append(royal);
    };
    placeRoyal();
    mqPhone.addEventListener('change', () => { placeRoyal(); center(true); });
    const cards = () => $$('.mcard', lane);
    const dotBtns = $$('button', dots);
    const center = (instant) => {
      if (!mqPhone.matches) return;
      const p = $('.mcard--prime', lane);
      lane.scrollTo({ left: p.offsetLeft - (lane.clientWidth - p.offsetWidth) / 2, behavior: instant || reduceMotion ? 'instant' : 'smooth' });
    };
    const mark = () => {
      const mid = lane.scrollLeft + lane.clientWidth / 2;
      let best = 0, bd = 1e9;
      cards().forEach((c, k) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } });
      dotBtns.forEach((d, k) => { if (k === best) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
    };
    dotBtns.forEach((d, i) => d.addEventListener('click', () => { const c = cards()[i]; if (c) lane.scrollTo({ left: c.offsetLeft - (lane.clientWidth - c.offsetWidth) / 2, behavior: reduceMotion ? 'instant' : 'smooth' }); }));
    let raf = 0;
    lane.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; mark(); }); }, { passive: true });
    if (hasIO) new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { center(true); mark(); o.disconnect(); } }, { rootMargin: '50% 0px' }).observe(lane);
    resizeHooks.push(() => center(true));
  })();

  /* ---------- Сравнение: на телефоне колонка Prime — первой; «Все параметры» ---------- */
  (function compare() {
    const table = $('#cmpTable'), wrap = $('.cmp'), btn = $('[data-cmp-toggle]');
    if (!table) return;
    const rows = $$('tr', table);
    let primeFirst = false;
    const order = () => {
      const want = isMobile();
      if (want === primeFirst) return;
      rows.forEach((tr) => { const c = tr.children; if (c.length < 5) return; if (want) tr.insertBefore(c[3], c[1]); else tr.insertBefore(c[1], c[4]); });
      primeFirst = want;
    };
    order();
    mq.addEventListener('change', order);
    if (btn) btn.addEventListener('click', () => {
      const on = !wrap.classList.contains('is-open');
      wrap.classList.toggle('is-open', on); btn.setAttribute('aria-expanded', String(on));
      btn.firstChild.textContent = on ? 'Свернуть ' : 'Все параметры ';
      stRefresh();
    });
  })();

  /* ---------- Размер и цена: модель × размер → цена, старая цена → WhatsApp ----------
     Правило сайта ELUNA: база 1600 × 2000 (3,2 м²), ±40 000 ₸ за м² (Royal тоже), округление до 1 000 ₸. */
  let deliveryCity = '';
  let setCfgModel = () => {};
  const cfgState = Object.assign({ model: 'prime', size: '1600x2000', w: 1700, h: 2000 }, store.get('ricca-eluna-v1', {}));
  if (!PRICES[cfgState.model]) cfgState.model = 'prime';
  const PER_M2 = 40000;
  const cfgDims = () => (cfgState.size === 'custom' ? [cfgState.w, cfgState.h] : cfgState.size.split('x').map(Number));
  function priceOf() {
    const [w, h] = cfgDims();
    const base = PRICES[cfgState.model], old = OLD_PRICES[cfgState.model];
    const v = Math.round((base + ((w * h) / 1e6 - 3.2) * PER_M2) / 1000) * 1000;
    return { v, o: old ? Math.round(v * old / base / 1000) * 1000 : null };
  }
  const sizeText = () => { const [w, h] = cfgDims(); return `${w} × ${h} мм`; };
  function cfgMessage() {
    const p = priceOf(), m = MODELS[cfgState.model];
    const custom = cfgState.size === 'custom' ? ' (свой размер, изготовление 21 день)' : '';
    const dl = deliveryCity ? (deliveryCity === 'Алматы' ? 'Алматы — привезём и установим сами' : `${deliveryCity} — от 7 дней до двери`) : 'город не выбран';
    if (cfgState.model === 'royal') return `Здравствуйте! Хочу обсудить матрас Eluna Royal под проект.\nРазмер: ${sizeText()}${custom}\nОриентир по цене: ${fmt(p.v).replace(/ /g, ' ')} ₸\nДоставка: ${dl}`;
    return `Здравствуйте! Хочу заказать матрас ELUNA.\nМодель: ${m.name}\nРазмер: ${sizeText()}${custom}\nЦена: ${fmt(p.v).replace(/ /g, ' ')} ₸${p.o ? ` (без скидки ${fmt(p.o).replace(/ /g, ' ')} ₸, −${discountPct(cfgState.model)} %)` : ''}\nДоставка: ${dl}`;
  }
  let cfgHref = waUrl(CONFIG.msg.eluna);
  const cfgItem = () => { const p = priceOf(); return { id: 'eluna-cfg', title: MODELS[cfgState.model].name, meta: `${sizeText()} · ${cfgState.model === 'royal' ? 'от ' : ''}${fmt(p.v).replace(/ /g, ' ')} ₸` }; };
  (function configurator() {
    const models = $('#cfgModels'), sizes = $('#cfgSizes'), custom = $('#cfgCustom'), wIn = $('#cfgW'), hIn = $('#cfgH');
    if (!models || !sizes) return;
    const sumName = $('#sumName'), sumDim = $('#sumDim'), sumPrice = $('#sumPrice'), sumMeta = $('#sumMeta'), sumWaText = $('#sumWaText');
    const rect = $('#cfgRect'), dimW = $('#cfgDimW'), dimH = $('#cfgDimH'), tW = $('#cfgTextW'), tH = $('#cfgTextH');
    wIn.value = cfgState.w; hIn.value = cfgState.h;
    function renderCfg() {
      $$('button', models).forEach((b) => { const on = b.dataset.m === cfgState.model; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
      $$('button', sizes).forEach((b) => { const on = b.dataset.s === cfgState.size; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
      custom.hidden = cfgState.size !== 'custom';
      const p = priceOf(), m = MODELS[cfgState.model], [w, h] = cfgDims();
      sumName.textContent = m.name;
      sumDim.textContent = sizeText().replace(/ /g, ' ');
      sumPrice.innerHTML = p.o
        ? `<s class="price-old"><span class="sr-only">Старая цена: </span>${money(p.o)}</s><span class="price price--gold">${money(p.v)}</span><span class="badge badge--save">−${discountPct(cfgState.model)} %</span>`
        : `${cfgState.model === 'royal' ? '<small class="price-from">от</small>' : ''}<span class="price">${money(p.v)}</span>`;
      sumMeta.innerHTML = m.meta.replace(/ELUNA/g, '<span class="e-font e-inline">ELUNA</span>') + (cfgState.size === 'custom' ? ' Свой размер&nbsp;— изготовление 21&nbsp;день.' : '');   // строки — константы MODELS, не ввод
      sumWaText.textContent = `${cfgState.model === 'royal' ? 'Обсудить' : 'Заказать'} ${m.short} · ${w} × ${h}`;
      // контур: 2000 мм = 200 px; ширина в пропорции
      const rh = h / 10, rw = w / 10, x = 130 - rw / 2, y = 20 + (220 - rh) / 2;
      rect.setAttribute('x', x.toFixed(1)); rect.setAttribute('width', rw.toFixed(1)); rect.setAttribute('y', y.toFixed(1)); rect.setAttribute('height', rh.toFixed(1));
      dimW.setAttribute('x1', x.toFixed(1)); dimW.setAttribute('x2', (x + rw).toFixed(1));
      dimH.setAttribute('y1', y.toFixed(1)); dimH.setAttribute('y2', (y + rh).toFixed(1));
      dimH.setAttribute('x1', (x + rw + 18).toFixed(1)); dimH.setAttribute('x2', (x + rw + 18).toFixed(1));
      tW.textContent = `${w} мм`; tH.textContent = `${h} мм`;
      tH.setAttribute('x', (x + rw + 32).toFixed(1)); tH.setAttribute('transform', `rotate(90 ${(x + rw + 32).toFixed(1)} 120)`);
      cfgHref = waUrl(cfgMessage());
      $$('[data-wa="eluna-size"]').forEach((a) => { a.href = cfgHref; });
      store.set('ricca-eluna-v1', cfgState);
      if (slReady) syncShortlist();
      updateBar();
    }
    setCfgModel = (k) => { if (PRICES[k]) { cfgState.model = k; renderCfg(); } };
    models.addEventListener('click', (e) => { const b = e.target.closest('button[data-m]'); if (!b) return; cfgState.model = b.dataset.m; renderCfg(); });
    sizes.addEventListener('click', (e) => { const b = e.target.closest('button[data-s]'); if (!b) return; cfgState.size = b.dataset.s; renderCfg(); if (cfgState.size === 'custom') wIn.focus({ preventScroll: true }); });
    const onNum = () => { cfgState.w = clamp(Math.round((+wIn.value || 1600) / 10) * 10, 1400, 2200); cfgState.h = clamp(Math.round((+hIn.value || 2000) / 10) * 10, 1900, 2200); renderCfg(); };
    [wIn, hIn].forEach((inp) => { inp.addEventListener('input', onNum); inp.addEventListener('change', () => { onNum(); wIn.value = cfgState.w; hIn.value = cfgState.h; }); });
    [models, sizes].forEach((grp) => grp.addEventListener('keydown', (e) => {
      const btns = $$('button', grp), i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      let n = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % btns.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + btns.length) % btns.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = btns.length - 1;
      if (n >= 0) { e.preventDefault(); btns[n].click(); btns[n].focus(); }
    }));
    window.__cfgRender = renderCfg;
    renderCfg();
  })();

  /* ---------- Производство: фильм по главам. Одновременно декодируется ОДИН ролик (механика n4) ---------- */
  const safePlay = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const canWebm = (() => { const v = document.createElement('video'); return !!v.canPlayType && v.canPlayType('video/webm; codecs="vp9"') !== ''; })();
  const clipSrc = (name) => `${CONFIG.video}${name}.${canWebm ? 'webm' : 'mp4'}`;
  const posterOf = (n) => `img/mono/${n}-mono.webp`;
  const reel = $('[data-reel]');
  if (reel) {
    const grid = reel.parentElement;
    const chs = $$('.ch'), vids = $$('.reel__v', reel);
    const countEl = $('[data-reel-count]', reel), railEl = $('[data-reel-rail]', reel), desc = $('[data-reel-desc]', reel), live = $('[data-reel-live]', reel), toggle = $('[data-reel-toggle]', reel);
    const STEPS = chs.length;
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
    const setAuto = (on) => { auto = on && !reduceMotion; reel.classList.toggle('is-auto', auto); if (toggle) toggle.textContent = auto ? 'Пауза' : 'Смотреть'; };
    const centerChip = (ch) => { const lane = ch.closest('.chapters'); if (lane && isMobile() && lane.scrollWidth > lane.clientWidth) lane.scrollTo({ left: ch.parentElement.offsetLeft - (lane.clientWidth - ch.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' }); };
    const setUI = (idx) => {
      const ch = chs[idx];
      chs.forEach((c, i) => { c.classList.toggle('is-active', i === idx); c.setAttribute('aria-pressed', String(i === idx)); });
      const bar = $('.ch__bar', ch);
      if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
      if (countEl) countEl.innerHTML = `Глава <b>${String(idx + 1).padStart(2, '0')}</b> / ${String(STEPS).padStart(2, '0')}`;
      if (railEl) railEl.style.transform = `scaleX(${Math.min(1, (idx + 1) / STEPS).toFixed(4)})`;
      descs.forEach((d, i) => { d.classList.toggle('is-on', i === idx); if (i === idx) d.removeAttribute('aria-hidden'); else d.setAttribute('aria-hidden', 'true'); });
      vids.forEach((v) => v.setAttribute('aria-label', `Кадры из ателье RICCA: ${$('.ch__t', ch).textContent}`));
      if (inView) centerChip(ch);
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!auto || !inView) return;
      const d = chs[active].classList.contains('ch--final') ? CONFIG.reelChapterMs + 1800 : CONFIG.reelChapterMs;
      grid.style.setProperty('--dur', `${d}ms`);
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
        back.loop = clips.length === 1;
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
    if (hasIO) {
      const prime = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { vids[0].poster = vids[0].dataset.poster; prime.disconnect(); } }, { rootMargin: '100% 0px' });
      prime.observe(reel);
      new IntersectionObserver((es) => {
        es.forEach((e) => {
          inView = e.isIntersecting;
          if (inView) { if (!started) select(active, false); else if (auto && !reduceMotion && vids[front].src) safePlay(vids[front]); schedule(); }
          else { clearTimeout(timer); vids.forEach((v) => v.pause()); }
        });
      }, { threshold: 0.35 }).observe(reel);
    } else vids[0].poster = vids[0].dataset.poster;
    document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(timer); vids.forEach((v) => v.pause()); } else if (inView && auto && vids[front].src) { safePlay(vids[front]); schedule(); } });
  }

  /* ---------- Материалы: образцы (radiogroup, roving tabindex) → большой образец, WhatsApp, «В подборку» ---------- */
  const swWrap = $('[data-swatches]');
  let fabricHref = waUrl(CONFIG.msg.fabric('букле'));
  if (swWrap) {
    const btns = $$('.swatch', swWrap);
    const nameEl = $('[data-sample-name]'), toneEl = $('[data-sample-tone]'), descEl = $('[data-sample-desc]'), tex = $('[data-sample-tex]');
    const cta = $('[data-fabric-cta]'), ctaLabel = $('[data-fabric-cta-label]'), heart = $('[data-fabric-heart]');
    const pick = (i, focus) => {
      btns.forEach((b, j) => { b.setAttribute('aria-checked', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
      const b = btns[i];
      nameEl.textContent = b.dataset.name; toneEl.textContent = b.dataset.tone; descEl.textContent = b.dataset.desc;
      tex.style.backgroundImage = `url(img/mono/tex-${b.dataset.tex}.webp)`;
      fabricHref = waUrl(CONFIG.msg.fabric(b.dataset.name.toLowerCase()));
      if (cta) cta.href = fabricHref;
      if (ctaLabel) ctaLabel.textContent = `Спросить про ${b.dataset.acc}`;
      if (heart) {
        heart.dataset.slId = `fabric-${b.dataset.tex}`; heart.dataset.slTitle = `Ткань · ${b.dataset.name}`;
        heart.setAttribute('aria-label', `В подборку: ткань ${b.dataset.name.toLowerCase()}`);
        if (slReady) syncShortlist();
      }
      if (focus) b.focus();
    };
    // 7 фактур (~35 КБ) не спорят с первым экраном: класс .tex-on (CSS подставляет фоны) — когда «Материалы» в экране от нас
    const texHost = swWrap.closest('section') || document.body;
    const texOn = () => texHost.classList.add('tex-on');
    if (hasIO) { const tio = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { texOn(); tio.disconnect(); } }, { rootMargin: '0px 0px 100% 0px' }); tio.observe(texHost); }
    else texOn();
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
    if (cta) cta.href = fabricHref;
  }

  /* ---------- Доставка: карта и города (координаты — % кадра 2080 × 1174, как на сайте ELUNA) ---------- */
  (function delivery() {
    const box = $('#cities'), nameEl = $('#cityName'), elunaEl = $('#cityEluna'), waEl = $('#cityWa'), waName = $('#cityWaName'), chipsBox = $('#cityChips');
    if (!box) return;
    const CITIES = [['Алматы', 73.21, 78.03], ['Астана', 61.0, 31.37], ['Шымкент', 56.87, 83.31], ['Караганда', 64.63, 39.39], ['Актобе', 29.26, 36.58], ['Тараз', 60.82, 80.02], ['Павлодар', 73.26, 24.79], ['Усть-Каменогорск', 85.84, 38.55], ['Семей', 80.5, 35.83], ['Атырау', 17.61, 55.34], ['Костанай', 43.63, 19.33], ['Кызылорда', 47.8, 68.53], ['Уральск', 16.38, 31.16], ['Петропавловск', 55.86, 9.61], ['Актау', 16.0, 75.6], ['Талдыкорган', 76.38, 67.57], ['Кокшетау', 56.44, 18.93], ['Туркестан', 53.89, 77.69]];
    const dots = CITIES.map(([c, x, y]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'city' + (x > 70 ? ' city--home' : '');
      b.style.setProperty('--x', `${x}%`); b.style.setProperty('--y', `${y}%`);
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
      b.setAttribute('aria-label', c);
      b.innerHTML = `<i aria-hidden="true"></i><span aria-hidden="true">${c}</span>`;
      b.addEventListener('click', () => pick(c, true));
      box.appendChild(b);
      return b;
    });
    // карта на десктопе — одна группа радиокнопок (одна остановка Tab, стрелки/Home/End), как чипы на телефоне
    box.setAttribute('role', 'radiogroup'); box.setAttribute('aria-label', 'Город доставки на карте');
    const dotsMode = () => { const m = isMobile(); box.setAttribute('aria-hidden', String(m)); dots.forEach((b) => { b.tabIndex = !m && b.getAttribute('aria-checked') === 'true' ? 0 : -1; }); };
    mq.addEventListener('change', dotsMode);
    const chips = CITIES.map(([c]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.tabIndex = -1;
      b.textContent = c;
      b.addEventListener('click', () => pick(c, true));
      chipsBox.appendChild(b);
      return b;
    });
    const centerChip = (b, smooth) => { if (!chipsBox.clientWidth) return; chipsBox.scrollTo({ left: b.offsetLeft - (chipsBox.clientWidth - b.offsetWidth) / 2, behavior: smooth && !reduceMotion ? 'smooth' : 'instant' }); };
    const rove = (list) => (e) => {
      const i = list.indexOf(document.activeElement);
      if (i < 0) return;
      let n = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % list.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + list.length) % list.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = list.length - 1;
      if (n >= 0) { e.preventDefault(); pick(CITIES[n][0], true); list[n].focus({ preventScroll: true }); }
    };
    chipsBox.addEventListener('keydown', rove(chips));
    box.addEventListener('keydown', rove(dots));
    function pick(c, byUser) {
      dots.forEach((b, i) => { const on = CITIES[i][0] === c; b.classList.toggle('is-on', on); b.setAttribute('aria-checked', String(on)); });
      dotsMode();
      chips.forEach((b, i) => { const on = CITIES[i][0] === c; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; if (on) centerChip(b, byUser); });
      nameEl.textContent = c; waName.textContent = c;
      elunaEl.innerHTML = c === 'Алматы' ? 'Мы здесь: привезём и&nbsp;установим сами' : 'От&nbsp;7&nbsp;дней до&nbsp;двери, подъём включён';
      waEl.href = waUrl(CONFIG.msg.city(c));
      if (byUser) { deliveryCity = c; if (window.__cfgRender) window.__cfgRender(); }
    }
    pick('Алматы', false);
    resizeHooks.push(() => centerChip(chips.find((b) => b.getAttribute('aria-checked') === 'true') || chips[0], false));
  })();

  /* ---------- ИИ-обложки (img/projects, имена по MANIFEST): плит-заглушек нет ----------
     Каждый файл проверяем сразу (HEAD; на file:// — только onerror). Нет файла — фигура убирается целиком; оставшиеся
     обложки раскладываются зигзагом и нумеруются подряд; меньше трёх — глава «Проекты» скрыта вместе с пунктами меню.
     В каталоге без картинки текст встаёт шире, в ателье — две текстовые колонки. Новые файлы появляются сами. */
  const coversBox = $('.covers'), coversCta = $('.covers__cta'), projSec = $('#projects');
  const SLOT = [['cover--big'], ['cover--small'], ['cover--small', 'cover--left'], ['cover--big', 'cover--right']];
  const SIZES = { big: '(min-width: 900px) 640px, (min-width: 600px) 50vw, 84vw', small: '(min-width: 900px) 430px, (min-width: 600px) 50vw, 84vw' };
  const canProbe = !!window.fetch && /^https?:$/.test(location.protocol);
  const probes = new Map();
  const probe = (url) => { if (!probes.has(url)) probes.set(url, canProbe ? fetch(url, { method: 'HEAD' }).then((r) => r.ok, () => null) : Promise.resolve(null)); return probes.get(url); };
  let PROJECTS = [], coverRaf = 0;
  const projectOf = (f, i) => {
    const img = $('img', f), wa = $('[data-wa]', f), h = $('.heart', f);
    return {
      id: f.dataset.cover, n: String(i + 1).padStart(2, '0'), el: f, wide: f.classList.contains('cover--opener'),
      title: $('.caption i', f).textContent, tag: $('.caption small', f).textContent, what: $('.cover__what', f).innerHTML, alt: img ? img.alt : '',
      src: img ? (img.getAttribute('srcset') || '').split(',').pop().trim().split(' ')[0] || img.getAttribute('src') : '', small: img ? img.getAttribute('src') : '',
      wa: wa ? wa.dataset.wa : 'projects', sl: h ? { id: h.dataset.slId, title: h.dataset.slTitle, meta: h.dataset.slMeta } : null
    };
  };
  function renumberChapters() {
    let n = 0;
    $$('.folio > b').forEach((b) => { if (!b.closest('[hidden]')) b.textContent = String(++n).padStart(2, '0'); });
    $$('#menu .menu__list a').forEach((a) => { const t = document.getElementById(a.getAttribute('href').slice(1)), f = t && $('.folio > b', t), sm = $('small', a); if (f && sm) sm.textContent = f.textContent; });
  }
  function layoutCovers() {
    const live = $$('.cover[data-cover]').filter((f) => !f.hidden);
    const grid = live.filter((f) => !f.classList.contains('cover--opener'));
    grid.forEach((f, i) => {
      f.classList.remove('cover--big', 'cover--small', 'cover--left', 'cover--right');
      f.classList.add(...SLOT[i % 4]);
      f.classList.toggle('is-alt', i % 2 === 1);
      const img = $('img', f), sz = SIZES[i % 4 === 0 || i % 4 === 3 ? 'big' : 'small'];
      if (img && img.getAttribute('sizes') !== sz) img.setAttribute('sizes', sz);
    });
    if (coversCta) coversCta.classList.toggle('is-left', grid.length % 4 === 0 || grid.length % 4 === 2);
    live.forEach((f, i) => { const b = $('.caption b', f); if (b) b.textContent = String(i + 1).padStart(2, '0'); });
    PROJECTS = live.map(projectOf);
    if (projSec) {
      const off = live.length < 3;
      if (projSec.hidden !== off) {
        projSec.hidden = off;
        $$('a[href="#projects"]').forEach((a) => { a.hidden = off; });
        renumberChapters();
      }
    }
    $$('.cat').forEach((c) => { const f = $('.cat__fig', c); c.classList.toggle('cat--nofig', !!f && f.hidden); });
    const sg = $('.statement__grid'), af = $('.atelier__fig');
    if (sg && af) sg.classList.toggle('is-nofig', af.hidden);
    const bc = $('.bizcovers');
    if (bc) { const n = $$('.bizcover', bc).filter((x) => !x.hidden).length; bc.hidden = !n; bc.classList.toggle('is-single', n === 1); }
  }
  const coversChanged = () => { if (!coverRaf) coverRaf = requestAnimationFrame(() => { coverRaf = 0; layoutCovers(); stRefresh(); }); };
  function dropFig(fig) {
    if (fig.hidden) return;
    fig.hidden = true;
    const img = $('img', fig);
    if (img) { img.removeAttribute('srcset'); img.removeAttribute('src'); }
    coversChanged();
  }
  $$('.cover[data-cover], .bizcover, .frame--cover').forEach((fig) => {
    const img = $('img', fig);
    if (!img || !img.getAttribute('src')) return;
    img.addEventListener('error', () => dropFig(fig));
    if (img.complete && img.currentSrc && img.naturalWidth === 0) { dropFig(fig); return; }
    probe(img.getAttribute('src')).then((ok) => { if (ok === false) dropFig(fig); });
  });
  layoutCovers();
  // телефон: «Ваша комната — следующая» стоит под лентой обложек, а не последней карточкой в ней
  const placeCta = () => {
    if (!coversCta || !coversBox) return;
    const phone = mqPhone.matches;
    if (phone && coversCta.parentElement === coversBox) coversBox.after(coversCta);
    else if (!phone && coversCta.parentElement !== coversBox) coversBox.append(coversCta);
  };
  placeCta();
  mqPhone.addEventListener('change', placeCta);

  /* ---------- Проекты: лайтбокс — белая стена, ←/→, свайп, «Хочу так же», «В подборку»; только обложки с файлом ---------- */
  const lb = $('#lightbox');
  let lbIdx = 0;
  function lbShow(i) {
    if (!PROJECTS.length) return;
    lbIdx = (i + PROJECTS.length) % PROJECTS.length;
    const p = PROJECTS[lbIdx];
    const img = $('#lb-img');
    $('.lightbox__fig', lb).classList.toggle('is-wide', p.wide);
    img.hidden = false;
    // крупный вариант не пришёл — показываем малый; нет и его — пустое поле тона, без значка битой картинки
    img.onerror = () => { if (p.small && img.getAttribute('src') !== p.small) img.src = p.small; else img.hidden = true; };
    img.alt = p.alt; img.width = p.wide ? 1920 : 1200; img.height = p.wide ? 1200 : 1500;
    img.src = p.src;
    $('#lb-n').textContent = p.n; $('#lb-title').textContent = p.title; $('#lb-tag').textContent = p.tag;
    $('#lb-what').innerHTML = p.what;
    $('#lb-wa').href = waUrl(CONFIG.msg[p.wa] || CONFIG.msg.projects);
    const hb = $('#lb-heart');
    if (p.sl) { hb.hidden = false; hb.dataset.slId = p.sl.id; hb.dataset.slTitle = p.sl.title; hb.dataset.slMeta = p.sl.meta; } else hb.hidden = true;
    $('#lb-count').textContent = `${p.n} / ${String(PROJECTS.length).padStart(2, '0')}`;
    if (slReady) syncShortlist();
  }
  if (lb) {
    const lbWa = $('#lb-wa'); lbWa.target = '_blank'; lbWa.rel = 'noopener';
    const openLb = (id, opener) => { const i = PROJECTS.findIndex((p) => p.id === String(id)); if (i < 0) return false; lbShow(i); Modal.open(lb, opener); return true; };
    $$('[data-lightbox]').forEach((b) => b.addEventListener('click', () => openLb(b.dataset.lightbox, b)));
    $$('[data-lightbox-link]').forEach((a) => a.addEventListener('click', (e) => { if (openLb(a.dataset.lightboxLink, a)) { e.preventDefault(); e.stopPropagation(); } }, true));
    $('#lb-prev').addEventListener('click', () => lbShow(lbIdx - 1));
    $('#lb-next').addEventListener('click', () => lbShow(lbIdx + 1));
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') lbShow(lbIdx - 1); else if (e.key === 'ArrowRight') lbShow(lbIdx + 1); });
    let sx = null, sy = 0;
    lb.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    lb.addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) lbShow(lbIdx + (dx < 0 ? 1 : -1)); });
  }

  /* ---------- «Подборка»: список → одно сообщение WhatsApp (localStorage ricca-shortlist-v2, до 12 позиций) ---------- */
  const SL_KEY = 'ricca-shortlist-v2';
  let items = store.get(SL_KEY, null);
  if (!Array.isArray(items)) {
    const old = store.get('ricca-shortlist-v1', []);
    items = Array.isArray(old) ? old.filter((t) => typeof t === 'string').map((t, i) => ({ id: `old-${i}`, title: t, meta: '' })) : [];
  }
  items = items.filter((x) => x && x.id && x.title).slice(0, 12);
  const dlgSL = $('#shortlist'), slList = $('#shortlist-list'), slEmpty = $('#shortlist-empty'), slCount = $('#shortlist-count'), slN = $('#shortlist-n');
  const heartNav = $('#shortlist-open'), slSend = $('#shortlist-send'), slFoot = $('#shortlist-foot'), slConfirm = $('#shortlist-confirm');
  const toast = $('#toast'), toastText = $('#toast-text');
  const plural = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'позиция' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'позиции' : 'позиций'));
  const hasItem = (id) => items.some((x) => x.id === id);
  function syncShortlist() {
    const n = items.length;
    slCount.hidden = n === 0; slCount.textContent = n;
    slN.textContent = n ? ` · ${n}` : '';
    heartNav.classList.toggle('is-on', n > 0);
    heartNav.setAttribute('aria-label', n ? `Подборка: в подборке ${n} ${plural(n)}` : 'Подборка, пусто');
    $$('[data-sl-id]').forEach((b) => {
      const on = hasItem(b.dataset.slId);
      b.setAttribute('aria-pressed', String(on));
      const lbl = b.querySelector('span:not(.sr-only)');
      if (lbl && b.classList.contains('heart-btn')) { lbl.textContent = on ? 'В подборке' : 'В подборку'; b.setAttribute('aria-label', `${lbl.textContent}: ${b.dataset.slTitle}`); }
    });
    const cfgBtn = $('#cfgShortlist');
    if (cfgBtn) { const it = cfgItem(), on = items.some((x) => x.id === it.id && x.meta === it.meta && x.title === it.title), t = on ? 'В подборке' : 'В подборку'; cfgBtn.setAttribute('aria-pressed', String(on)); cfgBtn.querySelector('span').textContent = t; cfgBtn.setAttribute('aria-label', `${t}: ${it.title}${it.meta ? `, ${it.meta}` : ''}`); }
  }
  function renderSL() {
    const n = items.length;
    slList.replaceChildren(...items.map((it) => {
      const li = document.createElement('li');
      const t = document.createElement('span'); t.className = 'sl__t'; t.textContent = it.title;
      const m = document.createElement('span'); m.className = 'sl__m'; m.textContent = it.meta || '';
      const b = document.createElement('button'); b.className = 'heart'; b.type = 'button'; b.setAttribute('aria-label', `Убрать: ${it.title}`);
      b.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-close"/></svg>';
      // renderSL() пересобирает список — фокус ставим по индексу в новом списке, а не на отсоединённый узел
      b.addEventListener('click', () => { const idx = Array.prototype.indexOf.call(slList.children, li); remove(it.id); const li2 = slList.children[Math.min(idx, slList.children.length - 1)]; (li2 ? $('button', li2) : $('[data-close]', dlgSL)).focus(); });
      li.append(t, m, b);
      return li;
    }));
    slEmpty.hidden = n > 0;
    slFoot.hidden = n === 0;
    slConfirm.hidden = true;
    const onlyEluna = n > 0 && items.every((x) => /^Eluna /.test(x.title));
    const head = onlyEluna ? 'Здравствуйте! Хочу заказать матрас ELUNA. Моя подборка:' : 'Здравствуйте! Моя подборка на сайте RICCA DESIGNS:';
    slSend.href = waUrl(`${head}\n${items.map((x, i) => `${i + 1}. ${x.title}${x.meta ? ` · ${x.meta}` : ''}`).join('\n')}\nРасскажите, пожалуйста, подробнее и помогите с выбором.`);
    syncShortlist();
  }
  slSend.target = '_blank'; slSend.rel = 'noopener';
  let toastT = 0;
  function showToast(text, withOpen) {
    toastText.textContent = text; $('#toast-open').hidden = !withOpen;
    toast.hidden = false; clearTimeout(toastT);
    toastT = setTimeout(() => { toast.hidden = true; }, 3200);
  }
  function remove(id) { items = items.filter((x) => x.id !== id); store.set(SL_KEY, items); renderSL(); }
  function toggleItem(it) {
    if (hasItem(it.id)) { remove(it.id); showToast('Убрано из подборки', false); return; }
    if (items.length >= 12) { showToast('В подборке не больше 12 позиций', true); return; }
    items.push(it); store.set(SL_KEY, items); renderSL();
    showToast('Добавлено в подборку', true);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sl-id]');
    if (b) { toggleItem({ id: b.dataset.slId, title: b.dataset.slTitle, meta: b.dataset.slMeta || '' }); return; }
    if (e.target.closest('#cfgShortlist')) {
      const it = cfgItem(), same = items.find((x) => x.id === it.id);
      if (same && same.meta === it.meta && same.title === it.title) { remove(it.id); showToast('Убрано из подборки', false); }
      else { items = items.filter((x) => x.id !== it.id); if (items.length >= 12) { showToast('В подборке не больше 12 позиций', true); return; } items.push(it); store.set(SL_KEY, items); renderSL(); showToast('Добавлено в подборку', true); }
    }
  });
  heartNav.addEventListener('click', () => Modal.open(dlgSL, heartNav));
  $('#toast-open').addEventListener('click', () => { toast.hidden = true; Modal.open(dlgSL, heartNav); });
  $('#shortlist-clear').addEventListener('click', () => { slConfirm.hidden = false; $('#shortlist-no').focus(); });
  $('#shortlist-no').addEventListener('click', () => { slConfirm.hidden = true; $('#shortlist-clear').focus(); });
  $('#shortlist-yes').addEventListener('click', () => { items = []; store.set(SL_KEY, items); renderSL(); $('[data-close]', dlgSL).focus(); });
  $('[data-close-go]', dlgSL).addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); Modal.close(dlgSL, { then: () => goTo('catalog', false) }); });
  window.addEventListener('storage', (e) => { if (e.key === SL_KEY) { items = store.get(SL_KEY, []); renderSL(); } });
  slReady = true;
  renderSL();

  /* ---------- Шапка при скролле, активный раздел, липкая плашка (телефон) ---------- */
  const navLinks = $$('.nav__menu a');
  const sections = navLinks.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  const bar = $('[data-mbar]'), barWa = $('[data-mbar-wa]'), barLabel = $('[data-mbar-label]');
  const heroCta = $('[data-hero-cta]'), endCh = $('.endchapter'), materials = $('#materials');
  const barGeneral = waUrl(CONFIG.msg.general);
  // плашка не дублирует видимую залитую кнопку WhatsApp
  const fills = new Set();
  if (hasIO) {
    const fillIO = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) fills.add(e.target); else fills.delete(e.target); }); updateBar(); }, { threshold: 0.9 });
    $$('main .button--fill[data-wa]').forEach((b) => { if (b !== heroCta) fillIO.observe(b); });
  }
  let lastY = window.scrollY;
  function updateBar() {
    if (barRaf) return;
    barRaf = requestAnimationFrame(() => {
      barRaf = 0;
      if (!bar) return;
      const vh = window.innerHeight;
      const ctaGone = heroCta ? heroCta.getBoundingClientRect().bottom < 0 : window.scrollY > vh;
      const endSeen = endCh ? endCh.getBoundingClientRect().top < vh * 0.92 : false;
      const st = stageEl ? stageEl.getBoundingClientRect() : null;
      const overStage = st ? st.top < vh * 0.5 && st.bottom > vh * 0.5 : false;
      const dlgOpen = !!$('dialog[open]');
      const on = isMobile() && ctaGone && !endSeen && !overStage && !menuOpen && !dlgOpen && fills.size === 0;
      bar.classList.toggle('is-on', on);
      bar.setAttribute('aria-hidden', String(!on));
      $$('a', bar).forEach((a) => { a.tabIndex = on ? 0 : -1; });
      // текст и ссылка первой кнопки — по контексту: ELUNA → текущий выбор конфигуратора, материалы → образец
      let href = barGeneral, label = 'WhatsApp';
      const mid = vh * 0.5;
      if (eluna) { const r = eluna.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) { href = cfgHref; label = 'Заказать <span class="e-font e-inline">ELUNA</span>'; } }
      if (materials) { const r = materials.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) href = fabricHref; }
      if (barWa.href !== href) barWa.href = href;
      if (barLabel.dataset.label !== label) { barLabel.dataset.label = label; barLabel.innerHTML = label; }   // ELUNA — шрифтом Unbounded
    });
  }
  let navRaf = 0;
  function onScroll() {
    if (navRaf) return;
    navRaf = requestAnimationFrame(() => {
      navRaf = 0;
      const y = window.scrollY, vh = window.innerHeight;
      nav.classList.toggle('is-scrolled', y > 24);
      const busy = Date.now() - programmatic < 1200;
      if (isMobile() && !menuOpen && !busy) {
        if (y > lastY + 4 && y > 140) { nav.classList.add('is-hidden'); root.classList.add('nav-hidden'); }
        else if (y < lastY - 4) { nav.classList.remove('is-hidden'); root.classList.remove('nav-hidden'); }
      } else if (!isMobile()) { nav.classList.remove('is-hidden'); root.classList.remove('nav-hidden'); }
      lastY = y;
      let current = null;
      for (const s of sections) { if (s.getBoundingClientRect().top <= vh * 0.42) current = s; }
      navLinks.forEach((a) => a.classList.toggle('is-active', !!current && a.getAttribute('href') === `#${current.id}`));
      updateBar();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  resizeHooks.push(() => onScroll());
  onScroll();

  /* ---------- Пересчёт пинов после шрифтов и полной загрузки; поздний viewport; хэш при загрузке ---------- */
  // раскрытые и свёрнутые блоки выше сцены меняют её место — пересчитываем пин
  let tgT = 0;
  document.addEventListener('toggle', () => { clearTimeout(tgT); tgT = setTimeout(stRefresh, 60); }, true);
  window.addEventListener('load', stRefresh);
  requestAnimationFrame(() => { if (window.innerWidth !== lastW || window.innerHeight !== lastH) onResize(true); });
  if (location.hash.length > 1) window.addEventListener('load', () => { const id = decodeURIComponent(location.hash.slice(1)); if (document.getElementById(id)) setTimeout(() => goTo(id, false), 60); });
})();
