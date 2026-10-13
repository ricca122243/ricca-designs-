/* RICCA DESIGNS — v4 «в меру» (10 октября, ночь). Ванильный JS без библиотек.
   Порядок: CONFIG → данные (js/catalog-data.js) → плитки каталога (число моделей, подписи, alt — из данных) → ссылки
   WhatsApp/телефон → вход (занавес, видео) → видео по экрану → появления → окна и адреса (#catalog/<категория>, #works/all,
   #item-<id>, #work-NN, #fabric-<коллекция>-<N>) → экран категории / тканей (библиотека js/fabrics-data.js) → окно изделия
   → лайтбокс работ → ткань крупно → корзина (данные — js/cart.js, RICCA_CART) → меню → шапка и липкая плашка.
   Новость ELUNA — карточка с луной на чистом CSS (css/site.css, .news), скрипт ей не нужен.
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
      fabrics: 'Здравствуйте! Помогите подобрать ткань.',
      photo: 'Здравствуйте! Хочу заказать мебель по фото.',
      projects: 'Здравствуйте! Хочу обсудить мебель для своей комнаты: гостиная / спальня / столовая / кабинет / другое. Размеры и фото пришлю следующим сообщением.',
      business: 'Здравствуйте! Хочу обсудить проект для бизнеса: отель / ресторан / апарт-комплекс / жилой проект / офис.',
      master: 'Здравствуйте! У меня вопрос к мастеру RICCA.',
      designer: 'Здравствуйте! Я дизайнер / архитектор, хочу обсудить мебель по проекту. Чертежи, визуализации и спецификации пришлю следующим сообщением.'
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
  /* Библиотека тканей (js/fabrics-data.js): типы → коллекции → цвета. Есть она — экран «Ткани» строится из неё
     (вкладки по типам, коллекции, образцы, «Ткань крупно»); нет — старая сетка RICCA_FABRICS. FCOL: id коллекции → { t, c } */
  const FLIB = ((window.RICCA_FABRIC_LIBRARY && Array.isArray(window.RICCA_FABRIC_LIBRARY.types)) ? window.RICCA_FABRIC_LIBRARY.types : [])
    .filter((t) => t && t.id && t.title && Array.isArray(t.collections))
    .map((t) => Object.assign({}, t, { collections: t.collections.filter((c) => c && c.id && c.title && Array.isArray(c.colours))
      .map((c) => Object.assign({}, c, { colours: c.colours.filter((k) => k && k.name && (k.src450 || k.src900)) }))
      .filter((c) => c.colours.length) }))
    .filter((t) => t.collections.length);
  const FCOL = new Map();
  FLIB.forEach((t) => t.collections.forEach((c) => FCOL.set(c.id, { t, c })));
  const fabKind = (c) => String(c.kind || '').split(':')[0].trim();   // «экокожа: зернистая, гладкая…» → «экокожа»
  // материал рядом с названием — только если он не повторяет название («Экокожа · экокожа» не пишем)
  const fabKindOf = (c) => { const k = fabKind(c); return k.toLowerCase() === String(c.title || '').toLowerCase() ? '' : k; };
  // название в WhatsApp: коллекция; если такое имя у двух коллекций (ALBA — микровелюр и экокожа) — с материалом; экокожа — с поверхностью
  const fabWaName = (c, k) => {
    let dup = 0;
    FCOL.forEach((x) => { if (x.c.title === c.title) dup += 1; });
    const extra = [dup > 1 ? fabKind(c) : '', k.finish || ''].filter(Boolean).join(', ');
    return extra ? `${c.title} (${extra})` : c.title;
  };
  // цифры с карточек: «145 000», «30 °C», «320 г/м²» — без переноса внутри
  const numNb = (h) => h.replace(/(\d) (?=\d{3}\b|°|г\/)/g, '$1&nbsp;');
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
  // «Узнать цену»: модель, её строка и ссылка на окно изделия — менеджер сразу видит, о чём речь; выбрано в окне изделия
  // количество, ткань, размер — тоже в сообщении («2 шт., ткань COCO, светло-серый, размер 260 × 95 см»)
  const itemUrl = (it) => (/^https?:$/.test(location.protocol) ? `${location.origin}${location.pathname}#item-${it.id}` : '');
  const itemWa = (it, sel) => {
    const u = itemUrl(it);
    const s = sel ? [sel.qty > 1 ? `${sel.qty} шт.` : '', sel.fabric ? `ткань ${[sel.fabric.collection, sel.fabric.colour].filter(Boolean).join(', ')}` : '', sel.size ? `размер ${sel.size}` : '', sel.note || ''].filter(Boolean).join(', ') : '';
    return waUrl(`Здравствуйте! Интересует ${lcFirst(waLabelOf(it))}${it.subtitle ? ` — ${lcFirst(it.subtitle)}` : ''}.${s ? ` ${s.replace(/^./, (c) => c.toUpperCase())}.` : ''} Подскажите, пожалуйста, цену и что нужно для расчёта.${u ? `\n${u}` : ''}`);
  };
  // корзина (js/cart.js): нет модуля — кнопки корзины прячутся, остальное работает
  const RC = window.RICCA_CART || null;

  /* ---------- Плитки каталога: число моделей (или образцов) и вторая строка подписи — из данных; так же строка под заголовком
     «Каталог». Числа не пишем руками: добавили модель в js/catalog-data.js — плитка и строка обновились сами ---------- */
  const countOf = (cat) => {
    const c = CATS[cat];
    if (!c || c.href) return '';
    if (c.view === 'fabrics' && FCOL.size) return `${FCOL.size} ${plural3(FCOL.size, ['коллекция', 'коллекции', 'коллекций'])}`;
    if (c.view === 'fabrics') { const n = FABRICS.reduce((s, g) => s + ((g && g.items) || []).length, 0); return n ? `${n} ${plural3(n, ['образец', 'образца', 'образцов'])}` : ''; }
    const n = ITEMS.filter((i) => i.category === cat).length;
    return n ? `${n} ${plural3(n, ['модель', 'модели', 'моделей'])}` : '';
  };
  const subOf = (cat) => { const c = CATS[cat] || {}; return [countOf(cat), c.desc || ''].filter(Boolean).map(typo).join(' · '); };
  // на плитке: число — отдельным элементом, точка — при нём (телефон: число своей строкой, точка скрыта от глаз, но читается
  // экранным диктором), описание — после; без висящей «·» в конце строки
  // на плитках каталога число моделей не пишем: каталог — примеры, шьём и любую другую модель (BRIEF, правки 13 октября);
  // число оставляем только у тканей («14 коллекций»)
  const tileSubOf = (cat) => {
    const c = CATS[cat] || {}, n = c.view === 'fabrics' ? countOf(cat) : '', d = c.desc || '';
    return n && d ? `<span class="tile__n">${typo(n)}</span><span class="tile__dot"> · </span>${typo(d)}` : typo(n || d);
  };
  $$('.tile[data-cat]').forEach((a) => {
    const cat = a.dataset.cat, c = CATS[cat];
    if (!c) return;
    const sub = $('[data-tile-sub]', a), img = $('.tile__img img', a);
    if (sub) sub.innerHTML = tileSubOf(cat);
    if (img && c.coverAlt) img.alt = c.coverAlt;
  });
  // строка под «Каталогом» — в HTML: модели каталога — примеры, шьём и любую другую (BRIEF, правки 13 октября); общего
  // числа моделей не пишем, чтобы каталог не выглядел пределом

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
    let userPaused = saveData || !!opts.startPaused, inView = false, base = '';
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
  // reduced motion — только постеры, ролики не грузим и кнопки не показываем
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
  }
  // ролик ателье: телефон — своя лёгкая версия (data-src-phone). Reduced motion — не играет сам: постер и ▶, ролик — по нажатию
  $$('[data-autovideo]').forEach((box) => {
    const v = $('video', box);
    const ctl = autoVideo(v, $('[data-vtoggle]', box), () => (mqPhone.matches && v.dataset.srcPhone) || v.dataset.src, { target: box, startPaused: reduceMotion });
    if (ctl && v.dataset.srcPhone) mqPhone.addEventListener('change', () => ctl.reload());
  });

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
      if ((m = /^fabric-([a-z0-9-]+)-(\d+)$/.exec(h))) return { fab: m[1], fabN: +m[2] - 1 };
      return { anchor: h };
    },
    go(hash, opener) {
      R.opener = opener || null;
      try { history.pushState({ rd: R.depth() + 1 }, '', hash); } catch (_) { location.hash = hash; return; }
      R.apply();
    },
    replace(hash) { try { history.replaceState({ rd: R.depth() }, '', hash); } catch (_) { /* file:// */ } },
    // на плитки каталога: адрес #catalog, окна закрыты, раздел — в начале экрана
    toCatalog() {
      R.replace('#catalog'); PD.close(false); LB.close(false); FZ.close(false); View.close(false);
      const el = document.getElementById('catalog');
      if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    },
    closeTo(fallback) {
      if (R.depth() > 0) { history.back(); return; }
      R.replace(fallback); R.apply();
      const el = document.getElementById(fallback.replace(/^#/, ''));
      if (el && Math.abs(el.getBoundingClientRect().top) > window.innerHeight) el.scrollIntoView({ block: 'start' });
    },
    apply(initial) {
      const r = R.parse(location.hash);
      if (initial && r.anchor) {
        // старые ссылки (Instagram, прошлые версии): #catalog-sofas → #catalog/sofas, #materials → ткани, #novinka → новости;
        // неизвестная категория → каталог
        if (r.anchor === 'novinka') {
          R.replace('#news');
          const el = document.getElementById('news');
          if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
          return;
        }
        const legacy = /^catalog-([a-z]+)/.exec(r.anchor);
        const to = legacy ? (CATS[legacy[1]] && !CATS[legacy[1]].href ? `#catalog/${legacy[1]}` : '#catalog')
          : (r.anchor === 'materials' ? '#catalog/fabrics' : '');
        if (to === '#catalog') { R.toCatalog(); return; }
        if (to) { R.replace(to); return R.apply(false); }
      }
      // изделия с таким id нет (ссылка из прошлых версий): экран его категории по началу id, иначе — каталог
      if (r.item && !ITEM.has(r.item)) {
        const cat = { sofa: 'sofas', bed: 'beds', armchair: 'armchairs', chair: 'chairs', table: 'tables' }[r.item.split('-')[0]];
        if (cat && CATS[cat] && !CATS[cat].href) { R.replace(`#catalog/${cat}`); return R.apply(false); }
        R.toCatalog(); return;
      }
      // ткани такой нет (коллекцию убрали из js/fabrics-data.js) — экран «Ткани»
      if (r.fab != null && !(FCOL.has(r.fab) && FCOL.get(r.fab).c.colours[r.fabN])) { R.replace('#catalog/fabrics'); return R.apply(false); }
      // уровень 1: категория / ткани / все работы
      if (r.cat) {
        const c = CATS[r.cat];
        if (!c || c.href) R.toCatalog();
        else View.open(c.view === 'fabrics' ? { type: 'fabrics', sub: r.sub } : { type: 'cat', cat: r.cat, sub: r.sub });
      } else if (r.works && WORKS.length) View.open({ type: 'works' });
      else if (r.works) R.toCatalog();
      else if (r.item && initial && ITEM.has(r.item)) {
        // вход по ссылке на изделие: под окном — его категория, чтобы «Закрыть» вело к остальным моделям
        const it = ITEM.get(r.item);
        R.replace(`#catalog/${it.category}`);
        try { history.pushState({ rd: 1 }, '', `#item-${it.id}`); } catch (_) { /* */ }
        View.open({ type: 'cat', cat: it.category, sub: 'all' });
      } else if (r.fab != null && initial) {
        // вход по ссылке на ткань: под окном — экран «Ткани»
        R.replace('#catalog/fabrics');
        try { history.pushState({ rd: 1 }, '', `#fabric-${r.fab}-${r.fabN + 1}`); } catch (_) { /* */ }
        View.open({ type: 'fabrics', sub: 'all' });
      } else if (!r.item && r.work == null && r.fab == null) View.close(false);
      // уровень 2: изделие / фото работы / ткань крупно
      if (r.item && ITEM.has(r.item)) { LB.close(false); FZ.close(false); PD.open(r.item); }
      else if (r.work != null && WORKS[r.work]) { PD.close(false); FZ.close(false); LB.open(r.work); }
      else if (r.fab != null) { PD.close(false); LB.close(false); FZ.open(r.fab, r.fabN); }
      else { PD.close(); LB.close(); FZ.close(); }
      R.opener = null;
    }
  };

  /* ---------- Экран категории / тканей / всех работ (один полноэкранный уровень) ---------- */
  const View = (() => {
    const dlg = $('#view');
    const title = $('#view-title'), nEl = $('[data-view-n]'), tabs = $('[data-view-tabs]'), content = $('[data-view-content]');
    const back = $('[data-view-back]'), wa = $('[data-view-wa]'), waLabel = $('[data-view-wa-label]'), foot = $('[data-view-foot]');
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
      tabs.classList.remove('is-fab'); if (foot) foot.hidden = false;
      const dsc = (CATS[cat] && CATS[cat].desc) || '';   // без числа моделей: каталог — примеры, не предел
      nEl.innerHTML = `${dsc ? `${typo(dsc)}. ` : ''}Сошьём и&nbsp;любую другую модель`;
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
    /* Ткани — библиотека: вкладки по типам (липкие; подсвечивают тип, который сейчас на экране), коллекция — название капителью,
       материал и число цветов, факты с карточки одной строкой, фактура крупно (если есть), образцы квадратами с названием цвета.
       Образец → «Ткань крупно» (#fabric-<коллекция>-<N>). В конце — шоурум и WhatsApp «Помогите подобрать ткань» */
    let spyHold = 0;
    // образец в сетке: 240 px на телефоне, 450 px на компьютере (плитка 66–140 px)
    const swImg = (k) => {
      const big = k.src450 || k.src900, s240 = k.src240 || '';
      return `<img src="${esc(s240 || big)}"${s240 && big ? ` srcset="${esc(`${s240} 240w, ${big} 450w`)}" sizes="(min-width: 1200px) 140px, (min-width: 768px) 12vw, 22vw"` : ''} width="450" height="450" alt="" loading="lazy" decoding="async">`;
    };
    function renderLibrary() {
      title.textContent = 'Ткани';
      nEl.innerHTML = typo('Популярные коллекции по типам.');   // «больше 50 коллекций и 1000 цветов» — один раз, в конце
      back.textContent = 'Каталог';
      tabs.classList.add('is-fab');
      tabs.innerHTML = FLIB.map((t, i) => `<button type="button" data-ftype="${esc(t.id)}" aria-pressed="${i === 0}">${esc(t.title)}</button>`).join('');
      tabs.hidden = FLIB.length < 2;
      const kindLine = (c) => { const n = c.colours.length; let k = String(c.kind || '').trim(); if (!fabKindOf(c) && k.includes(':')) k = k.slice(k.indexOf(':') + 1).trim(); return `${typo(k.replace(/^./, (ch) => ch.toUpperCase()))}&nbsp;· ${n}&nbsp;${plural3(n, ['цвет', 'цвета', 'цветов'])}`; };
      content.innerHTML = `<div class="fl">${FLIB.map((t) => `<section class="fl__type" id="fab-t-${esc(t.id)}" data-ftype="${esc(t.id)}" aria-labelledby="fl-t-${esc(t.id)}">`
        + `<h3 class="fl__tt" id="fl-t-${esc(t.id)}">${esc(t.title)}</h3>`
        + t.collections.map((c) => `<article class="fl__col" id="fab-${esc(c.id)}" aria-label="${esc([c.title, fabKindOf(c)].filter(Boolean).join(', '))}"><div class="fl__info">`
          + `<h4 class="caps fl__name">${esc(c.title)}</h4><p class="fl__kind">${kindLine(c)}</p>`
          + ((c.facts || []).length ? `<p class="fl__facts">${numNb(typo(c.facts.slice(0, 3).map((f) => lcFirst(f)).join(' · ').replace(/^./, (ch) => ch.toUpperCase())))}</p>` : '')
          + (c.texture ? `<span class="fl__tex"><img src="${esc(c.texture.replace(/texture-600\.webp$/, 'texture-160.webp'))}" srcset="${esc(`${c.texture.replace(/texture-600\.webp$/, 'texture-160.webp')} 160w, ${c.texture} 600w`)}" sizes="(max-width: 767px) 72px, 200px" width="600" height="600" alt="${esc(`${c.title}: фактура ткани крупно`)}" loading="lazy" decoding="async"></span>` : '')
          + `</div><ul class="fl__grid" role="list">${c.colours.map((k, j) => `<li><button class="fl__sw" type="button" data-fab="${esc(c.id)}" data-n="${j + 1}" aria-haspopup="dialog" aria-label="${esc(`${c.title}, ${k.name.toLowerCase()}${k.finish ? `, ${k.finish}` : ''}: открыть крупно`)}">`
            + `<span class="fl__img"${/^#[0-9a-f]{3,8}$/i.test(k.hex || '') ? ` style="--c:${k.hex}"` : ''}>${swImg(k)}</span>`
            + `<span class="fl__cn" aria-hidden="true">${typo(k.name)}${k.finish ? `<small>${esc(k.finish)}</small>` : ''}</span></button></li>`).join('')}</ul></article>`).join('')
        + '</section>').join('')}</div>`
        + `<div class="fl__end"><p class="fl__end-line">${typo('Больше 50 коллекций и 1000 цветов — вживую в шоуруме на Навои, 208/2.')}</p>`
        + `<div class="fl__end-btns"><a class="btn btn--fill" href="#showroom" data-to-showroom>Подобрать ткань в&nbsp;шоуруме</a>`
        + `<a class="btn btn--line" href="${esc(waUrl(CONFIG.msg.fabrics))}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true"><use href="#i-whatsapp"/></svg>Помогите подобрать ткань<span class="sr-only"> (откроется в&nbsp;WhatsApp)</span></a></div></div>`;
      if (foot) foot.hidden = true;
      spyHold = 0;
    }
    // какая вкладка подсвечена: последний тип, чей заголовок уже под вкладками; в самом конце — последний тип
    let spyRaf = 0;
    function spy() {
      spyRaf = 0;
      if (!spec || spec.type !== 'fabrics' || !FCOL.size || tabs.hidden || Date.now() < spyHold) return;
      const secs = $$('.fl__type', content);
      if (!secs.length) return;
      const lim = tabs.getBoundingClientRect().bottom + 56;
      let cur = secs[0].dataset.ftype;
      secs.forEach((x) => { if (x.getBoundingClientRect().top <= lim) cur = x.dataset.ftype; });
      if (dlg.scrollTop + dlg.clientHeight >= dlg.scrollHeight - 4) cur = secs[secs.length - 1].dataset.ftype;
      markTab(cur);
    }
    function markTab(id) {
      let on = null;
      $$('button', tabs).forEach((b) => { const y = b.dataset.ftype === id; b.setAttribute('aria-pressed', String(y)); if (y) on = b; });
      if (on && tabs.scrollWidth > tabs.clientWidth + 2) {
        const left = on.offsetLeft - (tabs.clientWidth - on.offsetWidth) / 2;
        if (Math.abs(tabs.scrollLeft - left) > 4) tabs.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }
    function toType(id, smooth) {
      const sec = document.getElementById(`fab-t-${id}`);
      if (!sec) return;
      markTab(id);
      spyHold = Date.now() + (smooth ? 900 : 120);
      sec.scrollIntoView({ block: 'start', behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
    }
    function renderFabrics() {
      if (FCOL.size) { renderLibrary(); return; }
      tabs.classList.remove('is-fab'); if (foot) foot.hidden = false;
      const n = FABRICS.reduce((s, g) => s + ((g && g.items) || []).length, 0);
      title.textContent = 'Ткани';
      nEl.innerHTML = `${subOf('fabrics')}. Образцы&nbsp;— в&nbsp;шоуруме`;
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
      tabs.classList.remove('is-fab'); if (foot) foot.hidden = false;
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
      const f = e.target.closest('button[data-ftype]');
      if (f && spec && spec.type === 'fabrics') { toType(f.dataset.ftype, true); return; }
      const b = e.target.closest('button[data-sub]');
      if (!b || !spec || spec.type !== 'cat') return;
      const sub = setSub(b.dataset.sub);
      R.replace(`#catalog/${spec.cat}${sub !== 'all' ? `/${sub}` : ''}`);
    });
    dlg.addEventListener('scroll', () => {
      dlg.classList.toggle('is-scrolled', dlg.scrollTop > 8);
      if (spec && spec.type === 'fabrics' && !spyRaf) spyRaf = requestAnimationFrame(spy);
    }, { passive: true });
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
        if (fresh && s.type === 'fabrics' && s.sub && s.sub !== 'all') requestAnimationFrame(() => toType(s.sub, false));   // #catalog/fabrics/bukle
        if (!was || fresh) requestAnimationFrame(() => title.focus({ preventScroll: true }));
      },
      close(focus = true) { hideDlg(dlg, focus); }
    };
  })();

  /* ---------- Окно изделия: все фото (свайп, стрелки, миниатюры, ←/→), одна строка; заказ — количество, ткань из библиотеки
     (коллекция → цвет, или «подберём вместе»), размер (у моделей с несколькими размерами в каталоге — выбор из них или «свой»),
     пожелания → «Добавить в корзину»; «Узнать цену» в WhatsApp ---------- */
  const PD = (() => {
    const dlg = $('#product');
    const stage = $('[data-pd-stage]', dlg), frame = $('[data-pd-frame]', dlg), img = $('[data-pd-img]', dlg), gallery = $('.pd__gallery', dlg);
    const prev = $('[data-pd-prev]', dlg), next = $('[data-pd-next]', dlg), count = $('[data-pd-count]', dlg), thumbsBox = $('[data-pd-thumbs]', dlg);
    const catEl = $('[data-pd-cat]', dlg), title = $('[data-pd-title]', dlg), sub = $('[data-pd-sub]', dlg);
    const desc = $('[data-pd-desc]', dlg), chips = $('[data-pd-chips]', dlg), passport = $('[data-pd-passport]', dlg), more = $('[data-pd-more]', dlg);
    const facts = $('[data-pd-facts]', dlg);
    const wa = $('[data-pd-wa]', dlg), addBtn = $('[data-pd-add]', dlg), inCart = $('[data-pd-incart]', dlg), order = $('[data-pd-order]', dlg);
    const qtyN = $('[data-pd-qty-n]', dlg), qtyB = $$('[data-pd-qty]', dlg), fabSel = $('[data-pd-fab]', dlg), swBox = $('[data-pd-sw]', dlg), fabV = $('[data-pd-fabv]', dlg);
    const sizeIn = $('[data-pd-size]', dlg), noteIn = $('[data-pd-note]', dlg), sizeSel = $('[data-pd-sizes]', dlg);
    const OWN = '__own';   // «Свой размер» в списке размеров
    let sizes = [];        // размеры модели из каталога: ['2740 × 1090 × 760 мм', '2940 × 1090 × 760 мм'] — список, если их два и больше
    let cur = null, idx = 0, thumbs = [];
    /* заказ: sel — что выбрано сейчас; ткань — коллекция из библиотеки и цвет (номер в коллекции) */
    const sel = { qty: 1, col: '', k: -1 };
    if (FLIB.length) fabSel.insertAdjacentHTML('beforeend', FLIB.map((t) => `<optgroup label="${esc(t.title)}">${t.collections.map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('')}</optgroup>`).join(''));
    else fabSel.closest('.pd__row').hidden = true;
    if (!RC) { order.hidden = true; addBtn.hidden = true; }
    const fabOf = () => {
      const x = sel.col && FCOL.get(sel.col);
      if (!x) return null;
      const k = x.c.colours[sel.k];
      return k ? { collection: fabWaName(x.c, k), colour: k.name.toLowerCase(), kind: fabKind(x.c), id: `${x.c.id}-${sel.k + 1}` } : { collection: x.c.title, colour: '', kind: fabKind(x.c) };
    };
    const sizeNow = () => (sizes.length > 1 && sizeSel.value !== OWN ? sizeSel.value : sizeIn.value.replace(/\s+/g, ' ').trim());
    const selNow = () => ({ qty: sel.qty, fabric: fabOf(), size: sizeNow(), note: noteIn.value.trim() });
    function paintSize() {
      const list = sizes.length > 1;
      sizeSel.closest('.sel').hidden = !list;
      sizeIn.hidden = list && sizeSel.value !== OWN;
      sizeIn.closest('.pd__row').querySelector('.pd__lbl').setAttribute('for', list ? 'pd-sizes' : 'pd-size');
    }
    function paintQty() {
      qtyN.textContent = `${sel.qty}\u00a0шт.`;
      qtyB.forEach((b) => b.setAttribute('aria-disabled', String(+b.dataset.pdQty < 0 ? sel.qty <= 1 : sel.qty >= ((RC && RC.MAX_QTY) || 20))));
    }
    function paintFab() {
      const x = sel.col && FCOL.get(sel.col);
      fabSel.value = x ? sel.col : '';
      swBox.hidden = !x;
      if (x && swBox.dataset.col !== sel.col) {
        swBox.dataset.col = sel.col;
        swBox.innerHTML = x.c.colours.map((k, j) => `<button class="sw__b" type="button" data-sw="${j}" role="radio" aria-checked="false" tabindex="-1" aria-label="${esc(`${k.name}${k.finish ? `, ${k.finish}` : ''}`)}" title="${esc(k.name)}"${/^#[0-9a-f]{3,8}$/i.test(k.hex || '') ? ` style="--c:${k.hex}"` : ''}>`
          + `<img src="${esc(k.src240 || k.src450 || k.src900)}" width="240" height="240" alt="" loading="lazy" decoding="async"></button>`).join('');
      }
      // цвета — группа радиокнопок: одна остановка Tab (выбранный цвет или первый), ←/→/↑/↓ — соседние
      const bs = $$('.sw__b', swBox), on = bs.find((b) => +b.dataset.sw === sel.k);
      bs.forEach((b) => { b.setAttribute('aria-checked', String(b === on)); b.tabIndex = b === (on || bs[0]) ? 0 : -1; });
      const f = fabOf();
      fabV.hidden = !x;
      if (x) fabV.innerHTML = f && f.colour ? typo(`${f.collection} · ${f.colour}`) : 'Выберите цвет&nbsp;— или оставьте выбор нам';
    }
    function paintWa() { if (cur) wa.href = itemWa(cur, selNow()); }
    // «В корзине: 2 шт.» под кнопкой — если эта модель уже в корзине (с любой тканью)
    function syncCart() {
      if (!RC || !cur) return;
      const n = RC.list().filter((x) => x.kind === 'catalog' && x.id === cur.id).reduce((s2, x) => s2 + x.qty, 0);
      inCart.hidden = !n;
      if (n) inCart.innerHTML = `<span>В&nbsp;корзине: ${n}&nbsp;шт.</span><button class="caps-link" type="button" data-open-cart>Открыть корзину</button>`;
    }
    function resetOrder() { sel.qty = 1; sel.col = ''; sel.k = -1; sizeIn.value = ''; noteIn.value = ''; sizeSel.selectedIndex = 0; paintQty(); paintFab(); paintSize(); }
    qtyB.forEach((b) => b.addEventListener('click', () => {
      if (b.getAttribute('aria-disabled') === 'true') return;
      sel.qty = Math.max(1, Math.min((RC && RC.MAX_QTY) || 20, sel.qty + +b.dataset.pdQty)); paintQty(); paintWa();
    }));
    fabSel.addEventListener('change', () => { sel.col = fabSel.value; sel.k = -1; paintFab(); paintWa(); });
    swBox.addEventListener('click', (e) => { const b = e.target.closest('[data-sw]'); if (!b) return; sel.k = +b.dataset.sw === sel.k ? -1 : +b.dataset.sw; paintFab(); paintWa(); });
    swBox.addEventListener('keydown', (e) => {
      const b = e.target.closest('[data-sw]'), d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!b || !d) return;
      e.preventDefault();
      const bs = $$('.sw__b', swBox), n = (bs.indexOf(b) + d + bs.length) % bs.length;
      sel.k = n; paintFab(); paintWa(); bs[n].focus();
    });
    sizeIn.addEventListener('input', paintWa); noteIn.addEventListener('input', paintWa);
    sizeSel.addEventListener('change', () => { paintSize(); paintWa(); if (sizeSel.value === OWN) sizeIn.focus(); });
    addBtn.addEventListener('click', () => {
      if (!RC || !cur) return;
      const s2 = selNow(), p = cur.photos[0];
      const was = RC.count().lines;
      const uid = RC.add({ kind: 'catalog', id: cur.id, title: labelOf(cur), reading: cur.reading || '', subtitle: cur.subtitle || catLabel(cur.category),
        qty: s2.qty, size: s2.size, fabric: s2.fabric, note: s2.note, link: RC.abs(`#item-${cur.id}`), thumb: p ? (p.src600 || p.src) : '' });
      if (!uid) { CART.say(`В корзине уже ${RC.MAX_LINES} позиций — отправьте заявку, затем добавьте ещё`, true); return; }
      const line = RC.list().find((x) => x.uid === uid);
      CART.say(RC.count().lines > was ? `Добавлено: ${labelOf(cur)} — ${s2.qty}\u00a0шт.` : `${labelOf(cur)}: теперь ${line ? line.qty : s2.qty}\u00a0шт. в корзине`, true);
    });
    if (RC) RC.onChange(syncCart);
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
      // миниатюры — одна остановка Tab (roving tabindex): ←/→ листают, фокус идёт за текущим фото
      thumbs.forEach((t, j) => { t.setAttribute('aria-current', String(j === idx)); t.tabIndex = j === idx ? 0 : -1; });
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
      // сверху — только факты из данных: габариты (если в данных есть цифры), механизм, гарантия, доставка; остальное — в «Подробнее»
      const wood = it.category === 'tables';
      const clean = (v) => String(v || '').trim().replace(/\.$/, '');
      const hasDims = /\d/.test(it.sizes || '');
      const top = [['Размеры', hasDims ? it.sizes : ''], ['Механизм', it.mechanism], ['Гарантия', it.warranty], ['Доставка', it.delivery]].filter((r) => r[1]);
      // «Ш × Г × В: 2740 × 1090 × 760 мм …» → цифры строкой, расшифровка порядка — мелко под ними
      const fact = (k, v) => {
        const m = k === 'Размеры' && /^Ш × Г × В:\s*(.+)$/.exec(clean(v));
        return m ? `${typo(m[1])}<small>ширина × глубина × высота</small>` : typo(clean(v));
      };
      facts.innerHTML = top.map(([k, v]) => `<div><dt>${k}</dt><dd>${fact(k, v)}</dd></div>`).join('');
      // несколько размеров в каталоге («2740 × 1090 × 760 мм и 2940 × 1090 × 760 мм») — выбор из них под «Размер» или «Свой размер»
      const dm = hasDims && /^Ш × Г × В:\s*(.+)$/.exec(clean(it.sizes));
      sizes = dm ? dm[1].split(/\s+и\s+|;\s*/).map((v) => v.trim()).filter((v) => /\d/.test(v)).map((v) => (/мм$/.test(v) ? v : `${v} мм`)) : [];
      sizeSel.innerHTML = sizes.length > 1 ? sizes.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('') + `<option value="${OWN}">Свой размер</option>` : '';
      facts.hidden = !top.length;
      const rows = [['Размеры', hasDims ? '' : it.sizes], [wood ? 'Материал' : 'Ткань и&nbsp;кожа', it.materials], ['Наполнение', it.filling], ['Срок', it.lead]].filter((r) => r[1]);
      passport.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${typo(v)}</dd></div>`).join('');
      passport.hidden = !rows.length;
      more.open = false; more.hidden = !rows.length && !it.description && !(it.options || []).length;
      resetOrder();
      wa.href = itemWa(it);
      wa.setAttribute('aria-label', `Узнать цену в WhatsApp: ${labelOf(it)}`);
      addBtn.setAttribute('aria-label', `Добавить в корзину: ${labelOf(it)}`);
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
      syncCart();
    }
    prev.addEventListener('click', () => show(idx - 1));
    next.addEventListener('click', () => show(idx + 1));
    dlg.addEventListener('keydown', (e) => {
      if (!cur || cur.photos.length < 2 || e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.target.closest('summary, a, input, textarea, select, .pd__actions, .pd__order, .pd__incart')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); } else if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); } else return;
      if (e.target.classList && e.target.classList.contains('pd__thumb') && thumbs[idx]) thumbs[idx].focus();
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

  /* ---------- Ткань крупно: образец 900 px (нет — 450), цвет, коллекция; ←/→, свайп и стрелки — соседние цвета коллекции;
     «Хочу эту ткань» — WhatsApp «Интересует ткань RIVER, цвет молочный.» и ссылка на этот образец;
     «В корзину — эта ткань» — строка корзины kind 'fabric' (уже в корзине — кнопка «Ткань в корзине» открывает корзину) ---------- */
  const FZ = (() => {
    const dlg = $('#fabric');
    if (!dlg) return { open() {}, close() {} };
    const stage = $('[data-fz-stage]', dlg), frame = $('[data-fz-frame]', dlg), img = $('[data-fz-img]', dlg);
    const title = $('[data-fz-title]', dlg), piece = $('[data-fz-piece]', dlg), wa = $('[data-fz-wa]', dlg), count = $('[data-fz-count]', dlg);
    const steps = $$('[data-fz-step]', dlg), cartBtn = $('[data-fz-cart]', dlg);
    let cur = null, idx = 0;
    const fzId = () => (cur ? `${cur.c.id}-${idx + 1}` : '');
    const fzIn = () => !!(RC && cur && RC.list().some((x) => x.kind === 'fabric' && x.id === fzId()));
    function syncCart() {
      if (!cartBtn || !cur) return;
      const on = fzIn(), k = list()[idx];
      cartBtn.setAttribute('aria-pressed', String(on));
      cartBtn.lastChild.textContent = on ? 'Ткань в\u00a0корзине' : 'В\u00a0корзину\u00a0— эта ткань';
      cartBtn.setAttribute('aria-label', on ? 'Ткань в корзине — открыть корзину' : `В корзину — ткань ${cur.c.title}, ${k ? k.name.toLowerCase() : ''}`);
    }
    if (cartBtn && !RC) cartBtn.hidden = true;
    if (cartBtn && RC) {
      RC.onChange(syncCart);
      cartBtn.addEventListener('click', () => {
        if (!cur) return;
        if (fzIn()) { CART.open(cartBtn); return; }
        const c = cur.c, k = list()[idx];
        if (!k) return;
        const name = fabWaName(c, k), colour = k.name.toLowerCase();
        const uid = RC.add({ kind: 'fabric', id: fzId(), title: `Ткань ${name}, ${colour}`, subtitle: [fabKind(c), k.finish].filter(Boolean).join(', '),
          qty: 1, fabric: { collection: name, colour, kind: fabKind(c), id: fzId() }, link: RC.abs(`#fabric-${fzId()}`), thumb: k.src240 || k.src450 || '' });
        if (!uid) { CART.say(`В корзине уже ${RC.MAX_LINES} позиций — отправьте заявку, затем добавьте ещё`, true); return; }
        CART.say(`Ткань в корзине: ${c.title}, ${colour}`, true);
      });
    }
    const list = () => (cur ? cur.c.colours : []);
    function layout() {
      const k = list()[idx];
      if (!k) return;
      const cs = getComputedStyle(stage);
      const sw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const sh = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (sw <= 0 || sh <= 0) return;
      // размер квадрата — один на всю коллекцию (не прыгает при листании): все цвета с 900 px — до 640, иначе — до 450
      const cap = list().every((x) => x.src900) ? 640 : 450;
      const side = Math.floor(Math.min(sw, sh, cap));
      frame.style.width = frame.style.height = `${side}px`;
    }
    function show(i) {
      const ks = list();
      if (!ks.length) return;
      idx = (i + ks.length) % ks.length;
      const k = ks[idx], c = cur.c;
      frame.style.setProperty('--c', /^#[0-9a-f]{3,8}$/i.test(k.hex || '') ? k.hex : '');
      frame.classList.add('is-loading');
      img.onload = () => frame.classList.remove('is-loading');
      img.onerror = () => { if (k.src450 && img.getAttribute('src') !== k.src450) img.src = k.src450; else frame.classList.remove('is-loading'); };
      img.alt = `Ткань ${c.title}, цвет ${k.name.toLowerCase()}${k.finish ? `, ${k.finish}` : ''}`;
      img.src = k.src900 || k.src450;
      if (img.complete && img.naturalWidth) frame.classList.remove('is-loading');
      layout();
      title.innerHTML = typo(k.name);
      piece.innerHTML = typo([c.title, [fabKindOf(c), k.finish].filter(Boolean).join(', ')].filter(Boolean).join(' · '));
      const u = /^https?:$/.test(location.protocol) ? `\n${location.origin}${location.pathname}#fabric-${c.id}-${idx + 1}` : '';
      wa.href = waUrl(`Здравствуйте! Интересует ткань ${fabWaName(c, k)}, цвет ${k.name.toLowerCase()}.${u}`);
      wa.setAttribute('aria-label', `Хочу эту ткань: ${c.title}, ${k.name.toLowerCase()} — написать в WhatsApp`);
      count.innerHTML = ks.length > 1 ? `<span aria-hidden="true">${pad2(idx + 1)} / ${pad2(ks.length)}</span><span class="sr-only">Цвет ${idx + 1} из ${ks.length}</span>` : '';
      steps.forEach((b) => { b.hidden = ks.length < 2; });
      syncCart();
      const nx = ks[(idx + 1) % ks.length];
      if (nx && nx !== k) { const pre = new Image(); pre.src = nx.src900 || nx.src450; }
    }
    const step = (d) => { show(idx + d); if (cur) R.replace(`#fabric-${cur.c.id}-${idx + 1}`); };
    steps.forEach((b) => b.addEventListener('click', () => step(+b.dataset.fzStep)));
    dlg.addEventListener('keydown', (e) => {
      if (e.altKey || e.metaKey || e.ctrlKey || list().length < 2) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
    let sx = null, sy = 0;
    stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    stage.addEventListener('pointerup', (e) => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (list().length > 1 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1); });
    stage.addEventListener('pointercancel', () => { sx = null; });
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (dlg.open) layout(); }).observe(stage);
    else window.addEventListener('resize', () => { if (dlg.open) layout(); });
    return {
      open(id, n) {
        const x = FCOL.get(id);
        if (!x) return;
        const same = dlg.open && cur === x && idx === n;
        cur = x;
        showDlg(dlg, R.opener);
        if (!same) show(n);
        requestAnimationFrame(layout);
      },
      close(focus = true) { hideDlg(dlg, focus); }
    };
  })();

  /* ---------- Корзина: строки из js/cart.js (RICCA_CART) → заявка в WhatsApp одним сообщением (длинная — по частям).
     Строка: фото, название, строка модели, ткань, размер, количество (−/+), комментарий, «Убрать». Ниже — имя, город и
     комментарий к заказу (по желанию; помнятся в этом браузере, ricca-cart-contact-v1). После отправки — «Очистить корзину?»
     (сама не очищается). «Очистить» — с «Вернуть» в тосте ---------- */
  const CART = (() => {
    const dlg = $('#cart');
    const openBtn = $('#cart-open'), countEl = $('#cart-count'), menuBtn = $('[data-open-cart]', $('#menu')), menuN = $('[data-cart-mn]');
    const viewBtn = $('#view [data-open-cart]');   // значок корзины в полосе экрана категории
    const toast = $('#toast'), toastText = $('#toast-text'), toastOpen = $('#toast-open');
    let toastT = 0, toastFn = null, toastBy = null;
    function say(text, withOpen, label, fn) {
      if (document.activeElement && document.activeElement !== toastOpen && document.activeElement !== document.body) toastBy = document.activeElement;
      const open = $$('dialog[open]');
      (open.length ? open[open.length - 1] : document.body).append(toast);
      toastText.textContent = text;
      toastOpen.hidden = !withOpen;
      toastOpen.textContent = label || 'Открыть корзину';
      toastFn = fn || null;
      toast.hidden = false; clearTimeout(toastT);
      toastT = setTimeout(() => { toast.hidden = true; }, fn ? 6000 : 3400);
    }
    const hideToast = () => { clearTimeout(toastT); toast.hidden = true; document.body.append(toast); };
    if (!RC || !dlg) {
      [openBtn, menuBtn, viewBtn].forEach((b) => { if (b) b.hidden = true; });
      return { say() {}, open() {}, close() {} };
    }
    const list = $('[data-cart-list]', dlg), empty = $('[data-cart-empty]', dlg), form = $('[data-cart-form]', dlg), foot = $('[data-cart-foot]', dlg);
    const nEl = $('[data-cart-n]', dlg), sends = $('[data-cart-sends]', dlg), split = $('[data-cart-split]', dlg), after = $('[data-cart-after]', dlg);
    const CKEY = 'ricca-cart-contact-v1';
    const contact = Object.assign({ name: '', city: '', comment: '' }, store.get(CKEY, {}));
    ['name', 'city', 'comment'].forEach((k) => { if (form.elements[k]) form.elements[k].value = String(contact[k] || ''); });
    const MAXQ = RC.MAX_QTY;
    const rows = new Map();     // uid → { li, … } — строки не пересобираются: фокус и набор текста не сбиваются
    let sent = new Set(), lastMsg = '', lastN = null;
    const items = (n) => `${n} ${plural3(n, ['предмет', 'предмета', 'предметов'])}`;
    function thumbOf(x) {
      if (x.kind === 'catalog' && ITEM.has(x.id)) {
        const p = ITEM.get(x.id).photos[0];
        return { src: p.src600 || p.src, w: p.w, h: p.h, studio: !!p.studio, z: p.studio ? fitZoom(p, 0.8) : 1 };
      }
      if (x.kind === 'fabric' && x.fabric && x.fabric.id) {
        const m = /^(.+)-(\d+)$/.exec(x.fabric.id), f = m && FCOL.get(m[1]), k = f && f.c.colours[+m[2] - 1];
        if (k) return { src: k.src240 || k.src450, w: 240, h: 240, fabric: true, z: 1 };
      }
      return x.thumb ? { src: x.thumb, w: 600, h: 750, z: 1 } : null;
    }
    function metaOf(x) {
      const m = [];
      if (x.kind === 'catalog') m.push((ITEM.get(x.id) || {}).subtitle || x.subtitle);
      else if (x.subtitle) m.push(x.subtitle);
      if (x.kind !== 'fabric') m.push(x.fabric ? `Ткань: ${[x.fabric.collection, x.fabric.colour || 'цвет не выбран'].filter(Boolean).join(', ')}` : 'Ткань: подберём вместе');
      if (x.size) m.push(`Размер: ${x.size}`);
      return m.filter(Boolean);
    }
    function makeRow(x) {
      const li = document.createElement('li');
      li.className = 'cart__li';
      li.innerHTML = `<span class="sl__img" aria-hidden="true"></span>`
        + `<div class="cart__main"><p class="sl__t" data-t></p><div class="cart__meta" data-m></div>`
        + `<div class="cart__ctl"><div class="qty qty--s" role="group" data-qg>`
        + `<button class="qty__b" type="button" data-q="-1"><svg class="ico" aria-hidden="true"><use href="#i-minus"/></svg></button>`
        + `<output class="qty__n" data-qn aria-live="polite"></output>`
        + `<button class="qty__b" type="button" data-q="1"><svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg></button></div>`
        + `<button class="caps-link cart__nb" type="button" data-nb aria-expanded="false" aria-controls="cn-${x.uid}">Комментарий</button></div>`
        + `<div class="cart__nf" id="cn-${x.uid}" hidden><label class="sr-only" for="cnt-${x.uid}"></label><textarea class="fld" id="cnt-${x.uid}" rows="2" maxlength="300" placeholder="Размер, механизм, пожелания"></textarea></div></div>`
        + `<button class="icon-btn cart__rm" type="button" data-rm><svg class="ico" aria-hidden="true"><use href="#i-close"/></svg></button>`;
      const r = { li, uid: x.uid, img: $('.sl__img', li), t: $('[data-t]', li), m: $('[data-m]', li), qn: $('[data-qn]', li), qg: $('[data-qg]', li),
        minus: $('[data-q="-1"]', li), plus: $('[data-q="1"]', li), nb: $('[data-nb]', li), nf: $('.cart__nf', li), ta: $('textarea', li), rm: $('[data-rm]', li), thumb: null };
      r.qg.hidden = x.kind === 'fabric';   // у ткани нет количества — «интересует»
      r.minus.addEventListener('click', () => { const y = cur(r.uid); if (y && y.qty > 1) RC.update(r.uid, { qty: y.qty - 1 }); });
      r.plus.addEventListener('click', () => { const y = cur(r.uid); if (y && y.qty < MAXQ) RC.update(r.uid, { qty: y.qty + 1 }); });
      r.nb.addEventListener('click', () => {
        const open = r.nf.hidden;
        r.nf.hidden = !open; r.nb.setAttribute('aria-expanded', String(open));
        if (open) r.ta.focus();
      });
      r.ta.addEventListener('input', () => RC.update(r.uid, { note: r.ta.value }));
      r.rm.addEventListener('click', () => {
        const i = Array.prototype.indexOf.call(list.children, li);
        RC.remove(r.uid);
        const li2 = list.children[Math.min(i, list.children.length - 1)];
        (li2 ? $('[data-rm]', li2) : $('#cart-title')).focus();
      });
      return r;
    }
    const cur = (uid) => RC.list().find((y) => y.uid === uid);
    function paintRow(r, x) {
      const th = thumbOf(x), key = th ? th.src : '';
      if (r.thumb !== key) {
        r.thumb = key;
        r.img.className = `sl__img${th && th.studio ? ' is-studio' : ''}${th && th.fabric ? ' is-fabric' : ''}`;
        r.img.replaceChildren();
        if (th) {
          const im = document.createElement('img');
          im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = th.w || 600; im.height = th.h || 750; im.src = th.src;
          if (th.z !== 1) im.style.setProperty('--z', th.z.toFixed(3));
          r.img.append(im);
        }
      }
      r.t.textContent = x.title;
      r.m.innerHTML = metaOf(x).map((t) => `<p class="sl__m">${typo(t)}</p>`).join('');
      r.qn.textContent = `${x.qty} шт.`;
      r.qg.setAttribute('aria-label', `Количество: ${x.title}`);
      r.minus.setAttribute('aria-label', `Меньше: ${x.title}`); r.plus.setAttribute('aria-label', `Больше: ${x.title}`);
      r.minus.setAttribute('aria-disabled', String(x.qty <= 1)); r.plus.setAttribute('aria-disabled', String(x.qty >= MAXQ));
      r.rm.setAttribute('aria-label', `Убрать из корзины: ${x.title}`);
      $('label', r.nf).textContent = `Комментарий к позиции: ${x.title}`;
      if (document.activeElement !== r.ta && r.ta.value !== x.note) r.ta.value = x.note;
      if (x.note && r.nf.hidden && document.activeElement !== r.nb) { r.nf.hidden = false; r.nb.setAttribute('aria-expanded', 'true'); }
    }
    // одна кнопка отправки; длинная заявка (несколько частей) — та же кнопка идёт по частям: «Отправить часть 2 из 3»,
    // над ней — «Отправлено: 1 из 3». Подвал не растёт с числом частей (на телефоне с клавиатурой форме нужно место)
    function paintSends() {
      const ps = RC.parts(contact);
      const key = ps.join('\u0000');
      if (key !== lastMsg) { lastMsg = key; sent = new Set(); after.hidden = true; }
      const n = ps.length, done = sent.size;
      split.hidden = n < 2;
      if (n > 1) split.innerHTML = typo(done ? `Отправлено: ${Math.min(done, n)} из ${n}. Нажмите ещё раз — следующая часть.` : `Заявка длинная — она уйдёт ${n} сообщениями. Отправьте их по очереди этой кнопкой.`);
      let a = $('a', sends);
      if (!a) {
        a = document.createElement('a');
        a.className = 'btn btn--fill btn--wide'; a.target = '_blank'; a.rel = 'noopener';
        a.addEventListener('click', () => {
          sent.add(+a.dataset.part);
          // href меняем после этого щелчка — иначе этот же щелчок открыл бы уже следующую часть
          setTimeout(() => {
            paintSends();
            if (sent.size >= RC.parts(contact).length) { after.hidden = false; requestAnimationFrame(() => $('.cart__after-t', after).focus({ preventScroll: false })); }
          });
        });
        sends.replaceChildren(a);
      }
      const all = done >= n, k = all ? n - 1 : Math.min(done, n - 1);
      a.dataset.part = k;
      a.href = RC.waUrl(Object.assign({ part: k }, contact));
      a.classList.toggle('is-sent', all);
      const label = n === 1
        ? (all ? 'Открыть WhatsApp ещё раз' : 'Отправить<span class="cart__send-tail"> заявку</span> в&nbsp;WhatsApp')
        : (all ? `Открыть часть ${n} из&nbsp;${n} ещё раз` : `Отправить часть ${k + 1} из&nbsp;${n}`);
      a.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-whatsapp"/></svg><span>${label}</span><span class="sr-only"> (откроется в&nbsp;WhatsApp)</span>`;
    }
    function render() {
      const all = RC.list(), c = RC.count();
      const seen = new Set();
      // порядок — как в корзине; строку переносим, только если она не на своём месте: перенос узла снимает с него фокус
      let at = list.firstChild;
      all.forEach((x) => {
        let r = rows.get(x.uid);
        if (!r) { r = makeRow(x); rows.set(x.uid, r); }
        paintRow(r, x); seen.add(x.uid);
        if (r.li !== at) list.insertBefore(r.li, at); else at = at.nextSibling;
      });
      rows.forEach((r, uid) => { if (!seen.has(uid)) { r.li.remove(); rows.delete(uid); } });
      const has = all.length > 0;
      empty.hidden = has; form.hidden = !has; foot.hidden = !has; list.hidden = !has;
      nEl.textContent = has ? ` · ${c.items}` : '';
      // шапка и меню: значок с числом предметов
      countEl.hidden = !has; countEl.textContent = c.items > 99 ? '99+' : c.items;
      openBtn.setAttribute('aria-label', has ? `Корзина: ${items(c.items).replace(' ', ' ')}` : 'Корзина, пусто');
      if (menuN) menuN.textContent = has ? `· ${c.items}` : '';
      $$('[data-cart-vn]').forEach((e) => { e.hidden = !has; e.textContent = c.items > 99 ? '99+' : c.items; });
      if (viewBtn) viewBtn.setAttribute('aria-label', openBtn.getAttribute('aria-label'));
      if (has) paintSends();
      // число изменилось — шапку с корзиной показываем (после окна изделия она могла быть спрятана прокруткой)
      if (lastN != null && c.items !== lastN) { const h = $('#hdr'); if (h) h.classList.remove('is-hidden'); }
      lastN = c.items;
      // корзину очистили или строку убрали в другой вкладке — фокус не теряется в окне
      const ae = document.activeElement;
      if (dlg.open && (!dlg.contains(ae) || ae.closest('[hidden]'))) $('#cart-title').focus({ preventScroll: true });
    }
    form.addEventListener('input', (e) => {
      const k = e.target.name;
      if (!k || !(k in contact)) return;
      contact[k] = e.target.value; store.set(CKEY, contact); paintSends();
    });
    form.addEventListener('submit', (e) => e.preventDefault());
    function clearAll(focus) {
      const snap = RC.list();
      if (!snap.length) return;
      RC.clear();
      say('Корзина очищена', true, 'Вернуть', () => { RC.clear(); snap.forEach((x) => RC.add(x)); say('Корзина возвращена', false); });
      if (focus) $('#cart-title').focus();
    }
    $('[data-cart-clear]', dlg).addEventListener('click', () => clearAll(true));
    $('[data-cart-clear-yes]', dlg).addEventListener('click', () => { clearAll(true); });
    $('[data-cart-keep]', dlg).addEventListener('click', () => { after.hidden = true; const a = $('a', sends); if (a) a.focus(); });
    $('[data-cart-browse]', dlg).addEventListener('click', (e) => {
      e.preventDefault();
      hideDlg(dlg, false);
      if ($$('dialog[open]').some((d) => d !== dlg)) return;   // каталог уже открыт под корзиной
      const el = document.getElementById('catalog');
      if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    });
    const open = (opener) => { hideToast(); render(); showDlg(dlg, opener); requestAnimationFrame(() => $('#cart-title').focus({ preventScroll: true })); };
    openBtn.addEventListener('click', () => open(openBtn));
    toastOpen.addEventListener('click', () => {
      if (toastFn) { const fn = toastFn; toastFn = null; hideToast(); fn(); return; }
      open(toastBy && document.contains(toastBy) && toastBy.offsetParent ? toastBy : openBtn);
    });
    if (menuBtn) menuBtn.addEventListener('click', () => { hideDlg($('#menu'), false); open(openBtn); });
    // «Открыть корзину» из окна изделия («В корзине: 2 шт.») и из других мест
    document.addEventListener('click', (e) => { const b = e.target.closest('[data-open-cart]'); if (b && b !== menuBtn) open(b); });
    RC.onChange(render);
    render();
    return { say, open, close: () => hideDlg(dlg) };
  })();

  /* ---------- Меню (телефон и планшет) ---------- */
  const menu = $('#menu');
  $('#menu-open').addEventListener('click', (e) => showDlg(menu, e.currentTarget));
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a) { clearTimeout(menu._hideT); menu.classList.remove('is-in'); menu.close(); lock(); }   // сразу, чтобы прокрутка к разделу сработала
  });

  /* ---------- Закрытие уровней: ✕, Esc, щелчок мимо панели корзины ---------- */
  const closers = {
    view: () => R.closeTo(View.parentHash()),
    product: () => R.closeTo(View.isOpen() ? View.hash() : '#catalog'),
    lightbox: () => R.closeTo(View.isOpen() ? View.hash() : '#works'),
    fabric: () => R.closeTo(View.isOpen() ? View.hash() : '#catalog/fabrics'),
    cart: () => CART.close(),
    menu: () => hideDlg(menu)
  };
  $$('dialog').forEach((d) => {
    d.addEventListener('cancel', (e) => { e.preventDefault(); if (closers[d.id]) closers[d.id](); });
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { e.preventDefault(); if (closers[d.id]) closers[d.id](); }
      else if (e.target === d && d.id === 'cart') closers.cart();
    });
  });

  /* ---------- Переходы: плитка → категория, модель → изделие, кадр → лайтбокс ---------- */
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const it = e.target.closest('[data-item]');
    if (it && ITEM.has(it.dataset.item)) { e.preventDefault(); R.go(`#item-${it.dataset.item}`, it); return; }
    const wk = e.target.closest('[data-work]');
    if (wk && WORKS[+wk.dataset.work]) { e.preventDefault(); R.go(`#work-${pad2(+wk.dataset.work + 1)}`, wk); return; }
    const fb = e.target.closest('[data-fab]');
    if (fb && FCOL.has(fb.dataset.fab)) { e.preventDefault(); R.go(`#fabric-${fb.dataset.fab}-${+fb.dataset.n || 1}`, fb); return; }
    // «Подобрать ткань в шоуруме» (экран «Ткани»): окна закрыть, к разделу «Шоурум»
    const ts = e.target.closest('[data-to-showroom]');
    if (ts) {
      e.preventDefault();
      R.replace('#showroom'); FZ.close(false); PD.close(false); View.close(false);
      const el = document.getElementById('showroom');
      if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
      return;
    }
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
  const darkZones = $$('.biz, .foot');
  let lastY = window.scrollY, raf = 0;
  function updateBar() {
    if (!bar) return;
    const vh = window.innerHeight;
    // над чёрной полосой «Для бизнеса» плашка тоже чёрная (как шапка) — без белой полосы поперёк
    const by = vh - bar.offsetHeight / 2;
    bar.classList.toggle('is-dark', darkZones.some((el) => { const r = el.getBoundingClientRect(); return r.top < by && r.bottom > by; }));
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
      // над чёрной полосой «Для бизнеса» и подвалом шапка тоже чёрная — без белой полосы поперёк: чёрная, как только полоса
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
