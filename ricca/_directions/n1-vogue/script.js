/* RICCA DESIGNS — направление N1 «Vogue». Ванильный JS, без зависимостей. */
(() => {
  'use strict';

  /* ---------- Константы: контакты и тексты WhatsApp — менять здесь ----------
     Скрипт переписывает все ссылки [data-wa] и [data-tel] (href и видимый номер у .tel).
     Те же номера записаны в JSON-LD в <head> и в запасных href без JS. */
  const CONFIG = {
    wa: '77084802047',                          // основной / WhatsApp: +7 (708) 480-20-47
    tel: {
      main: { href: '+77084802047', text: '+7 (708) 480-20-47' },     // основной
      orders: { href: '+77079550808', text: '+7 (707) 955-08-08' }    // отдел заказов
    },
    msg: {
      general: 'Здравствуйте! Хочу узнать о мебели RICCA на заказ.',
      showroom: 'Здравствуйте! Хочу записаться на визит в шоурум RICCA на Навои, 208/2.',
      eluna: 'Здравствуйте! Интересуют матрасы ELUNA.',
      business: 'Здравствуйте! Хочу обсудить проект для бизнеса.',
      master: 'Здравствуйте! У меня вопрос к мастеру RICCA.',
      collection: 'Здравствуйте! Пришлите, пожалуйста, подборку моделей RICCA.',
      col: (name) => `Здравствуйте! Пришлите, пожалуйста, подборку: «${name}».`,
      fabric: (name) => `Здравствуйте! Хочу подобрать ткань в шоуруме. На сайте понравилась фактура «${name}».`
    },
    video: '../../video/',          // ролики производства (общие)
    poster: 'media/',               // монохромные постеры шагов — в папке направления
    posterSuffix: '-mono.webp',
    reelChapterMs: 4600
  };

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqDesk = window.matchMedia('(min-width: 1024px)');
  const mqMobile = window.matchMedia('(max-width: 767px)');
  let reduced = mqReduce.matches;
  if (reduced) root.classList.add('reduce');
  const hasIO = 'IntersectionObserver' in window;
  const safePlay = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const canWebm = (() => { const v = document.createElement('video'); return !!v.canPlayType && v.canPlayType('video/webm; codecs="vp9"') !== ''; })();
  const clipSrc = (name) => `${CONFIG.video}${name}.${canWebm ? 'webm' : 'mp4'}`;
  const posterOf = (name) => `${CONFIG.poster}${name}${CONFIG.posterSuffix}`;

  /* ---------- Телефоны из CONFIG ---------- */
  $$('[data-tel]').forEach((a) => {
    const t = CONFIG.tel[a.dataset.tel];
    if (!t) return;
    a.href = `tel:${t.href}`;
    const txt = a.classList.contains('tel') ? a : $('.tel', a);
    if (txt) txt.textContent = t.text.replace(/ /g, ' ');
  });

  /* ---------- WhatsApp: ссылки с готовым сообщением ---------- */
  const waUrl = (text) => `https://wa.me/${CONFIG.wa}?text=${encodeURIComponent(text)}`;
  $$('[data-wa]').forEach((a) => {
    const key = a.dataset.wa;
    let text = CONFIG.msg.general;
    if (key === 'col') text = CONFIG.msg.col(a.dataset.col);
    else if (typeof CONFIG.msg[key] === 'string') text = CONFIG.msg[key];
    a.href = waUrl(text);
    a.target = '_blank';
    a.rel = 'noopener';
    if (!a.querySelector('.vh')) {
      const hint = document.createElement('span');
      hint.className = 'vh';
      hint.textContent = ' (откроется в новой вкладке)';
      a.append(hint);
    }
  });

  /* ---------- Переход по якорям с учётом шапки ---------- */
  const hdr = $('#hdr');
  const hdrOffset = () => hdr.offsetHeight || (window.innerWidth <= 767 ? 64 : window.innerWidth <= 1023 ? 68 : 84);
  const scrollYFor = (id, target) => {
    if (id === 'top' || !target) return 0;
    // к колонтитулу раздела, а не к верху секции: без пустого поля под шапкой
    const anchor = id === 'contacts' ? target : ($('.folio', target) || target);
    const gap = id === 'contacts' ? 16 : mqMobile.matches ? 28 : 56;
    const tf = getComputedStyle(anchor).transform;
    const shift = tf && tf !== 'none' ? new DOMMatrixReadOnly(tf).m42 : 0;
    return anchor.getBoundingClientRect().top - shift + window.scrollY - hdrOffset() - gap;
  };
  const goTo = (id, focus) => {
    const target = id === 'top' ? null : document.getElementById(id);
    if (!target && id !== 'top') return false;
    window.scrollTo({ top: Math.max(0, scrollYFor(id, target)), behavior: reduced ? 'auto' : 'smooth' });
    if (target && focus) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    return true;
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    let id = a.getAttribute('href').slice(1);
    if (id === 'main') return;
    // «Посетить шоурум» на телефоне ведёт сразу к карточке визита (адрес и маршрут — первыми)
    if (a.hasAttribute('data-visit') && id === 'showroom' && mqMobile.matches) id = 'contacts';
    if (!goTo(id || 'top', true)) return;
    e.preventDefault();
    history.replaceState(null, '', id === 'top' ? location.pathname : `#${id}`);
  });

  /* ---------- Вход первого экрана ---------- */
  const enter = () => requestAnimationFrame(() => {
    root.classList.add('is-loaded');
    setTimeout(() => root.classList.add('hero-done'), reduced ? 0 : 2000);
  });
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 600))]).then(enter);

  /* ---------- Меню (телефон и планшет) ---------- */
  const menuBtn = $('.hdr__menu');
  const menu = $('#menu');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    const label = $('.hdr__menu-label', menuBtn);
    if (label) label.textContent = open ? 'Закрыть' : 'Меню';
    root.classList.toggle('menu-open', open);
    $$('main, .ftr, .mbar, .rule, .skip').forEach((el) => { el.inert = open; });
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
      const first = $('a', menu);
      if (first) first.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
      const done = () => { if (menuBtn.getAttribute('aria-expanded') !== 'true') menu.hidden = true; };
      reduced ? done() : setTimeout(done, 500);
    }
    onScroll();
  };
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (menuBtn.getAttribute('aria-expanded') !== 'true') return;
      if (e.key === 'Escape') { setMenu(false); menuBtn.focus(); }
      if (e.key === 'Tab') {
        const items = [menuBtn, ...$$('a, button', menu)];
        const i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    mqDesk.addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ---------- Проявления ---------- */
  $$('[data-reveal]').forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((n) => n.hasAttribute('data-reveal'));
    el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 5) * 90}ms`);
  });
  $$('.sk').forEach((svg) => {
    $$('.sk-line > *, .sk-floor', svg).forEach((n, i) => {
      n.setAttribute('pathLength', '1');
      n.classList.add('sk-draw');
      n.style.setProperty('--sd', `${200 + i * 90}ms`);
    });
  });
  const revealTargets = $$('[data-reveal]');
  if (hasIO && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    revealTargets.forEach((el) => io.observe(el));
    // Страховка: при переходе по якорю проявляем всё, что уже выше края экрана
    let sweepT = 0;
    window.addEventListener('scroll', () => {
      clearTimeout(sweepT);
      sweepT = setTimeout(() => {
        const lim = window.innerHeight * 0.94;
        revealTargets.forEach((el) => {
          if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < lim) { io.unobserve(el); el.classList.add('is-in'); }
        });
      }, 160);
    }, { passive: true });
  } else {
    revealTargets.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Альбом на телефоне: счётчик и линия ---------- */
  const album = $('[data-album]');
  const albumBar = $('[data-album-bar]');
  const albumCount = $('[data-album-count]');
  const cards = album ? $$('.card', album) : [];
  const onAlbumScroll = () => {
    if (!album || !mqMobile.matches) return;
    const max = album.scrollWidth - album.clientWidth;
    const p = max > 0 ? album.scrollLeft / max : 0;
    if (albumBar) albumBar.style.transform = `scaleX(${Math.max(p, 1 / cards.length).toFixed(4)})`;
    const ref = album.scrollLeft + (parseFloat(getComputedStyle(album).paddingLeft) || 0);
    let best = 0, bestD = Infinity;
    cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - ref); if (d < bestD) { bestD = d; best = i; } });
    if (p > 0.98) best = cards.length - 1;
    if (albumCount) albumCount.textContent = `${String(best + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
  };
  if (album) album.addEventListener('scroll', onAlbumScroll, { passive: true });

  /* ---------- Производство: фильм по главам ----------
     Режимы: «подряд» (шаги сменяются сами, клип в петле) и «стоп». Кнопка «Пауза» останавливает и смену шагов,
     и само видео. Выбранный вручную шаг проигрывается один раз. Одновременно декодируется только один ролик. */
  const reel = $('[data-reel]');
  const reelApi = { pause() {}, resume() {} };
  if (reel) {
    const chs = $$('.ch', reel);
    const vids = $$('.reel__v', reel);
    const countEl = $('[data-reel-count]', reel);
    const rail = $('[data-reel-rail]', reel);
    const desc = $('[data-reel-desc]', reel);
    const live = $('[data-reel-live]', reel);
    const toggle = $('[data-reel-toggle]', reel);
    const STEPS = chs.filter((c) => !c.classList.contains('ch--final')).length;
    let active = 0, front = 0, clips = [], clipPos = 0, inView = false, timer = 0, started = false;
    let auto = !reduced;
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
    const setAuto = (on) => {
      auto = on && !reduced;
      reel.classList.toggle('is-auto', auto);
      if (toggle) toggle.textContent = auto ? 'Пауза' : 'Смотреть';
    };
    const setUI = (idx) => {
      const ch = chs[idx];
      const final = ch.classList.contains('ch--final');
      chs.forEach((c, i) => { c.classList.toggle('is-active', i === idx); c.setAttribute('aria-pressed', String(i === idx)); });
      const bar = $('.ch__bar', ch);
      if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
      if (countEl) countEl.innerHTML = final ? '<b>Готово</b>' : `Шаг <b>${String(idx + 1).padStart(2, '0')}</b> / ${String(STEPS).padStart(2, '0')}`;
      if (rail) rail.style.transform = `scaleX(${Math.min(1, (idx + 1) / STEPS).toFixed(4)})`;
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
      if (byUser && live) live.textContent = chs[idx].dataset.text.replace(/&nbsp;/g, ' ');
      if (changed) {
        started = true;
        clips = chs[idx].dataset.clips.split(' ');
        clipPos = 0;
        const back = vids[1 - front];
        const cur = vids[front];
        back.loop = auto && clips.length === 1;
        back.poster = posterOf(clips[0]);
        // Одновременно декодируется только один ролик: старый ставим на паузу и снимаем источник
        const swap = () => {
          cur.pause();
          back.classList.add('is-on'); cur.classList.remove('is-on');
          back.removeAttribute('aria-hidden'); cur.setAttribute('aria-hidden', 'true');
          front = 1 - front;
          setTimeout(() => { if (cur !== vids[front]) { cur.removeAttribute('src'); cur.load(); } }, 1000);
        };
        if (reduced) { back.removeAttribute('src'); swap(); }
        else {
          back.defaultPlaybackRate = 0.8;
          back.src = clipSrc(clips[0]);
          back.addEventListener('loadeddata', function once() {
            back.removeEventListener('loadeddata', once);
            back.playbackRate = 0.8;
            swap();
            if (inView && (auto || byUser)) safePlay(back);
          });
          back.load();
        }
      }
      schedule();
    };
    setAuto(auto);
    if (reduced && toggle) toggle.hidden = true;
    chs.forEach((c, i) => c.addEventListener('click', () => select(i, true)));
    if (toggle) toggle.addEventListener('click', () => {
      if (auto) {
        setAuto(false);
        clearTimeout(timer);
        vids.forEach((v) => v.pause());
      } else {
        setAuto(true);
        const v = vids[front];
        v.loop = clips.length === 1;
        if (inView && v.src) safePlay(v);
        setUI(active);
        schedule();
      }
    });
    vids.forEach((v) => v.addEventListener('ended', () => {
      if (!v.classList.contains('is-on') || clips.length < 2) return;
      if (!auto && clipPos === clips.length - 1) return;
      clipPos = (clipPos + 1) % clips.length;
      v.poster = posterOf(clips[clipPos]);
      v.src = clipSrc(clips[clipPos]);
      v.playbackRate = 0.8;
      safePlay(v);
    }));
    reelApi.pause = () => { clearTimeout(timer); vids.forEach((v) => v.pause()); };
    reelApi.resume = () => { if (auto && inView && !reduced && vids[front].src) safePlay(vids[front]); schedule(); };
    if (hasIO) {
      // постер — заранее, за экран до раздела; ролики — только когда раздел в кадре
      const prime = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { vids[0].poster = vids[0].dataset.poster; prime.disconnect(); }
      }, { rootMargin: '100% 0px' });
      prime.observe(reel);
      new IntersectionObserver((es) => {
        es.forEach((e) => {
          inView = e.isIntersecting;
          if (inView) {
            if (!started) select(active, false);
            else if (auto && !reduced && vids[front].src && !$('#lb').open) safePlay(vids[front]);
            schedule();
          } else reelApi.pause();
        });
      }, { threshold: 0.35 }).observe(reel);
    } else {
      vids[0].poster = vids[0].dataset.poster;
    }
  }

  /* ---------- Материалы: образцы (radiogroup) → эскиз и сообщение в WhatsApp ---------- */
  const swWrap = $('[data-swatches]');
  let fabricHref = '';
  if (swWrap) {
    const btns = $$('.swatch', swWrap);
    const names = $$('[data-sample-name]');
    const tones = $$('[data-sample-tone]');
    const descEl = $('[data-sample-desc]');
    const cta = $('[data-fabric-cta]');
    const colA = $('[data-fabric-color]');
    const texA = $('[data-fabric-tex]');
    const colB = $('[data-fabric-color-next]');
    const texB = $('[data-fabric-tex-next]');
    const sweep = $('.sofa__fill--next');
    const texUrl = (t) => `media/tex-${t}-g.webp`;
    let sweepTimer = 0;
    const applyA = (b) => { if (colA) colA.setAttribute('fill', b.dataset.c); if (texA) texA.setAttribute('href', texUrl(b.dataset.t)); };
    const pick = (i, focus) => {
      btns.forEach((b, j) => { b.setAttribute('aria-checked', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
      const b = btns[i];
      names.forEach((n) => { n.textContent = b.dataset.name; });
      tones.forEach((n) => { n.textContent = b.dataset.tone; });
      if (descEl) descEl.textContent = b.dataset.desc;
      fabricHref = waUrl(CONFIG.msg.fabric(`${b.dataset.name.toLowerCase()}, ${b.dataset.tone.toLowerCase()}`));
      if (cta) cta.href = fabricHref;
      if (focus) b.focus();
      // эскиз: новая фактура наплывает слева направо
      if (reduced || !sweep || !colB) { applyA(b); }
      else {
        clearTimeout(sweepTimer);
        colB.setAttribute('fill', b.dataset.c);
        texB.setAttribute('href', texUrl(b.dataset.t));
        sweep.classList.remove('is-sweeping');
        void sweep.getBoundingClientRect();
        sweep.classList.add('is-sweeping');
        sweepTimer = setTimeout(() => { applyA(b); sweep.classList.remove('is-sweeping'); }, 1150);
      }
      requestAnimationFrame(() => onScroll());
    };
    btns.forEach((b, i) => b.addEventListener('click', () => pick(i, false)));
    swWrap.addEventListener('keydown', (e) => {
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      let n = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % btns.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + btns.length) % btns.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = btns.length - 1;
      if (n >= 0) { e.preventDefault(); pick(n, true); }
    });
    pick(0, false);
  }

  /* ---------- Лайтбокс: фото не крупнее исходника; фильм целиком ---------- */
  const lb = $('#lb');
  const lbMedia = lb ? $('[data-lb-media]', lb) : null;
  const lbCap = lb ? $('[data-lb-cap]', lb) : null;
  const lbPlay = lb ? $('[data-lb-play]', lb) : null;
  const openLb = () => {
    reelApi.pause();
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
  };
  const onLbClose = () => {
    lbMedia.replaceChildren();
    if (lbPlay) lbPlay.hidden = true;
    document.body.style.overflow = '';
    reelApi.resume();
  };
  const closeLb = () => {
    if (typeof lb.close === 'function' && lb.open) lb.close();
    else { lb.removeAttribute('open'); onLbClose(); }
  };
  if (lb) {
    lb.addEventListener('close', onLbClose);
    $('[data-lb-close]', lb).addEventListener('click', closeLb);
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb__in')) closeLb(); });
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-lightbox]');
      if (t) {
        e.preventDefault();
        const src = $('img', t);
        const img = new Image();
        img.src = t.dataset.full;
        img.alt = src ? src.alt : '';
        if (t.dataset.w) { img.width = +t.dataset.w; img.height = +t.dataset.h; }
        // не увеличиваем исходник больше его настоящего размера (гостиная — 513px, кадры видео — 478px)
        if (t.dataset.max) img.style.maxWidth = `min(${+t.dataset.max}px, calc(100vw - 2 * var(--gutter) - 24px))`;
        lbMedia.replaceChildren(img);
        lbCap.textContent = t.dataset.caption || '';
        lb.setAttribute('aria-label', 'Просмотр фотографии');
        openLb();
        return;
      }
      const f = e.target.closest('[data-film]');
      if (f) {
        const v = document.createElement('video');
        v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute('playsinline', '');
        v.setAttribute('aria-label', 'Фильм о производстве RICCA DESIGNS: от 3D-проекта до готового дивана');
        v.poster = 'media/production-poster-mono.webp';
        v.width = 478; v.height = 850;
        v.preload = 'auto';
        v.innerHTML = `<source src="${CONFIG.video}production.webm" type="video/webm"><source src="${CONFIG.video}production.mp4" type="video/mp4">`;
        v.tabIndex = -1;
        const sync = () => { if (lbPlay) lbPlay.textContent = v.paused ? 'Смотреть' : 'Пауза'; };
        const toggle = () => { if (v.paused) safePlay(v); else v.pause(); };
        v.addEventListener('click', toggle);
        v.addEventListener('play', sync);
        v.addEventListener('pause', sync);
        if (lbPlay) { lbPlay.hidden = false; lbPlay.onclick = toggle; }
        lbMedia.replaceChildren(v);
        lbCap.textContent = 'Фильм из ателье · 20 секунд · без звука.';
        lb.setAttribute('aria-label', 'Фильм из ателье');
        sync();
        openLb();
        if (!reduced) safePlay(v);
      }
    });
  }

  /* ---------- Шапка, тема, линейка прогресса, плашка ---------- */
  const themed = $$('[data-theme]').filter((el) => el !== root);
  const fiche = $('#contacts');
  const chapters = $$('[data-chapter]');
  const navLinks = $$('.hdr__nav a');
  const ruleFill = $('.rule__fill');
  const ruleNo = $('[data-rule-no]');
  const mbar = $('[data-mbar]');
  const mbarWa = $('[data-mbar-wa]');
  const mbarWaGeneral = mbarWa ? mbarWa.href : '';
  const materials = $('#materials');
  const albumBarEl = $('.album__bar');
  const heroCta = $('[data-hero-cta]');
  const hero = $('.hero');
  let lastY = window.scrollY;
  let ticking = false;

  function themeAt(y) {
    // Чёрная карточка визита внутри молочного раздела — тоже тема
    if (fiche) { const r = fiche.getBoundingClientRect(); if (r.top <= y && r.bottom > y) return 'noir'; }
    for (const el of themed) { const r = el.getBoundingClientRect(); if (r.top <= y && r.bottom > y) return el.dataset.theme; }
    return root.dataset.theme || 'noir';
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const menuOpen = root.classList.contains('menu-open');
      const hh = hdr.offsetHeight;

      // Шапка: фон после первого движения, прячется при прокрутке вниз
      hdr.classList.toggle('is-solid', y > 24 || menuOpen);
      if (!menuOpen) {
        if (y > lastY + 6 && y > vh * 0.9) hdr.classList.add('is-hidden');
        else if (y < lastY - 6 || y < vh * 0.5) hdr.classList.remove('is-hidden');
      }
      lastY = y;

      // Тема под шапкой → цвет шапки и линейки
      const theme = themeAt(hh / 2);
      if (root.dataset.theme !== theme) root.dataset.theme = theme;

      // Линейка: доля прокрутки и номер главы
      const max = Math.max(1, root.scrollHeight - vh);
      if (ruleFill) ruleFill.style.setProperty('--p', clamp(y / max, 0, 1).toFixed(4));
      let cur = chapters[0];
      for (const c of chapters) { if (c.getBoundingClientRect().top <= vh * 0.42) cur = c; }
      if (cur) {
        if (ruleNo && ruleNo.textContent !== cur.dataset.chapter) ruleNo.textContent = cur.dataset.chapter;
        const id = cur.id === 'contacts' ? 'showroom' : cur.id;
        navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
      }

      // Плашка на телефоне: после кнопок первого экрана, до карточки визита; не накрывает альбом
      if (mbar) {
        const zone = vh - 84;
        const ctaGone = heroCta ? heroCta.getBoundingClientRect().bottom < 0 : hero.getBoundingClientRect().bottom < 0;
        const cardReached = fiche ? fiche.getBoundingClientRect().top < vh : false;
        const over = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.bottom > zone && r.top < vh; };
        mbar.classList.toggle('is-on', ctaGone && !cardReached && !menuOpen && !over(albumBarEl) && !(mqMobile.matches && over(album)));
        if (mbarWa && fabricHref && materials) {
          const m = materials.getBoundingClientRect();
          const href = m.top < vh * 0.5 && m.bottom > vh * 0.5 ? fabricHref : mbarWaGeneral;
          if (mbarWa.href !== href) mbarWa.href = href;
        }
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { onScroll(); onAlbumScroll(); }, 120); });

  mqReduce.addEventListener('change', (e) => {
    reduced = e.matches;
    root.classList.toggle('reduce', reduced);
  });

  onScroll();
  onAlbumScroll();
})();
