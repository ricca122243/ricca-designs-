/* RICCA DESIGNS — аналитика: Google Analytics 4 и Meta Pixel (23 ноября). Подключается на всех страницах с defer.
   Зачем: понять, где теряются посетители — от просмотра модели до заявки.

   Номера счётчиков в код не пишем. Их подставляет сборка Netlify из переменных окружения GA4_ID и META_PIXEL_ID
   (tools/analytics-env.mjs заменяет заглушки в двух строках ниже). Пока переменных нет — заглушки остаются,
   счётчики не грузятся, сайт работает как раньше.

   События (одно действие → оба счётчика):
     заявка отправлена      GA4 generate_lead           Meta Lead           — страница, тип товара
     клик WhatsApp/телефон  GA4 contact                 Meta Contact        — способ, страница, место кнопки
     страница модели        GA4 view_item               Meta ViewContent    — модель, категория
     конструктор: начало    GA4 configurator_start      Meta configurator_start (своё событие)
     конструктор: итог      GA4 configurator_complete   Meta configurator_complete (своё событие)
   Имя и телефон клиента в счётчики не передаются.

   Скорость: этот файл маленький и ничего не ждёт. Библиотеки Google и Meta грузятся после полной загрузки страницы,
   в свободное время браузера; события до этого копятся в очереди и уходят, когда библиотека готова.

   Проверка: откройте страницу с ?analytics_debug=1 — события пишутся в консоль браузера и видны в GA4 → DebugView. */
(() => {
  'use strict';
  const GA4_RAW = '%GA4_ID%';
  const PIXEL_RAW = '%META_PIXEL_ID%';
  const ga4 = /^G-[A-Z0-9]{4,20}$/.test(GA4_RAW) ? GA4_RAW : '';
  const pixel = /^\d{6,20}$/.test(PIXEL_RAW) ? PIXEL_RAW : '';

  /* режим проверки: ?analytics_debug=1 включает его на весь визит, ?analytics_debug=0 выключает */
  let debug = false;
  try {
    const q = new URLSearchParams(location.search).get('analytics_debug');
    if (q === '1') sessionStorage.setItem('ricca:adebug', '1');
    if (q === '0') sessionStorage.removeItem('ricca:adebug');
    debug = sessionStorage.getItem('ricca:adebug') === '1';
  } catch (e) { debug = /[?&]analytics_debug=1\b/.test(location.search); }   // память браузера закрыта — только для этой страницы

  /* ---------- очереди счётчиков: события можно слать сразу, библиотеки подхватят их после загрузки ---------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }   // именно arguments: так требует gtag.js
  if (ga4) { gtag('js', new Date()); gtag('config', ga4, debug ? { debug_mode: true } : {}); }
  if (pixel && !window.fbq) {
    const n = window.fbq = function () { if (n.callMethod) n.callMethod.apply(n, arguments); else n.queue.push(arguments); };
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    window.fbq('init', pixel); window.fbq('track', 'PageView');
  }

  /* ---------- библиотеки: после загрузки страницы, в свободное время; первое событие грузит их сразу ---------- */
  let booted = false;
  const inject = (src) => { const s = document.createElement('script'); s.async = true; s.src = src; document.head.appendChild(s); };
  const boot = () => {
    if (booted) return; booted = true;
    if (ga4) inject(`https://www.googletagmanager.com/gtag/js?id=${ga4}`);
    if (pixel) inject('https://connect.facebook.net/en_US/fbevents.js');
  };
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(boot, { timeout: 3000 }) : setTimeout(boot, 1200));
  if (document.readyState === 'complete') idle(); else window.addEventListener('load', idle, { once: true });

  /* ---------- общее: название страницы, язык ---------- */
  const cut = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
  const pageName = () => {
    const el = document.querySelector('[data-page-name]');
    const h = document.querySelector('h1');
    return cut((el && el.getAttribute('data-page-name')) || (h && h.textContent) || document.title, 90);
  };
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'ru');

  /* одно событие → оба счётчика. g — имя и параметры для GA4, f — для Meta */
  const send = (g, f) => {
    if (debug) console.log('[analytics]', g[0], g[1], '| Meta:', f[1], f[2], ga4 || pixel ? '' : '(счётчики не подключены — заглушки)');
    if (ga4) gtag('event', g[0], Object.assign(debug ? { debug_mode: true } : {}, g[1]));
    if (pixel) window.fbq(f[0], f[1], f[2]);
    if (ga4 || pixel) boot();
  };

  /* ---------- Lead: заявка ушла (js/lead.js сообщает событием ricca:lead) ---------- */
  document.addEventListener('ricca:lead', (e) => {
    const d = e.detail || {};
    const type = ['sofa', 'bed', 'other'].includes(d.interest) ? d.interest : 'other';
    const page = cut(d.page || pageName(), 90), place = cut(d.place || 'page', 40);
    if (d.place === 'configurator') cfgComplete();
    send(['generate_lead', { page_name: page, product_type: type, form_place: place, language: lang() }],
      ['track', 'Lead', { content_name: page, content_category: type }]);
  });

  /* ---------- Contact: клик по WhatsApp и по телефону ---------- */
  const WA = /^https?:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//i;
  const placeOf = (a) => {
    const box = a.closest('dialog[id], section[id], footer, header, [id]');
    const where = box ? (box.id || box.tagName.toLowerCase()) : 'page';
    const what = a.id || String(a.className && a.className.baseVal != null ? a.className.baseVal : a.className || '').split(/\s+/)[0] || 'link';
    return cut(where === what ? what : `${where}/${what}`, 60);
  };
  let lastContact = '', lastAt = 0;
  const contact = (method, place) => {
    const now = Date.now();
    if (method === lastContact && now - lastAt < 1200) return;   // ссылка и window.open от одного нажатия — одно событие
    lastContact = method; lastAt = now;
    if (document.querySelector('main.cfg') && method === 'whatsapp' && /wa-send|bar-wa|script/.test(place)) cfgComplete();
    send(['contact', { method, page_name: pageName(), place, language: lang() }],
      ['track', 'Contact', { content_name: pageName(), content_category: method }]);
  };
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const h = a.getAttribute('href') || '';
    const method = WA.test(a.href) || /^whatsapp:/i.test(h) ? 'whatsapp' : /^tel:/i.test(h) ? 'phone' : '';
    if (!method) return;
    const place = placeOf(a);
    /* страница могла отменить переход (ошибка в форме конструктора) — тогда это не обращение */
    setTimeout(() => { if (!e.defaultPrevented) contact(method, place); }, 0);
  }, true);
  /* WhatsApp, открытый из скрипта (конструктор, комната) */
  const open0 = window.open;
  window.open = function (url) {
    try { if (typeof url === 'string' && WA.test(url)) contact('whatsapp', 'script'); } catch (e) { /* открытие окна важнее счётчика */ }
    return open0.apply(window, arguments);
  };

  /* ---------- ViewContent: страница модели (атрибуты ставит tools/model-pages.mjs) и окно модели на главной ---------- */
  const view = (id, name, category) => {
    id = cut(id, 40); name = cut(name, 90); category = cut(category, 40);
    if (!id && !name) return;
    send(['view_item', { items: [{ item_id: id, item_name: name, item_category: category }], page_name: pageName(), language: lang() }],
      ['track', 'ViewContent', { content_ids: [id], content_name: name, content_category: category, content_type: 'product' }]);
  };
  const body = document.body;
  if (body && body.dataset.viewId) view(body.dataset.viewId, pageName(), body.dataset.viewCat);
  document.addEventListener('ricca:view', (e) => { const d = e.detail || {}; view(d.id, d.name, d.category); });

  /* ---------- конструктор: начало — первое действие в шагах 1–4; завершение — дошёл до «Итога» или отправил вариант ---------- */
  let cfgStarted = false, cfgDone = false, sumSeen = false;
  const cfgStart = () => {
    if (cfgStarted) return; cfgStarted = true;
    send(['configurator_start', { language: lang() }], ['trackCustom', 'configurator_start', {}]);
    if (sumSeen) cfgComplete();
  };
  function cfgComplete() {
    if (cfgDone || !document.querySelector('main.cfg')) return;
    cfgStart(); if (cfgDone) return; cfgDone = true;
    send(['configurator_complete', { language: lang() }], ['trackCustom', 'configurator_complete', {}]);
  }
  const steps = document.querySelector('main.cfg .steps');
  if (steps) {
    const use = (e) => {
      const t = e.target && e.target.closest && e.target.closest('button, input, select, textarea, label, [role="radio"], [role="option"]');
      if (!t || !steps.contains(t) || t.closest('[data-step="5"]')) return;   // «Итог» — уже не выбор параметров
      cfgStart(); steps.removeEventListener('click', use, true); steps.removeEventListener('change', use, true);
    };
    steps.addEventListener('click', use, true); steps.addEventListener('change', use, true);
    const fin = document.querySelector('#wa-send');   // главная кнопка «Итога»: видна — значит, до итога дошли
    if (fin && 'IntersectionObserver' in window) {
      new IntersectionObserver((es) => { sumSeen = es.some((x) => x.isIntersecting); if (sumSeen && cfgStarted) cfgComplete(); }, { threshold: 0.5 }).observe(fin);
    }
  }
})();
