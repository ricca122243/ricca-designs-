/* RICCA DESIGNS — сайт-галерея. Ванильный JS, без зависимостей. */
(() => {
  'use strict';

  /* ---------- Константы: контакты и тексты WhatsApp — менять здесь ----------
     Скрипт переписывает все ссылки [data-wa] и [data-tel] (href и видимый номер у .tel).
     Номера также записаны в JSON-LD в <head> index.html и в запасных href без JS — см. комментарий у шапки. */
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
    video: 'video/',
    poster: 'img/process/',
    reelChapterMs: 4600
  };

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mqDesk = window.matchMedia('(min-width: 1024px) and (min-height: 620px)');
  const mqMobile = window.matchMedia('(max-width: 767px)');
  let reduced = mqReduce.matches;
  if (reduced) root.classList.add('reduce');
  const hasIO = 'IntersectionObserver' in window;
  const safePlay = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const canWebm = (() => { const v = document.createElement('video'); return !!v.canPlayType && v.canPlayType('video/webm; codecs="vp9"') !== ''; })();
  const clipSrc = (name) => `${CONFIG.video}${name}.${canWebm ? 'webm' : 'mp4'}`;

  /* ---------- Телефоны из CONFIG ---------- */
  $$('[data-tel]').forEach((a) => {
    const t = CONFIG.tel[a.dataset.tel];
    if (!t) return;
    a.href = `tel:${t.href}`;
    if (a.classList.contains('tel')) a.textContent = t.text.replace(/ /g, '\u00A0');
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
    if (!a.querySelector('.vh:not(.hdr__wa-sr)')) {
      const hint = document.createElement('span');
      hint.className = 'vh';
      hint.textContent = ' (откроется в новой вкладке)';
      a.append(hint);
    }
  });

  /* ---------- Переход по якорям с учётом шапки ---------- */
  const hdr = $('#hdr');
  // высота шапки после прокрутки (см. .hdr.is-scrolled в CSS)
  const hdrOffset = () => (window.innerWidth <= 767 ? 60 : window.innerWidth <= 1023 ? 64 : 68);
  // Куда прокручивать: к табличке зала, а не к верху секции — без пустого поля под шапкой,
  // и предыдущий (ореховый) зал целиком уходит из-под шапки.
  const scrollYFor = (id, target) => {
    if (id === 'top' || !target) return 0;
    if (id === 'collections' && enfOn) return target.getBoundingClientRect().top + window.scrollY;
    const mobile = mqMobile.matches;
    const anchor = id === 'contacts' ? target : ($('.plaque', target) || target);
    const gap = id === 'contacts' ? 16 : mobile ? 24 : 56;
    // табличка, которая ещё не появилась, сдвинута на 22px (data-reveal) — считаем по её итоговому месту
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
    // «Посетить шоурум» на телефоне ведёт сразу к карточке визита (адрес и маршрут — первыми), на десктопе — в зал
    if (a.hasAttribute('data-visit') && id === 'showroom' && mqMobile.matches) id = 'contacts';
    if (id === 'contacts' && !mqMobile.matches) id = 'showroom';
    if (!goTo(id || 'top', true)) return;
    e.preventDefault();
    history.replaceState(null, '', id === 'top' ? location.pathname : `#${id}`);
  });

  /* ---------- Вход героя (контент виден сразу, движение — мягкий сдвиг) ---------- */
  const enter = () => requestAnimationFrame(() => {
    root.classList.add('is-loaded');
    // после входа снимаем маску строк заголовка (пользовательские интервалы текста не обрезаются)
    setTimeout(() => root.classList.add('hero-done'), reduced ? 0 : 1900);
  });
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 450))]).then(enter);

  /* ---------- Мобильное меню ---------- */
  const menuBtn = $('.hdr__menu');
  const menu = $('#menu');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    const label = $('.hdr__menu-label', menuBtn);
    if (label) label.textContent = open ? 'Закрыть' : 'Меню';
    root.classList.toggle('menu-open', open);
    // всё, что под меню, недоступно ни с клавиатуры, ни для экранного диктора
    $$('main, .colophon, .mbar, .plan, .skip').forEach((el) => { el.inert = open; });
    if (open) {
      menu.hidden = false;
      menu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      hdr.classList.remove('is-dark');
      const first = $('a', menu);
      if (first) first.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      menu.hidden = true;
      document.body.style.overflow = '';
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
        // фокус остаётся внутри меню и шапки
        const items = [menuBtn, ...$$('a, button', menu)];
        const i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    mqDesk.addEventListener('change', () => setMenu(false));
  }

  /* ---------- Появления ---------- */
  $$('[data-reveal]').forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((n) => n.hasAttribute('data-reveal'));
    el.style.setProperty('--d', `${Math.min(sibs.indexOf(el), 5) * 90}ms`);
  });
  $$('.sketch').forEach((svg) => {
    $$('.sk-line > *, .sk-dim path, .sk-floor', svg).forEach((n, i) => {
      n.setAttribute('pathLength', '1');
      n.classList.add('sk-draw');
      n.style.setProperty('--sd', `${200 + i * 85}ms`);
    });
  });
  const revealTargets = $$('[data-reveal], .exhibit');
  if (hasIO && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Анфилада: горизонтальный проход по залу ---------- */
  const enf = $('[data-enfilade]');
  const pin = enf ? $('[data-pin]', enf) : null;
  const move = enf ? $('[data-move]', enf) : null;
  const track = enf ? $('[data-track]', enf) : null;
  const bar = enf ? $('[data-progress]', enf) : null;
  const count = enf ? $('[data-count]', enf) : null;
  const exhibits = enf ? $$('.exhibit', enf) : [];
  const FACTOR = 0.7;                                   // вертикальный путь = 70% горизонтального
  let enfOn = root.classList.contains('enf-on'), enfDist = 0, enfCur = 0, enfGoal = 0, enfRaf = 0, lefts = [];
  const setCount = (n) => { if (count) count.textContent = String(n).padStart(2, '0'); };

  // Одно состояние на обе раскладки: .enf-on — закреплённый проход, без него — нативная прокрутка трека
  function enfLayout() {
    if (!enf) return;
    enfOn = mqDesk.matches && !reduced;
    root.classList.toggle('enf-on', enfOn);
    move.style.transform = '';
    pin.scrollLeft = 0;
    if (!enfOn) { enf.style.removeProperty('--enf-h'); if (bar) bar.style.transform = ''; onTrackScroll(); return; }
    enfDist = Math.max(0, move.scrollWidth - window.innerWidth);
    enf.style.setProperty('--enf-h', `${Math.round(enfDist * FACTOR + window.innerHeight)}px`);
    const mRect = move.getBoundingClientRect();
    lefts = exhibits.map((ex) => ex.getBoundingClientRect().left - mRect.left);
    enfTarget();
    enfCur = enfGoal;
    enfApply();
  }
  function enfTarget() {
    if (!enfOn) return;
    const r = enf.getBoundingClientRect();
    const total = enf.offsetHeight - window.innerHeight;
    enfGoal = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
    if (!enfRaf) enfRaf = requestAnimationFrame(enfTick);
  }
  function enfTick() {
    enfRaf = 0;
    const diff = enfGoal - enfCur;
    enfCur = Math.abs(diff) < 0.0004 ? enfGoal : enfCur + diff * 0.12;
    enfApply();
    if (enfCur !== enfGoal) enfRaf = requestAnimationFrame(enfTick);
  }
  function enfApply() {
    const x = -enfCur * enfDist;
    move.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
    if (bar) bar.style.transform = `scaleX(${enfCur.toFixed(4)})`;
    // Текущая работа — последняя, чей левый край уже прошёл 60% ширины окна; в конце прохода — последняя
    if (enfCur > 0.97) { setCount(exhibits.length); return; }
    const edge = window.innerWidth * 0.6 - x;
    let cur = 0;
    lefts.forEach((l, i) => { if (l < edge) cur = i; });
    setCount(cur + 1);
  }
  function onTrackScroll() {
    if (enfOn || !track) return;
    const max = track.scrollWidth - track.clientWidth;
    const p = max > 0 ? track.scrollLeft / max : 0;
    if (bar) bar.style.transform = `scaleX(${Math.max(p, 1 / 6).toFixed(4)})`;
    if (p > 0.98) { setCount(exhibits.length); return; }
    // Текущая — работа, чей левый край ближе всего к точке щелчка (поле трека); на широком окне центр давал «02» уже на старте
    const ref = track.scrollLeft + (parseFloat(getComputedStyle(track).paddingLeft) || 0);
    let best = 0, bestD = Infinity;
    exhibits.forEach((ex, i) => { const d = Math.abs(ex.offsetLeft - ref); if (d < bestD) { bestD = d; best = i; } });
    setCount(best + 1);
  }
  if (enf) {
    track.addEventListener('scroll', onTrackScroll, { passive: true });
    // Фокус с клавиатуры: окно прокручивается к той же позиции, что и трек — счётчик не рассинхронизируется
    enf.addEventListener('focusin', (e) => {
      if (!enfOn) {
        // Нативный трек: фокус ставит карточку ровно в точку щелчка, а не на край экрана
        const card = e.target.closest('.exhibit, .enfilade__end');
        if (card && track.contains(card)) card.scrollIntoView({ inline: 'start', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
        return;
      }
      pin.scrollLeft = 0;
      const ex = e.target.closest('.exhibit, .enfilade__end, .enfilade__intro');
      if (!ex || !enfDist) return;
      const mRect = move.getBoundingClientRect();
      const r = ex.getBoundingClientRect();
      const c = r.left - mRect.left + r.width / 2;
      const p = ex.classList.contains('enfilade__intro') ? 0 : clamp((c - window.innerWidth / 2) / enfDist, 0, 1);
      const top = enf.getBoundingClientRect().top + window.scrollY;
      const total = enf.offsetHeight - window.innerHeight;
      window.scrollTo({ top: top + p * total, behavior: 'auto' });
      enfGoal = enfCur = p;
      enfApply();
    });
    // Закреплённый зал: браузер не должен сдвигать окно при фокусе (в остальных режимах pin не прокручивается)
    pin.addEventListener('scroll', () => { if (enfOn && pin.scrollLeft) pin.scrollLeft = 0; });
    // Горизонтальный свайп трекпада тоже ведёт зал
    enf.addEventListener('wheel', (e) => {
      if (!enfOn || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 1) return;
      const r = enf.getBoundingClientRect();
      if (r.top <= 1 && r.bottom >= window.innerHeight - 1) {
        e.preventDefault();
        window.scrollBy(0, e.deltaX * FACTOR);
      }
    }, { passive: false });
  }
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { enfLayout(); onScroll(); }, 120); });
  mqDesk.addEventListener('change', enfLayout);
  window.addEventListener('load', enfLayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(enfLayout);

  /* ---------- Производство: фильм по главам ----------
     Режимы: «подряд» (шаги сменяются сами, клип в петле) и «стоп». Кнопка «Пауза» останавливает и смену шагов,
     и само видео. Выбранный вручную шаг проигрывается один раз и останавливается на последнем кадре. */
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
    const STEPS = chs.filter((c) => !c.classList.contains('ch--final')).length;   // 8 шагов + «Готово»
    let active = 0, front = 0, clips = [], clipPos = 0, inView = false, timer = 0, started = false;
    let auto = !reduced;
    // Описания шагов — стопкой в одной ячейке сетки: высота блока не меняется при смене шага
    const descs = [];
    if (desc) {
      desc.replaceChildren(...chs.map((c, i) => {
        const sp = document.createElement('span');
        sp.innerHTML = c.dataset.text;
        if (i === 0) sp.className = 'is-on';
        else sp.setAttribute('aria-hidden', 'true');
        descs.push(sp);
        return sp;
      }));
    }
    const posterOf = (n) => `${CONFIG.poster}${n}.webp`;
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
      // экранный диктор слышит описание только после выбора пользователя, не при автосмене
      if (byUser && live) live.textContent = chs[idx].dataset.text.replace(/&nbsp;/g, ' ');
      if (changed) {
        started = true;
        clips = chs[idx].dataset.clips.split(' ');
        clipPos = 0;
        const back = vids[1 - front];
        const cur = vids[front];
        back.loop = auto && clips.length === 1;
        back.poster = posterOf(clips[0]);
        // Одновременно декодируется только один ролик: старый ставим на паузу в момент смены
        const swap = () => {
          cur.pause();
          back.classList.add('is-on'); cur.classList.remove('is-on');
          back.removeAttribute('aria-hidden'); cur.setAttribute('aria-hidden', 'true');
          front = 1 - front;
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
        // Пауза: стоп и смене шагов, и видео
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
    // Два ролика подряд («Обивка»); в ручном режиме — один проход и остановка
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
      // постер — заранее, за экран до зала; ролики — только когда зал в кадре
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

  /* ---------- Материалы: образцы (radiogroup) → сообщение в WhatsApp ---------- */
  const swWrap = $('[data-swatches]');
  let fabricHref = '';
  if (swWrap) {
    const btns = $$('.swatch', swWrap);
    const nameEl = $('[data-sample-name]');
    const toneEl = $('[data-sample-tone]');
    const cta = $('[data-fabric-cta]');
    const pick = (i, focus) => {
      btns.forEach((b, j) => { b.setAttribute('aria-checked', String(j === i)); b.tabIndex = j === i ? 0 : -1; });
      const b = btns[i];
      if (nameEl) nameEl.textContent = b.dataset.name;
      if (toneEl) toneEl.textContent = b.dataset.tone;
      fabricHref = waUrl(CONFIG.msg.fabric(`${b.dataset.name.toLowerCase()}, ${b.dataset.tone.toLowerCase()}`));
      if (cta) cta.href = fabricHref;
      if (focus) b.focus();
      requestAnimationFrame(() => onScroll());   // плашка на телефоне сразу несёт выбранную фактуру
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

  /* ---------- Лайтбокс: фото на штукатурке, фильм в ореховом зале ---------- */
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
    lbMedia.classList.remove('is-walnut');
    lb.classList.remove('lb--film');
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
        // не увеличиваем исходник больше его настоящего размера (фото первого экрана — 513px, кадры видео — 478px)
        if (t.dataset.max) img.style.maxWidth = `min(${+t.dataset.max}px, calc(100vw - 2 * var(--gutter) - 2 * clamp(12px, 2vw, 24px)))`;
        lbMedia.replaceChildren(img);
        lbMedia.classList.toggle('is-walnut', t.hasAttribute('data-dark'));
        lbCap.textContent = t.dataset.caption || '';
        lb.classList.remove('lb--film');
        lb.setAttribute('aria-label', 'Просмотр работы');
        openLb();
        return;
      }
      const f = e.target.closest('[data-film]');
      if (f) {
        const v = document.createElement('video');
        v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute('playsinline', '');
        v.setAttribute('aria-label', 'Фильм о производстве RICCA DESIGNS: от 3D-проекта до готового дивана');
        v.poster = `${CONFIG.video}production-poster.webp`;
        v.width = 478; v.height = 850;
        v.preload = 'auto';
        v.innerHTML = `<source src="${CONFIG.video}production.webm" type="video/webm"><source src="${CONFIG.video}production.mp4" type="video/mp4">`;
        // Управление — настоящей кнопкой «Пауза / Смотреть»; клик по кадру дублирует её для мыши и касания
        v.tabIndex = -1;   // фокус — на кнопке «Пауза / Смотреть», не на самом видео
        const sync = () => { if (lbPlay) lbPlay.textContent = v.paused ? 'Смотреть' : 'Пауза'; };
        const toggle = () => { if (v.paused) safePlay(v); else v.pause(); };
        v.addEventListener('click', toggle);
        v.addEventListener('play', sync);
        v.addEventListener('pause', sync);
        if (lbPlay) { lbPlay.hidden = false; lbPlay.onclick = toggle; }
        lbMedia.replaceChildren(v);
        lbCap.textContent = 'Фильм из\u00A0ателье · 20\u00A0секунд · без\u00A0звука.';
        lb.classList.add('lb--film');
        lb.setAttribute('aria-label', 'Фильм из ателье');
        sync();
        openLb();
        if (!reduced) safePlay(v);
      }
    });
  }

  /* ---------- Текущий зал: меню и план экспозиции ---------- */
  const halls = $$('[data-hall]');
  const plan = $('[data-plan]');
  const rooms = $$('[data-room]');
  const navLinks = $$('.nav a');
  const plaques = $$('.plaque');
  let hallId = '';
  const setHall = (sec) => {
    hallId = sec ? sec.id : '';
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${hallId}`));
    rooms.forEach((r) => r.classList.toggle('is-active', sec && r.dataset.room === sec.dataset.hall));
  };
  // Текущий зал — тот, что пересекает середину экрана (считается при прокрутке, без пропусков при прыжках)
  const footerEl = $('.colophon');
  const pickHall = () => {
    const mid = window.innerHeight / 2;
    if (footerEl.getBoundingClientRect().top < mid) return null;
    return halls.find((h) => { const r = h.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }) || null;
  };
  rooms.forEach((r) => r.addEventListener('click', () => goTo(r.dataset.go, false)));

  /* ---------- Шапка, план, мобильная плашка ---------- */
  const mbar = $('[data-mbar]');
  const footer = $('.colophon');
  const business = $('#business');
  const collections = $('#collections');
  const heroCta = $('[data-hero-cta]');
  const card = $('#contacts');
  const enfBar = $('.enfilade__bar');
  const materials = $('#materials');
  const mbarWa = $('[data-mbar-wa]');
  const mbarWaGeneral = mbarWa ? mbarWa.href : '';
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const menuOpen = root.classList.contains('menu-open');
      hdr.classList.toggle('is-scrolled', y > 24 || menuOpen);
      const hb = hdr.offsetHeight / 2;
      const b = business.getBoundingClientRect();
      hdr.classList.toggle('is-dark', !menuOpen && b.top <= hb && b.bottom >= hb);
      const fTop = footer.getBoundingClientRect().top;
      if (plan) {
        const c = collections.getBoundingClientRect();
        plan.classList.toggle('is-on', y > vh * 0.75 && fTop > vh * 0.62);
        // план не спорит с табличками залов: прячется, пока табличка в кадре, и во время прохода по коллекциям
        const plaqueIn = plaques.some((p) => { const r = p.getBoundingClientRect(); return r.bottom > 0 && r.top < vh; });
        plan.classList.toggle('is-muted', plaqueIn || (c.top < vh * 0.5 && c.bottom > vh * 0.5));
        plan.classList.toggle('is-dark', b.top < vh * 0.5 && b.bottom > vh * 0.5);
      }
      if (mbar) {
        // Плашка не дублирует кнопки первого экрана; с появлением карточки визита прячется до конца страницы;
        // не закрывает трек и счётчик каталога
        const zone = vh - 84;
        const ctaGone = heroCta.getBoundingClientRect().bottom < 0;
        const cardReached = card.getBoundingClientRect().top < vh;
        const over = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.bottom > zone && r.top < vh; };
        mbar.classList.toggle('is-on', ctaGone && !cardReached && !menuOpen && !over(enfBar) && !over(track));
        // В зале «Материалы» WhatsApp в плашке несёт выбранную фактуру
        if (mbarWa && fabricHref) {
          const m = materials.getBoundingClientRect();
          const href = m.top < vh * 0.5 && m.bottom > vh * 0.5 ? fabricHref : mbarWaGeneral;
          if (mbarWa.href !== href) mbarWa.href = href;
        }
      }
      const h = pickHall();
      if ((h ? h.id : '') !== hallId) setHall(h);
      enfTarget();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Курсор «Ближе»: только над фотографиями, только мышь ---------- */
  $$('button.work[data-lightbox]').forEach((b) => { if ($('img', b)) b.setAttribute('data-photo', ''); });
  if (mqHover.matches && !reduced) {
    const cur = document.createElement('div');
    cur.className = 'cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<span>Ближе</span>';
    document.body.append(cur);
    root.classList.add('has-cursor');
    let tx = -200, ty = -200, cx = -200, cy = -200, craf = 0, delay = 0;
    const loop = () => {
      craf = 0;
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cur.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      if (Math.abs(tx - cx) > 0.2 || Math.abs(ty - cy) > 0.2) craf = requestAnimationFrame(loop);
    };
    document.addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!cur.classList.contains('is-on')) { cx = tx; cy = ty; }
      if (!craf) craf = requestAnimationFrame(loop);
    }, { passive: true });
    const off = () => { clearTimeout(delay); cur.classList.remove('is-on'); };
    $$('[data-photo]').forEach((el) => {
      el.addEventListener('pointerenter', () => { clearTimeout(delay); delay = setTimeout(() => cur.classList.add('is-on'), 150); });
      el.addEventListener('pointerleave', off);
      el.addEventListener('click', off);
    });
  }

  mqReduce.addEventListener('change', (e) => {
    reduced = e.matches;
    root.classList.toggle('reduce', reduced);
    enfLayout();
  });

  enfLayout();
  onScroll();
})();
