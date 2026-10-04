/* RICCA DESIGNS — «Galleria». Ванильный JS, без зависимостей. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mqDesk = window.matchMedia('(min-width: 1024px) and (min-height: 620px)');
  let reduced = mqReduce.matches;
  if (reduced) root.classList.add('reduce');

  /* ---------- WhatsApp: ссылки с готовым сообщением ---------- */
  const WA = '77084802047';
  const MSG = {
    general: 'Здравствуйте! Хочу узнать о мебели RICCA на заказ.',
    showroom: 'Здравствуйте! Хочу записаться в шоурум RICCA.',
    eluna: 'Здравствуйте! Интересуют матрасы ELUNA.',
    business: 'Здравствуйте! Хочу обсудить проект для бизнеса.',
    master: 'Здравствуйте! У меня вопрос к мастеру RICCA.'
  };
  const waUrl = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  $$('[data-wa]').forEach((a) => {
    const key = a.dataset.wa;
    const text = key === 'col'
      ? `Здравствуйте! Пришлите, пожалуйста, подборку: «${a.dataset.col}».`
      : (MSG[key] || MSG.general);
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

  /* ---------- Вход героя ---------- */
  const enter = () => requestAnimationFrame(() => root.classList.add('is-loaded'));
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 900))]).then(enter);

  /* ---------- Шапка, план, плашка ---------- */
  const hdr = $('#hdr');
  const plan = $('[data-plan]');
  const mbar = $('[data-mbar]');
  const footer = $('.colophon');
  const showroom = $('#showroom');
  const contacts = $('#contacts');

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY;
      const vh = window.innerHeight;
      hdr.classList.toggle('is-scrolled', y > 24);
      const fTop = footer.getBoundingClientRect().top;
      if (plan) plan.classList.toggle('is-on', y > vh * 0.75 && fTop > vh * 0.6);
      if (mbar) {
        const sTop = showroom.getBoundingClientRect().top;
        const cBottom = contacts.getBoundingClientRect().bottom;
        const inContact = sTop < vh * 0.9 && cBottom > 0;
        mbar.classList.toggle('is-on', y > vh * 0.9 && !inContact && fTop > vh);
      }
      enfTarget();
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Мобильное меню ---------- */
  const menuBtn = $('.hdr__menu');
  const menu = $('#menu');
  const menuLabel = $('.hdr__menu-label');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menuLabel.textContent = open ? menuLabel.dataset.close : menuLabel.dataset.open;
    if (open) {
      menu.hidden = false;
      menu.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      const first = $('a', menu);
      if (first) first.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      menu.hidden = true;
      document.body.style.overflow = '';
    }
  };
  if (menuBtn && menu) {
    menuBtn.setAttribute('aria-label', 'Открыть меню');
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
    });
    mqDesk.addEventListener('change', () => setMenu(false));
  }

  /* ---------- Появления ---------- */
  $$('[data-reveal]').forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((n) => n.hasAttribute('data-reveal'));
    const i = sibs.indexOf(el);
    el.style.setProperty('--d', `${Math.min(i, 5) * 90}ms`);
  });

  /* Эскизы: каждая линия получает свою задержку */
  $$('.sketch').forEach((svg) => {
    $$('.sk-line > *, .sk-dim path, .sk-floor', svg).forEach((n, i) => {
      n.setAttribute('pathLength', '1');
      n.classList.add('sk-draw');
      n.style.setProperty('--sd', `${200 + i * 85}ms`);
    });
  });

  const revealTargets = $$('[data-reveal], .exhibit');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Анфилада: горизонтальный проход по залу ---------- */
  const enf = $('[data-enfilade]');
  const move = enf ? $('[data-move]', enf) : null;
  const track = enf ? $('[data-track]', enf) : null;
  const bar = enf ? $('[data-progress]', enf) : null;
  const count = enf ? $('[data-count]', enf) : null;
  const exhibits = enf ? $$('.exhibit', enf) : [];
  let enfOn = false, enfDist = 0, enfCur = 0, enfGoal = 0, enfRaf = 0, centers = [];

  const setCount = (n) => { if (count) count.textContent = String(n).padStart(2, '0'); };

  function enfLayout() {
    if (!enf) return;
    enfOn = mqDesk.matches && !reduced;
    move.style.transform = '';
    if (!enfOn) {
      enf.style.removeProperty('--enf-h');
      return;
    }
    enfDist = Math.max(0, move.scrollWidth - window.innerWidth);
    enf.style.setProperty('--enf-h', `${Math.round(enfDist + window.innerHeight)}px`);
    const mRect = move.getBoundingClientRect();
    centers = exhibits.map((ex) => {
      const r = ex.getBoundingClientRect();
      return r.left - mRect.left + r.width / 2;
    });
    enfTarget();
    enfCur = enfGoal;
    enfApply();
  }

  function enfTarget() {
    if (!enfOn) return;
    const r = enf.getBoundingClientRect();
    const total = enf.offsetHeight - window.innerHeight;
    enfGoal = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
    if (!enfRaf) enfRaf = requestAnimationFrame(enfTick);
  }

  function enfTick() {
    enfRaf = 0;
    const diff = enfGoal - enfCur;
    enfCur = Math.abs(diff) < 0.0004 ? enfGoal : enfCur + diff * 0.1;
    enfApply();
    if (enfCur !== enfGoal) enfRaf = requestAnimationFrame(enfTick);
  }

  function enfApply() {
    const x = -enfCur * enfDist;
    move.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
    if (bar) bar.style.transform = `scaleX(${enfCur.toFixed(4)})`;
    const mid = window.innerWidth / 2 - x;
    let best = 0, bestD = Infinity;
    centers.forEach((c, i) => { const d = Math.abs(c - mid); if (d < bestD) { bestD = d; best = i; } });
    setCount(best + 1);
  }

  if (track) {
    // На телефоне — нативная прокрутка: обновляем счётчик и полосу
    track.addEventListener('scroll', () => {
      if (enfOn) return;
      const max = track.scrollWidth - track.clientWidth;
      const p = max > 0 ? track.scrollLeft / max : 0;
      if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
      const mid = track.scrollLeft + track.clientWidth * 0.35;
      let best = 0, bestD = Infinity;
      exhibits.forEach((ex, i) => { const c = ex.offsetLeft + ex.offsetWidth / 2; const d = Math.abs(c - mid); if (d < bestD) { bestD = d; best = i; } });
      setCount(best + 1);
    }, { passive: true });
  }

  let rz = 0;
  const onResize = () => { clearTimeout(rz); rz = setTimeout(enfLayout, 120); };
  window.addEventListener('resize', onResize);
  mqDesk.addEventListener('change', enfLayout);
  window.addEventListener('load', enfLayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(enfLayout);
  enfLayout();

  /* ---------- Серия «Как мы делаем»: кадры оживают ---------- */
  const canWebm = document.createElement('video').canPlayType('video/webm; codecs="vp9"') !== '';
  const figs = $$('[data-step]');
  const play = (fig) => {
    const v = $('video', fig);
    if (!v) return;
    v.defaultPlaybackRate = 0.85;
    v.playbackRate = 0.85;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
    fig.classList.add('is-playing');
  };
  const pause = (fig) => {
    const v = $('video', fig);
    if (!v) return;
    v.pause();
    fig.classList.remove('is-playing');
  };

  figs.forEach((fig) => {
    const list = fig.dataset.playlist ? fig.dataset.playlist.split('|') : null;
    const v = $('video', fig);
    if (list && v) {
      let i = 0;
      v.addEventListener('ended', () => {
        i = (i + 1) % list.length;
        v.src = `${list[i]}.${canWebm ? 'webm' : 'mp4'}`;
        v.playbackRate = 0.85;
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      });
    }
  });

  if (!reduced) {
    const stepFigs = figs.filter((f) => !f.hasAttribute('data-autoplay'));
    const autoFigs = figs.filter((f) => f.hasAttribute('data-autoplay'));

    if (mqHover.matches) {
      stepFigs.forEach((fig) => {
        const host = fig.closest('.step') || fig;
        host.addEventListener('pointerenter', () => play(fig));
        host.addEventListener('pointerleave', () => pause(fig));
      });
    } else if ('IntersectionObserver' in window) {
      // Касание: оживает кадр, который виден лучше всего
      const ratios = new Map();
      const pick = () => {
        let best = null, bestR = 0.6;
        ratios.forEach((r, f) => { if (r > bestR) { bestR = r; best = f; } });
        stepFigs.forEach((f) => (f === best ? play(f) : pause(f)));
      };
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach((en) => ratios.set(en.target, en.intersectionRatio));
        pick();
      }, { threshold: [0, 0.3, 0.6, 0.8, 1] });
      stepFigs.forEach((f) => io2.observe(f));
    }

    if ('IntersectionObserver' in window) {
      const io3 = new IntersectionObserver((entries) => {
        entries.forEach((en) => (en.isIntersecting ? play(en.target) : pause(en.target)));
      }, { threshold: 0.45 });
      autoFigs.forEach((f) => io3.observe(f));
    }
  }

  /* ---------- Лайтбокс: «подойти ближе» и фильм ---------- */
  const lb = $('#lb');
  const lbMedia = lb ? $('[data-lb-media]', lb) : null;
  const lbCap = lb ? $('[data-lb-cap]', lb) : null;

  const openLb = () => {
    if (typeof lb.showModal === 'function') lb.showModal();
    else lb.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
  };
  const closeLb = () => {
    if (typeof lb.close === 'function' && lb.open) lb.close();
    else { lb.removeAttribute('open'); onLbClose(); }
  };
  const onLbClose = () => {
    lbMedia.innerHTML = '';
    lb.classList.remove('lb--film');
    document.body.style.overflow = '';
  };

  if (lb) {
    lb.addEventListener('close', onLbClose);
    $('[data-lb-close]', lb).addEventListener('click', closeLb);
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.classList.contains('lb__in')) closeLb();
    });

    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-lightbox]');
      if (t) {
        e.preventDefault();
        const src = $('img', t);
        const img = new Image();
        img.src = t.dataset.full;
        img.alt = src ? src.alt : '';
        if (t.dataset.w) { img.width = +t.dataset.w; img.height = +t.dataset.h; }
        lbMedia.replaceChildren(img);
        lbCap.textContent = t.dataset.caption || '';
        lb.classList.remove('lb--film');
        openLb();
        return;
      }
      const f = e.target.closest('[data-film]');
      if (f) {
        const v = document.createElement('video');
        v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute('playsinline', '');
        v.setAttribute('aria-label', 'Фильм о производстве RICCA DESIGNS: от 3D-проекта до готового дивана');
        v.poster = '../../video/production-poster.webp';
        v.width = 478; v.height = 850;
        v.innerHTML = '<source src="../../video/production.webm" type="video/webm"><source src="../../video/production.mp4" type="video/mp4">';
        v.tabIndex = 0;
        const toggle = () => { if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); };
        v.addEventListener('click', toggle);
        v.addEventListener('keydown', (ev) => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); toggle(); } });
        lbMedia.replaceChildren(v);
        lbCap.textContent = reduced
          ? 'Фильм из ателье · 20 секунд · без звука. Нажмите на кадр, чтобы начать.'
          : 'Фильм из ателье · 20 секунд · без звука. Нажмите на кадр, чтобы остановить.';
        lb.classList.add('lb--film');
        openLb();
        if (!reduced) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      }
    });
  }

  /* ---------- Текущий зал: план экспозиции и меню ---------- */
  const halls = $$('[data-hall-name]');
  const planNow = $('[data-plan-now]');
  const planLinks = $$('[data-hall]');
  const navLinks = $$('.nav a');
  const setHall = (id, name) => {
    planLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.hall === id));
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
    if (planNow) planNow.textContent = name ? `Зал ${name}` : 'Вестибюль';
    if (plan) { plan.classList.toggle('is-muted', id === 'collections'); plan.classList.toggle('is-dark', id === 'business'); }
  };
  if ('IntersectionObserver' in window) {
    const io4 = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) setHall(en.target.id, en.target.dataset.hallName);
      });
    }, { rootMargin: '-48% 0px -48% 0px', threshold: 0 });
    halls.forEach((h) => io4.observe(h));
  }

  /* ---------- Курсор «Подойти ближе» ---------- */
  if (mqHover.matches && !reduced) {
    const cur = document.createElement('div');
    cur.className = 'cursor';
    cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<span>Подойти<br>ближе</span>';
    document.body.append(cur);
    root.classList.add('has-cursor');
    let tx = -200, ty = -200, cx = -200, cy = -200, craf = 0;
    const loop = () => {
      craf = 0;
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      cur.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      if (Math.abs(tx - cx) > 0.2 || Math.abs(ty - cy) > 0.2) craf = requestAnimationFrame(loop);
    };
    document.addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!cur.classList.contains('is-on')) { cx = tx; cy = ty; }
      if (!craf) craf = requestAnimationFrame(loop);
    }, { passive: true });
    $$('button.work[data-lightbox]').forEach((el) => {
      el.addEventListener('pointerenter', () => cur.classList.add('is-on'));
      el.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
      el.addEventListener('click', () => cur.classList.remove('is-on'));
    });
  }

  mqReduce.addEventListener('change', (e) => {
    reduced = e.matches;
    root.classList.toggle('reduce', reduced);
    enfLayout();
  });

  onScroll();
})();
