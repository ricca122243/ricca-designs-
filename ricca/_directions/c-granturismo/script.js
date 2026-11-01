/* RICCA DESIGNS — «Gran Turismo». Vanilla JS, без зависимостей. */
(() => {
  'use strict';
  const d = document;
  const root = d.documentElement;
  const mqRM = window.matchMedia('(prefers-reduced-motion: reduce)');
  let RM = mqRM.matches;
  if (RM) root.classList.add('rm');
  const isDesk = () => window.innerWidth >= 900;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));

  /* ---------- WhatsApp: ссылки с готовым сообщением ---------- */
  const WA = '77084802047';
  const MSG = {
    general: 'Здравствуйте! Хочу узнать о мебели RICCA на заказ.',
    showroom: 'Здравствуйте! Хочу записаться в шоурум RICCA.',
    eluna: 'Здравствуйте! Интересуют матрасы ELUNA.',
    business: 'Здравствуйте! Хочу обсудить проект для бизнеса.',
    master: 'Здравствуйте! У меня вопрос к мастеру RICCA.'
  };
  $$('[data-wa]').forEach((a) => {
    const k = a.dataset.wa;
    const m = k === 'collection'
      ? `Здравствуйте! Пришлите, пожалуйста, подборку: «${a.dataset.name}».`
      : MSG[k];
    if (m) a.href = `https://wa.me/${WA}?text=${encodeURIComponent(m)}`;
  });

  /* ---------- интро первого экрана ---------- */
  const heroImg = $('.hero__shutter img');
  let started = false;
  const start = () => { if (started) return; started = true; requestAnimationFrame(() => root.classList.add('is-loaded')); };
  if (heroImg && !heroImg.complete) {
    heroImg.addEventListener('load', start, { once: true });
    heroImg.addEventListener('error', start, { once: true });
    setTimeout(start, 900);
  } else start();

  /* ---------- шапка, меню, док ---------- */
  const hdr = $('#hdr');
  const menuBtn = $('.hdr__menu');
  const menu = $('#menu');
  const dock = $('#dock');
  let menuOpen = false;
  let lastY = window.scrollY;

  const setMenu = (open) => {
    menuOpen = open;
    menuBtn.setAttribute('aria-expanded', String(open));
    $('.hdr__menu-label', menuBtn).textContent = open ? 'Закрыть' : 'Меню';
    if (open) {
      menu.hidden = false;
      root.classList.add('menu-open');
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      const first = $('a', menu); if (first) setTimeout(() => first.focus({ preventScroll: true }), 300);
    } else {
      menu.classList.remove('is-open');
      root.classList.remove('menu-open');
      setTimeout(() => { if (!menuOpen) menu.hidden = true; }, RM ? 0 : 800);
    }
  };
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  d.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); }
  });

  /* ---------- плавный переход по якорям (только по клику, чтобы scrollTo оставался мгновенным) ---------- */
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const t = id ? d.getElementById(id) : null;
    if (!t) return;
    e.preventDefault();
    const top = id === 'top' ? 0 : t.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: RM ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', `#${id}`);
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  });

  /* ---------- проявления ---------- */
  const revealEls = $$('[data-reveal]');
  // задержки для рядов внутри одного родителя
  const groups = new Map();
  revealEls.filter((el) => el.dataset.reveal === 'row').forEach((el) => {
    const p = el.parentElement;
    const i = groups.get(p) || 0;
    el.style.setProperty('--d', `${Math.min(i, 6) * 0.08}s`);
    groups.set(p, i + 1);
  });
  const ftrMark = $('.ftr__mark');
  if (RM || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-in'));
    if (ftrMark) ftrMark.classList.add('is-in');
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
    revealEls.forEach((el) => io.observe(el));
    if (ftrMark) io.observe(ftrMark);
  }

  /* ---------- коллекции: окно предпросмотра ---------- */
  const collItems = $$('.coll__item');
  const pvs = $$('.coll__window .pv');
  const capN = $('.coll__cap-n');
  const capT = $('.coll__cap-t');
  let curPv = 0;
  let hoverList = false;
  const setPv = (i) => {
    if (i === curPv || !pvs[i]) return;
    pvs.forEach((p) => p.classList.remove('is-prev'));
    pvs[curPv].classList.remove('is-active');
    pvs[curPv].classList.add('is-prev');
    pvs[i].classList.add('is-active');
    collItems.forEach((it, k) => it.classList.toggle('is-active', k === i));
    curPv = i;
    if (capN) capN.textContent = `${String(i + 1).padStart(2, '0')} / 06`;
    if (capT) capT.textContent = $('.coll__name', collItems[i]).textContent;
  };
  collItems.forEach((it, i) => {
    it.addEventListener('mouseenter', () => { if (isDesk()) setPv(i); });
    it.addEventListener('focusin', () => setPv(i));
  });
  const collList = $('.coll__list');
  if (collList) {
    collList.addEventListener('mouseenter', () => { hoverList = true; });
    collList.addEventListener('mouseleave', () => { hoverList = false; });
  }

  /* ---------- кинозал: синхронизация шагов и кадра ---------- */
  const viewer = $('#viewer');
  const steps = $$('.step');
  const vids = viewer ? $$('.viewer__v', viewer) : [];
  const scene = viewer && $('.viewer__scene b', viewer);
  const sceneName = viewer && $('.viewer__name', viewer);
  const bar = viewer && $('.viewer__bar', viewer);
  const toggle = viewer && $('.viewer__toggle', viewer);
  let curStep = -1;
  let vi = 0;
  let filmVisible = false;
  let userPaused = RM; // при reduced motion видео само не стартует

  const setSources = (video, name) => {
    video.innerHTML = '';
    [['webm', 'video/webm'], ['mp4', 'video/mp4']].forEach(([ext, type]) => {
      const s = d.createElement('source');
      s.src = `../../video/${name}.${ext}`;
      s.type = type;
      video.appendChild(s);
    });
    video.poster = `../../img/process/${name}.webp`;
    video.dataset.clip = name;
    video.load();
    video.defaultPlaybackRate = 0.8;
    video.playbackRate = 0.8;
  };
  const playSafe = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const chainClips = (video, clips) => {
    let k = 0;
    video.loop = clips.length === 1;
    video.onended = clips.length > 1 ? () => {
      k = (k + 1) % clips.length;
      setSources(video, clips[k]);
      if (!userPaused && filmVisible) playSafe(video);
    } : null;
  };
  const activateStep = (i) => {
    if (i === curStep || !steps[i]) return;
    curStep = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    if (!vids.length) return;
    const clips = steps[i].dataset.clips.split(' ');
    const next = vids[1 - vi];
    const prev = vids[vi];
    setSources(next, clips[0]);
    chainClips(next, clips);
    next.classList.add('is-on');
    prev.classList.remove('is-on');
    vi = 1 - vi;
    setTimeout(() => { if (!prev.classList.contains('is-on')) prev.pause(); }, 1000);
    if (!userPaused && filmVisible) playSafe(next);
    if (scene) scene.textContent = String(i + 1).padStart(2, '0');
    if (sceneName) sceneName.textContent = steps[i].dataset.name || steps[i].querySelector('.step__t').textContent.trim();
  };
  if (viewer && vids.length) {
    // первый кадр
    const firstClips = steps[0].dataset.clips.split(' ');
    setSources(vids[0], firstClips[0]);
    chainClips(vids[0], firstClips);
    curStep = 0;
    vi = 0;
    if (RM) viewer.classList.add('is-paused');
    toggle.addEventListener('click', () => {
      const v = vids[vi];
      if (v.paused) { userPaused = false; playSafe(v); viewer.classList.remove('is-paused'); toggle.setAttribute('aria-label', 'Пауза'); }
      else { userPaused = true; v.pause(); viewer.classList.add('is-paused'); toggle.setAttribute('aria-label', 'Смотреть фильм'); }
    });
    if (RM) toggle.setAttribute('aria-label', 'Смотреть фильм');
  }

  // телефон: у каждого шага свой маленький ролик, играет только в зоне видимости
  const mobileVideos = new Map();
  let mobIO = null;
  const setupMobileSteps = () => {
    if (mobIO || !('IntersectionObserver' in window)) return;
    mobIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (isDesk()) return;
        const fig = en.target;
        let v = mobileVideos.get(fig);
        if (en.isIntersecting && en.intersectionRatio >= 0.6) {
          if (RM) return;
          if (!v) {
            v = d.createElement('video');
            v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
            v.preload = 'auto';
            v.setAttribute('aria-hidden', 'true');
            const clips = fig.closest('.step').dataset.clips.split(' ');
            setSources(v, clips[0]);
            chainClips(v, clips);
            v.addEventListener('playing', () => v.classList.add('is-playing'));
            fig.appendChild(v);
            mobileVideos.set(fig, v);
          }
          filmVisible = true;
          playSafe(v);
        } else if (v) {
          v.pause();
        }
      });
    }, { threshold: [0, 0.6, 1] });
    $$('.step__fig').forEach((f) => mobIO.observe(f));
  };
  setupMobileSteps();

  /* ---------- главы ---------- */
  const chapter = $('#chapter');
  const chapNum = chapter && $('.chapter__num b', chapter);
  const chapTitle = chapter && $('.chapter__title', chapter);
  const chapTrack = chapter && $('.chapter__track i', chapter);
  const chapters = $$('[data-chapter]');
  const darkSecs = $$('[data-dark]');
  const navLinks = $$('.nav a');
  let curChap = '';

  /* ---------- сцена: параллакс и разлёт букв ---------- */
  const hero = $('.hero');
  const mark = $('.hero__mark');
  const markLetters = mark ? $$('span', mark) : [];
  const product = $('.hero__product');
  const parallaxEls = $$('[data-parallax]').map((el) => ({ el, img: $('img', el), k: parseFloat(el.dataset.parallax) || 0.06 }));
  const contacts = $('#contacts');
  const ftr = $('.ftr');
  const collSec = $('#collections');
  const filmSec = $('#process');

  let ticking = false;
  const frame = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // шапка
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 24);
      if (Math.abs(y - lastY) > 6) {
        const down = y > lastY && y > vh * 0.8;
        hdr.classList.toggle('is-hidden', down && !menuOpen);
        lastY = y;
      }
      const hh = hdr.offsetHeight / 2;
      let dark = false;
      darkSecs.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top <= hh && r.bottom >= hh) dark = true; });
      hdr.classList.toggle('is-dark', dark && !menuOpen);
    }

    // сцена
    if (hero && !RM) {
      const hH = hero.offsetHeight;
      const p = clamp(y / hH, 0, 1);
      if (p < 1) {
        const fs = parseFloat(getComputedStyle(mark).fontSize) || 200;
        markLetters.forEach((s, i) => {
          s.style.transform = `translate3d(${((i - 2) * p * fs * 0.22).toFixed(1)}px,0,0)`;
        });
        mark.style.transform = `translate3d(0,${(-p * vh * 0.12).toFixed(1)}px,0)`;
        mark.style.opacity = String(clamp(1 - p * 1.25, 0, 1));
        if (vw >= 900) product.style.transform = `translate3d(0,${(p * vh * 0.16).toFixed(1)}px,0) scale(${(1 + p * 0.045).toFixed(4)})`;
        else product.style.transform = `translate3d(0,${(p * vh * 0.08).toFixed(1)}px,0)`;
      }
    }

    // параллакс внутри рамок
    if (!RM) {
      parallaxEls.forEach(({ el, img, k }) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100 || !img) return;
        const c = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        img.style.transform = `translate3d(0,${(-clamp(c, -1, 1) * k * r.height).toFixed(1)}px,0)`;
      });
    }

    // главы
    let cur = null;
    chapters.forEach((s) => { if (s.getBoundingClientRect().top <= vh * 0.5) cur = s; });
    if (chapter) {
      const fr = ftr ? ftr.getBoundingClientRect().top : Infinity;
      chapter.classList.toggle('is-on', !!cur && fr > vh * 0.55);
      if (cur) {
        const r = cur.getBoundingClientRect();
        const pr = clamp((vh * 0.5 - r.top) / r.height, 0, 1);
        chapTrack.style.setProperty('--p', pr.toFixed(3));
        if (cur.dataset.chapter !== curChap) {
          curChap = cur.dataset.chapter;
          chapNum.textContent = curChap;
          chapTitle.textContent = cur.dataset.title;
        }
        chapter.classList.toggle('is-dark', cur.hasAttribute('data-dark'));
      }
    }
    navLinks.forEach((a) => a.classList.toggle('is-current', !!cur && a.getAttribute('href') === `#${cur.id}`));

    // коллекции: активная строка по прокрутке (на десктопе, если курсор не над списком)
    if (collSec && vw >= 900 && !hoverList) {
      const r = collSec.getBoundingClientRect();
      if (r.top >= vh) setPv(0);
      else if (r.bottom > 0) {
        let best = curPv; let bd = Infinity;
        collItems.forEach((it, i) => {
          const ir = it.getBoundingClientRect();
          const dd = Math.abs(ir.top + ir.height / 2 - vh * 0.48);
          if (dd < bd) { bd = dd; best = i; }
        });
        setPv(best);
      }
    }

    // кинозал: экран раскрывается по ширине, пока секция входит в кадр
    if (filmSec && !RM) {
      const r = filmSec.getBoundingClientRect();
      const t = clamp((vh - r.top) / (vh * 0.85), 0, 1);
      const e = 1 - Math.pow(1 - t, 3);
      filmSec.style.setProperty('--ap', `${((1 - e) * Math.min(vw * 0.05, 72)).toFixed(1)}px`);
    }

    // кинозал (десктоп)
    if (filmSec && vids.length && vw >= 900) {
      const r = filmSec.getBoundingClientRect();
      const vis = r.top < vh && r.bottom > 0;
      if (vis !== filmVisible) {
        filmVisible = vis;
        const v = vids[vi];
        if (vis && !userPaused) playSafe(v); else if (!vis) v.pause();
      }
      if (r.top >= vh) activateStep(0);
      if (vis) {
        let best = curStep; let bd = Infinity;
        steps.forEach((s, i) => {
          const sr = s.getBoundingClientRect();
          const dd = Math.abs(sr.top + sr.height / 2 - vh * 0.5);
          if (dd < bd) { bd = dd; best = i; }
        });
        activateStep(best);
      }
    }

    // док на телефоне
    if (dock) {
      const heroEnd = hero ? hero.offsetHeight * 0.75 : 600;
      const cTop = contacts ? contacts.getBoundingClientRect().top : Infinity;
      dock.classList.toggle('is-on', vw < 900 && y > heroEnd && cTop > vh * 0.85 && !menuOpen);
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    if (isDesk() && menuOpen) setMenu(false);
    if (hero && window.innerWidth < 900 && product) product.style.transform = '';
    onScroll();
  });
  frame();

  /* ---------- полоса прогресса ролика ---------- */
  if (bar) {
    const tick = () => {
      const v = vids[vi];
      if (v && v.duration) bar.style.setProperty('--t', (v.currentTime / v.duration).toFixed(4));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- смена настройки reduced motion на лету ---------- */
  const onRM = (e) => {
    RM = e.matches;
    root.classList.toggle('rm', RM);
    if (RM) {
      revealEls.forEach((el) => el.classList.add('is-in'));
      if (ftrMark) ftrMark.classList.add('is-in');
      markLetters.forEach((s) => { s.style.transform = ''; });
      if (mark) { mark.style.transform = ''; mark.style.opacity = ''; }
      if (product) product.style.transform = '';
      parallaxEls.forEach(({ img }) => { if (img) img.style.transform = ''; });
      vids.forEach((v) => v.pause());
      mobileVideos.forEach((v) => v.pause());
      userPaused = true;
      if (viewer) viewer.classList.add('is-paused');
    }
  };
  if (mqRM.addEventListener) mqRM.addEventListener('change', onRM);
})();
