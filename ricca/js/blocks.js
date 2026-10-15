/* RICCA DESIGNS — новые блоки главной (ruсская и английская страницы). Только добавляет: существующие разделы не трогает.
   Тексты и фото — js/content-data.js (window.RICCA_CONTENT), состав моделей — js/composition-data.js (window.RICCA_COMPOSITION).
   Каждый блок — пустой <section data-block="…" hidden> в разметке; скрипт заполняет его и показывает, только если в данных
   не осталось [ПЛЕЙСХОЛДЕРОВ] и есть фото. Квиз, таблица тканей и «Влезет ли» работают сразу.
   Ссылки WhatsApp — wa.me/<номер>?text=<готовый текст>. Движение уважает prefers-reduced-motion. Без библиотек. */
(() => {
  'use strict';
  const C = window.RICCA_CONTENT;
  if (!C) return;
  const root = document.documentElement;
  const lang = root.lang === 'en' ? 'en' : 'ru';
  const D = C[lang] || C.ru;
  const FIT = C.fit || {};
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  /* типографика: неразрывный пробел после коротких слов и перед тире (как в остальном сайте) */
  const typo = (t) => {
    let h = esc(t).replace(/ — /g, '&nbsp;— ').replace(/ → /g, '&nbsp;→ ');
    if (lang === 'ru') for (let k = 0; k < 2; k++) h = h.replace(/(^|[\s(«])([а-яёА-ЯЁ]{1,2}|[0-9]{1,3}) /g, '$1$2&nbsp;');
    else h = h.replace(/(^|\s)(a|an|the|to|of|in|on|at|by|or|and|for) /gi, '$1$2&nbsp;');
    return h;
  };
  const tpl = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] !== undefined ? o[k] : m));
  const PH = /\[[^\]]*\]/;
  /* заполнено: нет [скобок] ни в одной строке; пустая строка допустима только там, где поле необязательное (photo в отзыве) */
  const filled = (v) => {
    if (v == null) return true;
    if (typeof v === 'string') return !PH.test(v);
    if (Array.isArray(v)) return v.every(filled);
    if (typeof v === 'object') return Object.values(v).every(filled);
    return true;
  };
  const hasSrc = (p) => !!(p && typeof p.src === 'string' && p.src.trim() && !PH.test(p.src));
  const waHref = (text) => `https://wa.me/${C.wa}?text=${encodeURIComponent(text)}`;
  const cfgHref = lang === 'en' ? '/en/configurator' : 'configurator.html';
  const T = (ru, en) => (lang === 'en' ? en : ru);

  /* тонкие линейные иконки 32 × 32 — в духе иконок сайта (stroke 1.3) */
  const ICONS = {
    ruler: '<path d="M4 21 21 4l7 7-17 17z"/><path d="m9 16 2 2M12 13l3 3M15 10l2 2M18 7l3 3"/>',
    cube: '<path d="M16 4 27 10v12l-11 6-11-6V10z"/><path d="M5 10l11 6 11-6M16 16v12"/>',
    swatch: '<rect x="5" y="5" width="9" height="22" rx="1"/><path d="M14 11l7-4 5 9-12 7"/><circle cx="9.5" cy="22" r="1.4"/>',
    needle: '<path d="M26 6 8 24l-2 2"/><path d="M23 5l4 4"/><path d="M6 12c3-1 6 1 6 4s-3 5-6 4"/>',
    shield: '<path d="M16 4 26 8v7c0 6.5-4.3 11-10 13-5.7-2-10-6.5-10-13V8z"/><path d="m11.5 16 3.2 3.2 6-6.4"/>',
    drawing: '<rect x="5" y="5" width="22" height="22"/><path d="M9 21h14M9 21v-6h9v6M9 11h5"/><path d="M5 27l4-4"/>',
    camera: '<path d="M5 10h5l2-3h8l2 3h5v15H5z"/><circle cx="16" cy="17" r="4.5"/>',
    check: '<circle cx="16" cy="16" r="11"/><path d="m11 16.5 3.4 3.4L21.5 13"/>'
  };
  const ico = (k, cls = 'nb-ico') => `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true" focusable="false">${ICONS[k] || ''}</svg>`;
  const use = (id, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const slot = (name) => $(`[data-block="${name}"]`);
  const head = (id, d, extra = '') => `<header class="nb__head rv"><p class="nb__eye">${esc(d.eye)}</p><h2 class="title nb__title" id="${id}">${typo(d.title)}</h2>${d.lead ? `<p class="nb__lead">${typo(d.lead)}</p>` : ''}${extra}</header>`;

  /* появление при прокрутке — как у разделов сайта (.rv / .is-pre из css/site.css) */
  const io = ('IntersectionObserver' in window && !reduce) ? new IntersectionObserver((es) => {
    es.filter((e) => e.isIntersecting).forEach((e, i) => { io.unobserve(e.target); e.target.style.transitionDelay = i ? `${i * 90}ms` : ''; e.target.classList.remove('is-pre'); });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
  const reveal = (el) => { if (!io) return; $$('.rv', el).forEach((r) => { if (r.getBoundingClientRect().top > window.innerHeight) { r.classList.add('is-pre'); io.observe(r); } }); };
  function mount(name, html) {
    const el = slot(name);
    if (!el) return null;
    el.innerHTML = html;
    el.hidden = false;
    reveal(el);
    return el;
  }

  /* ═════════ Цифры доверия ═════════ */
  (() => {
    const d = D.trust;
    if (!d || !filled(d)) return;
    mount('trust', `<div class="wrap"><h2 class="sr-only" id="trust-h">${T('RICCA в цифрах', 'RICCA in numbers')}</h2>
      <dl class="nb-trust">${d.items.map((i) => `<div class="rv"><dt>${typo(i.t)}</dt><dd>${esc(i.n)}</dd></div>`).join('')}</dl></div>`);
  })();

  /* ═════════ Квиз «Подобрать диван» ═════════ */
  (() => {
    const d = D.quiz;
    if (!d) return;
    const el = mount('quiz', `<div class="wrap nb-quiz">${head('quiz-h', d)}<div class="nb-quiz__card rv" data-quiz aria-live="polite"></div></div>`);
    if (!el) return;
    const card = $('[data-quiz]', el);
    const n = d.steps.length;
    let step = 0;
    const ans = d.steps.map(() => []);
    const answersText = () => d.steps.map((s, i) => `${d.labels[i]} — ${ans[i].map((a) => (lang === 'ru' ? a.toLowerCase() : a)).join(', ')}`).join('; ');
    function paint(focus) {
      const done = step >= n;
      const bar = `<div class="nb-quiz__bar" aria-hidden="true">${d.steps.map((s, i) => `<span class="${i < step || done ? 'is-on' : i === step ? 'is-cur' : ''}"></span>`).join('')}</div>`;
      if (done) {
        card.innerHTML = `${bar}<p class="label nb-quiz__n">${esc(d.doneTitle)}</p>
          <h3 class="nb-quiz__q" tabindex="-1">${typo(d.doneText)}</h3>
          <dl class="nb-quiz__sum">${d.steps.map((s, i) => `<div><dt>${esc(d.labels[i])}</dt><dd>${esc(ans[i].join(', '))}</dd></div>`).join('')}</dl>
          <div class="nb-quiz__nav"><a class="btn btn--fill" href="${esc(waHref(tpl(d.wa, { answers: answersText() })))}" target="_blank" rel="noopener">${use('i-whatsapp')}${esc(d.send)}</a>
          <button class="caps-link" type="button" data-q-again>${esc(d.again)}</button></div>`;
      } else {
        const s = d.steps[step];
        card.innerHTML = `${bar}<p class="label nb-quiz__n">${esc(tpl(d.step, { n: step + 1, total: n }))}</p>
          <h3 class="nb-quiz__q" id="quiz-q" tabindex="-1">${typo(s.q)}</h3>${s.hint ? `<p class="nb-quiz__hint">${esc(s.hint)}</p>` : ''}
          <div class="nb-quiz__opts" role="group" aria-labelledby="quiz-q">${s.options.map((o) => `<button class="nb-opt" type="button" aria-pressed="${ans[step].includes(o)}" data-q-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div>
          <div class="nb-quiz__nav"><button class="btn btn--fill" type="button" data-q-next${ans[step].length ? '' : ' disabled'}>${esc(d.next)}${use('i-arrow')}</button>
          ${step ? `<button class="caps-link" type="button" data-q-back>${esc(d.back)}</button>` : ''}</div>`;
      }
      if (focus) { const q = $('.nb-quiz__q', card); if (q) q.focus({ preventScroll: true }); }
    }
    card.addEventListener('click', (e) => {
      const o = e.target.closest('[data-q-opt]');
      if (o) {
        const v = o.dataset.qOpt, s = d.steps[step], a = ans[step];
        if (s.multi) { const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); }
        else { a.length = 0; a.push(v); }
        paint(false);
        const again = $(`[data-q-opt="${CSS.escape(v)}"]`, card); if (again) again.focus({ preventScroll: true });
        if (!s.multi) setTimeout(() => { if (ans[step] && ans[step].length && ans[step][0] === v && !d.steps[step].multi) { step++; paint(true); } }, reduce ? 0 : 260);
        return;
      }
      if (e.target.closest('[data-q-next]')) { if (ans[step].length) { step++; paint(true); } return; }
      if (e.target.closest('[data-q-back]')) { step = Math.max(0, step - 1); paint(true); return; }
      if (e.target.closest('[data-q-again]')) { step = 0; ans.forEach((a) => { a.length = 0; }); paint(true); }
    });
    paint(false);
  })();

  /* ═════════ Работы: задача → решение, галерея ═════════ */
  let openGallery = null;
  (() => {
    const d = D.cases;
    if (!d) return;
    const items = (d.items || []).filter((it) => filled(it) && (it.photos || []).length && it.photos.every(hasSrc));
    if (items.length < (d.minItems || 1)) return;
    const el = mount('cases', `<div class="wrap">${head('cases-h', d)}
      <ul class="nb-cases" role="list">${items.map((it, i) => {
        const p = it.photos[0];
        return `<li class="nb-case rv"><button class="nb-case__a" type="button" data-case="${i}" aria-label="${esc(d.open)}: ${esc(it.title)}">
          <span class="nb-case__img"><img src="${esc(p.src)}" width="${p.w || 1200}" height="${p.h || 900}" alt="${esc(p.alt || it.title)}" loading="lazy" decoding="async"></span>
          <span class="label nb-case__type">${esc(it.type)}</span><span class="nb-case__t">${typo(it.title)}</span><span class="nb-case__p">${typo(it.story)}</span></button>
          <a class="caps-link nb-case__want" href="${esc(waHref(tpl(d.wa, { title: it.title })))}" target="_blank" rel="noopener">${esc(d.want)}${use('i-arrow')}</a></li>`;
      }).join('')}</ul></div>`);
    if (!el) return;
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-case]'); if (b) openGallery(items[+b.dataset.case], d, b); });
  })();
  /* окно галереи — те же классы, что у окна работы (.lb), своё поведение */
  openGallery = (it, d, opener) => {
    let dlg = $('#nb-gallery');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'lb nb-lb'; dlg.id = 'nb-gallery'; dlg.setAttribute('aria-labelledby', 'nb-lb-t');
      dlg.innerHTML = `<button class="icon-btn lb__close" type="button" data-nb-close aria-label="${T('Закрыть', 'Close')}">${use('i-close')}</button>
        <div class="lb__in"><div class="lb__stage"><div class="lb__frame"><img data-nb-img alt="" width="1200" height="900"></div>
        <button class="pd__arrow pd__arrow--prev" type="button" data-nb-step="-1" aria-label="${T('Предыдущее фото', 'Previous photo')}">${use('i-chev-l')}</button>
        <button class="pd__arrow pd__arrow--next" type="button" data-nb-step="1" aria-label="${T('Следующее фото', 'Next photo')}">${use('i-chev-r')}</button></div>
        <div class="lb__bar"><div class="lb__cap"><h2 class="lb__title" id="nb-lb-t" tabindex="-1"></h2><p class="lb__piece" data-nb-sub></p><p class="lb__count" data-nb-count aria-live="polite"></p></div>
        <div class="lb__acts"><a class="btn btn--fill" data-nb-wa target="_blank" rel="noopener">${use('i-whatsapp')}<span data-nb-wa-t></span></a></div></div></div>`;
      document.body.appendChild(dlg);
      const close = () => { dlg.classList.remove('is-in'); setTimeout(() => { if (dlg.open) dlg.close(); root.classList.toggle('is-locked', !!$('dialog[open]')); if (dlg._opener) dlg._opener.focus({ preventScroll: true }); }, reduce ? 0 : 320); };
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg || e.target.closest('[data-nb-close]')) { close(); return; }
        const s = e.target.closest('[data-nb-step]'); if (s) dlg._go(+s.dataset.nbStep);
      });
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
      dlg.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') dlg._go(1); if (e.key === 'ArrowLeft') dlg._go(-1); });
      let x0 = null;
      dlg.addEventListener('pointerdown', (e) => { if (e.target.closest('.lb__frame')) x0 = e.clientX; });
      dlg.addEventListener('pointerup', (e) => { if (x0 != null && Math.abs(e.clientX - x0) > 40) dlg._go(e.clientX < x0 ? 1 : -1); x0 = null; });
    }
    let idx = 0;
    const ph = it.photos;
    const img = $('[data-nb-img]', dlg);
    dlg._go = (k) => { if (ph.length < 2) return; idx = (idx + k + ph.length) % ph.length; paint(); };
    function paint() {
      const p = ph[idx];
      img.src = p.src; img.width = p.w || 1200; img.height = p.h || 900; img.alt = p.alt || it.title;
      $('[data-nb-count]', dlg).textContent = ph.length > 1 ? `${idx + 1} / ${ph.length}` : '';
      const nxt = ph[(idx + 1) % ph.length]; if (nxt) new Image().src = nxt.src;
    }
    $('#nb-lb-t', dlg).innerHTML = typo(it.title);
    $('[data-nb-sub]', dlg).innerHTML = `${esc(it.type)} · ${typo(it.story)}`;
    $('[data-nb-wa]', dlg).href = waHref(tpl(d.wa, { title: it.title }));
    $('[data-nb-wa-t]', dlg).textContent = d.want;
    $$('[data-nb-step]', dlg).forEach((b) => { b.hidden = ph.length < 2; });
    paint();
    dlg._opener = opener;
    dlg.showModal();
    root.classList.add('is-locked');
    requestAnimationFrame(() => requestAnimationFrame(() => dlg.classList.add('is-in')));
    $('#nb-lb-t', dlg).focus({ preventScroll: true });
  };

  /* ═════════ Почему RICCA ═════════ */
  (() => {
    const d = D.why;
    if (!d || !filled(d)) return;
    mount('why', `<div class="wrap">${head('why-h', d)}
      <ul class="nb-why" role="list">${d.items.map((it) => {
        const inner = `${ico(it.icon)}<span class="nb-why__t">${typo(it.t)}</span><span class="nb-why__p">${typo(it.p)}</span>`;
        return `<li class="rv">${it.href ? `<a class="nb-why__c nb-why__c--link" href="${esc(it.href === 'configurator.html' ? cfgHref : it.href)}">${inner}${use('i-arrow', 'ico nb-why__go')}</a>` : `<div class="nb-why__c">${inner}</div>`}</li>`;
      }).join('')}</ul>
      <p class="nb__cta rv"><a class="btn btn--line" href="${esc(waHref(d.wa))}" target="_blank" rel="noopener">${use('i-whatsapp')}${esc(d.cta)}</a></p></div>`);
  })();

  /* ═════════ Что внутри ═════════ */
  (() => {
    const d = D.inside;
    if (!d || !filled(d) || !hasSrc(d.image)) return;
    mount('inside', `<div class="wrap nb-in">${head('inside-h', d)}
      <figure class="nb-in__fig rv"><img src="${esc(d.image.src)}" width="${d.image.w}" height="${d.image.h}" alt="${esc(d.image.alt)}" loading="lazy" decoding="async"><figcaption class="label">${esc(d.caption)}</figcaption></figure>
      <dl class="nb-in__rows rv">${d.rows.map((r) => `<div><dt>${esc(r.k)}</dt><dd><span class="nb-in__v">${typo(r.v)}</span><span class="nb-in__b">${typo(r.b)}</span></dd></div>`).join('')}</dl></div>`);
  })();

  /* ═════════ Какую ткань выбрать (работает сразу) ═════════ */
  (() => {
    const d = D.fabrics;
    if (!d) return;
    const mark = (k) => `<span class="nb-mark nb-mark--${k}" aria-hidden="true"></span><span class="sr-only">${esc(d.legend[k])}: </span>`;
    const fabHref = lang === 'en' ? d.href : d.href;
    mount('fabrics', `<div class="wrap">${head('fabrics-h', d)}
      <p class="nb-fab__legend rv">${['ok', 'warn', 'no'].map((k) => `<span>${mark(k).replace(' aria-hidden="true"', ' aria-hidden="true"')}${esc(d.legend[k])}</span>`).join('')}</p>
      <div class="nb-fab__wrap rv"><table class="nb-fab">
        <thead><tr><th scope="col"><span class="sr-only">${T('Ткань', 'Fabric')}</span></th>${d.cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${d.rows.map((r) => `<tr><th scope="row"><span class="nb-fab__n">${esc(r.name)}</span><span class="nb-fab__note">${typo(r.note)}</span></th>${r.cells.map((c, i) => `<td data-col="${esc(d.cols[i])}">${mark(c[0])}<span class="nb-fab__c">${typo(c[1])}</span></td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
      <p class="nb__cta rv"><a class="caps-link" href="${esc(fabHref)}">${esc(d.all)}${use('i-arrow')}</a></p></div>`);
  })();

  /* ═════════ Влезет ли? (работает сразу) ═════════ */
  (() => {
    const d = D.fit;
    if (!d) return;
    const el = mount('fit', `<div class="wrap">${head('fit-h', d)}
      <div class="nb-fit">
        <form class="nb-fit__form rv" novalidate>
          <label class="nb-fit__f"><span class="label">${esc(d.width)}</span><input class="fld" id="fit-w" name="w" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" placeholder="${T('например, 320', 'e.g. 320')}"></label>
          <label class="nb-fit__f"><span class="label">${esc(d.depth)}</span><input class="fld" id="fit-d" name="d" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" placeholder="${T('например, 260', 'e.g. 260')}"><small class="nb-fit__hint">${typo(d.depthHint)}</small></label>
          <div class="nb-fit__mode" role="radiogroup" aria-label="${T('Где стоит диван', 'Where the sofa stands')}">
            <button type="button" role="radio" aria-checked="true" data-fit-mode="between">${esc(d.modes.between)}</button>
            <button type="button" role="radio" aria-checked="false" data-fit-mode="open">${esc(d.modes.open)}</button>
          </div>
        </form>
        <div class="nb-fit__res rv is-empty" data-fit-res>
          <dl class="nb-fit__dl" aria-live="polite">
            <div><dt>${esc(d.len)}</dt><dd data-fit="len">—</dd></div>
            <div><dt>${esc(d.shape)}</dt><dd data-fit="shape">—</dd></div>
            <div><dt>${esc(d.seats)}</dt><dd data-fit="seats">—</dd></div>
            <div><dt>${esc(d.depthR)}</dt><dd data-fit="depth">—</dd></div>
          </dl>
          <p class="nb-fit__note" data-fit="note">${esc(d.empty)}</p>
          <div class="nb-fit__acts">
            <a class="btn btn--fill" data-fit-3d href="${esc(cfgHref)}" aria-disabled="true">${esc(d.btn3d)}</a>
            <a class="btn btn--line" data-fit-wa href="${esc(waHref(tpl(d.wa, { w: '…', d: '…' })))}" target="_blank" rel="noopener" aria-disabled="true">${use('i-whatsapp')}${esc(d.btnWa)}</a>
          </div>
        </div>
      </div>
      <p class="nb-fit__fine rv">${typo(d.note)}</p></div>`);
    if (!el) return;
    const wIn = $('#fit-w', el), dIn = $('#fit-d', el), res = $('[data-fit-res]', el);
    const out = (k) => $(`[data-fit="${k}"]`, el);
    const b3d = $('[data-fit-3d]', el), bwa = $('[data-fit-wa]', el);
    let mode = 'between';
    const num = (inp) => { const v = parseInt(String(inp.value).replace(/\D/g, ''), 10); return Number.isFinite(v) ? v : 0; };
    const set = (k, v) => { const o = out(k); if (o.textContent !== v) { o.textContent = v; if (!reduce) { o.classList.remove('is-tick'); void o.offsetWidth; o.classList.add('is-tick'); } } };
    function calc() {
      const w = num(wIn), dp = num(dIn), min = FIT.minInput || 100;
      const ok = w >= min && dp >= min;
      res.classList.toggle('is-empty', !ok);
      [b3d, bwa].forEach((b) => b.setAttribute('aria-disabled', String(!ok)));
      if (!ok) {
        ['len', 'shape', 'seats', 'depth'].forEach((k) => set(k, '—'));
        set('note', d.empty);
        return;
      }
      const L = w - (mode === 'between' ? FIT.gapBetween : FIT.gapOpen);
      const G = Math.min(FIT.depthMax, Math.max(FIT.depthMin, dp - FIT.aisle));
      const N = Math.max(1, Math.floor((L - FIT.armsTotal) / FIT.seatWidth));
      let shape = 'straight', side = 0;
      if (dp >= FIT.cornerRoomDepth && w >= FIT.cornerWallWidth) { shape = 'both'; side = dp - FIT.cornerSideGap; }
      else if (dp < FIT.shallowRoomDepth) shape = 'shallow';
      else if (w < FIT.smallWallWidth) shape = 'small';
      const aisle = dp - G;
      set('len', tpl(d.upTo, { n: L }));
      set('shape', d.shapes[shape] + (side ? '' : ''));
      set('seats', String(N));
      set('depth', tpl(d.upTo, { n: G }));
      const note = (aisle < FIT.aisleTight ? tpl(d.aisleTight, { n: aisle }) : aisle >= FIT.aisleWide ? tpl(d.aisleWide, { n: aisle }) : tpl(d.aisleOk, { n: aisle }))
        + (side ? ` ${tpl(d.corner, { n: side })}.` : '');
      set('note', note);
      const q = new URLSearchParams({ len: String(L), depth: String(G), shape: shape === 'both' ? 'corner' : 'straight' });
      if (side) q.set('side', String(side));
      b3d.href = `${cfgHref}?${q}`;
      bwa.href = waHref(tpl(d.wa, { w, d: dp }));
    }
    [wIn, dIn].forEach((inp) => inp.addEventListener('input', () => { const c = inp.value.replace(/\D/g, '').slice(0, 4); if (c !== inp.value) inp.value = c; calc(); }));
    el.addEventListener('click', (e) => {
      const m = e.target.closest('[data-fit-mode]');
      if (m) { mode = m.dataset.fitMode; $$('[data-fit-mode]', el).forEach((b) => b.setAttribute('aria-checked', String(b === m))); calc(); return; }
      const off = e.target.closest('[aria-disabled="true"]');
      if (off && off.closest('.nb-fit__acts')) { e.preventDefault(); (num(wIn) < (FIT.minInput || 100) ? wIn : dIn).focus(); }
    });
    $('.nb-fit__mode', el).addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const bs = $$('[data-fit-mode]', el), i = bs.findIndex((b) => b.getAttribute('aria-checked') === 'true');
      const nb = bs[(i + 1) % bs.length]; nb.click(); nb.focus();
    });
    $('.nb-fit__form', el).addEventListener('submit', (e) => e.preventDefault());
    calc();
  })();

  /* ═════════ Без риска ═════════ */
  (() => {
    const d = D.norisk;
    if (!d || !filled(d)) return;
    mount('norisk', `<div class="wrap">${head('norisk-h', d)}
      <ul class="nb-nr" role="list">${d.items.map((it) => `<li class="rv">${ico(it.icon)}<span>${typo(it.t)}</span></li>`).join('')}</ul>
      <p class="nb__cta rv"><a class="btn btn--fill nb-nr__btn" href="${esc(waHref(d.wa))}" target="_blank" rel="noopener">${use('i-whatsapp')}<span>${typo(d.btn)}</span></a></p></div>`);
  })();

  /* ═════════ Основатель ═════════ */
  (() => {
    const d = D.founder;
    if (!d || !filled(d) || !hasSrc(d.photo)) return;
    mount('founder', `<div class="wrap nb-fd">
      <figure class="nb-fd__pic rv"><img src="${esc(d.photo.src)}" width="${d.photo.w}" height="${d.photo.h}" alt="${esc(d.photo.alt)}" loading="lazy" decoding="async"></figure>
      <div class="nb-fd__txt rv"><p class="nb__eye">${esc(d.eye)}</p><h2 class="sr-only" id="founder-h">${esc(d.sign)}</h2>
        ${d.text.map((t) => `<p class="nb-fd__p">${typo(t)}</p>`).join('')}
        <p class="nb-fd__sign">${typo(d.sign)}</p></div></div>`);
  })();

  /* ═════════ Отзывы (только настоящие, из 2ГИС) ═════════ */
  (() => {
    const d = D.reviews;
    if (!d || !filled([d.rating, d.count, d.link, d.title])) return;
    const items = (d.items || []).filter((r) => filled([r.name, r.date, r.stars, r.text]) && (!r.photo || hasSrc({ src: r.photo })));
    if (items.length < (d.minItems || 1)) return;
    const stars = (n) => { const k = Math.max(0, Math.min(5, Math.round(parseFloat(String(n).replace(',', '.')) || 0))); return `<span class="nb-stars" aria-label="${T(`Оценка ${k} из 5`, `Rated ${k} out of 5`)}">${'★'.repeat(k)}<span>${'★'.repeat(5 - k)}</span></span>`; };
    mount('reviews', `<div class="wrap">${head('reviews-h', d, `<p class="nb-rev__sum"><span class="nb-rev__score">${esc(d.rating)}</span>${stars(d.rating)}<span class="nb-rev__count">${esc(d.count)} ${esc(d.countLabel)}</span></p>`)}
      <ul class="nb-rev" role="list">${items.map((r) => `<li class="nb-rev__c rv">${stars(r.stars)}<p class="nb-rev__t">${typo(r.text)}</p>
        ${r.photo ? `<img class="nb-rev__ph" src="${esc(r.photo)}" width="240" height="240" alt="" loading="lazy" decoding="async">` : ''}
        <p class="nb-rev__who"><span>${esc(r.name)}</span><span class="nb-rev__date">${esc(r.date)}</span></p></li>`).join('')}</ul>
      <p class="nb__cta rv"><a class="caps-link" href="${esc(d.link)}" target="_blank" rel="noopener">${esc(d.all)}${use('i-arrow-ne')}<span class="sr-only"> ${T('(откроется в новой вкладке)', '(opens in a new tab)')}</span></a></p></div>`);
  })();

  /* ═════════ Для бизнеса: кейс ═════════ */
  (() => {
    const d = D.bizCase;
    if (!d || !filled(d) || !(d.photos || []).length || !d.photos.every(hasSrc)) return;
    const el = slot('bizCase');
    if (!el) return;
    el.innerHTML = `<h3 class="label biz__label">${esc(d.label)}</h3><p class="biz__pro-head">${typo(d.object)}</p>
      <div class="biz__side"><dl class="nb-bc">${d.rows.map((r) => `<div><dt>${esc(r.k)}</dt><dd>${typo(r.v)}</dd></div>`).join('')}</dl></div>
      <ul class="nb-bc__ph" role="list">${d.photos.map((p) => `<li><img src="${esc(p.src)}" width="${p.w || 1200}" height="${p.h || 900}" alt="${esc(p.alt || '')}" loading="lazy" decoding="async"></li>`).join('')}</ul>`;
    el.hidden = false;
  })();

  /* ═════════ Ателье: видео под текстом ═════════ */
  (() => {
    const d = D.atelierVideo;
    if (!d || !hasSrc(d) || !d.poster || PH.test(d.poster)) return;
    const el = slot('atelierVideo');
    if (!el) return;
    el.innerHTML = `<video ${reduce ? 'controls' : 'autoplay'} muted loop playsinline preload="${reduce ? 'none' : 'metadata'}" poster="${esc(d.poster)}" width="${d.w}" height="${d.h}" aria-label="${esc(d.label)}" disablepictureinpicture><source src="${esc(d.src)}" type="video/mp4"></video>`;
    el.hidden = false;
    const v = $('video', el);
    if (!reduce && 'IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }), { threshold: 0.2 }).observe(el);
  })();

  /* ═════════ «Состав» в окне модели (js/composition-data.js). Показываем, только если verified: true ═════════ */
  const COMP = window.RICCA_COMPOSITION;
  window.RICCA_COMPOSITION_UI = (box, modelId) => {
    if (!box) return false;
    box.innerHTML = ''; box.hidden = true;
    if (!COMP) return false;
    const m = (COMP.models || []).find((x) => x.model_id === modelId);
    if (!m || m.verified !== true) return false;
    const base = (COMP.types[m.type] || {})[lang] || (COMP.types[m.type] || {}).ru;
    if (!base) return false;
    /* слои типа + переопределения модели (по имени слоя: замена; новый — добавляется) */
    const layers = base.layers.map((l) => ({ ...l }));
    ((m.layers || {})[lang] || (m.layers || {}).ru || []).forEach((o) => { const i = layers.findIndex((l) => l.key === o.key); if (i >= 0) layers[i] = { ...layers[i], ...o }; else layers.push(o); });
    const L = layers.filter((l) => !l.hidden);
    if (!L.length || !filled(L.map((l) => [l.name, l.benefit || '']))) return false;   // остались [скобки] — не показываем
    const UI = COMP.ui[lang] || COMP.ui.ru;
    const dots = (n) => `<span class="nb-dots" aria-hidden="true">${[1, 2, 3, 4, 5].map((k) => `<i class="${k <= n ? 'is-on' : ''}"></i>`).join('')}</span>`;
    box.innerHTML = `<h3 class="label nb-comp__h">${esc(UI.title)}</h3>
      <div class="nb-comp${reduce ? '' : ' is-pre'}">
        <ol class="nb-comp__stack" aria-hidden="true">${L.map((l, i) => `<li style="--i:${i};--t:${(i / Math.max(1, L.length - 1)).toFixed(3)}"><span></span></li>`).join('')}</ol>
        <ol class="nb-comp__list" role="list">${L.map((l, i) => `<li style="--i:${i};--t:${(i / Math.max(1, L.length - 1)).toFixed(3)}"><span class="nb-comp__n">${typo(l.name)}</span><span class="nb-comp__b">${typo(l.benefit)}</span></li>`).join('')}</ol>
      </div>
      <dl class="nb-comp__scales"><div><dt>${esc(UI.softness)}</dt><dd>${dots(m.softness)}<span class="sr-only">${m.softness} / 5</span></dd></div>
        <div><dt>${esc(UI.seat)}</dt><dd>${dots(m.seat_height)}<span class="nb-comp__ends" aria-hidden="true"><span>${esc(UI.low)}</span><span>${esc(UI.high)}</span></span><span class="sr-only">${m.seat_height} / 5</span></dd></div></dl>`;
    box.hidden = false;
    const c = $('.nb-comp', box);
    if (c.classList.contains('is-pre')) requestAnimationFrame(() => requestAnimationFrame(() => c.classList.remove('is-pre')));
    return true;
  };

  /* ═════════ Английская страница: ссылки на конструктор ведут в английский конструктор (/en/configurator) ═════════ */
  if (lang === 'en') {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="configurator.html"]');
      if (!a) return;
      a.setAttribute('href', a.getAttribute('href').replace(/^configurator\.html/, '/en/configurator'));
    }, true);
  }
})();
