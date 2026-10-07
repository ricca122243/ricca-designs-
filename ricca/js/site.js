/* RICCA DESIGNS — основа сайта. Ванильный JS, без зависимостей. */
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
      // Названия и тона образцов на сайте условные (палитра ещё не подтверждена) — сообщение их не утверждает
      fabric: (name) => `Здравствуйте! Хочу подобрать ткань в шоуруме. На сайте понравился образец «${name}» — подскажите, что есть похожего в палитре.`
    },
    video: 'video/',                // ролики производства (общие)
    poster: 'img/mono/',            // дуотон-постеры шагов
    posterSuffix: '-mono.webp',
    reelChapterMs: 4600
  };

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqNav = window.matchMedia('(min-width: 1180px)');       // навигация в шапке; ниже — бургер
  const mqMobile = window.matchMedia('(max-width: 767px)');
  let reduced = mqReduce.matches;
  if (reduced) root.classList.add('reduce');
  // Экономия трафика: при Save-Data или 2G фильм по главам показывает только постеры
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const lite = !!(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));
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
    if (!a.querySelector('.vh--tab')) {
      const hint = document.createElement('span');
      hint.className = 'vh vh--tab';
      hint.textContent = ' (откроется в новой вкладке)';
      a.append(hint);
    }
  });

  /* ---------- Переход по якорям с учётом шапки ---------- */
  const hdr = $('#hdr');
  const hdrOffset = () => hdr.offsetHeight || (mqMobile.matches ? 60 : mqNav.matches ? 84 : 68);
  const scrollYFor = (id, target) => {
    if (id === 'top' || !target) return 0;
    // к колонтитулу раздела, а не к верху секции: без пустого поля под шапкой
    const anchor = id === 'contacts' ? target : ($('.folio', target) || target);
    const gap = id === 'contacts' ? 16 : mqMobile.matches ? 28 : 56;
    const tf = getComputedStyle(anchor).transform;
    const shift = tf && tf !== 'none' ? new DOMMatrixReadOnly(tf).m42 : 0;
    return anchor.getBoundingClientRect().top - shift + window.scrollY - hdrOffset() - gap;
  };
  let anchorT = 0;
  const goTo = (id, focus) => {
    const target = id === 'top' ? null : document.getElementById(id);
    if (!target && id !== 'top') return false;
    window.scrollTo({ top: Math.max(0, scrollYFor(id, target)), behavior: reduced ? 'auto' : 'smooth' });
    if (target && focus) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    // по окончании якорного скролла шапка всегда видна — меню и WhatsApp доступны сразу
    clearTimeout(anchorT);
    anchorT = setTimeout(() => { hdr.classList.remove('is-hidden'); lastY = window.scrollY; }, reduced ? 50 : 900);
    return true;
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    let id = a.getAttribute('href').slice(1);
    if (id === 'main') return;
    // «Посетить шоурум» на телефоне ведёт сразу к карточке визита (часы, адрес и маршрут — первыми)
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

  /* ---------- Меню (телефон, планшет и ноутбук до 1180) ---------- */
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
    mqNav.addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ---------- Проявления ---------- */
  $$('[data-reveal]').forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((n) => n.hasAttribute('data-reveal'));
    el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 5) * 90}ms`);
  });
  const revealTargets = $$('[data-reveal]');
  if (hasIO && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    revealTargets.forEach((el) => io.observe(el));
    // Фокус с клавиатуры попал в непроявленный блок — проявляем сразу (CSS :focus-within делает это без перехода)
    document.addEventListener('focusin', (e) => {
      const el = e.target.closest ? e.target.closest('[data-reveal]') : null;
      if (el && !el.classList.contains('is-in')) { io.unobserve(el); el.classList.add('is-in'); }
    });
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
     и само видео. Выбранный вручную шаг проигрывается один раз. Одновременно декодируется только один ролик:
     уходящий ставится на паузу до того, как следующий получит src, и теряет src через секунду после наплыва.
     При Save-Data / 2G и при prefers-reduced-motion — только постеры. */
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
    const list = $('[data-reel-list]', reel);
    const STEPS = chs.filter((c) => !c.classList.contains('ch--final')).length;
    const stills = reduced || lite;           // без видео: только постеры
    let active = 0, front = 0, clips = [], clipPos = 0, inView = false, timer = 0, started = false;
    let loadToken = 0;
    let auto = !stills;
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
    const dropSrc = (v) => { if (v.hasAttribute('src')) { v.pause(); v.removeAttribute('src'); v.load(); } };
    const setAuto = (on) => {
      auto = on && !stills;
      reel.classList.toggle('is-auto', auto);
      if (toggle) toggle.textContent = auto ? 'Пауза' : 'Дальше';
    };
    const setUI = (idx) => {
      const ch = chs[idx];
      const final = ch.classList.contains('ch--final');
      chs.forEach((c, i) => { c.classList.toggle('is-active', i === idx); c.setAttribute('aria-pressed', String(i === idx)); });
      if (countEl) countEl.innerHTML = final ? '<b>Готово</b>' : `<span class="reel__count-w">Шаг </span><b>${String(idx + 1).padStart(2, '0')}</b> / ${String(STEPS).padStart(2, '0')}`;
      if (rail) rail.style.transform = `scaleX(${Math.min(1, (idx + 1) / STEPS).toFixed(4)})`;
      descs.forEach((d, i) => { d.classList.toggle('is-on', i === idx); if (i === idx) d.removeAttribute('aria-hidden'); else d.setAttribute('aria-hidden', 'true'); });
      vids.forEach((v) => v.setAttribute('aria-label', `Кадры из ателье RICCA: ${$('.ch__t', ch).textContent}`));
      // телефон: ряд фишек прокручивается к активной
      if (list && mqMobile.matches && list.scrollWidth > list.clientWidth) {
        const li = ch.parentElement;
        const x = li.offsetLeft - (parseFloat(getComputedStyle(list).paddingLeft) || 0);
        list.scrollTo({ left: Math.max(0, x), behavior: reduced ? 'auto' : 'smooth' });
      }
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!auto || !inView) return;
      const d = chs[active].classList.contains('ch--final') ? CONFIG.reelChapterMs + 1800 : CONFIG.reelChapterMs;
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
        const token = ++loadToken;          // актуален только последний запрос
        back.loop = auto && clips.length === 1;
        back.poster = posterOf(clips[0]);
        const swap = () => {
          if (token !== loadToken) return;  // выбор уже сменился — этот ролик не показываем
          back.classList.add('is-on'); cur.classList.remove('is-on');
          back.removeAttribute('aria-hidden'); cur.setAttribute('aria-hidden', 'true');
          front = 1 - front;
          // через секунду (после наплыва) у скрытого элемента не остаётся источника — ровно один <video> с src
          setTimeout(() => { if (cur !== vids[front]) dropSrc(cur); }, 1000);
        };
        if (stills) { dropSrc(back); dropSrc(cur); swap(); }
        else {
          cur.pause();                       // уходящий клип останавливается до загрузки следующего
          dropSrc(back);
          back.defaultPlaybackRate = 0.8;
          back.onloadeddata = () => {        // одно свойство вместо накопления слушателей
            back.onloadeddata = null;
            back.playbackRate = 0.8;
            swap();
            if (token === loadToken && inView && (auto || byUser)) safePlay(back);
          };
          back.src = clipSrc(clips[0]);
          back.load();
        }
      }
      schedule();
    };
    setAuto(auto);
    if (stills && toggle) toggle.hidden = true;
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
    reelApi.resume = () => { if (auto && inView && !stills && vids[front].src) safePlay(vids[front]); schedule(); };
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
            else if (auto && !stills && vids[front].src && !$('#lb').open) safePlay(vids[front]);
            schedule();
          } else reelApi.pause();
        });
      }, { threshold: 0.35 }).observe(reel);
    } else {
      vids[0].poster = vids[0].dataset.poster;
    }
  }

  /* ---------- Материалы: образцы (radiogroup) → название, описание, счётчик и сообщение в WhatsApp ---------- */
  const swWrap = $('[data-swatches]');
  let fabricHref = '';
  if (swWrap) {
    const btns = $$('.swatch', swWrap);
    const names = $$('[data-sample-name]');
    const tones = $$('[data-sample-tone]');
    const descEl = $('[data-sample-desc]');
    const countEl = $('[data-sample-count]');
    const cta = $('[data-fabric-cta]');
    const pick = (i, focus) => {
      btns.forEach((b, j) => { b.setAttribute('aria-checked', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
      const b = btns[i];
      names.forEach((n) => { n.textContent = b.dataset.name; });
      tones.forEach((n) => { n.textContent = b.dataset.tone; });
      if (descEl) descEl.textContent = b.dataset.desc;
      if (countEl) countEl.textContent = `${String(i + 1).padStart(2, '0')} / ${String(btns.length).padStart(2, '0')}`;
      fabricHref = waUrl(CONFIG.msg.fabric(`${b.dataset.name.toLowerCase()}, ${b.dataset.tone.toLowerCase()}`));
      if (cta) cta.href = fabricHref;
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
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = btns.length - 1;
      if (n >= 0) { e.preventDefault(); pick(n, true); }
    });
    pick(0, false);
  }

  /* ---------- Лайтбокс: фото не крупнее исходника; фильм целиком; закрытие по фону, Esc и свайпу вниз ---------- */
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
    $$('[data-lb-close]', lb).forEach((b) => b.addEventListener('click', closeLb));
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.hasAttribute('data-lb-in') || e.target.classList.contains('lb__fig')) closeLb(); });
    let ty = null;
    lb.addEventListener('touchstart', (e) => { ty = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      if (ty === null) return;
      const dy = e.changedTouches[0].clientY - ty;
      ty = null;
      if (dy > 80) closeLb();
    }, { passive: true });
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-lightbox]');
      if (t) {
        e.preventDefault();
        const src = $('img', t);
        const img = new Image();
        const mob = mqMobile.matches && t.dataset.fullM;
        img.src = mob ? t.dataset.fullM : t.dataset.full;
        img.alt = src ? src.alt : '';
        const w = mob ? t.dataset.wM : t.dataset.w, h = mob ? t.dataset.hM : t.dataset.h;
        if (w) { img.width = +w; img.height = +h; }
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
        v.poster = `${CONFIG.poster}production-poster${CONFIG.posterSuffix}`;
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
        lbCap.textContent = 'Фильм из ателье · 20 секунд · без звука.';
        lb.setAttribute('aria-label', 'Фильм из ателье');
        sync();
        openLb();
        if (!reduced) safePlay(v);
      }
    });
  }

  /* ---------- Шапка, линейка прогресса, плашка ---------- */
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
  const mbarAvoid = $$('[data-mbar-avoid]');     // альбом и его счётчик, слейт, фишки и описание шага, кнопка фильма, образцы, подпись и кнопки примерочной, кнопки бизнеса, фото шоурума
  const heroCta = $('[data-hero-cta]');
  const hero = $('.hero');
  let lastY = window.scrollY;
  let ticking = false;

  function themeAt(y) {
    // Чёрная карточка визита внутри молочного раздела — тоже тема (для цвета линейки слева)
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

      // Шапка: прозрачная над первым экраном, дальше чёрная. Прячется при прокрутке вниз только там,
      // где в ней навигация (≥1180); на планшете и телефоне всегда видна — меню и WhatsApp под рукой
      hdr.classList.toggle('is-solid', y > 24 || menuOpen);
      if (!menuOpen && mqNav.matches) {
        if (y > lastY + 6 && y > vh * 0.9) hdr.classList.add('is-hidden');
        else if (y < lastY - 6 || y < vh * 0.5) hdr.classList.remove('is-hidden');
      } else hdr.classList.remove('is-hidden');
      lastY = y;

      // Тема под серединой экрана → цвет линейки прогресса
      const theme = themeAt(vh / 2);
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

      // Плашка на телефоне: после кнопок первого экрана и до карточки визита (как только карточка показалась — плашка ушла);
      // никогда не ложится на зоны [data-mbar-avoid] — ссылки, кнопки и ряды, которые должны оставаться нажимаемыми
      if (mbar && mqMobile.matches) {
        const zone = vh - 84;
        const ctaGone = heroCta ? heroCta.getBoundingClientRect().bottom < 0 : hero.getBoundingClientRect().bottom < 0;
        const cardReached = fiche ? fiche.getBoundingClientRect().top < vh : false;
        const over = (el) => { const r = el.getBoundingClientRect(); return r.bottom > zone && r.top < vh && r.height > 0; };
        const blocked = mbarAvoid.some(over);
        mbar.classList.toggle('is-on', ctaGone && !cardReached && !menuOpen && !blocked);
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
