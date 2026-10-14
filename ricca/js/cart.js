/* RICCA DESIGNS — корзина: общий модуль для главной (index.html) и конструктора (configurator.html). Без сборки, без библиотек.

   ЧТО ЭТО
   Клиент складывает в корзину мебель из каталога, мебель из конструктора и понравившиеся ткани — и одной кнопкой отправляет
   всё в WhatsApp одним сообщением (номер — WA ниже, тот же, что в CONFIG в js/site.js). Цен нет: «Рассчитаем и ответим».
   Корзина хранится в браузере клиента (localStorage 'ricca-cart-v1'), видна во всех вкладках сайта, до 30 строк.
   Нет хранилища (приватный режим) — корзина работает до закрытия страницы.

   КАК ПОДКЛЮЧИТЬ
   <script src="js/cart.js" defer></script> — до своего скрипта страницы. Дальше — window.RICCA_CART.

   API
     RICCA_CART.add(item)          → uid строки ('' — если корзина полна). Та же модель с той же тканью, размером и комментарием
                                     не дублируется: количество прибавляется (до 20; у ткани количество всегда 1).
     RICCA_CART.update(uid, patch) → true/false. Можно менять qty, size, fabric, note, title, subtitle, link, thumb.
     RICCA_CART.remove(uid)        → true/false
     RICCA_CART.clear()
     RICCA_CART.list()             → копия массива строк (в порядке добавления)
     RICCA_CART.count()            → { lines: число строк, items: сумма количеств }
     RICCA_CART.onChange(fn)       → функция-отписка. fn(list) вызывается после любого изменения, в том числе из другой вкладки.
     RICCA_CART.message(opts)      → текст заявки (одна часть). opts: { name, city, comment, part } — part с 0.
     RICCA_CART.parts(opts)        → массив текстов: если заявка не помещается в одну ссылку WhatsApp, она делится на части.
     RICCA_CART.waUrl(opts)        → ссылка https://wa.me/… на часть opts.part (по умолчанию первая).
     RICCA_CART.MAX_LINES (30), RICCA_CART.MAX_QTY (20)

   СТРОКА КОРЗИНЫ
     { uid,                              — выдаёт корзина
       kind: 'catalog' | 'custom' | 'fabric',
       id,                               — каталог: 'sofa-01'; ткань: 'coco-3'; конструктор: любой короткий id
       title,                            — «Диван Svira», «Ткань COCO, светло-серый», «Диван по размерам»
       reading,                          — необязательно: как читать название («Свира») — пишется в скобках для менеджера
       subtitle,                         — одна строка о модели («Угловой · 3 модуля»)
       qty,                              — 1–20
       size,                             — '' или текст «260 × 95 × 82 см»
       fabric: { collection, colour, kind } | null,   — { collection: 'COCO', colour: 'светло-серый', kind: 'букле' }
       note,                             — комментарий к позиции
       link,                             — полная ссылка: …/#item-sofa-01, …/#fabric-coco-3, …/configurator.html#cfg=…
       thumb }                           — необязательно: адрес картинки или data:-картинка (до ~150 КБ)

   ПРИМЕР (конструктор):
     RICCA_CART.add({
       kind: 'custom', id: 'cfg-sofa', title: 'Диван по вашим размерам', subtitle: 'Угловой · левый угол · опоры дуб',
       qty: 1, size: '280 × 160 × 82 см', fabric: { collection: 'COCO', colour: 'молочный', kind: 'букле' },
       note: 'Мягкая посадка', link: RICCA_CART.abs('configurator.html#cfg=' + code), thumb: canvas.toDataURL('image/jpeg', .7)
     });

   ТЕКСТ ЗАЯВКИ (пример):
     Здравствуйте! Заявка с сайта RICCA DESIGNS:

     1. Диван Svira (Свира) — 2 шт. · ткань COCO, светло-серый · размер 260 × 95 × 82 см · мягкая посадка
     https://…/#item-sofa-01
     2. Ткань RIVER, бежевый — интересует
     https://…/#fabric-river-3

     Рассчитайте, пожалуйста, стоимость.

     Имя: Айгерим
     Город: Алматы
     Комментарий: …
     Итого: 2 предмета мебели и 1 ткань.
*/
(() => {
  'use strict';
  if (window.RICCA_CART) return;

  const WA = '77079550808';            // номер WhatsApp — тот же, что CONFIG.wa в js/site.js
  const KEY = 'ricca-cart-v1';
  const OLD = 'ricca-shortlist-v2';    // прежняя «Подборка» — переносится один раз
  const MAX_LINES = 30, MAX_QTY = 20;
  const URL_MAX = 3500;                // длина ссылки wa.me (в закодированном виде) — с запасом для всех телефонов
  const KINDS = ['catalog', 'custom', 'fabric'];

  let mem = null;                      // запасное хранилище в памяти, если localStorage недоступен
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return undefined; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false; } };
  const drop = (k) => { try { localStorage.removeItem(k); } catch (_) { /* */ } };

  const str = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
  const txt = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
  const clampQty = (n) => Math.max(1, Math.min(MAX_QTY, Math.round(+n) || 1));
  const page = () => /^https?:$/.test(location.protocol) ? location.origin + location.pathname.replace(/[^/]*$/, '') : '';
  // абсолютная ссылка от папки сайта: abs('#item-sofa-01') → https://домен/#item-sofa-01; на file:// — ''
  const abs = (h) => {
    if (!h) return '';
    if (/^https?:\/\//.test(h)) return h;
    const base = page();
    if (!base) return '';
    return h.charAt(0) === '#' ? base + h : base + h.replace(/^\.?\//, '');
  };
  const uidNew = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  function clean(x) {
    if (!x || typeof x !== 'object') return null;
    const kind = KINDS.indexOf(x.kind) >= 0 ? x.kind : 'custom';
    const f = x.fabric && typeof x.fabric === 'object' ? {
      collection: str(x.fabric.collection, 60), colour: str(x.fabric.colour, 60), kind: str(x.fabric.kind, 60)
    } : null;
    if (f && x.fabric.id) f.id = str(x.fabric.id, 60);
    let title = str(x.title, 120);
    if (kind === 'fabric') title = title.replace(/^Образец ткани\s+/, 'Ткань ');   // строки, сохранённые до 13 октября
    if (!title) return null;
    const thumb = typeof x.thumb === 'string' && x.thumb.length < 200000 && /^(data:image\/|https?:|\/|[\w.-])/.test(x.thumb) ? x.thumb : '';
    return {
      uid: typeof x.uid === 'string' && x.uid ? x.uid.slice(0, 40) : uidNew(),
      kind, id: str(x.id, 120), title, reading: str(x.reading, 60), subtitle: str(x.subtitle, 200),
      qty: kind === 'fabric' ? 1 : clampQty(x.qty), size: str(x.size, 80),
      fabric: f && (f.collection || f.colour) ? f : null,
      note: txt(x.note, 300), link: str(x.link, 4000), thumb
    };
  }
  const sameAs = (a, b) => a.kind === b.kind && a.id === b.id && a.size === b.size && a.note === b.note
    && (a.kind !== 'custom' || a.link === b.link)
    && JSON.stringify(a.fabric && [a.fabric.collection, a.fabric.colour]) === JSON.stringify(b.fabric && [b.fabric.collection, b.fabric.colour]);

  function load() {
    const raw = read(KEY);
    if (raw === undefined && mem) return mem;
    let items = raw && Array.isArray(raw.items) ? raw.items.map(clean).filter(Boolean).slice(0, MAX_LINES) : null;
    if (!items) {
      // один раз: прежняя «Подборка» (только изделия каталога: { id: 'item-sofa-01', title, meta })
      const old = read(OLD);
      items = Array.isArray(old) ? old.filter((o) => o && /^item-[\w-]+$/.test(o.id) && o.title).slice(0, MAX_LINES).map((o) => clean({
        kind: 'catalog', id: o.id.slice(5), title: o.title, subtitle: o.meta || '', qty: 1, link: abs(`#${o.id}`)
      })).filter(Boolean) : [];
      if (Array.isArray(old)) { if (write(KEY, { v: 1, items })) drop(OLD); }
    }
    return items;
  }
  let items = load();
  const subs = [];
  const emit = () => { const l = list(); subs.slice().forEach((fn) => { try { fn(l); } catch (e) { setTimeout(() => { throw e; }); } }); };
  function save() {
    if (!write(KEY, { v: 1, items })) {
      // не поместилось (картинки) — пробуем без data:-картинок; нет хранилища — живём в памяти
      const lite = items.map((x) => (/^data:/.test(x.thumb) ? Object.assign({}, x, { thumb: '' }) : x));
      if (!write(KEY, { v: 1, items: lite })) mem = items;
    }
    emit();
  }
  const list = () => items.map((x) => Object.assign({}, x, { fabric: x.fabric ? Object.assign({}, x.fabric) : null }));

  function add(item) {
    const x = clean(item);
    if (!x) return '';
    const twin = items.find((y) => sameAs(y, x));
    if (twin) { if (twin.kind !== 'fabric') { twin.qty = clampQty(twin.qty + x.qty); save(); } return twin.uid; }
    if (items.length >= MAX_LINES) return '';
    if (items.some((y) => y.uid === x.uid)) x.uid = uidNew();
    items.push(x); save();
    return x.uid;
  }
  function update(uid, patch) {
    const i = items.findIndex((y) => y.uid === uid);
    if (i < 0 || !patch) return false;
    const x = clean(Object.assign({}, items[i], patch, { uid, kind: items[i].kind }));
    if (!x) return false;
    items[i] = x; save();
    return true;
  }
  function remove(uid) {
    const n = items.length;
    items = items.filter((y) => y.uid !== uid);
    if (items.length === n) return false;
    save(); return true;
  }
  function clear() { items = []; save(); }
  const count = () => ({ lines: items.length, items: items.reduce((s, x) => s + x.qty, 0) });
  function onChange(fn) {
    if (typeof fn !== 'function') return () => {};
    subs.push(fn);
    return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); };
  }
  window.addEventListener('storage', (e) => { if (e.key === KEY || e.key === null) { items = load(); emit(); } });

  /* ---------- Текст заявки ---------- */
  const plural3 = (n, f) => f[n % 10 === 1 && n % 100 !== 11 ? 0 : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2)];
  const enc = (t) => encodeURIComponent(t).length;
  const lcFirst = (t) => t.replace(/^([«"(]*)(.)/, (m, q, c) => q + c.toLowerCase());
  // строка позиции: «1. Диван Svira (Свира) — 2 шт. · ткань COCO, светло-серый · размер 260 × 95 × 82 см · комментарий»;
  // ткань: «2. Ткань RIVER, бежевый — интересует». short — только для деления на части: длинную ссылку конструктора не шлём
  function lineOf(x, n, short) {
    const name = `${x.title}${x.reading ? ` (${x.reading})` : ''}`;
    const f = x.fabric;
    const fab = f ? `ткань ${[f.collection, f.colour || 'цвет не выбран'].filter(Boolean).join(', ')}` : 'ткань — подобрать вместе';
    const parts = [];
    if (x.kind === 'custom' && x.subtitle) parts.push(lcFirst(x.subtitle));
    if (x.kind !== 'fabric') parts.push(fab);
    if (x.size) parts.push(`размер ${x.size}`);
    const note = x.note.replace(/\s*\n\s*/g, '; ');
    if (note) parts.push(note);
    const qty = x.kind === 'fabric' ? ' — интересует' : ` — ${x.qty} шт.`;
    let s = `${n}. ${name}${qty}${parts.length ? ` · ${parts.join(' · ')}` : ''}`;
    // ссылка: длинную (конструктор) при делении на части не шлём — менеджер попросит; каталог и ткани — короткие, остаются
    if (x.link && !(short && x.link.length > 300)) s += `\n${x.link}`;
    else if (x.link) s += '\n(ссылку на конфигурацию пришлю отдельно)';
    return s;
  }
  function contactOf(o) {
    const rows = [];
    const name = str(o.name, 80), city = str(o.city, 80), comment = txt(o.comment, 300);
    if (name) rows.push(`Имя: ${name}`);
    if (city) rows.push(`Город: ${city}`);
    if (comment) rows.push(`Комментарий: ${comment}`);
    return rows.join('\n');
  }
  // «Итого: 2 предмета мебели и 1 ткань.» — ткани считаем отдельно (у ткани нет количества)
  function footOf() {
    const furn = items.filter((x) => x.kind !== 'fabric').reduce((s, x) => s + x.qty, 0);
    const fab = items.filter((x) => x.kind === 'fabric').length;
    const t = [
      furn ? `${furn} ${plural3(furn, ['предмет', 'предмета', 'предметов'])} мебели` : '',
      fab ? `${fab} ${plural3(fab, ['ткань', 'ткани', 'тканей'])}` : ''
    ].filter(Boolean).join(' и ');
    return `Итого: ${t}.`;
  }
  // обрезать t (с «…») так, чтобы ссылка на t + fixed уложилась в URL_MAX; fixed не трогаем
  function fitEnc(t, fixed) {
    if (enc(t + fixed) + 30 <= URL_MAX) return t;
    let lo = 0, hi = t.length;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (enc(`${t.slice(0, m)}…${fixed}`) + 30 <= URL_MAX) lo = m; else hi = m - 1; }
    return `${t.slice(0, lo).replace(/[\s,.;:—-]+$/, '')}…`;
  }
  function build(o) {
    o = o || {};
    if (!items.length) return [];
    const head = 'Здравствуйте! Заявка с сайта RICCA DESIGNS:';
    const ask = 'Рассчитайте, пожалуйста, стоимость.';
    const contact = contactOf(o);
    const bottom = `\n\n${ask}\n\n${[contact, footOf()].filter(Boolean).join('\n')}`;
    const full = `${head}\n\n${items.map((x, i) => lineOf(x, i + 1, false)).join('\n')}${bottom}`;
    if (enc(full) + 30 <= URL_MAX) return [full];
    // не помещается в одну ссылку — делим на части по позициям; комментарии к позициям остаются целиком.
    // Просьба о расчёте, имя, город, комментарий и итог — в последней части (не помещаются — отдельной частью);
    // в конце каждой части, кроме последней: «Ещё K позиций — в следующем сообщении».
    // Обрезается (с «…») только то, что одно не помещается в ссылку (одна позиция с очень длинным текстом)
    const LIM = URL_MAX - 30;
    const fits = (t) => enc(t) <= LIM;
    const lines = items.map((x, i) => lineOf(x, i + 1, true));
    const topOf = (k) => (k === 0 ? `${head.replace(/:$/, ' (часть 1 из §):')}\n` : `Продолжение заявки с сайта RICCA DESIGNS (часть ${k + 1} из §):\n`);
    const tailOf = (rest, k, n) => {
      const where = n - k > 2 ? `в следующих сообщениях (части ${k + 2}–${n})` : 'в следующем сообщении';
      return rest > 0 ? `\n\nЕщё ${rest} ${plural3(rest, ['позиция', 'позиции', 'позиций'])} — ${where}.` : `\n\nОкончание — ${where}.`;
    };
    const longTail = (rest) => tailOf(Math.max(rest, 1), 0, 99);   // запас под самую длинную концовку
    const pk = [];   // { body, end } — end: номер строки после части
    let i = 0;
    while (i < lines.length) {
      const top = topOf(pk.length);
      let body = '', j = i;
      while (j < lines.length) {
        const next = `${body}\n${lines[j]}`;
        if (!fits(top + next + longTail(lines.length - j - 1)) && j > i) break;
        body = next; j += 1;
      }
      pk.push({ body, end: j });
      i = j;
    }
    const last = pk[pk.length - 1];
    if (fits(topOf(pk.length - 1) + last.body + bottom)) last.bot = bottom;
    else pk.push({ body: '', end: lines.length, bot: bottom.replace(/^\n/, '') });
    const n = pk.length;
    return pk.map((p, k) => {
      const top = topOf(k).replace('§', String(n));
      const end = k < n - 1 ? tailOf(lines.length - p.end, k, n) : (p.bot || '');
      return fitEnc(top + p.body, end) + end;
    });
  }
  const parts = (o) => build(o);
  function message(o) { const p = build(o); return p[Math.max(0, Math.min(p.length - 1, (o && +o.part) || 0))] || ''; }
  const waUrl = (o) => `https://wa.me/${WA}?text=${encodeURIComponent(message(o) || 'Здравствуйте! Хочу узнать о мебели RICCA на заказ.')}`;

  window.RICCA_CART = Object.freeze({
    add, update, remove, clear, list, count, onChange, message, parts, waUrl, abs,
    MAX_LINES, MAX_QTY, URL_MAX, WA
  });
})();
