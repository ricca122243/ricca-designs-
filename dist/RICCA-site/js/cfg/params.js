/* RICCA · конструктор — параметры изделий и детали (pure: без three.js и DOM, работает под node).
   Единый источник правды: parts() → items (тела) + dims (размерные линии для чертежа). 3D (furniture3d.js),
   dims(), чертёж (drawing.js) и тесты читают только отсюда. Единицы: метры, радианы.
   Оси: Y вверх, начало — центр пола под габаритом, фронт = +Z, левый край (для смотрящего) = −X. */

const cm = (v) => Math.round(v * 100) / 100;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const R = (min, max, def, step = 0.01) => ({ min, max, step, def });

export const TYPES = [
  { id: 'sofa', title: 'Диван прямой', category: 'sofas', tag: 'straight' },
  { id: 'corner', title: 'Диван угловой', category: 'sofas', tag: 'corner' },
  { id: 'ushape', title: 'Диван П-образный', category: 'sofas', tag: 'corner' },
  { id: 'modular', title: 'Модульный диван', category: 'sofas', tag: 'modular' },
  { id: 'bed', title: 'Кровать', category: 'beds' },
  { id: 'armchair', title: 'Кресло', category: 'armchairs' },
  { id: 'pouf', title: 'Пуф / банкетка', category: 'armchairs' },
];
const TITLE = Object.fromEntries(TYPES.map((t) => [t.id, t.title]));

export const OPTIONS = {
  armStyle: { none: 'без', thin: 'тонкие', wide: 'широкие', round: 'округлые' },
  backCushions: { fixed: 'цельная спинка', loose: 'съёмные подушки' },
  seatCushions: { single: 'одна подушка', sections: 'по секциям' },
  legs: { hidden: 'скрытые', metal: 'металл', wood: 'дерево', plinth: 'цоколь' },
  legFinish: { black: 'чёрный', gold: 'золотистый', oak: 'светлое дерево', walnut: 'орех', blackwood: 'тёмное дерево' },
  piping: { true: 'с кантом', false: 'без канта' },
  side: { left: 'угол слева', right: 'угол справа' },
  form: { L: 'Г-образный', chaise: 'с шезлонгом', classic: 'классическое', round: 'округлое', square: 'квадратный', bench: 'банкетка' },
  chaise: { none: 'без шезлонга', left: 'шезлонг слева', right: 'шезлонг справа' },
  hbStyle: { plain: 'гладкое', channels: 'вертикальная простёжка', capitone: 'каретная стяжка', wings: 'с «ушками»' },
  base: { legs: 'ножки', plinth: 'цоколь', four: 'четыре ножки', pedestal: 'опора' },
  lift: { false: 'без механизма', true: 'подъёмный механизм — обсудим' },
  top: { smooth: 'гладкий', capitone: 'каретная стяжка' },
};
export const METAL_FINISHES = ['black', 'gold'];
export const WOOD_FINISHES = ['oak', 'walnut', 'blackwood'];

/* подлокотник: ширина по стилю (у кресла округлые — свои, уже: сиденье не уже 50 см) */
export const ARMW_BY_STYLE = { none: R(0, 0, 0), thin: R(0.08, 0.16, 0.12), wide: R(0.18, 0.35, 0.24), round: R(0.16, 0.32, 0.22) };
export const ARMCHAIR_ROUND_ARMW = R(0.12, 0.22, 0.15);
/* высота ног по виду опоры */
export const LEGH_BY_KIND = { hidden: R(0.02, 0.02, 0.02), metal: R(0.08, 0.20, 0.12), wood: R(0.08, 0.20, 0.12), plinth: R(0.04, 0.12, 0.08) };
export const HIDDEN_LEG_H = 0.02;
export const HBT_BY_STYLE = { plain: 0.08, channels: 0.10, capitone: 0.10, wings: 0.12 };
export const SOFA_H_LOW = 0.74, SOFA_H_HIGH = 0.88, ARMCHAIR_H_LOW = 0.76, ARMCHAIR_H_HIGH = 1.00;
/* только мягкая мебель: столы и стулья ателье не делает (старые ссылки с ними открываются диваном) */
export const REMOVED_TYPES = ['chair', 'table'];

const SOFA_RANGES = {
  w: R(1.40, 4.00, 2.20), d: R(0.80, 1.20, 0.95), h: R(0.65, 1.10, 0.80), seatH: R(0.38, 0.52, 0.44), seatD: R(0.48, 0.75, 0.58),
  armW: ARMW_BY_STYLE.thin, armH: R(0.50, 0.75, 0.62), sections: R(1, 5, 'auto', 1), legH: LEGH_BY_KIND.metal, qty: R(1, 30, 1, 1),
};
export const RANGES = {
  sofa: { ...SOFA_RANGES },
  corner: { ...SOFA_RANGES, w: R(2.00, 4.20, 2.80), l: R(1.50, 3.50, 2.00), chaiseW: R(0.80, 1.10, 0.90) },
  ushape: { ...SOFA_RANGES, w: R(2.80, 5.00, 3.40), l: R(1.50, 3.00, 2.00), d: R(0.80, 1.10, 0.95) },
  modular: {
    modules: R(2, 6, 3, 1), moduleW: R(0.60, 1.20, 0.90), d: R(0.90, 1.20, 1.00), h: R(0.65, 0.90, 0.72), seatH: R(0.38, 0.48, 0.42),
    seatD: R(0.55, 0.80, 0.65), armW: ARMW_BY_STYLE.wide, armH: R(0.50, 0.70, 0.58), chaiseL: R(1.40, 2.00, 1.65),
    legH: LEGH_BY_KIND.hidden, qty: R(1, 30, 1, 1),
  },
  bed: {
    mw: R(0.80, 2.20, 1.60), ml: R(1.80, 2.20, 2.00), hbH: R(0.95, 1.60, 1.20), hbOver: R(0, 0.20, 0), frameT: R(0.04, 0.12, 0.06),
    railH: R(0.25, 0.45, 0.35), legH: R(0.04, 0.16, 0.10), qty: R(1, 30, 1, 1),
  },
  armchair: {
    w: R(0.70, 1.10, 0.84), d: R(0.75, 1.00, 0.86), h: R(0.70, 1.10, 0.80), seatH: R(0.38, 0.48, 0.42), seatD: R(0.46, 0.62, 0.56),
    armW: ARMCHAIR_ROUND_ARMW, armH: R(0.50, 0.70, 0.60), legH: R(0.08, 0.20, 0.14), qty: R(1, 30, 1, 1),
  },
  pouf: { w: R(0.40, 0.90, 0.55), d: R(0.35, 0.60, 0.45), h: R(0.38, 0.50, 0.44), legH: R(0.08, 0.16, 0.12), qty: R(1, 30, 1, 1) },
};
/* диапазоны, зависящие от выбранной формы (UI берёт отсюда) */
const ALT = {
  corner: { l: { L: R(1.50, 3.50, 2.00), chaise: R(1.40, 2.00, 1.65) } },
  pouf: { w: { round: R(0.40, 0.90, 0.55), square: R(0.40, 1.00, 0.60), bench: R(0.80, 2.00, 1.40) } },
};
export function rangeOf(type, key, params = {}) {
  const p = { ...DEFAULTS[type], ...params };
  if (key === 'armW') return type === 'armchair' && p.armStyle === 'round' ? ARMCHAIR_ROUND_ARMW : ARMW_BY_STYLE[p.armStyle] || RANGES[type].armW;
  if (key === 'legH') {
    if (type === 'bed') return p.base === 'plinth' ? R(0.04, 0.12, 0.10) : R(0.08, 0.16, 0.10);
    if (type === 'armchair' || type === 'pouf') return RANGES[type].legH || null;
    return LEGH_BY_KIND[p.legs] || RANGES[type].legH;
  }
  if (type === 'corner' && key === 'l') return ALT.corner.l[p.form] || RANGES.corner.l;
  if (type === 'pouf' && key === 'w') return ALT.pouf.w[p.form] || RANGES.pouf.w;
  return RANGES[type] && RANGES[type][key] ? RANGES[type][key] : null;
}

const SOFA_DEF = {
  w: 2.20, d: 0.95, h: 0.80, seatH: 0.44, seatD: 0.58, armStyle: 'thin', armW: 0.12, armH: 0.62, backCushions: 'loose',
  seatCushions: 'sections', sections: 'auto', legs: 'metal', legFinish: 'black', legH: 0.12, piping: false, qty: 1,
};
export const DEFAULTS = {
  sofa: { ...SOFA_DEF },
  corner: { ...SOFA_DEF, side: 'left', form: 'L', w: 2.80, l: 2.00, chaiseW: 0.90 },
  ushape: { ...SOFA_DEF, w: 3.40, l: 2.00, d: 0.95 },
  modular: {
    modules: 3, moduleW: 0.90, d: 1.00, h: 0.72, seatH: 0.42, seatD: 0.65, armStyle: 'wide', armW: 0.24, armH: 0.58,
    backCushions: 'loose', chaise: 'none', chaiseL: 1.65, legs: 'hidden', legFinish: 'black', legH: 0.02, piping: false, qty: 1,
  },
  bed: {
    mw: 1.60, ml: 2.00, hbStyle: 'channels', hbH: 1.20, hbOver: 0, frameT: 0.06, railH: 0.35, base: 'plinth', legFinish: 'oak',
    legH: 0.10, lift: false, piping: false, qty: 1,
  },
  armchair: {
    form: 'classic', w: 0.84, d: 0.86, h: 0.80, seatH: 0.42, seatD: 0.56, armStyle: 'round', armW: 0.15, armH: 0.60,
    backCushions: 'loose', legs: 'wood', legFinish: 'oak', legH: 0.14, piping: false, qty: 1,
  },
  pouf: { form: 'round', w: 0.55, d: 0.55, h: 0.44, top: 'smooth', legs: 'hidden', legFinish: 'oak', legH: 0.02, piping: true, qty: 1 },
};

export const PRESETS = {
  sofa: [{ label: '180', params: { w: 1.80 } }, { label: '220', params: { w: 2.20 } }, { label: '260', params: { w: 2.60 } }],
  corner: [{ label: '240×160', params: { w: 2.40, l: 1.60 } }, { label: '280×200', params: { w: 2.80, l: 2.00 } }, { label: '320×220', params: { w: 3.20, l: 2.20 } }],
  ushape: [{ label: '300×180', params: { w: 3.00, l: 1.80 } }, { label: '340×200', params: { w: 3.40, l: 2.00 } }, { label: '400×240', params: { w: 4.00, l: 2.40 } }],
  modular: [
    { label: '3 × 90', params: { modules: 3, moduleW: 0.90, chaise: 'none' } },
    { label: '4 × 90', params: { modules: 4, moduleW: 0.90, chaise: 'none' } },
    { label: '3 × 100 + шезлонг', params: { modules: 3, moduleW: 1.00, chaise: 'right' } },
  ],
  bed: [{ label: '140×200', params: { mw: 1.40, ml: 2.00 } }, { label: '160×200', params: { mw: 1.60, ml: 2.00 } }, { label: '180×200', params: { mw: 1.80, ml: 2.00 } }],
  armchair: [{ label: 'Низкая спинка', params: { h: ARMCHAIR_H_LOW } }, { label: '80', params: { h: 0.80 } }, { label: 'Высокая спинка', params: { h: ARMCHAIR_H_HIGH } }],
  pouf: [{ label: 'Ø 45', params: { form: 'round', w: 0.45, d: 0.45 } }, { label: 'Ø 55', params: { form: 'round', w: 0.55, d: 0.55 } }, { label: 'Банкетка 140', params: { form: 'bench', w: 1.40, d: 0.45 } }],
};

const BSINK = 0.05; // подушки спинки утоплены в сиденье на 5 см (лежат на подушке сиденья, без щели под ними)
const SOFA_FAMILY = new Set(['sofa', 'corner', 'ushape', 'modular']);
const bool = (v) => v === true || v === 'true' || v === 1 || v === '1';

/* normalize: дополнить ключи из DEFAULTS и вывести производные (без ограничений по диапазону — это validate.js) */
/* armW по стилю: у кресла с округлыми — свой диапазон */
const armDef = (type, style) => (type === 'armchair' && style === 'round' ? ARMCHAIR_ROUND_ARMW.def : ARMW_BY_STYLE[style] ? ARMW_BY_STYLE[style].def : 0.12);
export { armDef };
export function normalize(type, params = {}) {
  if (!DEFAULTS[type]) { type = 'sofa'; params = {}; }
  const p = { ...DEFAULTS[type] };
  for (const k of Object.keys(params || {})) if (params[k] !== undefined && params[k] !== null && params[k] !== '') p[k] = params[k];
  for (const k of ['piping', 'lift']) if (k in p) p[k] = bool(p[k]);
  for (const k of Object.keys(p)) if (typeof DEFAULTS[type][k] === 'number' && typeof p[k] === 'string' && p[k] !== 'auto') { const n = parseFloat(String(p[k]).replace(',', '.')); p[k] = Number.isFinite(n) ? n : DEFAULTS[type][k]; }
  if ('armStyle' in p) {
    if (p.armStyle === 'none') p.armW = 0;
    else if (!(p.armW > 0)) p.armW = armDef(type, p.armStyle);
  }
  if (SOFA_FAMILY.has(type)) {
    if (p.legs === 'hidden') p.legH = HIDDEN_LEG_H;
    if (p.sections !== 'auto') { const n = parseInt(p.sections, 10); p.sections = Number.isFinite(n) ? n : 'auto'; }
  }
  if (type === 'modular') { p.modules = Math.round(p.modules); p.w = cm(p.modules * p.moduleW + 2 * p.armW); }
  if (type === 'bed') {
    p.hbT = HBT_BY_STYLE[p.hbStyle] || 0.10;
    if (p.hbStyle === 'wings' && !(params && params.hbOver > 0)) p.hbOver = Math.max(p.hbOver, 0.10);
    p.w = p.mw + 2 * p.frameT + 2 * p.hbOver; p.d = p.ml + p.frameT + p.hbT; p.h = p.hbH;
  }
  if (type === 'armchair' && p.form === 'round' && p.armStyle === 'none') { p.armStyle = 'round'; p.armW = armDef(type, 'round'); }
  if (type === 'pouf') {
    if (p.form !== 'bench') p.d = p.w;
    if (!params || !params.legs) p.legs = p.form === 'bench' ? 'wood' : 'hidden';
    if (!params || params.piping === undefined) p.piping = p.form === 'round';
    if (p.legs === 'hidden') p.legH = HIDDEN_LEG_H;
    else if (!(p.legH >= 0.04)) p.legH = 0.12;
  }
  if (type === 'armchair' && p.legs === 'hidden') p.legH = HIDDEN_LEG_H;
  p.qty = Math.max(1, Math.round(+p.qty || 1));
  return p;
}

/* ---------- детали ---------- */
function mk(list) {
  const items = [];
  const add = (it) => { const o = { rotY: 0, ...it }; items.push(o); return o; };
  return { items, add };
}
/* roundbox по габаритам min/max */
function box(id, role, mat, x0, x1, y0, y1, z0, z1, extra = {}) {
  return { id, role, mat, shape: 'roundbox', x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: (z0 + z1) / 2, sx: Math.max(0.002, x1 - x0), sy: Math.max(0.002, y1 - y0), sz: Math.max(0.002, z1 - z0), ...extra };
}
function cyl(id, role, mat, x, z, sx, sz, y0, y1, extra = {}) {
  return { id, role, mat, shape: 'cyl', x, y: (y0 + y1) / 2, z, sx, sy: Math.max(0.002, y1 - y0), sz, ...extra };
}
/* перенос/поворот детали из локальной системы ветки (θ ∈ {0, ±π/2, π}) */
function place(it, theta, ox, oz) {
  const c = Math.round(Math.cos(theta)), s = Math.round(Math.sin(theta));
  const x = c * it.x + s * it.z + ox, z = -s * it.x + c * it.z + oz;
  return { ...it, x, z, rotY: (it.rotY || 0) + theta };
}

/* габарит одной детали в мировых осях */
export function itemBounds(it) {
  if (it.shape === 'shell') {
    const A = it.sx / 2, B = it.sz / 2, t = it.t, th = (it.open || Math.PI / 2) / 2;
    const zf = (B - t / 2) * Math.cos(th) + t / 2;
    return { min: [it.x - A, it.y - it.sy / 2, it.z - B], max: [it.x + A, it.y + it.sy / 2, it.z + zf] };
  }
  let sx = it.sx, sy = it.sy, sz = it.sz;
  if (it.tiltX) { const c = Math.cos(it.tiltX), s = Math.abs(Math.sin(it.tiltX)); const ny = sy * c + sz * s, nz = sz * c + sy * s; sy = ny; sz = nz; }
  const q = Math.round(((it.rotY || 0) / (Math.PI / 2))) % 2 !== 0;
  if (q) [sx, sz] = [sz, sx];
  return { min: [it.x - sx / 2, it.y - sy / 2, it.z - sz / 2], max: [it.x + sx / 2, it.y + sy / 2, it.z + sz / 2] };
}

/* ---------- семейство диванов: «ветка» сидений вдоль локальной X, спинка у z = 0, фронт z = d ---------- */
function sofaCore(p) {
  const cT = p.seatCushions === 'single' ? 0.16 : 0.15;
  const legH = p.legs === 'hidden' ? HIDDEN_LEG_H : p.legH;
  const yF = p.seatH - cT;
  const backT = p.d - p.seatD;
  const armW = p.armStyle === 'none' ? 0 : p.armW;
  const armR = { thin: 0.02, wide: 0.035, round: armW / 2 }[p.armStyle] || 0.02;
  return { cT, legH, yF, backT, armW, armR, crown: 0.012 };
}
/* число подушек сиденья на прямом участке шириной wi: «авто» — по ~70 см, и никогда не уже 45 см (одна — если короче 90) */
export function sectionCount(p, wi) {
  if (p.seatCushions === 'single') return 1;
  const max = Math.max(1, Math.floor(wi / 0.45 + 1e-6));
  if (p.sections === 'auto' || !(p.sections >= 1)) return clamp(Math.round(wi / 0.70), 1, Math.min(4, max));
  return Math.min(max, Math.max(1, Math.round(p.sections)));
}
/* наклонная съёмная подушка спинки: решаем толщину/высоту так, чтобы её габарит с наклоном лёг в [y0,y1]×[z0,z1] */
function tiltedCushion(y0, y1, z0, z1, a) {
  const c = Math.cos(a), s = Math.sin(a), Y = y1 - y0, Z = z1 - z0, k = c * c - s * s;
  let sy = (Y * c - Z * s) / k, t = (Z * c - Y * s) / k;
  if (t < 0.08 || sy < 0.08) { t = Math.max(0.08, Z); sy = Math.max(0.08, Y); return { sy, t, a: 0 }; }
  return { sy, t, a };
}
/* локальная ветка: x0..x1 вдоль сиденья, z: 0 (спинка) … d (фронт) */
function sofaRun(p, core, o) {
  const { x0, x1, armL, armR, back = true, depth = p.d, idp = '', nSeat } = o;
  const { cT, legH, yF, backT, armW, armR: ar, crown } = core;
  const out = [];
  const xi0 = x0 + (armL ? armW : 0), xi1 = x1 - (armR ? armW : 0);
  /* рама на 2 см глубже подушки сиденья: у фронта — свес подушки и теневая линия */
  out.push(box('frame' + idp, 'frame', 'fabric', xi0, xi1, legH, yF + 0.01, 0.005, depth - 0.02, { r: 0.02 }));
  if (armL) out.push(box('arm-l' + idp, 'arm', 'fabric', x0, x0 + armW, legH, p.armH, 0, depth, { r: ar, armStyle: p.armStyle }));
  if (armR) out.push(box('arm-r' + idp, 'arm', 'fabric', x1 - armW, x1, legH, p.armH, 0, depth, { r: ar, armStyle: p.armStyle }));
  const sz0 = back ? backT : 0.0;
  const wi = xi1 - xi0;
  const n = nSeat || sectionCount(p, wi);
  const sw = wi / n;
  for (let i = 0; i < n; i++) {
    const a = xi0 + i * sw + 0.002, b = xi0 + (i + 1) * sw - 0.002;
    out.push(box(`seat${idp}-${i + 1}`, 'seat', 'fabric', a, b, yF, p.seatH, sz0, depth, { r: 0.035, crown, cushion: true, piping: !!p.piping, seam: true }));
  }
  if (back) {
    if (p.backCushions === 'loose') {
      const fr = Math.min(0.10, backT * 0.45);
      out.push(box('back' + idp, 'back', 'fabric', xi0, xi1, yF, p.h - 0.08, 0, fr, { r: 0.03 }));
      const tc = tiltedCushion(p.seatH - BSINK, p.h, fr - 0.04, backT + 0.015, 0.12);
      for (let i = 0; i < n; i++) {
        const a = xi0 + i * sw + 0.002, b = xi0 + (i + 1) * sw - 0.002;
        out.push({ ...box(`backc${idp}-${i + 1}`, 'back', 'fabric', a, b, 0, tc.sy, 0, tc.t, { r: 0.06, crown: 0.035, cushion: true, piping: !!p.piping, seam: true }),
          y: (p.seatH - BSINK + p.h) / 2, z: (fr - 0.04 + backT + 0.015) / 2, tiltX: tc.a });
      }
    } else if (o.softBack) {
      /* кресло: цельная спинка — мягкая, с наклоном 0,10 рад; видимая толщина не больше 20 см (с подлокотниками глубину держат они) */
      const a = 0.10, c = Math.cos(a), s = Math.sin(a), k = c * c - s * s, Y = p.h - yF;
      const zNeed = (0.20 * k + Y * s) / c;
      const z0 = o.keepDepth ? 0 : Math.max(0, backT - zNeed);
      const tc = tiltedCushion(yF, p.h, z0, backT, a);
      out.push({ ...box('back' + idp, 'back', 'fabric', xi0, xi1, 0, tc.sy, 0, tc.t, { r: 0.07, crown: 0.02, piping: !!p.piping, softBack: true }), y: (yF + p.h) / 2, z: (z0 + backT) / 2, tiltX: tc.a });
    } else {
      out.push(box('back' + idp, 'back', 'fabric', xi0, xi1, yF, p.h, 0, backT, { r: 0.04, crown: 0.012, piping: !!p.piping }));
    }
  }
  return { items: out, n, sw, xi0, xi1 };
}
/* угловой блок d×d: спинки по −Z и −X (локально: x 0..d — внешняя сторона по x=0), подушка сиденья */
function cornerBlock(p, core, idp) {
  const { legH, yF, backT, crown } = core;
  const d = p.d, out = [];
  out.push(box('corner' + idp, 'frame', 'fabric', 0.005, d, legH, yF + 0.01, 0.005, d - 0.005, { r: 0.02 }));
  out.push(box(`seat-c${idp}`, 'seat', 'fabric', backT, d - 0.002, yF, p.seatH, backT, d, { r: 0.035, crown, cushion: true, piping: !!p.piping, seam: true }));
  if (p.backCushions === 'loose') {
    const fr = Math.min(0.10, backT * 0.45);
    out.push(box(`back-c${idp}`, 'back', 'fabric', 0, d, yF, p.h - 0.08, 0, fr, { r: 0.03 }));
    out.push(box(`back-c2${idp}`, 'back', 'fabric', 0, fr, yF, p.h - 0.08, fr, d, { r: 0.03 }));
    const tc = tiltedCushion(p.seatH - BSINK, p.h, fr - 0.04, backT + 0.015, 0.12);
    const zc = (fr - 0.04 + backT + 0.015) / 2;
    out.push({ ...box(`backc-c${idp}`, 'back', 'fabric', fr - 0.02, d - 0.002, 0, tc.sy, 0, tc.t, { r: 0.06, crown: 0.035, cushion: true, piping: !!p.piping, seam: true }), y: (p.seatH - BSINK + p.h) / 2, z: zc, tiltX: tc.a });
    /* вторая подушка (по боковой спинке) — повернута на +90°: её «фронт» смотрит в +X */
    const c2 = box(`backc-c2${idp}`, 'back', 'fabric', 0, d - backT - 0.004, 0, tc.sy, 0, tc.t, { r: 0.06, crown: 0.035, cushion: true, piping: !!p.piping, seam: true });
    out.push({ ...c2, x: zc, y: (p.seatH - BSINK + p.h) / 2, z: backT + (d - backT - 0.004) / 2 + 0.002, rotY: Math.PI / 2, tiltX: tc.a, sx: d - backT - 0.004 });
  } else {
    out.push(box(`back-c${idp}`, 'back', 'fabric', 0, d, yF, p.h, 0, backT, { r: 0.04, crown: 0.012 }));
    out.push(box(`back-c2${idp}`, 'back', 'fabric', 0, backT, yF, p.h, backT, d, { r: 0.04, crown: 0.012 }));
  }
  return out;
}
/* ноги по периметру footprint (мировые координаты, до центрирования) */
function legsFor(p, legH, rects, add, opts = {}) {
  if (p.legs === 'plinth') {
    rects.forEach((r, i) => add(box(i ? `plinth-${i + 1}` : 'plinth', 'plinth', 'fabric', r.x0 + 0.03, r.x1 - 0.03, 0, legH, r.z0 + 0.03, r.z1 - 0.03, { r: 0.01 })));
    return;
  }
  const hidden = p.legs === 'hidden';
  const ins = hidden ? 0.08 : 0.06;
  const dia = hidden ? 0.04 : p.legs === 'metal' ? 0.025 : 0.045;
  const taper = p.legs === 'wood' ? 0.032 / 0.045 : 1;
  const pts = [], supports = [];
  const key = (x, z) => `${Math.round(x * 1000)},${Math.round(z * 1000)}`;
  const seen = new Set();
  for (const r of rects) {
    const xs = [r.x0 + ins + dia / 2, r.x1 - ins - dia / 2], zs = [r.z0 + ins + dia / 2, r.z1 - ins - dia / 2];
    for (const x of xs) for (const z of zs) pts.push([x, z]);
    /* средняя опора длинного дивана: видимая ножка только сзади, спереди — утопленная чёрная опора (с фронта её не видно) */
    if (opts.centre && r.x1 - r.x0 > opts.centre) { pts.push([(r.x0 + r.x1) / 2, zs[0]]); if (!hidden) supports.push([(r.x0 + r.x1) / 2, r.z1 - 0.22]); else pts.push([(r.x0 + r.x1) / 2, zs[1]]); }
    if (opts.centreZ && r.z1 - r.z0 > opts.centreZ) for (const x of xs) pts.push([x, (r.z0 + r.z1) / 2]);
  }
  let i = 0;
  for (const [x, z] of pts) {
    if (seen.has(key(x, z))) continue; seen.add(key(x, z));
    add(cyl(`leg-${++i}`, 'leg', 'legs', x, z, dia, dia, 0, legH, { taper, legKind: hidden ? 'glide' : p.legs }));
  }
  supports.forEach(([x, z], j) => add(cyl(`support-${j + 1}`, 'leg', 'support', x, z, 0.04, 0.04, 0, legH, { taper: 1, legKind: 'glide', support: true })));
}

/* ---------- размерные линии ---------- */
function D(id, label, view, axis, a, b, tier, place) {
  const k = { x: 0, y: 1, z: 2 }[axis];
  return { id, label, value: Math.abs(b[k] - a[k]), view, axis, a, b, tier, place };
}

/* ---------- типы ---------- */
function partsSofa(p) {
  const core = sofaCore(p);
  const { items, add } = mk();
  const armL = core.armW > 0, armR = core.armW > 0;
  const run = sofaRun(p, core, { x0: 0, x1: p.w, armL, armR });
  run.items.forEach(add);
  legsFor(p, core.legH, [{ x0: 0, x1: p.w, z0: 0, z1: p.d }], add, { centre: 2.2 });
  const dims = [];
  const W = p.w, Dp = p.d, Hh = p.h, x0 = 0, z0 = 0;
  dims.push(D('w', 'Ширина', 'front', 'x', [x0, 0, Dp], [W, 0, Dp], 0, 'bottom'));
  const ch = [];
  if (armL) ch.push(D('armW-l', 'Подлокотник', 'front', 'x', [0, core.legH, Dp], [core.armW, core.legH, Dp], 2, 'bottom'));
  for (let i = 0; i < run.n; i++) ch.push(D(`sec-${i + 1}`, 'Секция', 'front', 'x', [run.xi0 + i * run.sw, core.yF, Dp], [run.xi0 + (i + 1) * run.sw, core.yF, Dp], 2, 'bottom'));
  if (armR) ch.push(D('armW-r', 'Подлокотник', 'front', 'x', [W - core.armW, core.legH, Dp], [W, core.legH, Dp], 2, 'bottom'));
  dims.push(...ch);
  heightsFront(dims, p, core, W, Dp, armL);
  sideDims(dims, p, core, 0, Dp);
  dims.push(D('w-top', 'Ширина', 'top', 'x', [0, Hh, Dp], [W, Hh, Dp], 0, 'bottom'));
  dims.push(D('d-top', 'Глубина', 'top', 'z', [W, Hh, 0], [W, Hh, Dp], 0, 'right'));
  return { items, dims };
}
function heightsFront(dims, p, core, W, zf, arms) {
  dims.push(D('h', 'Высота', 'front', 'y', [W, 0, zf], [W, p.h, zf], 0, 'right'));
  dims.push(D('seatH', 'Высота сиденья', 'front', 'y', [0, 0, zf], [0, p.seatH, zf], 1, 'left'));
  if (arms) dims.push(D('armH', 'Высота подлокотника', 'front', 'y', [0, 0, zf], [0, p.armH, zf], 0, 'left'));
  if (p.legs !== 'hidden') dims.push(D('legH', p.legs === 'plinth' ? 'Цоколь' : 'Ножки', 'front', 'y', [0, 0, zf], [0, core.legH, zf], 2, 'left'));
}
/* вид слева: ось z (спинка слева на листе) */
function sideDims(dims, p, core, z0, z1, xSide = 0) {
  dims.push(D('d', 'Глубина', 'side', 'z', [xSide, 0, z0], [xSide, 0, z1], 0, 'bottom'));
  dims.push(D('backT', 'Спинка', 'side', 'z', [xSide, core.yF, z0], [xSide, core.yF, z0 + core.backT], 1, 'bottom'));
  dims.push(D('seatD', 'Глубина сиденья', 'side', 'z', [xSide, core.yF, z0 + core.backT], [xSide, core.yF, z0 + p.d], 1, 'bottom'));
  dims.push(D('h-side', 'Высота', 'side', 'y', [xSide, 0, z0], [xSide, p.h, z0], 0, 'left'));
}

function partsCorner(p) {
  const core = sofaCore(p);
  const { items, add } = mk();
  const left = p.side !== 'right';
  const W = p.w, L = p.l, d = p.d, armW = core.armW, arms = armW > 0;
  const dims = [];
  let footprints;
  if (p.form === 'chaise') {
    const cw = p.chaiseW;
    /* основная ветка без шезлонговой секции */
    const mainX0 = left ? cw : 0, mainX1 = left ? W : W - cw;
    const run = sofaRun(p, core, { x0: mainX0, x1: mainX1, armL: !left && arms, armR: left && arms, idp: '' });
    run.items.forEach(add);
    /* шезлонг: рама до l, спинка только в зоне основной глубины, подлокотник по внешней стороне */
    const cx0 = left ? 0 : W - cw, cx1 = left ? cw : W;
    const ax0 = left ? cx0 : cx1 - armW, ax1 = left ? cx0 + armW : cx1;
    const ix0 = left ? cx0 + armW : cx0, ix1 = left ? cx1 : cx1 - armW;
    add(box('chaise', 'frame', 'fabric', ix0, ix1, core.legH, core.yF + 0.01, 0.005, L - 0.02, { r: 0.02 }));
    if (arms) add(box(left ? 'arm-l' : 'arm-r', 'arm', 'fabric', ax0, ax1, core.legH, p.armH, 0, L, { r: core.armR, armStyle: p.armStyle }));
    add(box('seat-ch', 'seat', 'fabric', ix0 + 0.002, ix1 - 0.002, core.yF, p.seatH, core.backT, L, { r: 0.035, crown: core.crown, cushion: true, piping: !!p.piping, seam: true }));
    if (p.backCushions === 'loose') {
      const fr = Math.min(0.10, core.backT * 0.45);
      add(box('back-ch', 'back', 'fabric', ix0, ix1, core.yF, p.h - 0.08, 0, fr, { r: 0.03 }));
      const tc = tiltedCushion(p.seatH - BSINK, p.h, fr - 0.04, core.backT + 0.015, 0.12);
      add({ ...box('backc-ch', 'back', 'fabric', ix0 + 0.002, ix1 - 0.002, 0, tc.sy, 0, tc.t, { r: 0.06, crown: 0.035, cushion: true, piping: !!p.piping, seam: true }), y: (p.seatH - BSINK + p.h) / 2, z: (fr - 0.04 + core.backT + 0.015) / 2, tiltX: tc.a });
    } else add(box('back-ch', 'back', 'fabric', ix0, ix1, core.yF, p.h, 0, core.backT, { r: 0.04, crown: 0.012 }));
    footprints = [{ x0: mainX0, x1: mainX1, z0: 0, z1: d }, { x0: cx0, x1: cx1, z0: 0, z1: L }];
    legsFor(p, core.legH, footprints, add, { centre: 2.0 });
    dims.push(D('w', 'Ширина', 'front', 'x', [0, 0, L], [W, 0, L], 0, 'bottom'));
    const chain = [];
    const chD = D('chaiseW', 'Ширина шезлонга', 'front', 'x', [cx0, core.legH, L], [cx1, core.legH, L], 2, 'bottom');
    const secs = [];
    for (let i = 0; i < run.n; i++) secs.push(D(`sec-${i + 1}`, 'Секция', 'front', 'x', [run.xi0 + i * run.sw, core.yF, d], [run.xi0 + (i + 1) * run.sw, core.yF, d], 2, 'bottom'));
    const armD = arms ? D(left ? 'armW-r' : 'armW-l', 'Подлокотник', 'front', 'x', left ? [W - armW, core.legH, d] : [0, core.legH, d], left ? [W, core.legH, d] : [armW, core.legH, d], 2, 'bottom') : null;
    if (left) chain.push(chD, ...secs, ...(armD ? [armD] : [])); else chain.push(...(armD ? [armD] : []), ...secs, chD);
    dims.push(...chain);
    heightsFront(dims, p, core, W, L, arms);
    const xs = left ? 0 : W;
    dims.push(D('l', 'Длина шезлонга', 'side', 'z', [xs, 0, 0], [xs, 0, L], 0, 'bottom'));
    dims.push(D('d', 'Глубина', 'side', 'z', [xs, core.yF, 0], [xs, core.yF, d], 1, 'bottom'));
    dims.push(D('backT', 'Спинка', 'side', 'z', [xs, p.seatH, 0], [xs, p.seatH, core.backT], 2, 'bottom'));
    dims.push(D('seatD', 'Глубина сиденья', 'side', 'z', [xs, p.seatH, core.backT], [xs, p.seatH, d], 2, 'bottom'));
    dims.push(D('h-side', 'Высота', 'side', 'y', [xs, 0, 0], [xs, p.h, 0], 0, 'left'));
    dims.push(D('w-top', 'Ширина', 'top', 'x', [0, p.h, L], [W, p.h, L], 0, 'bottom'));
    dims.push(D('l-top', 'Длина шезлонга', 'top', 'z', left ? [0, p.h, 0] : [W, p.h, 0], left ? [0, p.h, L] : [W, p.h, L], 0, left ? 'left' : 'right'));
    dims.push(D('d-top', 'Глубина', 'top', 'z', left ? [W, p.h, 0] : [0, p.h, 0], left ? [W, p.h, d] : [0, p.h, d], 0, left ? 'right' : 'left'));
    dims.push(D('chaiseW-top', 'Ширина шезлонга', 'top', 'x', [cx0, p.h, 0], [cx1, p.h, 0], 0, 'top'));
  } else {
    /* Г-образный: основная ветка вдоль X от углового блока до правого (левого) подлокотника */
    const mainX0 = left ? d : 0, mainX1 = left ? W : W - d;
    const run = sofaRun(p, core, { x0: mainX0, x1: mainX1, armL: !left && arms, armR: left && arms });
    run.items.forEach(add);
    /* угловой блок: локальная система блока — внешняя спинка по x=0; для правого угла зеркалим поворотом */
    const cb = cornerBlock(p, core, '');
    if (left) cb.forEach((it) => add(it));
    else cb.forEach((it) => add(place(it, -Math.PI / 2, W, 0)));
    /* вторая ветка: от углового блока к фронту (z: d … L), спинка по внешней стороне */
    const len2 = L - d;
    const run2 = sofaRun(p, core, { x0: 0, x1: len2, armL: left && arms, armR: !left && arms, idp: '-2' });
    /* подушки второй стороны — на виде сбоку (локальная x ветки → z: слева L − x, справа d + x) */
    for (let i = 0; i < run2.n; i++) {
      const a = run2.xi0 + i * run2.sw, b = run2.xi0 + (i + 1) * run2.sw;
      const za = left ? L - b : d + a, zb = left ? L - a : d + b, xs2 = left ? 0 : W;
      dims.push(D(`sec2-${i + 1}`, 'Секция', 'side', 'z', [xs2, core.yF, za], [xs2, core.yF, zb], 2, 'bottom'));
    }
    if (left) run2.items.forEach((it) => add(place(it, Math.PI / 2, 0, L)));
    else run2.items.forEach((it) => add(place(it, -Math.PI / 2, W, d)));
    footprints = [{ x0: 0, x1: W, z0: 0, z1: d }, left ? { x0: 0, x1: d, z0: 0, z1: L } : { x0: W - d, x1: W, z0: 0, z1: L }];
    if (p.legs === 'plinth') legsFor(p, core.legH, [footprints[0], left ? { x0: 0, x1: d, z0: d, z1: L } : { x0: W - d, x1: W, z0: d, z1: L }], add);
    else legsFor(p, core.legH, [{ x0: 0, x1: W, z0: 0, z1: d }, left ? { x0: 0, x1: d, z0: d - 0.12, z1: L } : { x0: W - d, x1: W, z0: d - 0.12, z1: L }], add, { centre: 2.2, centreZ: 2.0 });
    dims.push(D('w', 'Ширина', 'front', 'x', [0, 0, L], [W, 0, L], 0, 'bottom'));
    const cD = D('cornerD', 'Угловой модуль', 'front', 'x', left ? [0, core.legH, L] : [W - d, core.legH, L], left ? [d, core.legH, L] : [W, core.legH, L], 2, 'bottom');
    const secs = [];
    for (let i = 0; i < run.n; i++) secs.push(D(`sec-${i + 1}`, 'Секция', 'front', 'x', [run.xi0 + i * run.sw, core.yF, d], [run.xi0 + (i + 1) * run.sw, core.yF, d], 2, 'bottom'));
    const armD = arms ? D(left ? 'armW-r' : 'armW-l', 'Подлокотник', 'front', 'x', left ? [W - armW, core.legH, d] : [0, core.legH, d], left ? [W, core.legH, d] : [armW, core.legH, d], 2, 'bottom') : null;
    if (left) dims.push(cD, ...secs, ...(armD ? [armD] : [])); else dims.push(...(armD ? [armD] : []), ...secs, cD);
    heightsFront(dims, p, core, W, L, arms);
    const xs = left ? 0 : W;
    dims.push(D('l', 'Длина второй стороны', 'side', 'z', [xs, 0, 0], [xs, 0, L], 0, 'bottom'));
    dims.push(D('backT', 'Спинка', 'side', 'z', [xs, core.yF, 0], [xs, core.yF, core.backT], 1, 'bottom'));
    dims.push(D('seatD', 'Глубина сиденья', 'side', 'z', [xs, core.yF, core.backT], [xs, core.yF, d], 1, 'bottom'));
    if (arms) dims.push(D('armW-2', 'Подлокотник', 'side', 'z', [xs, core.legH, L - armW], [xs, core.legH, L], 1, 'bottom'));
    dims.push(D('h-side', 'Высота', 'side', 'y', [xs, 0, 0], [xs, p.h, 0], 0, 'left'));
    dims.push(D('w-top', 'Ширина', 'top', 'x', [0, p.h, L], [W, p.h, L], 0, 'bottom'));
    dims.push(D('l-top', 'Длина второй стороны', 'top', 'z', left ? [0, p.h, 0] : [W, p.h, 0], left ? [0, p.h, L] : [W, p.h, L], 0, left ? 'left' : 'right'));
    dims.push(D('d', 'Глубина', 'top', 'z', left ? [W, p.h, 0] : [0, p.h, 0], left ? [W, p.h, d] : [0, p.h, d], 0, left ? 'right' : 'left'));
    dims.push(D('cornerD-top', 'Угловой модуль', 'top', 'x', left ? [0, p.h, 0] : [W - d, p.h, 0], left ? [d, p.h, 0] : [W, p.h, 0], 0, 'top'));
  }
  return { items, dims, notes: [left ? 'угол слева' : 'угол справа'] };
}

function partsUshape(p) {
  const core = sofaCore(p);
  const { items, add } = mk();
  const W = p.w, L = p.l, d = p.d, armW = core.armW, arms = armW > 0;
  const run = sofaRun(p, core, { x0: d, x1: W - d, armL: false, armR: false });
  run.items.forEach(add);
  cornerBlock(p, core, '-l').forEach((it) => add(it));
  cornerBlock(p, core, '-r').forEach((it) => add(place(it, -Math.PI / 2, W, 0)));
  const len2 = L - d;
  const runL = sofaRun(p, core, { x0: 0, x1: len2, armL: arms, armR: false, idp: '-L' });
  runL.items.forEach((it) => add(place(it, Math.PI / 2, 0, L)));
  sofaRun(p, core, { x0: 0, x1: len2, armL: false, armR: arms, idp: '-R' }).items.forEach((it) => add(place(it, -Math.PI / 2, W, d)));
  if (p.legs === 'plinth') legsFor(p, core.legH, [{ x0: 0, x1: W, z0: 0, z1: d }, { x0: 0, x1: d, z0: d, z1: L }, { x0: W - d, x1: W, z0: d, z1: L }], add);
  else legsFor(p, core.legH, [{ x0: 0, x1: W, z0: 0, z1: d }, { x0: 0, x1: d, z0: d - 0.12, z1: L }, { x0: W - d, x1: W, z0: d - 0.12, z1: L }], add, { centre: 2.2, centreZ: 2.0 });
  const dims = [];
  dims.push(D('w', 'Ширина', 'front', 'x', [0, 0, L], [W, 0, L], 0, 'bottom'));
  dims.push(D('sideW-l', 'Сторона', 'front', 'x', [0, core.legH, L], [d, core.legH, L], 1, 'bottom'));
  dims.push(D('opening', 'Проём', 'front', 'x', [d, core.yF, d], [W - d, core.yF, d], 1, 'bottom'));
  dims.push(D('sideW-r', 'Сторона', 'front', 'x', [W - d, core.legH, L], [W, core.legH, L], 1, 'bottom'));
  for (let i = 0; i < run.n; i++) dims.push(D(`sec-${i + 1}`, 'Секция', 'front', 'x', [run.xi0 + i * run.sw, core.yF, d], [run.xi0 + (i + 1) * run.sw, core.yF, d], 2, 'bottom'));
  /* подушки боковых сторон (обе одинаковые) — на виде сбоку; левая: локальная x → z = L − x */
  for (let i = 0; i < runL.n; i++) dims.push(D(`secL-${i + 1}`, 'Секция', 'side', 'z', [0, core.yF, L - runL.xi0 - (i + 1) * runL.sw], [0, core.yF, L - runL.xi0 - i * runL.sw], 2, 'bottom'));
  heightsFront(dims, p, core, W, L, arms);
  dims.push(D('l', 'Длина сторон', 'side', 'z', [0, 0, 0], [0, 0, L], 0, 'bottom'));
  dims.push(D('backT', 'Спинка', 'side', 'z', [0, core.yF, 0], [0, core.yF, core.backT], 1, 'bottom'));
  dims.push(D('seatD', 'Глубина сиденья', 'side', 'z', [0, core.yF, core.backT], [0, core.yF, d], 1, 'bottom'));
  if (arms) dims.push(D('armW', 'Подлокотник', 'side', 'z', [0, core.legH, L - armW], [0, core.legH, L], 1, 'bottom'));
  dims.push(D('h-side', 'Высота', 'side', 'y', [0, 0, 0], [0, p.h, 0], 0, 'left'));
  dims.push(D('w-top', 'Ширина', 'top', 'x', [0, p.h, L], [W, p.h, L], 0, 'bottom'));
  dims.push(D('l-top-l', 'Длина', 'top', 'z', [0, p.h, 0], [0, p.h, L], 0, 'left'));
  dims.push(D('l-top-r', 'Длина', 'top', 'z', [W, p.h, 0], [W, p.h, L], 0, 'right'));
  dims.push(D('d', 'Глубина', 'top', 'z', [W, p.h, 0], [W, p.h, d], 1, 'right'));
  dims.push(D('opening-top', 'Проём', 'top', 'x', [d, p.h, 0], [W - d, p.h, 0], 0, 'top'));
  return { items, dims };
}

function partsModular(p) {
  const core = sofaCore({ ...p, seatCushions: 'single' });
  const { items, add } = mk();
  const n = p.modules, mW = p.moduleW, armW = core.armW, arms = armW > 0, d = p.d;
  const W = n * mW + 2 * armW;
  const chaiseIdx = p.chaise === 'left' ? 0 : p.chaise === 'right' ? n - 1 : -1;
  const Lc = chaiseIdx >= 0 ? p.chaiseL : d;
  const g = 0.002; // половина зазора 4 мм
  const { legH, yF, backT, crown } = core;
  if (arms) {
    add(box('arm-l', 'arm', 'fabric', 0, armW - g, legH, p.armH, 0, chaiseIdx === 0 ? Lc : d, { r: core.armR, armStyle: p.armStyle }));
    add(box('arm-r', 'arm', 'fabric', W - armW + g, W, legH, p.armH, 0, chaiseIdx === n - 1 ? Lc : d, { r: core.armR, armStyle: p.armStyle }));
  }
  for (let i = 0; i < n; i++) {
    /* зазор 4 мм только между телами; без подлокотников крайние модули — заподлицо с габаритом */
    const x0 = armW + i * mW + (i === 0 && !arms ? 0 : g), x1 = armW + (i + 1) * mW - (i === n - 1 && !arms ? 0 : g);
    const depth = i === chaiseIdx ? Lc : d;
    add(box(`module-${i + 1}`, 'frame', 'fabric', x0, x1, legH, yF + 0.01, 0.005, depth - 0.02, { r: 0.025 }));
    add(box(`seat-${i + 1}`, 'seat', 'fabric', x0 + 0.002, x1 - 0.002, yF, p.seatH, backT, depth, { r: 0.04, crown, cushion: true, piping: !!p.piping, seam: true }));
    if (p.backCushions === 'loose') {
      const fr = Math.min(0.10, backT * 0.45);
      add(box(`back-${i + 1}`, 'back', 'fabric', x0, x1, yF, p.h - 0.08, 0, fr, { r: 0.03 }));
      const tc = tiltedCushion(p.seatH - BSINK, p.h, fr - 0.04, backT + 0.015, 0.12);
      add({ ...box(`backc-${i + 1}`, 'back', 'fabric', x0 + 0.002, x1 - 0.002, 0, tc.sy, 0, tc.t, { r: 0.065, crown: 0.035, cushion: true, piping: !!p.piping, seam: true }), y: (p.seatH - BSINK + p.h) / 2, z: (fr - 0.04 + backT + 0.015) / 2, tiltX: tc.a });
    } else add(box(`back-${i + 1}`, 'back', 'fabric', x0, x1, yF, p.h, 0, backT, { r: 0.045, crown: 0.012 }));
  }
  {
    const rects = [{ x0: 0, x1: W, z0: 0, z1: d }];
    if (chaiseIdx >= 0) rects.push(chaiseIdx === 0 ? { x0: 0, x1: armW + mW, z0: d - 0.12, z1: Lc } : { x0: W - armW - mW, x1: W, z0: d - 0.12, z1: Lc });
    legsFor(p, legH, rects, add, { centre: 1.6 });
    /* ножки на стыках модулей (видимые опоры не «висят» между крайними) */
    if (p.legs === 'metal' || p.legs === 'wood') {
      const dia = p.legs === 'metal' ? 0.025 : 0.045, taper = p.legs === 'wood' ? 0.032 / 0.045 : 1;
      let k = 0;
      for (let i = 1; i < n; i++) {
        const x = armW + i * mW;
        if (W > 1.6 && Math.abs(x - W / 2) < 0.15) continue; // центральную пару уже поставил legsFor
        for (const z of [0.06 + dia / 2, d - 0.06 - dia / 2]) add(cyl(`leg-j${++k}`, 'leg', 'legs', x, z, dia, dia, 0, legH, { taper, legKind: p.legs }));
      }
    }
  }
  const dims = [];
  dims.push(D('w', 'Ширина', 'front', 'x', [0, 0, Lc], [W, 0, Lc], 0, 'bottom'));
  if (arms) dims.push(D('armW-l', 'Подлокотник', 'front', 'x', [0, legH, Lc], [armW, legH, Lc], 1, 'bottom'));
  for (let i = 0; i < n; i++) dims.push(D(`module-${i + 1}`, 'Модуль', 'front', 'x', [armW + i * mW, yF, d], [armW + (i + 1) * mW, yF, d], 1, 'bottom'));
  if (arms) dims.push(D('armW-r', 'Подлокотник', 'front', 'x', [W - armW, legH, Lc], [W, legH, Lc], 1, 'bottom'));
  heightsFront(dims, p, core, W, Lc, arms);
  dims.push(D('d', 'Глубина', 'side', 'z', [0, chaiseIdx >= 0 ? yF : 0, 0], [0, chaiseIdx >= 0 ? yF : 0, d], chaiseIdx >= 0 ? 1 : 0, 'bottom'));
  if (chaiseIdx >= 0) dims.push(D('chaiseL', 'Шезлонг', 'side', 'z', [0, 0, 0], [0, 0, Lc], 0, 'bottom'));
  dims.push(D('backT', 'Спинка', 'side', 'z', [0, p.seatH, 0], [0, p.seatH, backT], 2, 'bottom'));
  dims.push(D('seatD', 'Глубина сиденья', 'side', 'z', [0, p.seatH, backT], [0, p.seatH, d], 2, 'bottom'));
  dims.push(D('h-side', 'Высота', 'side', 'y', [0, 0, 0], [0, p.h, 0], 0, 'left'));
  dims.push(D('w-top', 'Ширина', 'top', 'x', [0, p.h, Lc], [W, p.h, Lc], 0, 'bottom'));
  const right = chaiseIdx !== n - 1;
  dims.push(D('d-top', 'Глубина', 'top', 'z', right ? [W, p.h, 0] : [0, p.h, 0], right ? [W, p.h, d] : [0, p.h, d], 0, right ? 'right' : 'left'));
  if (chaiseIdx >= 0) dims.push(D('chaiseL-top', 'Шезлонг', 'top', 'z', chaiseIdx === 0 ? [0, p.h, 0] : [W, p.h, 0], chaiseIdx === 0 ? [0, p.h, Lc] : [W, p.h, Lc], 0, chaiseIdx === 0 ? 'left' : 'right'));
  return { items, dims };
}

function partsBed(p) {
  const { items, add } = mk();
  const hbT = HBT_BY_STYLE[p.hbStyle] || 0.10;
  const W = p.mw + 2 * p.frameT + 2 * p.hbOver, L = p.ml + p.frameT + hbT;
  const baseY = p.base === 'legs' ? p.legH : p.legH;
  const fx0 = p.hbOver, fx1 = W - p.hbOver; // рама
  const mattT = 0.22, mTop = p.railH + 0.12;
  const hb0 = p.base === 'legs' ? p.legH : 0.012;
  const wings = p.hbStyle === 'wings';
  const wingW = wings ? clamp(p.hbOver + p.frameT, 0.10, 0.20) : 0;
  if (wings) {
    add(box('headboard', 'headboard', 'fabric', wingW - 0.004, W - wingW + 0.004, hb0, p.hbH - 0.03, 0, hbT, { r: 0.03, crown: 0.01, piping: !!p.piping }));
    add(box('wing-l', 'headboard', 'fabric', 0, wingW, hb0, p.hbH, 0, hbT + 0.04, { r: 0.045, crown: 0.01, piping: !!p.piping, wing: 'l' }));
    add(box('wing-r', 'headboard', 'fabric', W - wingW, W, hb0, p.hbH, 0, hbT + 0.04, { r: 0.045, crown: 0.01, piping: !!p.piping, wing: 'r' }));
  } else {
    add(box('headboard', 'headboard', 'fabric', 0, W, hb0, p.hbH, 0, hbT, { r: p.hbStyle === 'plain' ? 0.035 : 0.03, crown: 0.01, piping: !!p.piping, tufting: p.hbStyle === 'channels' ? 'channels' : p.hbStyle === 'capitone' ? 'capitone' : undefined }));
  }
  if (wings) items.find((i) => i.id === 'headboard').tufting = 'channels';
  add(box('rail-l', 'rail', 'fabric', fx0, fx0 + p.frameT, baseY, p.railH, hbT, L, { r: 0.02, piping: !!p.piping }));
  add(box('rail-r', 'rail', 'fabric', fx1 - p.frameT, fx1, baseY, p.railH, hbT, L, { r: 0.02, piping: !!p.piping }));
  add(box('rail-foot', 'rail', 'fabric', fx0 + p.frameT - 0.002, fx1 - p.frameT + 0.002, baseY, p.railH, L - p.frameT, L, { r: 0.02, piping: !!p.piping }));
  add(box('frame', 'frame', 'fabric', fx0 + p.frameT, fx1 - p.frameT, baseY, mTop - mattT, hbT, L - p.frameT, { r: 0.01 }));
  add(box('mattress', 'mattress', 'mattress', fx0 + p.frameT + 0.004, fx1 - p.frameT - 0.004, mTop - mattT, mTop, hbT + 0.004, L - p.frameT - 0.004, { r: 0.05, crown: 0.008, piping: true, quilt: true }));
  /* для вида (decor: не в габарите, чертеже и списке): одеяло и две подушки у изголовья */
  {
    const mx0 = fx0 + p.frameT + 0.004, mx1 = fx1 - p.frameT - 0.004, mz1 = L - p.frameT - 0.004, mw = mx1 - mx0, ml = mz1 - hbT;
    /* покрывало: толстое, со складками, у изголовья — отворот-валик (как на фото кроватей ателье) */
    const dz0 = mz1 - ml * 0.6;
    add(box('duvet', 'decor', 'decor', mx0 - 0.015, mx1 + 0.015, mTop - 0.004, mTop + 0.085, dz0, mz1 + 0.015, { r: 0.04, crown: 0.025, decor: true, decorKind: 'duvet' }));
    add(box('duvet-fold', 'decor', 'decor', mx0 - 0.02, mx1 + 0.02, mTop + 0.03, mTop + 0.145, dz0 - 0.02, dz0 + 0.17, { r: 0.05, decor: true, decorKind: 'duvet', roll: true }));
    const pw = Math.min(0.7, mw / 2 - 0.04), pz0 = hbT + 0.04;
    for (const [i, cx] of [[1, (mx0 + mx1) / 2 - mw / 4], [2, (mx0 + mx1) / 2 + mw / 4]]) {
      if (mw < 1.2 && i === 2) break;
      const x = mw < 1.2 ? (mx0 + mx1) / 2 : cx;
      add({ ...box(`pillow-${i}`, 'decor', 'decor', x - pw / 2, x + pw / 2, mTop, mTop + 0.19, pz0, pz0 + 0.46, { r: 0.08, crown: 0.05, decor: true, decorKind: 'pillow' }) });
    }
  }
  if (p.base === 'plinth') add(box('plinth', 'plinth', 'fabric', fx0 + 0.05, fx1 - 0.05, 0, p.legH, hbT + 0.04, L - 0.05, { r: 0.01 }));
  else {
    const lp = { legs: 'wood', legH: p.legH };
    legsFor(lp, p.legH, [{ x0: fx0, x1: fx1, z0: hbT, z1: L }], add);
    if (p.mw >= 1.6) { /* центральная пара под рамой по ширине */
      add(cyl('leg-c1', 'leg', 'legs', W / 2, hbT + 0.25, 0.045, 0.045, 0, p.legH, { taper: 0.032 / 0.045, legKind: 'wood' }));
      add(cyl('leg-c2', 'leg', 'legs', W / 2, L - 0.25, 0.045, 0.045, 0, p.legH, { taper: 0.032 / 0.045, legKind: 'wood' }));
    }
  }
  const dims = [];
  dims.push(D('w', 'Ширина (изголовье)', 'front', 'x', [0, 0, L], [W, 0, L], 0, 'bottom'));
  if (p.hbOver > 0.001) dims.push(D('hbOver-l', 'Выступ', 'front', 'x', [0, baseY, L], [fx0, baseY, L], 1, 'bottom'));
  dims.push(D('frameT-l', 'Боковина', 'front', 'x', [fx0, baseY, L], [fx0 + p.frameT, baseY, L], 1, 'bottom'));
  dims.push(D('mw', 'Матрас', 'front', 'x', [fx0 + p.frameT, baseY, L], [fx1 - p.frameT, baseY, L], 1, 'bottom'));
  dims.push(D('frameT-r', 'Боковина', 'front', 'x', [fx1 - p.frameT, baseY, L], [fx1, baseY, L], 1, 'bottom'));
  if (p.hbOver > 0.001) dims.push(D('hbOver-r', 'Выступ', 'front', 'x', [fx1, baseY, L], [W, baseY, L], 1, 'bottom'));
  dims.push(D('hbH', 'Изголовье', 'front', 'y', [W, 0, 0], [W, p.hbH, 0], 0, 'right'));
  dims.push(D('railH', 'Высота царги', 'front', 'y', [0, 0, L], [0, p.railH, L], 1, 'left'));
  dims.push(D('mTop', 'Верх матраса', 'front', 'y', [0, 0, L], [0, mTop, L], 0, 'left'));
  dims.push(D('legH', p.base === 'legs' ? 'Ножки' : 'Цоколь', 'front', 'y', [0, 0, L], [0, p.legH, L], 2, 'left'));
  dims.push(D('l', 'Длина', 'side', 'z', [0, 0, 0], [0, 0, L], 0, 'bottom'));
  dims.push(D('hbT', 'Изголовье', 'side', 'z', [0, baseY, 0], [0, baseY, hbT], 1, 'bottom'));
  if (wings) dims.push(D('wingT', 'Ушки', 'side', 'z', [0, p.hbH, 0], [0, p.hbH, hbT + 0.04], 1, 'top'));
  dims.push(D('ml', 'Матрас', 'side', 'z', [0, baseY, hbT], [0, baseY, L - p.frameT], 1, 'bottom'));
  dims.push(D('frameT-foot', 'Царга', 'side', 'z', [0, baseY, L - p.frameT], [0, baseY, L], 1, 'bottom'));
  dims.push(D('h-side', 'Изголовье', 'side', 'y', [0, 0, 0], [0, p.hbH, 0], 0, 'left'));
  dims.push(D('railH-side', 'Высота царги', 'side', 'y', [0, 0, L], [0, p.railH, L], 1, 'right'));
  dims.push(D('w-top', 'Ширина', 'top', 'x', [0, p.hbH, L], [W, p.hbH, L], 0, 'bottom'));
  dims.push(D('l-top', 'Длина', 'top', 'z', [W, p.hbH, 0], [W, p.hbH, L], 0, 'right'));
  dims.push(D('mw-top', 'Матрас', 'top', 'x', [fx0 + p.frameT, mTop, hbT], [fx1 - p.frameT, mTop, hbT], 0, 'top'));
  dims.push(D('ml-top', 'Матрас', 'top', 'z', [0, mTop, hbT], [0, mTop, L - p.frameT], 0, 'left'));
  return { items, dims, notes: ['матрас показан для масштаба'] };
}

function partsArmchair(p) {
  const { items, add } = mk();
  const W = p.w, d = p.d;
  const cT = 0.14, yF = p.seatH - cT, legH = p.legs === 'hidden' ? HIDDEN_LEG_H : p.legH;
  const armW = p.armStyle === 'none' ? 0 : p.armW;
  const dims = [];
  if (p.form === 'round') {
    const t = Math.max(0.10, armW || 0.15);
    const B = d / 2 * 0.94, zc = B; // эллипс оболочки: задний край на z=0
    const open = Math.PI / 2;
    /* основание глубоко утоплено: подушка свисает над ним на 4+ см, сам барабан — в тени */
    add(cyl('frame', 'frame', 'fabric', W / 2, (0.03 + d - 0.07) / 2 - 0.04, W - 2 * t + 0.06, d - 0.18, legH, yF - 0.005, { r: 0.02 }));
    add({ id: 'shell', role: 'shell', mat: 'fabric', shape: 'shell', x: W / 2, y: (legH + p.h) / 2, z: zc, sx: W, sy: p.h - legH, sz: 2 * B, t, open, topFront: p.armH, r: t / 2, rotY: 0, piping: !!p.piping });
    /* подушка — ровно «глубина сиденья» от фронта */
    const sx = W - 2 * t + 0.03, seatZ0 = d - p.seatD;
    add(cyl('seat-1', 'seat', 'fabric', W / 2, (seatZ0 + d) / 2, sx, p.seatD, yF, p.seatH, { r: 0.04, crown: 0.012, cushion: true, piping: !!p.piping, seam: true, frontFlat: false }));
    legsFor({ legs: p.legs }, legH, [{ x0: W * 0.16, x1: W * 0.84, z0: 0.06, z1: d - 0.16 }], add);
    /* спереди оболочка заканчивается торцами на угле open/2: боковина и проём — там, где они есть на самом деле */
    const A = W / 2, sn = Math.sin(open / 2), zEnd = zc + (B - t / 2) * Math.cos(open / 2);
    const inner = (A - t) * sn;
    dims.push(D('shellW-l', 'Боковина', 'front', 'x', [0, legH, zEnd], [A - inner, legH, zEnd], 1, 'bottom'));
    dims.push(D('inner', 'Проём', 'front', 'x', [A - inner, yF, zEnd], [A + inner, yF, zEnd], 1, 'bottom'));
    dims.push(D('shellW-r', 'Боковина', 'front', 'x', [A + inner, legH, zEnd], [W, legH, zEnd], 1, 'bottom'));
    dims.push(D('seatD', 'Глубина сиденья', 'side', 'z', [0, yF, d - p.seatD], [0, yF, d], 1, 'bottom'));
  } else {
    const core = { cT, legH, yF, backT: d - p.seatD, armW, armR: { thin: 0.02, wide: 0.035, round: armW / 2 }[p.armStyle] || 0.02, crown: 0.012 };
    sofaRun({ ...p, seatCushions: 'single' }, core, { x0: 0, x1: W, armL: armW > 0, armR: armW > 0, nSeat: 1, softBack: true, keepDepth: !(armW > 0) }).items.forEach(add);
    legsFor(p, legH, [{ x0: 0, x1: W, z0: 0, z1: d }], add);
    if (armW > 0) {
      dims.push(D('armW-l', 'Подлокотник', 'front', 'x', [0, legH, d], [armW, legH, d], 1, 'bottom'));
      dims.push(D('inner', 'Сиденье', 'front', 'x', [armW, yF, d], [W - armW, yF, d], 1, 'bottom'));
      dims.push(D('armW-r', 'Подлокотник', 'front', 'x', [W - armW, legH, d], [W, legH, d], 1, 'bottom'));
    }
    dims.push(D('backT', 'Спинка', 'side', 'z', [0, yF, 0], [0, yF, d - p.seatD], 1, 'bottom'));
    dims.push(D('seatD', 'Глубина сиденья', 'side', 'z', [0, yF, d - p.seatD], [0, yF, d], 1, 'bottom'));
  }
  dims.push(D('w', 'Ширина', 'front', 'x', [0, 0, d], [W, 0, d], 0, 'bottom'));
  heightsFront(dims, p, { legH }, W, d, armW > 0 && p.form !== 'round');
  if (p.form === 'round') dims.push(D('armH', 'Высота подлокотника', 'front', 'y', [0, 0, d], [0, p.armH, d], 0, 'left'));
  dims.push(D('d', 'Глубина', 'side', 'z', [0, 0, 0], [0, 0, d], 0, 'bottom'));
  dims.push(D('h-side', 'Высота', 'side', 'y', [0, 0, 0], [0, p.h, 0], 0, 'left'));
  dims.push(D('w-top', 'Ширина', 'top', 'x', [0, p.h, d], [W, p.h, d], 0, 'bottom'));
  dims.push(D('d-top', 'Глубина', 'top', 'z', [W, p.h, 0], [W, p.h, d], 0, 'right'));
  return { items, dims };
}

function partsPouf(p) {
  const { items, add } = mk();
  const W = p.w, d = p.form === 'bench' ? p.d : p.w, H = p.h;
  const legH = p.legs === 'hidden' ? HIDDEN_LEG_H : p.legH;
  const tuft = p.top === 'capitone' ? 'capitone' : undefined;
  if (p.form === 'round') {
    add(cyl('seat-1', 'seat', 'fabric', W / 2, d / 2, W, d, legH, H, { r: 0.05, rBottom: 0.03, crown: 0.012, cushion: true, piping: !!p.piping, tufting: tuft, seam: !p.piping }));
  } else {
    add(box('seat-1', 'seat', 'fabric', 0, W, legH, H, 0, d, { r: 0.04, crown: 0.012, cushion: true, piping: !!p.piping, tufting: tuft, seam: !p.piping }));
  }
  if (p.legs === 'hidden') {
    const ins = Math.min(0.08, W * 0.18);
    if (p.form === 'round') {
      const rr = W / 2 - ins;
      [0, 1, 2, 3].forEach((k) => { const a = Math.PI / 4 + k * Math.PI / 2; items.push(cyl(`leg-${k + 1}`, 'leg', 'legs', W / 2 + rr * Math.cos(a), d / 2 + rr * Math.sin(a), 0.04, 0.04, 0, legH, { taper: 1, legKind: 'glide', rotY: 0 })); });
    } else legsFor({ legs: 'hidden' }, legH, [{ x0: 0, x1: W, z0: 0, z1: d }], add);
  } else if (p.legs === 'plinth') legsFor({ legs: 'plinth' }, legH, [{ x0: 0, x1: W, z0: 0, z1: d }], add);
  else legsFor({ legs: p.legs }, legH, [{ x0: 0, x1: W, z0: 0, z1: d }], add, { centre: 1.6 });
  const round = p.form === 'round';
  const dims = [];
  dims.push(D('w', round ? 'Ø' : 'Ширина', 'front', 'x', [0, 0, d], [W, 0, d], 0, 'bottom'));
  dims.push(D('h', 'Высота', 'front', 'y', [W, 0, d], [W, H, d], 0, 'right'));
  if (p.legs !== 'hidden') dims.push(D('legH', 'Ножки', 'front', 'y', [0, 0, d], [0, legH, d], 1, 'left'));
  dims.push(D('d', round ? 'Ø' : 'Глубина', 'side', 'z', [0, 0, 0], [0, 0, d], 0, 'bottom'));
  dims.push(D('h-side', 'Высота', 'side', 'y', [0, 0, 0], [0, H, 0], 0, 'left'));
  dims.push(D('w-top', round ? 'Ø' : 'Ширина', 'top', 'x', [0, H, d], [W, H, d], 0, 'bottom'));
  if (!round) dims.push(D('d-top', 'Глубина', 'top', 'z', [W, H, 0], [W, H, d], 0, 'right'));
  return { items, dims };
}

const BUILDERS = { sofa: partsSofa, corner: partsCorner, ushape: partsUshape, modular: partsModular, bed: partsBed, armchair: partsArmchair, pouf: partsPouf };

/* parts: детали + размеры в мировых координатах (центр габарита на полу в начале координат) */
export function parts(type, params) {
  if (!BUILDERS[type]) { type = 'sofa'; params = {}; }
  const p = normalize(type, params);
  const res = BUILDERS[type](p);
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  /* decor (одеяло, подушки на кровати) — только для вида: не входит в габарит, чертёж и список деталей */
  for (const it of res.items) {
    if (it.decor) continue; const b = itemBounds(it); for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], b.min[k]); max[k] = Math.max(max[k], b.max[k]); } }
  const cx = (min[0] + max[0]) / 2, cz = (min[2] + max[2]) / 2, cy = min[1];
  const sh = (pt) => [pt[0] - cx, pt[1] - cy, pt[2] - cz];
  const items = res.items.map((it) => ({ ...it, x: it.x - cx, y: it.y - cy, z: it.z - cz }));
  const dimsList = res.dims.filter((d) => d.value > 0.0005).map((d) => ({ ...d, a: sh(d.a), b: sh(d.b) }));
  return { bbox: { w: max[0] - min[0], d: max[2] - min[2], h: max[1] - min[1] }, items, dims: dimsList, notes: res.notes || [] };
}
export function dims(type, params) {
  const { bbox } = parts(type, params);
  return { w: bbox.w, d: bbox.d, h: bbox.h };
}
export function labelOf(type, params = {}) {
  if (!DEFAULTS[type]) type = 'sofa';
  const p = normalize(type, params);
  const t = TITLE[type] || TITLE.sofa;
  if (type === 'corner') return `${t}, ${p.form === 'chaise' ? 'с шезлонгом' : 'Г-образный'}, ${OPTIONS.side[p.side] || 'угол слева'}`;
  if (type === 'modular' && p.chaise !== 'none') return `${t}, ${OPTIONS.chaise[p.chaise]}`;
  if (type === 'armchair' && p.form === 'round') return `${t} округлое`;
  if (type === 'pouf') return p.form === 'bench' ? 'Банкетка' : `Пуф ${p.form === 'square' ? 'квадратный' : 'круглый'}`;
  return t;
}
