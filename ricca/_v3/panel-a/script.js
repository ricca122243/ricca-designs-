/* RICCA DESIGNS — прототип A «Maison Blanche». Без зависимостей. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPhone = () => matchMedia('(max-width: 899px)').matches;

  /* ---------- WhatsApp ---------- */
  const WA = '77084802047';
  const wa = (msg) => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  const MSG = {
    'general': 'Здравствуйте! Хочу узнать о мебели RICCA на заказ.',
    'question': 'Здравствуйте! У меня вопрос по мебели RICCA.',
    'showroom': 'Здравствуйте! Хочу записаться на визит в шоурум RICCA на Навои, 208/2.',
    'sofas': 'Здравствуйте! Интересует диван на заказ. Пришлите, пожалуйста, подборку и расскажите, что нужно для расчёта.',
    'sofas.calc': 'Здравствуйте! Хочу рассчитать диван на заказ. Размеры комнаты и фото пришлю следующим сообщением.',
    'beds': 'Здравствуйте! Интересует кровать на заказ. Пришлите, пожалуйста, подборку.',
    'armchairs': 'Здравствуйте! Интересует кресло для отдыха. Пришлите, пожалуйста, подборку.',
    'tables': 'Здравствуйте! Хочу подобрать стол или консоль к мягкой мебели. Пришлите, пожалуйста, варианты.',
    'c2026': 'Здравствуйте! Что из коллекции 2026 сейчас стоит в шоуруме?',
    'master': 'Здравствуйте! У меня вопрос к мастеру RICCA.',
    'eluna': 'Здравствуйте! Интересуют матрасы ELUNA.',
    'eluna.air': 'Здравствуйте! Хочу заказать матрас ELUNA. Модель: Eluna Air. Размер: 1600 × 2000 мм. Цена: 125 000 ₸.',
    'eluna.balance': 'Здравствуйте! Хочу заказать матрас ELUNA. Модель: Eluna Balance. Размер: 1600 × 2000 мм. Цена: 220 000 ₸.',
    'eluna.prime': 'Здравствуйте! Хочу заказать матрас ELUNA. Модель: Eluna Prime. Размер: 1600 × 2000 мм. Цена: 280 000 ₸ (без скидки 350 000 ₸, −20 %).',
    'eluna.royal': 'Здравствуйте! Хочу обсудить матрас Eluna Royal под свой размер и проект.',
    'projects': 'Здравствуйте! Хочу обсудить мебель для своей комнаты: гостиная / спальня / столовая / кабинет / другое. Размеры и фото пришлю следующим сообщением.',
    'business': 'Здравствуйте! Хочу обсудить проект для бизнеса: отель / ресторан / апарт-комплекс / жилой проект / офис.',
    'project.living': 'Здравствуйте! Хочу так же: гостиная — угловой диван в букле, два кресла в шенилле, консоль и низкий стол. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
    'project.bedroom': 'Здравствуйте! Хочу так же: спальня — кровать с мягким изголовьем в велюре, матрас Eluna Prime 1800 × 2000, банкетка. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
    'project.dining': 'Здравствуйте! Хочу так же: столовая — мягкие стулья, банкетка, консоль. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
    'project.study': 'Здравствуйте! Хочу так же: кабинет — кресло в коже, двухместный диван в рогожке, консоль. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
    'project.lobby': 'Здравствуйте! Хочу так же: лобби отеля — модульные диваны, группы кресел, низкие столы. Объект: {название / город}. Расскажите, пожалуйста, как вы работаете с объектами.',
    'project.restaurant': 'Здравствуйте! Хочу так же: ресторан — диваны-банкетки в коже, кресла, столы по размеру зала. Объект: {название / город}. Расскажите, пожалуйста, как вы работаете с объектами.'
  };
  $$('[data-wa]').forEach(a => { const m = MSG[a.dataset.wa]; if (m) a.href = wa(m); });

  /* ---------- Тост ---------- */
  const toastEl = $('#toast'); let toastT;
  const toast = (text) => { if (!toastEl) return; toastEl.textContent = text; toastEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2200); };

  /* ---------- Hero ---------- */
  const ready = () => document.documentElement.classList.add('is-ready');
  if (reduced) ready(); else requestAnimationFrame(() => requestAnimationFrame(ready));

  /* ---------- Шапка ---------- */
  const nav = $('#nav');
  let openDialogs = 0;
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 24);
    /* телефон: шапка уезжает при скролле вниз > 120px, возвращается при скролле вверх (DESIGN-V3 §4.1) */
    if (isPhone() && !reduced) nav.classList.toggle('is-hidden', y > 120 && y > lastY && openDialogs === 0);
    else nav.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* scrollspy */
  const spyLinks = $$('.nav__menu a[data-spy]');
  const spyMap = new Map(spyLinks.map(a => [a.dataset.spy, a]));
  if ('IntersectionObserver' in window && spyLinks.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { spyLinks.forEach(a => a.classList.remove('is-active')); const a = spyMap.get(e.target.id); if (a) a.classList.add('is-active'); } });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    spyMap.forEach((a, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Reveal ---------- */
  const reveals = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) reveals.forEach(el => el.classList.add('is-in'));
  else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .01 });
    reveals.forEach(el => io.observe(el));
  }

  /* ---------- Диалоги (меню, подборка): Esc, подложка, «назад» ---------- */
  let lastTrigger = null;
  const syncBody = () => document.body.classList.toggle('has-dialog', openDialogs > 0);
  const openDlg = (d, trigger) => {
    if (!d || d.open) return;
    lastTrigger = trigger || document.activeElement;
    d.showModal(); openDialogs++; syncBody();
    try { history.pushState({ dlg: d.id }, '', '#' + d.id); } catch (_) {}
    if (d.id === 'menu') { const first = $('.menu__list a', d); first && first.focus(); }
    updateSticky();
  };
  const closeDlg = (d, fromPop) => {
    if (!d || !d.open) return;
    d.close(); openDialogs = Math.max(0, openDialogs - 1); syncBody();
    if (!fromPop && history.state && history.state.dlg === d.id) { try { history.back(); } catch (_) {} }
    if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
    updateSticky();
  };
  addEventListener('popstate', () => { $$('dialog[open]').forEach(d => closeDlg(d, true)); });
  $$('dialog').forEach(d => {
    d.addEventListener('cancel', (e) => { e.preventDefault(); closeDlg(d); });
    d.addEventListener('click', (e) => { if (e.target === d) closeDlg(d); });
    $$('[data-close]', d).forEach(b => b.addEventListener('click', () => closeDlg(d)));
  });
  $$('[data-open]').forEach(b => b.addEventListener('click', () => openDlg(document.getElementById(b.dataset.open), b)));
  /* если страница открыта с #menu/#shortlist — не держим диалог */
  if (/^#(menu|shortlist)$/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (_) {} }

  /* ---------- Подборка ---------- */
  const KEY = 'ricca-shortlist-v1'; const MAX = 12;
  let list = [];
  try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(list)) list = []; } catch (_) { list = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (_) {} };
  const plural = (n) => { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return 'позиция'; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'позиции'; return 'позиций'; };
  const slDlg = $('#shortlist'); const slList = $('[data-sl-list]'); const slEmpty = $('[data-sl-empty]'); const slFoot = $('[data-sl-foot]');
  const slSend = $('[data-sl-send]'); const slCount = $('[data-sl-count]'); const slConfirm = $('[data-sl-confirm]'); const live = $('#sl-live');
  const message = () => {
    const allEluna = list.length && list.every(i => /^eluna-/.test(i.id));
    const items = list.slice(0, 6).map((i, k) => `${k + 1}. ${i.title}${i.meta ? ' · ' + i.meta : ''}`);
    if (list.length > 6) items.push(`…и ещё ${list.length - 6}`);
    const head = allEluna ? 'Здравствуйте! Хочу заказать матрас ELUNA. Моя подборка:' : 'Здравствуйте! Моя подборка на сайте RICCA DESIGNS:';
    return `${head}\n${items.join('\n')}\nРасскажите, пожалуйста, подробнее и помогите с выбором.`;
  };
  const render = () => {
    const n = list.length;
    $$('.nav__pick').forEach(b => {
      const c = $('.count', b); if (c) { c.textContent = String(n); c.hidden = n === 0; }
      b.classList.toggle('has-items', n > 0);
      b.setAttribute('aria-label', n ? `Подборка: ${n}` : 'Подборка, пусто');
    });
    $$('[data-add]').forEach(b => {
      const on = list.some(i => i.id === b.dataset.id);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      const label = $('.pick__label', b); if (label) label.innerHTML = on ? 'В подборке' : 'В подборку';
      if (!label) { const t = b.dataset.title; b.setAttribute('aria-label', (on ? 'Убрать из подборки: ' : 'В подборку: ') + t); }
    });
    if (slList) {
      slList.innerHTML = list.map(i => `<li><div><b>${esc(i.title)}</b>${i.meta ? `<span>${esc(i.meta)}</span>` : ''}</div><button class="iconbtn" type="button" data-sl-remove="${esc(i.id)}" aria-label="Убрать ${esc(i.title)}"><svg class="ico" aria-hidden="true"><use href="#i-close"/></svg></button></li>`).join('');
      slEmpty.hidden = n > 0; slFoot.hidden = n === 0; slConfirm.hidden = true;
      slCount.textContent = n ? `· ${n}` : '';
      slSend.href = wa(message());
    }
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $$('[data-add]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.id; const idx = list.findIndex(i => i.id === id);
    if (idx >= 0) { list.splice(idx, 1); toast('Убрано из подборки'); }
    else { if (list.length >= MAX) { toast(`В подборке не больше ${MAX} позиций`); return; } list.push({ id, title: b.dataset.title, meta: b.dataset.meta || '' }); toast('Добавлено в подборку'); }
    save(); render();
    if (live) live.textContent = list.length ? `В подборке ${list.length} ${plural(list.length)}` : 'Подборка пуста';
  }));
  if (slList) slList.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sl-remove]'); if (!b) return;
    list = list.filter(i => i.id !== b.dataset.slRemove); save(); render();
  });
  const clearBtn = $('[data-sl-clear]');
  clearBtn && clearBtn.addEventListener('click', () => { slConfirm.hidden = false; $('[data-sl-clear-yes]').focus(); });
  $('[data-sl-clear-yes]') && $('[data-sl-clear-yes]').addEventListener('click', () => { list = []; save(); render(); toast('Подборка очищена'); });
  $('[data-sl-clear-no]') && $('[data-sl-clear-no]').addEventListener('click', () => { slConfirm.hidden = true; clearBtn.focus(); });
  render();

  /* ---------- «Скоро» — разделы вне прототипа ---------- */
  $$('[data-soon]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); toast('Раздел появится в полной сборке сайта'); }));

  /* ---------- Липкая плашка ---------- */
  const sticky = $('#sticky'); const hero = $('#hero'); const contacts = $('#contacts'); const footer = $('.footer');
  let heroVisible = true, endVisible = false, fillVisible = 0;
  function updateSticky() {
    if (!sticky) return;
    const on = isPhone() && !heroVisible && !endVisible && openDialogs === 0 && fillVisible === 0;
    sticky.classList.toggle('is-on', on);
    sticky.setAttribute('aria-hidden', on ? 'false' : 'true');
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; updateSticky(); }, { threshold: 0 }).observe(hero);
    const endCheck = () => { endVisible = [contacts, footer].some(el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.top < innerHeight * .85 && r.bottom > 0; }); updateSticky(); };
    let endT = false; addEventListener('scroll', () => { if (endT) return; endT = true; requestAnimationFrame(() => { endT = false; endCheck(); }); }, { passive: true }); endCheck();
    const fills = $$('main .button--fill[data-wa]');
    const fillIo = new IntersectionObserver((entries) => { entries.forEach(e => { e.target._vis = e.isIntersecting; }); fillVisible = fills.filter(b => b._vis).length; updateSticky(); }, { threshold: .5 });
    fills.forEach(b => fillIo.observe(b));
  }
  addEventListener('resize', updateSticky);

  /* ---------- Лента моделей: старт на Prime ---------- */
  const lane = $('#models-lane');
  const startOnPrime = () => {
    if (!lane || !isPhone()) return;
    const prime = $('.mcard--prime', lane); if (!prime) return;
    const x = prime.getBoundingClientRect().left - lane.getBoundingClientRect().left + lane.scrollLeft - (lane.clientWidth - prime.offsetWidth) / 2;
    lane.scrollTo({ left: Math.max(0, x), behavior: 'auto' });
  };
  if (lane) {
    if ('IntersectionObserver' in window) {
      const once = new IntersectionObserver((entries) => { if (entries.some(e => e.isIntersecting)) { startOnPrime(); $$('.mcard', lane).forEach(c => c.classList.add('is-in')); once.disconnect(); } }, { rootMargin: '200px 0px' });
      once.observe(lane);
    } else startOnPrime();
  }

  /* ---------- Звёзды ELUNA (статичное поле, только внутри блока) ---------- */
  const stars = $('.eluna__stars'); const eluna = $('#eluna');
  const lowTier = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  const drawStars = () => {
    if (!stars || lowTier) return;
    const w = eluna.clientWidth, h = eluna.clientHeight; if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    stars.width = Math.round(w * dpr); stars.height = Math.round(h * dpr);
    const ctx = stars.getContext('2d'); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const density = isPhone() ? 14000 : 9000; const n = Math.round((w * h) / density);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * h, r = .3 + rnd() * 1.1, a = .18 + rnd() * .42;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = `rgba(247,245,240,${a.toFixed(2)})`; ctx.fill();
    }
  };
  if (stars && eluna && 'IntersectionObserver' in window) {
    const so = new IntersectionObserver((entries) => { if (entries.some(e => e.isIntersecting)) { drawStars(); so.disconnect(); } }, { rootMargin: '50% 0px' });
    so.observe(eluna);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawStars, 200); });
  }

  /* Unbounded подгружаем, когда блок ELUNA близко (шрифт и так в CSS — это лишь ранний старт) */
  if (eluna && document.fonts && 'IntersectionObserver' in window) {
    const fo = new IntersectionObserver((entries) => { if (entries.some(e => e.isIntersecting)) { document.fonts.load('500 1em Unbounded'); document.fonts.load('300 1em Unbounded'); fo.disconnect(); } }, { rootMargin: '75% 0px' });
    fo.observe(eluna);
  }
})();
