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

    updateSewing();
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

  /* ---------- Как мы делаем: сцена + шов ---------- */
  const steps = $$('.step');
  const stepsList = $('.steps');
  const stageVids = $$('.stage__v');
  const stageNo = $('[data-stage-no]');
  const stageName = $('[data-stage-name]');
  let activeIdx = -1;
  let front = 0;
  let stageClips = [];
  let clipPos = 0;

  function updateSewing() {
    if (!stepsList) return;
    const r = stepsList.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = (vh * 0.5 - r.top) / Math.max(1, r.height);
    stepsList.style.setProperty('--sewn', Math.min(1, Math.max(0, p)).toFixed(4));
  }

  function loadInto(v, name, loop) {
    v.loop = loop;
    v.poster = `${POSTER}${name}.webp`;
    if (reduce.matches) { v.removeAttribute('src'); v.load(); return; }
    v.src = clipSrc(name);
    v.playbackRate = 0.8;
    v.defaultPlaybackRate = 0.8;
  }

  function stageShow(idx) {
    if (idx === activeIdx || !stageVids.length) return;
    activeIdx = idx;
    const step = steps[idx];
    steps.forEach((s, i) => {
      s.classList.toggle('is-active', i === idx);
      s.classList.toggle('is-done', i < idx);
    });
    const n = step.classList.contains('step--final') ? '—' : String(idx + 1).padStart(2, '0');
    stageNo.textContent = n;
    stageName.textContent = step.dataset.name;
    if (!mqDesk.matches) return;

    stageClips = step.dataset.clips.split(' ');
    clipPos = 0;
    const back = stageVids[1 - front];
    const cur = stageVids[front];
    loadInto(back, stageClips[0], stageClips.length === 1);
    const swap = () => {
      back.classList.add('is-on');
      cur.classList.remove('is-on');
      setTimeout(() => { cur.pause(); }, 1000);
      front = 1 - front;
    };
    if (reduce.matches) { swap(); return; }
    back.addEventListener('loadeddata', function once() {
      back.removeEventListener('loadeddata', once);
      back.playbackRate = 0.8;
      safePlay(back);
      swap();
    });
    back.load();
  }

  // Шаг из двух клипов (раскрой → обивка) идёт цепочкой
  stageVids.forEach((v) => v.addEventListener('ended', () => {
    if (stageClips.length < 2 || !v.classList.contains('is-on')) return;
    clipPos = (clipPos + 1) % stageClips.length;
    v.poster = `${POSTER}${stageClips[clipPos]}.webp`;
    v.src = clipSrc(stageClips[clipPos]);
    v.playbackRate = 0.8;
    safePlay(v);
  }));

  if (steps.length && 'IntersectionObserver' in window) {
    const stepIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) stageShow(steps.indexOf(e.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    steps.forEach((s) => stepIO.observe(s));

    // Телефон: у каждого шага свой ролик, играет только видимый
    const inlineIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const v = e.target;
        if (mqDesk.matches) return;
        if (e.isIntersecting) {
          if (reduce.matches) return;
          if (!v.dataset.ready) {
            v.src = clipSrc(v.dataset.src);
            v.dataset.ready = '1';
          }
          v.playbackRate = 0.8;
          safePlay(v);
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.6 });
    $$('.step__media video').forEach((v) => {
      v.addEventListener('loadeddata', () => { v.playbackRate = 0.8; });
      inlineIO.observe(v);
    });
  }
  if (steps.length) stageShow(0);

  /* ---------- Фильм целиком ---------- */
  const film = $('#film');
  const filmVideo = film ? $('video', film) : null;
  $$('[data-film-open]').forEach((b) => b.addEventListener('click', () => {
    if (!film) return;
    if (typeof film.showModal === 'function') film.showModal(); else film.setAttribute('open', '');
    if (!reduce.matches) safePlay(filmVideo);
  }));
  const closeFilm = () => { filmVideo.pause(); if (film.open) film.close(); };
  if (film) {
    $('[data-film-close]', film).addEventListener('click', closeFilm);
    film.addEventListener('click', (e) => { if (e.target === film) closeFilm(); });
    film.addEventListener('close', () => filmVideo.pause());
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
