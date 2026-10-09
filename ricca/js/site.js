/* RICCA DESIGNS — сайт «Chapitres». Ванильный JS без библиотек.
   Порядок: CONFIG (контакты и тексты WhatsApp) → шапка, меню, якоря → появления → диалоги → фильм по главам → образцы
   → доставка → «Наши работы» и лайтбокс → каталог (данные — js/catalog-data.js) и окно изделия → «Подборка» → липкая плашка.
   Единственный владелец ссылок [data-wa] / [data-tel] — этот файл. ELUNA на сайте RICCA — только карточка-коллаборация и внешние
   ссылки на сайт ELUNA (решение заказчика 9 октября). */
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
      projects: 'Здравствуйте! Хочу обсудить мебель для своей комнаты: гостиная / спальня / столовая / кабинет / другое. Размеры и фото пришлю следующим сообщением.',
      business: 'Здравствуйте! Хочу обсудить проект для бизнеса: отель / ресторан / апарт-комплекс / жилой проект / офис.',
      master: 'Здравствуйте! У меня вопрос к мастеру RICCA.',
      chairs: 'Здравствуйте! Подберите, пожалуйста, стулья или обеденную группу. Комната и число мест: …',
      storage: 'Здравствуйте! Интересует стеллаж или комод в пару к мебели. Пришлите, пожалуйста, варианты.',
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
  let Catalog = null, PD = null;   // каталог и окно изделия — ниже; обработчики якорей обращаются к ним во время клика
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
  $$('[data-wa], [data-wa-text]').forEach((a) => {
    const key = a.dataset.wa;
    if (key && !DYNAMIC_WA.includes(key)) a.href = waUrl(typeof CONFIG.msg[key] === 'string' ? CONFIG.msg[key] : CONFIG.msg.general);
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
    $$('main, .footer, .sticky, .skip-link').forEach((el) => { el.inert = open; });
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

  /* ---------- Якоря: место с учётом шапки и липких фильтров каталога ---------- */
  const catbar = $('[data-catbar]');
  const chipsH = (t) => (catbar && t !== catbar && t.closest('#catalog') && (catbar.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) ? catbar.offsetHeight : 0);
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
    if (a.hasAttribute('data-item') && PD && PD.has(a.dataset.item)) return;   // окно изделия — свой обработчик ниже
    const id = a.getAttribute('href').slice(1);
    if (!id || id === 'main') return;
    const dlg = $('dialog[open]');
    e.preventDefault();
    const go = () => {
      if (Catalog && Catalog.fromHash(id, true)) return;   // #catalog-sofas, #catalog-beds-lift… — фильтр каталога
      if (goTo(id)) { try { history.replaceState(history.state, '', id === 'top' ? location.pathname : `#${id}`); } catch (_) { /* file:// */ } }
    };
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
    let pushed = null, refocus = null;   // refocus: переход «Назад» к адресу с #якорем снимает фокус — возвращаем его после popstate
    function open(dlg, opener, url) {
      if (dlg.open) return;
      const prev = $('dialog[open]');
      dlg._opener = opener || document.activeElement;
      if (prev && dlg._opener && prev.contains(dlg._opener)) dlg._opener = prev._opener;   // из лайтбокса в окно изделия: фокус вернётся туда, откуда открыли лайтбокс
      if (prev) { prev._transfer = true; prev._noFocus = true; prev.close(); }
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      lock();
      if (hasHistory && !pushed) {
        try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; history.pushState({ mdl: dlg.id }, '', url || undefined); pushed = dlg; } catch (_) { pushed = null; }
      } else if (pushed) { pushed = dlg; if (url) { try { history.replaceState({ mdl: dlg.id }, '', url); } catch (_) { /* file:// */ } } }
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
      if (refocus) { const r = refocus; refocus = null; requestAnimationFrame(() => { if (document.contains(r) && !$('dialog[open]')) r.focus({ preventScroll: true }); }); }
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
        if (pushed === dlg && !transfer) { pushed = null; if (!viaPop) { refocus = !noFocus && !dlg._then ? dlg._opener : null; try { history.back(); } catch (_) { /* */ } } }
        lock();
        const then = dlg._then; dlg._then = null;
        if (then) setTimeout(then, viaPop ? 0 : 30);
        else if (!noFocus && dlg._opener && dlg._opener.focus && document.contains(dlg._opener)) dlg._opener.focus({ preventScroll: true });
        updateBar();
      });
    });
    return { open, close };
  })();
  /* ---------- Производство: фильм по главам. Одновременно декодируется ОДИН ролик (механика n4) ---------- */
  const safePlay = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const canWebm = (() => { const v = document.createElement('video'); return !!v.canPlayType && v.canPlayType('video/webm; codecs="vp9"') !== ''; })();
  const clipSrc = (name) => `${CONFIG.video}${name}.${canWebm ? 'webm' : 'mp4'}`;
  const posterOf = (n) => `img/process/${n}.webp`;   // цветные кадры глав (тот же размер 478 × 850)
  const reel = $('[data-reel]');
  if (reel) {
    const grid = reel.parentElement;
    const chs = $$('.ch'), vids = $$('.reel__v', reel);
    const countEl = $('[data-reel-count]', reel), railEl = $('[data-reel-rail]', reel), desc = $('[data-reel-desc]', reel), live = $('[data-reel-live]', reel), toggle = $('[data-reel-toggle]', reel);
    const STEPS = chs.length;
    let active = 0, front = 0, clips = [], inView = false, timer = 0, started = false, releaseT = 0;
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
  const TEXES = ['boucle', 'chenille', 'velour', 'matting', 'tweed', 'plain', 'pattern'];   // img/catalog/tex-*.webp — кадры живых тканей из фото № 34 и 39
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
      tex.style.backgroundImage = `url(img/catalog/tex-${b.dataset.tex}.webp)`;
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
    // 7 образцов (~340 КБ) не спорят с первым экраном: класс .tex-on (CSS подставляет фоны) — когда «Материалы» в экране от нас
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
      // TODO (заказчик): сроки, стоимость, доставка и установка мебели по городам (и в Алматы) — до ответа одинаково честное «называем при заказе»
      if (termsEl) termsEl.textContent = 'Условия называем при заказе';
      waEl.href = waUrl(CONFIG.msg.city(c));
    }
    pick('Алматы', false);
    resizeHooks.push(() => centerChip(chips.find((b) => b.getAttribute('aria-checked') === 'true') || chips[0], false));
  })();

  /* ---------- Номера глав: подряд по видимым главам; меню повторяет номера ---------- */
  const pad2 = (n) => String(n).padStart(2, '0');
  const plural3 = (n, f) => f[n % 10 === 1 && n % 100 !== 11 ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2)];
  function renumberChapters() {
    let n = 0;
    $$('.folio > b').forEach((b) => { if (!b.closest('[hidden]')) b.textContent = pad2(++n); });
    $$('#menu .menu__list a').forEach((a) => { const t = document.getElementById(a.getAttribute('href').slice(1)), f = t && $('.folio > b', t), sm = $('small', a); if (f && sm) sm.textContent = f.textContent; });
  }
  renumberChapters();

  /* ---------- «Наши работы»: 7 работ сразу (телефон — 3), остальные по кнопке; лайтбокс — фото целиком ---------- */
  const worksSec = $('#works'), worksMore = $('[data-works-more]');
  const WORKS = $$('.work[data-work]').map((f, i) => {
    const img = $('img', f), wa = $('a[data-wa-text]', f), h = $('.heart', f), go = $('[data-item]', f);
    const set = img ? (img.getAttribute('srcset') || '').split(',').pop().trim().split(' ')[0] : '';
    return {
      el: f, n: pad2(i + 1), title: $('.work__title', f).innerHTML, what: $('.work__what', f).innerHTML,
      alt: img ? img.alt : '', src: set || (img ? img.getAttribute('src') : ''), small: img ? img.getAttribute('src') : '',
      w: img ? +img.getAttribute('width') || 1200 : 1200, h: img ? +img.getAttribute('height') || 1500 : 1500,
      wa: wa ? wa.href : waUrl(CONFIG.msg.projects), item: go ? go.dataset.item : '',
      sl: h ? { id: h.dataset.slId, title: h.dataset.slTitle, meta: h.dataset.slMeta } : null
    };
  });
  if (worksSec && worksMore) {
    const hiddenWorks = () => WORKS.filter((w) => getComputedStyle(w.el).display === 'none');
    const setMore = () => {
      const n = worksSec.classList.contains('is-open') ? 0 : hiddenWorks().length;
      worksMore.hidden = !n;
      if (n) worksMore.textContent = `Показать ещё ${n} ${plural3(n, ['работу', 'работы', 'работ'])}`;
    };
    worksMore.addEventListener('click', () => {
      const hid = hiddenWorks();
      worksSec.classList.add('is-open');
      worksMore.setAttribute('aria-expanded', 'true');
      worksMore.hidden = true;
      if (hid[0]) $('.work__open', hid[0].el).focus({ preventScroll: true });
    });
    setMore();
    mqPhone.addEventListener('change', setMore);
  }
  const lb = $('#lightbox');
  let lbIdx = 0;
  function lbShow(i) {
    if (!WORKS.length) return;
    lbIdx = (i + WORKS.length) % WORKS.length;
    const p = WORKS[lbIdx];
    const img = $('#lb-img'), box = $('.lightbox__img', lb);
    box.style.setProperty('--ar', `${p.w} / ${p.h}`);
    box.style.setProperty('--arn', (p.w / p.h).toFixed(4));
    img.hidden = false;
    // крупный вариант не пришёл — показываем малый; нет и его — пустое поле тона, без значка битой картинки
    img.onerror = () => { if (p.small && img.getAttribute('src') !== p.small) img.src = p.small; else img.hidden = true; };
    img.alt = p.alt; img.width = p.w; img.height = p.h;
    img.src = p.src;
    $('#lb-n').textContent = p.n; $('#lb-title').innerHTML = p.title; $('#lb-what').innerHTML = p.what;
    $('#lb-wa').href = p.wa;
    const go = $('#lb-item'); go.dataset.item = p.item; go.hidden = !p.item;
    const hb = $('#lb-heart');
    if (p.sl) { hb.hidden = false; hb.dataset.slId = p.sl.id; hb.dataset.slTitle = p.sl.title; hb.dataset.slMeta = p.sl.meta; } else hb.hidden = true;
    $('#lb-count').textContent = `${p.n} / ${pad2(WORKS.length)}`;
    if (slReady) syncShortlist();
  }
  if (lb) {
    const lbWa = $('#lb-wa'); lbWa.target = '_blank'; lbWa.rel = 'noopener';
    $$('[data-lightbox]').forEach((b) => b.addEventListener('click', () => { const i = WORKS.findIndex((w) => w.el.contains(b)); if (i < 0) return; lbShow(i); Modal.open(lb, b); }));
    $('#lb-prev').addEventListener('click', () => lbShow(lbIdx - 1));
    $('#lb-next').addEventListener('click', () => lbShow(lbIdx + 1));
    $$('[data-lb-step]', lb).forEach((b) => b.addEventListener('click', () => lbShow(lbIdx + +b.dataset.lbStep)));
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') lbShow(lbIdx - 1); else if (e.key === 'ArrowRight') lbShow(lbIdx + 1); });
    // свайп — по фото (у .lightbox__img touch-action: pan-y: горизонтальный жест не забирает браузер, вертикальная прокрутка остаётся)
    let sx = null, sy = 0;
    const lbStage = $('.lightbox__img', lb);
    lbStage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    lbStage.addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) lbShow(lbIdx + (dx < 0 ? 1 : -1)); });
    lbStage.addEventListener('pointercancel', () => { sx = null; });
  }

  /* ---------- Каталог: карточка на каждое изделие из js/catalog-data.js ----------
     Фильтры — две группы вкладок (категории и подтипы) с roving tabindex; адрес #catalog-sofas[-modular] открывает фильтр.
     Сначала видно 12 карточек (телефон — 8), «Показать ещё» открывает следующие 12 (8). Фото: интерьер — cover; предметный кадр (studio) — целиком,
     с масштабом по доле предмета в кадре (box), чтобы диваны, кровати и кресла выглядели одного «веса». */
  const CATS = window.RICCA_CATALOG_CATEGORIES || {};
  const ITEMS = (Array.isArray(window.RICCA_CATALOG) ? window.RICCA_CATALOG : []).filter((x) => x && x.id && x.name && x.category && Array.isArray(x.photos) && x.photos.length);
  const ITEM = new Map(ITEMS.map((x) => [x.id, x]));
  const CAT_ORDER = ['sofas', 'beds', 'armchairs', 'chairs', 'tables', 'storage', 'collections-2026'];
  // строчная в начале части фразы, в том числе за открывающей кавычкой: «Гусиная лапка» → «гусиная лапка»
  const lcFirst = (t) => (t ? t.replace(/^([«"(]*)(.)/, (m, q, c) => q + c.toLowerCase()) : t);
  // у изделия без названия модели (имя без латиницы) ткань — часть названия: «Диван с шезлонгом · голубой велюр»
  const isNamed = (it) => /[A-Z]/.test(it.name);
  const labelOf = (it) => (it.subtitle && !isNamed(it) ? `${it.name} · ${lcFirst(it.subtitle)}` : it.name);
  const catLabel = (c) => (CATS[c] && CATS[c].label) || c;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  // типографика: неразрывный пробел после коротких слов, перед тире, в габаритах «2740 × 1090 × 760 мм»
  const typo = (t) => { let h = esc(t).replace(/ — /g, '&nbsp;— ').replace(/ × /g, '&nbsp;×&nbsp;').replace(/(\d) мм/g, '$1&nbsp;мм'); for (let k = 0; k < 2; k++) h = h.replace(/(^|[\s(«])([А-Яа-яЁё]{1,2}) /g, '$1$2&nbsp;'); return h; };
  const fitZoom = (p, frameAR, fill = 0.78) => {
    if (!p || !p.studio || !Array.isArray(p.box) || !p.w || !p.h) return p && p.zoom ? p.zoom : 1;
    const ar = p.w / p.h, iw = Math.min(1, ar / frameAR), ih = Math.min(1, frameAR / ar);
    return Math.max(1, Math.min(fill / (p.box[0] * iw), 0.8 / (p.box[1] * ih), 2.2));
  };
  const itemWa = (it) => waUrl(it.wa || `Здравствуйте! Интересует ${lcFirst(labelOf(it))}. Подскажите, пожалуйста, цену и что нужно для расчёта.`);
  const slOf = (it) => ({ id: `item-${it.id}`, title: labelOf(it), meta: catLabel(it.category) });
  const isPhotoCover = (it) => !it.photos[0].studio;

  // карточка: фото, категория, название, подзаголовок, «Подробнее» и «Узнать цену»; варианты (options) — только в окне «Подробнее»,
  // в карточке они повторяли подзаголовок и три общие фразы
  function cardEl(it) {
    const art = document.createElement('article');
    art.className = 'pcard';
    art.dataset.id = it.id;
    const p1 = it.photos[0], p2 = it.photos[1], lbl = labelOf(it), sl = slOf(it), named = isNamed(it);
    // без названия модели ткань идёт в строку названия курсивом — в сетке нет двух одинаковых заголовков
    const nameHTML = !named && it.subtitle ? `${typo(it.name)}<span class="pcard__fab"> · <em>${typo(lcFirst(it.subtitle))}</em></span>` : typo(it.name);
    const sizes = (z) => `(min-width: 1360px) ${Math.round(310 * z)}px, (min-width: 900px) ${Math.round(30 * z)}vw, ${Math.round(50 * z)}vw`;
    const img = (p, extra, later) => {
      const z = fitZoom(p, 0.8), st = [];
      if (z !== 1) st.push(`--z:${z.toFixed(3)}`);
      if (p.pos) st.push(`object-position:${p.pos}`, `--zo:${p.pos}`);
      const a = later ? 'data-' : '';
      const set = p.src600 ? ` ${a}srcset="${esc(p.src600)} 600w, ${esc(p.src)} ${p.w || 1200}w" sizes="${sizes(z)}"` : '';
      return `<img class="pcard__img${p.studio ? ' is-studio' : ''}${extra}" ${a}src="${esc(p.src600 || p.src)}"${set} alt="${later ? '' : esc(p.alt || lbl)}"${later ? ' aria-hidden="true"' : ''} width="${p.w || 1200}" height="${p.h || 1500}" loading="lazy" decoding="async"${st.length ? ` style="${st.join(';')}"` : ''}>`;
    };
    const notes = it.badge || '';
    art.innerHTML = `<div class="pcard__media${p1.studio ? '' : ' is-photo'}${p2 ? ' has-2' : ''}" data-item="${esc(it.id)}">`
      + img(p1, '', false)
      + (p2 ? img(p2, ` pcard__img--2${p2.studio ? '' : ' is-photo-2'}`, true) : '')
      + `<span class="mark" aria-hidden="true">RICCA DESIGNS</span>`
      + `<button class="heart pcard__heart" type="button" data-sl-id="${esc(sl.id)}" data-sl-title="${esc(sl.title)}" data-sl-meta="${esc(sl.meta)}" aria-pressed="false" aria-label="В подборку: ${esc(lbl)}"><svg class="ico" aria-hidden="true"><use href="#i-heart"/></svg></button></div>`
      + `<div class="pcard__body"><p class="pcard__eb">${esc(catLabel(it.category))}</p><h3 class="pcard__name" data-item="${esc(it.id)}">${nameHTML}</h3>`
      + (it.subtitle && named ? `<p class="pcard__sub" data-item="${esc(it.id)}">${typo(it.subtitle)}</p>` : '')
      + (notes ? `<p class="pcard__note">${esc(notes)}</p>` : '')
      + `<div class="pcard__actions"><button class="button button--outline button--sm pcard__more" type="button" data-item="${esc(it.id)}" aria-label="Подробнее: ${esc(lbl)}">Подробнее</button>`
      + `<a class="pcard__price" href="${esc(itemWa(it))}" target="_blank" rel="noopener" aria-label="Узнать цену в WhatsApp: ${esc(lbl)}"><svg class="ico" aria-hidden="true"><use href="#i-whatsapp"/></svg>Узнать цену</a></div></div>`;
    // второе фото — только по наведению мышью (на телефоне не грузим лишнего), плавная смена после загрузки
    const im2 = $('.pcard__img--2', art);
    if (im2) {
      $('.pcard__media', art).addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || !im2.dataset.src) return;
        im2.addEventListener('load', () => im2.classList.add('is-loaded'), { once: true });
        if (im2.dataset.srcset) { im2.sizes = im2.getAttribute('sizes'); im2.srcset = im2.dataset.srcset; }
        im2.src = im2.dataset.src;
        delete im2.dataset.src; delete im2.dataset.srcset;
      });
    }
    return art;
  }

  // «Все» — один каталог, а не «29 интерьеров, потом 29 рендеров»: интерьерные кадры вперемешку по категориям
  // (диван, кровать, диван, кресло…), и каждая третья карточка — чистый предметный рендер (2 : 1, категория не как у соседа).
  // Порядок интерьеров: сначала обложки, которых нет нигде в «Наших работах»; потом те, что есть только среди скрытых работ;
  // в конец — уже видимые рядом (первый экран, ателье, работы до «Показать все работы») и повтор одной обложки у двух изделий.
  const stemOf = (src) => String(src || '').split('/').pop().replace(/(-600)?\.webp$/, '');
  function allOrder() {
    const seen = new Set($$('.hero img, .atelier img, .works .work:not([data-more]) img').map((im) => stemOf(im.getAttribute('src'))));
    const inWorks = new Set($$('.works .work img').map((im) => stemOf(im.getAttribute('src'))));
    const tiers = [{}, {}, {}], studio = {}, used = new Set();
    ITEMS.forEach((it) => {
      if (!isPhotoCover(it)) { (studio[it.category] = studio[it.category] || []).push(it); return; }
      const k = stemOf(it.photos[0].src);
      const q = tiers[seen.has(k) || used.has(k) ? 2 : (inWorks.has(k) ? 1 : 0)];
      (q[it.category] = q[it.category] || []).push(it);
      used.add(k);
    });
    // подряд в одной категории не ставим два изделия с одинаковым названием («Диван с шезлонгом» в двух тканях)
    const take = (q, prev) => { const i = prev ? q.findIndex((x) => x.name !== prev.name) : 0; return q.splice(i < 0 ? 0 : i, 1)[0]; };
    const pattern = ['sofas', 'beds', 'sofas', 'armchairs'], photos = [];
    tiers.forEach((photo) => {
      const last = {};
      const put = (c) => { if (photo[c] && photo[c].length) { last[c] = take(photo[c], last[c]); photos.push(last[c]); } };
      for (let guard = 0; Object.values(photo).some((q) => q.length) && guard < 500; guard++) {
        pattern.forEach(put);
        Object.keys(photo).forEach((c) => { if (!pattern.includes(c)) put(c); });
      }
    });
    // рендеры: больше всего осталось — первым (диваны и кровати раньше столов), не той же категории, что у соседней
    // карточки и у прошлого рендера
    const rCats = Object.keys(studio);
    let lastR = null;
    const nextRender = (prevCat) => {
      const left = rCats.filter((c) => studio[c].length);
      if (!left.length) return null;
      const pool = left.filter((c) => c !== prevCat && c !== lastR);
      const c = (pool.length ? pool : left).sort((a, b) => studio[b].length - studio[a].length)[0];
      lastR = c;
      return studio[c].shift();
    };
    const out = [];
    while (photos.length || rCats.some((c) => studio[c].length)) {
      const prev = out[out.length - 1];
      const r = (out.length % 3 === 1 || !photos.length) ? nextRender(prev && prev.category) : null;
      out.push(r || photos.shift());
    }
    return out.filter(Boolean);
  }

  Catalog = (() => {
    const grid = $('[data-cat-grid]');
    if (!grid || !ITEMS.length) return null;
    const tabsBox = $('[data-cat-tabs]'), subBox = $('[data-cat-subtabs]'), status = $('[data-cat-status]'), moreBtn = $('[data-cat-more]');
    const how = $('[data-cathow]'), howWhat = $('[data-cathow-what]'), anchor = $('#catalog-start');
    const PAGE = mqPhone.matches ? 8 : 12;   // телефон: 4 ряда по 2 — до «Показать ещё» не нужно долго листать
    const cards = allOrder().map((it) => ({ it, el: cardEl(it) }));
    grid.replaceChildren(...cards.map((c) => c.el));
    const counts = {};
    ITEMS.forEach((it) => { counts[it.category] = (counts[it.category] || 0) + 1; });
    const cats = CAT_ORDER.filter((c) => counts[c]).concat(Object.keys(counts).filter((c) => !CAT_ORDER.includes(c)));
    const state = { cat: 'all', sub: 'all', shown: PAGE };   // shown растёт страницами: «Показать ещё» открывает следующие PAGE, а не всё сразу
    const tabHTML = (v, label, n, sub) => `<button class="ctab${sub ? ' ctab--sub' : ''}" type="button" role="tab" id="${sub ? 'csub' : 'ctab'}-${esc(v)}" data-v="${esc(v)}" aria-selected="false" aria-controls="catalog-grid" tabindex="-1">${esc(label)} <small>${n}</small></button>`;
    tabsBox.innerHTML = tabHTML('all', 'Все', ITEMS.length) + cats.map((c) => tabHTML(c, (CATS[c] && CATS[c].chip) || c, counts[c])).join('');
    const subTabs = (cat) => {
      const tg = CATS[cat] && CATS[cat].tags;
      if (!tg) return '';
      const list = ITEMS.filter((i) => i.category === cat);
      const rows = Object.keys(tg).map((k) => [k, tg[k], list.filter((i) => (i.tags || []).includes(k)).length]).filter((r) => r[2]);
      return rows.length ? tabHTML('all', `Все ${(CATS[cat].how || catLabel(cat)).toLowerCase()}`, list.length, true) + rows.map((r) => tabHTML(r[0], r[1], r[2], true)).join('') : '';
    };
    const center = (box, b) => { if (box.scrollWidth > box.clientWidth) box.scrollTo({ left: b.offsetLeft - (box.clientWidth - b.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' }); };
    const select = (box, v) => $$('.ctab', box).forEach((b) => { const on = b.dataset.v === v; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on) center(box, b); });
    const matches = (it) => (state.cat === 'all' || it.category === state.cat) && (state.sub === 'all' || (it.tags || []).includes(state.sub));
    function apply(anim) {
      select(tabsBox, state.cat);
      const sub = state.cat === 'all' ? '' : subTabs(state.cat);
      if (sub) {
        if (subBox.dataset.cat !== state.cat) { subBox.innerHTML = sub; subBox.dataset.cat = state.cat; subBox.setAttribute('aria-label', `Тип: ${catLabel(state.cat).toLowerCase()}`); }
        subBox.hidden = false;
        if (!$(`.ctab[data-v="${state.sub}"]`, subBox)) state.sub = 'all';
        select(subBox, state.sub);
      } else { subBox.hidden = true; subBox.dataset.cat = ''; state.sub = 'all'; }
      let n = 0, shown = 0;
      cards.forEach((c) => { const m = matches(c.it); if (m) n++; const vis = m && n <= state.shown; c.el.hidden = !vis; if (vis) shown++; });
      const rest = n - shown;
      moreBtn.hidden = rest <= 0;
      // хвост меньше полстраницы не оставляем отдельным нажатием: «ещё 10», а не «ещё 8» и потом «ещё 2»
      state.step = rest <= PAGE + Math.ceil(PAGE / 2) ? rest : PAGE;
      if (rest > 0) moreBtn.textContent = state.step < rest ? `Показать ещё ${state.step} · осталось ${rest}` : `Показать ещё ${rest} ${plural3(rest, ['изделие', 'изделия', 'изделий'])}`;
      const subLabel = state.sub !== 'all' && CATS[state.cat] && CATS[state.cat].tags ? ` · ${CATS[state.cat].tags[state.sub]}` : '';
      status.textContent = `${state.cat === 'all' ? '' : `${catLabel(state.cat)}${subLabel} · `}${n} ${plural3(n, ['изделие', 'изделия', 'изделий'])}`;
      grid.setAttribute('aria-labelledby', `ctab-${state.cat}${state.sub !== 'all' ? ` csub-${state.sub}` : ''}`);
      if (how) {
        let any = false;
        $$('[data-cathow-cat]', how).forEach((d) => { const on = state.cat === 'all' || d.dataset.cathowCat === state.cat; d.hidden = !on; if (on) any = true; });
        how.hidden = !any;
        if (howWhat) howWhat.textContent = state.cat === 'all' ? 'мебель' : ((CATS[state.cat] && CATS[state.cat].how) || catLabel(state.cat).toLowerCase());
      }
      if (anim && !reduceMotion) { grid.classList.remove('is-swap'); void grid.offsetWidth; grid.classList.add('is-swap'); }
    }
    const barTop = () => anchor.getBoundingClientRect().top + window.scrollY + parseFloat(getComputedStyle(catbar).marginTop || 0);
    function scrollToBar(smooth) {
      programmatic = Date.now();
      nav.classList.remove('is-hidden'); root.classList.remove('nav-hidden');
      window.scrollTo({ top: Math.max(0, barTop() - nav.offsetHeight + 1), behavior: reduceMotion || !smooth ? 'auto' : 'smooth' });
    }
    function set(cat, sub, o = {}) {
      if (cat !== 'all' && !counts[cat]) cat = 'all';
      const changed = cat !== state.cat || sub !== state.sub;
      state.cat = cat; state.sub = sub || 'all';
      if (changed) state.shown = PAGE;
      apply(changed && o.anim !== false);
      if (o.hash !== false) {
        const h = state.cat === 'all' ? '#catalog' : `#catalog-${state.cat}${state.sub !== 'all' ? `-${state.sub}` : ''}`;
        try { history.replaceState(history.state, '', h); } catch (_) { /* file:// */ }
      }
      // полоса фильтров уже прилипла (листали сетку) — после смены фильтра сетка начинается сверху
      if (o.scroll || (changed && window.scrollY > barTop() - nav.offsetHeight + 4)) scrollToBar(!!o.scroll);
    }
    tabsBox.addEventListener('click', (e) => { const b = e.target.closest('.ctab'); if (b) set(b.dataset.v, 'all'); });
    subBox.addEventListener('click', (e) => { const b = e.target.closest('.ctab'); if (b) set(state.cat, b.dataset.v); });
    [tabsBox, subBox].forEach((box) => box.addEventListener('keydown', (e) => {
      const list = $$('.ctab', box), i = list.indexOf(document.activeElement);
      if (i < 0) return;
      let n = -1;
      if (e.key === 'ArrowRight') n = (i + 1) % list.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + list.length) % list.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = list.length - 1;
      if (n < 0) return;
      e.preventDefault();
      list[n].click();
      const again = $$('.ctab', box)[n]; if (again) again.focus({ preventScroll: true });
    }));
    moreBtn.addEventListener('click', () => {
      const before = new Set(cards.filter((c) => !c.el.hidden).map((c) => c.el));
      state.shown += state.step || PAGE; apply(false);
      const first = cards.find((c) => !c.el.hidden && !before.has(c.el));
      if (first) $('.pcard__more', first.el).focus({ preventScroll: true });
    });
    // адрес: #catalog-all, #catalog-sofas, #catalog-sofas-modular, #catalog-beds-lift …
    function parse(id) {
      const m = /^catalog-([a-z0-9]+(?:-2026)?)(?:-([a-z]+))?$/.exec(id || '');
      if (!m || document.getElementById(id)) return null;
      let cat = m[1] === 'collections' ? 'collections-2026' : m[1], sub = m[2] || 'all';
      if (cat === 'collections-2026' && sub === '2026') sub = 'all';
      return cat === 'all' || CATS[cat] || counts[cat] ? { cat, sub } : null;
    }
    function fromHash(id, scroll) {
      const r = parse(id);
      if (!r) return false;
      set(r.cat, r.sub, { scroll, anim: !!scroll });
      if (scroll) { const t = $('.ctab[aria-selected="true"]', r.sub !== 'all' ? subBox : tabsBox); if (t) t.focus({ preventScroll: true }); }
      return true;
    }
    const start = parse(location.hash.slice(1));
    if (start) { state.cat = start.cat; state.sub = start.sub; }
    apply(false);
    return { fromHash, scrollToBar };
  })();

  /* ---------- Окно изделия «Подробнее»: галерея (свайп, стрелки, миниатюры, ←/→), паспорт, WhatsApp, «В подборку» ---------- */
  PD = (() => {
    const dlg = $('#product');
    if (!dlg || !ITEMS.length) return null;
    const stage = $('[data-pd-stage]', dlg), img = $('[data-pd-img]', dlg), mark = $('.mark', stage);
    const frame = document.createElement('div');
    frame.className = 'pdlg__frame';
    stage.insertBefore(frame, img);
    frame.append(img, mark);
    const prev = $('[data-pd-prev]', dlg), next = $('[data-pd-next]', dlg), count = $('[data-pd-count]', dlg), thumbsBox = $('[data-pd-thumbs]', dlg);
    const eb = $('[data-pd-eb]', dlg), title = $('[data-pd-title]', dlg), sub = $('[data-pd-sub]', dlg), badge = $('[data-pd-badge]', dlg);
    const desc = $('[data-pd-desc]', dlg), chips = $('[data-pd-chips]', dlg), passport = $('[data-pd-passport]', dlg), wa = $('[data-pd-wa]', dlg), heart = $('[data-pd-heart]', dlg);
    let cur = null, idx = 0, thumbs = [];
    function layout() {
      const p = cur && cur.photos[idx];
      if (!p) return;
      const sw = stage.clientWidth, sh = stage.clientHeight;
      if (!sw || !sh) return;
      if (p.studio) {
        frame.style.width = `${sw}px`; frame.style.height = `${sh}px`;
        img.style.setProperty('--z', fitZoom(p, sw / sh, 0.84).toFixed(3));
      } else {
        const k = Math.min(sw / (p.w || 1200), sh / (p.h || 1500));
        frame.style.width = `${Math.round((p.w || 1200) * k)}px`; frame.style.height = `${Math.round((p.h || 1500) * k)}px`;
        img.style.removeProperty('--z');
      }
      frame.classList.toggle('is-photo', !p.studio);
    }
    function show(i) {
      const ph = cur.photos;
      idx = (i + ph.length) % ph.length;
      const p = ph[idx];
      frame.classList.add('is-loading');
      img.onload = () => frame.classList.remove('is-loading');
      img.onerror = () => { if (p.src600 && img.getAttribute('src') !== p.src600) img.src = p.src600; else frame.classList.remove('is-loading'); };
      img.alt = p.alt || labelOf(cur);
      img.width = p.w || 1200; img.height = p.h || 1500;
      if (p.src600) { img.sizes = '(min-width: 900px) 720px, 100vw'; img.srcset = `${p.src600} 600w, ${p.src} ${p.w || 1200}w`; } else { img.removeAttribute('srcset'); img.removeAttribute('sizes'); }
      img.src = p.src;
      if (img.complete && img.naturalWidth) frame.classList.remove('is-loading');
      layout();
      count.innerHTML = ph.length > 1 ? `<span aria-hidden="true">${pad2(idx + 1)} / ${pad2(ph.length)}</span><span class="sr-only">Фото ${idx + 1} из ${ph.length}</span>` : '';
      thumbs.forEach((t, j) => t.setAttribute('aria-current', String(j === idx)));
      const t = thumbs[idx];
      if (t && thumbsBox.scrollWidth > thumbsBox.clientWidth) thumbsBox.scrollTo({ left: t.offsetLeft - (thumbsBox.clientWidth - t.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    function open(id, opener, at = 0) {
      const it = ITEM.get(id);
      if (!it) return false;
      cur = it;
      const tags = CATS[it.category] && CATS[it.category].tags ? (it.tags || []).map((k) => CATS[it.category].tags[k]).filter(Boolean) : [];
      eb.innerHTML = [catLabel(it.category)].concat(tags.slice(0, 1)).map((t) => `<span>${esc(t)}</span>`).join('');
      title.innerHTML = typo(it.name);
      sub.innerHTML = it.subtitle ? typo(it.subtitle) : ''; sub.hidden = !it.subtitle;
      const notes = it.badge || '';
      badge.textContent = notes; badge.hidden = !notes;
      desc.innerHTML = typo(it.description || ''); desc.hidden = !it.description;
      chips.innerHTML = (it.options || []).map((o) => `<li>${typo(o)}</li>`).join(''); chips.hidden = !(it.options || []).length;
      const wood = it.category === 'tables' || it.category === 'storage';
      const rows = [['Размеры', it.sizes], [wood ? 'Материал' : 'Ткань и&nbsp;кожа', it.materials], ['Наполнение', it.filling], ['Механизм', it.mechanism], ['Срок', it.lead], ['Гарантия', it.warranty], ['Доставка', it.delivery]].filter((r) => r[1]);
      passport.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${typo(v)}</dd></div>`).join('');
      wa.href = itemWa(it);
      const sl = slOf(it);
      heart.dataset.slId = sl.id; heart.dataset.slTitle = sl.title; heart.dataset.slMeta = sl.meta;
      const n = it.photos.length;
      thumbs = it.photos.map((p, j) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = `pdlg__thumb${p.studio ? ' is-studio' : ''}`;
        b.setAttribute('aria-label', `Фото ${j + 1} из ${n}`);
        b.innerHTML = `<img src="${esc(p.src600 || p.src)}" alt="" width="${p.w || 1200}" height="${p.h || 1500}" loading="lazy" decoding="async"${p.studio ? ` style="--z:${fitZoom(p, 1, 0.92).toFixed(3)}"` : ''}>`;
        b.addEventListener('click', () => show(j));
        return b;
      });
      thumbsBox.replaceChildren(...thumbs);
      thumbsBox.hidden = n < 2; prev.hidden = next.hidden = n < 2;
      if (slReady) syncShortlist();
      Modal.open(dlg, opener, `#item-${it.id}`);
      dlg.scrollTop = 0;
      show(at);
      requestAnimationFrame(layout);
      return true;
    }
    prev.addEventListener('click', () => show(idx - 1));
    next.addEventListener('click', () => show(idx + 1));
    dlg.addEventListener('keydown', (e) => {
      if (!cur || cur.photos.length < 2 || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); } else if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
    });
    let sx = null, sy = 0;
    stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    stage.addEventListener('pointerup', (e) => { if (sx == null || !cur) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (cur.photos.length > 1 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) show(idx + (dx < 0 ? 1 : -1)); });
    stage.addEventListener('pointercancel', () => { sx = null; });
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (dlg.open) layout(); }).observe(stage);
    else resizeHooks.push(() => { if (dlg.open) layout(); });
    return { open, has: (id) => ITEM.has(id) };
  })();
  // любая кнопка или ссылка с data-item (карточка, «Смотреть в каталоге», подпись первого экрана, «Для бизнеса») открывает окно изделия
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-item]');
    if (!t || !PD || e.target.closest('[data-sl-id]') || !PD.has(t.dataset.item)) return;
    if (t.tagName === 'A' && (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)) return;
    e.preventDefault();
    // фото, название и подзаголовок карточки (не фокусируются) открывают окно; фокус после закрытия — на «Подробнее»
    const card = !t.matches('a, button') && t.closest('.pcard');
    const opener = card ? ($('.pcard__more', card) || t) : t;
    PD.open(t.dataset.item, opener);
  });

  /* ---------- «Подборка»: список → одно сообщение WhatsApp (localStorage ricca-shortlist-v2, до 12 позиций) ---------- */
  const SL_KEY = 'ricca-shortlist-v2';
  let items = store.get(SL_KEY, null);
  if (!Array.isArray(items)) {
    const old = store.get('ricca-shortlist-v1', []);
    items = Array.isArray(old) ? old.filter((t) => typeof t === 'string').map((t, i) => ({ id: `old-${i}`, title: t, meta: '' })) : [];
  }
  // прежние позиции, которых на сайте больше нет (ELUNA, ИИ-проекты, категории-заглушки), из подборки убираем
  items = items.filter((x) => x && x.id && x.title && !/^(eluna|project-|cat-)/i.test(x.id) && !/^Eluna /.test(x.title)).slice(0, 12);
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
  // миниатюра строки подборки: обложка изделия из каталога, кадр работы, палитра тканей (№ 34) — по id, без хранения ссылок
  function thumbOf(id) {
    const it = /^item-/.test(id) && ITEM.get(id.slice(5)), p = it && it.photos[0];
    if (p) return { src: p.src600 || p.src, w: p.w, h: p.h, studio: !!p.studio, z: p.studio ? fitZoom(p, 0.8) : 1 };
    const w = /^work-/.test(id) && WORKS.find((x) => x.sl && x.sl.id === id);
    if (w && w.small) return { src: w.small, w: w.w, h: w.h };
    const fab = /^fabric-(.+)$/.exec(id);   // ткань — её образец; старые id из прошлой версии — палитра № 34
    if (fab) return TEXES.includes(fab[1]) ? { src: `img/catalog/tex-${fab[1]}.webp`, w: 400, h: 400 } : { src: 'img/catalog/34-fabrics-palette-grid-600.webp', w: 600, h: 750 };
    return null;
  }
  function renderSL() {
    const n = items.length;
    slList.replaceChildren(...items.map((it) => {
      const li = document.createElement('li');
      const th = thumbOf(it.id), fig = document.createElement('span');
      fig.className = `sl__img${th && th.studio ? ' is-studio' : ''}`; fig.setAttribute('aria-hidden', 'true');
      if (th) {
        const im = document.createElement('img');
        im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = th.w || 600; im.height = th.h || 750; im.src = th.src;
        if (th.z && th.z !== 1) im.style.setProperty('--z', th.z.toFixed(3));
        im.addEventListener('error', () => im.remove(), { once: true });
        fig.append(im);
      }
      const t = document.createElement('span'); t.className = 'sl__t'; t.textContent = it.title;
      const m = document.createElement('span'); m.className = 'sl__m'; m.textContent = it.meta || '';
      const b = document.createElement('button'); b.className = 'heart'; b.type = 'button'; b.setAttribute('aria-label', `Убрать: ${it.title}`);
      b.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-close"/></svg>';
      // renderSL() пересобирает список — фокус ставим по индексу в новом списке, а не на отсоединённый узел
      b.addEventListener('click', () => { const idx = Array.prototype.indexOf.call(slList.children, li); remove(it.id); const li2 = slList.children[Math.min(idx, slList.children.length - 1)]; (li2 ? $('button', li2) : $('[data-close]', dlgSL)).focus(); });
      li.append(fig, t, m, b);
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
    const host = $('dialog[open]') || body;   // открыт диалог (окно изделия, лайтбокс) — тост внутри него, иначе его не видно
    if (toast.parentElement !== host) host.append(toast);
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
  // подборка открыта — тост «Добавлено в подборку · Открыть» уже не нужен и не должен просвечивать под панелью
  const openSL = () => { clearTimeout(toastT); toast.hidden = true; Modal.open(dlgSL, heartNav); };
  heartNav.addEventListener('click', openSL);
  $('#toast-open').addEventListener('click', openSL);
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
  // подсветка меню: глава под линией шапки — из ВСЕХ глав; у глав без пункта меню (Производство, Материалы, Доставка…) не подсвечено ничего
  const sections = $$('section[id]');
  const bar = $('[data-mbar]'), barWa = $('[data-mbar-wa]'), barLabel = $('[data-mbar-label]');
  const heroCta = $('[data-hero-cta]'), endCh = $('.endchapter'), materials = $('#materials');
  const catGridEl = $('[data-cat-grid]');
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
      // листают сетку каталога (фильтры прилипли, карточки во весь экран) — у каждой карточки своя «Узнать цену»,
      // плашка только отнимала бы место у карточек
      const g = catGridEl && !catGridEl.hidden ? catGridEl.getBoundingClientRect() : null;
      const inGrid = !!g && g.top < vh * 0.35 && g.bottom > vh * 0.8;
      const on = isMobile() && ctaGone && !endSeen && !menuOpen && !dlgOpen && fills.size === 0 && !inGrid;
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
      const line = navH() + 1;
      for (const s of sections) { const r = s.getBoundingClientRect(); if (r.top <= line && r.bottom > line) current = s; }
      if (!current && endCh && endCh.getBoundingClientRect().top <= line) current = endCh;   // подвал (под шоурумом, вне <main>) — та же чёрная глава, что и шоурум
      if (y + vh >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1] || current;   // низ страницы: последняя глава (шоурум) не доходит до шапки
      navLinks.forEach((a) => { const on = !!current && a.getAttribute('href') === `#${current.id}`; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      updateBar();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  resizeHooks.push(() => onScroll());
  onScroll();

  /* ---------- Поздний viewport; хэш при загрузке ---------- */
  requestAnimationFrame(() => { if (window.innerWidth !== lastW || window.innerHeight !== lastH) onResize(true); });
  if (location.hash.length > 1) window.addEventListener('load', () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (/^item-/.test(id) && PD && PD.has(id.slice(5))) {
      // ссылка на изделие: каталог под окном, «Назад» закрывает окно и остаётся на сайте
      try { history.replaceState(null, '', '#catalog'); } catch (_) { /* file:// */ }
      if (Catalog) Catalog.scrollToBar(false);
      setTimeout(() => PD.open(id.slice(5), null), 60);
    } else if (Catalog && Catalog.fromHash(id, false)) setTimeout(() => Catalog.scrollToBar(false), 60);
    else if (document.getElementById(id)) setTimeout(() => goTo(id, false), 60);
  });
})();
