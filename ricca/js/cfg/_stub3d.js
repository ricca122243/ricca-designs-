/* ВРЕМЕННАЯ заглушка 3D для разработки интерфейса (владелец B; удаляет D при сборке).
   Повторяет контракты SPEC §2: furniture3d.js (build, disposePiece + реэкспорт params.js), materials.js (materialSet, fabricMaterial),
   stage.js (createStage), validate.js (validate). Рисует детали parts() простыми коробками на 2D-канвасе — только чтобы проверить страницу. */
import * as P from './params.js';
export { TYPES, OPTIONS, RANGES, DEFAULTS, PRESETS, normalize, parts, dims, labelOf } from './params.js';
const { normalize, parts, RANGES } = P;

/* «построить»: объект с traverse() и мешами-заглушками, у каждого material.color.hex */
export function build(type, params, materials = {}) {
  const pr = parts(type, params);
  const meshes = pr.items.map((item) => ({ isMesh: true, item, userData: { partId: item.id }, material: materials[item.mat] || { color: '#bbbbbb', role: item.mat } }));
  return { name: 'ricca-piece', isStub: true, children: meshes, userData: { type, params, dims: pr.bbox }, traverse(fn) { fn(this); meshes.forEach(fn); } };
}
export function disposePiece() {}

/* ---------- materials (заглушка: цвет) ---------- */
const WOOD = { oak: '#C8A57A', walnut: '#6B4A33', blackwood: '#2A2622' }, METAL = { black: '#2B2B2B', gold: '#B79A62' }, STONE = { light: '#ECE9E4', grey: '#9C9A95', dark: '#2E2D2B' };
const M = {
  fabricMaterial: ({ hex }) => ({ color: hex || '#D8D2C6', role: 'fabric' }),
  woodMaterial: (t) => ({ color: WOOD[t] || WOOD.oak }), metalMaterial: (f) => ({ color: METAL[f] || METAL.black }),
  stoneMaterial: (t) => ({ color: STONE[t] || STONE.light }), mattressMaterial: () => ({ color: '#F2F1EC' }),
  materialSet(cfg) {
    const p = cfg.params || {}; const fin = p.legFinish;
    const legs = METAL[fin] ? M.metalMaterial(fin) : M.woodMaterial(fin);
    const top = p.top === 'stone' ? M.stoneMaterial(p.topTone) : M.woodMaterial(p.topTone);
    return { fabric: M.fabricMaterial(cfg.fabric || {}), legs: p.legs === 'plinth' || p.legs === 'hidden' ? M.fabricMaterial(cfg.fabric || {}) : legs, top, mattress: M.mattressMaterial() };
  },
};

export const { fabricMaterial, materialSet } = { fabricMaterial: (o) => M.fabricMaterial(o), materialSet: (c) => M.materialSet(c) };

/* ---------- validate (заглушка нескольких правил §7.3) ---------- */
const OVERALL = new Set(['w', 'd', 'l', 'mw', 'ml', 'moduleW', 'chaiseL']);
export function validate(type, params) {
  const p = normalize(type, params); const notes = [], errors = [], fieldNotes = {};
  const r = RANGES[type] || {};
  for (const k of Object.keys(r)) {
    const v = p[k]; if (typeof v !== 'number' || ['qty', 'sections', 'modules'].includes(k)) continue;
    const rg = P.rangeOf(type, k, p) || r[k];
    if (v < 0 || (v < 0.02 && k !== 'hbOver') || (OVERALL.has(k) && (v < 0.3 || v > 6)) || (k === 'h' && v > 2.5)) { errors.push('Такой размер не подходит для одного изделия — напишите нам, обсудим.'); fieldNotes[k] = errors[errors.length - 1]; continue; }
    if (v < rg.min - 1e-9 || v > rg.max + 1e-9) { fieldNotes[k] = 'Нестандартный размер — уточним с мастером'; }
  }
  if ('seatD' in p && 'd' in p && p.seatD > p.d - 0.14 && !errors.length) {
    p.seatD = Math.round((p.d - 0.14) * 100) / 100;
    const n = `Глубина сиденья уменьшена до ${Math.round(p.seatD * 100)} см, чтобы поместилась спинка`;
    notes.push(n); fieldNotes.seatD = n;
  }
  return { params: p, notes, errors, fieldNotes };
}

/* ---------- stage (заглушка на 2D-канвасе) ---------- */
export function createStage(container) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const listeners = {}; let group = null, view = '3d', az = 0.61, el = 0.31, zoom = 1, dimsList = null;
  const emit = (e, d) => (listeners[e] || []).forEach((f) => f(d));
  const proj = (x, y, z) => {
    let a = az, e = el;
    if (view === 'front') { a = 0; e = 0; } else if (view === 'side') { a = -Math.PI / 2; e = 0; } else if (view === 'top') { a = 0; e = Math.PI / 2; }
    const x1 = x * Math.cos(a) - z * Math.sin(a), z1 = x * Math.sin(a) + z * Math.cos(a);
    const y2 = y * Math.cos(e) - z1 * Math.sin(e), z2 = y * Math.sin(e) + z1 * Math.cos(e);
    return [x1, y2, z2];
  };
  function render() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = container.clientWidth, H = container.clientHeight;
    if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    if (!group) return;
    const bb = group.userData.dims; const span = Math.max(bb.w, bb.d, bb.h * 1.4);
    const s = Math.min(W, H) / span * 0.62 * zoom; const cy = view === 'top' ? 0 : bb.h / 2;
    const P = (x, y, z) => { const [px, py, pz] = proj(x, y - cy, z); return [W / 2 + px * s, H / 2 - py * s, pz]; };
    // тень
    ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath();
    const f = [[-bb.w / 2, 0, -bb.d / 2], [bb.w / 2, 0, -bb.d / 2], [bb.w / 2, 0, bb.d / 2], [-bb.w / 2, 0, bb.d / 2]].map((q) => P(...q));
    f.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); if (view !== 'top') ctx.fill();
    const faces = [];
    for (const m of group.children) {
      const b = m.item; const q90 = Math.abs(Math.abs(b.rotY || 0) - Math.PI / 2) < 0.01; const hx = (q90 ? b.sz : b.sx) / 2, hy = b.sy / 2, hz = (q90 ? b.sx : b.sz) / 2;
      const c = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([i, j, k]) => P(b.x + i * hx, b.y + j * hy, b.z + k * hz));
      const quads = [[[4, 5, 6, 7], 0.95], [[0, 3, 2, 1], 0.8], [[1, 2, 6, 5], 0.82], [[0, 4, 7, 3], 0.7], [[3, 7, 6, 2], 1.08], [[0, 1, 5, 4], 0.55]];
      for (const [q, shade] of quads) {
        const pts = q.map((i) => c[i]);
        const area = pts.reduce((acc, p0, i) => { const p1 = pts[(i + 1) % 4]; return acc + (p0[0] * p1[1] - p1[0] * p0[1]); }, 0);
        if (area >= 0) continue;
        faces.push({ pts, z: pts.reduce((a, p0) => a + p0[2], 0) / 4, color: (m.material && m.material.color) || '#bbb', shade });
      }
    }
    faces.sort((a, b) => a.z - b.z);
    for (const fc of faces) {
      ctx.beginPath(); fc.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = shadeHex(fc.color, fc.shade); ctx.fill(); ctx.strokeStyle = 'rgba(17,17,17,.10)'; ctx.lineWidth = 0.6; ctx.stroke();
    }
    if (dimsList) {
      ctx.strokeStyle = '#111'; ctx.fillStyle = '#111'; ctx.lineWidth = 0.8; ctx.font = '500 11px Montserrat, sans-serif'; ctx.textAlign = 'center';
      for (const d of dimsList) {
        const a = P(...d.a), b = P(...d.b); const off = d.place === 'right' ? [14, 0] : [0, 14];
        ctx.beginPath(); ctx.moveTo(a[0] + off[0], a[1] + off[1]); ctx.lineTo(b[0] + off[0], b[1] + off[1]); ctx.stroke();
        ctx.fillText(`${Math.round(d.value * 1000) / 10}`.replace('.', ','), (a[0] + b[0]) / 2 + off[0] * 2.2, (a[1] + b[1]) / 2 + off[1] * 2.2 + 4);
      }
    }
    emit('render');
  }
  function shadeHex(hex, k) { const n = parseInt(String(hex).slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * k)))); return `rgb(${c.join(',')})`; }
  let raf = 0; const requestRender = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); };
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, az, el }; canvas.setPointerCapture(e.pointerId); emit('interact'); });
  canvas.addEventListener('pointermove', (e) => { if (!drag || view !== '3d') return; az = drag.az + (e.clientX - drag.x) * 0.01; el = Math.max(0.05, Math.min(1.4, drag.el + (e.clientY - drag.y) * 0.006)); requestRender(); });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(0.6, Math.min(2.5, zoom * (e.deltaY > 0 ? 0.92 : 1.08))); requestRender(); }, { passive: false });
  new ResizeObserver(requestRender).observe(container);
  const stage = {
    canvas, root: null, scene: null, renderer: null, controls: null, get camera() { return null; },
    get view() { return view; },
    setObject(g) { group = g; requestRender(); },
    setView(v) { view = v; requestRender(); emit('view', v); },
    frame() { zoom = 1; az = 0.61; el = 0.31; requestRender(); emit('frame'); },
    setDims(list) { dimsList = list; requestRender(); },
    setStudio() {}, requestRender,
    snapshot({ width = 1600, height = 1200 } = {}) {
      const c = document.createElement('canvas'); c.width = width; c.height = height; const x = c.getContext('2d');
      x.fillStyle = '#F3F2EE'; x.fillRect(0, 0, width, height); x.drawImage(canvas, 0, 0, width, height);
      return new Promise((res) => c.toBlob(res, 'image/png'));
    },
    photoreal: null,
    on(e, fn) { (listeners[e] = listeners[e] || []).push(fn); }, off(e, fn) { listeners[e] = (listeners[e] || []).filter((f) => f !== fn); },
    dispose() { canvas.remove(); },
  };
  return stage;
}
