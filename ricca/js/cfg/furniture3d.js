/* RICCA · конструктор — 3D-модель изделия из parts() (единый источник правды: params.js).
   build() делает меш (или несколько) на каждую деталь; всё, что добавляется сверху (швы, кант, стяжка, пуговицы,
   «купол» подушки, лёгкая выпуклость боков и прогиб сиденья), остаётся внутри габарита детали.
   Мягкие объёмы — свой генератор «мягкого бокса»: сетка на гранях куба, проецируемая на скруглённый (эллипсоидальный)
   угол с отдельными радиусами по осям; плотность сетки в зоне скругления — равномерная по углу. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { parts, normalize, dims as dimsOf } from './params.js';
import { seamMaterial, pipingMaterial, decorMaterial } from './materials.js';

export { TYPES, OPTIONS, RANGES, DEFAULTS, PRESETS, normalize, parts, dims, labelOf, rangeOf, itemBounds } from './params.js';

const Q = {
  high: { sp: 0.045, flat: 0.3, nq: 6, tuft: 0.012, ang: 0.035, radial: 24, tube: 6 },
  mid: { sp: 0.07, flat: 0.4, nq: 4, tuft: 0.02, ang: 0.06, radial: 16, tube: 5 },
  low: { sp: 0.12, flat: 0.6, nq: 2, tuft: 0.035, ang: 0.1, radial: 10, tube: 4 },
};
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* 1D-выборка по оси: зона скругления — по углу (tan), середина — с шагом sp */
function axisSamples(H, rN, rP, sp, nq) {
  const out = [];
  const a = -H + rN, b = H - rP;
  for (let k = nq; k >= 1; k--) out.push(a - rN * Math.tan((k * Math.PI) / (4 * nq)));
  const n = Math.max(1, Math.ceil((b - a) / sp));
  for (let i = 0; i <= n; i++) out.push(a + ((b - a) * i) / n);
  for (let k = 1; k <= nq; k++) out.push(b + rP * Math.tan((k * Math.PI) / (4 * nq)));
  out[0] = -H; out[out.length - 1] = H;
  return out;
}

/* проекция точки g (на поверхности куба) на скруглённый бокс; R = {x:[neg,pos], y:[...], z:[...]} */
function makeProjector(Hx, Hy, Hz, R) {
  const I = { x: [-Hx + R.x[0], Hx - R.x[1]], y: [-Hy + R.y[0], Hy - R.y[1]], z: [-Hz + R.z[0], Hz - R.z[1]] };
  return (gx, gy, gz, out, nout) => {
    const cx = Math.min(I.x[1], Math.max(I.x[0], gx)), cy = Math.min(I.y[1], Math.max(I.y[0], gy)), cz = Math.min(I.z[1], Math.max(I.z[0], gz));
    const dx = gx - cx, dy = gy - cy, dz = gz - cz;
    const rx = dx >= 0 ? R.x[1] : R.x[0], ry = dy >= 0 ? R.y[1] : R.y[0], rz = dz >= 0 ? R.z[1] : R.z[0];
    const ex = rx > 1e-6 ? dx / rx : 0, ey = ry > 1e-6 ? dy / ry : 0, ez = rz > 1e-6 ? dz / rz : 0;
    const l = Math.hypot(ex, ey, ez);
    if (l < 1e-9) { out.set(gx, gy, gz); nout.set(0, 1, 0); return; }
    const ux = ex / l, uy = ey / l, uz = ez / l;
    out.set(cx + rx * ux, cy + ry * uy, cz + rz * uz);
    nout.set(rx > 1e-6 ? ux / rx : ux * 1e6, ry > 1e-6 ? uy / ry : uy * 1e6, rz > 1e-6 ? uz / rz : uz * 1e6).normalize();
  };
}

/* гладкие нормали по совпадающим позициям (сетки граней дублируют вершины на рёбрах) */
function smoothNormalsByPosition(geo) {
  const pos = geo.attributes.position, idx = geo.index;
  const n = pos.count, acc = new Float32Array(n * 3);
  const key = new Map(), group = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    /* числовой ключ: сетка 0,1 мм, по 17 бит на ось (±6,5 м) */
    const k = ((Math.round(pos.getX(i) * 1e4) + 65536) * 131072 + (Math.round(pos.getY(i) * 1e4) + 65536)) * 131072 + (Math.round(pos.getZ(i) * 1e4) + 65536);
    let g = key.get(k); if (g === undefined) { g = i; key.set(k, i); } group[i] = g;
  }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  const arr = idx.array;
  for (let t = 0; t < arr.length; t += 3) {
    const i0 = arr[t], i1 = arr[t + 1], i2 = arr[t + 2];
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    ab.subVectors(b, a); ac.subVectors(c, a); ab.cross(ac);
    for (const i of [i0, i1, i2]) { const g = group[i] * 3; acc[g] += ab.x; acc[g + 1] += ab.y; acc[g + 2] += ab.z; }
  }
  const nrm = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const g = group[i] * 3; let x = acc[g], y = acc[g + 1], z = acc[g + 2]; const l = Math.hypot(x, y, z);
    if (l < 1e-12) { nrm[i * 3 + 1] = 1; continue; }
    nrm[i * 3] = x / l; nrm[i * 3 + 1] = y / l; nrm[i * 3 + 2] = z / l;
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
}

/* ---------- шов (кромка панелей) для шейдера ткани ----------
   Атрибут seam (vec4): x — расстояние по поверхности до ближайшей линии шва (м), y — 1 (есть швы), zw — направление шва в UV.
   Шов рисует шейдер ткани (materials.js): тонкая тёмная линия + валик припуска + лёгкие «натяжные» складки рядом —
   видно на любом расстоянии без лишних треугольников (трубки-швы по-прежнему добавляются только для крупного плана). */
const AX = ['x', 'y', 'z'];
/* оси UV по граням (как в face(): верх (x,−z), низ (x,z), фронт (x,y), тыл (−x,y), правый (−z,y), левый (z,y)) */
const FACE_UV = {
  top: [[1, 0, 0], [0, 0, -1]], bottom: [[1, 0, 0], [0, 0, 1]], front: [[1, 0, 0], [0, 1, 0]],
  back: [[-1, 0, 0], [0, 1, 0]], right: [[0, 0, -1], [0, 1, 0]], left: [[0, 0, 1], [0, 1, 0]],
};
function makeSeamer(Hx, Hy, Hz, R, seams) {
  const I = [[-Hx + R.x[0], Hx - R.x[1]], [-Hy + R.y[0], Hy - R.y[1]], [-Hz + R.z[0], Hz - R.z[1]]];
  const RR = [R.x, R.y, R.z];
  const c = [0, 0, 0], e = [0, 0, 0], r = [0, 0, 0], t3 = [0, 0, 0];
  const Q4 = Math.PI / 4;
  /* out: [d, tu, tv] */
  return (g, uvAx, out) => {
    for (let k = 0; k < 3; k++) {
      c[k] = Math.min(I[k][1], Math.max(I[k][0], g[k]));
      const dd = g[k] - c[k]; r[k] = dd >= 0 ? RR[k][1] : RR[k][0];
      e[k] = r[k] > 1e-6 ? dd / r[k] : 0;
    }
    const l = Math.hypot(e[0], e[1], e[2]) || 1;
    let best = Infinity, bt0 = 0, bt1 = 0, bt2 = 0, bax = -1;
    for (const [a, s] of seams) {
      const ai = AX.indexOf(a);
      const cosT = Math.max(-1, Math.min(1, (s * e[ai]) / l)), th = Math.acos(cosT);
      /* радиус дуги: среднее радиуса по оси шва и по направлению выхода к боковине */
      let ro = 0, wo = 0;
      for (let k = 0; k < 3; k++) if (k !== ai) { ro += e[k] * e[k] * r[k] * r[k]; wo += e[k] * e[k]; }
      const rOth = wo > 1e-9 ? Math.sqrt(ro / wo) : (r[(ai + 1) % 3] + r[(ai + 2) % 3]) / 2;
      const rr = (r[ai] + rOth) / 2;
      let flat;
      if (th < Q4) { flat = Infinity; for (let k = 0; k < 3; k++) if (k !== ai) flat = Math.min(flat, c[k] - I[k][0], I[k][1] - c[k]); }
      else flat = s > 0 ? I[ai][1] - c[ai] : c[ai] - I[ai][0];
      const d = rr * Math.abs(th - Q4) + Math.max(0, flat);
      if (d < best) {
        best = d; bax = ai;
        /* направление шва: ось шва × направление «наружу» (к ближайшей кромке) */
        let ox = ai === 0 ? 0 : e[0], oy = ai === 1 ? 0 : e[1], oz = ai === 2 ? 0 : e[2];
        if (Math.hypot(ox, oy, oz) < 1e-6) {
          let mk = -1, md = Infinity;
          for (let k = 0; k < 3; k++) if (k !== ai) { const dl = c[k] - I[k][0], dh = I[k][1] - c[k]; if (dl < md) { md = dl; mk = -(k + 1); } if (dh < md) { md = dh; mk = k + 1; } }
          ox = Math.abs(mk) === 1 ? Math.sign(mk) : 0; oy = Math.abs(mk) === 2 ? Math.sign(mk) : 0; oz = Math.abs(mk) === 3 ? Math.sign(mk) : 0;
        }
        const ax = ai === 0 ? s : 0, ay = ai === 1 ? s : 0, az = ai === 2 ? s : 0;
        t3[0] = ay * oz - az * oy; t3[1] = az * ox - ax * oz; t3[2] = ax * oy - ay * ox;
        bt0 = t3[0]; bt1 = t3[1]; bt2 = t3[2];
      }
    }
    const U = uvAx[0], V = uvAx[1];
    let tu = bt0 * U[0] + bt1 * U[1] + bt2 * U[2], tv = bt0 * V[0] + bt1 * V[1] + bt2 * V[2];
    const tl = Math.hypot(tu, tv) || 1; tu /= tl; tv /= tl;
    /* на угловом скруглении направление шва крутится вокруг угла — натяжные складки шейдера расходились «веером»;
       длина вектора направления = вес (1 на прямой, 0 в углу), шейдер гасит складки по нему */
    let w = 1;
    if (bax >= 0) {
      const k1 = (bax + 1) % 3, k2 = (bax + 2) % 3, a = Math.abs(e[k1]), b = Math.abs(e[k2]), mx = Math.max(a, b);
      if (mx > 1e-6) w = 1 - smooth(0.12, 0.55, Math.min(a, b) / mx);
    }
    out[0] = Math.min(best, 1); out[1] = tu * w; out[2] = tv * w;
  };
}
/* нулевые атрибуты шва и контактного затенения для деталей без них (один шейдер ткани на всё изделие) */
function ensureSeamAttr(geo) {
  if (!geo) return geo;
  const n = geo.attributes.position.count;
  if (!geo.attributes.seam) geo.setAttribute('seam', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
  if (!geo.attributes.occ) geo.setAttribute('occ', new THREE.BufferAttribute(new Float32Array(n), 1));
  return geo;
}
/* контактное затенение (атрибут occ, 0…1): полосы у граней бокса — [ось, сторона (−1/+1) | 0 = «на координате», значение, ширина полосы, сила].
   Подушка сидит на основании — её низ и тыл под спинкой темнее; верх рамы под свесом подушки; низ цельной спинки у сиденья */
function occOf(bands, g, H) {
  let occ = 0;
  for (const [ax, side, val, band, k] of bands) {
    const i = ax === 'x' ? 0 : ax === 'y' ? 1 : 2;
    const d = side > 0 ? H[i] - g[i] : side < 0 ? g[i] + H[i] : Math.abs(g[i] - val);
    const v = k * (1 - smooth(0, band, d));
    if (v > occ) occ = v;
  }
  return occ;
}

/* ---------- мягкий бокс ---------- */
/* o: { rx, rz, rTop, rBottom, quality, crown, crownFace:'y'|'z', crownBack, crownP, bulge, sag, tufting, tuftFace:'z'|'y', taper, pillow, seams } */
function softBox(sx, sy, sz, o = {}) {
  const q = Q[o.quality] || Q.high;
  const crown = o.crown || 0, bulge = o.bulge || 0;
  const cf = o.crownFace || 'y';
  const crownBack = cf === 'z' ? o.crownBack || 0 : 0;
  /* базовый бокс уменьшен на «купол» и выпуклость — после деформации деталь ровно в габарите */
  /* «оседание» (slump) раздвигает низ подушки — тоже учтено в уменьшении базового бокса: деталь строго в габарите */
  const slumpX = (o.slump || 0) * sx / 2, slumpZ = (o.slump || 0) * sz / 2;
  const crownBottom = cf === 'y' ? o.crownBottom || 0 : 0;
  const bx = sx - 2 * (bulge + slumpX), by = sy - (cf === 'y' ? crown + crownBottom : 0), bz = sz - 2 * (bulge + slumpZ) - (cf === 'z' ? crown + crownBack : 0);
  const Hx = bx / 2, Hy = by / 2, Hz = bz / 2;
  const lim = (r, h) => Math.max(0.0005, Math.min(r, h * 0.999));
  const rx = lim(o.rx ?? 0.02, Hx), rz = lim(o.rz ?? o.rx ?? 0.02, Hz);
  let rT = lim(o.rTop ?? 0.02, Hy), rB = lim(o.rBottom ?? 0.015, Hy);
  if (rT + rB > by * 0.999) { const k = (by * 0.999) / (rT + rB); rT *= k; rB *= k; }
  const R = { x: [o.rxBack != null ? lim(o.rxBack, Hx) : rx, rx], y: [rB, rT], z: [o.rzBack != null ? lim(o.rzBack, Hz) : rz, rz] };
  const proj = makeProjector(Hx, Hy, Hz, R);
  const tuft = o.tufting;
  /* плотность стяжки: не мельче q.tuft и не больше ~30 тыс. вершин на две большие грани */
  const tArea = tuft ? (o.tuftFace === 'y' ? sx * sz : sx * sy) : 0;
  const spTuft = tuft ? Math.max(q.tuft, Math.sqrt((2 * tArea) / (o.quality === 'low' ? 3500 : o.quality === 'mid' ? 6000 : 10000))) : q.sp;
  const deformed = crown || crownBack || bulge || tuft || o.sag || o.pillow || o.ripple || o.slump || (o.taper && o.taper !== 1);
  const sp = (deformed ? q.sp : q.flat) * (o.dense || 1);
  const tf = o.tuftFace || 'z';
  const X = axisSamples(Hx, rx, rx, tuft ? spTuft : sp, q.nq);
  /* каналы меняются только по X — по высоте хватает обычного шага */
  const Y = axisSamples(Hy, rB, rT, tuft === 'capitone' && tf === 'z' ? spTuft : sp, q.nq);
  const Z = axisSamples(Hz, rz, rz + (cf === 'z' ? 0 : 0), tuft && tf === 'y' ? spTuft : sp, q.nq);
  const positions = [], normals = [], uvs = [], index = [], seamA = [], occA = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3(), U = new THREE.Vector3();
  const yOff = cf === 'y' ? (crownBottom - crown) / 2 : 0, zOff = cf === 'z' ? -(crown - crownBack) / 2 : 0;
  const disp = makeDisplacer({ Hx, Hy, Hz, crown, crownBack, crownBottom, crownP: o.crownP || 2, cf, bulge, sag: o.sag || 0, tuft, tf, sx, sy, sz, taper: o.taper || 1, rT, pillow: o.pillow || 0, ripple: o.ripple || 0, slump: o.slump || 0, drape: o.drape || null });
  const seamer = o.seams && o.seams.length && o.quality !== 'low' ? makeSeamer(Hx, Hy, Hz, R, o.seams) : null;
  const sOut = [0, 0, 0];
  const HH = [Hx, Hy, Hz], occB = o.occ && o.occ.length ? o.occ : null;
  /* UV «развёрткой»: в зоне скругления — длина дуги (r·atan(d/r)), а не проекция: фактура на скруглённых рёбрах и углах
     не сжимается и не расходится «веером» */
  const RR3 = [R.x, R.y, R.z], II = [[-Hx + R.x[0], Hx - R.x[1]], [-Hy + R.y[0], Hy - R.y[1]], [-Hz + R.z[0], Hz - R.z[1]]];
  const unroll = (g, out) => {
    for (let k = 0; k < 3; k++) {
      const c = Math.min(II[k][1], Math.max(II[k][0], g[k])), d = g[k] - c, r = d >= 0 ? RR3[k][1] : RR3[k][0];
      out.setComponent(k, c + (r > 1e-6 ? r * Math.atan(d / r) : d));
    }
    return out;
  };
  const face = (A, B, mk, uvf, flip, fname) => {
    const base = positions.length / 3;
    const uvAx = FACE_UV[fname];
    for (let j = 0; j < B.length; j++) for (let i = 0; i < A.length; i++) {
      const g = mk(A[i], B[j]);
      if (seamer) { seamer(g, uvAx, sOut); seamA.push(sOut[0], 1, sOut[1], sOut[2]); }
      if (occB) occA.push(occOf(occB, g, HH));
      proj(g[0], g[1], g[2], P, N);
      disp(P, N);
      positions.push(P.x, P.y + yOff, P.z + zOff); normals.push(N.x, N.y, N.z);
      const uv = uvf(unroll(g, U)); uvs.push(uv[0], uv[1]);
    }
    const W = A.length;
    for (let j = 0; j < B.length - 1; j++) for (let i = 0; i < W - 1; i++) {
      const a = base + j * W + i, b = a + 1, c = a + W, d = c + 1;
      if (flip) index.push(a, b, c, b, d, c); else index.push(a, c, b, b, c, d);
    }
  };
  face(X, Z, (a, b) => [a, Hy, b], (p) => [p.x, -p.z], false, 'top'); // верх
  face(X, Z, (a, b) => [a, -Hy, b], (p) => [p.x, p.z], true, 'bottom'); // низ
  face(X, Y, (a, b) => [a, b, Hz], (p) => [p.x, p.y], true, 'front'); // фронт
  face(X, Y, (a, b) => [a, b, -Hz], (p) => [-p.x, p.y], false, 'back'); // тыл
  face(Z, Y, (a, b) => [Hx, b, a], (p) => [-p.z, p.y], false, 'right'); // правый бок
  face(Z, Y, (a, b) => [-Hx, b, a], (p) => [p.z, p.y], true, 'left'); // левый бок
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (seamer) geo.setAttribute('seam', new THREE.Float32BufferAttribute(seamA, 4));
  if (occB) geo.setAttribute('occ', new THREE.Float32BufferAttribute(occA, 1));
  geo.setIndex(index);
  if (deformed) smoothNormalsByPosition(geo);
  /* линии кромки (для канта/шва): периметр грани на 45° скругления */
  geo.userData.edgeLoop = (axis, sign) => {
    const pts = [];
    const push = (gx, gy, gz) => { proj(gx, gy, gz, P, N); disp(P, N); pts.push(new THREE.Vector3(P.x, P.y + yOff, P.z + zOff)); };
    if (axis === 'y') {
      const y = sign * Hy;
      for (const x of X) push(x, y, Z[Z.length - 1]);
      for (let k = Z.length - 2; k >= 0; k--) push(X[X.length - 1], y, Z[k]);
      for (let k = X.length - 2; k >= 0; k--) push(X[k], y, Z[0]);
      for (let k = 1; k < Z.length - 1; k++) push(X[0], y, Z[k]);
    } else {
      const z = sign * Hz;
      for (const x of X) push(x, Y[0], z);
      for (let k = 1; k < Y.length; k++) push(X[X.length - 1], Y[k], z);
      for (let k = X.length - 2; k >= 0; k--) push(X[k], Y[Y.length - 1], z);
      for (let k = Y.length - 2; k >= 1; k--) push(X[0], Y[k], z);
    }
    return pts;
  };
  geo.userData.buttons = disp.buttons;
  return geo;
}

/* деформации: купол, выпуклость боков, прогиб у фронта, стяжка (каналы / капитоне), сужение ног */
function makeDisplacer(s) {
  const { Hx, Hy, Hz, crown, cf, bulge, sag, tuft, tf, taper, sx, sy } = s;
  const crownBack = s.crownBack || 0, crownBottom = s.crownBottom || 0, cp = s.crownP || 2, pillow = s.pillow || 0, ripple = s.ripple || 0, slump = s.slump || 0, drape = s.drape || null;
  /* профиль «купола»: 1 − |u|^p (p > 2 — полнее, «набитая» подушка с мягким спадом к кромке) */
  const cprof = (u) => 1 - Math.pow(Math.min(1, u), cp);
  const buttons = [];
  let tuftFn = null;
  if (tuft === 'channels') {
    const n = Math.max(5, Math.min(9, Math.round(sx / 0.24)));
    /* каналы — круглые «валики» (профиль ≈ полуокружность), глубина шва между ними 2,4 см */
    const depth = 0.03;
    tuftFn = (u, v) => { const f = Math.pow(Math.abs(Math.sin(Math.PI * n * (u * 0.5 + 0.5))), 0.45); return depth * (f - 1); };
  } else if (tuft === 'capitone') {
    const a = 0.14, b = 0.12, dD = 0.010, dP = 0.003;
    /* решётка ромбом: пуговицы в (s,t) целых с s+t чётным, где s = x/(a/2), t = y/b */
    const W = tf === 'z' ? Hx : Hx, Hh = tf === 'z' ? Hy : Hz;
    const ns = Math.floor((W - 0.06) / (a / 2)), nt = Math.floor((Hh - 0.06) / b);
    tuftFn = (x, y) => {
      const sN = x / (a / 2), tN = y / b;
      /* ближайшая пуговица */
      let best = 9;
      const s0 = Math.round(sN), t0 = Math.round(tN);
      for (let ds = -1; ds <= 1; ds++) for (let dt = -1; dt <= 1; dt++) {
        const S = s0 + ds, T = t0 + dt; if (((S + T) % 2 + 2) % 2 !== 0) continue;
        if (Math.abs(S) > ns || Math.abs(T) > nt) continue;
        const dx = (sN - S) * a / 2, dy = (tN - T) * b; best = Math.min(best, dx * dx + dy * dy);
      }
      const dimple = best < 8 ? -dD * Math.exp(-best / (0.018 * 0.018)) : 0;
      /* складки по диагоналям между пуговицами */
      const l1 = Math.abs(((sN - tN) % 2 + 3) % 2 - 1), l2 = Math.abs(((sN + tN) % 2 + 3) % 2 - 1); // 0 на линии
      const inside = Math.abs(sN) <= ns + 0.01 && Math.abs(tN) <= nt + 0.01 ? 1 : 0;
      const pl = Math.min(1 - l1, 1 - l2) * (a / 2) * 0.7; // расстояние до линии ≈
      const pleat = inside ? -dP * Math.exp(-(pl * pl) / (0.006 * 0.006)) : 0;
      return dimple + pleat;
    };
    for (let S = -ns; S <= ns; S++) for (let T = -nt; T <= nt; T++) if (((S + T) % 2 + 2) % 2 === 0) buttons.push([S * a / 2, T * b]);
  }
  const fn = (P, N) => {
    /* сужение (ножки): горизонтальный масштаб от низа (taper) к верху (1) */
    if (taper !== 1) { const t = (P.y + Hy) / (2 * Hy); const k = taper + (1 - taper) * t; P.x *= k; P.z *= k; }
    /* подушка спинки: к верху тоньше (наполнитель оседает вниз), толщина у низа — полная */
    if (pillow && cf === 'z') { const t = (P.y + Hy) / (2 * Hy); P.z *= 1 - pillow * Math.pow(smooth(0.25, 1.0, t), 1.3); }
    /* декоративная подушка (лежит плашмя, толщина по Y): к дальнему краю (+Z, после поворота — верх) тоньше */
    if (pillow && cf === 'y') { const t = (P.z + Hz) / (2 * Hz); P.y *= 1 - pillow * Math.pow(smooth(0.25, 1.0, t), 1.3); }
    if (crown) {
      if (cf === 'y' && N.y > 0.2) {
        const u = Math.abs(P.x) / Hx, v = Math.abs(P.z) / Hz;
        P.y += crown * cprof(u) * cprof(v) * smooth(0.2, 0.95, N.y);
      } else if (cf === 'z' && N.z > 0.2) {
        const u = Math.abs(P.x) / Hx, v = Math.abs(P.y) / Hy;
        P.z += crown * cprof(u) * cprof(v) * smooth(0.2, 0.95, N.z);
      }
    }
    /* подушка-«линза»: вторая выпуклость снизу — у кромки тонкий шов, в середине полная толщина */
    if (crownBottom && N.y < -0.2) {
      const u = Math.abs(P.x) / Hx, v = Math.abs(P.z) / Hz;
      P.y -= crownBottom * cprof(u) * cprof(v) * smooth(0.2, 0.95, -N.y);
    }
    if (crownBack && N.z < -0.2) {
      const u = Math.abs(P.x) / Hx, v = Math.abs(P.y) / Hy;
      P.z -= crownBack * cprof(u) * cprof(v) * smooth(0.2, 0.95, -N.z);
    }
    if (bulge && Math.abs(N.y) < 0.85) {
      const t = (P.y + Hy) / (2 * Hy), m = Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
      const fx = 1 - Math.pow(Math.min(1, Math.abs(P.z) / Hz), 4), fz = 1 - Math.pow(Math.min(1, Math.abs(P.x) / Hx), 4);
      const w = 1 - smooth(0.4, 0.85, Math.abs(N.y));
      P.x += Math.sign(N.x) * bulge * m * fx * Math.abs(N.x) * w;
      P.z += Math.sign(N.z) * bulge * m * fz * Math.abs(N.z) * w;
    }
    if (sag && N.y > 0.2) {
      const z = (P.z + Hz) / (2 * Hz); // 0 у спинки, 1 у фронта
      const u = Math.min(1, Math.abs(P.x) / Hx);
      /* где сидят: мягкая «чаша» ближе к середине глубины, к фронту подушка снова полная (валик кромки) */
      P.y -= sag * smooth(0.3, 0.62, z) * (1 - smooth(0.8, 0.97, z)) * (1 - u * u * u) * smooth(0.2, 0.95, N.y);
    }
    /* съёмная подушка «осела»: нижняя кромка чуть шире верхней (наполнитель стекает вниз), верх мягче */
    if (slump && Math.abs(N.y) < 0.9) {
      const t = (P.y + Hy) / (2 * Hy); const k = 1 + slump * (1 - t) * (1 - t);
      const w = 1 - smooth(0.5, 0.9, Math.abs(N.y));
      P.x += Math.sign(N.x) * Math.abs(N.x) * (k - 1) * Hx * w; P.z += Math.sign(N.z) * Math.abs(N.z) * (k - 1) * Hz * w;
    }
    /* покрывало: крупные мягкие складки поперёк кровати (ткань «брошена»), край в плане — волной, а не линейкой */
    if (ripple) {
      const x = P.x, z = P.z;
      if (N.y > 0.2) {
        const f = Math.sin(x * 7.5 + 0.9 * Math.sin(z * 3.5 + 1.3)) * 0.55 + Math.sin(z * 9.0 + x * 2.5 + 0.5) * 0.3 + Math.sin(x * 19.0 + z * 6.0 - 1.1) * 0.15;
        const edge = (1 - Math.pow(Math.min(1, Math.abs(x) / Hx), 8)) * (1 - Math.pow(Math.min(1, Math.abs(z) / Hz), 8));
        P.y += ripple * f * edge * smooth(0.2, 0.95, N.y);
      }
      /* волна кромки (только по положению — без разрывов между гранями) */
      const ex = Math.pow(Math.min(1, Math.abs(x) / Hx), 3), ez = Math.pow(Math.max(0, z / Hz), 3);
      P.x += Math.sign(x) * ripple * 0.9 * ex * Math.sin(z * 6.5 + 1.0 + Math.sin(z * 2.1));
      P.z += ripple * 0.9 * ez * Math.sin(x * 5.0 + 2.0 + Math.sin(x * 1.7));
    }
    /* покрывало свисает: за кромкой матраса (x — боковины, +z — изножье) ткань уходит вниз мягкой дугой */
    if (drape) {
      const ex = drape.x ? Math.max(0, Math.abs(P.x) - (Hx - drape.x)) / drape.x : 0, ez = drape.z ? Math.max(0, P.z - (Hz - drape.z)) / drape.z : 0;
      const e = Math.min(1, Math.hypot(ex, ez));
      if (e > 0) P.y -= drape.drop * Math.pow(e, 1.8);
    }
    if (tuftFn) {
      if (tuft === 'channels' && tf === 'z' && N.z > 0.3) {
        const u = P.x / Hx; const w = smooth(0.3, 0.9, N.z) * (1 - smooth(0.9, 1.0, Math.abs(u))) * (1 - smooth(Hy - 0.05, Hy - 0.005, Math.abs(P.y)));
        P.z += tuftFn(u, P.y) * w;
      } else if (tuft === 'capitone') {
        if (tf === 'z' && N.z > 0.3) P.z += tuftFn(P.x, P.y) * smooth(0.3, 0.9, N.z);
        if (tf === 'y' && N.y > 0.3) P.y += tuftFn(P.x, P.z) * smooth(0.3, 0.9, N.y);
      }
    }
  };
  fn.buttons = buttons;
  return fn;
}

/* ---------- мягкий эллиптический цилиндр (круглый пуф, столешница, сиденье округлого кресла) ---------- */
function softCyl(sx, sy, sz, o = {}) {
  const q = Q[o.quality] || Q.high;
  const crown = o.crown || 0;
  /* «бочка» (barrel): бок чуть выпуклый посередине высоты; базовый радиус уменьшен — деталь ровно в габарите */
  const bar = o.barrel || 0;
  const A = sx / 2 / (1 + bar), B = sz / 2 / (1 + bar), Hh = (sy - crown) / 2;
  const barrel = (y) => 1 + bar * Math.sin(Math.PI * Math.min(1, Math.max(0, (y + Hh) / (2 * Hh))));
  const rT = Math.min(o.rTop ?? 0.02, Hh, Math.min(A, B) * 0.9), rB = Math.min(o.rBottom ?? 0.015, Hh, Math.min(A, B) * 0.9);
  const per = Math.PI * (3 * (A + B) - Math.sqrt((3 * A + B) * (A + 3 * B)));
  const tuft = o.tufting;
  const spC = tuft ? q.tuft : q.sp;
  const nSeg = Math.max(24, Math.min(256, Math.ceil(per / Math.min(spC, q.sp) / 4) * 4));
  const mR = Math.min(A, B);
  /* профиль: [inset δ, y, kind] от центра низа до центра верха; kind: 0 низ, 1 стенка, 2 верх (для UV) */
  const prof = [];
  const capN = Math.max(2, Math.ceil((mR - rB) / spC));
  for (let i = 0; i <= capN; i++) prof.push([mR - ((mR - rB) * i) / capN, -Hh, 0]);
  const nq = q.nq;
  for (let k = 1; k <= 2 * nq; k++) { const a = (k * Math.PI) / (4 * nq); prof.push([rB - rB * Math.sin(a), -Hh + rB - rB * Math.cos(a), k <= nq ? 0 : 1]); }
  const wallN = Math.max(1, Math.ceil((2 * Hh - rT - rB) / q.sp));
  for (let i = 1; i <= wallN; i++) prof.push([0, -Hh + rB + ((2 * Hh - rT - rB) * i) / wallN, 1]);
  for (let k = 1; k <= 2 * nq; k++) { const a = (k * Math.PI) / (4 * nq); prof.push([rT - rT * Math.cos(a), Hh - rT + rT * Math.sin(a), k < nq ? 1 : 2]); }
  const capT = Math.max(2, Math.ceil((mR - rT) / spC));
  for (let i = 1; i <= capT; i++) prof.push([rT + ((mR - rT) * i) / capT, Hh, 2]);
  /* сетка: дублируем строку профиля на границе зон для разрыва UV */
  const rows = [];
  for (let i = 0; i < prof.length; i++) {
    rows.push(prof[i]);
    if (i + 1 < prof.length && prof[i + 1][2] !== prof[i][2]) rows.push([prof[i][0], prof[i][1], prof[i + 1][2]]);
  }
  const positions = [], uvs = [], index = [];
  const btn = [];
  const a2 = 0.14, b2 = 0.12;
  const tuftFn = tuft === 'capitone' ? makeDisplacer({ Hx: A, Hy: B, Hz: B, tuft: 'capitone', tf: 'y', sx, sy, taper: 1 }) : null;
  if (tuftFn) {
    /* пуговицы по кругу: центр + кольцо */
    btn.push([0, 0]);
    const rr = mR * 0.55, n = Math.max(5, Math.round((2 * Math.PI * rr) / 0.16));
    for (let i = 0; i < n; i++) btn.push([Math.cos((i / n) * Math.PI * 2) * rr * (A / mR), Math.sin((i / n) * Math.PI * 2) * rr * (B / mR)]);
  }
  const ringStart = [];
  /* швы (шейдер): длина по профилю до линий на 45° верхнего и нижнего скругления */
  const seamA = o.seams ? [] : null;
  let sB = 0, sT = 0;
  const rowS = [];
  if (seamA) {
    let acc = 0;
    for (let i = 0; i < rows.length; i++) { if (i) acc += Math.hypot(rows[i][0] - rows[i - 1][0], rows[i][1] - rows[i - 1][1]); rowS.push(acc); }
    const yB = -Hh + rB - rB * Math.SQRT1_2, yT = Hh - rT + rT * Math.SQRT1_2;
    let bi = 0, ti = 0;
    for (let i = 0; i < rows.length; i++) { if (Math.abs(rows[i][1] - yB) < Math.abs(rows[bi][1] - yB) && rows[i][0] < mR * 0.5) bi = i; if (Math.abs(rows[i][1] - yT) < Math.abs(rows[ti][1] - yT) && rows[i][0] < mR * 0.5) ti = i; }
    sB = rowS[bi]; sT = rowS[ti];
  }
  for (let r = 0; r < rows.length; r++) {
    const [dl, y, kind] = rows[r];
    ringStart.push(positions.length / 3);
    for (let s = 0; s <= nSeg; s++) {
      const ph = (s / nSeg) * Math.PI * 2;
      const bs = barrel(y), ax = Math.max(0, A - dl) * bs, bz = Math.max(0, B - dl) * bs;
      let x = ax * Math.cos(ph), z = bz * Math.sin(ph), yy = y;
      /* «купол» — по положению на скруглении, а не по зоне UV: иначе продублированная строка на стыке UV расходится и даёт щели-точки */
      if (crown && y > Hh - rT - 1e-9) { const u = Math.hypot(x / A, z / B); yy += crown * Math.max(0, 1 - u * u) * (dl >= rT ? 1 : smooth(0, rT, dl)); }
      if (tuftFn && kind === 2 && dl > rT) {
        let best = 9; for (const [bx, bzz] of btn) { const d = (x - bx) ** 2 + (z - bzz) ** 2; if (d < best) best = d; }
        yy += -0.011 * Math.exp(-best / (0.022 * 0.022)) * smooth(rT, rT + 0.03, dl);
      }
      positions.push(x, yy + (crown ? -crown / 2 : 0), z);
      if (kind === 1) uvs.push((s / nSeg) * per, y); else uvs.push(x, kind === 2 ? -z : z);
      if (seamA) {
        const d = Math.min(Math.abs(rowS[r] - sB), Math.abs(rowS[r] - sT));
        if (kind === 1) seamA.push(d, 1, 1, 0); else seamA.push(d, 1, -Math.sin(ph), kind === 2 ? -Math.cos(ph) : Math.cos(ph));
      }
    }
  }
  for (let r = 0; r < rows.length - 1; r++) {
    if (rows[r + 1][2] !== rows[r][2] && rows[r + 1][0] === rows[r][0] && rows[r + 1][1] === rows[r][1]) continue; // шов UV
    const a0 = ringStart[r], b0 = ringStart[r + 1];
    for (let s = 0; s < nSeg; s++) { const a = a0 + s, b = a0 + s + 1, c = b0 + s, d = b0 + s + 1; index.push(a, c, b, b, c, d); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (seamA) geo.setAttribute('seam', new THREE.Float32BufferAttribute(seamA, 4));
  geo.setIndex(index);
  smoothNormalsByPosition(geo);
  geo.userData.edgeLoop = (axis, sign) => {
    const y = sign > 0 ? Hh - rT + rT * Math.SQRT1_2 : -Hh + rB - rB * Math.SQRT1_2;
    const dl = sign > 0 ? rT - rT * Math.SQRT1_2 : rB - rB * Math.SQRT1_2;
    const pts = [], bs = barrel(y);
    for (let s = 0; s < nSeg; s++) { const ph = (s / nSeg) * Math.PI * 2; pts.push(new THREE.Vector3((A - dl) * bs * Math.cos(ph), y + (crown ? -crown / 2 : 0), (B - dl) * bs * Math.sin(ph))); }
    return pts;
  };
  geo.userData.buttons = btn.map(([x, z]) => [x, z]);
  geo.userData.topY = Hh + crown / 2;
  return geo;
}

/* ---------- оболочка округлого кресла: профиль (скруглённый сверху) по дуге эллипса, торцы — полукругом ---------- */
function shellGeometry(it, quality) {
  const q = Q[quality] || Q.high;
  const A = it.sx / 2, B = it.sz / 2, t = it.t, open = it.open || Math.PI / 2;
  const yb = -it.sy / 2, ytBack = it.sy / 2;
  const ytFront = it.topFront != null ? it.topFront - (it.y - it.sy / 2) + yb : ytBack;
  const th0 = open / 2, th1 = Math.PI * 2 - open / 2;
  const per = (th1 - th0) * (A + B) / 2;
  let nTh = Math.max(36, Math.ceil(per / q.ang / 6) * 6);
  const topY = (th) => { const u = Math.abs(th - Math.PI) / (Math.PI - open / 2); return ytFront + (ytBack - ytFront) * (0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, u))); };
  const rb = 0.015, rt = t / 2;
  /* профиль: петля (ρ, y-относительно), ρ=0 снаружи, ρ=t внутри; верх — полуокружность */
  const nW = Math.max(4, Math.ceil((it.sy) / q.sp)), nS = q.nq * 4, nBc = q.nq;
  const loop = (yTop) => {
    const pts = [];
    const wallTop = yTop - rt;
    for (let i = 0; i <= nBc; i++) { const a = (i / nBc) * Math.PI / 2; pts.push([rb - rb * Math.sin(a), yb + rb - rb * Math.cos(a), 0]); }
    for (let i = 1; i <= nW; i++) pts.push([0, yb + rb + ((wallTop - yb - rb) * i) / nW, 0]);
    for (let i = 1; i < nS; i++) { const a = (i / nS) * Math.PI; pts.push([rt - rt * Math.cos(a), wallTop + rt * Math.sin(a), 1]); }
    for (let i = 0; i < nW; i++) pts.push([t, wallTop - ((wallTop - yb - rb) * i) / nW, 0]);
    for (let i = 0; i <= nBc; i++) { const a = (i / nBc) * Math.PI / 2; pts.push([t - rb + rb * Math.cos(a), yb + rb - rb * Math.sin(a), 0]); }
    for (let i = 1; i < 4; i++) pts.push([t - rb - ((t - 2 * rb) * i) / 4, yb, 0]);
    return pts;
  };
  const L = loop(ytBack).length;
  const positions = [], uvs = [], index = [];
  /* кольца: торец (полусфера) — основная дуга — торец */
  const nCap = Math.max(3, q.nq + 1);
  const rings = [];
  for (let k = nCap; k >= 1; k--) rings.push({ th: th0, cap: k / nCap, dir: -1 });
  for (let i = 0; i <= nTh; i++) rings.push({ th: th0 + ((th1 - th0) * i) / nTh, cap: 0, dir: 0 });
  for (let k = 1; k <= nCap; k++) rings.push({ th: th1, cap: k / nCap, dir: 1 });
  rings.forEach((rg, ri) => {
    const th = rg.th, yTop = topY(th);
    const pts = loop(yTop);
    const sn = Math.sin(th), cs = Math.cos(th);
    /* касательная вдоль дуги (в сторону роста θ) */
    const am = A - t / 2, bm = B - t / 2;
    let tx = am * cs, tz = -bm * sn; const tl = Math.hypot(tx, tz); tx /= tl; tz /= tl;
    const phi = rg.cap * Math.PI / 2, sc = Math.cos(phi), ext = (t / 2) * Math.sin(phi) * (rg.dir || 0);
    const cy = yTop - rt;
    /* UV в метрах: v — длина дуги по профилю (без «схлопывания» на скруглённом верху), u — длина дуги по эллипсу на своём радиусе */
    let v = 0, px = 0, py = 0, pz = 0;
    for (let j = 0; j < L; j++) {
      let [rho, y, top] = pts[j];
      rho = t / 2 + (rho - t / 2) * sc;
      if (top) y = cy + (y - cy) * sc + 0 * (1 - sc);
      else if (y > cy) y = cy + (y - cy) * sc;
      const x = (A - rho) * sn + tx * ext, z = (B - rho) * cs + tz * ext;
      if (j > 0) v += Math.hypot(x - px, y - py, z - pz);
      px = x; py = y; pz = z;
      positions.push(x, y, z);
      /* u — по средней линии стенки (одна на всё кольцо): иначе на полукруглом верхе ρ меняется вдоль профиля и фактура «косит» полосами */
      uvs.push(th * (am + bm) / 2 + ext, v);
    }
  });
  for (let r = 0; r < rings.length - 1; r++) for (let j = 0; j < L - 1; j++) {
    const a = r * L + j, b = a + 1, c = a + L, d = c + 1; index.push(a, c, b, b, c, d);
  }
  for (let r = 0; r < rings.length - 1; r++) { const a = r * L + L - 1, b = r * L, c = a + L, d = b + L; index.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  smoothNormalsByPosition(geo);
  /* кант по верхней кромке: середина полуокружности профиля */
  geo.userData.topLine = () => {
    const pts = [];
    for (let i = 0; i <= nTh; i++) { const th = th0 + ((th1 - th0) * i) / nTh; const y = topY(th) - 0.002; pts.push(new THREE.Vector3((A - t / 2) * Math.sin(th), y, (B - t / 2) * Math.cos(th))); }
    return pts;
  };
  return geo;
}

/* ---------- ножки ---------- */
function legGeometry(it, quality) {
  const q = Q[quality] || Q.high;
  if (it.square) return softBox(it.sx, it.sy, it.sz, { rx: 0.004, rz: 0.004, rTop: 0.002, rBottom: 0.003, quality, taper: it.taper || 1 });
  const rTop = it.sx / 2, rBot = (it.sx / 2) * (it.taper || 1);
  let geo;
  if (it.flare && it.flare !== 1) {
    const pts = [];
    const n = 16;
    pts.push(new THREE.Vector2(0, -it.sy / 2));
    for (let i = 0; i <= n; i++) { const tt = i / n; const r = rTop * (1 + (it.flare - 1) * Math.pow(1 - tt, 2.2)); pts.push(new THREE.Vector2(r, -it.sy / 2 + it.sy * tt)); }
    pts.push(new THREE.Vector2(0, it.sy / 2));
    geo = new THREE.LatheGeometry(pts, q.radial * 2);
    const nn = geo.attributes.normal, pp = geo.attributes.position;
    for (let i = 0; i < nn.count; i++) { const l = Math.hypot(nn.getX(i), nn.getY(i), nn.getZ(i)); if (l < 0.5) nn.setXYZ(i, 0, Math.sign(pp.getY(i)) || 1, 0); else nn.setXYZ(i, nn.getX(i) / l, nn.getY(i) / l, nn.getZ(i) / l); }
  } else {
    geo = new THREE.CylinderGeometry(rTop, rBot, it.sy, it.legKind === 'glide' ? 16 : q.radial, 1, false);
  }
  /* UV в метрах; волокна дерева — вдоль длины (U) */
  const uv = geo.attributes.uv, circ = Math.PI * it.sx;
  for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v * it.sy, u * circ); }
  /* металлическая ножка: пластина крепления под рамой (Ø 5 см, 5 мм) — ножка «растёт» из основания, а не воткнута в него */
  if (it.legKind === 'metal' && it.sy >= 0.06 && !it.support) {
    const plate = new THREE.CylinderGeometry(0.026, 0.028, 0.005, q.radial, 1, false);
    plate.translate(0, it.sy / 2 - 0.0025, 0);
    const puv = plate.attributes.uv; for (let i = 0; i < puv.count; i++) puv.setXY(i, puv.getX(i) * 0.16, puv.getY(i) * 0.02);
    const merged = mergeGeometries([geo, plate], false); geo.dispose(); plate.dispose();
    if (merged) geo = merged;
  }
  return geo;
}

/* ---------- кант/шов: трубка по ломаной (точки уже плотные; рамки — параллельный перенос) ---------- */
function tubeAlong(points, radius, quality, closed = true, dense = 1) {
  if (!points || points.length < 3) return null;
  const q = Q[quality] || Q.high;
  const step = (quality === 'low' ? 0.04 : quality === 'mid' ? 0.022 : 0.015) * dense;
  /* прореживание дубликатов и ресэмплинг до шага step */
  const src = [];
  for (const p of points) if (!src.length || src[src.length - 1].distanceToSquared(p) > 1e-8) src.push(p);
  if (closed && src.length > 2 && src[0].distanceToSquared(src[src.length - 1]) < 1e-8) src.pop();
  if (src.length < 3) return null;
  const pts = [];
  const n0 = src.length, segs = closed ? n0 : n0 - 1;
  let carry = 0;
  pts.push(src[0].clone());
  for (let i = 0; i < segs; i++) {
    const a = src[i], b = src[(i + 1) % n0], L = a.distanceTo(b);
    let t = step - carry;
    while (t < L) { pts.push(a.clone().lerp(b, t / L)); t += step; }
    carry = L - (t - step);
  }
  if (closed && pts.length > 2 && pts[pts.length - 1].distanceTo(pts[0]) < step * 0.4) pts.pop();
  if (!closed && pts[pts.length - 1].distanceToSquared(src[n0 - 1]) > 1e-8) pts.push(src[n0 - 1].clone());
  const N = pts.length, R = q.tube;
  const pos = new Float32Array(N * (R + 1) * 3), nrm = new Float32Array(N * (R + 1) * 3), uv = new Float32Array(N * (R + 1) * 2);
  const T = new THREE.Vector3(), Nv = new THREE.Vector3(), B = new THREE.Vector3(), prevT = new THREE.Vector3();
  const tan = (i) => {
    const a = pts[closed ? (i - 1 + N) % N : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % N : Math.min(N - 1, i + 1)];
    return T.subVectors(b, a).normalize();
  };
  tan(0);
  Nv.set(0, 1, 0); if (Math.abs(T.y) > 0.9) Nv.set(1, 0, 0);
  Nv.sub(T.clone().multiplyScalar(Nv.dot(T))).normalize();
  let s = 0;
  for (let i = 0; i < N; i++) {
    prevT.copy(T); tan(i);
    /* параллельный перенос нормали */
    Nv.sub(T.clone().multiplyScalar(Nv.dot(T))).normalize();
    B.crossVectors(T, Nv);
    if (i > 0) s += pts[i].distanceTo(pts[i - 1]);
    for (let j = 0; j <= R; j++) {
      const ang = (j / R) * Math.PI * 2, c = Math.cos(ang), sn = Math.sin(ang);
      const nx = c * Nv.x + sn * B.x, ny = c * Nv.y + sn * B.y, nz = c * Nv.z + sn * B.z;
      const k = (i * (R + 1) + j);
      pos[k * 3] = pts[i].x + radius * nx; pos[k * 3 + 1] = pts[i].y + radius * ny; pos[k * 3 + 2] = pts[i].z + radius * nz;
      nrm[k * 3] = nx; nrm[k * 3 + 1] = ny; nrm[k * 3 + 2] = nz;
      uv[k * 2] = s; uv[k * 2 + 1] = (j / R) * radius * 6.283;
    }
  }
  const idx = [];
  const rows = closed ? N : N - 1;
  for (let i = 0; i < rows; i++) {
    const i2 = (i + 1) % N;
    for (let j = 0; j < R; j++) {
      const a = i * (R + 1) + j, b = i2 * (R + 1) + j, c = i2 * (R + 1) + j + 1, d = i * (R + 1) + j + 1;
      idx.push(a, d, b, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/* ---------- сборка ---------- */
const NEUTRAL = {};
function neutral(key) {
  if (NEUTRAL[key]) return NEUTRAL[key];
  if (key === 'throw' || key === 'decor') { NEUTRAL[key] = decorMaterial(key); return NEUTRAL[key]; }   // лён / хлопок с плетением и складками
  const c = { fabric: '#E6E1D8', legs: '#2B2B2B', top: '#C8A57A', mattress: '#F2F1EC', decor: '#EDEBE6', throw: '#C7C3BC', tape: '#4A4A4C', support: '#1A1A1A' }[key] || '#cccccc';
  NEUTRAL[key] = new THREE.MeshPhysicalMaterial({ color: c, roughness: key === 'legs' ? 0.4 : key === 'support' ? 0.6 : key === 'decor' || key === 'throw' ? 0.95 : 0.85, metalness: key === 'legs' ? 0.8 : 0 });
  if (key === 'throw') { NEUTRAL[key].sheen = 0.6; NEUTRAL[key].sheenRoughness = 0.7; NEUTRAL[key].sheenColor = new THREE.Color('#E8E6E2'); }
  if (key === 'decor') { NEUTRAL[key].sheen = 0.4; NEUTRAL[key].sheenRoughness = 0.8; NEUTRAL[key].sheenColor = new THREE.Color('#FFFFFF'); }
  return NEUTRAL[key];
}

function itemGeometry(it, quality, type, dense = 1) {
  const cushion = !!it.cushion;
  if (it.shape === 'shell') return shellGeometry(it, quality);
  if (it.role === 'leg' || (it.role === 'pedestal' && it.id.startsWith('pedestal'))) return legGeometry(it, quality);
  if (it.shape === 'cyl') {
    const isTop = it.role === 'top', base = it.id.startsWith('pbase');
    return softCyl(it.sx, it.sy, it.sz, {
      quality, crown: cushion ? Math.max(it.crown || 0, 0.018) : it.crown || 0, tufting: it.tufting,
      barrel: cushion && type === 'pouf' ? 0.022 : 0,   // круглый пуф: бок слегка «бочкой», как набитый, а не как труба
      seams: cushion && it.seam && !it.piping && quality !== 'low',
      rTop: isTop ? it.r : base ? 0.008 : it.r || 0.02, rBottom: isTop ? it.r * 0.6 : base ? 0.004 : it.rBottom || Math.min(0.02, it.r || 0.02),
    });
  }
  /* roundbox */
  const r = it.r ?? 0.02;
  const o = { quality, rx: r, rz: r, rTop: r, rBottom: Math.min(r, 0.02), dense };
  /* швы (шейдер): у деталей с кантом шов — сам кант (трубка) */
  const seams = (list) => { if (!it.piping) o.seams = list; };
  const soft = type !== 'pouf';
  if (it.role === 'arm') {
    /* подлокотник: мягкое скругление верха (не «доска»), чуть выпуклые бока и верх, шов по передней панели.
       Тонкий (track) — верх почти полукруглый, как у Klint; широкий — «подушка» со скруглением 8–9 см, как у ARCO */
    if (it.armStyle === 'round') { o.rx = it.sx / 2; o.rTop = it.sx / 2; o.rz = Math.min(0.08, it.sx / 2); o.rBottom = 0.025; o.crown = 0.008; }
    else if (it.armStyle === 'wide') { o.rx = Math.min(0.08, it.sx * 0.4); o.rz = 0.07; o.rTop = Math.min(0.09, it.sx * 0.45); o.rBottom = 0.03; o.crown = 0.012; o.crownP = 2.6; }
    else { o.rx = Math.min(0.045, it.sx * 0.42); o.rz = 0.04; o.rTop = Math.min(0.055, it.sx * 0.46); o.rBottom = 0.02; o.crown = 0.006; o.crownP = 2.4; }
    o.bulge = it.sx > 0.15 ? 0.012 : 0.008;
    seams([['z', 1]]);
  }
  if (cushion && it.role === 'seat') {
    /* подушка сиденья: «набитый» купол, скругление кромки 5 см, выпуклая боковая лента, прогиб там, где сидят */
    const cr = type === 'pouf' ? it.crown || 0.015 : 0.03;
    o.crown = cr; o.crownP = 2.6; o.bulge = type === 'pouf' ? 0.008 : 0.016; o.sag = type === 'pouf' ? 0 : 0.011; o.slump = type === 'pouf' ? 0 : 0.03;
    /* «набитая» подушка: кромка-«буллнос» (скругление верха ~ 45 % толщины), низ мягче, угол в плане ~8 см */
    o.rx = o.rz = Math.min(0.085, it.sx * 0.2, it.sz * 0.2); o.rTop = Math.min(0.07, it.sy * 0.46); o.rBottom = Math.min(0.045, it.sy * 0.3);
    /* задняя (и у углового блока — боковая) кромка уходит под подушку спинки: скругление там малое, без «щели-V» между подушками */
    if (type !== 'pouf') {
      o.rzBack = 0.025; if (it.id.startsWith('seat-c')) o.rxBack = 0.025;
      /* контакт: низ подушки на раме, тыл под подушкой спинки (у углового блока — и бок) */
      o.occ = [['y', -1, 0, 0.05, 0.7], ['z', -1, 0, 0.09, 0.55]]; if (it.id.startsWith('seat-c')) o.occ.push(['x', -1, 0, 0.09, 0.55]);
    } else o.occ = [['y', -1, 0, 0.03, 0.35]];
    if (it.seam) seams([['y', 1], ['y', -1]]);
  }
  if (cushion && it.role === 'back') {
    /* подушка спинки: пухлая, к верху тоньше, обе стороны выпуклые, очень мягкий верх */
    o.crown = Math.max(it.crown || 0.02, Math.min(0.055, it.sz * 0.3)); o.crownBack = Math.min(0.02, it.sz * 0.1); o.crownP = 2.4; o.crownFace = 'z'; o.bulge = 0.014; o.pillow = 0.2;
    o.rx = Math.min(0.1, it.sx * 0.2); o.rTop = Math.min(0.09, it.sy * 0.25); o.rBottom = Math.min(0.035, it.sz * 0.2); o.rz = Math.min(0.09, it.sz * 0.42);
    o.occ = [['y', -1, 0, 0.07, 0.65], ['z', -1, 0, 0.05, 0.45]];   // лежит на сиденье, тылом к спинке
    if (it.seam) seams([['z', 1], ['z', -1]]);
  }
  if (!cushion && it.role === 'back') {
    o.rTop = Math.min(0.1, it.sz * 0.48); o.rx = Math.min(0.045, it.sx * 0.2); o.rz = Math.min(0.09, it.sz * 0.48); o.rBottom = 0.015;
    if (it.crown) { o.crown = it.sz > 0.15 ? 0.03 : it.crown; o.crownP = 2.6; o.crownFace = 'z'; o.bulge = 0.008; }
    if (it.sz > 0.15) seams([['z', 1]]);
    o.occ = [['y', -1, 0, 0.05, 0.5]];   // низ цельной спинки у подушки сиденья
  }
  if (it.backShape === 'rounded') { o.rx = Math.min(it.sx * 0.25, 0.12); o.rTop = o.rx; o.rz = Math.min(0.025, it.sz * 0.45); o.rBottom = 0.02; }
  if (it.role === 'headboard') {
    /* изголовье: мягкая панель с выпуклым фронтом и швом-кантом по периметру фронта */
    o.rx = it.wing ? 0.06 : 0.05; o.rTop = it.wing ? 0.07 : 0.06; o.rz = Math.min(0.045, it.sz * 0.45); o.rBottom = 0.012;
    if (it.crown) { o.crown = it.tufting ? it.crown : 0.025; o.crownP = 2.6; o.crownFace = 'z'; o.bulge = it.tufting ? 0 : 0.006; }
    if (it.tufting) { o.tufting = it.tufting; o.tuftFace = 'z'; }
    seams([['z', 1]]);
  }
  if (it.role === 'mattress') { o.rx = o.rz = 0.045; o.rTop = 0.03; o.rBottom = 0.03; o.crown = it.crown || 0.01; o.crownP = 3; o.bulge = 0.006; }
  if (it.role === 'seat' && it.tufting) { o.tufting = it.tufting; o.tuftFace = 'y'; }
  if (it.role === 'top') { o.rx = o.rz = it.rPlan || 0.012; o.rTop = it.r; o.rBottom = it.r * 0.6; }
  if (it.role === 'decor') {
    if (it.decorKind === 'pillow') {
      /* подушка-«линза»: тонкий шов по кромке, набитая середина с обеих сторон, углы-«ушки» тонкие; прислонена к изголовью
         (rotX в params.js) — к верху тоньше, наполнитель внизу */
      const cr = it.sy * 0.465;
      o.crown = cr; o.crownBottom = cr; o.crownP = 1.3; o.rx = o.rz = Math.min(0.04, it.sx * 0.1); o.rTop = o.rBottom = Math.min(0.01, (it.sy - 2 * cr) * 0.45); o.bulge = 0; o.slump = 0; o.pillow = 0.3;
      o.occ = [['z', -1, 0, 0.08, 0.5]];   // нижняя кромка (−Z до поворота) лежит на матрасе
    } else if (it.roll) {
      /* отворот покрывала: мягкий валик вдоль кромки, к боковинам чуть провисает */
      o.rTop = o.rBottom = it.sy * 0.48; o.rz = it.sz * 0.48; o.rx = Math.min(0.04, it.sx * 0.1); o.crown = 0; o.bulge = 0.004; o.slump = 0.03;
      o.drape = it.drape || null; o.occ = [['y', -1, 0, 0.04, 0.45]];
    } else {
      /* покрывало: толстое, брошено на матрас — крупные мягкие складки, волнистая кромка, свисает за боковины и изножье */
      o.crown = Math.min(it.crown || 0.02, it.sy * 0.35); o.crownP = 1.6; o.rx = o.rz = it.r; o.rTop = Math.min(it.r, it.sy * 0.45); o.rBottom = Math.min(0.02, it.sy * 0.3); o.bulge = 0.006; o.ripple = Math.min(0.026, it.sy * 0.33); o.dense = (o.dense || 1) * 0.75;
      o.drape = it.drape || null;
    }
  }
  if (cushion === false && it.softBack) { o.rTop = 0.08; o.rx = 0.055; o.rz = Math.min(0.07, it.sz * 0.4); o.crown = Math.max(it.crown || 0.02, 0.03); o.crownP = 2.3; o.crownFace = 'z'; o.bulge = 0.008; o.seams = it.piping ? undefined : [['z', 1]]; }
  if (it.role === 'plinth') { o.rx = o.rz = 0.012; o.rTop = 0.006; o.rBottom = 0.004; }
  if (it.role === 'frame') {
    /* основание под подушками: мягкая обивка, чуть выпуклый фронт */
    const big = type === 'modular' || (type !== 'bed' && it.sy > 0.2);   // низкие «плиты» модульных — скругление 6 см, как у ARCO
    o.rTop = Math.min(big ? 0.045 : 0.035, it.sy * 0.4); o.rBottom = Math.min(big ? 0.035 : 0.02, it.sy * 0.3);
    o.rx = o.rz = Math.max(r, soft ? (big ? 0.06 : 0.04) : r); o.bulge = soft && type !== 'bed' && it.sy > 0.12 ? 0.008 : 0;
    if (type === 'bed') { o.rx = o.rz = 0.02; o.rTop = 0.012; }
    else o.occ = [['y', 1, 0, 0.035, 0.55]];   // верхняя кромка рамы — под свесом подушки сиденья
  }
  if (it.role === 'mattress') o.occ = [['y', -1, 0, 0.14, 0.3]];   // низ матраса в раме, у царги темнее
  if (it.role === 'plinth') o.occ = [['y', 1, 0, 0.025, 0.5]];
  if (it.role === 'rail') {
    /* царга кровати: мягкий «валик» — верх скруглён почти на всю толщину (NUBO), бока слегка выпуклые */
    o.rTop = Math.min(0.06, it.sy * 0.42, Math.min(it.sx, it.sz) * 0.48); o.rBottom = Math.min(0.03, it.sy * 0.2); o.rx = o.rz = Math.min(0.045, it.sx * 0.45, it.sz * 0.45); o.crown = 0.006; o.crownP = 2.6; o.bulge = 0.008;
    seams([['y', 1]]);
  }
  return softBox(it.sx, it.sy, it.sz, o);
}

/* наклонная подушка: скругления и «купол» делают её наклонный габарит чуть меньше расчётного — подгоняем масштабом,
   чтобы Box3 модели совпадал с dims() (до долей миллиметра) */
function fitTilted(geo, it) {
  const a = -(it.tiltX || 0), c = Math.cos(a), s = Math.sin(a);
  const pos = geo.attributes.position;
  const ext = () => { let y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), z = pos.getZ(i); const yy = y * c - z * s, zz = y * s + z * c; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; if (zz < z0) z0 = zz; if (zz > z1) z1 = zz; } return [y0, y1, z0, z1]; };
  const sy = it.sy * c + it.sz * Math.abs(s), sz = it.sz * c + it.sy * Math.abs(s);
  const M = new THREE.Matrix4();
  for (let k = 0; k < 2; k++) {
    const [y0, y1, z0, z1] = ext();
    /* масштаб в повёрнутой системе ≈ в локальной (угол ≤ 0,15 рад) */
    const S = new THREE.Matrix4().makeScale(1, sy / (y1 - y0), sz / (z1 - z0));
    geo.applyMatrix4(S); M.premultiply(S);
  }
  const [y0, y1, z0, z1] = ext();
  /* центр наклонного габарита → центр детали */
  const dy = -(y0 + y1) / 2, dz = -(z0 + z1) / 2;
  const T = new THREE.Matrix4().makeTranslation(0, dy * c + dz * s, -dy * s + dz * c);
  geo.applyMatrix4(T); M.premultiply(T);
  /* наклон «запекается» в геометрию: локальный габарит меша = точный (Box3.setFromObject без precise) */
  const Rx = new THREE.Matrix4().makeRotationX(a);
  geo.applyMatrix4(Rx); M.premultiply(Rx);
  geo.userData.fitMatrix = M;
  geo.computeBoundingBox(); geo.computeBoundingSphere();
}

const tmpM = new THREE.Matrix4();

export function build(type, params, materials = {}, opts = {}) {
  const quality = opts.quality || 'high';
  const p = normalize(type, params);
  const pr = parts(type, p);
  const group = new THREE.Group();
  group.name = 'ricca-piece';
  const M = {
    fabric: materials.fabric || neutral('fabric'), legs: materials.legs || neutral('legs'),
    top: materials.top || neutral('top'), mattress: materials.mattress || neutral('mattress'),
    decor: materials.decor || neutral('decor'), throw: neutral('throw'), tape: materials.tape || neutral('tape'), support: neutral('support'),
  };
  const seamM = seamMaterial(M.fabric) || M.fabric;
  const pipeM = pipingMaterial(M.fabric) || M.fabric;
  const meshes = [];
  const addMesh = (geo, matKey, it, extra) => {
    ensureSeamAttr(geo);
    const mat = matKey === 'seam' ? seamM : matKey === 'piping' ? pipeM : M[matKey] || M.fabric;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData = { partId: it.id, role: it.role, matKey, ...(extra || {}) };
    mesh.position.set(it.x, it.y, it.z);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = it.rotY || 0;
    /* наклон назад (tiltX) уже в геометрии (fitTilted); rotX — только у декора (подушка, прислонённая к изголовью) */
    mesh.rotation.x = it.rotX || 0;
    meshes.push(mesh);
    return mesh;
  };
  const dense = pr.items.length > 40 ? 2.2 : pr.items.length > 24 ? 1.6 : 1;
  const prof = opts.profile ? { geo: 0, tube: 0, merge: 0 } : null;
  let _t = 0;
  for (const it of pr.items) {
    if (prof) _t = performance.now();
    const geo = itemGeometry(it, quality, type, dense);
    if (prof) prof.geo += performance.now() - _t;
    if (it.tiltX) fitTilted(geo, it);
    /* покрывало — серо-бежевый лён (не белое на белом матрасе: кровать читается объёмом, как на фото работ) */
    const mk = it.decorKind === 'duvet' ? 'throw' : it.mat;
    addMesh(geo, ['legs', 'top', 'mattress', 'decor', 'throw', 'support'].includes(mk) ? mk : 'fabric', it, it.decor ? { decor: true } : null);
    /* кант и швы (у матраса — тёмная лента по верхней кромке; нижняя скрыта в раме) */
    const pipeMat = it.mat === 'mattress' ? 'tape' : 'fabric';
    if (geo.userData.edgeLoop && (it.piping || it.seam) && quality !== 'low') {
      const axis = it.role === 'back' && it.cushion ? 'z' : it.role === 'headboard' ? 'z' : 'y';
      const pr2 = it.piping ? (it.mat === 'mattress' ? 0.005 : 0.004) : 0.0016;
      const loops = it.role === 'headboard' || it.role === 'mattress' ? [1] : [1, -1];
      for (const sgn of loops) {
        const tg = tubeAlong(geo.userData.edgeLoop(axis, sgn), pr2, quality, true, dense);
        if (tg && geo.userData.fitMatrix) tg.applyMatrix4(geo.userData.fitMatrix);
        if (tg) addMesh(tg, it.piping ? (pipeMat === 'fabric' ? 'piping' : pipeMat) : 'seam', it, { detail: it.piping ? 'piping' : 'seam' });
      }
    } else if (geo.userData.edgeLoop && it.piping && quality === 'low') {
      const tg = tubeAlong(geo.userData.edgeLoop(it.role === 'back' && it.cushion ? 'z' : 'y', 1), 0.004, quality, true);
      if (tg && geo.userData.fitMatrix) tg.applyMatrix4(geo.userData.fitMatrix);
      if (tg) addMesh(tg, pipeMat === 'fabric' ? 'piping' : pipeMat, it, { detail: 'piping' });
    }
    if (it.shape === 'shell' && it.piping && geo.userData.topLine) {
      const tg = tubeAlong(geo.userData.topLine(), 0.004, quality, false);
      if (tg) addMesh(tg, 'piping', it, { detail: 'piping' });
    }
    /* пуговицы стяжки */
    if (it.tufting === 'capitone' && geo.userData.buttons && geo.userData.buttons.length) {
      const bg = new THREE.SphereGeometry(0.009, quality === 'low' ? 6 : 7, quality === 'low' ? 3 : 4);
      bg.scale(1, 1, 0.55);
      const list = [];
      for (const [bx, by] of geo.userData.buttons) {
        const g = bg.clone();
        if (it.role === 'headboard') g.translate(bx, by, it.sz / 2 - 0.0105 - 0.001);
        else { g.rotateX(-Math.PI / 2); g.translate(bx, (geo.userData.topY ?? it.sy / 2) - 0.0115, by); }
        list.push(g);
      }
      const merged = mergeGeometries(list, false);
      if (merged) addMesh(merged, 'seam', it, { detail: 'buttons' });
    }
  }
  /* слияние по материалу, если мешей много (меньше draw calls) */
  if (prof) _t = performance.now();
  if (meshes.length > 40) {
    const byMat = new Map();
    for (const m of meshes) {
      m.updateMatrix();
      const g = m.geometry.index ? m.geometry : m.geometry;
      const gg = g.clone().applyMatrix4(m.matrix);
      const k = m.userData.matKey + '|' + (m.userData.detail === 'seam' ? 'seam' : '');
      if (!byMat.has(k)) byMat.set(k, { geos: [], ids: [] });
      const e = byMat.get(k); e.geos.push(gg); e.ids.push(m.userData.partId);
      m.geometry.dispose();
    }
    for (const [kk, e] of byMat) {
      const [k, det] = kk.split('|');
      const attrs = ['position', 'normal', 'uv', 'seam', 'occ'];
      e.geos.forEach((g) => { ensureSeamAttr(g); for (const n of Object.keys(g.attributes)) if (!attrs.includes(n)) g.deleteAttribute(n); if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); });
      const merged = mergeGeometries(e.geos, false);
      e.geos.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, k === 'seam' ? seamM : k === 'piping' ? pipeM : M[k] || M.fabric);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = { partId: 'merged-' + kk, partIds: [...new Set(e.ids)], matKey: k, merged: true, ...(det ? { detail: det } : {}) };
      group.add(mesh);
    }
  } else meshes.forEach((m) => group.add(m));
  if (prof) { prof.merge = performance.now() - _t; group.userData.profile = prof; }
  group.userData = { ...group.userData, type, params: p, dims: dimsOf(type, p), parts: pr, quality };
  return group;
}

/* смена ткани/ножек без пересборки геометрии */
export function setMaterials(group, materials = {}) {
  const seamM = materials.fabric ? seamMaterial(materials.fabric) : null;
  const pipeM = materials.fabric ? pipingMaterial(materials.fabric) : null;
  group.traverse((o) => {
    if (!o.isMesh) return;
    const k = o.userData.matKey;
    if (k === 'seam' && seamM) o.material = seamM;
    else if (k === 'piping' && pipeM) o.material = pipeM;
    else if (materials[k]) o.material = materials[k];
  });
}

export function disposePiece(group) {
  if (!group) return;
  group.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
  if (group.parent) group.parent.remove(group);
}

/* число треугольников (для проверки бюджета) */
export function triangleCount(group) {
  let n = 0;
  group.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
  return n;
}
