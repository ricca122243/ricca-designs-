/* RICCA DESIGNS — прототип B «Galleria Nera». Без зависимостей.
   Модули: nav · dialogs (menu / подборка / лайтбокс, жест «назад») · reveal · hero ·
   shortlist (localStorage → одно сообщение WhatsApp) · sticky bar · лента моделей ·
   паспорт на телефоне · ELUNA (Unbounded по наблюдателю, статичные звёзды, счётчики). */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPhone = () => matchMedia('(max-width: 899px)').matches;
  const nav = navigator;
  const TIER = (REDUCED || (nav.connection && nav.connection.saveData) || (nav.deviceMemory && nav.deviceMemory <= 4) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4)) ? 'low' : (isPhone() ? 'mid' : 'high');
  const WA = '77084802047';
  const wa = (msg) => 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);

  /* ---------- Диалоги (нативный <dialog>, фокус, «назад») ---------- */
  let openDialogs = 0;
  const dialogs = new Map();
  function setupDialog(id) {
    const dlg = document.getElementById(id);
    if (!dlg) return null;
    let opener = null;
    const api = {
      el: dlg,
      open(from) {
        if (dlg.open) return;
        opener = from || document.activeElement;
        dlg.showModal();
        openDialogs++;
        document.body.classList.add('is-locked');
        try { history.pushState({ dlg: id }, '', '#' + id); } catch (e) {}
        dlg.dispatchEvent(new CustomEvent('dlg:open'));
        const first = $('[autofocus], [data-close]', dlg);
        if (first) first.focus();
      },
      close(viaHistory) {
        if (!dlg.open) return;
        dlg.close();
        openDialogs = Math.max(0, openDialogs - 1);
        if (!openDialogs) document.body.classList.remove('is-locked');
        if (!viaHistory && history.state && history.state.dlg === id) { try { history.back(); } catch (e) {} }
        else if (!viaHistory && location.hash === '#' + id) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
        dlg.dispatchEvent(new CustomEvent('dlg:close'));
        if (opener && opener.focus) opener.focus();
        syncSticky();
      }
    };
    // клик по подложке
    dlg.addEventListener('click', (e) => { if (e.target === dlg) api.close(); });
    // Esc (нативный cancel) — синхронизируем состояние
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); api.close(); });
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => api.close()));
    dialogs.set(id, api);
    return api;
  }
  window.addEventListener('popstate', () => {
    dialogs.forEach((api) => { if (api.el.open) api.close(true); });
  });
  $$('[data-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const api = dialogs.get(btn.dataset.open);
      if (api) api.open(btn);
    });
  });

  /* ---------- Шапка ---------- */
  const header = $('#nav');
  const menuDlg = setupDialog('menu');
  const burger = $('.nav__burger');
  if (menuDlg && burger) {
    menuDlg.el.addEventListener('dlg:open', () => burger.setAttribute('aria-expanded', 'true'));
    menuDlg.el.addEventListener('dlg:close', () => burger.setAttribute('aria-expanded', 'false'));
  }
  let lastY = window.scrollY, hideFrom = 0;
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    if (REDUCED || openDialogs) { header.classList.remove('is-hidden'); lastY = y; return; }
    if (y > lastY && y > 120) { header.classList.add('is-hidden'); hideFrom = y; }
    else if (y < lastY - 2 || y <= 24) header.classList.remove('is-hidden');
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // scrollspy для меню десктопа
  const spyLinks = $$('.nav__menu a[href^="#"]');
  if ('IntersectionObserver' in window && spyLinks.length) {
    const map = new Map();
    spyLinks.forEach((a) => { const t = $(a.getAttribute('href')); if (t) map.set(t, a); });
    const inView = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) inView.add(en.target); else inView.delete(en.target); });
      spyLinks.forEach((a) => a.classList.remove('is-active'));
      inView.forEach((t) => map.get(t).classList.add('is-active'));
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    map.forEach((_, t) => io.observe(t));
  }

  /* ---------- Reveal ---------- */
  const reveals = $$('.reveal');
  if (REDUCED || !('IntersectionObserver' in window)) reveals.forEach((el) => el.classList.add('is-in'));
  else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    reveals.forEach((el) => io.observe(el));
  }
  // hero: строки въезжают после загрузки шрифтов (но не позже 600 мс)
  const hero = $('.hero');
  let heroDone = false;
  const readyHero = () => { if (!heroDone) { heroDone = true; requestAnimationFrame(() => hero.classList.add('is-ready')); } };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(readyHero);
  setTimeout(readyHero, 600);

  /* ---------- Тост ---------- */
  const toast = $('#toast');
  let toastT;
  function showToast(text, actionLabel, action) {
    toast.textContent = text;
    if (actionLabel) { const b = document.createElement('button'); b.type = 'button'; b.textContent = actionLabel; b.addEventListener('click', () => { hideToast(); action(); }); toast.appendChild(b); }
    toast.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(hideToast, actionLabel ? 3200 : 2000);
  }
  function hideToast() { toast.classList.remove('is-on'); }

  /* ---------- «Подборка» ---------- */
  const KEY = 'ricca-shortlist-v1';
  const MAX = 12;
  let list = [];
  try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); if (!Array.isArray(list)) list = []; } catch (e) { list = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} };
  const slDlg = setupDialog('shortlist');
  const slBtn = $('[data-shortlist-btn]');
  const slCount = $('[data-shortlist-count]');
  const slList = $('[data-list]');
  const slEmpty = $('[data-empty]');
  const slFoot = $('[data-foot]');
  const slConfirm = $('[data-confirm]');
  const slWa = $('[data-wa-shortlist]');
  const slDlgCount = $('[data-count]');
  const plural = (n) => { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return 'позиция'; if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'позиции'; return 'позиций'; };
  function slMessage() {
    const onlyEluna = list.length && list.every((it) => it.id.startsWith('eluna-'));
    const head = onlyEluna ? 'Здравствуйте! Хочу заказать матрас ELUNA. Моя подборка:' : 'Здравствуйте! Моя подборка на сайте RICCA DESIGNS:';
    const rows = list.map((it, i) => (i + 1) + '. ' + it.title + (it.meta ? ' · ' + it.meta : ''));
    return [head].concat(rows, ['Расскажите, пожалуйста, подробнее и помогите с выбором.']).join('\n');
  }
  function renderShortlist() {
    const n = list.length;
    if (slCount) { slCount.textContent = n; slCount.hidden = !n; }
    if (slBtn) { slBtn.setAttribute('aria-label', n ? 'Подборка: ' + n : 'Подборка, пусто'); slBtn.classList.toggle('is-filled', n > 0); }
    if (slDlgCount) slDlgCount.textContent = n ? '· ' + n + ' ' + plural(n) : '';
    if (slList) {
      slList.innerHTML = '';
      list.forEach((it) => {
        const li = document.createElement('li');
        const div = document.createElement('div');
        const t = document.createElement('span'); t.className = 't'; t.textContent = it.title;
        const m = document.createElement('span'); m.className = 'm'; m.textContent = it.meta || '';
        div.appendChild(t); div.appendChild(m);
        const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'nav__btn'; rm.setAttribute('aria-label', 'Убрать ' + it.title);
        rm.innerHTML = '<svg class="nav__ico" aria-hidden="true"><use href="#i-close"/></svg>';
        rm.addEventListener('click', () => { remove(it.id); });
        li.appendChild(div); li.appendChild(rm); slList.appendChild(li);
      });
    }
    if (slEmpty) slEmpty.hidden = n > 0;
    if (slFoot) slFoot.hidden = n === 0;
    if (slWa) slWa.href = wa(slMessage());
    $$('[data-shortlist-add]').forEach((b) => {
      const on = list.some((it) => it.id === b.dataset.id);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      const lab = $('[data-label]', b); if (lab) lab.textContent = on ? 'В подборке' : 'В подборку';
    });
  }
  function add(btn) {
    const id = btn.dataset.id;
    if (list.some((it) => it.id === id)) return remove(id);
    if (list.length >= MAX) { showToast('В подборке максимум ' + MAX + ' позиций'); return; }
    list.push({ id, title: btn.dataset.title, meta: btn.dataset.meta || '' });
    save(); renderShortlist();
    showToast('Добавлено в подборку', 'Открыть', () => slDlg && slDlg.open(btn));
  }
  function remove(id) { list = list.filter((it) => it.id !== id); save(); renderShortlist(); }
  $$('[data-shortlist-add]').forEach((b) => b.addEventListener('click', () => add(b)));
  const clearBtn = $('[data-clear]');
  if (clearBtn && slConfirm) {
    clearBtn.addEventListener('click', () => { slConfirm.hidden = false; $('[data-confirm-yes]', slConfirm).focus(); });
    $('[data-confirm-yes]', slConfirm).addEventListener('click', () => { list = []; save(); renderShortlist(); slConfirm.hidden = true; });
    $('[data-confirm-no]', slConfirm).addEventListener('click', () => { slConfirm.hidden = true; clearBtn.focus(); });
  }
  renderShortlist();

  /* ---------- Лайтбокс ---------- */
  const lb = setupDialog('lightbox');
  if (lb) {
    const img = $('[data-lb-img]', lb.el), cap = $('[data-lb-cap]', lb.el);
    const prev = $('[data-lb-prev]', lb.el), next = $('[data-lb-next]', lb.el);
    const triggers = $$('[data-lightbox]');
    let group = [], idx = 0;
    function show(i) {
      const t = group[i]; if (!t) return; idx = i;
      img.src = t.dataset.full; img.width = +t.dataset.w || 513; img.height = +t.dataset.h || 640;
      img.alt = $('img', t) ? $('img', t).alt : '';
      cap.innerHTML = '';
      (t.dataset.caption || '').split(' · ').forEach((s, k) => { const el = document.createElement(k ? 'span' : 'b'); el.textContent = s; cap.appendChild(el); });
      const multi = group.length > 1;
      prev.hidden = next.hidden = !multi;
    }
    triggers.forEach((t) => t.addEventListener('click', () => {
      const g = t.dataset.gallery;
      group = g ? triggers.filter((x) => x.dataset.gallery === g) : [t];
      show(group.indexOf(t)); lb.open(t);
    }));
    prev.addEventListener('click', () => show((idx - 1 + group.length) % group.length));
    next.addEventListener('click', () => show((idx + 1) % group.length));
    lb.el.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') prev.click(); if (e.key === 'ArrowRight') next.click(); });
    let sx = 0;
    lb.el.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    lb.el.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50 && group.length > 1) (dx < 0 ? next : prev).click(); }, { passive: true });
  }

  /* ---------- Липкая плашка (телефон) ---------- */
  const sticky = $('#sticky');
  let heroGone = false, endVisible = false, fillVisible = 0;
  function syncSticky() {
    if (!sticky) return;
    const on = isPhone() && heroGone && !endVisible && !openDialogs && fillVisible === 0;
    sticky.classList.toggle('is-on', on);
    sticky.setAttribute('aria-hidden', on ? 'false' : 'true');
    $$('a', sticky).forEach((a) => a.tabIndex = on ? 0 : -1);
  }
  if ('IntersectionObserver' in window && sticky) {
    const ioHero = new IntersectionObserver((en) => { heroGone = !en[0].isIntersecting && en[0].boundingClientRect.bottom < 0; syncSticky(); }, { threshold: 0 });
    ioHero.observe($('#top'));
    const ends = new Set();
    const ioEnd = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) ends.add(e.target); else ends.delete(e.target); }); endVisible = ends.size > 0; syncSticky(); }, { threshold: 0.15 });
    ioEnd.observe($('#contacts')); ioEnd.observe($('#footer'));
    const fills = $$('.button--fill[href*="wa.me"]').filter((b) => !sticky.contains(b) && !b.closest('dialog'));
    const seen = new Set();
    const ioFill = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); }); fillVisible = seen.size; syncSticky(); }, { threshold: 0.5 });
    fills.forEach((b) => ioFill.observe(b));
    window.addEventListener('resize', syncSticky);
  }

  /* ---------- Лента моделей: на телефоне стартует на Prime ---------- */
  const lane = $('[data-lane]');
  function snapPrime() {
    if (!lane || !isPhone()) return;
    const prime = $('#model-prime', lane);
    if (prime) { const pad = parseFloat(getComputedStyle(lane).paddingLeft) || 0; lane.scrollLeft = lane.scrollLeft + prime.getBoundingClientRect().left - lane.getBoundingClientRect().left - pad; }
  }
  snapPrime();
  window.addEventListener('resize', snapPrime);
  window.addEventListener('load', snapPrime);

  /* ---------- Паспорт: на десктопе всегда раскрыт ---------- */
  const pm = $('[data-passport-more]');
  if (pm) { let wasPhone = isPhone(); pm.open = !wasPhone; window.addEventListener('resize', () => { const p = isPhone(); if (p !== wasPhone) { wasPhone = p; pm.open = !p; } }); }

  /* ---------- ELUNA: шрифт по наблюдателю, звёзды, счётчики ---------- */
  const eluna = $('#eluna');
  if (eluna) {
    const loadFonts = () => {
      if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('500 1em Unbounded'), document.fonts.load('300 1em Unbounded')]).then(() => eluna.classList.add('is-fonts'), () => eluna.classList.add('is-fonts'));
      else eluna.classList.add('is-fonts');
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { loadFonts(); io.disconnect(); } }, { rootMargin: '150% 0px' });
      io.observe(eluna);
    } else loadFonts();

    // статичное звёздное поле — вдвое реже ELUNA, без мерцания; нет на low
    const cv = $('.eluna__stars', eluna);
    if (cv && TIER !== 'low' && !REDUCED) {
      let raf;
      const draw = () => {
        const dpr = Math.min(1.5, devicePixelRatio || 1);
        const w = eluna.clientWidth, h = eluna.clientHeight;
        cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const n = Math.round((w * h) / (isPhone() ? 14000 : 9000));
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < n; i++) {
          const x = rnd() * w, y = rnd() * h, r = 0.3 + rnd() * 1.1, a = 0.18 + rnd() * 0.42;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(244,240,232,' + a.toFixed(2) + ')'; ctx.fill();
        }
      };
      const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
      const ioS = new IntersectionObserver((en) => { if (en[0].isIntersecting) { schedule(); ioS.disconnect(); window.addEventListener('resize', schedule); } }, { rootMargin: '50% 0px' });
      ioS.observe(eluna);
    }

    // счётчики фактов — 1,8 с, один раз
    const counters = $$('[data-count]', eluna);
    if (counters.length) {
      const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      const run = (el) => {
        const end = +el.dataset.count; const t0 = performance.now(); const D = 1800;
        const tick = (t) => { const p = Math.min(1, (t - t0) / D); const e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(end * e); if (p < 1) requestAnimationFrame(tick); else el.textContent = fmt(end); };
        requestAnimationFrame(tick);
      };
      if (REDUCED || !('IntersectionObserver' in window)) counters.forEach((el) => el.textContent = fmt(+el.dataset.count));
      else {
        const io = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }); }, { threshold: 0.6 });
        counters.forEach((el) => { el.textContent = '0'; el.style.minWidth = fmt(+el.dataset.count).length + 'ch'; io.observe(el); });
      }
    }
  }

  /* ---------- Якоря при открытом диалоге (меню) ---------- */
  $$('.menu__list a').forEach((a) => a.addEventListener('click', (e) => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    menuDlg.close();
    setTimeout(() => target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }), 60);
  }));

  // открыть диалог по хэшу при загрузке не нужно; очистим служебные хэши
  if (/^#(menu|shortlist|lightbox)$/.test(location.hash)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
})();
