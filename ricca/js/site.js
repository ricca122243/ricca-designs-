/* RICCA DESIGNS — сайт «Chapitres». Ванильный JS без библиотек.
   Порядок: CONFIG (контакты и тексты WhatsApp) → шапка, меню, якоря → свёртки, чипы, появления → диалоги → фильм по главам
   → образцы → доставка → проекты и лайтбокс → «Подборка» → липкая плашка. Единственный владелец ссылок [data-wa] / [data-tel] —
   этот файл. ELUNA на сайте RICCA — только карточка-новость и внешние ссылки на сайт бренда (решение заказчика 9 октября). */
(() => {
  'use strict';

  /* ---------- CONFIG: номера и готовые тексты WhatsApp (CONTENT-V3 §27) — менять здесь ---------- */
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
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;
  let barRaf = 0, slReady = false;
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

  /* ---------- Телефоны и WhatsApp из CONFIG ---------- */
  const waUrl = (text) => `https://wa.me/${CONFIG.wa}?text=${encodeURIComponent(text)}`;
  $$('[data-tel]').forEach((a) => { const t = CONFIG.tel[a.dataset.tel]; if (t) a.href = `tel:${t.href}`; });
  const DYNAMIC_WA = ['fabric', 'delivery'];
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
    return r.top - shift + window.scrollY - nav.offsetHeight - chipsH(target) - (isMobile() ? 12 : 24);
  }
  function goTo(id, smooth = true) {
    const beh = reduceMotion || !smooth ? 'auto' : 'smooth';
    if (id === 'top') { programmatic = Date.now(); window.scrollTo({ top: 0, behavior: beh }); return true; }
    const target = document.getElementById(id);
    if (!target) return false;
    if (target.tagName === 'DETAILS') target.open = true;
    if (!target.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|DETAILS)$/.test(target.tagName)) target.setAttribute('tabindex', '-1');
    programmatic = Date.now();
    nav.classList.remove('is-hidden'); root.classList.remove('nav-hidden');
    window.scrollTo({ top: Math.max(0, scrollYFor(target)), behavior: beh });
    target.focus({ preventScroll: true });
    return true;
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const id = a.getAttribute('href').slice(1);
    if (!id || id === 'main') return;
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

  /* ---------- Доставка: карта и города (координаты — % кадра 2080 × 1174) ---------- */
  (function delivery() {
    const box = $('#cities'), nameEl = $('#cityName'), termsEl = $('#cityTerms'), waEl = $('#cityWa'), waName = $('#cityWaName'), chipsBox = $('#cityChips');
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
      // TODO (заказчик): сроки и стоимость доставки мебели по городам — до ответа только честное «называем при заказе»
      if (termsEl) termsEl.innerHTML = c === 'Алматы' ? 'Привозим и&nbsp;устанавливаем сами' : 'Условия называем при заказе';
      waEl.href = waUrl(CONFIG.msg.city(c));
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
  const coversChanged = () => { if (!coverRaf) coverRaf = requestAnimationFrame(() => { coverRaf = 0; layoutCovers(); }); };
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
  renumberChapters();
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
  items = items.filter((x) => x && x.id && x.title && !/^eluna/i.test(x.id) && !/^Eluna /.test(x.title)).slice(0, 12);
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
    const head = 'Здравствуйте! Моя подборка на сайте RICCA DESIGNS:';
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
    if (b) toggleItem({ id: b.dataset.slId, title: b.dataset.slTitle, meta: b.dataset.slMeta || '' });
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
  try { localStorage.removeItem('ricca-eluna-v1'); } catch (_) { /* приватный режим */ }

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
      const dlgOpen = !!$('dialog[open]');
      const on = isMobile() && ctaGone && !endSeen && !menuOpen && !dlgOpen && fills.size === 0;
      bar.classList.toggle('is-on', on);
      bar.setAttribute('aria-hidden', String(!on));
      $$('a', bar).forEach((a) => { a.tabIndex = on ? 0 : -1; });
      // ссылка первой кнопки — по контексту: в «Материалах» — вопрос про выбранный образец
      let href = barGeneral;
      const mid = vh * 0.5;
      if (materials) { const r = materials.getBoundingClientRect(); if (r.top < mid && r.bottom > mid) href = fabricHref; }
      if (barWa.href !== href) barWa.href = href;
      if (barLabel.textContent !== 'WhatsApp') barLabel.textContent = 'WhatsApp';
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

  /* ---------- Поздний viewport; хэш при загрузке ---------- */
  requestAnimationFrame(() => { if (window.innerWidth !== lastW || window.innerHeight !== lastH) onResize(true); });
  if (location.hash.length > 1) window.addEventListener('load', () => { const id = decodeURIComponent(location.hash.slice(1)); if (document.getElementById(id)) setTimeout(() => goTo(id, false), 60); });
})();
