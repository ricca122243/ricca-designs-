/* RICCA DESIGNS — сайт по схеме заказчика (10 октября). Ванильный JS без библиотек.
   Порядок: CONFIG → данные (js/catalog-data.js) → ссылки WhatsApp/телефон → шапка → вход (занавес, видео) → «Новинка»
   (слово пишется по буквам) → видео по экрану → появления → окна и адреса (#catalog/<категория>, #works/all, #item-<id>,
   #work-NN) → экран категории → окно изделия → лайтбокс работ → «Подборка» → меню → липкая плашка.
   Единственный владелец ссылок [data-wa] / [data-tel] — этот файл. */
(() => {
  'use strict';

  /* ---------- CONFIG: номера и готовые тексты WhatsApp — менять здесь ---------- */
  const CONFIG = {
    wa: '77084802047',
    tel: { main: '+77084802047', orders: '+77079550808' },
    msg: {
      general: 'Здравствуйте! Хочу узнать о мебели RICCA на заказ.',
      question: 'Здравствуйте! У меня вопрос по мебели RICCA.',
      showroom: 'Здравствуйте! Хочу записаться на визит в шоурум RICCA на Навои, 208/2.',
      sofas: 'Здравствуйте! Интересует диван на заказ. Пришлите, пожалуйста, подборку и расскажите, что нужно для расчёта.',
      beds: 'Здравствуйте! Интересует кровать на заказ. Размер матраса: 1600 × 2000 / 1800 × 2000 / свой. Пришлите, пожалуйста, подборку.',
      armchairs: 'Здравствуйте! Интересует кресло. Пришлите, пожалуйста, подборку.',
      chairs: 'Здравствуйте! Подберите, пожалуйста, стулья или обеденную группу. Комната и число мест: …',
      tables: 'Здравствуйте! Хочу подобрать стол к мягкой мебели. Пришлите, пожалуйста, варианты.',
      fabrics: 'Здравствуйте! Хочу подобрать ткань. Пришлите, пожалуйста, подборку образцов.',
      projects: 'Здравствуйте! Хочу обсудить мебель для своей комнаты: гостиная / спальня / столовая / кабинет / другое. Размеры и фото пришлю следующим сообщением.',
      business: 'Здравствуйте! Хочу обсудить проект для бизнеса: отель / ресторан / апарт-комплекс / жилой проект / офис.',
      master: 'Здравствуйте! У меня вопрос к мастеру RICCA.'
    },
    introMs: 1620     // длительность входа-занавеса (CSS: .intro …; занавес 850–1500 мс) — после неё класс снимается
  };

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const hasIO = 'IntersectionObserver' in window;
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* приватный режим */ } }
  };
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  // типографика: неразрывный пробел после коротких слов, перед тире, в габаритах «2740 × 1090 × 760 мм»
  const typo = (t) => { let h = esc(t).replace(/ — /g, '&nbsp;— ').replace(/ × /g, '&nbsp;×&nbsp;').replace(/(\d) мм/g, '$1&nbsp;мм'); for (let k = 0; k < 2; k++) h = h.replace(/(^|[\s(«])([А-Яа-яЁё]{1,2}) /g, '$1$2&nbsp;'); return h; };
  const lcFirst = (t) => (t ? t.replace(/^([«"(]*)(.)/, (m, q, c) => q + c.toLowerCase()) : t);
  const pad2 = (n) => String(n).padStart(2, '0');
  const plural3 = (n, f) => f[n % 10 === 1 && n % 100 !== 11 ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2)];
  const waUrl = (text) => `https://wa.me/${CONFIG.wa}?text=${encodeURIComponent(text)}`;
  const mqPhone = window.matchMedia('(max-width: 899px)');

  /* ---------- Данные каталога ---------- */
  const CATS = window.RICCA_CATALOG_CATEGORIES || {};
  const ITEMS = (Array.isArray(window.RICCA_CATALOG) ? window.RICCA_CATALOG : []).filter((x) => x && x.id && x.name && x.category && Array.isArray(x.photos) && x.photos.length);
  const ITEM = new Map(ITEMS.map((x) => [x.id, x]));
  const FABRICS = Array.isArray(window.RICCA_FABRICS) ? window.RICCA_FABRICS : [];
  const FABRIC_PHOTOS = Array.isArray(window.RICCA_FABRIC_PHOTOS) ? window.RICCA_FABRIC_PHOTOS : [];
  // название собирает js/catalog-data.js: name — «Диван Svira» (без названия — «Диван № 15»), short — «Svira» / «№ 15» для сетки
  const labelOf = (it) => it.name;
  // в тексте WhatsApp — название и один раз чтение кириллицей: «Диван Svira (Свира)», чтобы менеджер прочёл верно
  const waLabelOf = (it) => `${it.name}${it.reading ? ` (${it.reading})` : ''}`;
  const shortOf = (it) => it.short || it.name;
  const catLabel = (c) => (CATS[c] && CATS[c].label) || c;
  const srcsetOf = (p) => (p.src600 ? `${p.src600} ${p.w600 || 600}w, ${p.src} ${p.w || 1200}w` : '');
  // предметный рендер: масштаб по доле предмета в кадре (box), чтобы модели в сетке были одного «веса»
  const fitZoom = (p, frameAR, fill = 0.78) => {
    if (!p || !p.studio || !Array.isArray(p.box) || !p.w || !p.h) return p && p.zoom ? p.zoom : 1;
    const ar = p.w / p.h, iw = Math.min(1, ar / frameAR), ih = Math.min(1, frameAR / ar);
    return Math.max(1, Math.min(fill / (p.box[0] * iw), Math.min(0.8, fill + 0.04) / (p.box[1] * ih), 2.2));
  };
  // «Узнать цену»: модель, её строка и ссылка на окно изделия — менеджер сразу видит, о чём речь
  const itemUrl = (it) => (/^https?:$/.test(location.protocol) ? `${location.origin}${location.pathname}#item-${it.id}` : '');
  const itemWa = (it) => {
    const u = itemUrl(it);
    return waUrl(`Здравствуйте! Интересует ${lcFirst(waLabelOf(it))}${it.subtitle ? ` — ${lcFirst(it.subtitle)}` : ''}. Подскажите, пожалуйста, цену и что нужно для расчёта.${u ? `\n${u}` : ''}`);
  };
  const slOf = (it) => ({ id: `item-${it.id}`, title: labelOf(it), meta: it.subtitle || catLabel(it.category) });

  /* ---------- «Наши работы»: только подтверждённые фото работ RICCA (RICCA_WORKS). Пусто — раздела и пунктов меню нет.
     Первые три кадра — большие рамки на главной, «Все работы» — когда кадров больше трёх ---------- */
  const WORKS = (Array.isArray(window.RICCA_WORKS) ? window.RICCA_WORKS : []).filter((w) => w && w.src && w.w && w.h).map((w) => Object.assign({}, w));
  (() => {
    const sec = $('#works');
    if (!sec) return;
    if (!WORKS.length) { sec.remove(); $$('[data-works-link]').forEach((a) => a.remove()); return; }
    const SLOT = [['a', '(min-width: 900px) 44vw, 80vw'], ['b', '(min-width: 900px) 32vw, 80vw'], ['c', '(min-width: 900px) 44vw, 80vw']];
    $('[data-works-row]', sec).innerHTML = WORKS.slice(0, 3).map((w, i) => `<figure class="frame frame--${SLOT[i][0]} rv"><button class="frame__open" type="button" data-work="${i}" aria-label="Открыть фото: ${esc(lcFirst(w.room))}">`
      + `<img src="${esc(w.src600 || w.src)}"${w.src600 ? ` srcset="${esc(`${w.src600} 600w, ${w.src} ${w.w}w`)}" sizes="${SLOT[i][1]}"` : ''} width="${w.w}" height="${w.h}" alt="${esc(w.alt || w.room)}" loading="lazy" decoding="async">`
      + `<span class="mark" aria-hidden="true">RICCA DESIGNS</span></button><figcaption class="frame__cap">${typo(w.room)}</figcaption></figure>`).join('');
    $('.works__all', sec).hidden = WORKS.length <= 3;
    sec.hidden = false;
    $$('[data-works-link]').forEach((a) => { a.hidden = false; });
  })();

  /* ---------- Телефоны и WhatsApp из CONFIG ---------- */
  $$('[data-tel]').forEach((a) => { const t = CONFIG.tel[a.dataset.tel]; if (t) a.href = `tel:${t}`; });
  $$('[data-wa]').forEach((a) => {
    a.href = waUrl(CONFIG.msg[a.dataset.wa] || CONFIG.msg.general);
    a.target = '_blank'; a.rel = 'noopener';
    if (!a.querySelector('.sr-only')) a.insertAdjacentHTML('beforeend', '<span class="sr-only"> (откроется в&nbsp;WhatsApp)</span>');
  });

  /* ---------- Вход-занавес: снять класс после анимации; любое касание — сразу финал.
     introDone — ролик входа стартует после занавеса, чтобы первый кадр был виден целиком ---------- */
  const introWait = [];
  let introOn = root.classList.contains('intro');
  const introDone = (fn) => { if (introOn) introWait.push(fn); else fn(); };
  (() => {
    if (!introOn) return;
    const SKIP = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    const end = () => {
      if (!introOn) return;
      clearTimeout(window.__introSafety); clearTimeout(t);
      root.classList.remove('intro'); introOn = false;
      SKIP.forEach((e) => window.removeEventListener(e, end, true));
      introWait.splice(0).forEach((fn) => fn());
    };
    const t = setTimeout(end, CONFIG.introMs);
    SKIP.forEach((e) => window.addEventListener(e, end, { capture: true, passive: true }));
  })();

  /* ---------- Видео: источник webm/mp4, автоплей только в кадре, кнопка «пауза» (WCAG 2.2.2) ---------- */
  const canWebm = (() => { const v = document.createElement('video'); return !!v.canPlayType && v.canPlayType('video/webm; codecs="vp9"') !== ''; })();
  function setSources(v, base) {
    v.replaceChildren();
    if (canWebm) { const s = document.createElement('source'); s.src = `${base}.webm`; s.type = 'video/webm; codecs="vp9"'; v.append(s); }
    const m = document.createElement('source'); m.src = `${base}.mp4`; m.type = 'video/mp4'; v.append(m);
    v.load();
  }
  function autoVideo(v, toggle, baseOf, opts = {}) {
    if (!v) return null;
    let userPaused = saveData, inView = false, base = '';
    const label = toggle ? toggle.getAttribute('aria-label').replace(/^Остановить /, '') : '';
    const setUI = () => {
      if (!toggle) return;
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.setAttribute('aria-label', `${userPaused ? 'Включить' : 'Остановить'} ${label}`);
    };
    const load = () => { const b = baseOf(); if (b && b !== base) { base = b; setSources(v, b); } };
    let ready = !opts.afterLoad;
    // браузер запретил автоплей (iOS «Энергосбережение», экономия трафика): показать ▶ — одно касание запустит ролик
    const play = () => {
      const pr = v.play();
      if (pr && pr.catch) pr.catch((e) => { if (e && e.name === 'NotAllowedError') { userPaused = true; setUI(); } });
    };
    const sync = () => {
      if (inView && !userPaused && !document.hidden && ready) { load(); play(); } else if (!v.paused) v.pause();
    };
    // ролик входа — после загрузки страницы (не спорит с постером-LCP) и после занавеса
    if (!ready) {
      const loaded = () => introDone(() => { ready = true; sync(); });
      if (document.readyState === 'complete') loaded(); else window.addEventListener('load', loaded, { once: true });
    }
    v.addEventListener('playing', () => v.classList.add('is-on'));
    if (toggle) {
      toggle.hidden = false; setUI();
      toggle.addEventListener('click', () => { userPaused = !userPaused; setUI(); sync(); });
    }
    if (hasIO) new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; sync(); }, { threshold: opts.threshold || 0.15 }).observe(opts.target || v);
    else { inView = true; sync(); }
    document.addEventListener('visibilitychange', sync);
    return { reload() { if (base) { base = ''; sync(); } } };
  }
  // постеры роликов ниже входа — только на подходе к экрану: первый кадр входа (LCP) грузится без соперников.
  // reduced motion — только постеры (у ELUNA — раскрытые слои), ролики не грузим и кнопки не показываем
  const posterOf = (v) => (reduceMotion && v.dataset.still) || v.dataset.poster;
  const setPoster = (v) => { const p = posterOf(v); if (p && v.getAttribute('poster') !== p) v.poster = p; };
  const lazyPosters = $$('video[data-poster]');
  const watchPosters = () => {
    if (!hasIO) { lazyPosters.forEach(setPoster); return; }
    const pio = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { pio.unobserve(e.target); setPoster(e.target); } }), { rootMargin: '50% 0px' });
    lazyPosters.forEach((v) => pio.observe(v));
  };
  if (document.readyState === 'complete') watchPosters(); else window.addEventListener('load', watchPosters, { once: true });
  if (!reduceMotion) {
    const heroMQ = window.matchMedia('(min-width: 900px) and (min-aspect-ratio: 4/5)');
    const heroV = autoVideo($('.hero__video'), $('.hero__toggle'), () => `video/hero-${heroMQ.matches ? 'desktop' : 'mobile'}`, { target: $('.hero'), threshold: 0.05, afterLoad: true });
    if (heroV) heroMQ.addEventListener('change', () => { $('.hero__video').classList.remove('is-on'); heroV.reload(); });
    // телефон — свои лёгкие версии роликов (data-src-phone), тот же порог, что у шапки и плашки
    $$('[data-autovideo]').forEach((box) => {
      const v = $('video', box);
      const ctl = autoVideo(v, $('[data-vtoggle]', box), () => (mqPhone.matches && v.dataset.srcPhone) || v.dataset.src, { target: box });
      if (ctl && v.dataset.srcPhone) mqPhone.addEventListener('change', () => ctl.reload());
    });
  }

  /* ---------- Появления при прокрутке (не на первом экране) ---------- */
  const pre = (el) => el.classList.add('is-pre');
  const show = (el, delay = 0) => { el.style.transitionDelay = delay ? `${delay}ms` : ''; el.classList.remove('is-pre'); };
  if (hasIO && !reduceMotion) {
    const vh = window.innerHeight;
    const io = new IntersectionObserver((es) => {
      es.filter((e) => e.isIntersecting).forEach((e, i) => { io.unobserve(e.target); show(e.target, i * 90); });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.rv').forEach((el) => { if (el.getBoundingClientRect().top > vh) { pre(el); io.observe(el); } });
  }

  /* ---------- «Новинка»: слово пишется по буквам, когда панель поднялась до середины экрана (≈ 0,7 с; панель
     в это время держится — css .nov). ELUNA, ролик, строка и ссылка появляются сами, не ждут курсора.
     Ушло слово с экрана раньше — дописываем сразу. ---------- */
  (() => {
    const live = $('.type__live'), wordEl = $('.nov__word'), sec = $('.nov');
    if (!live || !wordEl || !sec) return;
    const WORD = 'Новинка';
    if (reduceMotion || !hasIO) { live.textContent = WORD; return; }
    let started = false, done = false, timer = 0, caret = null;
    const finish = () => {
      if (done) return; done = true; clearTimeout(timer);
      live.textContent = WORD;
      if (caret) { live.append(caret); caret.classList.add('is-done'); }
    };
    const type = () => {
      if (started) return; started = true;
      caret = document.createElement('span'); caret.className = 'type__caret';
      live.append(caret);
      let i = 0;
      const step = () => {
        if (done) return;
        if (i < WORD.length) {
          const s = document.createElement('span'); s.textContent = WORD[i++];
          live.insertBefore(s, caret);
          timer = setTimeout(step, 75);
        } else { done = true; caret.classList.add('is-done'); }
      };
      timer = setTimeout(step, 180);
    };
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); type(); } }, { threshold: 0, rootMargin: '0px 0px -45% 0px' });
    io.observe(sec);
    const out = new IntersectionObserver((es) => { if (started && !es[es.length - 1].isIntersecting) { out.disconnect(); finish(); } });
    out.observe(wordEl);
  })();

  /* ---------- Окна: показ/скрытие с анимацией, блокировка прокрутки, возврат фокуса ---------- */
  const updateBarSoon = () => requestAnimationFrame(() => updateBar());
  function lock() { root.classList.toggle('is-locked', !!$('dialog[open]')); updateBarSoon(); }
  function showDlg(dlg, opener) {
    clearTimeout(dlg._hideT);
    if (!dlg.open) {
      dlg._opener = opener || document.activeElement;
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    }
    requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-in')));
    lock();
  }
  function hideDlg(dlg, focus = true) {
    if (!dlg || !dlg.open) return;
    dlg.classList.remove('is-in');
    clearTimeout(dlg._hideT);
    const done = () => {
      if (!dlg.open) return;
      if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
      lock();
      const o = dlg._opener;
      if (focus && o && o.focus && document.contains(o)) {
        const host = o.closest('dialog');
        if (!host || host.open) o.focus({ preventScroll: true });
      }
    };
    if (reduceMotion) done(); else dlg._hideT = setTimeout(done, 280);
  }

  /* ---------- Адреса окон: история браузера. «Назад», Esc и ✕ закрывают уровень ---------- */
  const R = {
    opener: null,
    depth() { return (history.state && history.state.rd) || 0; },
    parse(hash) {
      let h = '';
      try { h = decodeURIComponent(String(hash || '').replace(/^#/, '')); } catch (_) { h = ''; }
      let m;
      if ((m = /^catalog\/([a-z0-9-]+)(?:\/([a-z]+))?$/.exec(h))) return { cat: m[1], sub: m[2] || 'all' };
      if (h === 'works/all') return { works: true };
      if ((m = /^item-([a-z0-9-]+)$/.exec(h))) return { item: m[1] };
      if ((m = /^work-(\d+)$/.exec(h))) return { work: +m[1] - 1 };
      return { anchor: h };
    },
    go(hash, opener) {
      R.opener = opener || null;
      try { history.pushState({ rd: R.depth() + 1 }, '', hash); } catch (_) { location.hash = hash; return; }
      R.apply();
    },
    replace(hash) { try { history.replaceState({ rd: R.depth() }, '', hash); } catch (_) { /* file:// */ } },
    closeTo(fallback) {
      if (R.depth() > 0) { history.back(); return; }
      R.replace(fallback); R.apply();
      const el = document.getElementById(fallback.replace(/^#/, ''));
      if (el && Math.abs(el.getBoundingClientRect().top) > window.innerHeight) el.scrollIntoView({ block: 'start' });
    },
    apply(initial) {
      const r = R.parse(location.hash);
      if (initial && r.anchor) {
        // старые ссылки (Instagram, прошлые версии): #catalog-sofas → #catalog/sofas, #materials → ткани
        const legacy = /^catalog-([a-z]+)/.exec(r.anchor);
        const to = legacy && CATS[legacy[1]] ? `#catalog/${legacy[1]}` : (r.anchor === 'materials' ? '#catalog/fabrics' : (r.anchor === 'news' ? '#novinka' : ''));
        if (to) { R.replace(to); return R.apply(false); }
      }
      // уровень 1: категория / ткани / все работы
      if (r.cat) {
        const c = CATS[r.cat];
        if (!c || c.href) { R.replace('#catalog'); View.close(false); }
        else View.open(c.view === 'fabrics' ? { type: 'fabrics' } : { type: 'cat', cat: r.cat, sub: r.sub });
      } else if (r.works && WORKS.length) View.open({ type: 'works' });
      else if (r.works) { R.replace('#catalog'); View.close(false); }
      else if (r.item && initial && ITEM.has(r.item)) {
        // вход по ссылке на изделие: под окном — его категория, чтобы «Закрыть» вело к остальным моделям
        const it = ITEM.get(r.item);
        R.replace(`#catalog/${it.category}`);
        try { history.pushState({ rd: 1 }, '', `#item-${it.id}`); } catch (_) { /* */ }
        View.open({ type: 'cat', cat: it.category, sub: 'all' });
      } else if (!r.item && r.work == null) View.close(false);
      // уровень 2: изделие / фото работы
      if (r.item && ITEM.has(r.item)) { LB.close(false); PD.open(r.item); }
      else if (r.work != null && WORKS[r.work]) { PD.close(false); LB.open(r.work); }
      else { PD.close(); LB.close(); }
      R.opener = null;
    }
  };

  /* ---------- Экран категории / тканей / всех работ (один полноэкранный уровень) ---------- */
  const View = (() => {
    const dlg = $('#view');
    const title = $('#view-title'), nEl = $('[data-view-n]'), tabs = $('[data-view-tabs]'), content = $('[data-view-content]');
    const back = $('[data-view-back]'), wa = $('[data-view-wa]'), waLabel = $('[data-view-wa-label]');
    let key = null, spec = null;
    const mark = '<span class="mark" aria-hidden="true">RICCA DESIGNS</span>';
    // широкий предметный кадр (диван, кровать, стол на 4 : 3) — в сетке широкой рамки 5 : 4, а не узкой 4 : 5 с крошечным предметом
    const isWide = (it) => { const p = it.photos[0]; return !!p.studio && (p.w || 0) > (p.h || 0); };
    // увеличенный кадр (--z) просит файл крупнее: sizes умножаем на масштаб, иначе 600 px растянутся и поплывут
    const sizesFor = ([d, t, m], z) => `(min-width: 1200px) ${Math.round(d * z)}vw, (min-width: 768px) ${Math.round(t * z)}vw, ${Math.round(m * z)}vw`;
    function modelHTML(it, wide) {
      const p = it.photos[0], z = wide ? fitZoom(p, 1.25, 0.88) : fitZoom(p, 0.8, 0.72), st = [];
      if (z !== 1) st.push(`--z:${z.toFixed(3)}`);
      if (p.pos) st.push(`object-position:${p.pos}`, `transform-origin:${p.pos}`);   // увеличение — к предмету, а не к центру фото
      const set = srcsetOf(p);
      return `<li data-tags="${esc((it.tags || []).join(' '))}"><button class="model" type="button" data-item="${esc(it.id)}" aria-haspopup="dialog" aria-label="${esc(`${labelOf(it)}${it.subtitle ? `, ${lcFirst(it.subtitle).replace(/ · /g, ', ')}` : ''}`)}">`
        + `<span class="model__img${p.studio ? ' is-studio' : ''}"><img src="${esc(p.src600 || p.src)}"${set ? ` srcset="${esc(set)}" sizes="${sizesFor(wide ? [30, 30, 46] : [22, 30, 46], z)}"` : ''} width="${p.w || 1200}" height="${p.h || 1500}" alt="" loading="lazy" decoding="async"${st.length ? ` style="${st.join(';')}"` : ''}>${mark}</span>`
        + `<span class="model__name" aria-hidden="true">${typo(shortOf(it))}</span></button></li>`;
    }
    function renderCat(cat) {
      const list = ITEMS.filter((i) => i.category === cat);
      const tall = list.filter((i) => !isWide(i)), wide = list.filter(isWide);
      const w4 = wide.length % 3 !== 0 && wide.length % 4 === 0;   // 8 или 4 широких — ровно по 4 в ряд, иначе по 3
      title.textContent = catLabel(cat);
      nEl.textContent = `${list.length} ${plural3(list.length, ['модель', 'модели', 'моделей'])}`;
      back.textContent = 'Каталог';
      const tg = CATS[cat] && CATS[cat].tags;
      const keys = tg ? Object.keys(tg).filter((k) => list.some((i) => (i.tags || []).includes(k))) : [];
      tabs.innerHTML = keys.length > 1 ? [['all', 'Все']].concat(keys.map((k) => [k, tg[k]])).map(([k, l]) => `<button type="button" data-sub="${esc(k)}" aria-pressed="false">${esc(l)}</button>`).join('') : '';
      tabs.hidden = keys.length < 2;
      content.innerHTML = (tall.length ? `<ul class="models" role="list">${tall.map((it) => modelHTML(it, false)).join('')}</ul>` : '')
        + (wide.length ? `<ul class="models models--wide${w4 ? ' models--w4' : ''}" role="list">${wide.map((it) => modelHTML(it, true)).join('')}</ul>` : '');
      wa.href = waUrl(CONFIG.msg[cat] || CONFIG.msg.general);
      waLabel.innerHTML = 'Обсудить в&nbsp;WhatsApp';
    }
    function renderFabrics() {
      const n = FABRICS.reduce((s, g) => s + ((g && g.items) || []).length, 0);
      title.textContent = 'Ткани';
      nEl.innerHTML = 'Образцы&nbsp;— в&nbsp;шоуруме';
      back.textContent = 'Каталог';
      tabs.hidden = true; tabs.innerHTML = '';
      // TODO (заказчик): папка тканей заказчика — добавляется в RICCA_FABRICS (js/catalog-data.js), экран обновится сам
      content.innerHTML = (FABRIC_PHOTOS.length ? `<div class="fab__photos">${FABRIC_PHOTOS.map((p) => `<figure><img src="${esc(p.src600 || p.src)}" srcset="${esc(srcsetOf(p))}" sizes="(min-width: 1440px) 680px, 46vw" width="${p.w}" height="${p.h}" alt="${esc(p.alt)}" loading="lazy" decoding="async">${mark}</figure>`).join('')}</div>` : '')
        + FABRICS.map((g) => `<section class="fab__group" aria-label="${esc(g.label)}"><h3 class="caps fab__label">${esc(g.label)}</h3><ul class="fab__grid" role="list">${(g.items || []).map((t) => `<li><figure class="fab__sw"><img src="${esc(t.src)}" width="${t.w || 600}" height="${t.h || 600}" alt="${esc(t.alt || t.name)}" loading="lazy" decoding="async"><figcaption>${typo(t.name)}</figcaption></figure></li>`).join('')}</ul></section>`).join('');
      wa.href = waUrl(CONFIG.msg.fabrics);
      waLabel.innerHTML = `Подобрать ткань в&nbsp;WhatsApp<span class="sr-only"> · ${n} ${plural3(n, ['образец', 'образца', 'образцов'])}</span>`;
    }
    function renderWorks() {
      title.textContent = 'Наши работы';
      nEl.textContent = `${WORKS.length} фото`;
      back.textContent = 'Назад';
      tabs.hidden = true; tabs.innerHTML = '';
      content.innerHTML = `<ul class="wgal" role="list">${WORKS.map((w, i) => `<li><button type="button" data-work="${i}" aria-haspopup="dialog"><span class="wgal__img"><img src="${esc(w.src600 || w.src)}" srcset="${esc(srcsetOf(w))}" sizes="(min-width: 900px) 30vw, 46vw" width="${w.w}" height="${w.h}" alt="${esc(w.alt)}" loading="lazy" decoding="async">${mark}</span><span class="frame__cap">${typo(w.room)}</span></button></li>`).join('')}</ul>`;
      wa.href = waUrl(CONFIG.msg.projects);
      waLabel.innerHTML = 'Хочу так&nbsp;же&nbsp;— в&nbsp;WhatsApp';
    }
    function setSub(sub) {
      const btns = $$('button', tabs);
      if (!btns.length) sub = 'all';
      else if (!btns.some((b) => b.dataset.sub === sub)) sub = 'all';
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sub === sub)));
      $$('.models > li', content).forEach((li) => { li.classList.toggle('is-out', sub !== 'all' && !li.dataset.tags.split(' ').includes(sub)); });
      $$('.models', content).forEach((ul) => { ul.hidden = !ul.querySelector('li:not(.is-out)'); });
      if (spec) spec.sub = sub;
      return sub;
    }
    tabs.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-sub]');
      if (!b || !spec || spec.type !== 'cat') return;
      const sub = setSub(b.dataset.sub);
      R.replace(`#catalog/${spec.cat}${sub !== 'all' ? `/${sub}` : ''}`);
    });
    dlg.addEventListener('scroll', () => dlg.classList.toggle('is-scrolled', dlg.scrollTop > 8), { passive: true });
    return {
      isOpen: () => dlg.open,
      hash: () => (!spec ? '#catalog' : spec.type === 'works' ? '#works/all' : spec.type === 'fabrics' ? '#catalog/fabrics' : `#catalog/${spec.cat}${spec.sub && spec.sub !== 'all' ? `/${spec.sub}` : ''}`),
      parentHash: () => (spec && spec.type === 'works' ? '#works' : '#catalog'),
      open(s) {
        const k = s.type === 'cat' ? `cat:${s.cat}` : s.type;
        const fresh = k !== key || !dlg.open;
        if (k !== key) {
          spec = Object.assign({}, s); key = k;
          if (s.type === 'cat') renderCat(s.cat); else if (s.type === 'fabrics') renderFabrics(); else renderWorks();
        }
        if (s.type === 'cat') setSub(s.sub || 'all');
        const was = dlg.open;
        showDlg(dlg, R.opener);
        if (fresh) { dlg.scrollTop = 0; dlg.classList.remove('is-scrolled'); }   // закрытое окно не помнит прокрутку — сбрасываем после показа
        if (!was || fresh) requestAnimationFrame(() => title.focus({ preventScroll: true }));
      },
      close(focus = true) { hideDlg(dlg, focus); }
    };
  })();

  /* ---------- Окно изделия: все фото (свайп, стрелки, миниатюры, ←/→), одна строка, WhatsApp, «В подборку» ---------- */
  const PD = (() => {
    const dlg = $('#product');
    const stage = $('[data-pd-stage]', dlg), frame = $('[data-pd-frame]', dlg), img = $('[data-pd-img]', dlg), gallery = $('.pd__gallery', dlg);
    const prev = $('[data-pd-prev]', dlg), next = $('[data-pd-next]', dlg), count = $('[data-pd-count]', dlg), thumbsBox = $('[data-pd-thumbs]', dlg);
    const catEl = $('[data-pd-cat]', dlg), title = $('[data-pd-title]', dlg), sub = $('[data-pd-sub]', dlg);
    const desc = $('[data-pd-desc]', dlg), chips = $('[data-pd-chips]', dlg), passport = $('[data-pd-passport]', dlg), more = $('[data-pd-more]', dlg);
    const wa = $('[data-pd-wa]', dlg), slBtn = $('[data-pd-sl]', dlg);
    let cur = null, idx = 0, thumbs = [];
    function layout() {
      const p = cur && cur.photos[idx];
      if (!p) return;
      const cs = getComputedStyle(stage);
      const sw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const sh = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (sw <= 0 || sh <= 0) return;
      const k = Math.min(sw / (p.w || 1200), sh / (p.h || 1500));
      frame.style.width = `${Math.round((p.w || 1200) * k)}px`;
      frame.style.height = `${Math.round((p.h || 1500) * k)}px`;
      frame.classList.toggle('is-studio', !!p.studio);
      gallery.classList.toggle('is-studio', !!p.studio);   // предметный кадр — на одном тоне с панелью, без «коробки в коробке»
      if (p.studio) img.style.setProperty('--z', fitZoom(p, p.w / p.h, 0.86).toFixed(3)); else img.style.removeProperty('--z');
    }
    function show(i) {
      const ph = cur.photos;
      idx = (i + ph.length) % ph.length;
      const p = ph[idx];
      frame.classList.add('is-loading');
      img.onload = () => frame.classList.remove('is-loading');
      img.onerror = () => { if (p.src600 && img.getAttribute('src') !== p.src600) { img.removeAttribute('srcset'); img.src = p.src600; } else frame.classList.remove('is-loading'); };
      img.alt = p.alt || labelOf(cur);
      img.width = p.w || 1200; img.height = p.h || 1500;
      const set = srcsetOf(p);
      if (set) { img.sizes = '(min-width: 900px) 60vw, 100vw'; img.srcset = set; } else { img.removeAttribute('srcset'); img.removeAttribute('sizes'); }
      img.src = p.src;
      if (img.complete && img.naturalWidth) frame.classList.remove('is-loading');
      layout();
      count.innerHTML = ph.length > 1 ? `<span aria-hidden="true">${pad2(idx + 1)} / ${pad2(ph.length)}</span><span class="sr-only">Фото ${idx + 1} из ${ph.length}</span>` : '';
      thumbs.forEach((t, j) => t.setAttribute('aria-current', String(j === idx)));
      const t = thumbs[idx];
      if (t && thumbsBox.scrollWidth > thumbsBox.clientWidth) thumbsBox.scrollTo({ left: t.offsetLeft - (thumbsBox.clientWidth - t.offsetWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
      // соседнее фото — заранее
      const nx = ph[(idx + 1) % ph.length];
      if (nx && nx !== p) { const pre = new Image(); pre.src = nx.src; }
    }
    function fill(it) {
      cur = it;
      catEl.textContent = catLabel(it.category);   // тип (прямой, угловой…) — в строке под названием, не дублируем
      title.innerHTML = typo(it.name);
      sub.innerHTML = it.subtitle ? typo(it.subtitle) : ''; sub.hidden = !it.subtitle;
      desc.innerHTML = typo(it.description || ''); desc.hidden = !it.description;
      chips.innerHTML = (it.options || []).map((o) => `<li>${typo(o)}</li>`).join(''); chips.hidden = !(it.options || []).length;
      const wood = it.category === 'tables';
      const rows = [['Размеры', it.sizes], [wood ? 'Материал' : 'Ткань и&nbsp;кожа', it.materials], ['Наполнение', it.filling], ['Механизм', it.mechanism], ['Срок', it.lead], ['Гарантия', it.warranty], ['Доставка', it.delivery]].filter((r) => r[1]);
      passport.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${typo(v)}</dd></div>`).join('');
      passport.hidden = !rows.length;
      more.open = false; more.hidden = !rows.length && !it.description && !(it.options || []).length;
      wa.href = itemWa(it);
      wa.setAttribute('aria-label', `Узнать цену в WhatsApp: ${labelOf(it)}`);
      const sl = slOf(it);
      slBtn.dataset.slId = sl.id; slBtn.dataset.slTitle = sl.title; slBtn.dataset.slMeta = sl.meta;
      const n = it.photos.length;
      thumbs = it.photos.map((p, j) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = `pd__thumb${p.studio ? ' is-studio' : ''}`;
        b.setAttribute('aria-label', `Фото ${j + 1} из ${n}`);
        b.innerHTML = `<img src="${esc(p.src600 || p.src)}" alt="" width="${p.w || 1200}" height="${p.h || 1500}" loading="lazy" decoding="async"${p.studio ? ` style="--z:${fitZoom(p, 0.8, 0.92).toFixed(3)}"` : ''}>`;
        b.addEventListener('click', () => show(j));
        return b;
      });
      thumbsBox.replaceChildren(...thumbs);
      thumbsBox.hidden = n < 2; prev.hidden = next.hidden = n < 2;
      SL.sync();
    }
    prev.addEventListener('click', () => show(idx - 1));
    next.addEventListener('click', () => show(idx + 1));
    dlg.addEventListener('keydown', (e) => {
      if (!cur || cur.photos.length < 2 || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.target.closest('summary, a, .pd__actions')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); } else if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
    });
    let sx = null, sy = 0;
    stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    stage.addEventListener('pointerup', (e) => { if (sx == null || !cur) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (cur.photos.length > 1 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) show(idx + (dx < 0 ? 1 : -1)); });
    stage.addEventListener('pointercancel', () => { sx = null; });
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (dlg.open) layout(); }).observe(stage);
    else window.addEventListener('resize', () => { if (dlg.open) layout(); });
    return {
      open(id) {
        const it = ITEM.get(id);
        if (!it) return;
        const same = cur === it && dlg.open;
        if (!same) fill(it);
        showDlg(dlg, R.opener);
        if (!same) { dlg.scrollTop = 0; show(0); requestAnimationFrame(layout); }
      },
      close(focus = true) { hideDlg(dlg, focus); }
    };
  })();

  /* ---------- Лайтбокс работ: фото целиком, подпись — комната, «Смотреть модель» ---------- */
  const LB = (() => {
    const dlg = $('#lightbox');
    const stage = $('[data-lb-stage]', dlg), frame = $('[data-lb-frame]', dlg), img = $('[data-lb-img]', dlg);
    const title = $('[data-lb-title]', dlg), piece = $('[data-lb-piece]', dlg), item = $('[data-lb-item]', dlg), count = $('[data-lb-count]', dlg);
    let idx = 0;
    function layout() {
      const w = WORKS[idx]; if (!w) return;
      const cs = getComputedStyle(stage);
      const sw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const sh = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (sw <= 0 || sh <= 0) return;
      const k = Math.min(sw / w.w, sh / w.h);
      frame.style.width = `${Math.round(w.w * k)}px`; frame.style.height = `${Math.round(w.h * k)}px`;
    }
    function show(i) {
      idx = (i + WORKS.length) % WORKS.length;
      const w = WORKS[idx];
      img.alt = w.alt || w.room; img.width = w.w; img.height = w.h;
      const set = srcsetOf(w);
      if (set) { img.sizes = '100vw'; img.srcset = set; } else img.removeAttribute('srcset');
      img.src = w.src;
      layout();
      title.innerHTML = typo(w.room);
      const pc = [w.piece ? lcFirst(w.piece).replace(/^./, (c) => c.toUpperCase()) : '', w.credit || ''].filter(Boolean).join(' · ');
      piece.innerHTML = typo(pc); piece.hidden = !pc;
      const ok = w.item && ITEM.has(w.item);
      item.hidden = !ok;
      if (ok) { item.dataset.item = w.item; item.href = `#item-${w.item}`; }
      count.innerHTML = `<span aria-hidden="true">${pad2(idx + 1)} / ${pad2(WORKS.length)}</span><span class="sr-only">Фото ${idx + 1} из ${WORKS.length}</span>`;
    }
    const step = (d) => { show(idx + d); R.replace(`#work-${pad2(idx + 1)}`); };
    $$('[data-lb-step]', dlg).forEach((b) => b.addEventListener('click', () => step(+b.dataset.lbStep)));
    dlg.addEventListener('keydown', (e) => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
    let sx = null, sy = 0;
    stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    stage.addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1); });
    stage.addEventListener('pointercancel', () => { sx = null; });
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (dlg.open) layout(); }).observe(stage);
    return {
      open(i) { showDlg(dlg, R.opener); show(i); requestAnimationFrame(layout); },
      close(focus = true) { hideDlg(dlg, focus); }
    };
  })();

  /* ---------- «Подборка»: список → одно сообщение WhatsApp (localStorage ricca-shortlist-v2, до 12 позиций) ---------- */
  const SL = (() => {
    const KEY = 'ricca-shortlist-v2';
    const dlg = $('#shortlist'), list = $('#sl-list'), empty = $('#sl-empty'), foot = $('#sl-foot'), send = $('#sl-send'), nEl = $('#sl-n');
    const openBtn = $('#sl-open'), countEl = $('#sl-count'), menuBtn = $('[data-open-sl]'), menuN = $('[data-sl-n]');
    const toast = $('#toast'), toastText = $('#toast-text'), toastOpen = $('#toast-open');
    let items = store.get(KEY, []);
    // только изделия, которые есть в каталоге сейчас; название и строка — по текущим данным (после переименования моделей)
    items = (Array.isArray(items) ? items : []).filter((x) => x && /^item-/.test(x.id) && ITEM.has(x.id.slice(5))).slice(0, 12)
      .map((x) => slOf(ITEM.get(x.id.slice(5))));
    const has = (id) => items.some((x) => x.id === id);
    function sync() {
      const n = items.length;
      openBtn.hidden = n === 0; countEl.textContent = n;
      openBtn.setAttribute('aria-label', n ? `Подборка: ${n} ${plural3(n, ['позиция', 'позиции', 'позиций'])}` : 'Подборка, пусто');
      if (menuBtn) { menuBtn.hidden = n === 0; menuN.textContent = n ? `· ${n}` : ''; }
      nEl.textContent = n ? ` · ${n}` : '';
      $$('[data-sl-id]').forEach((b) => {
        const on = has(b.dataset.slId);
        b.setAttribute('aria-pressed', String(on));
        const t = $('span', b);
        if (t) t.textContent = on ? 'В подборке' : 'В подборку';
      });
    }
    function thumbOf(id) {
      const it = ITEM.get(id.slice(5)), p = it && it.photos[0];
      return p ? { src: p.src600 || p.src, w: p.w, h: p.h, studio: !!p.studio, z: p.studio ? fitZoom(p, 0.8) : 1 } : null;
    }
    function render() {
      list.replaceChildren(...items.map((x) => {
        const li = document.createElement('li');
        const th = thumbOf(x.id), fig = document.createElement('span');
        fig.className = `sl__img${th && th.studio ? ' is-studio' : ''}`; fig.setAttribute('aria-hidden', 'true');
        if (th) {
          const im = document.createElement('img');
          im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = th.w || 600; im.height = th.h || 750; im.src = th.src;
          if (th.z !== 1) im.style.setProperty('--z', th.z.toFixed(3));
          fig.append(im);
        }
        const t = document.createElement('span'); t.className = 'sl__t'; t.textContent = x.title;
        const m = document.createElement('span'); m.className = 'sl__m'; m.textContent = x.meta || '';
        const b = document.createElement('button'); b.className = 'icon-btn'; b.type = 'button'; b.setAttribute('aria-label', `Убрать: ${x.title}`);
        b.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-close"/></svg>';
        b.addEventListener('click', () => {
          const i = Array.prototype.indexOf.call(list.children, li);
          remove(x.id);
          const li2 = list.children[Math.min(i, list.children.length - 1)];
          (li2 ? $('button', li2) : $('[data-close]', dlg)).focus();
        });
        li.append(fig, t, m, b);
        return li;
      }));
      empty.hidden = items.length > 0;
      foot.hidden = items.length === 0;
      send.href = waUrl(`Здравствуйте! Моя подборка на сайте RICCA DESIGNS:\n${items.map((x, i) => { const it = ITEM.get(x.id.slice(5)); return `${i + 1}. ${it ? waLabelOf(it) : x.title}${x.meta ? ` · ${x.meta}` : ''}`; }).join('\n')}\nРасскажите, пожалуйста, подробнее и помогите с выбором.`);
      sync();
    }
    let toastT = 0;
    function say(text, withOpen) {
      const host = $('dialog[open]:last-of-type') || document.body;
      const open = $$('dialog[open]');
      (open.length ? open[open.length - 1] : host).append(toast);
      toastText.textContent = text; toastOpen.hidden = !withOpen;
      toast.hidden = false; clearTimeout(toastT);
      toastT = setTimeout(() => { toast.hidden = true; }, 3400);
    }
    function remove(id) { items = items.filter((x) => x.id !== id); store.set(KEY, items); render(); }
    function toggle(x) {
      if (has(x.id)) { remove(x.id); say('Убрано из подборки', false); return; }
      if (items.length >= 12) { say('Максимум 12 моделей', true); return; }
      items.push(x); store.set(KEY, items); render();
      say('Добавлено в подборку', true);
    }
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sl-id]');
      if (b) toggle({ id: b.dataset.slId, title: b.dataset.slTitle, meta: b.dataset.slMeta || '' });
    });
    const openSL = (opener) => { clearTimeout(toastT); toast.hidden = true; document.body.append(toast); showDlg(dlg, opener); };
    openBtn.addEventListener('click', () => openSL(openBtn));
    toastOpen.addEventListener('click', () => openSL(document.activeElement));
    if (menuBtn) menuBtn.addEventListener('click', () => { hideDlg($('#menu'), false); openSL(openBtn); });
    $('#sl-clear').addEventListener('click', () => { items = []; store.set(KEY, items); render(); $('[data-close]', dlg).focus(); });
    window.addEventListener('storage', (e) => { if (e.key === KEY) { items = store.get(KEY, []); render(); } });
    render();
    return { sync, close: () => hideDlg(dlg) };
  })();

  /* ---------- Меню (телефон и планшет) ---------- */
  const menu = $('#menu');
  $('#menu-open').addEventListener('click', (e) => showDlg(menu, e.currentTarget));
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a) { clearTimeout(menu._hideT); menu.classList.remove('is-in'); menu.close(); lock(); }   // сразу, чтобы прокрутка к разделу сработала
  });

  /* ---------- Закрытие уровней: ✕, Esc, щелчок мимо панели «Подборки» ---------- */
  const closers = {
    view: () => R.closeTo(View.parentHash()),
    product: () => R.closeTo(View.isOpen() ? View.hash() : '#catalog'),
    lightbox: () => R.closeTo(View.isOpen() ? View.hash() : '#works'),
    shortlist: () => SL.close(),
    menu: () => hideDlg(menu)
  };
  $$('dialog').forEach((d) => {
    d.addEventListener('cancel', (e) => { e.preventDefault(); if (closers[d.id]) closers[d.id](); });
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { e.preventDefault(); if (closers[d.id]) closers[d.id](); }
      else if (e.target === d && d.id === 'shortlist') closers.shortlist();
    });
  });

  /* ---------- Переходы: плитка → категория, модель → изделие, кадр → лайтбокс ---------- */
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.target.closest('[data-sl-id]')) return;
    const it = e.target.closest('[data-item]');
    if (it && ITEM.has(it.dataset.item)) { e.preventDefault(); R.go(`#item-${it.dataset.item}`, it); return; }
    const wk = e.target.closest('[data-work]');
    if (wk && WORKS[+wk.dataset.work]) { e.preventDefault(); R.go(`#work-${pad2(+wk.dataset.work + 1)}`, wk); return; }
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const h = a.getAttribute('href');
    if (/^#catalog\/[a-z]/.test(h) || h === '#works/all') {
      e.preventDefault();
      if (menu.open) { menu.classList.remove('is-in'); menu.close(); lock(); }
      R.go(h, a);
    }
  });
  window.addEventListener('popstate', () => R.apply(false));

  /* ---------- Шапка: прозрачная над видео, прячется при прокрутке вниз; липкая плашка (телефон) ---------- */
  const hdr = $('#hdr'), hero = $('.hero'), bar = $('#mbar'), showroom = $('#showroom');
  const darkZones = $$('.nov, .foot');
  let lastY = window.scrollY, raf = 0;
  function updateBar() {
    if (!bar) return;
    const vh = window.innerHeight;
    const on = mqPhone.matches && window.scrollY > hero.offsetHeight * 0.85 && !$('dialog[open]') && showroom.getBoundingClientRect().top > vh * 0.92;
    if (on !== bar.classList.contains('is-on')) {
      bar.classList.toggle('is-on', on);
      bar.setAttribute('aria-hidden', String(!on));
      $$('a', bar).forEach((a) => { a.tabIndex = on ? 0 : -1; });
    }
  }
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const y = window.scrollY, heroH = hero.offsetHeight;
      const over = y < heroH - hdr.offsetHeight;
      hdr.classList.toggle('is-over', over);
      // над чёрной «Новинкой» и подвалом шапка тоже чёрная — без белой полосы поперёк панели: чёрная, как только панель
      // зашла под шапку (а не с середины шапки — иначе на 30 px прокрутки белая полоса висит над чёрным)
      const hh = hdr.offsetHeight, mid = hh / 2;
      hdr.classList.toggle('is-dark', !over && darkZones.some((el) => { const r = el.getBoundingClientRect(); return r.top <= hh && r.bottom > mid; }));
      if (over || y < lastY - 6) hdr.classList.remove('is-hidden');
      else if (y > lastY + 6 && y > heroH && !hdr.contains(document.activeElement)) hdr.classList.add('is-hidden');
      lastY = y;
      updateBar();
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  hdr.addEventListener('focusin', () => hdr.classList.remove('is-hidden'));
  onScroll();

  /* ---------- Старт: окно по адресу (#catalog/sofas, #item-…, #work-…) ---------- */
  R.apply(true);
})();
