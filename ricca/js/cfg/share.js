/* RICCA · конструктор — адрес варианта, номер, текст для WhatsApp (чистый модуль: без DOM и three, работает в node).
   Единицы: в параметрах — метры, в адресе и тексте — сантиметры. Формат адреса (SPEC §3.3):
   #cfg=v1~t.corner~s.left~w.280~…~fb.velur/alba/molochnyy~nt.<encodeURIComponent, ≤ 140> */

import { parts as partsOf, DEFAULTS as PDEF } from './params.js';

export const WA_NUMBER = '77079550808';                     // как в js/site.js (CONFIG.wa)
export const waUrl = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

/* короткие ключи адреса ↔ параметры (1:1) */
export const SHORT = {
  type: 't', side: 's', form: 'f', w: 'w', l: 'l', d: 'd', h: 'h', seatH: 'sh', seatD: 'sd', armStyle: 'as', armW: 'aw', armH: 'ah',
  backCushions: 'bc', seatCushions: 'sc', sections: 'n', legs: 'lg', legFinish: 'lf', legH: 'lh', piping: 'p', qty: 'q', fabric: 'fb', note: 'nt',
  chaiseW: 'cw', modules: 'mo', moduleW: 'mm', chaise: 'ch', chaiseL: 'cl',
  mw: 'mw', ml: 'ml', hbStyle: 'hs', hbH: 'hh', hbOver: 'ho', frameT: 'ft', railH: 'rh', base: 'b', lift: 'lt',
  shape: 'sp', topT: 'tt', top: 'tp', topTone: 'tn', legW: 'lw', legInset: 'li', arms: 'ar', backShape: 'bs',
};
const LONG = Object.fromEntries(Object.entries(SHORT).map(([k, v]) => [v, k]));
const COUNT_KEYS = new Set(['sections', 'modules', 'qty']);           // целые числа, не длины
const BOOL_KEYS = new Set(['piping', 'lift']);
const DERIVED = new Set(['hbT', 'backLook', 'qty']);                   // не пишем в адрес (qty — отдельно, «q.»)
/* выводятся из других ключей (params.js → normalize) — тоже не пишем */
const DERIVED_BY_TYPE = { bed: ['w', 'd', 'h'], modular: ['w'] };

/* ---------- числа ---------- */
export const toCm = (m) => Math.round(m * 1000) / 10;
export const fmtCm = (m) => String(toCm(m)).replace('.', ',');          // 237,5
export const fmtM = (m) => String(Math.round(m * 10) / 10).replace('.', ',');   // 4,5 (метры комнаты)
const enc = (s) => encodeURIComponent(s).replace(/~/g, '%7E').replace(/\./g, '%2E');

function valOut(key, v) {
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return COUNT_KEYS.has(key) ? String(Math.round(v)) : String(toCm(v));
  return enc(String(v));
}
function valIn(key, raw, def) {
  const s = decodeURIComponent(raw);
  if (BOOL_KEYS.has(key) || typeof def === 'boolean') return s === '1' || s === 'true';
  if (COUNT_KEYS.has(key)) return /^\d+$/.test(s) ? parseInt(s, 10) : s;      // sections: 'auto' | число
  if (/^-?\d+(\.\d+)?$/.test(s) && (typeof def === 'number' || def === undefined)) return Math.round(parseFloat(s) * 10) / 1000;
  return s;
}
const same = (key, a, b) => (typeof a === 'number' && typeof b === 'number' && !COUNT_KEYS.has(key) ? toCm(a) === toCm(b) : a === b);

/* state = { type, params, fabric: {typeId, collectionId, slug} | fabricRef, qty, note }
   opts.defaults — DEFAULTS[type] (метры): пишем только отличия; без defaults — все ключи (каноническая строка) */
export function encodeCfg(state, { defaults = null, withNote = true, withQty = true } = {}) {
  const out = ['v1', `t.${state.type}`];
  const p = state.params || {};
  for (const key of Object.keys(p).sort()) {
    const v = p[key];
    if (v === undefined || v === null || DERIVED.has(key) || key === 'type' || (DERIVED_BY_TYPE[state.type] || []).includes(key)) continue;
    if (defaults && key in defaults && same(key, v, defaults[key])) continue;
    out.push(`${SHORT[key] || key}.${valOut(key, v)}`);
  }
  if (withQty && state.qty && state.qty !== 1) out.push(`q.${Math.round(state.qty)}`);
  const ref = typeof state.fabric === 'string' ? state.fabric : (state.fabric && state.fabric.typeId ? `${state.fabric.typeId}/${state.fabric.collectionId}/${state.fabric.slug}` : '');
  if (ref) out.push(`fb.${ref.split('/').map(enc).join('/')}`);
  const note = String(state.note || '').trim().slice(0, 140);
  if (withNote && note) out.push(`nt.${enc(note)}`);
  return out.join('~');
}

/* → { v, type, params (метры; с defaults — полные), fabricRef, qty, note }. Неизвестные ключи терпим; результат — в validate. */
export function decodeCfg(str, { defaults = null } = {}) {
  let s = String(str || '').replace(/^#/, '');
  if (s.startsWith('cfg=')) s = s.slice(4);
  const parts = s.split('~').filter(Boolean);
  const res = { v: 1, type: null, params: {}, fabricRef: '', qty: 1, note: '' };
  if (parts[0] && /^v\d+$/.test(parts[0])) res.v = parseInt(parts.shift().slice(1), 10);
  const kv = [];
  for (const p of parts) {
    const i = p.indexOf('.'); if (i < 1) continue;
    kv.push([p.slice(0, i), p.slice(i + 1)]);
  }
  for (const [k, raw] of kv) if (k === 't') res.type = decodeURIComponent(raw);
  const defs = defaults && res.type ? (defaults[res.type] || null) : null;
  for (const [k, raw] of kv) {
    try {
      const key = LONG[k] || k;
      if (key === 'type') continue;
      if (key === 'fabric') { res.fabricRef = raw.split('/').map((x) => decodeURIComponent(x)).join('/'); continue; }
      if (key === 'note') { res.note = decodeURIComponent(raw).slice(0, 300); continue; }
      if (key === 'qty') { const q = parseInt(raw, 10); if (q > 0) res.qty = Math.min(q, 99); continue; }
      if (!/^[A-Za-z][A-Za-z0-9]*$/.test(key)) continue;
      res.params[key] = valIn(key, raw, defs ? defs[key] : undefined);
    } catch (e) { /* битый фрагмент — пропускаем */ }
  }
  if (defs) res.params = { ...defs, ...res.params };
  return res;
}

/* FNV-1a 32 → base36, 6 знаков: «RD-3K9QZ2». Количество и пожелание в номер не входят. */
export function cfgId(stateOrCanonical) {
  const str = typeof stateOrCanonical === 'string' ? stateOrCanonical : encodeCfg(stateOrCanonical, { withNote: false, withQty: false });
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return 'RD-' + h.toString(36).toUpperCase().padStart(6, '0').slice(-6);
}

/* ---------- словарь (русские подписи; совпадают с params.js → OPTIONS) ---------- */
export const TYPE_TITLES = {
  sofa: 'Диван прямой', corner: 'Диван угловой', ushape: 'Диван П-образный', modular: 'Модульный диван', bed: 'Кровать',
  armchair: 'Кресло', pouf: 'Пуф / банкетка',
};
const COMMON = {
  armStyle: { none: 'без подлокотников', thin: 'тонкие', wide: 'широкие', round: 'округлые' },
  backCushions: { fixed: 'цельная спинка', loose: 'съёмные подушки' },
  seatCushions: { single: 'одна подушка', sections: 'по секциям' },
  legs: { hidden: 'скрытые', metal: 'металл', wood: 'дерево', plinth: 'цоколь', disc: 'диск-опора' },
  legFinish: { black: 'чёрный', gold: 'золотистый', oak: 'светлое дерево', walnut: 'орех', blackwood: 'тёмное дерево' },
  piping: { true: 'с кантом', false: 'без канта' },
  side: { left: 'угол слева', right: 'угол справа' },
};
export const VOCAB = {
  _: COMMON,
  corner: { form: { L: 'Г-образный', chaise: 'с шезлонгом' } },
  modular: { chaise: { none: 'без шезлонга', left: 'шезлонг слева', right: 'шезлонг справа' } },
  bed: {
    hbStyle: { plain: 'гладкое', channels: 'вертикальная простёжка', capitone: 'каретная стяжка', wings: 'с «ушками»' },
    base: { legs: 'ножки', plinth: 'цоколь' }, lift: { false: 'без механизма', true: 'подъёмный механизм' },
  },
  armchair: { form: { classic: 'классическое', round: 'округлое' } },
  pouf: { form: { round: 'круглый', square: 'квадратный', bench: 'банкетка' }, top: { smooth: 'гладкий', capitone: 'каретная стяжка' } },
};
export const optLabel = (type, key, value) => {
  const t = VOCAB[type] && VOCAB[type][key];
  const c = COMMON[key];
  return (t && t[String(value)]) || (c && c[String(value)]) || String(value);
};

const SOFAS = new Set(['sofa', 'corner', 'ushape', 'modular']);
const LOW_HIGH = { sofa: 0.80, corner: 0.80, ushape: 0.80, modular: 0.80, armchair: 0.85 };
export const backLook = (type, p) => (p.h < (LOW_HIGH[type] || 0.8) - 1e-9 ? 'низкая' : 'высокая');
const HBT = { plain: 0.08, channels: 0.10, capitone: 0.10, wings: 0.12 };

/* подушки сиденья — считаем по деталям модели (params.js → parts), один источник правды с 3D и чертежом */
export function seatCushions(type, p) {
  let items = [];
  try { items = partsOf(type, p).items; } catch (e) { return null; }
  const n = (re) => items.filter((i) => re.test(i.id)).length;
  return { main: n(/^seat-\d+$/), side: n(/^seat-2-\d+$/), left: n(/^seat-L-\d+$/), right: n(/^seat-R-\d+$/), corner: n(/^seat-c(-[lr])?$/), chaise: n(/^seat-ch$/) };
}
export function seatSections(type, p) { const c = seatCushions(type, p); return c ? c.main : 1; }
/* «по секциям (3)», «2 + угол + 1», «3 + шезлонг», «1 + угол + 2 + угол + 1» */
export function seatLine(type, p) {
  if (p.seatCushions === 'single') return 'одна подушка';
  const c = seatCushions(type, p); if (!c) return 'по секциям';
  if (type === 'corner' && p.form === 'chaise') return `по секциям (${c.main}) + шезлонг`;
  if (type === 'corner') return p.side === 'right' ? `по секциям: ${c.main} + угол + ${c.side}` : `по секциям: ${c.side} + угол + ${c.main}`;
  if (type === 'ushape') return `по секциям: ${c.left} + угол + ${c.main} + угол + ${c.right}`;
  return `по секциям (${c.main})`;
}

/* название варианта: «Диван угловой, угол слева» */
export function titleOf(type, p = {}) {
  if (!PDEF[type]) type = 'sofa';
  if (type === 'corner') return p.form === 'chaise' ? `Диван угловой с шезлонгом, шезлонг ${p.side === 'right' ? 'справа' : 'слева'}` : `Диван угловой, ${optLabel(type, 'side', p.side || 'left')}`;
  if (type === 'modular') return p.chaise && p.chaise !== 'none' ? `Модульный диван, ${optLabel(type, 'chaise', p.chaise)}` : 'Модульный диван';
  if (type === 'pouf') return p.form === 'bench' ? 'Банкетка' : `Пуф ${optLabel(type, 'form', p.form || 'round')}`;
  if (type === 'armchair' && p.form === 'round') return 'Кресло округлое';
  return TYPE_TITLES[type] || 'Изделие';
}

function legsLine(type, p) {
  const legs = p.legs;
  if (!legs || legs === 'hidden') return 'скрытые';
  if (legs === 'plinth') return `цоколь, ${fmtCm(p.legH)} см`;
  return [optLabel(type, 'legs', legs), p.legFinish ? optLabel(type, 'legFinish', p.legFinish) : '', p.legH ? `${fmtCm(p.legH)} см` : ''].filter(Boolean).join(', ');
}
function armsLine(type, p) {
  if (!p.armStyle || p.armStyle === 'none') return 'без подлокотников';
  return `${optLabel(type, 'armStyle', p.armStyle)}, ${fmtCm(p.armW)} см, высота ${fmtCm(p.armH)} см`;
}
export function fabricLine(f) {
  if (!f || !f.typeId) return 'подберём вместе';
  /* вид — как на карточке коллекции («микровелюр», «велюр в рубчик»), иначе тип; «экокожа Экокожа» не пишем */
  const kind = String(f.kindTitle && !/:/.test(f.kindTitle) ? f.kindTitle : f.typeTitle || '').toLowerCase();
  const name = String(f.collectionTitle || '').toLowerCase() === kind ? kind : `${kind} ${f.collectionTitle}`.trim();
  /* код цвета («№ 238», «FL 100») — без «№» и кавычек, как на сайте; название — в кавычках */
  const col = String(f.colour || '').replace(/^№\s*/, '');
  const colTxt = /\d/.test(col) ? col : `«${col}»`;
  return `${name}, цвет ${colTxt}${f.finish ? `, отделка ${String(f.finish).toLowerCase()}` : ''}`;
}

/* строки итога — те же в «Итоге», в WhatsApp и в таблице чертежа: [{ label, value }]
   opts.dims — dims(type, params) в метрах (габарит), иначе считаем сами где можем */
export function summaryLines(state, { dims = null } = {}) {
  const t = state.type, p = state.params || {};
  const L = [];
  const add = (label, value) => { if (value !== undefined && value !== null && value !== '') L.push({ label, value }); };
  const H = `высота ${fmtCm(p.h)} см`;
  if (t === 'sofa') add('Размер', `ширина ${fmtCm(p.w)} см, глубина ${fmtCm(p.d)} см, ${H}`);
  if (t === 'corner' || t === 'ushape') add('Размер', `${fmtCm(p.w)} × ${fmtCm(p.l)} см, глубина ${fmtCm(p.d)} см, ${H}`);
  if (t === 'modular') {
    const armW = p.armStyle === 'none' ? 0 : (p.armW || 0);
    const w = dims ? dims.w : (p.modules || 0) * (p.moduleW || 0) + 2 * armW;
    add('Модули', `${p.modules} × ${fmtCm(p.moduleW)} см`);
    add('Размер', `ширина ${fmtCm(w)} см, глубина ${fmtCm(p.d)} см, ${H}`);
    if (p.chaise && p.chaise !== 'none') add('Шезлонг', `${p.chaise === 'left' ? 'слева' : 'справа'}, глубина ${fmtCm(p.chaiseL)} см`);
  }
  if (t === 'corner' && p.form === 'chaise') add('Шезлонг', `длина ${fmtCm(p.l)} см, ширина ${fmtCm(p.chaiseW)} см`);
  if (SOFAS.has(t) || t === 'armchair') {
    if (t === 'armchair') { add('Форма', optLabel(t, 'form', p.form || 'classic')); add('Размер', `ширина ${fmtCm(p.w)} см, глубина ${fmtCm(p.d)} см, ${H}`); }
    add('Посадка', `высота ${fmtCm(p.seatH)} см, глубина ${fmtCm(p.seatD)} см`);
    add('Подлокотники', t === 'armchair' && p.form === 'round' ? `округлая оболочка, толщина ${fmtCm(Math.max(0.10, p.armW || 0.15))} см, высота спереди ${fmtCm(p.armH)} см` : armsLine(t, p));
    add('Спинка', `${backLook(t, p)}, ${optLabel(t, 'backCushions', t === 'armchair' && p.form === 'round' ? 'fixed' : p.backCushions)}`);
    if (t !== 'armchair' && t !== 'modular' && p.seatCushions) add('Сиденье', seatLine(t, p));
    add('Ножки', legsLine(t, p));
    add('Кант', p.piping ? 'есть' : 'нет');
  }
  if (t === 'bed') {
    const hbT = HBT[p.hbStyle] || 0.10;
    const W = dims ? dims.w : p.mw + 2 * p.frameT + 2 * (p.hbOver || 0);
    const Lg = dims ? dims.d : p.ml + p.frameT + hbT;
    add('Матрас', `${fmtCm(p.mw)} × ${fmtCm(p.ml)} см`);
    add('Размер', `${fmtCm(W)} × ${fmtCm(Lg)} см, высота изголовья ${fmtCm(p.hbH)} см`);
    add('Изголовье', `${optLabel(t, 'hbStyle', p.hbStyle)}, высота ${fmtCm(p.hbH)} см${p.hbOver ? `, выступ ${fmtCm(p.hbOver)} см` : ''}`);
    add('Царга', `высота ${fmtCm(p.railH)} см, боковина ${fmtCm(p.frameT)} см`);
    add('Основание', p.base === 'legs' ? `ножки, ${optLabel(t, 'legFinish', p.legFinish)}, ${fmtCm(p.legH)} см` : 'цоколь');
    if (p.lift) add('Подъёмный механизм', 'обсудим');
    add('Кант', p.piping ? 'есть' : 'нет');
  }
  if (t === 'pouf') {
    add('Форма', optLabel(t, 'form', p.form));
    add('Размер', p.form === 'round' ? `Ø ${fmtCm(p.w)} см, ${H}` : `${fmtCm(p.w)} × ${fmtCm(p.form === 'square' ? p.w : p.d)} см, ${H}`);
    add('Верх', optLabel(t, 'top', p.top));
    add('Ножки', legsLine(t, p));
    add('Кант', p.piping ? 'есть' : 'нет');
  }
  add('Ткань', fabricLine(state.fabric));
  add('Количество', String(state.qty || 1));
  const note = String(state.note || '').trim();
  if (note) add('Пожелание', note);
  return L;
}

/* текст для WhatsApp (SPEC §3.4) */
export function waText(state, { link = '', drawingLater = false, dims = null, id = '' } = {}) {
  const lines = ['Здравствуйте! Вариант из конструктора RICCA — рассчитайте, пожалуйста, стоимость.', ''];
  lines.push(`${titleOf(state.type, state.params)} · № ${id || cfgId(state)}`);
  for (const r of summaryLines(state, { dims })) lines.push(`${r.label}: ${r.value}`);
  if (link && /^https?:/.test(link)) lines.push(`Вариант: ${link}`);
  if (drawingLater) lines.push('Чертёж прикреплю картинкой.');
  return lines.join('\n');
}

/* «Нужен другой размер?» — сообщение с текущим размером и тем, что клиент ввёл (в том числе то, что форма не приняла):
   wanted = [{ label: 'Длина вдоль спинки', cm: 900 }] */
export function waSizeText(state, { link = '', id = '', dims = null, wanted = [] } = {}) {
  const now = dims ? `Сейчас: ${fmtCm(dims.w)} × ${fmtCm(dims.d)} × ${fmtCm(dims.h)} см.` : '';
  const need = (wanted || []).filter((x) => x && x.label && Number.isFinite(x.cm)).map((x) => `${x.label.toLowerCase()} ${String(x.cm).replace('.', ',')} см`);
  return [`Здравствуйте! Нужен другой размер — ${titleOf(state.type, state.params).toLowerCase()}, № ${id || cfgId(state)}.`, now,
    need.length ? `Нужно: ${need.join(', ')}.` : '',
    link && /^https?:/.test(link) ? `Вариант: ${link}` : ''].filter(Boolean).join('\n');
}

/* ---------- комната: #room=v1~W.450~L.380~H.270[~wc.graphite~fl.concrete]~i.sofa:0,-120,0[:pairs!…] ----------
   wc — цвет стен, fl — пол (room.js → WALLS / FLOORS); по умолчанию (молочный, светлый дуб) не пишем */
export function encodeRoom(room, { defaults = null } = {}) {
  const out = ['v1', `W.${toCm(room.W)}`, `L.${toCm(room.L)}`, `H.${toCm(room.H)}`];
  if (room.wall && room.wall !== 'milk') out.push(`wc.${enc(room.wall)}`);
  if (room.floor && room.floor !== 'oak') out.push(`fl.${enc(room.floor)}`);
  for (const it of room.items || []) {
    let s = `i.${it.type}:${toCm(it.x)},${toCm(it.z)},${Math.round(it.rot || 0)}`;
    if (it.params || it.fabric) {
      const enc1 = encodeCfg({ type: it.type, params: it.params || {}, fabric: it.fabric }, { defaults: defaults && defaults[it.type], withQty: false, withNote: false });
      const pairs = enc1.split('~').slice(2).join('!');
      if (pairs) s += `:${pairs}`;
    }
    out.push(s);
  }
  return out.join('~');
}
export function decodeRoom(str, { defaults = null } = {}) {
  let s = String(str || '').replace(/^#/, '');
  if (s.startsWith('room=')) s = s.slice(5);
  const room = { W: 4.5, L: 3.8, H: 2.7, items: [] };
  for (const p of s.split('~')) {
    const i = p.indexOf('.'); if (i < 1) continue;
    const k = p.slice(0, i), v = p.slice(i + 1);
    if (k === 'W' || k === 'L' || k === 'H') { const n = parseFloat(v); if (n > 0) room[k] = n / 100; continue; }
    if (k === 'wc' || k === 'fl') { const id = decodeURIComponent(v); if (/^[a-z]+$/.test(id)) room[k === 'wc' ? 'wall' : 'floor'] = id; continue; }
    if (k !== 'i') continue;
    const [type, pos = '', pairs = ''] = v.split(':');
    const [x = 0, z = 0, rot = 0] = pos.split(',').map((n) => parseFloat(n) || 0);
    const dec = decodeCfg(`v1~t.${type}${pairs ? '~' + pairs.split('!').join('~') : ''}`, { defaults });
    room.items.push({ type, x: x / 100, z: z / 100, rot, params: dec.params, fabricRef: dec.fabricRef });
  }
  return room;
}
export function roomText(room, { link = '', dimsOf = null } = {}) {
  const lines = [`Здравствуйте! План комнаты из конструктора RICCA: ${fmtM(room.W)} × ${fmtM(room.L)} м`];
  for (const it of room.items || []) {
    const d = dimsOf ? dimsOf(it) : null;
    lines.push(`${titleOf(it.type, it.params || {})}${d ? ` ${fmtCm(d.w)} × ${fmtCm(d.d)} см` : ''}`);
  }
  if (link && /^https?:/.test(link)) lines.push(`План: ${link}`);
  return lines.join('\n');
}
