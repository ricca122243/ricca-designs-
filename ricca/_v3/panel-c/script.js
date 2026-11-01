/* RICCA DESIGNS — прототип C «Chapitres». Ядро: WhatsApp-ссылки, меню, reveal, плашка, подборка, звёзды ELUNA */
(function () {
  'use strict';
  const d = document;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  d.documentElement.classList.remove('no-js');

  /* ---------- WhatsApp: готовые тексты (CONTENT-V3 §27) ---------- */
  const WA = '77084802047';
  const wa = (msg) => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  const HI = 'Здравствуйте! ';
  const MSG = {
    general: HI + 'Хочу узнать о мебели RICCA на заказ.',
    question: HI + 'У меня вопрос по мебели RICCA.',
    showroom: HI + 'Хочу записаться на визит в шоурум RICCA на Навои, 208/2.',
    sofas: HI + 'Интересует диван на заказ. Пришлите, пожалуйста, подборку и расскажите, что нужно для расчёта.',
    beds: HI + 'Интересует кровать на заказ. Размер матраса: 1600 × 2000 / 1800 × 2000 / свой. Пришлите, пожалуйста, подборку.',
    armchairs: HI + 'Интересует кресло для отдыха. Пришлите, пожалуйста, подборку.',
    tables: HI + 'Хочу подобрать стол или консоль к мягкой мебели. Пришлите, пожалуйста, варианты.',
    c2026: HI + 'Что из коллекции 2026 сейчас стоит в шоуруме?',
    projects: HI + 'Хочу обсудить мебель для своей комнаты: гостиная / спальня / столовая / кабинет / другое. Размеры и фото пришлю следующим сообщением.',
    business: HI + 'Хочу обсудить проект для бизнеса: отель / ресторан / апарт-комплекс / жилой проект / офис.',
    master: HI + 'У меня вопрос к мастеру RICCA.',
    'eluna:air': HI + 'Хочу заказать матрас ELUNA. Модель: Eluna Air. Размер: 1600 × 2000 мм. Цена: 125 000 ₸.',
    'eluna:balance': HI + 'Хочу заказать матрас ELUNA. Модель: Eluna Balance. Размер: 1600 × 2000 мм. Цена: 220 000 ₸.',
    'eluna:prime': HI + 'Хочу заказать матрас ELUNA. Модель: Eluna Prime. Размер: 1600 × 2000 мм. Цена: 280 000 ₸ (без скидки 350 000 ₸, −20 %).',
    'eluna:royal': HI + 'Хочу обсудить матрас Eluna Royal под свой размер и проект.',
    'project:living': HI + 'Хочу так же: гостиная — угловой диван в букле, два кресла в шенилле, консоль и низкий стол. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
    'project:bedroom': HI + 'Хочу так же: спальня — кровать с мягким изголовьем в велюре, матрас Eluna Prime 1800 × 2000, банкетка. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
    'project:dining': HI + 'Хочу так же: столовая — мягкие стулья, банкетка, консоль. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
    'project:study': HI + 'Хочу так же: кабинет — кресло в коже, двухместный диван в рогожке, консоль. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
    'project:lobby': HI + 'Хочу так же: лобби отеля — модульные диваны, группы кресел, низкие столы. Объект: название / город. Расскажите, пожалуйста, как вы работаете с объектами.',
    'project:restaurant': HI + 'Хочу так же: ресторан — диваны-банкетки в коже, кресла, столы по размеру зала. Объект: название / город. Расскажите, пожалуйста, как вы работаете с объектами.'
  };
  d.querySelectorAll('[data-wa]').forEach((a) => {
    const key = a.getAttribute('data-wa');
    if (MSG[key]) a.href = wa(MSG[key]);
  });

  /* ---------- шапка: линия при скролле, прячется на телефоне ---------- */
  const nav = d.getElementById('nav');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 24);
    if (innerWidth < 900) {
      if (y > lastY && y > 120) nav.classList.add('is-hidden');
      else nav.classList.remove('is-hidden');
    } else nav.classList.remove('is-hidden');
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- scrollspy ---------- */
  const links = [...d.querySelectorAll('.nav__menu a')];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-40% 0px -55%' });
  links.forEach((l) => { const t = d.querySelector(l.getAttribute('href')); if (t) spy.observe(t); });

  /* ---------- полноэкранное меню ---------- */
  const menu = d.getElementById('menu');
  const menuOpen = d.getElementById('menu-open');
  const menuClose = d.getElementById('menu-close');
  const focusables = (root) => [...root.querySelectorAll('a[href], button:not([disabled])')];
  function openMenu() {
    menu.hidden = false; d.body.classList.add('is-locked'); menuOpen.setAttribute('aria-expanded', 'true');
    menuClose.focus();
  }
  function closeMenu() {
    menu.hidden = true; d.body.classList.remove('is-locked'); menuOpen.setAttribute('aria-expanded', 'false');
    menuOpen.focus();
  }
  menuOpen.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);
  menu.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) closeMenu(); });
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(menu); const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------- появление по скроллу ---------- */
  if (reduced || !('IntersectionObserver' in window)) {
    d.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
        const idx = siblings.indexOf(el);
        el.style.transitionDelay = (Math.min(idx, 6) * 80) + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });
    d.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    // у самого низа страницы показываем всё, что осталось
    addEventListener('scroll', () => {
      if (innerHeight + scrollY >= d.documentElement.scrollHeight - 40) d.querySelectorAll('.reveal:not(.is-in)').forEach((el) => el.classList.add('is-in'));
    }, { passive: true });
  }
  requestAnimationFrame(() => d.documentElement.classList.add('is-ready'));

  /* ---------- липкая плашка телефона ---------- */
  const sticky = d.getElementById('sticky');
  const heroEl = d.getElementById('top');
  let heroGone = false, contactsSeen = false, fillSeen = false;
  const updateSticky = () => {
    const open = d.body.classList.contains('is-locked');
    sticky.classList.toggle('is-visible', heroGone && !contactsSeen && !fillSeen && !open);
  };
  new IntersectionObserver((en) => { heroGone = !en[0].isIntersecting && en[0].boundingClientRect.bottom < 0; updateSticky(); }, { threshold: 0 }).observe(heroEl);
  const endIO = new IntersectionObserver((en) => { contactsSeen = en.some((e) => e.isIntersecting); updateSticky(); }, { threshold: 0.15 });
  ['contacts', 'showroom'].forEach((id) => { const el = d.getElementById(id); if (el) endIO.observe(el); });
  d.querySelector('footer') && endIO.observe(d.querySelector('footer'));
  const fillIO = new IntersectionObserver((en) => { fillSeen = en.some((e) => e.isIntersecting); updateSticky(); }, { threshold: 0.9 });
  d.querySelectorAll('main .button--fill[data-wa]').forEach((b) => fillIO.observe(b));

  /* ---------- Подборка ---------- */
  const KEY = 'ricca-shortlist-v1';
  const dlg = d.getElementById('shortlist');
  const list = d.getElementById('shortlist-list');
  const empty = d.getElementById('shortlist-empty');
  const count = d.getElementById('shortlist-count');
  const heartNav = d.getElementById('shortlist-open');
  const send = d.getElementById('shortlist-send');
  const toast = d.getElementById('toast');
  let items = [];
  try { items = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(items)) items = []; } catch (e) { items = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* приватный режим */ } };
  const plural = (n) => n % 10 === 1 && n % 100 !== 11 ? 'позиция' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'позиции' : 'позиций');
  function render() {
    const n = items.length;
    count.hidden = n === 0; count.textContent = n;
    heartNav.classList.toggle('is-on', n > 0);
    heartNav.setAttribute('aria-label', n ? `Подборка: ${n}` : 'Подборка, пусто');
    list.innerHTML = '';
    items.forEach((t) => {
      const li = d.createElement('li');
      const s = d.createElement('span'); s.textContent = t;
      const b = d.createElement('button'); b.className = 'heart'; b.type = 'button'; b.setAttribute('aria-label', 'Убрать ' + t);
      b.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-close"/></svg>';
      b.addEventListener('click', () => toggle(t, false));
      li.append(s, b); list.append(li);
    });
    empty.hidden = n > 0;
    send.hidden = n === 0;
    const onlyEluna = n > 0 && items.every((t) => t.startsWith('Eluna'));
    const head = onlyEluna ? 'Здравствуйте! Хочу заказать матрас ELUNA. Моя подборка:' : 'Здравствуйте! Моя подборка на сайте RICCA DESIGNS:';
    send.href = wa(head + '\n' + items.map((t, i) => `${i + 1}. ${t}`).join('\n') + '\nРасскажите, пожалуйста, подробнее и помогите с выбором.');
    d.querySelectorAll('[data-shortlist]').forEach((b) => {
      const on = items.includes(b.getAttribute('data-shortlist'));
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      const lbl = b.querySelector('span'); if (lbl) lbl.textContent = on ? 'В подборке' : 'В подборку';
    });
  }
  let toastT;
  function showToast(text) {
    toast.textContent = text; toast.hidden = false; clearTimeout(toastT);
    toastT = setTimeout(() => { toast.hidden = true; }, 2000);
  }
  function toggle(title, force) {
    const has = items.includes(title);
    const want = force === undefined ? !has : force;
    if (want && !has) { if (items.length >= 12) { showToast('В подборке не больше 12 позиций'); return; } items.push(title); showToast('Добавлено в подборку'); }
    if (!want && has) items.splice(items.indexOf(title), 1);
    save(); render();
  }
  d.querySelectorAll('[data-shortlist]').forEach((b) => b.addEventListener('click', () => toggle(b.getAttribute('data-shortlist'))));
  let lastFocus;
  function openShortlist() {
    lastFocus = d.activeElement;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    d.body.classList.add('is-locked'); updateSticky();
    requestAnimationFrame(() => dlg.classList.add('is-in'));
    d.getElementById('shortlist-close').focus();
  }
  function closeShortlist() {
    dlg.classList.remove('is-in');
    const done = () => { if (dlg.open) dlg.close(); d.body.classList.remove('is-locked'); updateSticky(); if (lastFocus) lastFocus.focus(); };
    reduced ? done() : setTimeout(done, 300);
  }
  heartNav.addEventListener('click', openShortlist);
  d.getElementById('shortlist-close').addEventListener('click', closeShortlist);
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeShortlist(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeShortlist(); });
  dlg.querySelector('[data-close-shortlist]').addEventListener('click', closeShortlist);
  d.getElementById('shortlist-clear').addEventListener('click', () => {
    if (!items.length) return;
    if (confirm('Очистить? Список нельзя будет вернуть.')) { items = []; save(); render(); }
  });
  render();

  /* ---------- ELUNA: слабое звёздное поле (статичное, только внутри #eluna) ---------- */
  const eluna = d.getElementById('eluna');
  const canvas = eluna && eluna.querySelector('.eluna__stars');
  if (canvas && !reduced) {
    const draw = () => {
      const r = eluna.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(r.width), h = Math.round(eluna.offsetHeight);
      canvas.width = w * dpr; canvas.height = h * dpr;
      const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
      const n = Math.floor((w * h) / (innerWidth < 600 ? 14000 : 9000));
      let seed = 7;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      for (let i = 0; i < n; i++) {
        const x = rnd() * w, y = rnd() * h, rad = 0.3 + rnd() * 1.1, a = 0.18 + rnd() * 0.42;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fillStyle = `rgba(247,245,240,${a})`; ctx.fill();
      }
    };
    let t; const schedule = () => { clearTimeout(t); t = setTimeout(draw, 120); };
    new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { draw(); o.disconnect(); addEventListener('resize', schedule); } }, { rootMargin: '75% 0px' }).observe(eluna);
  }

  /* ---------- телефон: лента моделей стартует на Prime ---------- */
  const lane = d.querySelector('.mcards'), prime = d.querySelector('.mcard--prime');
  if (lane && prime && innerWidth < 600) {
    new IntersectionObserver((en, o) => {
      if (!en[0].isIntersecting) return;
      lane.scrollLeft = prime.offsetLeft - (lane.clientWidth - prime.offsetWidth) / 2; o.disconnect();
    }, { threshold: 0.2 }).observe(lane);
  }

  /* ---------- Unbounded: догружаем, когда ELUNA приближается ---------- */
  if (eluna && d.fonts) {
    new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { d.fonts.load('500 1em Unbounded'); d.fonts.load('300 1em Unbounded'); o.disconnect(); } }, { rootMargin: '75% 0px' }).observe(eluna);
  }
})();
