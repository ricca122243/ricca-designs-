/* RICCA · «Соберите свою мебель» — страница конструктора: состояние, шаги, поля, адрес, WhatsApp, localStorage.
   Тип → Форма → Размер → Ткань → Итог. Один setState() → validate → интерфейс → перестройка 3D (с задержкой) → адрес → сохранение.
   Параметры — в метрах (params.js), на экране — сантиметры. Цен нет: «Рассчитаем стоимость в WhatsApp». */

/* Сначала — интерфейс (параметры, проверка, адрес, ткани: лёгкие модули), 3D-движок (three.js, модель, материалы, сцена)
   догружается после первого показа шагов: initStage() → import(). Так кнопки выбора появляются, пока грузится 3D. */
import { validate, MSG_HARD } from './validate.js';
import * as P from './params.js';
import { loadLibrary, findFabric, defaultFabric, fabricOf, fabricRef, fabricShort, findFabricShort, allFabrics } from './fabrics.js';
import { encodeCfg, decodeCfg, cfgId, waText, waSizeText, waUrl, summaryLines, titleOf, optLabel, backLook, fmtCm, toCm, encodeRoom, decodeRoom, roomText } from './share.js';

let F = null, M = null;          // furniture3d.js, materials.js — после загрузки 3D
let engineP = null;
function loadEngine() {
  if (!engineP) engineP = Promise.all([import('./furniture3d.js'), import('./materials.js'), import('./stage.js')]).then(([f, m, st]) => { F = f; M = m; return { F: f, M: m, createStage: st.createStage }; });
  return engineP;
}
const engineApi = () => ({ build: F.build, disposePiece: F.disposePiece, setMaterials: F.setMaterials, materialSet: M.materialSet, fabricMaterial: M.fabricMaterial, normalize: P.normalize, dims: P.dims, parts: P.parts, labelOf: P.labelOf, DEFAULTS: P.DEFAULTS, TYPES: P.TYPES });

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const ICONS = 'img/cfg/icons.svg';
const ico = (id, cls = 'ico') => `<svg class="${cls}" aria-hidden="true"><use href="${ICONS}#${id}"/></svg>`;
const mqPhone = matchMedia('(max-width: 899px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isHttp = /^https?:$/.test(location.protocol);
const LS = { cfg: 'ricca.cfg.v1', room: 'ricca.room.v1', seen: 'ricca.cfg.seen' };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* приватный режим — живём без него */ } };

/* ═════════ схема интерфейса ═════════ */
const SOFAS = new Set(['sofa', 'corner', 'ushape', 'modular']);
const WOOD = P.WOOD_FINISHES || ['oak', 'walnut', 'blackwood'];
const METAL = P.METAL_FINISHES || ['black', 'gold'];
const LOWHIGH = { sofa: [P.SOFA_H_LOW, P.SOFA_H_HIGH], corner: [P.SOFA_H_LOW, P.SOFA_H_HIGH], ushape: [P.SOFA_H_LOW, P.SOFA_H_HIGH], armchair: [P.ARMCHAIR_H_LOW, P.ARMCHAIR_H_HIGH] };

/* подписи на кнопках-чипах, где общий словарь звучит длинно под заголовком строки */
const CHIP = {
  side: { left: 'Слева', right: 'Справа' }, chaise: { none: 'Нет', left: 'Слева', right: 'Справа' },
  armStyle: { none: 'Без' }, backLook: { low: 'Низкая', high: 'Высокая' }, sections: { auto: 'Авто' },
  lift: { false: 'Без механизма', true: 'Подъёмный' }, piping: { false: 'Без канта', true: 'С кантом' },
  arms: { none: 'Без подлокотников', thin: 'Полукресло' },
};
const chipLabel = (type, key, v) => (CHIP[key] && CHIP[key][String(v)]) || cap(optLabel(type, key, v));

const row = (key, label, values, extra = {}) => ({ key, label, values, ...extra });
const ROWS = {
  arm: (t) => row('armStyle', 'Подлокотники', (p) => (t === 'armchair' && p.form === 'round' ? ['thin', 'wide', 'round'] : ['none', 'thin', 'wide', 'round'])),
  look: () => row('backLook', 'Спинка', () => ['low', 'high'], { get: (p, t) => (backLook(t, p) === 'низкая' ? 'low' : 'high') }),
  backC: () => row('backCushions', 'Подушки спинки', () => ['fixed', 'loose']),
  seatC: () => row('seatCushions', 'Сиденье', () => ['single', 'sections']),
  /* только те количества секций, что помещаются (validate: секция не уже 45 см) — иначе щелчок ничего бы не менял */
  sect: (t) => row('sections', 'Секций', (p) => ['auto', ...[2, 3, 4, 5].filter((n) => { try { return validate(t, { ...p, sections: n }).params.sections === n; } catch (e) { return true; } })], { when: (p) => p.seatCushions === 'sections' }),
  legs: (vals = ['hidden', 'metal', 'wood', 'plinth']) => row('legs', 'Ножки', () => vals),
  fin: () => row('legFinish', 'Отделка ножек', (p) => (p.legs === 'metal' ? METAL : WOOD), { when: (p) => p.legs === 'metal' || p.legs === 'wood' }),
  pipe: () => row('piping', 'Кант', () => [false, true]),
};
const FORM = {
  sofa: [ROWS.arm('sofa'), ROWS.look(), ROWS.backC(), ROWS.seatC(), ROWS.sect('sofa'), ROWS.legs(), ROWS.fin(), ROWS.pipe()],
  corner: [row('side', 'Угол', () => ['left', 'right']), row('form', 'Форма', () => ['L', 'chaise']), ROWS.arm('corner'), ROWS.look(), ROWS.backC(), ROWS.seatC(), ROWS.sect('corner'), ROWS.legs(), ROWS.fin(), ROWS.pipe()],
  ushape: [ROWS.arm('ushape'), ROWS.look(), ROWS.backC(), ROWS.seatC(), ROWS.sect('ushape'), ROWS.legs(), ROWS.fin(), ROWS.pipe()],
  modular: [row('modules', 'Модулей', null, { count: [2, 6] }), row('chaise', 'Шезлонг', () => ['none', 'left', 'right']), ROWS.arm('modular'), ROWS.backC(), ROWS.legs(), ROWS.fin(), ROWS.pipe()],
  bed: [row('hbStyle', 'Изголовье', () => ['plain', 'channels', 'capitone', 'wings']), row('base', 'Основание', () => ['plinth', 'legs']),
    row('legFinish', 'Отделка ножек', () => [...WOOD, ...METAL], { when: (p) => p.base === 'legs' }), row('lift', 'Подъёмный механизм', () => [false, true]), ROWS.pipe()],
  armchair: [row('form', 'Форма', () => ['classic', 'round']), ROWS.arm('armchair'), ROWS.look(), { ...ROWS.backC(), when: (p) => p.form !== 'round' }, ROWS.legs(), ROWS.fin(), ROWS.pipe()],
  pouf: [row('form', 'Форма', () => ['round', 'square', 'bench']), row('top', 'Верх', () => ['smooth', 'capitone']), ROWS.legs(['hidden', 'wood', 'metal']), ROWS.fin(), ROWS.pipe()],
};

const fld = (key, label, when) => ({ key, label, when });
const legLabel = (p) => (p.legs === 'plinth' ? 'Высота цоколя' : 'Высота ножек');
const SOFA_FIELDS = (wLabel = 'Ширина') => [fld('w', wLabel), fld('d', 'Глубина'), fld('h', 'Высота'), fld('seatH', 'Высота сиденья'), fld('seatD', 'Глубина сиденья'),
  fld('armW', 'Ширина подлокотника', (p) => p.armStyle !== 'none'), fld('armH', 'Высота подлокотника', (p) => p.armStyle !== 'none'), fld('legH', legLabel, (p) => p.legs !== 'hidden')];
const SIZE = {
  sofa: SOFA_FIELDS(),
  corner: [fld('w', 'Длина вдоль спинки'), fld('l', (p) => (p.form === 'chaise' ? 'Длина шезлонга' : 'Вторая сторона')), fld('chaiseW', 'Ширина шезлонга', (p) => p.form === 'chaise'), ...SOFA_FIELDS().slice(1)],
  ushape: [fld('w', 'Ширина'), fld('l', 'Боковые стороны'), ...SOFA_FIELDS().slice(1)],
  modular: [fld('moduleW', 'Ширина модуля'), fld('chaiseL', 'Глубина шезлонга', (p) => p.chaise !== 'none'), ...SOFA_FIELDS().slice(1)],
  bed: [fld('mw', 'Ширина матраса'), fld('ml', 'Длина матраса'), fld('hbH', 'Высота изголовья'), fld('hbOver', 'Выступ изголовья с каждой стороны'),
    fld('frameT', 'Боковина'), fld('railH', 'Высота царги'), fld('legH', 'Высота ножек', (p) => p.base === 'legs')],
  /* округлое кресло: оболочка вместо подлокотников — её толщина и высота спереди */
  armchair: [...SOFA_FIELDS().slice(0, 5), fld('armW', (p) => (p.form === 'round' ? 'Толщина оболочки' : 'Ширина подлокотника'), (p) => p.armStyle !== 'none'),
    fld('armH', (p) => (p.form === 'round' ? 'Высота оболочки спереди' : 'Высота подлокотника'), (p) => p.armStyle !== 'none'), fld('legH', legLabel, (p) => p.legs !== 'hidden')],
  pouf: [fld('w', (p) => ({ round: 'Диаметр', square: 'Сторона', bench: 'Длина' }[p.form] || 'Ширина')), fld('d', 'Глубина', (p) => p.form === 'bench'), fld('h', 'Высота'), fld('legH', 'Высота ножек', (p) => p.legs !== 'hidden')],
};
const KEY_CHIPS = { bed: { mw: [90, 120, 140, 160, 180, 200], ml: [190, 200, 210] } };
const lbl = (f, p) => (typeof f.label === 'function' ? f.label(p) : f.label);
const rangeOf = (type, key, p) => (P.rangeOf ? P.rangeOf(type, key, p) : null) || (P.RANGES[type] && P.RANGES[type][key]) || { min: 0.02, max: 6, def: p[key] };

/* побочные действия выбора (SPEC §1.1–1.2): новый стиль подлокотника — его ширина по умолчанию, ножки — отделка и высота и т. п. */
function sideEffects(type, key, v, p) {
  const def = (k) => { const r = rangeOf(type, k, p); return r ? r.def : p[k]; };
  if (key === 'backLook') { const lh = LOWHIGH[type]; if (lh) p.h = v === 'low' ? lh[0] : lh[1]; delete p.backLook; }
  if (key === 'armStyle') p.armW = v === 'none' ? 0 : P.armDef(type, v);
  if (key === 'legs') {
    if (v === 'metal' && !METAL.includes(p.legFinish)) p.legFinish = 'black';
    if (v === 'wood' && !WOOD.includes(p.legFinish)) p.legFinish = 'oak';
    if (v === 'hidden') p.legH = P.HIDDEN_LEG_H || 0.02;
    else { const r = rangeOf(type, 'legH', p); if (r && (p.legH < r.min || p.legH > r.max)) p.legH = r.def; }
  }
  if (type === 'bed' && key === 'base') { const r = rangeOf(type, 'legH', p); if (r) p.legH = r.def; if (v === 'legs' && !p.legFinish) p.legFinish = 'oak'; }
  if (type === 'corner' && key === 'form') p.l = def('l');
  if (type === 'pouf' && key === 'form') {
    p.w = def('w'); p.d = v === 'bench' ? 0.45 : p.w; p.legs = v === 'bench' ? 'wood' : 'hidden'; p.legFinish = 'oak';
    p.legH = v === 'bench' ? 0.12 : (P.HIDDEN_LEG_H || 0.02); p.piping = v === 'round';
  }
  if (type === 'armchair' && key === 'form' && v === 'round' && p.armStyle === 'none') { p.armStyle = 'round'; p.armW = P.armDef(type, 'round'); }
  if (type === 'armchair' && key === 'form' && v === 'round') { const mx = p.d - Math.max(0.10, p.armW || 0.15) - 0.02; if (p.seatD > mx) p.seatD = Math.round(mx * 100) / 100; }
  /* округлое кресло — цельная оболочка, съёмных подушек спинки у него нет */
  if (type === 'armchair' && key === 'form' && v === 'round') p.backCushions = 'fixed';
}

/* ═════════ состояние ═════════ */
const lib = await loadLibrary();
const state = {
  v: 1, mode: 'model', type: 'sofa', params: {}, fabric: defaultFabric(lib), qty: 1, note: '', view: '3d', showDims: false, step: 1,
  notes: [], fieldNotes: {}, errors: [], inputErr: {}, inputRaw: {},
  /* ткань из ссылки/памяти, которой больше нет в библиотеке: на модели — спокойная по умолчанию, в итоге и WhatsApp — «подберём вместе» */
  fabricLost: false, visited: new Set([1]),
};
const MSG_FAB_LOST = 'Эта ткань сейчас не в библиотеке конструктора — выберите похожую; образцы покажем в шоуруме';
const MSG_TYPE_GONE = 'Ателье шьёт только мягкую мебель — показываем диван';
let pendingToast = '';
const memo = {};                // параметры других типов в этой сессии (вернуться без потерь)
let qtyTouched = false;

function runValidate(type, params) {
  try {
    const r = validate(type, params) || {};
    return { params: r.params || P.normalize(type, params), notes: r.notes || [], errors: r.errors || [], fieldNotes: r.fieldNotes || {} };
  } catch (e) {
    console.warn('validate', e);
    return { params: P.normalize(type, params), notes: [], errors: [], fieldNotes: {} };
  }
}
function applyParams(type, params) {
  const r = runValidate(type, params);
  state.type = type; state.params = r.params; state.notes = r.notes; state.fieldNotes = r.fieldNotes; state.errors = r.errors;
  return r;
}
const curDims = () => { try { return P.dims(state.type, state.params); } catch (e) { return null; } };
const shownFabric = () => (state.fabricLost ? null : state.fabric);
const id = () => cfgId({ type: state.type, params: state.params, fabric: shownFabric() });
const cfgState = () => ({ type: state.type, params: state.params, fabric: shownFabric(), qty: state.qty, note: state.note });
/* адрес варианта: #cfg=<параметры>&f=<коллекция>:<N> (ткань — номером цвета, как на сайте #fabric-<коллекция>-<N>) */
const hashOf = () => {
  const s = cfgState(); const fs = fabricShort(s.fabric);   // ткань, которой нет в библиотеке, в адрес не пишем
  return `#cfg=${encodeCfg({ ...s, fabric: fs ? null : s.fabric }, { defaults: P.DEFAULTS[state.type] })}${fs ? `&f=${fs}` : ''}`;
};
const variantLink = () => (isHttp ? `${location.origin}${location.pathname}${hashOf()}` : '');
/* «#cfg=…&f=alba:12», «#f=alba:12» (со страницы «Ткани»), «#room=…» → части */
function parseHash(h) {
  const out = { cfg: null, f: null, room: null };
  String(h || '').replace(/^#/, '').split('&').forEach((part) => {
    if (part.startsWith('cfg=')) out.cfg = part.slice(4);
    else if (part.startsWith('f=')) { try { out.f = decodeURIComponent(part.slice(2)); } catch (e) { out.f = part.slice(2); } }
    else if (part.startsWith('room=')) out.room = part.slice(5);
  });
  return out;
}
const hasErrors = () => state.errors.length > 0 || Object.keys(state.inputErr).length > 0;
const firstError = () => Object.values(state.inputErr)[0] || state.errors[0] || '';

/* ═════════ загрузка: адрес → localStorage → по умолчанию ═════════ */
function fromCfgString(str) {
  const d = decodeCfg(str, { defaults: P.DEFAULTS });
  if (!d.type) return false;
  /* старые ссылки на стол или стул: ателье их не делает — открываем диван по умолчанию, без ошибок */
  if (!P.DEFAULTS[d.type]) { if (!(P.REMOVED_TYPES || []).includes(d.type)) return false; applyParams('sofa', {}); state.qty = 1; state.note = d.note || ''; pendingToast = MSG_TYPE_GONE; return true; }
  applyParams(d.type, d.params);
  if (d.fabricRef) { const f = findFabric(d.fabricRef, lib); if (f) { state.fabric = f; state.fabricLost = false; } else { state.fabric = defaultFabric(lib); state.fabricLost = true; pendingToast = MSG_FAB_LOST; } }
  state.qty = d.qty || P.DEFAULTS[d.type].qty || 1; state.note = d.note || '';
  qtyTouched = d.qty > 1;
  return true;
}
let arrivedFabric = null;         // ткань из ссылки «Примерить на мебели в 3D» (#f=…)
function load() {
  const h = parseHash(location.hash);
  const fab = h.f ? findFabricShort(h.f, lib) : null;
  const lost = !!h.f && !fab;
  if (h.cfg && fromCfgString(h.cfg)) {
    if (fab) { state.fabric = fab; state.fabricLost = false; }
    if (lost) { state.fabricLost = true; pendingToast = MSG_FAB_LOST; return 'fabric'; }
    return 'hash';
  }
  if (h.room) state.mode = 'room';
  const src = loadStored();
  if (fab) { state.fabric = fab; state.fabricLost = false; arrivedFabric = fab; return 'fabric'; }
  if (lost) { state.fabricLost = true; pendingToast = MSG_FAB_LOST; return 'fabric'; }
  return src;
}
function loadStored() {
  const raw = lsGet(LS.cfg);
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (s && P.DEFAULTS[s.type]) {
        applyParams(s.type, s.params || {});
        if (s.fabricRef) { const f = findFabric(s.fabricRef, lib); if (f) state.fabric = f; else { state.fabricLost = true; pendingToast = MSG_FAB_LOST; } }
        state.qty = Math.max(1, Math.min(99, +s.qty || 1)); state.note = String(s.note || '').slice(0, 300); qtyTouched = !!s.qtyTouched;
        return 'storage';
      }
    } catch (e) { /* битая запись — по умолчанию */ }
  }
  applyParams('sofa', {}); state.qty = 1;
  return 'defaults';
}
function save() {
  lsSet(LS.cfg, JSON.stringify({ v: 1, type: state.type, params: state.params, fabricRef: state.fabricLost ? '' : fabricRef(state.fabric), qty: state.qty, qtyTouched, note: state.note }));
}
let hashT = 0, lastHash = '';
function writeHash() {
  clearTimeout(hashT);
  hashT = setTimeout(() => {
    if (state.mode !== 'model') return;
    lastHash = hashOf();
    try { history.replaceState(null, '', lastHash); } catch (e) { /* file:// и т. п. */ }
  }, 300);
}

/* ═════════ setState: всё проходит здесь ═════════ */
function setState(patch = {}, { rebuild = 'auto', drag = false, structural = false } = {}) {
  Object.assign(state, patch);
  renderHeads(); renderSummary(); renderViewportSize();
  if (structural) { renderForm(); renderSize(); renderFabricVisibility(); } else { syncSize(); if (formKey() !== lastFormKey) renderForm(); }
  if (rebuild) scheduleRebuild(drag);
  writeHash(); save();
}

/* ═════════ шаг 1 — тип ═════════ */
function renderTypes() {
  const box = $('#types');
  box.innerHTML = P.TYPES.map((t) => `<button class="type" type="button" role="radio" aria-checked="${t.id === state.type}" data-type="${t.id}">
    ${ico('t-' + t.id, 'type__ico')}<span class="type__t">${esc(t.title)}</span></button>`).join('');
}
function syncTypes() {
  $$('#types .type').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.type === state.type)));
  const cat = (P.TYPES.find((t) => t.id === state.type) || {}).category || '';
  $('#to-catalog').href = `index.html#catalog${cat ? '/' + cat : ''}`;
  const phi = $('#vp-ph-ico use'); if (phi) phi.setAttribute('href', `${ICONS}#t-${state.type}`);
}
function setType(type) {
  if (type === state.type) return;
  memo[state.type] = state.params;
  state.inputErr = {};
  applyParams(type, memo[type] || {});
  if (!qtyTouched) state.qty = (P.DEFAULTS[type] && P.DEFAULTS[type].qty) || 1;
  syncTypes();
  setState({}, { structural: true });
  if (stage && stage.frame) requestAnimationFrame(() => stage.frame({ animate: !reduced }));
}

/* ═════════ шаг 2 — форма ═════════ */
/* набор вариантов в «Форме» зависит от размера (например, сколько секций помещается) — перерисовать, когда он меняется */
let lastFormKey = '';
function formKey() {
  const p = state.params, t = state.type;
  return t + '|' + (FORM[t] || []).filter((r) => !r.when || r.when(p)).map((r) => r.key + ':' + (r.values ? r.values(p).join(',') : '')).join(';');
}
function renderForm() {
  lastFormKey = formKey();
  const p = state.params, t = state.type;
  const html = (FORM[t] || []).filter((r) => !r.when || r.when(p)).map((r) => {
    if (r.count) {
      const v = p[r.key];
      return `<div class="opt" data-row="${r.key}"><p class="opt__l" id="ol-${r.key}">${esc(r.label)}</p>
        <div class="num num--sm" role="group" aria-labelledby="ol-${r.key}">
          <button class="num__b" type="button" data-count="${r.key}" data-d="-1" aria-label="Меньше" ${v <= r.count[0] ? 'disabled' : ''}>${ico('i-minus')}</button>
          <output class="num__o" aria-live="polite">${v}</output>
          <button class="num__b" type="button" data-count="${r.key}" data-d="1" aria-label="Больше" ${v >= r.count[1] ? 'disabled' : ''}>${ico('i-plus')}</button>
        </div></div>`;
    }
    const cur = r.get ? r.get(p, t) : p[r.key];
    const vals = r.values(p);
    return `<div class="opt" data-row="${r.key}"><p class="opt__l" id="ol-${r.key}">${esc(r.label)}</p>
      <div class="chips" role="radiogroup" aria-labelledby="ol-${r.key}">${vals.map((v) => `<button class="chip" type="button" role="radio" aria-checked="${String(v) === String(cur)}" data-opt="${r.key}" data-v="${esc(String(v))}">${esc(chipLabel(t, r.key, v))}</button>`).join('')}</div></div>`;
  }).join('');
  $('#opts').innerHTML = html;
}
function setOption(key, raw) {
  const t = state.type;
  const row0 = (FORM[t] || []).find((r) => r.key === key);
  const vals = row0 && row0.values ? row0.values(state.params) : [];
  const v = vals.find((x) => String(x) === raw);
  if (v === undefined) return;
  const p = { ...state.params };
  if (key !== 'backLook') p[key] = v;
  sideEffects(t, key, v, p);
  state.inputErr = {};
  applyParams(t, p);
  const focusSel = `[data-opt="${key}"][data-v="${CSS.escape(raw)}"]`;
  setState({}, { structural: true });
  const el = $(focusSel); if (el) el.focus({ preventScroll: true });
}
function setCount(key, d) {
  const row0 = (FORM[state.type] || []).find((r) => r.key === key); if (!row0) return;
  const v = Math.max(row0.count[0], Math.min(row0.count[1], (state.params[key] || row0.count[0]) + d));
  if (v === state.params[key]) return;
  applyParams(state.type, { ...state.params, [key]: v });
  setState({}, { structural: true });
  const el = $(`[data-count="${key}"][data-d="${d}"]`); if (el && !el.disabled) el.focus({ preventScroll: true });
}

/* ═════════ шаг 3 — размер ═════════ */
const fmtIn = (m) => fmtCm(m);
function presetActive(pr) {
  return Object.entries(pr.params).every(([k, v]) => (typeof v === 'number' ? toCm(v) === toCm(state.params[k] || 0) : String(state.params[k]) === String(v)));
}
function renderSize() {
  const t = state.type, p = state.params;
  const prs = (P.PRESETS[t] || []);
  $('#presets').innerHTML = prs.length ? `<p class="opt__l">Готовые размеры</p><div class="chips">${prs.map((pr, i) => `<button class="chip" type="button" aria-pressed="${presetActive(pr)}" data-preset="${i}">${esc(pr.label)}${/^\d/.test(pr.label) && !/[×x]/.test(pr.label) && t !== 'modular' ? ' см' : ''}</button>`).join('')}</div>` : '';
  const fields = (SIZE[t] || []).filter((f) => !f.when || f.when(p));
  let html = fields.map((f) => {
    const r = rangeOf(t, f.key, p);
    const min = Math.round(r.min * 100), max = Math.round(r.max * 100);
    const kc = KEY_CHIPS[t] && KEY_CHIPS[t][f.key];
    return `<div class="fld" data-key="${f.key}">
      ${kc ? `<div class="chips chips--key" role="group" aria-label="${esc(lbl(f, p))}: готовые">${kc.map((c) => `<button class="chip chip--s" type="button" data-keychip="${f.key}" data-v="${c}" aria-pressed="false">${c}</button>`).join('')}</div>` : ''}
      <div class="fld__top">
        <label class="fld__l" for="f-${f.key}">${esc(lbl(f, p))}</label>
        <div class="fld__num">
          <button class="fld__b" type="button" data-inc="-1" aria-label="${esc(lbl(f, p))}: меньше на 1 см">${ico('i-minus')}</button>
          <span class="fld__box"><input class="fld__i" id="f-${f.key}" inputmode="decimal" autocomplete="off" spellcheck="false" enterkeyhint="done" aria-describedby="fn-${f.key}"><span class="fld__u" aria-hidden="true">см</span></span>
          <button class="fld__b" type="button" data-inc="1" aria-label="${esc(lbl(f, p))}: больше на 1 см">${ico('i-plus')}</button>
        </div>
      </div>
      <input class="fld__r" type="range" min="${min}" max="${max}" step="1" aria-label="${esc(lbl(f, p))}, см" tabindex="-1">
      <div class="fld__scale" aria-hidden="true"><span>${min}</span><span>${max}</span></div>
      <p class="fld__n" id="fn-${f.key}" aria-live="polite"></p>
    </div>`;
  }).join('');
  if (t === 'modular') html += `<p class="flds__ro">Общая ширина <b data-ro="w"></b></p>`;
  if (t === 'bed') html += `<p class="flds__ro">Габарит кровати <b data-ro="bed"></b></p>`;
  $('#flds').innerHTML = html;
  syncSize(true);
}
function syncSize(all = false) {
  const t = state.type, p = state.params;
  $$('#flds .fld').forEach((el) => {
    const key = el.dataset.key; const v = p[key];
    const inp = $('.fld__i', el), rng = $('.fld__r', el);
    const r = rangeOf(t, key, p);
    if (all || document.activeElement !== inp) { if (!state.inputErr[key]) inp.value = typeof v === 'number' ? fmtIn(v) : ''; }
    rng.min = Math.round(r.min * 100); rng.max = Math.round(r.max * 100);
    $('.fld__scale', el).innerHTML = `<span>${rng.min}</span><span>${rng.max}</span>`;
    if (!rng.matches(':active')) rng.value = String(Math.round((v || 0) * 100));
    const n = $('.fld__n', el);
    const err = state.inputErr[key];
    const note = err || state.fieldNotes[key] || '';
    if (err) {
      n.innerHTML = `${esc(err)} <a class="fld__wa" href="${esc(sizeWaHref())}" target="_blank" rel="noopener">Написать в WhatsApp с этим размером</a>`;
    } else n.textContent = note;
    n.classList.toggle('is-err', !!err); el.classList.toggle('has-err', !!err);
    $$('[data-keychip]', el).forEach((b) => b.setAttribute('aria-pressed', String(Math.round(v * 100) === +b.dataset.v)));
  });
  $$('#presets [data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(presetActive((P.PRESETS[t] || [])[+b.dataset.preset]))));
  const ro = $('[data-ro="w"]'); if (ro) ro.textContent = `${fmtCm(p.w || 0)} см`;
  const rb = $('[data-ro="bed"]'); if (rb) { const d = curDims(); rb.textContent = d ? `${fmtCm(d.w)} × ${fmtCm(d.d)} см` : ''; }
}
function parseCm(s) {
  const t = String(s).replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '');
  if (!t) return NaN;
  const n = parseFloat(t);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : NaN;
}
function setSize(key, cmVal, { drag = false } = {}) {
  if (!Number.isFinite(cmVal)) { delete state.inputErr[key]; syncSize(true); return; }
  const cand = { ...state.params, [key]: cmVal / 100 };
  const r = runValidate(state.type, cand);
  if (r.errors.length) {
    state.inputErr = { ...state.inputErr, [key]: r.fieldNotes[key] || r.errors[0] };
    state.inputRaw = { ...state.inputRaw, [key]: cmVal };          // этот размер уйдёт в «Напишите — сошьём»
    renderSummary(); syncSize();
    return;
  }
  delete state.inputErr[key];
  state.inputRaw = { ...state.inputRaw, [key]: cmVal };
  state.params = r.params; state.notes = r.notes; state.fieldNotes = r.fieldNotes; state.errors = r.errors;
  setState({}, { drag });
}
/* ± с повтором при удержании */
let holdT = 0, holdI = 0;
function stepOnce(btn) {
  const fl = btn && btn.closest('.fld'); if (!fl) return;
  const key = fl.dataset.key;
  const cur = toCm(state.params[key] || 0);
  setSize(key, Math.round(cur + (+btn.dataset.inc || 0)), { drag: true });
}
function holdStop() { clearTimeout(holdT); clearInterval(holdI); if (holdT || holdI) { holdT = holdI = 0; scheduleRebuild(false); } }

/* ═════════ шаг 4 — ткань ═════════ */
let fabUI = { typeId: null, collectionId: null };
function renderFabricTabs() {
  const tabs = $('#fab-tabs');
  tabs.innerHTML = lib.types.map((t) => `<button class="fab__tab" type="button" role="tab" aria-selected="false" data-ftype="${esc(t.id)}">${esc(t.title)}</button>`).join('');
}
function renderFabric() {
  const f = state.fabric;
  if (!fabUI.typeId) { fabUI.typeId = f ? f.typeId : lib.types[0].id; fabUI.collectionId = f ? f.collectionId : null; }
  const t = lib.types.find((x) => x.id === fabUI.typeId) || lib.types[0];
  const col = t.collections.find((c) => c.id === fabUI.collectionId) || t.collections[0];
  fabUI.typeId = t.id; fabUI.collectionId = col.id;
  $$('#fab-tabs .fab__tab').forEach((b) => { const on = b.dataset.ftype === t.id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  $('#fab-cols').innerHTML = t.collections.map((c) => `<button class="fab__col" type="button" role="radio" aria-checked="${c.id === col.id}" data-fcol="${esc(c.id)}">
      <span class="fab__col-t">${esc(c.title)}</span><span class="fab__col-n">${c.colours.length} ${plural(c.colours.length, ['цвет', 'цвета', 'цветов'])}</span>
      ${c.kindTitle || c.facts ? `<span class="fab__col-f">${esc([cap(c.kindTitle), c.facts].filter(Boolean).join(' · '))}</span>` : ''}</button>`).join('');
  $('#fab-sw').innerHTML = col.colours.map((c) => {
    const on = f && f.typeId === t.id && f.collectionId === col.id && f.slug === c.slug;
    const nm = c.finish ? `${c.name}, ${c.finish}` : c.name;
    return `<button class="sw" type="button" role="radio" aria-checked="${on}" data-fslug="${esc(c.slug)}" title="${esc(nm)}" aria-label="${esc(nm)}">
      <span class="sw__c" style="background-color:${c.hex};background-image:url('${esc(c.src240 || c.src450)}')"></span><span class="sw__n" aria-hidden="true">${esc(c.name)}${c.finish ? `<span class="sw__f">${esc(c.finish)}</span>` : ''}</span></button>`;
  }).join('');
  renderFabricPreview();
}
function renderFabricPreview() {
  const f = state.fabric; if (!f) return;
  const img = $('#fab-pv-img');
  if (img.dataset.src !== f.src900) { img.dataset.src = f.src900; img.src = f.src450; img.srcset = `${f.src450} 450w, ${f.src900} 900w`; img.sizes = '(min-width: 900px) 200px, 40vw'; }
  img.alt = `${f.typeTitle} ${f.collectionTitle}, цвет «${f.colour}»${f.finish ? `, ${f.finish}` : ''}`;
  $('#fab-pv-t').textContent = `${f.collectionTitle} · ${f.colour}`;
  $('#fab-pv-f').textContent = [f.kindTitle && !/:/.test(f.kindTitle) ? cap(f.kindTitle) : f.typeTitle, f.finish].filter(Boolean).join(' · ');
}
function renderFabricVisibility() { /* у всех изделий есть ткань (столы и стулья ателье не делает) */ }
function setFabric(slug) {
  const t = lib.types.find((x) => x.id === fabUI.typeId); const c = t && t.collections.find((x) => x.id === fabUI.collectionId);
  const col = c && c.colours.find((x) => x.slug === slug); if (!col) return;
  state.fabric = fabricOf(t, c, col); state.fabricLost = false;
  $$('#fab-sw .sw').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.fslug === slug)));
  renderFabricPreview();
  applyFabric();
  setState({}, { rebuild: false });
  renderFabChip();
}
const plural = (n, f) => { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2]; };

/* «Нужен другой размер?»: текущий габарит + размеры, которые клиент ввёл (и те, что форма не приняла) */
function sizeWaHref() {
  const p = state.params, t = state.type;
  const wanted = Object.entries(state.inputRaw).map(([k, cm]) => { const f = (SIZE[t] || []).find((x) => x.key === k); return f && (state.inputErr[k] || Math.abs(cm - toCm(p[k] || 0)) > 0.05) ? { label: lbl(f, p), cm } : null; }).filter(Boolean);
  return waUrl(waSizeText(cfgState(), { link: variantLink(), id: id(), dims: curDims(), wanted }));
}

/* ═════════ шаг 5 — итог ═════════ */
function renderSummary() {
  const s = cfgState(); const d = curDims(); const rid = id();
  $('#sum-title').innerHTML = `${esc(titleOf(state.type, state.params))} <span class="sum__id">№&nbsp;${rid}</span>`;
  const lines = summaryLines(s, { dims: d }).filter((r) => r.label !== 'Количество' && r.label !== 'Пожелание');
  $('#sum-list').innerHTML = lines.map((r) => `<div class="sum__li"><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('');
  $('#sum-notes').innerHTML = state.notes.map((n) => `<li>${esc(n)}</li>`).join('');
  const qty = $('#qty'); if (document.activeElement !== qty) qty.value = String(state.qty);
  const note = $('#note'); if (document.activeElement !== note && note.value !== state.note) note.value = state.note;
  $('#note-count').textContent = `${state.note.length} / 300`;
  const link = variantLink();
  const bad = hasErrors();
  const err = $('#sum-err'); err.hidden = !bad; err.textContent = bad ? firstError() : '';
  for (const a of [$('#wa-send'), $('#bar-wa')]) {
    if (a.id === 'bar-wa' && state.mode === 'room' && roomApi) { a.href = roomApi.waHref(); continue; }
    a.href = bad ? '#size' : waUrl(waText(s, { link, dims: d, id: rid }));
    a.classList.toggle('is-off', bad); a.setAttribute('aria-disabled', String(bad));
  }
  $('#b-drawing').disabled = bad;
  $('#wa-size').href = sizeWaHref();
  syncBar();
  const plain = $('[data-wa-plain]'); if (plain) plain.href = waUrl('Здравствуйте! Пишу из конструктора RICCA.');
}
function renderHeads() {
  const p = state.params, d = curDims();
  const set = (n, v) => { const el = $(`[data-step-val="${n}"]`); if (el) el.textContent = v; };
  set(1, (P.TYPES.find((t) => t.id === state.type) || {}).title || '');
  set(2, titleOf(state.type, p) === ((P.TYPES.find((t) => t.id === state.type) || {}).title) ? formHint() : titleOf(state.type, p));
  set(3, d ? `${fmtCm(d.w)} × ${fmtCm(d.d)} × ${fmtCm(d.h)} см` : '');
  set(4, state.fabricLost ? 'подберём вместе' : state.fabric ? `${state.fabric.collectionTitle} · ${state.fabric.colour}` : '');
  set(5, id());
}
function formHint() {
  const p = state.params, t = state.type;
  if (p.armStyle) return `${cap(optLabel(t, 'armStyle', p.armStyle))}${p.armStyle === 'none' ? '' : ' подлокотники'}`;
  if (t === 'bed') return cap(optLabel(t, 'hbStyle', p.hbStyle));
  return '';
}
let sizeAnnT = 0;
function renderViewportSize() {
  const d = curDims(); const txt = d ? `${fmtCm(d.w)} × ${fmtCm(d.d)} × ${fmtCm(d.h)} см` : '';
  $('#vp-size').textContent = txt;
  /* для экранного диктора — один раз, через 0,6 с после последнего изменения (не на каждом кадре ползунка) */
  clearTimeout(sizeAnnT); sizeAnnT = setTimeout(() => { const a = $('#sr-status'); if (a && a.dataset.last !== txt) { a.dataset.last = txt; a.textContent = txt ? `Размер ${txt}` : ''; } }, 600);
}

/* ═════════ шаги на телефоне: аккордеон ═════════ */
function syncSteps() {
  const phone = mqPhone.matches;
  $$('.step').forEach((li) => {
    const n = +li.dataset.step; const open = !phone || n === state.step;
    li.classList.toggle('is-open', open);
    const b = $('.step__head', li);
    /* на компьютере шаги всегда открыты — заголовок не притворяется кнопкой-аккордеоном */
    if (phone) { b.setAttribute('aria-expanded', String(open)); b.setAttribute('aria-controls', `sb-${n}`); b.removeAttribute('aria-disabled'); }
    else { b.removeAttribute('aria-expanded'); b.removeAttribute('aria-controls'); b.setAttribute('aria-disabled', 'true'); }
    b.tabIndex = phone ? 0 : -1;
    $('.step__body', li).hidden = !open;
  });
  syncBar();
}
/* нижняя плашка телефона ведёт по шагам: «Далее: форма → 1/5» … на последнем шаге (или когда все пройдены) — «В WhatsApp» */
const STEP_NAMES = { 1: 'тип', 2: 'форма', 3: 'размер', 4: 'ткань', 5: 'итог' };
function nextStepFor() {
  if (state.visited.size >= 5 || state.step === 5) return 0;
  if (state.step >= 1 && state.step <= 4) return state.step + 1;
  for (let n = 1; n <= 5; n++) if (!state.visited.has(n)) return n;
  return 0;
}
function syncBar() {
  const nb = $('#bar-next'), wa = $('#bar-wa'); if (!nb || !wa) return;
  const n = state.mode === 'model' ? nextStepFor() : 0;
  nb.hidden = !n; wa.hidden = !!n;
  if (n) { $('#bar-next-t').textContent = `Далее: ${STEP_NAMES[n]}`; $('#bar-next-n').textContent = `${Math.max(1, Math.min(5, n - 1 || 1))}/5`; nb.dataset.next = String(n); }
}
function openStep(n, scroll = true) {
  state.step = n; if (n) state.visited.add(n); syncSteps();
  if (scroll && mqPhone.matches) {
    const li = $(`.step[data-step="${n}"]`);
    requestAnimationFrame(() => {
      const vp = $('#vp'); const hdr = $('#hdr').offsetHeight;
      const top = li.getBoundingClientRect().top + window.scrollY - hdr - (state.mode === 'model' ? vp.offsetHeight : 0);
      window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' });
    });
  }
}

/* ═════════ 3D ═════════ */
let stage = null, piece = null, mats = null, rbT = 0, rbLast = 0;
const quality = () => (mqPhone.matches ? 'mid' : 'high');
/* модель подтянется, когда догрузится 3D */
function scheduleRebuild(drag) {
  if (!stage) return;
  clearTimeout(rbT);
  if (drag) {
    const now = performance.now();
    if (now - rbLast > 100) { rbLast = now; rebuild('mid'); }
    rbT = setTimeout(() => rebuild(quality()), 180);
  } else rbT = setTimeout(() => rebuild(quality()), 120);
}
function rebuild(q = quality()) {
  if (!stage) return;
  try {
    const cfg = { type: state.type, params: state.params, fabric: state.fabric, quality: q };
    mats = M.materialSet(cfg);
    const g = F.build(state.type, state.params, mats, { quality: q });
    const old = piece; piece = g;
    if (state.mode === 'model') stage.setObject(g);
    if (old && old !== g) F.disposePiece(old);
    updateDims();
  } catch (e) { console.error('3D', e); }
}
/* цвет ткани — без перестройки: заменить материал у всех тканевых деталей */
function applyFabric() {
  if (!stage || !piece || !mats) return;
  try {
    const nf = M.fabricMaterial({ hex: state.fabric.hex, kind: state.fabric.kind, src450: state.fabric.src450, collectionId: state.fabric.collectionId, finish: state.fabric.finish, quality: quality() });
    if (typeof F.setMaterials === 'function') F.setMaterials(piece, { fabric: nf });           // furniture3d.js: ткань + швы по userData.matKey
    else {
      const old = mats.fabric;
      piece.traverse((o) => {
        if (!o.isMesh) return;
        const isFab = (m) => m === old || (o.userData && o.userData.mat === 'fabric' && m && !m.userData?.derived);
        if (Array.isArray(o.material)) o.material = o.material.map((m) => (isFab(m) ? nf : m));
        else if (isFab(o.material)) o.material = nf;
      });
    }
    mats = { ...mats, fabric: nf };
    if (state.mode === 'model') stage.requestRender();
  } catch (e) { console.error('fabric', e); rebuild(); }
}
function dimsForView(view) {
  let list = [];
  try { list = P.parts(state.type, state.params).dims || []; } catch (e) { return null; }
  if (view === '3d') {
    const seen = new Set(); return list.filter((d) => d.tier === 0 && !seen.has(d.axis) && seen.add(d.axis));
  }
  return list.filter((d) => d.view === view);
}
function updateDims() { if (stage && stage.setDims) stage.setDims(state.showDims && state.mode === 'model' ? dimsForView(stage.view || state.view) : null); }
function setView(v) {
  state.view = v;
  $$('.vp__views [data-view]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.view === v)));
  if (stage) { stage.setView(v, { animate: !reduced }); updateDims(); }
}
async function initStage() {
  const host = $('#stage');
  try {
    const eng = await loadEngine();
    stage = await Promise.resolve(eng.createStage(host, { quality: 'auto' }));
  } catch (e) {
    stage = null;
    const msg = $('#vp-ph-msg'); msg.hidden = false;
    msg.textContent = 'Трёхмерный вид недоступен на этом устройстве. Параметры, ткань и отправка в WhatsApp работают.';
    $('#vp').classList.add('no-3d');
    return;
  }
  let shown = false;
  stage.on('render', () => { if (!shown) { shown = true; $('#vp-ph').classList.add('is-gone'); } });
  stage.on('view', (v) => { if (typeof v === 'string' && v !== state.view) { state.view = v; $$('.vp__views [data-view]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.view === v))); } updateDims(); });
  const real = $('#t-real');
  real.hidden = !(typeof stage.photoreal === 'function' && (stage.supportsPhotoreal === true || stage.photorealSupported === true));
  rebuild(quality());
  if (stage.frame && state.mode === 'model') stage.frame({ animate: false });
  renderFabChip();
}

/* ═════════ «На модели»: ткань в углу окна 3D; касание — крупный план подушки сиденья ═════════ */
function renderFabChip() {
  const chip = $('#vp-fab'); if (!chip) return;
  const f = state.fabric;
  if (!f || state.mode !== 'model') { chip.hidden = true; return; }
  chip.hidden = false;
  $('#vp-fab-c').style.backgroundImage = `url('${f.src240 || f.src450}')`; $('#vp-fab-c').style.backgroundColor = f.hex;
  $('#vp-fab-t').textContent = state.fabricLost ? 'Ткань подберём вместе' : `${f.collectionTitle} · ${f.colour}`;
  chip.setAttribute('aria-label', `${state.fabricLost ? 'Ткань подберём вместе' : `Ткань ${f.collectionTitle}, ${f.colour}`}: показать крупно на сиденье`);
}
function seatCloseUp() {
  if (!stage || !stage.closeUp) return;
  let it = null; try { it = P.parts(state.type, state.params).items.find((x) => x.role === 'seat'); } catch (e) { it = null; }
  const d = curDims();
  const target = it ? [it.x, it.y + it.sy / 2, it.z + it.sz * 0.15] : [0, d ? d.h * 0.55 : 0.4, 0];
  if (stage.view !== '3d') setView('3d');
  stage.closeUp(target, 0.95, { animate: !reduced });
}

/* ═════════ фото и файлы ═════════ */
function toast(msg, ms = 2600) {
  const t = $('#vp-toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms);
}
/* выбранный цвет ткани — в поле зрения (после прихода из «Ткани крупно») */
function revealFabric() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const sw = $('#fab-sw .sw[aria-checked="true"]') || $('#fab-sw');
    if (sw) sw.scrollIntoView({ block: 'center', behavior: 'auto' });
    const col = $('#fab-cols .fab__col[aria-checked="true"]'); if (col && mqPhone.matches) col.scrollIntoView({ inline: 'center', block: 'nearest' });
  }));
}
/* радиогруппы (тип, опции, цвета, стены, пол): стрелки двигают выбор, Tab — одна остановка на группу */
function rovingSync(root = document) {
  $$('[role="radiogroup"]', root).forEach((g) => {
    const rs = $$('[role="radio"]', g).filter((r) => r.closest('[role="radiogroup"]') === g);
    if (!rs.length) return;
    const on = rs.find((r) => r.getAttribute('aria-checked') === 'true') || rs[0];
    rs.forEach((r) => { r.tabIndex = r === on ? 0 : -1; });
  });
}
function bindRadioKeys() {
  document.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const r = e.target.closest && e.target.closest('[role="radio"]'); if (!r) return;
    const g = r.closest('[role="radiogroup"]'); if (!g || g.classList.contains('vp__views')) return;
    const rs = $$('[role="radio"]', g).filter((x) => x.closest('[role="radiogroup"]') === g && !x.disabled);
    const i = rs.indexOf(r); if (i < 0) return;
    e.preventDefault();
    const n = rs[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + rs.length) % rs.length];
    const sel = n.dataset.type ? `[data-type="${CSS.escape(n.dataset.type)}"]` : n.dataset.opt ? `[data-opt="${CSS.escape(n.dataset.opt)}"][data-v="${CSS.escape(n.dataset.v)}"]`
      : n.dataset.fcol ? `[data-fcol="${CSS.escape(n.dataset.fcol)}"]` : n.dataset.fslug ? `[data-fslug="${CSS.escape(n.dataset.fslug)}"]`
        : n.dataset.roomWall ? `[data-room-wall="${CSS.escape(n.dataset.roomWall)}"]` : n.dataset.roomFloor ? `[data-room-floor="${CSS.escape(n.dataset.roomFloor)}"]` : null;
    n.click();
    const m = (sel && $(sel)) || n; m.focus({ preventScroll: false });
  });
  new MutationObserver(() => rovingSync()).observe($('#main'), { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-checked'] });
  rovingSync();
}
function download(blob, name) {
  const a = document.createElement('a'); const url = URL.createObjectURL(blob);
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
async function shareOrDownload(blob, name, { title = 'RICCA DESIGNS', text = '' } = {}) {
  const file = new File([blob], name, { type: blob.type || 'image/png' });
  if (mqPhone.matches && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title, text }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  }
  download(blob, name); return 'downloaded';
}
async function savePhoto() {
  if (!stage) return;
  const btn = $('#t-photo'); btn.disabled = true;
  try {
    const phone = mqPhone.matches;
    const blob = await stage.snapshot({ width: phone ? 1600 : 2400, height: 1600, view: 'current', watermark: true });
    if (blob) { const r = await shareOrDownload(blob, `ricca-${id()}.png`, { title: 'RICCA DESIGNS' }); if (r === 'downloaded') toast('Фото сохранено'); }
  } catch (e) { console.error(e); toast('Не получилось сохранить фото'); }
  btn.disabled = false;
}
let ptAbort = null, ptBlob = null;
async function photoreal() {
  if (!stage || typeof stage.photoreal !== 'function') return;
  const box = $('#vp-pt'); box.hidden = false; $('#vp-pt-save').hidden = true; $('#vp-pt-cancel').hidden = false;
  $('#vp-pt-txt').textContent = 'Фотореалистичный кадр'; $('#vp-pt-bar').style.transform = 'scaleX(0)';
  ptAbort = new AbortController(); ptBlob = null;
  try {
    const phone = mqPhone.matches;
    const blob = await stage.photoreal({ width: phone ? 1080 : 1500, height: phone ? 1080 : 1000, signal: ptAbort.signal, onProgress: (f) => { $('#vp-pt-bar').style.transform = `scaleX(${Math.max(0, Math.min(1, f))})`; } });
    if (!blob) throw new Error('none');
    ptBlob = blob; $('#vp-pt-txt').textContent = 'Кадр готов'; $('#vp-pt-save').hidden = false; $('#vp-pt-cancel').textContent = 'Закрыть';
  } catch (e) {
    if (ptAbort && ptAbort.signal.aborted) { box.hidden = true; return; }
    box.hidden = true; toast('Не получилось — сохраните обычное фото');
  }
}

/* ═════════ «Чертёж» (js/cfg/drawing.js, лениво) ═════════ */
let drawing = null;
function drawingCfg() {
  const d = new Date();
  return {
    ...cfgState(), id: id(), title: titleOf(state.type, state.params), lines: summaryLines(cfgState(), { dims: curDims() }),
    notes: state.notes.slice(), dims: curDims(), date: `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`,
  };
}
async function openDrawing() {
  if (hasErrors()) return;
  const dlg = $('#dlg-drawing'); const img = $('#dd-img'); const wait = $('#dd-wait');
  $('#dd-id').textContent = `№ ${id()}`; $('#dd-open').hidden = true;
  /* на телефоне главное — отправить: «Отправить чертёж» первой и залитой */
  const ph = mqPhone.matches, send = $('#dd-send'), png = $('#dd-png');
  send.classList.toggle('btn--fill', ph); send.classList.toggle('btn--line', !ph); png.classList.toggle('btn--fill', !ph); png.classList.toggle('btn--line', ph);
  if (ph) send.parentNode.insertBefore(send, png); else png.parentNode.insertBefore(png, send);
  img.hidden = true; wait.hidden = false; wait.textContent = 'Готовим чертёж…';
  ['#dd-png', '#dd-send', '#dd-svg'].forEach((s) => { $(s).disabled = true; });
  openDialog(dlg);
  try {
    const mod = await import('./drawing.js');
    const res = await mod.render(drawingCfg(), { stage });
    if (drawing && drawing.url) URL.revokeObjectURL(drawing.url);
    const url = URL.createObjectURL(new Blob([res.svg], { type: 'image/svg+xml' }));
    drawing = { ...res, url, id: id() };
    img.src = url; img.hidden = false; wait.hidden = true;
    ['#dd-png', '#dd-send', '#dd-svg'].forEach((s) => { $(s).disabled = false; });
    $('#dd-open').hidden = false;
  } catch (e) {
    console.warn('drawing', e);
    wait.textContent = 'Чертёж пока не получилось подготовить. Отправьте вариант в WhatsApp — мастер пришлёт схему.';
  }
}
async function drawingPng() { const b = await drawing.toPNG(3508); return b; }
/* чертёж во весь экран: PNG в новой вкладке — можно увеличить пальцами */
async function openDrawingFull() {
  if (!drawing) return;
  const w = window.open('', '_blank');
  try { const png = await drawingPng(); const u = URL.createObjectURL(png); if (w) w.location.href = u; else window.location.href = u; } catch (e) { if (w) w.close(); }
}
async function sendDrawing() {
  if (!drawing) return;
  const btn = $('#dd-send'); btn.disabled = true;
  try {
    const png = await drawingPng();
    const name = `ricca-chertezh-${drawing.id}.png`;
    const file = new File([png], name, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Чертёж RICCA', text: waText(cfgState(), { link: variantLink(), dims: curDims(), id: drawing.id }) }); btn.disabled = false; return; } catch (e) { if (e && e.name === 'AbortError') { btn.disabled = false; return; } }
    }
    download(png, name);
    window.open(waUrl(waText(cfgState(), { link: variantLink(), dims: curDims(), id: drawing.id, drawingLater: true })), '_blank', 'noopener');
  } catch (e) { console.error(e); }
  btn.disabled = false;
}

/* ═════════ «Посмотреть у себя дома» (js/cfg/ar.js и qr.js, лениво) ═════════ */
let arSession = null, arAbort = null;
const isPhoneDevice = () => {
  const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (/Mac/.test(navigator.platform) && navigator.maxTouchPoints > 1);
  return touch && (matchMedia('(pointer: coarse)').matches || mobileUA);
};
/* встроенные браузеры Instagram, Facebook, LINE и вебвью: камера и AR там не запускаются */
const inAppBrowser = () => /Instagram|FBAN|FBAV|FB_IAB|Line\/|; wv\)/.test(navigator.userAgent);
async function openAR() {
  const dlg = $('#dlg-ar'); const phone = isPhoneDevice();
  $('#ar-phone').hidden = !phone; $('#ar-desk').hidden = phone;
  const go = $('#ar-go'), msg = $('#ar-msg'), copy = $('#ar-copy');
  msg.hidden = true; go.disabled = true; go.hidden = false; go.textContent = 'Готовим модель…'; copy.hidden = true;
  openDialog(dlg);
  lsSet(LS.seen, '1');
  if (phone && inAppBrowser()) {
    go.hidden = true; msg.hidden = false; copy.hidden = !isHttp;
    msg.textContent = 'Instagram открывает сайт во встроенном браузере — камера здесь не запустится. Нажмите ⋯ вверху справа → «Открыть в браузере».';
    return;
  }
  if (!phone) {
    const qr = $('#ar-qr'); qr.innerHTML = '';
    if (!isHttp) { qr.hidden = true; return; }
    qr.hidden = false;
    try { const q = await import('./qr.js'); qr.innerHTML = q.qrSvg(variantLink(), { size: 200, ecl: 'M' }); } catch (e) { console.warn('qr', e); qr.hidden = true; }
    return;
  }
  arAbort = new AbortController();
  try {
    await loadEngine();
    const ar = await import('./ar.js');
    arSession = await ar.prepareAR({ type: state.type, params: state.params, fabric: state.fabric, engine: { build: F.build, disposePiece: F.disposePiece, materialSet: M.materialSet, dims: P.dims }, signal: arAbort.signal });
    if (!arSession.canActivate) { arNoSupport(); return; }
    go.disabled = false; go.textContent = 'Открыть камеру';
  } catch (e) {
    if (arAbort && arAbort.signal.aborted) return;
    console.warn('ar', e); arNoSupport();
  }
}
function arNoSupport() {
  const go = $('#ar-go'), msg = $('#ar-msg');
  go.disabled = true; go.textContent = 'Открыть камеру';
  msg.hidden = false;
  msg.textContent = 'Этот телефон не может показать мебель через камеру в браузере — откройте страницу в Safari на iPhone или в Chrome на Android. Или посмотрите вариант в шоуруме.';
}
async function arGo() {
  if (!arSession) return;
  if (!arSession.canActivate) { arNoSupport(); return; }
  try { await arSession.activate(); } catch (e) { console.warn(e); arNoSupport(); }
}
function closeAR() {
  if (arAbort) arAbort.abort();
  if (arSession && arSession.dispose) arSession.dispose();
  arSession = null; arAbort = null;
}

/* ═════════ окна ═════════ */
let lastFocus = null;
function openDialog(dlg) {
  lastFocus = document.activeElement;
  if (typeof dlg.showModal === 'function') { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
  document.documentElement.classList.add('is-locked');
}
function closeDialog(dlg) {
  if (dlg.open) { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
}
function onDialogClosed(dlg) {
  document.documentElement.classList.remove('is-locked');
  if (dlg.id === 'dlg-ar') closeAR();
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

/* ═════════ «Моя комната» (js/cfg/room.js, лениво) ═════════ */
let roomApi = null, roomLoading = null;
function loadRoom() {
  if (roomApi) return Promise.resolve(roomApi);
  if (roomLoading) return roomLoading;
  const status = $('[data-room-status]');
  roomLoading = Promise.all([import('./room.js'), loadEngine(), stageReady]).then(([m]) => {
    roomApi = m.mountRoom({
      stage, panel: $('#room-panel'), viewport: $('#vp'),
      engine: engineApi(),
      share: { encodeRoom, decodeRoom, roomText, waUrl, titleOf, fmtCm },
      fabrics: { library: lib, findFabric, defaultFabric: () => defaultFabric(lib), fabricRef, all: () => allFabrics(lib) },
      getCurrent: () => ({ type: state.type, params: { ...state.params }, fabric: state.fabric }),
      onEdit: (item) => editFromRoom(item),
      initialHash: location.hash.startsWith('#room=') ? location.hash.slice(6) : null,
      storageKey: LS.room,
      onChange: () => syncRoomBar(),
    });
    return roomApi;
  }).catch((e) => {
    console.warn('room', e); roomLoading = null;
    if (status) status.textContent = 'Планировщик комнаты не загрузился. Обновите страницу.';
    throw e;
  });
  return roomLoading;
}
async function setMode(mode, { focus = false } = {}) {
  if (mode === state.mode && roomApi) return;
  state.mode = mode;
  const room = mode === 'room';
  $('#main').dataset.mode = mode;
  $$('[data-mode-tab]').forEach((b) => { const on = b.dataset.modeTab === mode; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
  $('#steps').hidden = room; $('#room-panel').hidden = !room;
  $('.vp__views').hidden = room; $('#t-dims').hidden = room; $('#vp-size').hidden = room;
  if (focus) $(`[data-mode-tab="${mode}"]`).focus();
  if (room) {
    updateDims();
    renderFabChip(); syncBar();
    try {
      const api = await loadRoom();
      if (state.mode === 'room' && api.enter) {
        api.enter();
        /* пустая комната — сразу «Мой вариант», чтобы было что двигать */
        if (!api.room.items.length) { api.addItem({ type: state.type, params: { ...state.params }, fabric: state.fabric, mine: true }, { quiet: true }); api.status && api.status('Ваш вариант уже в комнате. Двигайте его пальцем или мышью'); }
        syncRoomBar();
      }
    } catch (e) { /* статус уже показан */ }
  } else {
    if (roomApi && roomApi.leave) roomApi.leave();
    if (stage) { if (stage.setStudio) stage.setStudio(true); if (piece) stage.setObject(piece); setView(state.view); if (stage.frame) stage.frame({ animate: false, reset: true }); updateDims(); }
    renderSummary(); renderFabChip(); syncBar();
    writeHash();
  }
}
/* в комнате нижняя кнопка «В WhatsApp» отправляет план комнаты (размер + предметы + параметры «Моего варианта») */
function syncRoomBar() {
  const a = $('#bar-wa'); if (!a) return;
  if (state.mode === 'room' && roomApi && roomApi.waHref) { a.href = roomApi.waHref(); a.classList.remove('is-off'); a.setAttribute('aria-disabled', 'false'); }
  else renderSummary();
}
async function addToRoom() {
  await setMode('room');
  try { const api = await loadRoom(); api.addItem({ type: state.type, params: { ...state.params }, fabric: state.fabric, from: 'model' }); } catch (e) { /* статус уже показан */ }
}
function editFromRoom(item) {
  if (!item || !P.DEFAULTS[item.type]) return;
  memo[state.type] = state.params;
  applyParams(item.type, item.params || {});
  if (item.fabric) { state.fabric = item.fabric; state.fabricLost = false; }
  syncTypes(); renderFabric();
  setMode('model').then(() => { setState({}, { structural: true }); openStep(3); });
}

/* ═════════ события ═════════ */
function bind() {
  $('#types').addEventListener('click', (e) => { const b = e.target.closest('[data-type]'); if (b) setType(b.dataset.type); });
  $('#opts').addEventListener('click', (e) => {
    const c = e.target.closest('[data-opt]'); if (c) return setOption(c.dataset.opt, c.dataset.v);
    const n = e.target.closest('[data-count]'); if (n) setCount(n.dataset.count, +n.dataset.d);
  });
  $('#presets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    const pr = (P.PRESETS[state.type] || [])[+b.dataset.preset]; if (!pr) return;
    state.inputErr = {}; applyParams(state.type, { ...state.params, ...pr.params });
    setState({}, { structural: true });
    const nb = $(`[data-preset="${b.dataset.preset}"]`); if (nb) nb.focus({ preventScroll: true });
  });
  const flds = $('#flds');
  flds.addEventListener('click', (e) => {
    const kc = e.target.closest('[data-keychip]'); if (kc) setSize(kc.dataset.keychip, +kc.dataset.v);
    const st = e.target.closest('.fld__b[data-inc]'); if (st && e.detail === 0) { stepOnce(st); scheduleRebuild(false); }   // клавиатура
  });
  flds.addEventListener('pointerdown', (e) => {
    const st = e.target.closest('.fld__b[data-inc]'); if (!st || e.button > 0) return;
    e.preventDefault(); stepOnce(st);
    holdT = setTimeout(() => { holdI = setInterval(() => stepOnce(st), 70); }, 420);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((ev) => flds.addEventListener(ev, (e) => { if (e.target.closest && e.target.closest('.fld__b[data-inc]')) holdStop(); }));
  window.addEventListener('pointerup', holdStop);
  flds.addEventListener('input', (e) => {
    if (e.target.classList.contains('fld__r')) { const key = e.target.closest('.fld').dataset.key; setSize(key, +e.target.value, { drag: true }); }
  });
  flds.addEventListener('change', (e) => {
    const key = e.target.closest('.fld') && e.target.closest('.fld').dataset.key; if (!key) return;
    if (e.target.classList.contains('fld__r')) { scheduleRebuild(false); return; }
    if (e.target.classList.contains('fld__i')) setSize(key, parseCm(e.target.value));
  });
  flds.addEventListener('keydown', (e) => {
    if (!e.target.classList.contains('fld__i')) return;
    const key = e.target.closest('.fld').dataset.key;
    if (e.key === 'Enter') { e.preventDefault(); setSize(key, parseCm(e.target.value)); e.target.select(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setSize(key, Math.round(toCm(state.params[key] || 0)) + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1)); }
  });
  flds.addEventListener('focusout', (e) => { if (e.target.classList.contains('fld__i')) { const key = e.target.closest('.fld').dataset.key; if (!state.inputErr[key]) e.target.value = fmtIn(state.params[key]); } });

  $('#fab-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-ftype]'); if (!b) return; fabUI = { typeId: b.dataset.ftype, collectionId: null }; renderFabric(); });
  $('#fab-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = $$('#fab-tabs .fab__tab'); const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    fabUI = { typeId: n.dataset.ftype, collectionId: null }; renderFabric(); $(`[data-ftype="${CSS.escape(n.dataset.ftype)}"]`).focus();
  });
  $('#fab-cols').addEventListener('click', (e) => { const b = e.target.closest('[data-fcol]'); if (!b) return; fabUI.collectionId = b.dataset.fcol; renderFabric(); const nb = $(`[data-fcol="${CSS.escape(b.dataset.fcol)}"]`); if (nb) nb.focus({ preventScroll: true }); });
  $('#fab-sw').addEventListener('click', (e) => { const b = e.target.closest('[data-fslug]'); if (b) setFabric(b.dataset.fslug); });

  $('#note').addEventListener('input', (e) => { state.note = e.target.value.slice(0, 300); setState({}, { rebuild: false }); });
  $('#qty').addEventListener('change', (e) => { const q = parseInt(e.target.value, 10); qtyTouched = true; setState({ qty: Math.max(1, Math.min(99, Number.isFinite(q) ? q : state.qty)) }, { rebuild: false }); });
  $$('[data-qty]').forEach((b) => b.addEventListener('click', () => { qtyTouched = true; setState({ qty: Math.max(1, Math.min(99, state.qty + (+b.dataset.qty))) }, { rebuild: false }); }));
  for (const a of [$('#wa-send'), $('#bar-wa')]) a.addEventListener('click', (e) => { if (state.mode === 'room' && a.id === 'bar-wa') return; if (hasErrors()) { e.preventDefault(); openStep(3); const f = $('#flds .has-err .fld__i'); if (f) f.focus(); } });

  $('#b-drawing').addEventListener('click', openDrawing);
  $('#b-ar').addEventListener('click', openAR); $('#bar-ar').addEventListener('click', openAR);
  $('#bar-next').addEventListener('click', () => { const n = +$('#bar-next').dataset.next; if (n) openStep(n); });
  $('#ar-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(variantLink()); toast('Ссылка скопирована'); } catch (e) { toast('Скопируйте адрес из строки браузера'); } });
  $('#dd-open').addEventListener('click', openDrawingFull);
  $('#vp-fab').addEventListener('click', seatCloseUp);
  $('#ar-go').addEventListener('click', arGo);
  $('#b-to-room').addEventListener('click', addToRoom);
  $('#b-reset').addEventListener('click', () => {
    state.inputErr = {}; state.inputRaw = {}; applyParams(state.type, {}); state.note = ''; qtyTouched = false; state.qty = (P.DEFAULTS[state.type] && P.DEFAULTS[state.type].qty) || 1;
    state.fabric = defaultFabric(lib); state.fabricLost = false; fabUI = { typeId: null, collectionId: null }; renderFabric(); renderFabChip();
    setState({}, { structural: true }); applyFabric();
  });
  $('#dd-png').addEventListener('click', async () => { if (!drawing) return; const b = $('#dd-png'); b.disabled = true; try { download(await drawingPng(), `ricca-chertezh-${drawing.id}.png`); } catch (e) { console.error(e); } b.disabled = false; });
  $('#dd-svg').addEventListener('click', () => { if (drawing) download(new Blob([drawing.svg], { type: 'image/svg+xml' }), `ricca-chertezh-${drawing.id}.svg`); });
  $('#dd-send').addEventListener('click', sendDrawing);
  $$('dialog').forEach((dlg) => {
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) closeDialog(dlg); });
    dlg.addEventListener('close', () => onDialogClosed(dlg));
  });

  $$('.vp__views [data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('.vp__views').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const bs = $$('.vp__views [data-view]'); const i = bs.findIndex((b) => b.dataset.view === state.view);
    const n = bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length]; setView(n.dataset.view); n.focus();
  });
  $('#t-dims').addEventListener('click', () => { state.showDims = !state.showDims; $('#t-dims').setAttribute('aria-pressed', String(state.showDims)); updateDims(); });
  $('#t-photo').addEventListener('click', savePhoto);
  $('#t-frame').addEventListener('click', () => { if (state.mode === 'room' && roomApi) { roomApi.resetView(); return; } if (stage && stage.frame) stage.frame({ animate: !reduced }); });
  $('#t-real').addEventListener('click', photoreal);
  $('#vp-pt-cancel').addEventListener('click', () => { if (ptAbort) ptAbort.abort(); $('#vp-pt').hidden = true; $('#vp-pt-cancel').textContent = 'Отменить'; });
  $('#vp-pt-save').addEventListener('click', async () => { if (ptBlob) await shareOrDownload(ptBlob, `ricca-${id()}-foto.png`); $('#vp-pt').hidden = true; $('#vp-pt-cancel').textContent = 'Отменить'; });

  $$('[data-mode-tab]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.modeTab)));
  $('.modes').addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') setMode(state.mode === 'model' ? 'room' : 'model', { focus: true }); });

  $$('.step__head').forEach((b) => b.addEventListener('click', () => {
    if (!mqPhone.matches) return;
    const n = +b.closest('.step').dataset.step; openStep(n === state.step ? 0 : n, n !== state.step);
  }));
  $$('[data-next]').forEach((b) => b.addEventListener('click', () => openStep(+b.dataset.next)));
  mqPhone.addEventListener('change', () => { syncSteps(); if (stage) rebuild(quality()); });
  bindRadioKeys();

  window.addEventListener('hashchange', () => {
    const h = location.hash;
    if (h === lastHash) return;
    const ph = parseHash(h);
    const fab = ph.f ? findFabricShort(ph.f, lib) : null;
    const lost = !!ph.f && !fab;
    pendingToast = '';
    if ((ph.cfg && fromCfgString(ph.cfg)) || fab || lost) {
      if (fab) { state.fabric = fab; state.fabricLost = false; }
      if (lost) { state.fabricLost = true; pendingToast = MSG_FAB_LOST; }
      syncTypes(); fabUI = { typeId: null, collectionId: null }; renderFabric(); setMode('model'); setState({}, { structural: true });
      if (stage) { applyFabric(); rebuild(quality()); }
      renderFabChip();
      if ((fab && !ph.cfg) || lost) { openStep(4); revealFabric(); }
      if (pendingToast) toast(pendingToast, 5000); else if (fab && !ph.cfg) toast(`На модели: ${fab.collectionTitle} · ${fab.colour}`);
    }
    else if (ph.room) setMode('room');
  });
}

/* ═════════ старт ═════════ */
let stageReady = null;
function init() {
  const src = load();
  renderTypes(); syncTypes(); renderFabricTabs(); renderFabric();
  renderForm(); renderSize(); renderFabricVisibility(); renderSummary(); renderHeads(); renderViewportSize();
  state.step = src === 'hash' ? 5 : src === 'fabric' ? 4 : 1;
  if (src === 'hash') [1, 2, 3, 4, 5].forEach((n) => state.visited.add(n));
  state.visited.add(state.step);
  syncSteps();
  bind();
  document.documentElement.classList.add('cfg-ui');
  /* 3D — после того как шаги уже на экране */
  stageReady = new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0))).then(initStage).then(() => {
    if (state.mode === 'room') setMode('room');
    if (pendingToast) toast(pendingToast, 5000);
    else if (arrivedFabric) toast(`На модели: ${arrivedFabric.collectionTitle} · ${arrivedFabric.colour}`, 4000);
  });
  if (pendingToast && !stage) toast(pendingToast, 5000);
  /* пришли со страницы «Ткани» — сразу к шагу «Ткань» (на телефоне — под моделью, на компьютере — в колонке справа) */
  if (src === 'fabric') {
    if (mqPhone.matches) { openStep(4); revealFabric(); }
    else requestAnimationFrame(() => { const li = $('.step[data-step="4"]'); if (li) window.scrollTo({ top: Math.max(0, li.getBoundingClientRect().top + window.scrollY - $('#hdr').offsetHeight - 16), behavior: 'auto' }); revealFabric(); });
  }
  writeHash(); save();
  document.documentElement.classList.add('cfg-ready');
  /* для автоматических проверок (только с ?cfgtest в адресе) */
  if (/[?&]cfgtest\b/.test(location.search)) window.__cfg = { state, get F() { return F; }, get M() { return M; }, P, get stage() { return stage; }, get piece() { return piece; }, get room() { return roomApi; }, get ar() { return arSession; }, setOption, setSize, setType, setFabric, setView, rebuild };
}
init();
