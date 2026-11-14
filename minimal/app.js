/* ELUNA — минималистичная версия: разрезы моделей, список слоёв, расчёт цены. */
(() => {
  const WHATSAPP = '77079550808';
  const PRICES = { air: 125000, balance: 220000, prime: 280000, royal: 1250000 };
  const OLD_PRICES = { prime: 350000 };
  const PER_M2 = 40000; // доплата за м² сверх 1600 × 2000
  const L = (kind, cm, name, spec) => ({ kind, cm, name, spec });
  const MODELS = {
    air: { name: 'Eluna Air', layers: [
      L('knit', 0.6, 'Вискозный трикотаж'), L('foam', 2, 'Ортопена', '20 мм'), L('felt', 0.6, 'Термовойлок'),
      L('springs', 14, 'Армированные пружины'), L('felt', 0.6, 'Термовойлок'), L('coir', 1, 'Натуральный кокос', '10 мм'), L('knit', 0.6, 'Вискозный трикотаж')] },
    balance: { name: 'Eluna Balance', layers: [
      L('knit', 0.6, 'Плотный вискозный трикотаж'), L('foam', 2, 'Ортопена', '20 мм'), L('felt', 0.6, 'Термовойлок'), L('coir', 2, 'Натуральный кокос', '20 мм'),
      L('springs', 14, 'Армированные пружины'), L('felt', 0.6, 'Термовойлок'), L('coir', 1, 'Натуральный кокос', '10 мм'), L('foam', 1.5, 'Ортопена', '15 мм'), L('knit', 0.6, 'Плотный вискозный трикотаж')] },
    prime: { name: 'Eluna Prime', layers: [
      L('cotton', 1, 'Чехол из 100 % хлопка', 'ручная работа'), L('latex', 2, 'Натуральный латекс', 'микромассажный эффект'), L('felt', 0.6, 'Термовойлок', 'не сбивается, не собирает пыль'),
      L('coir', 2, 'Натуральный кокос', 'отвечает за жёсткость'), L('springs', 16, 'Армированные пружины', 'без эффекта гамака'), L('coir', 2, 'Натуральный кокос'),
      L('felt', 0.6, 'Термовойлок'), L('latex', 2, 'Натуральный латекс'), L('cotton', 1, 'Чехол из 100 % хлопка')] },
    royal: { name: 'Eluna Royal', layers: null },
  };
  const money = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ | /g, ' ') + ' ₸';

  /* Разрезы: один масштаб для всех моделей, 1 см = 6.4 единицы */
  const K = 6.4, W = 240, MAXH = 30 * K;
  const fills = (k) => ({ springs: `url(#${k}-springs)`, coir: `url(#${k}-coir)`, latex: `url(#${k}-dots)`, foam: `url(#${k}-foam)`, felt: 'currentColor', knit: 'none', cotton: 'none' });
  const defs = (k) => `<defs>
    <pattern id="${k}-springs" width="12" height="8" patternUnits="userSpaceOnUse"><path d="M1 0v8M11 0v8M1 2l10 4" fill="none" stroke="currentColor" stroke-width=".8"/></pattern>
    <pattern id="${k}-coir" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0v5" stroke="currentColor" stroke-width="1.6"/></pattern>
    <pattern id="${k}-dots" width="8" height="6" patternUnits="userSpaceOnUse"><circle cx="4" cy="3" r="1" fill="currentColor"/></pattern>
    <pattern id="${k}-foam" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r=".5" fill="currentColor"/></pattern></defs>`;
  const cut = (key) => {
    const m = MODELS[key], f = fills(key);
    let body = '';
    if (!m.layers) {
      body = `<rect x=".5" y=".5" width="${W - 1}" height="${MAXH - 1}" rx="7" fill="none" stroke="currentColor" stroke-dasharray="5 5"/>
        <text x="${W / 2}" y="${MAXH / 2 + 5}" text-anchor="middle" font-size="13" fill="currentColor">по вашему проекту</text>`;
    } else {
      const total = m.layers.reduce((s, l) => s + l.cm, 0) * K;
      let y = MAXH - total;
      body = m.layers.map((l) => {
        const h = l.cm * K, r = `<rect x=".5" y="${y.toFixed(1)}" width="${W - 1}" height="${h.toFixed(1)}" fill="${f[l.kind]}" stroke="currentColor" stroke-width=".9"/>`;
        y += h; return r;
      }).join('');
    }
    return `<svg viewBox="0 0 ${W} ${MAXH}" aria-hidden="true">${defs(key)}${body}</svg>`;
  };
  document.querySelectorAll('[data-cut]').forEach((el) => { el.innerHTML = cut(el.dataset.cut); });

  const list = document.getElementById('layerList');
  if (list) list.innerHTML = MODELS.prime.layers.map((l) => `<li><span>${l.name}${l.spec ? `<small>${l.spec}</small>` : ''}</span><span>${Math.round(l.cm * 10)} мм</span></li>`).join('');

  /* Расчёт */
  const form = document.getElementById('calc');
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const custom = $('custom'), cw = $('cw'), ch = $('ch'), hint = $('customHint');
  const HINT = hint.textContent;
  const clampOk = (el) => { const v = +el.value; return Number.isFinite(v) && v >= +el.min && v <= +el.max; };

  function update() {
    const model = form.elements.model.value, size = form.elements.size.value, city = form.elements.city.value;
    custom.hidden = size !== 'custom';
    let w = 1600, h = 2000, valid = true;
    if (size === 'custom') {
      valid = clampOk(cw) && clampOk(ch);
      hint.textContent = valid ? HINT : 'Проверьте размер: ширина от 1400 до 2200, длина от 1900 до 2200 мм.';
      hint.classList.toggle('is-error', !valid);
      if (valid) { w = +cw.value; h = +ch.value; }
    } else { [w, h] = size.split('x').map(Number); }
    const base = PRICES[model], old = OLD_PRICES[model];
    const price = Math.round((base + ((w * h) / 1e6 - 3.2) * PER_M2) / 1000) * 1000;
    const oldPrice = old ? Math.round((price * old) / base / 1000) * 1000 : null;
    const name = MODELS[model].name, sizeText = `${w} × ${h} мм`;
    $('sumName').textContent = `${name} · ${sizeText}`;
    $('sumPrice').textContent = valid ? money(price) : 'уточните размер';
    $('sumOld').hidden = !(oldPrice && valid);
    if (oldPrice) $('sumOld').textContent = money(oldPrice);
    $('sumMonth').hidden = !valid;
    $('sumMonth').textContent = `Рассрочка 0 % на 12 месяцев: ${money(price / 12)} в месяц.`;
    const cityText = city === 'Алматы' ? 'Алматы: привезём и установим сами.' : `${city}: от 7 дней до двери, подъём включён.`;
    $('sumCity').textContent = cityText;
    const msg = ['Здравствуйте! Хочу заказать матрас ELUNA.', `Модель: ${name}`, `Размер: ${sizeText}`, valid ? `Цена на сайте: ${money(price)}` : '', `Город: ${city}`].filter(Boolean).join('\n');
    $('wa').href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }
  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  document.querySelectorAll('[data-pick]').forEach((a) => a.addEventListener('click', () => {
    const r = form.querySelector(`input[name="model"][value="${a.dataset.pick}"]`);
    if (r) { r.checked = true; update(); }
  }));
  update();
})();
