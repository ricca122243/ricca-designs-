/* RICCA · конструктор — 3D-модель изделия из parts() (единый источник правды: params.js).
   build() делает меш (или несколько) на каждую деталь; всё, что добавляется сверху (швы, кант, стяжка, пуговицы,
   «купол» подушки, лёгкая выпуклость боков и прогиб сиденья), остаётся внутри габарита детали.
   Мягкие объёмы — свой генератор «мягкого бокса»: сетка на гранях куба, проецируемая на скруглённый (эллипсоидальный)
   угол с отдельными радиусами по осям; плотность сетки в зоне скругления — равномерная по углу. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { parts, normalize, dims as dimsOf } from './params.js';
import { seamMaterial } from './materials.js';

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

/* ---------- мягкий бокс ---------- */
/* o: { rx, rz, rTop, rBottom, quality, crown, crownFace:'y'|'z', bulge, sag, tufting, tuftFace:'z'|'y', taper, rough } */
function softBox(sx, sy, sz, o = {}) {
  const q = Q[o.quality] || Q.high;
  const crown = o.crown || 0, bulge = o.bulge || 0;
  const cf = o.crownFace || 'y';
  /* базовый бокс уменьшен на «купол» и выпуклость — после деформации деталь ровно в габарите */
  const bx = sx - 2 * bulge, by = sy - (cf === 'y' ? crown : 0), bz = sz - 2 * bulge - (cf === 'z' ? crown : 0);
  const Hx = bx / 2, Hy = by / 2, Hz = bz / 2;
  const lim = (r, h) => Math.max(0.0005, Math.min(r, h * 0.999));
  const rx = lim(o.rx ?? 0.02, Hx), rz = lim(o.rz ?? o.rx ?? 0.02, Hz);
  let rT = lim(o.rTop ?? 0.02, Hy), rB = lim(o.rBottom ?? 0.015, Hy);
  if (rT + rB > by * 0.999) { const k = (by * 0.999) / (rT + rB); rT *= k; rB *= k; }
  const R = { x: [rx, rx], y: [rB, rT], z: [rz, rz] };
  const proj = makeProjector(Hx, Hy, Hz, R);
  const tuft = o.tufting;
  /* плотность стяжки: не мельче q.tuft и не больше ~30 тыс. вершин на две большие грани */
  const tArea = tuft ? (o.tuftFace === 'y' ? sx * sz : sx * sy) : 0;
  const spTuft = tuft ? Math.max(q.tuft, Math.sqrt((2 * tArea) / (o.quality === 'low' ? 6000 : o.quality === 'mid' ? 12000 : 24000))) : q.sp;
  const deformed = crown || bulge || tuft || o.sag || (o.taper && o.taper !== 1);
  const sp = (deformed ? q.sp : q.flat) * (o.dense || 1);
  const tf = o.tuftFace || 'z';
  const X = axisSamples(Hx, rx, rx, tuft ? spTuft : sp, q.nq);
  const Y = axisSamples(Hy, rB, rT, tuft && tf === 'z' ? spTuft : sp, q.nq);
  const Z = axisSamples(Hz, rz, rz + (cf === 'z' ? 0 : 0), tuft && tf === 'y' ? spTuft : sp, q.nq);
  const positions = [], normals = [], uvs = [], index = [];
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  const yOff = cf === 'y' ? -crown / 2 : 0, zOff = cf === 'z' ? -crown / 2 : 0;
  const disp = makeDisplacer({ Hx, Hy, Hz, crown, cf, bulge, sag: o.sag || 0, tuft, tf, sx, sy, sz, taper: o.taper || 1, rT });
  const face = (A, B, mk, uvf, flip) => {
    const base = positions.length / 3;
    for (let j = 0; j < B.length; j++) for (let i = 0; i < A.length; i++) {
      const g = mk(A[i], B[j]);
      proj(g[0], g[1], g[2], P, N);
      disp(P, N);
      positions.push(P.x, P.y + yOff, P.z + zOff); normals.push(N.x, N.y, N.z);
      const uv = uvf(P); uvs.push(uv[0], uv[1]);
    }
    const W = A.length;
    for (let j = 0; j < B.length - 1; j++) for (let i = 0; i < W - 1; i++) {
      const a = base + j * W + i, b = a + 1, c = a + W, d = c + 1;
      if (flip) index.push(a, b, c, b, d, c); else index.push(a, c, b, b, c, d);
    }
  };
  face(X, Z, (a, b) => [a, Hy, b], (p) => [p.x, -p.z], false); // верх
  face(X, Z, (a, b) => [a, -Hy, b], (p) => [p.x, p.z], true); // низ
  face(X, Y, (a, b) => [a, b, Hz], (p) => [p.x, p.y], true); // фронт
  face(X, Y, (a, b) => [a, b, -Hz], (p) => [-p.x, p.y], false); // тыл
  face(Z, Y, (a, b) => [Hx, b, a], (p) => [-p.z, p.y], false); // правый бок
  face(Z, Y, (a, b) => [-Hx, b, a], (p) => [p.z, p.y], true); // левый бок
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  if (crown || bulge || tuft || o.sag || (o.taper && o.taper !== 1)) smoothNormalsByPosition(geo);
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
  const buttons = [];
  let tuftFn = null;
  if (tuft === 'channels') {
    const n = Math.max(5, Math.min(9, Math.round(sx / 0.24)));
    const depth = 0.016;
    tuftFn = (u, v) => { const f = Math.pow(Math.abs(Math.sin(Math.PI * n * (u * 0.5 + 0.5))), 0.3); return depth * (f - 1); };
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
    if (crown) {
      if (cf === 'y' && N.y > 0.2) {
        const u = Math.min(1, Math.abs(P.x) / Hx), v = Math.min(1, Math.abs(P.z) / Hz);
        P.y += crown * (1 - u * u) * (1 - v * v) * smooth(0.2, 0.95, N.y);
      } else if (cf === 'z' && N.z > 0.2) {
        const u = Math.min(1, Math.abs(P.x) / Hx), v = Math.min(1, Math.abs(P.y) / Hy);
        P.z += crown * (1 - u * u) * (1 - v * v) * smooth(0.2, 0.95, N.z);
      }
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
      P.y -= sag * smooth(0.45, 0.8, z) * (1 - smooth(0.92, 1.0, z)) * (1 - u * u) * smooth(0.2, 0.95, N.y);
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
  const A = sx / 2, B = sz / 2, Hh = (sy - crown) / 2;
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
  for (let r = 0; r < rows.length; r++) {
    const [dl, y, kind] = rows[r];
    ringStart.push(positions.length / 3);
    for (let s = 0; s <= nSeg; s++) {
      const ph = (s / nSeg) * Math.PI * 2;
      const ax = Math.max(0, A - dl), bz = Math.max(0, B - dl);
      let x = ax * Math.cos(ph), z = bz * Math.sin(ph), yy = y;
      if (crown && kind === 2) { const u = Math.hypot(x / A, z / B); yy += crown * Math.max(0, 1 - u * u) * (dl >= rT ? 1 : smooth(0, rT, dl)); }
      if (tuftFn && kind === 2 && dl > rT) {
        let best = 9; for (const [bx, bzz] of btn) { const d = (x - bx) ** 2 + (z - bzz) ** 2; if (d < best) best = d; }
        yy += -0.011 * Math.exp(-best / (0.022 * 0.022)) * smooth(rT, rT + 0.03, dl);
      }
      positions.push(x, yy + (crown ? -crown / 2 : 0), z);
      if (kind === 1) uvs.push((s / nSeg) * per, y); else uvs.push(x, kind === 2 ? -z : z);
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
  geo.setIndex(index);
  smoothNormalsByPosition(geo);
  geo.userData.edgeLoop = (axis, sign) => {
    const y = sign > 0 ? Hh - rT + rT * Math.SQRT1_2 : -Hh + rB - rB * Math.SQRT1_2;
    const dl = sign > 0 ? rT - rT * Math.SQRT1_2 : rB - rB * Math.SQRT1_2;
    const pts = [];
    for (let s = 0; s < nSeg; s++) { const ph = (s / nSeg) * Math.PI * 2; pts.push(new THREE.Vector3((A - dl) * Math.cos(ph), y + (crown ? -crown / 2 : 0), (B - dl) * Math.sin(ph))); }
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
    for (let j = 0; j < L; j++) {
      let [rho, y, top] = pts[j];
      rho = t / 2 + (rho - t / 2) * sc;
      if (top) y = cy + (y - cy) * sc + 0 * (1 - sc);
      else if (y > cy) y = cy + (y - cy) * sc;
      const x = (A - rho) * sn + tx * ext, z = (B - rho) * cs + tz * ext;
      positions.push(x, y, z);
      uvs.push(th * (A + B) / 2 + ext, y + rho);
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
  const c = { fabric: '#E6E1D8', legs: '#2B2B2B', top: '#C8A57A', mattress: '#F2F1EC' }[key] || '#cccccc';
  NEUTRAL[key] = new THREE.MeshPhysicalMaterial({ color: c, roughness: key === 'legs' ? 0.4 : 0.85, metalness: key === 'legs' ? 0.8 : 0 });
  return NEUTRAL[key];
}

function itemGeometry(it, quality, type, dense = 1) {
  const cushion = !!it.cushion;
  if (it.shape === 'shell') return shellGeometry(it, quality);
  if (it.role === 'leg' || (it.role === 'pedestal' && it.id.startsWith('pedestal'))) return legGeometry(it, quality);
  if (it.shape === 'cyl') {
    const isTop = it.role === 'top', base = it.id.startsWith('pbase');
    return softCyl(it.sx, it.sy, it.sz, {
      quality, crown: it.crown || 0, tufting: it.tufting,
      rTop: isTop ? it.r : base ? 0.008 : it.r || 0.02, rBottom: isTop ? it.r * 0.6 : base ? 0.004 : it.rBottom || Math.min(0.02, it.r || 0.02),
    });
  }
  /* roundbox */
  const r = it.r ?? 0.02;
  const o = { quality, rx: r, rz: r, rTop: r, rBottom: Math.min(r, 0.02), dense };
  if (it.role === 'arm') {
    if (it.armStyle === 'round') { o.rx = it.sx / 2; o.rTop = it.sx / 2; o.rz = 0.045; o.rBottom = 0.02; }
    else if (it.armStyle === 'wide') { o.rx = 0.035; o.rz = 0.035; o.rTop = 0.05; }
    else { o.rx = 0.02; o.rz = 0.02; o.rTop = 0.02; }
    o.bulge = it.sx > 0.15 ? 0.004 : 0;
  }
  if (cushion && it.role === 'seat') { o.crown = it.crown || 0.012; o.bulge = 0.006; o.sag = type === 'chair' || type === 'pouf' ? 0 : 0.006; o.rx = o.rz = r; o.rTop = r; o.rBottom = Math.min(r, 0.03); }
  if (cushion && it.role === 'back') { o.crown = it.crown || 0.02; o.crownFace = 'z'; o.bulge = 0.005; o.rx = r; o.rTop = r; o.rBottom = r * 0.8; o.rz = Math.min(r, it.sz * 0.45); }
  if (!cushion && it.role === 'back') { o.rTop = Math.min(0.05, it.sz * 0.4); o.rx = 0.03; o.rz = Math.min(0.04, it.sz * 0.4); if (it.crown) { o.crown = it.crown; o.crownFace = 'z'; } }
  if (it.backShape === 'rounded') { o.rx = Math.min(it.sx * 0.25, 0.12); o.rTop = o.rx; o.rz = Math.min(0.025, it.sz * 0.45); o.rBottom = 0.02; }
  if (it.role === 'headboard') {
    o.rx = it.wing ? 0.05 : 0.03; o.rTop = it.wing ? 0.06 : 0.04; o.rz = Math.min(0.035, it.sz * 0.4); o.rBottom = 0.01;
    if (it.crown) { o.crown = it.crown; o.crownFace = 'z'; }
    if (it.tufting) { o.tufting = it.tufting; o.tuftFace = 'z'; }
  }
  if (it.role === 'mattress') { o.rx = o.rz = 0.05; o.rTop = 0.035; o.rBottom = 0.035; o.crown = it.crown || 0.008; o.bulge = 0.004; }
  if (it.role === 'seat' && it.tufting) { o.tufting = it.tufting; o.tuftFace = 'y'; }
  if (it.role === 'top') { o.rx = o.rz = it.rPlan || 0.012; o.rTop = it.r; o.rBottom = it.r * 0.6; }
  if (it.role === 'plinth') { o.rx = o.rz = 0.01; o.rTop = 0.004; o.rBottom = 0.004; }
  if (it.role === 'frame' || it.role === 'rail') { o.rTop = Math.min(it.r ?? 0.02, it.sy * 0.4); o.rBottom = 0.01; }
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
  };
  const seamM = seamMaterial(M.fabric) || M.fabric;
  const meshes = [];
  const addMesh = (geo, matKey, it, extra) => {
    const mat = matKey === 'seam' ? seamM : M[matKey] || M.fabric;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.userData = { partId: it.id, role: it.role, matKey, ...(extra || {}) };
    mesh.position.set(it.x, it.y, it.z);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = it.rotY || 0;
    /* наклон назад: верх уходит в −Z (локально) */
    mesh.rotation.x = 0; // наклон уже в геометрии (fitTilted)
    meshes.push(mesh);
    return mesh;
  };
  const dense = pr.items.length > 40 ? 2 : pr.items.length > 24 ? 1.6 : 1;
  const prof = opts.profile ? { geo: 0, tube: 0, merge: 0 } : null;
  let _t = 0;
  for (const it of pr.items) {
    if (prof) _t = performance.now();
    const geo = itemGeometry(it, quality, type, dense);
    if (prof) prof.geo += performance.now() - _t;
    if (it.tiltX) fitTilted(geo, it);
    addMesh(geo, it.mat === 'legs' ? 'legs' : it.mat === 'top' ? 'top' : it.mat === 'mattress' ? 'mattress' : 'fabric', it);
    /* кант и швы */
    const pipeMat = it.mat === 'mattress' ? 'mattress' : 'fabric';
    if (geo.userData.edgeLoop && (it.piping || it.seam) && quality !== 'low') {
      const axis = it.role === 'back' && it.cushion ? 'z' : it.role === 'headboard' ? 'z' : 'y';
      const pr2 = it.piping ? 0.004 : 0.0016;
      const loops = it.role === 'headboard' ? [1] : [1, -1];
      for (const sgn of loops) {
        const tg = tubeAlong(geo.userData.edgeLoop(axis, sgn), pr2, quality, true, dense);
        if (tg && geo.userData.fitMatrix) tg.applyMatrix4(geo.userData.fitMatrix);
        if (tg) addMesh(tg, it.piping ? pipeMat : 'seam', it, { detail: it.piping ? 'piping' : 'seam' });
      }
    } else if (geo.userData.edgeLoop && it.piping && quality === 'low') {
      const tg = tubeAlong(geo.userData.edgeLoop(it.role === 'back' && it.cushion ? 'z' : 'y', 1), 0.004, quality, true);
      if (tg && geo.userData.fitMatrix) tg.applyMatrix4(geo.userData.fitMatrix);
      if (tg) addMesh(tg, pipeMat, it, { detail: 'piping' });
    }
    if (it.shape === 'shell' && it.piping && geo.userData.topLine) {
      const tg = tubeAlong(geo.userData.topLine(), 0.004, quality, false);
      if (tg) addMesh(tg, 'fabric', it, { detail: 'piping' });
    }
    /* пуговицы стяжки */
    if (it.tufting === 'capitone' && geo.userData.buttons && geo.userData.buttons.length) {
      const bg = new THREE.SphereGeometry(0.009, quality === 'low' ? 6 : 8, quality === 'low' ? 4 : 6);
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
      const k = m.userData.matKey;
      if (!byMat.has(k)) byMat.set(k, { geos: [], ids: [] });
      const e = byMat.get(k); e.geos.push(gg); e.ids.push(m.userData.partId);
      m.geometry.dispose();
    }
    for (const [k, e] of byMat) {
      const attrs = ['position', 'normal', 'uv'];
      e.geos.forEach((g) => { for (const n of Object.keys(g.attributes)) if (!attrs.includes(n)) g.deleteAttribute(n); if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); });
      const merged = mergeGeometries(e.geos, false);
      e.geos.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, k === 'seam' ? seamM : M[k] || M.fabric);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = { partId: 'merged-' + k, partIds: [...new Set(e.ids)], matKey: k, merged: true };
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
  group.traverse((o) => {
    if (!o.isMesh) return;
    const k = o.userData.matKey;
    if (k === 'seam' && seamM) o.material = seamM;
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
