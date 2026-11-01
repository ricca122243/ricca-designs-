/* RICCA DESIGNS — «Sartoria». Ванильный JS, без зависимостей. */
(() => {
  'use strict';

  const doc = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqDesk = window.matchMedia('(min-width: 760px)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- WhatsApp: ссылки с готовым текстом ---------- */
  const WA = '77084802047';
  const waText = {
    general: 'Здравствуйте! Хочу узнать о мебели RICCA на заказ.',
    showroom: 'Здравствуйте! Хочу записаться в шоурум RICCA.',
    eluna: 'Здравствуйте! Интересуют матрасы ELUNA.',
    business: 'Здравствуйте! Хочу обсудить проект для бизнеса.',
    master: 'Здравствуйте! У меня вопрос к мастеру RICCA.',
    collection: (el) => `Здравствуйте! Пришлите, пожалуйста, подборку: «${el.dataset.name}».`,
    fabric: (el) => `Здравствуйте! Хочу подобрать ткань: «${el.dataset.name || 'Букле · мел'}».`
  };
  const waHref = (el) => {
    const t = waText[el.dataset.wa];
    const msg = typeof t === 'function' ? t(el) : t;
    return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  };
  const setWa = (el) => { el.href = waHref(el); };
  $$('[data-wa]').forEach(setWa);

  /* ---------- Первый экран ---------- */
  const markLoaded = () => requestAnimationFrame(() => doc.classList.add('is-loaded'));
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]).then(markLoaded);
  } else {
    markLoaded();
  }

  /* ---------- Эскизы: подготовка к отрисовке линией ---------- */
  $$('.sk').forEach((svg) => {
    $$('rect, path, line, circle', svg).forEach((el) => {
      if (el.matches('.sk-seam, .sk-dim, .sk-floor, .sk-shadow')) return;
      el.setAttribute('pathLength', '1');
    });
  });

  /* ---------- Проявление при прокрутке ---------- */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce.matches) {
    let batch = [];
    let raf = 0;
    const flush = () => {
      batch.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      batch.forEach((el, i) => {
        el.style.setProperty('--d', `${Math.min(i, 6) * 0.09}s`);
        el.classList.add('is-in');
      });
      batch = [];
      raf = 0;
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        batch.push(e.target);
      });
      if (batch.length && !raf) raf = requestAnimationFrame(flush);
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
    // Страховка: при быстром пролёте или переходе по якорю проявляем всё, что уже выше края экрана
    let sweepT = 0;
    const sweepPassed = () => {
      const lim = window.innerHeight * 0.92;
      revealEls.forEach((el) => {
        if (el.classList.contains('is-in')) return;
        if (el.getBoundingClientRect().top < lim) { io.unobserve(el); el.classList.add('is-in'); }
      });
    };
    window.addEventListener('scroll', () => { clearTimeout(sweepT); sweepT = setTimeout(sweepPassed, 160); }, { passive: true });
    // Колонтитулы проявляются вместе со своим швом
    $$('.runhead').forEach((el) => { if (!el.hasAttribute('data-reveal')) io.observe(el); });
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Шапка: фон, скрытие, активный пункт ---------- */
  const hdr = $('[data-hdr]');
  const navLinks = $$('.hdr__nav a');
  const chapters = $$('[data-chapter]');
  const tapeLabel = $('.tape__label');
  const dock = $('[data-dock]');
  const hero = $('.hero');
  const showroom = $('#showroom');
  let lastY = window.scrollY;
  let ticking = false;
  let menuOpen = false;

  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = Math.max(1, doc.scrollHeight - vh);

    hdr.classList.toggle('is-solid', y > 24 || menuOpen);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (!menuOpen) {
      if (goingDown && y > vh * 0.9) hdr.classList.add('is-hidden');
      else if (goingUp || y < vh * 0.5) hdr.classList.remove('is-hidden');
    }
    lastY = y;

    // Лента: игла показывает, сколько «отмерено»
    doc.style.setProperty('--tape-p', (y / max).toFixed(4));
    doc.style.setProperty('--tape-off', `${(-y * 0.35) % 40}px`);

    // Текущая глава
    let current = chapters[0];
    for (const c of chapters) {
      if (c.getBoundingClientRect().top <= vh * 0.42) current = c;
    }
    if (current) {
      const name = current.dataset.chapter;
      if (tapeLabel && tapeLabel.textContent !== name) tapeLabel.textContent = name;
      const id = current.id;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
    }

    // Липкая плашка на телефоне: после первого экрана и до шоурума
    if (dock) {
      const heroBottom = hero.getBoundingClientRect().bottom;
      const showTop = showroom.getBoundingClientRect().top;
      dock.classList.toggle('is-on', heroBottom < 0 && showTop > vh * 0.85 && !menuOpen);
    }

  };
  const requestScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll);

  /* ---------- Мобильное меню ---------- */
  const menuBtn = $('.hdr__menu');
  const menu = $('#menu');
  const menuTxt = $('.hdr__menu-txt');
  const setMenu = (open) => {
    menuOpen = open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuTxt.textContent = open ? 'Закрыть' : 'Меню';
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      document.body.style.overflow = 'hidden';
      hdr.classList.remove('is-hidden');
    } else {
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
      const done = () => { if (!menuOpen) menu.hidden = true; };
      reduce.matches ? done() : setTimeout(done, 800);
    }
    requestScroll();
  };
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); } });

  /* ---------- Каталог на телефоне: линейка прогресса ---------- */
  const album = $('[data-album]');
  if (album) {
    album.addEventListener('scroll', () => {
      const m = album.scrollWidth - album.clientWidth;
      album.parentElement.style.setProperty('--album-p', m > 0 ? (album.scrollLeft / m).toFixed(4) : 0);
    }, { passive: true });
  }

  /* ---------- Видео: общие помощники ---------- */
  const VIDEO = '../../video/';
  const POSTER = '../../img/process/';
  const canWebm = (() => { const v = document.createElement('video'); return !!v.canPlayType && v.canPlayType('video/webm; codecs="vp9"') !== ''; })();
  const clipSrc = (name) => `${VIDEO}${name}.${canWebm ? 'webm' : 'mp4'}`;
  const safePlay = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };

  /* ---------- Как мы делаем: фильм по главам ---------- */
  const film = $('[data-chapters]');
  const chs = $$('.ch');
  const stageVids = $$('.stage__v');
  const stageNo = $('[data-stage-no]');
  const stageName = $('[data-stage-name]');
  const stageDesc = $('[data-stage-desc]');
  const sewn = $('.chapters__list');
  const DUR = 4600;               // сколько длится глава в автоматическом режиме
  let active = 0;
  let front = 0;
  let clips = [];
  let clipPos = 0;
  let auto = !reduce.matches;
  let inView = false;
  let timer = 0;
  let started = false;

  function loadInto(v, name) {
    v.poster = `${POSTER}${name}.webp`;
    if (reduce.matches) { v.removeAttribute('src'); return; }
    v.src = clipSrc(name);
  }

  function schedule() {
    clearTimeout(timer);
    if (!auto || !inView) return;
    const d = chs[active].classList.contains('ch--final') ? DUR + 1600 : DUR;
    film.style.setProperty('--dur', `${d}ms`);
    timer = setTimeout(() => select((active + 1) % chs.length, false), d);
  }

  function select(idx, byUser) {
    if (byUser && auto) { auto = false; film.classList.remove('is-auto'); }
    const changed = idx !== active || !started;
    active = idx;
    const ch = chs[idx];
    chs.forEach((c, i) => {
      c.classList.toggle('is-active', i === idx);
      c.classList.toggle('is-done', i < idx);
      c.setAttribute('aria-pressed', String(i === idx));
    });
    // перезапуск полоски-стежка у активной главы
    const bar = $('.ch__bar', ch);
    if (bar) { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; }
    sewn.style.setProperty('--sewn', (idx / (chs.length - 1)).toFixed(4));
    stageNo.textContent = ch.classList.contains('ch--final') ? '—' : String(idx + 1).padStart(2, '0');
    stageName.textContent = ch.dataset.name;
    if (stageDesc) stageDesc.textContent = ch.dataset.text;

    if (changed) {
      started = true;
      clips = ch.dataset.clips.split(' ');
      clipPos = 0;
      const back = stageVids[1 - front];
      const cur = stageVids[front];
      back.loop = clips.length === 1;
      loadInto(back, clips[0]);
      const swap = () => {
        back.classList.add('is-on');
        cur.classList.remove('is-on');
        back.removeAttribute('aria-hidden');
        cur.setAttribute('aria-hidden', 'true');
        setTimeout(() => cur.pause(), 1000);
        front = 1 - front;
      };
      if (reduce.matches || !back.src) { swap(); }
      else {
        back.addEventListener('loadeddata', function once() {
          back.removeEventListener('loadeddata', once);
          back.playbackRate = 0.8;
          if (inView) safePlay(back);
          swap();
        });
        back.load();
      }
    }
    schedule();
  }

  if (film && chs.length) {
    if (auto) film.classList.add('is-auto');
    chs.forEach((c, i) => c.addEventListener('click', () => select(i, true)));

    // Глава из двух клипов (раскрой → обивка) идёт цепочкой
    stageVids.forEach((v) => v.addEventListener('ended', () => {
      if (!v.classList.contains('is-on') || clips.length < 2) return;
      clipPos = (clipPos + 1) % clips.length;
      v.poster = `${POSTER}${clips[clipPos]}.webp`;
      v.src = clipSrc(clips[clipPos]);
      v.playbackRate = 0.8;
      safePlay(v);
    }));

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          inView = e.isIntersecting;
          const v = stageVids[front];
          if (inView) {
            if (!started) select(active, false);
            else if (!reduce.matches && v.src) safePlay(v);
            schedule();
          } else {
            clearTimeout(timer);
            stageVids.forEach((x) => x.pause());
          }
        });
      }, { threshold: 0.35 }).observe(film);
    }
  }

  /* ---------- Фильм целиком ---------- */
  const filmDlg = $('#film');
  const filmVideo = filmDlg ? $('video', filmDlg) : null;
  $$('[data-film-open]').forEach((b) => b.addEventListener('click', () => {
    if (!filmDlg) return;
    stageVids.forEach((x) => x.pause());
    clearTimeout(timer);
    if (typeof filmDlg.showModal === 'function') filmDlg.showModal(); else filmDlg.setAttribute('open', '');
    if (!reduce.matches) safePlay(filmVideo);
  }));
  const closeFilm = () => { filmVideo.pause(); if (filmDlg.open) filmDlg.close(); };
  if (filmDlg) {
    $('[data-film-close]', filmDlg).addEventListener('click', closeFilm);
    filmDlg.addEventListener('click', (e) => { if (e.target === filmDlg) closeFilm(); });
    filmDlg.addEventListener('close', () => {
      filmVideo.pause();
      if (inView && !reduce.matches && stageVids[front].src) safePlay(stageVids[front]);
      schedule();
    });
  }

  /* ---------- Примерочная: образцы тканей и кож ---------- */
  const FABRICS = [
    { type: 'Букле', tone: 'мел', c: '#ECE5D8', t: 'boucle', d: 'Петельная фактура: мягкая, тёплая, живая на свету.' },
    { type: 'Шенилл', tone: 'туман', c: '#CFC9C0', t: 'chenille', d: 'Плотная мягкая ткань с лёгким блеском ворса.' },
    { type: 'Лён', tone: 'овёс', c: '#D9CBB0', t: 'linen', d: 'Матовое переплетение с неровной, природной нитью.' },
    { type: 'Велюр', tone: 'шалфей', c: '#9EA48F', t: 'velour', d: 'Короткий бархатистый ворс и глубокий, спокойный цвет.' },
    { type: 'Велюр', tone: 'терракота', c: '#A65D43', t: 'velour', d: 'Короткий бархатистый ворс и глубокий, тёплый цвет.' },
    { type: 'Рогожка', tone: 'графит', c: '#66625C', t: 'matting', d: 'Плотное плетение «в корзинку»: спокойное и практичное.' },
    { type: 'Кожа', tone: 'слоновая кость', c: '#E6DCC8', t: 'leather', d: 'Гладкая кожа: с годами она только благороднее.' },
    { type: 'Кожа', tone: 'коньяк', c: '#9A643D', t: 'leather', d: 'Гладкая кожа: с годами она только благороднее.' },
    { type: 'Кожа', tone: 'табак', c: '#634634', t: 'leather', d: 'Гладкая кожа: с годами она только благороднее.' }
  ];
  const texUrl = (t) => `media/tex-${t}.webp`;
  const colA = $('[data-fabric-color]');
  const texA = $('[data-fabric-tex]');
  const colB = $('[data-fabric-color-next]');
  const texB = $('[data-fabric-tex-next]');
  const sweep = $('.sofa__fill--next');
  const fabricWa = $('[data-wa="fabric"]');
  let sweepTimer = 0;

  const applyA = (f) => { colA.setAttribute('fill', f.c); texA.setAttribute('href', texUrl(f.t)); };
  const setFabric = (f) => {
    $$('[data-f-type]').forEach((el) => { el.textContent = f.type; });
    $$('[data-f-tone]').forEach((el) => { el.textContent = f.tone; });
    const desc = $('[data-f-desc]');
    if (desc) desc.textContent = f.d;
    if (fabricWa) { fabricWa.dataset.name = `${f.type} · ${f.tone}`; setWa(fabricWa); }

    if (reduce.matches || !sweep) { applyA(f); return; }
    clearTimeout(sweepTimer);
    colB.setAttribute('fill', f.c);
    texB.setAttribute('href', texUrl(f.t));
    sweep.classList.remove('is-sweeping');
    void sweep.getBoundingClientRect();
    sweep.classList.add('is-sweeping');
    sweepTimer = setTimeout(() => {
      applyA(f);
      sweep.classList.remove('is-sweeping');
    }, 1150);
  };
  $$('input[name="fabric"]').forEach((inp) => inp.addEventListener('change', () => {
    if (inp.checked) setFabric(FABRICS[Number(inp.value)]);
  }));

  onScroll();
})();
