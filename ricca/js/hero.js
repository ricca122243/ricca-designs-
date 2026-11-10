/* RICCA DESIGNS — первый экран (index.html #top, css/hero.css; DESIGN.md 4.4). Вариант задаёт адрес, как ?bg=white в js/site.js.
   По умолчанию (html[data-hero="2"]) — ролик во весь экран: постер стоит в разметке (LCP), ролик muted loop playsinline, на телефоне
   файл hero-mobile; играет только в кадре и в активной вкладке; кнопка «пауза» (WCAG 2.2.2).
   ?hero=1 — смена реальных работ из <template id="hero-slides">: 6 с кадр, 1,2 с переход (CSS), пауза при наведении, в фоновой вкладке
   и когда экран прокручен; prefers-reduced-motion и экономия трафика — только первый кадр, смена руками по точкам и свайпом.
   Телефон (≤ 599 px): кадры с data-phone="0" не показываем — изделие в них не поднять выше текста (css/hero.css, --base).
   Грузится первым только первый кадр, остальные — после него (data-src → src).
   Атрибут html[data-hero] ставит строка в #top до разметки — при переходах по #адресам ?hero остаётся в адресе сам.
   Разметку точек и паузы вставляет этот скрипт: без него ряд пуст, виден постер. Подписи — RU/EN по lang страницы (en.html). */
(() => {
  'use strict';
  const root = document.documentElement, hero = document.querySelector('.hero');
  if (!hero) return;
  const media = hero.querySelector('.hero__media'), nav = hero.querySelector('.hero__nav');
  if (!media || !nav) return;
  const EN = root.lang === 'en';
  const T = EN
    ? { frames: 'Photos of our works', frame: (i, n) => `Photo ${i} of ${n}`, stop: 'Pause the slideshow', play: 'Play the slideshow', vStop: 'Pause the video', vPlay: 'Play the video' }
    : { frames: 'Кадры с работами', frame: (i, n) => `Кадр ${i} из ${n}`, stop: 'Остановить смену кадров', play: 'Запустить смену кадров', vStop: 'Остановить видео', vPlay: 'Включить видео' };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  if (!root.dataset.hero) root.dataset.hero = /[?&]hero=1(?:&|$)/.test(location.search) ? '1' : '2';   // страховка, если строка в #top не выполнилась
  const pad = (n) => String(n).padStart(2, '0');
  const ico = (id) => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
  // кнопка пауза/пуск: aria-pressed — «остановлено»
  const ppBtn = () => { const b = document.createElement('button'); b.type = 'button'; b.className = 'icon-btn hero__pp'; return b; };
  const setPP = (b, on, labels) => { b.setAttribute('aria-label', on ? labels[0] : labels[1]); b.setAttribute('aria-pressed', String(!on)); b.innerHTML = ico(on ? 'i-pause' : 'i-play'); };
  // видимость: вкладка в фоне или первый экран прокручен — не крутим и не играем
  const seen = { tab: !document.hidden, view: true };
  const watch = (onChange) => {
    document.addEventListener('visibilitychange', () => { seen.tab = !document.hidden; onChange(); });
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => { seen.view = es[0].isIntersecting; onChange(); }, { threshold: .15 }).observe(hero);
  };

  if (root.dataset.hero === '1') slides(); else video();

  /* ---------- Вариант ?hero=1: реальные работы ---------- */
  function slides() {
    const tpl = document.getElementById('hero-slides');
    if (!tpl) return;
    media.insertBefore(tpl.content.cloneNode(true), media.querySelector('.hero__shade'));   // кадры — под градиентом
    media.querySelectorAll('.hero__poster, .hero__video').forEach((el) => el.remove());
    // телефон: кадры, где изделие остаётся под текстом, не показываем
    if (window.matchMedia('(max-width: 599px)').matches) media.querySelectorAll('.hero__slide[data-phone="0"]').forEach((li) => li.remove());
    const list = Array.from(hero.querySelectorAll('.hero__slide'));
    const n = list.length;
    if (n < 2) return;
    let i = 0, timer = 0, hover = false, userPaused = reduce || saveData, fading = 0;
    const DWELL = 6000, FADE = reduce ? 0 : 1250;
    // остальные кадры: src из data-src — только после первого (ему вся полоса)
    const arm = (li) => { const img = li.querySelector('img'); if (!img || img.getAttribute('src') || !img.dataset.src) return; img.sizes = img.dataset.sizes || '100vw'; img.srcset = img.dataset.srcset || ''; img.src = img.dataset.src; };
    const loadRest = () => list.slice(1).forEach(arm);
    const first = list[0].querySelector('img');
    if (!userPaused) { if (first && !first.complete) { first.addEventListener('load', loadRest, { once: true }); first.addEventListener('error', loadRest, { once: true }); } else loadRest(); }
    // точки, счётчик, пауза
    nav.innerHTML = `<span class="hero__count" aria-hidden="true"><b>01</b> / ${pad(n)}</span><div class="hero__dots" role="group" aria-label="${T.frames}"></div>`;
    const count = nav.querySelector('.hero__count b'), dots = nav.querySelector('.hero__dots');
    list.forEach((_, k) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'hero__dot'; b.setAttribute('aria-label', T.frame(k + 1, n));
      if (!k) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', () => { go(k); run(); });
      dots.append(b);
    });
    const go = (k) => {
      k = ((k % n) + n) % n;
      if (k === i) return;
      const cur = list[i], nxt = list[k];
      arm(nxt);
      list.forEach((li) => li.classList.remove('is-prev'));
      cur.classList.remove('is-on'); cur.classList.add('is-prev');
      nxt.classList.add('is-on');
      clearTimeout(fading); fading = setTimeout(() => cur.classList.remove('is-prev'), FADE);
      dots.children[i].removeAttribute('aria-current'); dots.children[k].setAttribute('aria-current', 'true');
      count.textContent = pad(k + 1);
      i = k;
    };
    const stop = () => { clearTimeout(timer); timer = 0; };
    const run = () => { stop(); if (userPaused || hover || !seen.tab || !seen.view) return; timer = setTimeout(tick, DWELL); };
    const tick = () => {
      timer = 0;
      const k = (i + 1) % n, img = list[k].querySelector('img');
      arm(list[k]);
      if (img && !img.complete) { timer = setTimeout(tick, 800); return; }   // кадр ещё не пришёл — подождём, а не покажем серый
      go(k); run();
    };
    if (!reduce) {   // при reduced-motion смены нет — нечего останавливать
      const pp = ppBtn(); setPP(pp, !userPaused, [T.stop, T.play]);
      pp.addEventListener('click', () => { userPaused = !userPaused; setPP(pp, !userPaused, [T.stop, T.play]); if (!userPaused) loadRest(); run(); });
      nav.append(pp);
    }
    if (window.matchMedia('(hover: hover)').matches) {
      hero.addEventListener('mouseenter', () => { hover = true; stop(); });
      hero.addEventListener('mouseleave', () => { hover = false; run(); });
    }
    // свайп по кадру (палец): влево — следующий, вправо — предыдущий; вертикальная прокрутка страницы не задета
    let sx = null, sy = 0;
    media.parentNode.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (e.target.closest('a, button')) { sx = null; return; } sx = t.clientX; sy = t.clientY; }, { passive: true });
    media.parentNode.addEventListener('touchend', (e) => {
      if (sx == null) return;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) { go(i + (dx < 0 ? 1 : -1)); run(); }
    }, { passive: true });
    watch(run);
    run();
  }

  /* ---------- По умолчанию: ролик ---------- */
  function video() {
    const v = media.querySelector('.hero__video');
    if (!v) return;
    const phone = window.matchMedia('(max-width: 767px)').matches;
    const base = phone ? v.dataset.mobile : v.dataset.desktop;
    const webm = !!v.canPlayType && v.canPlayType('video/webm; codecs="vp9"') !== '';
    const add = (ext, type) => { const s = document.createElement('source'); s.src = `${base}.${ext}`; s.type = type; v.append(s); };
    let userPaused = reduce || saveData, ready = false;
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
    if (webm) add('webm', 'video/webm; codecs="vp9"');
    add('mp4', 'video/mp4');
    const pp = ppBtn(); setPP(pp, !userPaused, [T.vStop, T.vPlay]); nav.append(pp);
    const play = () => { if (!ready || userPaused || !seen.tab || !seen.view) return; const p = v.play(); if (p && p.catch) p.catch(() => { userPaused = true; setPP(pp, false, [T.vStop, T.vPlay]); }); };
    const pause = () => { if (!v.paused) v.pause(); };
    v.addEventListener('playing', () => v.classList.add('is-playing'));
    pp.addEventListener('click', () => { userPaused = !userPaused; setPP(pp, !userPaused, [T.vStop, T.vPlay]); if (userPaused) pause(); else { ready = true; v.preload = 'auto'; play(); } });
    watch(() => (seen.tab && seen.view ? play() : pause()));
    // ролик (1,7–2,9 МБ) начинает грузиться после загрузки страницы: постер, шрифты и плитки каталога идут первыми («фото долго загружаются»)
    const start = () => { ready = true; if (!userPaused) v.preload = 'auto'; play(); };
    if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
  }
})();
