/*! © 2026 ELUNA · RICCA DESIGNS, Алматы. Все права защищены. Копирование без письменного разрешения запрещено. */
/* ==========================================================================
   ELUNA — страница товара (product.html)
   Модель берётся из ?model=air|balance|prime|royal (по умолчанию prime).
   Блоки: звёзды · данные модели · заказ (размер, количество, город → WhatsApp,
   общий с главной localStorage) · просмотр (Фото / Слои / 3D / AR) ·
   «Больше о матрасе» (разрез, материалы, жёсткость, размеры + чертёж SVG) ·
   другие модели · загрузки · форма вопроса · липкая панель · JSON-LD.
   3D и QR подгружаются только по клику на вкладку — страница лёгкая.
   ========================================================================== */
(function () {
  'use strict';

  const C = window.ELUNA_CATALOG;
  if (!C) return;
  const { MODELS, KINDS, CITIES, DELIVERY, SIZE_LIMITS, INSTALLMENT_MONTHS, CUSTOM_DAYS, PER_M2, WHATSAPP, fmtMoney, waLink, priceOf, discountPct } = C;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (matchMedia('(pointer: coarse)').matches && innerWidth < 900);
  const MV_SRC = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
  const QR_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';

  /* ---------- модель из адреса ------------------------------------------ */
  const params = new URLSearchParams(location.search);
  const key = MODELS[params.get('model')] ? params.get('model') : 'prime';
  const M = MODELS[key];
  const LAYERS = M.layers || MODELS.prime.layers;   // Royal: разрез показываем на базе Prime
  const sizeText = (o) => `${o.w} × ${o.h} мм`;
  const days = (n) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'день' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'дня' : 'дней'}`;

  /* ---------- звёзды: один статичный кадр -------------------------------- */
  (function stars() {
    const cv = $('stars'); if (!cv) return;
    const draw = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
      const g = cv.getContext('2d'); g.scale(dpr, dpr);
      let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const n = Math.round((innerWidth * innerHeight) / 3800);
      for (let i = 0; i < n; i++) {
        const x = rnd() * innerWidth, y = rnd() * innerHeight, r = rnd() < .9 ? rnd() * .8 + .2 : rnd() * 1.4 + .8;
        const warm = rnd() < .3;
        g.fillStyle = `rgba(${warm ? '255,243,226' : '196,208,255'},${(.25 + rnd() * .6).toFixed(2)})`;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    };
    draw(); let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 200); });
  })();

  /* ---------- тексты модели --------------------------------------------- */
  (function fillModel() {
    document.title = `Матрас ${M.name} — цена, слои, 3D и AR — ELUNA`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = `Матрас ${M.name} от ELUNA · RICCA DESIGNS, Алматы. ${M.who}. ${M.layers ? `${M.layers.length} слоёв, ` : ''}ручная сборка. Посмотрите в 3D и поставьте в свою спальню через AR в натуральную величину. Доставка по Казахстану, рассрочка 0 %.`;
    const og = document.querySelector('meta[property="og:title"]'); if (og) og.content = `Матрас ${M.name} — ELUNA`;
    ['crumbModel', 'capName', 'eyeName', 'titleName'].forEach((id) => { const el = $(id); if (el) el.textContent = M.name; });
    ['capHeight', 'eyeHeight'].forEach((id) => { const el = $(id); if (el) el.textContent = M.height; });
    $('titleSlogan').textContent = M.slogan;
    $('pdWho').textContent = M.who;
    document.querySelectorAll('#mswitch a').forEach((a) => { if (a.dataset.m === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const meter = `<span class="lm" aria-hidden="true">${[1, 2, 3, 4].map((k) => `<i${k <= M.lvl ? ' class="on"' : ''}></i>`).join('')}</span>`;
    $('pdTier').innerHTML = `<span class="tier" data-lvl="${M.lvl}"><span>${esc(M.tier)}</span>${meter}</span>`;
    // цена «от» за базовый размер
    const base = C.PRICES[key], old = C.OLD_PRICES[key];
    $('pdPrice').innerHTML = base == null ? '— ₸' : old
      ? `<s class="price-old">${fmtMoney(old)} ₸</s><span class="price-new">${fmtMoney(base)} ₸</span><span class="save">−${discountPct(key)} %</span>`
      : `${fmtMoney(base)} ₸`;
    // загрузки
    ['dlGlb', 'dlGlbPro'].forEach((id) => { const a = $(id); if (a) { a.href = `models/eluna-${key}.glb`; a.download = `eluna-${key}.glb`; } });
    $('customHint').textContent = `Свой размер собираем вручную под вашу кровать — ${days(CUSTOM_DAYS)}. Цена — по площади: ±${fmtMoney(PER_M2)} ₸ за каждый м² от 1600 × 2000.`;
    const d18 = priceOf({ model: key, w: 1800, h: 2000 }), d16 = priceOf({ model: key, w: 1600, h: 2000 });
    if ($('d1800') && d18.v != null && d16.v != null) $('d1800').textContent = `+${fmtMoney(d18.v - d16.v)} ₸`;
  })();

  let dimsSvg = '';   // текущий чертёж (SVG) — для показа и скачивания

  /* ---------- заказ: размер · количество · город → WhatsApp -------------- */
  const order = (function orderFlow() {
    const KEY = 'eluna-order-v1';
    const clampN = (v, a, b) => Math.min(b, Math.max(a, Math.round(v / 10) * 10 || a));
    let o = { model: key, w: 1600, h: 2000, custom: false, city: '', qty: 1 };
    try { const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved) { o = Object.assign(o, saved, { model: key }); } } catch (e) { /* без хранилища */ }
    o.qty = Math.min(10, Math.max(1, +o.qty || 1));
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* приватный режим */ } };

    const cityText = (c) => (!c ? 'город не выбран' : c === 'Алматы' ? 'Алматы — привезём и установим сами' : `${c} — ${DELIVERY[c] || DELIVERY.default} до двери`);
    function message(extra) {
      const p = priceOf(o);
      const lines = [
        'Здравствуйте! Хочу заказать матрас ELUNA.',
        `Модель: ${M.name}`,
        `Размер: ${sizeText(o)}${o.custom ? ` (свой размер, изготовление ${days(CUSTOM_DAYS)})` : ''}`,
        `Количество: ${o.qty} шт`,
        `Цена: ${p.v == null ? 'уточнить' : `${fmtMoney(p.v * o.qty)} ₸`}${p.o ? ` (без скидки ${fmtMoney(p.o * o.qty)} ₸, −${discountPct(key)} %)` : ''}`,
        `Доставка: ${cityText(o.city)}`,
      ];
      if (extra) {
        if (extra.name) lines.push(`Имя: ${extra.name}`);
        if (extra.note) lines.push(`Вопрос: ${extra.note}`);
      }
      return lines.join('\n');
    }

    // город
    const sel = $('citySel');
    CITIES.forEach((c) => { const op = document.createElement('option'); op.value = c; op.textContent = c; sel.appendChild(op); });
    sel.value = CITIES.includes(o.city) ? o.city : '';
    sel.addEventListener('change', () => update({ city: sel.value }));

    const chips = Array.from(document.querySelectorAll('#sizeOpts .chip'));
    const custom = $('custom');
    const rW = $('cw'), rH = $('ch'), nW = $('cwn'), nH = $('chn');
    const pr = (n) => (n == null ? '—' : `${fmtMoney(n)} ₸`);

    function render() {
      const p = priceOf(o), total = p.v == null ? null : p.v * o.qty, oldTotal = p.o == null ? null : p.o * o.qty;
      chips.forEach((b) => b.setAttribute('aria-checked', (b.hasAttribute('data-custom') ? o.custom : !o.custom && +b.dataset.w === o.w && +b.dataset.h === o.h) ? 'true' : 'false'));
      custom.hidden = !o.custom;
      if (o.custom) { rW.value = nW.value = o.w; rH.value = nH.value = o.h; }
      $('sizeNow').textContent = sizeText(o) + (o.custom ? ' · свой' : '');
      $('qtyOut').value = o.qty;
      $('qtyNote').textContent = `${o.qty} ${o.qty === 1 ? 'матрас' : o.qty < 5 ? 'матраса' : 'матрасов'}`;
      $('cityDays').innerHTML = !o.city
        ? 'Мы в Алматы: по городу привезём и установим сами. В остальные города — <b>от 7 дней</b> до двери.'
        : o.city === 'Алматы' ? '<b>Алматы</b> — мы здесь: привезём и установим сами, день и время согласуем в чате.'
        : `<b>${esc(o.city)}</b> — ${esc(DELIVERY[o.city] || DELIVERY.default)} до двери, доставка до спальни включена.`;
      $('sumText').textContent = `${M.name} · ${sizeText(o)} · ${o.qty} шт${o.city ? ` · ${o.city}` : ''}`;
      $('sumPrice').innerHTML = total == null ? '—' : `${oldTotal ? `<s>${fmtMoney(oldTotal)}</s>` : ''}${fmtMoney(total)} ₸`;
      $('sumMonthly').innerHTML = `Рассрочка 0 % на ${INSTALLMENT_MONTHS} месяцев — <b>${total == null ? '—' : fmtMoney(total / INSTALLMENT_MONTHS)}</b> ₸ в месяц.`;
      $('waOrder').href = waLink(message());
      $('waAsk').href = waLink(`Здравствуйте! Вопрос по матрасу ${M.name} (${sizeText(o)}): `);
      $('waPro').href = waLink(`Здравствуйте! Нужен расчёт по ${M.name} для проекта: размеры, количество, сроки. `);
      $('buybarPrice').innerHTML = `${pr(total)}<small id="buybarNote">${esc(M.name)} · ${sizeText(o)}${o.qty > 1 ? ` · ${o.qty} шт` : ''}</small>`;
      renderSizeTable();
      renderDims(o);
      renderLD(p);
    }
    function update(patch) { Object.assign(o, patch); save(); render(); }

    chips.forEach((b) => b.addEventListener('click', () => {
      if (b.hasAttribute('data-custom')) update({ custom: true });
      else update({ custom: false, w: +b.dataset.w, h: +b.dataset.h });
    }));
    [[rW, 'w', SIZE_LIMITS.w], [rH, 'h', SIZE_LIMITS.h]].forEach(([r, k, lim]) => r.addEventListener('input', () => update({ custom: true, [k]: clampN(+r.value, lim.min, lim.max) })));
    [[nW, 'w', SIZE_LIMITS.w], [nH, 'h', SIZE_LIMITS.h]].forEach(([n, k, lim]) => n.addEventListener('change', () => { n.value = clampN(+n.value, lim.min, lim.max); update({ custom: true, [k]: +n.value }); }));
    $('qtyMinus').addEventListener('click', () => update({ qty: Math.max(1, o.qty - 1) }));
    $('qtyPlus').addEventListener('click', () => update({ qty: Math.min(10, o.qty + 1) }));

    // таблица размеров в «Размеры и цена»
    function renderSizeTable() {
      const box = $('sizeTable'); if (!box) return;
      const row = (w, h, cust, label) => {
        const p = priceOf({ model: key, w, h });
        const on = cust ? o.custom : !o.custom && o.w === w && o.h === h;
        return `<button type="button" class="size-row${on ? ' is-on' : ''}" data-w="${w}" data-h="${h}"${cust ? ' data-custom' : ''}><span>${label}</span><b>${cust ? 'по площади' : p.v == null ? '—' : `${fmtMoney(p.v)} ₸`}</b></button>`;
      };
      box.innerHTML = row(1600, 2000, false, '1600 × 2000 мм') + row(1800, 2000, false, '1800 × 2000 мм') + row(o.custom ? o.w : 1700, o.custom ? o.h : 2000, true, `Свой размер · ${days(CUSTOM_DAYS)}`);
      box.querySelectorAll('.size-row').forEach((b) => b.addEventListener('click', () => {
        if (b.hasAttribute('data-custom')) update({ custom: true }); else update({ custom: false, w: +b.dataset.w, h: +b.dataset.h });
        $('buy').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }));
    }

    // JSON-LD для поиска
    function renderLD(p) {
      const ld = $('ldProduct'); if (!ld) return;
      const url = location.origin + location.pathname + `?model=${key}`;
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Product',
        name: `Матрас ${M.name}`, image: [new URL('img/hero.webp', url).href], description: `${M.slogan} ${M.who}.`,
        brand: { '@type': 'Brand', name: 'ELUNA' }, manufacturer: { '@type': 'Organization', name: 'RICCA DESIGNS', address: { '@type': 'PostalAddress', addressLocality: 'Алматы', addressCountry: 'KZ' } },
        sku: `eluna-${key}`, material: LAYERS.map((l) => l.name).filter((v, i, a) => a.indexOf(v) === i).join(', '),
        offers: { '@type': 'Offer', url, priceCurrency: 'KZT', price: p.v == null ? undefined : priceOf({ model: key, w: 1600, h: 2000 }).v, availability: 'https://schema.org/InStock', itemCondition: 'https://schema.org/NewCondition', warranty: '5 лет', shippingDetails: { '@type': 'OfferShippingDetails', shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'KZ' } } },
      });
    }

    render();
    return { get: () => o, message, update };
  })();

  /* ---------- чертёж размеров (SVG) и скачивание ------------------------- */
  function renderDims(o) {
    const box = $('dimsDraw'); if (!box) return;
    const H = LAYERS.reduce((s, l) => s + l.cm, 0) * 10 + 24;   // мм с чехлом
    const s = 0.05;                                            // 1:20
    const W = o.w * s, L = o.h * s, Hh = H * s;
    const pad = 46, gap = 34, vw = pad * 2 + W, vh = pad + L + gap + Hh + pad + 10;
    const ink = '#f1ede6', ink3 = 'rgba(241,237,230,.55)', gold = '#c8a86b', line = 'rgba(241,237,230,.25)';
    const f = `font-family="Inter, Arial, sans-serif" font-size="9" fill="${ink3}" letter-spacing=".06em"`;
    // разрез: слои пропорционально
    let y = pad + L + gap, cut = '';
    const total = LAYERS.reduce((a, l) => a + l.cm, 0);
    LAYERS.forEach((l) => { const hh = (l.cm / total) * (Hh - 24 * s * 2); cut += `<rect x="${pad}" y="${(y + 12 * s).toFixed(1)}" width="${W.toFixed(1)}" height="${hh.toFixed(2)}" fill="${KINDS[l.kind].color}" fill-opacity=".9"/>`; y += hh; });
    const yc = pad + L + gap;
    dimsSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw.toFixed(0)} ${vh.toFixed(0)}" width="${(vw * 4).toFixed(0)}" height="${(vh * 4).toFixed(0)}">
<rect width="100%" height="100%" fill="#06070c"/>
<text x="${pad}" y="${pad - 24}" ${f} fill="${ink}" font-size="10">ELUNA · ${esc(M.name)} · ${o.w} × ${o.h} × ~${H} мм · масштаб 1:20</text>
<rect x="${pad}" y="${pad}" width="${W.toFixed(1)}" height="${L.toFixed(1)}" fill="none" stroke="${ink}" stroke-width="1"/>
<path d="M${pad + 8} ${pad + 8}h${(W - 16).toFixed(1)}v${(L - 16).toFixed(1)}h-${(W - 16).toFixed(1)}z" fill="none" stroke="${line}" stroke-dasharray="3 3"/>
<line x1="${pad}" y1="${pad - 10}" x2="${(pad + W).toFixed(1)}" y2="${pad - 10}" stroke="${gold}"/>
<text x="${(pad + W / 2).toFixed(1)}" y="${pad - 13}" ${f} fill="${gold}" text-anchor="middle">${o.w} мм</text>
<line x1="${(pad + W + 10).toFixed(1)}" y1="${pad}" x2="${(pad + W + 10).toFixed(1)}" y2="${(pad + L).toFixed(1)}" stroke="${gold}"/>
<text transform="translate(${(pad + W + 20).toFixed(1)} ${(pad + L / 2).toFixed(1)}) rotate(90)" ${f} fill="${gold}" text-anchor="middle">${o.h} мм</text>
<text x="${pad}" y="${(pad + L + 14).toFixed(1)}" ${f}>Вид сверху</text>
<rect x="${pad}" y="${yc}" width="${W.toFixed(1)}" height="${Hh.toFixed(1)}" fill="#15161c" stroke="${ink}" stroke-width="1"/>
${cut}
<line x1="${(pad + W + 10).toFixed(1)}" y1="${yc}" x2="${(pad + W + 10).toFixed(1)}" y2="${(yc + Hh).toFixed(1)}" stroke="${gold}"/>
<text transform="translate(${(pad + W + 20).toFixed(1)} ${(yc + Hh / 2).toFixed(1)}) rotate(90)" ${f} fill="${gold}" text-anchor="middle">~${H} мм</text>
<text x="${pad}" y="${(yc + Hh + 14).toFixed(1)}" ${f}>Разрез: ${LAYERS.length} слоёв${M.layers ? '' : ' (пример на базе Prime)'}</text>
<text x="${(pad + W).toFixed(1)}" y="${(vh - 8).toFixed(0)}" ${f} text-anchor="end" font-size="7">© 2026 ELUNA · RICCA DESIGNS</text>
</svg>`;
    box.innerHTML = dimsSvg.replace(/ width="\d+" height="\d+">/, '>');
    $('dimsNote').textContent = `Вид сверху и разрез · ${o.w} × ${o.h} × ~${H} мм · масштаб 1:20`;
  }
  function downloadSvg() {
    const blob = new Blob([dimsSvg], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `eluna-${key}-${order.get().w}x${order.get().h}.svg`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  ['dlSvg', 'dlSvg2', 'dlSvgPro'].forEach((id) => { const b = $(id); if (b) b.addEventListener('click', downloadSvg); });

  /* ---------- просмотр: Фото / Слои / 3D / AR ---------------------------- */
  const viewer = (function viewer() {
    const tabs = Array.from(document.querySelectorAll('.viewer__tabs [role="tab"]'));
    const panels = { photo: $('panel-photo'), layers: $('panel-layers'), '3d': $('panel-3d'), ar: $('panel-ar') };
    let current = 'photo';
    function show(name) {
      current = name;
      tabs.forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === name ? 'true' : 'false'));
      Object.keys(panels).forEach((k) => { const p = panels[k]; p.hidden = false; p.classList.toggle('is-on', k === name); });
      if (name === 'layers') layers.open();
      if (name === '3d') mv.load();
      if (name === 'ar') ar.open();
      try { history.replaceState(null, '', location.pathname + location.search + (name === 'photo' ? '' : `#${name}`)); } catch (e) { /* file:// */ }
    }
    tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.tab)));
    document.querySelector('.viewer__tabs').addEventListener('keydown', (e) => {
      const i = tabs.findIndex((t) => t.dataset.tab === current);
      if (e.key === 'ArrowRight') { tabs[(i + 1) % tabs.length].focus(); show(tabs[(i + 1) % tabs.length].dataset.tab); }
      if (e.key === 'ArrowLeft') { tabs[(i - 1 + tabs.length) % tabs.length].focus(); show(tabs[(i - 1 + tabs.length) % tabs.length].dataset.tab); }
    });

    /* --- слои: 24 кадра разлёта по ползунку --- */
    const layers = (function () {
      const cv = $('layersCanvas'), range = $('layersRange'), pct = $('layersPct'), play = $('layersPlay');
      const dir = isPhone ? 'img/seq720/' : 'img/seq/';
      const frames = [], g = cv.getContext('2d');
      let loaded = false, frame = 0, raf = 0;
      const src = (i) => `${dir}f${String(i + 1).padStart(2, '0')}.webp`;
      function fit() {
        const r = cv.parentElement.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5);
        cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
        draw();
      }
      function draw() {
        const im = frames[frame] || frames.find(Boolean); if (!im || !im.complete || !im.naturalWidth) return;
        const W = cv.width, H = cv.height, s = Math.min(W / im.naturalWidth, H / im.naturalHeight) * 1.06;
        const w = im.naturalWidth * s, h = im.naturalHeight * s;
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        g.drawImage(im, (W - w) / 2, (H - h) / 2 + H * .03, w, h);
      }
      function set(i) {
        frame = Math.max(0, Math.min(23, Math.round(i)));
        range.value = frame; range.style.setProperty('--p', `${(frame / 23) * 100}%`);
        pct.textContent = `${Math.round((frame / 23) * 100)} %`;
        draw();
      }
      function open() {
        if (loaded) { fit(); return; }
        loaded = true;
        // сначала крайние кадры, потом остальные
        [0, 23].concat(Array.from({ length: 22 }, (_, i) => i + 1)).forEach((i) => {
          const im = new Image(); im.decoding = 'async'; im.src = src(i); frames[i] = im;
          im.onload = () => { if (i === frame || (i === 0 && frame === 0)) draw(); };
        });
        fit();
        if (!reduced) setTimeout(animate, 500);
      }
      function animate() {
        cancelAnimationFrame(raf);
        const t0 = performance.now(), from = frame, to = from < 12 ? 23 : 0, dur = 1600;
        const ease = (x) => 1 - Math.pow(1 - x, 3);
        const step = (t) => { const k = Math.min(1, (t - t0) / dur); set(from + (to - from) * ease(k)); if (k < 1) raf = requestAnimationFrame(step); };
        raf = requestAnimationFrame(step);
      }
      range.addEventListener('input', () => { cancelAnimationFrame(raf); set(+range.value); });
      play.addEventListener('click', animate);
      addEventListener('resize', () => { if (loaded && current === 'layers') fit(); });
      return { open };
    })();

    /* --- 3D: model-viewer подгружается по клику --- */
    const mv = (function () {
      let state = 'idle', el = null;
      function fail(msg) {
        state = 'failed';
        $('wait3d').innerHTML = `<span>${esc(msg)}</span><a class="button button--ghost" href="models/eluna-${key}.glb" download>Скачать 3D-модель (GLB)</a>`;
      }
      function load() {
        if (state !== 'idle') return;
        state = 'loading';
        const s = document.createElement('script'); s.type = 'module'; s.src = MV_SRC;
        s.onerror = () => fail('3D-просмотр не загрузился — нет связи с библиотекой. Модель можно скачать и открыть на компьютере.');
        s.onload = () => customElements.whenDefined('model-viewer').then(mount).catch(() => fail('Браузер не поддерживает 3D-просмотр.'));
        document.head.appendChild(s);
      }
      function mount() {
        el = document.createElement('model-viewer');
        const attrs = {
          src: `models/eluna-${key}.glb`, alt: `Матрас ${M.name} в разрезе: слои и пружины`,
          'camera-controls': '', 'auto-rotate': '', 'auto-rotate-delay': '1800', 'rotation-per-second': '10deg',
          'shadow-intensity': '1.3', 'shadow-softness': '.9', exposure: '0.95', 'environment-image': 'neutral',
          'camera-orbit': '42deg 70deg 3.2m', 'min-camera-orbit': 'auto 15deg 1.8m', 'max-camera-orbit': 'auto 90deg 7m', 'field-of-view': '28deg',
          'interaction-prompt': 'none', 'touch-action': 'pan-y', loading: 'eager', reveal: 'auto',
          ar: '', 'ar-modes': 'webxr scene-viewer quick-look', 'ar-scale': 'fixed', 'ar-placement': 'floor',
        };
        Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
        el.innerHTML = `<button slot="ar-button" class="button button--primary viewer__ar-btn" type="button">Смотреть в комнате</button>`;
        el.addEventListener('load', () => { state = 'ready'; $('wait3d').hidden = true; if (pendingAR) { pendingAR = false; el.activateAR(); } });
        el.addEventListener('error', () => fail('Не удалось открыть 3D-модель.'));
        $('mv3d').appendChild(el);
      }
      let pendingAR = false;
      function activateAR() {
        if (state === 'ready' && el) { el.activateAR(); return; }
        pendingAR = true; load();
      }
      return { load, activateAR, canAR: () => !!(el && el.canActivateAR), isReady: () => state === 'ready' };
    })();
    $('fs3d').addEventListener('click', () => {
      const st = document.querySelector('.viewer__stage');
      if (document.fullscreenElement) document.exitFullscreen(); else if (st.requestFullscreen) st.requestFullscreen();
    });

    /* --- AR: телефон — кнопка, компьютер — QR на эту страницу --- */
    const ar = (function () {
      let done = false;
      function open() {
        if (done) return; done = true;
        const box = $('arBox');
        if (isPhone) {
          box.classList.add('ar--phone');
          box.innerHTML = `<div class="ar__text"><h3>Поставьте матрас в свою спальню.<br>В натуральную величину.</h3><p>Матрас ${esc(M.name)} встанет на пол ровно ${sizeText({ w: 1600, h: 2000 })} — вы увидите, как он впишется в кровать и комнату.</p><button type="button" class="button button--primary" id="arGo">Смотреть в комнате</button><p class="ar__unsupported" id="arNote">Нужен iPhone с iOS 12+ или Android с ARCore. Первый запуск — несколько секунд на загрузку.</p></div>`;
          $('arGo').addEventListener('click', () => { $('arGo').textContent = 'Открываем…'; mv.activateAR(); setTimeout(() => { $('arGo').textContent = 'Смотреть в комнате'; }, 4000); });
        } else {
          const url = location.origin + location.pathname + `?model=${key}#ar`;
          const s = document.createElement('script'); s.src = QR_SRC;
          s.onload = () => {
            try {
              const q = window.qrcode(0, 'M'); q.addData(url); q.make();
              const n = q.getModuleCount(), cv = document.createElement('canvas'), size = 420, cell = size / n;
              cv.width = cv.height = size; const g = cv.getContext('2d');
              g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#06070c';
              for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) { if (g.roundRect) { g.beginPath(); g.roundRect(c * cell + .6, r * cell + .6, cell - 1.2, cell - 1.2, cell * .3); g.fill(); } else g.fillRect(c * cell + .6, r * cell + .6, cell - 1.2, cell - 1.2); }
              $('arQr').prepend(cv);
            } catch (e) { fallback(url); }
          };
          s.onerror = () => fallback(url);
          document.head.appendChild(s);
        }
      }
      function fallback(url) {
        const img = document.createElement('img'); img.alt = 'QR-код'; img.width = img.height = 420;
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=0&data=${encodeURIComponent(url)}`;
        img.onerror = () => { $('arQr').innerHTML = `<p style="font-size:11px;color:#06070c;padding:8px;line-height:1.4">Откройте на телефоне:<br><b style="word-break:break-all">${esc(url)}</b></p>`; };
        $('arQr').prepend(img);
      }
      return { open };
    })();

    // пришли по QR с #ar или с #3d/#layers
    const hash = location.hash.replace('#', '');
    if (hash === 'ar' || hash === '3d' || hash === 'layers') show(hash);
    return { show };
  })();

  /* ---------- «Больше о матрасе» ----------------------------------------- */
  (function more() {
    // разрез с подписями
    const xs = $('xs');
    const total = LAYERS.reduce((s, l) => s + l.cm, 0);
    const n = LAYERS.length;
    const words = ['', 'Один слой', 'Два слоя', 'Три слоя', 'Четыре слоя', 'Пять слоёв', 'Шесть слоёв', 'Семь слоёв', 'Восемь слоёв', 'Девять слоёв', 'Десять слоёв'];
    $('layersCount').textContent = words[n] || `${n} слоёв`;
    if (!M.layers) $('layersLead').textContent = 'Royal собирается под ваш проект — ниже показан пример состава на базе Prime. Высоту, жёсткость сторон и материалы подбираем вместе.';
    xs.innerHTML = LAYERS.map((l, i) => `
      <div class="xs__layer xs--${l.kind}" data-i="${i}" tabindex="0" role="button" aria-label="${esc(l.name)}">
        <div class="xs__fill" style="--cm:${l.cm}"></div>
        <div class="xs__text"><b>${esc(l.name)}</b>${l.spec ? `<span class="cm">${esc(l.spec)}</span>` : ''}${l.note ? `<span class="note">${esc(l.note)}</span>` : ''}</div>
      </div>`).join('');
    const springs = LAYERS.find((l) => l.kind === 'springs');
    $('stackSum').innerHTML = `
      <div><span>Слоёв</span><b>${n}</b></div>
      <div><span>Высота</span><b>${M.layers ? M.height : `~${Math.round(total * 10 + 24)} мм`}</b></div>
      <div><span>Пружинный блок</span><b>${springs ? `${springs.cm * 10} мм` : '—'}</b></div>
      <div><span>Натуральные слои</span><b>${LAYERS.filter((l) => ['coir', 'latex', 'cotton'].includes(l.kind)).length}</b></div>
      <div><span>Сборка</span><b>вручную · 1 мастер</b></div>`;
    const note = $('stackNote');
    const pick = (i) => {
      xs.querySelectorAll('.xs__layer').forEach((el) => el.classList.toggle('is-on', +el.dataset.i === i));
      const l = LAYERS[i];
      note.textContent = `${i + 1} из ${n} · ${l.name}${l.spec ? `, ${l.spec}` : ''} · ${l.cm * 10} мм. ${l.note || (KINDS[l.kind] ? `${KINDS[l.kind].title}: ${matText(l.kind)}` : '')}`;
    };
    xs.addEventListener('click', (e) => { const el = e.target.closest('.xs__layer'); if (el) pick(+el.dataset.i); });
    xs.addEventListener('keydown', (e) => { const el = e.target.closest('.xs__layer'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(+el.dataset.i); } });
    pick(0);

    // материалы
    function matText(kind) {
      return {
        cotton: 'дышащий чехол, прошит вручную; впитывает влагу и остаётся прохладным.',
        knit: 'плотный вискозный трикотаж — гладкая поверхность, не катышится.',
        latex: 'натуральный латекс — упругий, с микромассажным эффектом, не накапливает тепло.',
        coir: 'прессованная кокосовая койра — природная жёсткость и вентиляция.',
        felt: 'термовойлок — защищает мягкие слои от пружин, не сбивается годами.',
        foam: 'ортопена высокой плотности — мягкая посадка без провалов.',
        springs: 'армированные независимые пружины — каждая работает сама, без эффекта гамака.',
      }[kind] || '';
    }
    const tex = { coir: 'img/coir.webp', cotton: 'img/cotton.webp', latex: 'img/latex.webp' };
    const kinds = LAYERS.map((l) => l.kind).filter((v, i, a) => a.indexOf(v) === i);
    $('mats').innerHTML = kinds.map((k) => {
      const mm = LAYERS.filter((l) => l.kind === k).map((l) => l.cm * 10);
      const bg = tex[k] ? `background-image:url(${tex[k]})` : `background:${KINDS[k].color}; opacity:.22`;
      return `<div class="mat"><i>${mm.join(' + ')} мм</i><span class="mat__tex" style="${bg}"></span><b>${esc(KINDS[k].title)}</b><span>${esc(matText(k))}</span></div>`;
    }).join('');

    // жёсткость
    const fv = M.firmness;
    $('firmValue').textContent = fv.label;
    $('firmText').textContent = fv.text;
    const dot = $('firmDot');
    if (fv.value == null) dot.style.display = 'none'; else dot.style.setProperty('--v', `${((fv.value - 1) / 4) * 100}%`);

    // другие модели
    $('others').innerHTML = Object.keys(MODELS).filter((k) => k !== key).map((k) => {
      const m = MODELS[k], p = C.PRICES[k], old = C.OLD_PRICES[k];
      return `<a class="ocard" href="product.html?model=${k}"><span class="eyebrow"><span>${esc(m.series)}</span><span class="dot"></span><span>${esc(m.height)}</span></span><span class="ocard__name">${esc(m.name)}</span><span class="ocard__who">${esc(m.who)}</span><span class="ocard__price">${old ? `<s class="price-old">${fmtMoney(old)}</s>` : ''}${p == null ? '—' : fmtMoney(p)} ₸</span><span class="ocard__go">Смотреть →</span></a>`;
    }).join('');

    // подсветка раздела в навигации
    const links = Array.from(document.querySelectorAll('#moreNav a'));
    const blocks = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-here', a.getAttribute('href') === `#${e.target.id}`)); });
      }, { rootMargin: '-30% 0px -60% 0px' });
      blocks.forEach((b) => io.observe(b));
    }
  })();

  /* ---------- поделиться · форма вопроса · липкая панель ----------------- */
  $('share').addEventListener('click', async () => {
    const url = location.origin + location.pathname + `?model=${key}`;
    const data = { title: `Матрас ${M.name} — ELUNA`, text: `${M.slogan} ${M.who}.`, url };
    try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { /* отменили */ }
    try { await navigator.clipboard.writeText(url); $('share').lastChild.textContent = 'Ссылка скопирована'; setTimeout(() => { $('share').lastChild.textContent = 'Поделиться'; }, 2000); } catch (e) { prompt('Ссылка на страницу', url); }
  });

  $('askForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, name = f.name.value.trim(), note = f.note.value.trim();
    const text = `Здравствуйте! Вопрос по матрасу ${M.name} (${sizeText(order.get())}).${name ? `\nИмя: ${name}` : ''}${note ? `\n${note}` : ''}`;
    window.open(waLink(text), '_blank', 'noopener');
  });

  (function buybar() {
    const bar = $('buybar'), buy = $('buy'); if (!bar || !buy || !('IntersectionObserver' in window)) return;
    new IntersectionObserver((es) => es.forEach((e) => bar.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0)), { threshold: 0 }).observe(buy);
    $('buybarGo').addEventListener('click', (e) => { e.preventDefault(); buy.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
  })();

  window.ELUNA_PRODUCT = { model: key, order, viewer };
})();
