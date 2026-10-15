/* RICCA · конструктор — проверка параметров (pure: без three.js и DOM, работает под node).
   validate(type, params) → { params, notes, errors, fieldNotes }   (SPEC §7.3)
   Порядок: normalize → жёсткие пределы (ошибка, значение не применяется) → согласование размеров
   (автоисправление + короткая заметка) → «нестандартный размер» для значений вне диапазона интерфейса.
   Единицы: метры. Заметки — по-русски, в сантиметрах. */

import { normalize, RANGES, DEFAULTS, rangeOf, dims as dimsOf, armDef, HIDDEN_LEG_H, LEGH_BY_KIND } from './params.js';

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
  frameT: 'Боковина', railH: 'Высота царги',
};
/* подписи, зависящие от типа и выбора: «Длина» у банкетки, «Диаметр» у круглого пуфа, «Высота цоколя» */
function nameOf(type, k, p) {
  if (k === 'legH' && (p.legs === 'plinth' || (type === 'bed' && p.base === 'plinth'))) return 'Высота цоколя';
  if (type === 'pouf' && k === 'w') return p.form === 'round' ? 'Диаметр' : p.form === 'bench' ? 'Длина' : 'Сторона';
  if (type === 'corner' && k === 'w') return 'Длина вдоль спинки';
  if (type === 'corner' && k === 'l') return p.form === 'chaise' ? 'Длина шезлонга' : 'Вторая сторона';
  if (type === 'ushape' && k === 'l') return 'Боковые стороны';
  return NAMES[k] || 'Размер';
}

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
  armchair: { form: ['classic', 'round'], armStyle: ARM, backCushions: ['fixed', 'loose'], legs: [...LEGS4, 'disc'] },
  pouf: { form: ['round', 'square', 'bench'], top: ['smooth', 'capitone'], legs: LEGS4 },
};
const METAL = ['black', 'gold'], WOOD = ['oak', 'walnut', 'blackwood'];

/* производные ключи (их пересчитывает normalize) */
const DERIVED = { bed: ['w', 'd', 'h', 'hbT'], modular: ['w'], pouf: ['d'] };

/* толщина подушки сиденья (как params.js) */
function seatCushionT(type, p) {
  if (type === 'armchair') return 0.14;
  if (type === 'modular') return 0.16;
  return p.seatCushions === 'single' ? 0.16 : 0.15;
}
function armWidth(p) { return p.armStyle === 'none' ? 0 : (p.armW || 0); }

export function validate(type, params = {}) {
  /* столы и стулья ателье не делает: неизвестный тип (старые ссылки) → диван по умолчанию */
  if (!DEFAULTS[type]) { type = 'sofa'; params = {}; }
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
    /* кровать: в «Форме» есть и дерево, и металл — металл раньше сбрасывался на дуб */
    const pool = type === 'bed' ? [...WOOD, ...METAL] : p.legs === 'metal' || p.legs === 'disc' ? METAL : p.legs === 'wood' ? WOOD : null;
    if (pool && !pool.includes(p.legFinish)) p.legFinish = pool[0];
  }
  if (SOFA_FAMILY.has(type) && p.sections !== 'auto') {
    const n = Math.round(+p.sections);
    p.sections = Number.isFinite(n) && n >= 1 ? n : 'auto';
  }
  if ('armStyle' in p) {
    if (p.armStyle === 'none') p.armW = 0;
    else if (!(p.armW > 0) || (raw.armStyle && raw.armW === undefined)) p.armW = armDef(type, p.armStyle);   // смена стиля → ширина по стилю
  }
  p.qty = Math.min(999, Math.max(1, Math.round(+p.qty || 1)));

  /* ---------- 1. жёсткие пределы: ошибка, значение не применяется (берём значение по умолчанию) ---------- */
  const hardBad = (k, v) => {
    if (typeof D[k] !== 'number' || COUNT.has(k)) return false;
    if (type === 'modular' && k === 'w') return false;                  // выводится
    if (type === 'bed' && (k === 'w' || k === 'd' || k === 'h')) return false;
    if (k === 'armW' && p.armStyle === 'none') return false;
    if (k === 'legH' && p.legs === 'hidden' && type !== 'bed') return false;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return true;
    if (!ZERO_OK.has(k) && v < 0.02 - EPS) return true;
    if (OVERALL.has(k) && (v < 0.30 - EPS || v > 6.00 + EPS)) return true;
    if (v > 2.50 + EPS && !(OVERALL.has(k) && k !== 'h' && k !== 'hbH')) return true;
    return false;
  };
  for (const k of Object.keys(p)) {
    if (k === 'legH' && p.legs === 'hidden' && type !== 'bed') { p.legH = HIDDEN_LEG_H; continue; }
    if (hardBad(k, p[k])) { fail(k); p[k] = D[k]; }
  }
  if (type === 'modular') {
    if (!(p.modules >= 1) || p.modules > 12) { fail('modules'); p.modules = D.modules; }
    p.w = r3(p.modules * p.moduleW + 2 * armWidth(p));
  }

  /* видимые ножки не ниже 4 см (иначе это «скрытые»): например, модульный с металлом из старой ссылки */
  if ('legs' in p && p.legs !== 'hidden' && type !== 'bed' && LEGH_BY_KIND[p.legs] && p.legH < 0.04 - EPS) {
    const rg = rangeOf(type, 'legH', p); set('legH', rg && rg.def >= 0.04 ? rg.def : LEGH_BY_KIND[p.legs].def);
    note('legH', `${p.legs === 'plinth' ? 'Цоколь' : 'Ножки'} ${cmTxt(p.legH)} — для видимых ${p.legs === 'plinth' ? 'цоколей' : 'ножек'}`);
  }

  /* ---------- 2. согласование ---------- */
  if (SOFA_FAMILY.has(type) || type === 'armchair') sofaRules(type, p, raw, note, fail, set);
  if (type === 'bed') bedRules(p, raw, note, fail, set);
  if (type === 'pouf') poufRules(p, note, set);

  /* производные — пересчитываем после исправлений */
  const pn = normalize(type, p);
  for (const k of DERIVED[type] || []) p[k] = typeof pn[k] === 'number' ? r3(pn[k]) : pn[k];

  /* ---------- 3. исправленные значения — снова в пределах; общий габарит ---------- */
  for (const k of Object.keys(p)) if (hardBad(k, p[k])) fail(k);
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
      const t = `${nameOf(type, k, p)} ${cmTxt(v)}: нестандартный размер — уточним с мастером`;
      if (!notes.includes(t)) notes.push(t);
    }
  }
  if (p.qty > 30 && !fieldNotes.qty) fieldNotes.qty = 'Большое количество — уточним с мастером';

  return { params: p, notes, errors, fieldNotes };
}

/* ключи, которые сейчас не действуют (не проверяем диапазон) */
function skipRange(type, k, p) {
  if (k === 'armW' || k === 'armH') return p.armStyle === 'none';
  if (k === 'legH') return type !== 'bed' && p.legs === 'hidden';
  if (k === 'chaiseW') return p.form !== 'chaise';
  if (k === 'chaiseL') return p.chaise === 'none';
  if (k === 'd') return type === 'pouf' && p.form !== 'bench';
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
    const minInner = type === 'sofa' ? 0.60 : 0.50;   // кресло: сиденье между подлокотниками не уже 50 см
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

  /* округлое кресло: подушка сиденья помещается в оболочку (глубина сиденья ≤ глубина − оболочка − 2 см) */
  if (type === 'armchair' && p.form === 'round') {
    const t = Math.max(0.10, arm() || 0.15), mx = p.d - t - 0.02;
    if (p.seatD > mx + EPS) { set('seatD', mx); note('seatD', `Глубина сиденья уменьшена до ${cmTxt(p.seatD)} — подушка внутри оболочки`); }
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
