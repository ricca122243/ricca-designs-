/* RICCA · конструктор — проверка параметров (pure: без three.js и DOM, работает под node).
   validate(type, params) → { params, notes, errors, fieldNotes }   (SPEC §7.3)
   Порядок: normalize → жёсткие пределы (ошибка, значение не применяется) → согласование размеров
   (автоисправление + короткая заметка) → «нестандартный размер» для значений вне диапазона интерфейса.
   Единицы: метры. Заметки — по-русски, в сантиметрах. */

import { normalize, RANGES, DEFAULTS, rangeOf, dims as dimsOf, ARMW_BY_STYLE, HIDDEN_LEG_H } from './params.js';

export const MSG_HARD = 'Такой размер не подходит для одного изделия — напишите нам, обсудим.';
export const MSG_NONSTD = 'Нестандартный размер — уточним с мастером';

const EPS = 1e-6;
const r3 = (v) => Math.round(v * 1000) / 1000;                 // до миллиметра
const fmt = (m) => String(Math.round(m * 1000) / 10).replace('.', ',');
const cmTxt = (m) => `${fmt(m)} см`;
const SOFA_FAMILY = new Set(['sofa', 'corner', 'ushape', 'modular']);
const COUNT = new Set(['qty', 'sections', 'modules']);
/* габаритные величины: 30–600 см (высота до 250) */
const OVERALL = new Set(['w', 'd', 'l', 'h', 'mw', 'ml', 'hbH', 'chaiseL', 'moduleW']);
/* величины, которые могут быть нулём */
const ZERO_OK = new Set(['hbOver', 'armW']);

const NAMES = {
  w: 'Ширина', d: 'Глубина', l: 'Длина второй стороны', h: 'Высота', seatH: 'Высота сиденья', seatD: 'Глубина сиденья',
  armW: 'Ширина подлокотника', armH: 'Высота подлокотника', legH: 'Высота ножек', chaiseW: 'Ширина шезлонга', chaiseL: 'Глубина шезлонга',
  moduleW: 'Ширина модуля', mw: 'Ширина матраса', ml: 'Длина матраса', hbH: 'Высота изголовья', hbOver: 'Выступ изголовья',
  frameT: 'Боковина', railH: 'Высота царги', topT: 'Толщина столешницы', legW: 'Сечение ножки', legInset: 'Отступ ножки',
};

/* допустимые значения опций по типам (неизвестное → значение по умолчанию) */
const ARM = ['none', 'thin', 'wide', 'round'];
const LEGS4 = ['hidden', 'metal', 'wood', 'plinth'];
const SOFA_ENUM = { armStyle: ARM, backCushions: ['fixed', 'loose'], seatCushions: ['single', 'sections'], legs: LEGS4 };
const ENUMS = {
  sofa: SOFA_ENUM,
  corner: { ...SOFA_ENUM, side: ['left', 'right'], form: ['L', 'chaise'] },
  ushape: SOFA_ENUM,
  modular: { armStyle: ARM, backCushions: ['fixed', 'loose'], legs: LEGS4, chaise: ['none', 'left', 'right'] },
  bed: { hbStyle: ['plain', 'channels', 'capitone', 'wings'], base: ['legs', 'plinth'] },
  armchair: { form: ['classic', 'round'], armStyle: ARM, backCushions: ['fixed', 'loose'], legs: LEGS4 },
  chair: { arms: ['none', 'thin'], backShape: ['straight', 'rounded'], legs: ['wood', 'metal'] },
  table: { shape: ['rect', 'round', 'oval'], top: ['wood', 'stone'], base: ['four', 'pedestal'], legs: ['wood', 'metal'] },
  pouf: { form: ['round', 'square', 'bench'], top: ['smooth', 'capitone'], legs: LEGS4 },
};
const METAL = ['black', 'gold'], WOOD = ['oak', 'walnut', 'blackwood'], STONE = ['light', 'grey', 'dark'];

/* производные ключи (их пересчитывает normalize) */
const DERIVED = { bed: ['w', 'd', 'h', 'hbT'], modular: ['w'], chair: ['seatD', 'armH'], table: ['d'], pouf: ['d'] };

/* толщина подушки сиденья (как params.js) */
function seatCushionT(type, p) {
  if (type === 'armchair') return 0.14;
  if (type === 'modular') return 0.16;
  return p.seatCushions === 'single' ? 0.16 : 0.15;
}
function armWidth(p) { return p.armStyle === 'none' ? 0 : (p.armW || 0); }

export function validate(type, params = {}) {
  if (!DEFAULTS[type]) type = 'sofa';
  const raw = params || {};
  const p = normalize(type, raw);
  const D = DEFAULTS[type];
  const notes = [], errors = [], fieldNotes = {};
  const note = (key, text) => { if (!notes.includes(text)) notes.push(text); if (key && !fieldNotes[key]) fieldNotes[key] = text; };
  const fail = (key, text = MSG_HARD) => { if (!errors.includes(text)) errors.push(text); if (key) fieldNotes[key] = text; };
  const set = (key, v) => { p[key] = r3(v); };

  /* ---------- 0. опции ---------- */
  const en = ENUMS[type] || {};
  for (const k of Object.keys(en)) if (!en[k].includes(p[k])) p[k] = D[k];
  if ('legFinish' in p) {
    const pool = type === 'bed' ? WOOD : p.legs === 'metal' ? METAL : p.legs === 'wood' ? WOOD : null;
    if (pool && !pool.includes(p.legFinish)) p.legFinish = pool[0];
  }
  if (type === 'table') { const pool = p.top === 'stone' ? STONE : WOOD; if (!pool.includes(p.topTone)) p.topTone = pool[0]; }
  if (SOFA_FAMILY.has(type) && p.sections !== 'auto') {
    const n = Math.round(+p.sections);
    p.sections = Number.isFinite(n) && n >= 1 ? n : 'auto';
  }
  if ('armStyle' in p) {
    if (p.armStyle === 'none') p.armW = 0;
    else if (!(p.armW > 0)) p.armW = ARMW_BY_STYLE[p.armStyle].def;
  }
  p.qty = Math.min(999, Math.max(1, Math.round(+p.qty || 1)));

  /* ---------- 1. жёсткие пределы: ошибка, значение не применяется (берём значение по умолчанию) ---------- */
  for (const k of Object.keys(p)) {
    const v = p[k], def = D[k];
    if (typeof def !== 'number' || COUNT.has(k)) continue;
    if (type === 'modular' && k === 'w') continue;                  // выводится
    if (type === 'bed' && (k === 'w' || k === 'd' || k === 'h')) continue;
    if (type === 'chair' && (k === 'seatD' || k === 'armH')) continue;
    if (k === 'armW' && p.armStyle === 'none') continue;
    if (k === 'legH' && p.legs === 'hidden' && type !== 'bed') { p.legH = HIDDEN_LEG_H; continue; }
    let bad = typeof v !== 'number' || !Number.isFinite(v) || v < 0;
    if (!bad && !ZERO_OK.has(k) && v < 0.02 - EPS) bad = true;
    if (!bad && OVERALL.has(k) && (v < 0.30 - EPS || v > 6.00 + EPS)) bad = true;
    if (!bad && (k === 'h' || k === 'hbH') && v > 2.50 + EPS) bad = true;
    if (!bad && !OVERALL.has(k) && v > 2.50 + EPS) bad = true;
    if (bad) { fail(k); p[k] = def; }
  }
  if (type === 'modular') {
    if (!(p.modules >= 1) || p.modules > 12) { fail('modules'); p.modules = D.modules; }
    p.w = r3(p.modules * p.moduleW + 2 * armWidth(p));
  }

  /* ---------- 2. согласование ---------- */
  if (SOFA_FAMILY.has(type) || type === 'armchair') sofaRules(type, p, raw, note, fail, set);
  if (type === 'bed') bedRules(p, raw, note, fail, set);
  if (type === 'chair') chairRules(p, note, set);
  if (type === 'table') tableRules(p, raw, note, fail, set);
  if (type === 'pouf') poufRules(p, note, set);

  /* производные — пересчитываем после исправлений */
  const pn = normalize(type, p);
  for (const k of DERIVED[type] || []) p[k] = typeof pn[k] === 'number' ? r3(pn[k]) : pn[k];

  /* ---------- 3. общий габарит ---------- */
  if (!errors.length) {
    let g = null;
    try { g = dimsOf(type, p); } catch (e) { g = null; }
    if (!g || [g.w, g.d, g.h].some((v) => !Number.isFinite(v))) fail(null);
    else if (Math.max(g.w, g.d) > 6.00 + EPS || g.h > 2.50 + EPS || Math.max(g.w, g.d) < 0.30 - EPS) fail(type === 'modular' ? 'moduleW' : type === 'bed' ? 'mw' : 'w');
  }

  /* ---------- 4. вне диапазона интерфейса (в пределах допустимого) ---------- */
  for (const k of Object.keys(RANGES[type] || {})) {
    if (COUNT.has(k) || fieldNotes[k] || skipRange(type, k, p)) continue;
    const v = p[k];
    if (typeof v !== 'number') continue;
    const rg = rangeOf(type, k, p);
    if (!rg || typeof rg.min !== 'number') continue;
    if (v < rg.min - EPS || v > rg.max + EPS) {
      fieldNotes[k] = MSG_NONSTD;
      const t = `${NAMES[k] || 'Размер'} ${cmTxt(v)}: нестандартный размер — уточним с мастером`;
      if (!notes.includes(t)) notes.push(t);
    }
  }
  if (p.qty > 30 && !fieldNotes.qty) fieldNotes.qty = 'Большое количество — уточним с мастером';

  return { params: p, notes, errors, fieldNotes };
}

/* ключи, которые сейчас не действуют (не проверяем диапазон) */
function skipRange(type, k, p) {
  if (k === 'armW') return p.armStyle === 'none';
  if (k === 'legH') return type !== 'bed' && p.legs === 'hidden';
  if (k === 'legW' || k === 'legInset') return p.base !== 'four';
  if (k === 'chaiseW') return p.form !== 'chaise';
  if (k === 'chaiseL') return p.chaise === 'none';
  if (k === 'd') return (type === 'table' && p.shape === 'round') || (type === 'pouf' && p.form !== 'bench');
  if (k === 'w') return type === 'modular';
  return false;
}

/* ---------- семейство диванов и кресло ---------- */
function sofaRules(type, p, raw, note, fail, set) {
  const arm = () => armWidth(p);
  const cT = seatCushionT(type, p);
  const minBack = type === 'armchair' ? 0.15 : 0.14;

  if (type === 'armchair' && p.form === 'round' && raw.armStyle === 'none') note('armStyle', 'Округлое кресло — только с подлокотниками: оболочка обнимает сиденье');

  /* модульный: длина модулей и шезлонг */
  if (type === 'modular') {
    if (p.modules * p.moduleW < 1.20 - EPS) {
      set('moduleW', Math.ceil((1.20 / p.modules) * 100) / 100);
      if (p.moduleW > 6.00) fail('modules');
      else note('moduleW', `Ширина модуля увеличена до ${cmTxt(p.moduleW)} — сиденья вместе не меньше 120 см`);
    }
    if (p.chaise !== 'none' && p.chaiseL < p.d + 0.40 - EPS) { set('chaiseL', p.d + 0.40); note('chaiseL', `Глубина шезлонга увеличена до ${cmTxt(p.chaiseL)} — на 40 см больше глубины дивана`); }
  }

  /* спинка: толщина 14 (15) … 45 см */
  if (p.seatD > p.d - minBack + EPS) { set('seatD', p.d - minBack); note('seatD', `Глубина сиденья уменьшена до ${cmTxt(p.seatD)}, чтобы поместилась спинка`); }
  if (p.d - p.seatD > 0.45 + EPS) { set('seatD', p.d - 0.45); note('seatD', `Глубина сиденья увеличена до ${cmTxt(p.seatD)} — спинка не толще 45 см`); }

  /* высота сиденья: под подушкой рама не ниже 10 см над ножками */
  const legsVisible = p.legs !== 'hidden';
  const legH = legsVisible ? p.legH : HIDDEN_LEG_H;
  if (p.seatH < legH + 0.10 + cT - EPS) {
    if (legsVisible && p.seatH - 0.10 - cT >= 0.04 - EPS) {
      set('legH', p.seatH - 0.10 - cT);
      note('legH', `${p.legs === 'plinth' ? 'Цоколь уменьшен' : 'Ножки уменьшены'} до ${cmTxt(p.legH)}, чтобы сиденье осталось на высоте ${cmTxt(p.seatH)}`);
    } else {
      if (legsVisible) set('legH', 0.04);
      set('seatH', (legsVisible ? 0.04 : HIDDEN_LEG_H) + 0.10 + cT);
      note('seatH', `Высота сиденья увеличена до ${cmTxt(p.seatH)} — под подушкой нужна рама`);
    }
  }
  /* спинка выше сиденья хотя бы на 25 см */
  if (p.h < p.seatH + 0.25 - EPS) { set('h', p.seatH + 0.25); note('h', `Высота увеличена до ${cmTxt(p.h)} — спинка выше сиденья хотя бы на 25 см`); }
  /* подлокотник: выше сиденья на 10 см и не выше спинки */
  if (arm() > 0) {
    if (p.armH < p.seatH + 0.10 - EPS) { set('armH', p.seatH + 0.10); note('armH', `Высота подлокотника поднята до ${cmTxt(p.armH)} — выше сиденья на 10 см`); }
    if (p.armH > p.h + EPS) { set('armH', p.h); note('armH', `Высота подлокотника уменьшена до ${cmTxt(p.armH)} — не выше спинки`); }
  }

  /* габарит в плане */
  if (type === 'corner') {
    if (p.form === 'L') {
      const need = p.d + arm() + 0.60;
      if (p.w < need - EPS) { set('w', need); note('w', `Длина дивана увеличена до ${cmTxt(p.w)} — иначе не поместится сиденье у угла`); }
      const needL = p.d + arm() + 0.50;
      if (p.l < needL - EPS) { set('l', needL); note('l', `Вторая сторона увеличена до ${cmTxt(p.l)} — иначе не поместится сиденье`); }
    } else {
      const needL = p.d + 0.45;
      if (p.l < needL - EPS) { set('l', needL); note('l', `Длина шезлонга увеличена до ${cmTxt(p.l)} — на 45 см больше глубины дивана`); }
      const minCW = arm() + 0.50;
      if (p.chaiseW < minCW - EPS) { set('chaiseW', minCW); note('chaiseW', `Ширина шезлонга увеличена до ${cmTxt(p.chaiseW)} — сиденье шезлонга не уже 50 см`); }
      const maxCW = Math.min(p.w - p.d, p.w - arm() - 0.60);
      if (p.chaiseW > maxCW + EPS) {
        if (maxCW < minCW - EPS) fail('chaiseW', 'Для шезлонга такой ширины диван слишком короткий — увеличьте длину или напишите нам.');
        else { set('chaiseW', maxCW); note('chaiseW', `Ширина шезлонга уменьшена до ${cmTxt(p.chaiseW)} — иначе не поместится основное сиденье`); }
      }
    }
  }
  if (type === 'ushape') {
    const need = 2 * p.d + 0.60;
    if (p.w < need - EPS) { set('w', need); note('w', `Ширина увеличена до ${cmTxt(p.w)} — между сторонами нужно не меньше 60 см`); }
    const needL = p.d + arm() + 0.50;
    if (p.l < needL - EPS) { set('l', needL); note('l', `Длина сторон увеличена до ${cmTxt(p.l)} — иначе не поместится сиденье`); }
  }
  if (type === 'sofa' || type === 'armchair') {
    const minInner = type === 'sofa' ? 0.60 : 0.36;   // кресло: §7.3 даёт 45, но умолчания A (82 − 2·22 = 38) — берём 36
    const roundShell = type === 'armchair' && p.form === 'round';
    const a = roundShell ? Math.max(0.10, arm()) : arm();
    if (p.w - 2 * a < minInner - EPS) {
      const fit = Math.floor(((p.w - minInner) / 2) * 1000) / 1000;
      const minA = roundShell ? 0.10 : 0.06;
      if (arm() > 0 && fit >= minA - EPS) { set('armW', fit); note('armW', `Подлокотники сужены до ${cmTxt(p.armW)} — сиденье не уже ${cmTxt(minInner)}`); }
      else if (arm() === 0 && p.w >= minInner - EPS) { /* без подлокотников помещается */ }
      else fail('w', `При ширине ${cmTxt(p.w)} не помещаются ${arm() > 0 ? 'подлокотники и ' : ''}сиденье — нужно не меньше ${cmTxt(minInner + (arm() > 0 ? 2 * minA : 0))}.`);
    }
  }

  /* секции сиденья: каждая не уже 45 см */
  if (SOFA_FAMILY.has(type) && type !== 'modular' && p.seatCushions === 'sections' && p.sections !== 'auto') {
    const wi = type === 'sofa' ? p.w - 2 * arm()
      : type === 'ushape' ? p.w - 2 * p.d
        : p.form === 'chaise' ? p.w - p.chaiseW - arm() : p.w - p.d - arm();
    const max = Math.max(1, Math.floor(wi / 0.45 + EPS));
    if (p.sections > max) { p.sections = max; note('sections', `Секций сиденья: ${max} — каждая не уже 45 см`); }
  }
}

/* ---------- кровать ---------- */
function bedRules(p, raw, note, fail, set) {
  if (p.hbStyle === 'wings' && p.hbOver < 0.08 - EPS) { set('hbOver', 0.08); note('hbOver', `Выступ изголовья увеличен до ${cmTxt(p.hbOver)} — для «ушек» нужно не меньше 8 см`); }
  /* ножки/цоколь ниже царги хотя бы на 15 см */
  if (p.legH > p.railH - 0.15 + EPS) {
    if (p.railH - 0.15 >= 0.04 - EPS) { set('legH', p.railH - 0.15); note('legH', `${p.base === 'legs' ? 'Ножки уменьшены' : 'Цоколь уменьшен'} до ${cmTxt(p.legH)} — царга выше на 15 см`); }
    else { set('legH', 0.04); set('railH', 0.19); note('railH', `Высота царги увеличена до ${cmTxt(p.railH)} — под ней ${p.base === 'legs' ? 'ножки' : 'цоколь'}`); }
  }
  /* изголовье выше матраса хотя бы на 30 см (верх матраса = царга + 12 см) */
  const minHb = p.railH + 0.12 + 0.30;
  if (p.hbH < minHb - EPS) { set('hbH', minHb); note('hbH', `Высота изголовья увеличена до ${cmTxt(p.hbH)} — выше матраса на 30 см`); }
}

/* ---------- стул ---------- */
function chairRules(p, note, set) {
  if (p.seatH < 0.30 - EPS) { set('seatH', 0.30); note('seatH', `Высота сиденья увеличена до ${cmTxt(p.seatH)}`); }
  if (p.arms === 'thin' && p.seatH > 0.54 + EPS) { set('seatH', 0.54); note('seatH', `Высота сиденья уменьшена до ${cmTxt(p.seatH)} — подлокотники полукресла на высоте 64 см`); }
  const minH = Math.max(p.seatH + 0.30, p.arms === 'thin' ? 0.70 : 0);
  if (p.h < minH - EPS) { set('h', minH); note('h', `Высота увеличена до ${cmTxt(p.h)} — спинка выше сиденья хотя бы на 30 см`); }
}

/* ---------- стол ---------- */
function tableRules(p, raw, note, fail, set) {
  if (p.shape === 'round') p.d = p.w;
  if (p.shape === 'oval' && !(p.d < p.w - EPS)) {
    if (p.d > p.w + EPS) { const t = p.w; p.w = p.d; p.d = t; note('d', `Для овального стола ширина больше глубины — поменяли местами: ${fmt(p.w)} × ${fmt(p.d)} см`); }
    else { set('d', p.w - 0.10); note('d', `Овал с равными сторонами — это круг: глубина уменьшена до ${cmTxt(p.d)}`); }
  }
  if (p.h - p.topT < 0.30 - EPS) { set('h', p.topT + 0.30); note('h', `Высота стола увеличена до ${cmTxt(p.h)} — под столешницей нужно не меньше 30 см`); }
  if (p.base === 'four') {
    const minIns = r3(p.legW / 2 + 0.02);
    if (p.legInset < minIns - EPS) { set('legInset', minIns); note('legInset', `Отступ ножек увеличен до ${cmTxt(p.legInset)}`); }
    /* ножки под столешницей, между ними не меньше 10 см */
    let maxIns;
    if (p.shape === 'rect') maxIns = (Math.min(p.w, p.d) - 2 * p.legW - 0.10) / 2;
    else {
      /* ножки на вписанном квадрате: центр на радиусе r − отступ − ножка/2; зазор между ними ≥ 10 см */
      const rMin = Math.min(p.w, p.d) / 2;
      maxIns = rMin - p.legW / 2 - (0.10 + p.legW) / (2 * Math.SQRT1_2);
    }
    maxIns = Math.floor(maxIns * 1000) / 1000;
    if (p.legInset > maxIns + EPS) {
      if (maxIns < minIns - EPS) fail('legInset', 'Для такой столешницы ножки не помещаются — выберите опору или увеличьте размер.');
      else { set('legInset', maxIns); note('legInset', `Отступ ножек уменьшен до ${cmTxt(p.legInset)} — ножки должны стоять под столешницей`); }
    }
  }
}

/* ---------- пуф / банкетка ---------- */
function poufRules(p, note, set) {
  if (p.form !== 'bench') p.d = p.w;
  if (p.form === 'bench' && p.d > p.w / 2 + EPS) { set('d', Math.floor((p.w / 2) * 1000) / 1000); note('d', `Глубина банкетки уменьшена до ${cmTxt(p.d)} — не больше половины длины`); }
  if (p.legs !== 'hidden' && p.legH > p.h - 0.15 + EPS) {
    if (p.h - 0.15 >= 0.04 - EPS) { set('legH', p.h - 0.15); note('legH', `Ножки уменьшены до ${cmTxt(p.legH)} — мягкая часть не тоньше 15 см`); }
    else { set('legH', 0.04); set('h', 0.19); note('h', `Высота увеличена до ${cmTxt(p.h)}`); }
  }
  if (p.legs === 'hidden') p.legH = HIDDEN_LEG_H;
}

export default validate;
