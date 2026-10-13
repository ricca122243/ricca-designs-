/* RICCA · конструктор — материалы (MeshPhysicalMaterial). Цвет ткани = hex образца (sRGB → линейный через ColorManagement).
   Фактура: процедурные бесшовные карты нормалей и шероховатости по виду ткани (генерируются один раз и кешируются),
   мелкая «живая» неоднородность — из фото образца (src450, высокочастотная яркость, среднее сохраняется).
   UV у всех деталей — в метрах (furniture3d.js), поэтому масштаб фактуры одинаков на любом размере изделия. */
import * as THREE from 'three';
import { normalize } from './params.js';

export const KINDS = ['velour', 'corduroy', 'boucle', 'chenille', 'matting', 'suede', 'leather'];

/* параметры по виду (§8.1): шероховатость, блеск ворса, карта нормалей (сила, размер плитки в м) */
const KIND = {
  velour: { rough: 0.80, sheen: 1.0, sheenRough: 0.30, sheenLift: 0.25, nScale: 0.20, tile: 0.06 },
  corduroy: { rough: 0.82, sheen: 0.9, sheenRough: 0.35, sheenLift: 0.20, nScale: 0.6, tile: 0.04 },
  boucle: { rough: 0.95, sheen: 0.35, sheenRough: 0.80, sheenLift: 0.10, nScale: 1.0, tile: 0.08 },
  chenille: { rough: 0.88, sheen: 0.6, sheenRough: 0.50, sheenLift: 0.15, nScale: 0.5, tile: 0.06 },
  matting: { rough: 0.92, sheen: 0.15, sheenRough: 0.70, sheenLift: 0.05, nScale: 0.6, tile: 0.05 },
  suede: { rough: 0.86, sheen: 0.5, sheenRough: 0.60, sheenLift: 0.12, nScale: 0.15, tile: 0.06 },
  leather: { rough: 0.45, sheen: 0, sheenRough: 0.5, sheenLift: 0, nScale: 0.35, tile: 0.10, clearcoat: 0.25, clearcoatRough: 0.35, specular: 0.5 },
};
const SWATCH_TILE = 0.12; // одна плитка фото образца = 12 см

export function kindOf(fabricTypeId, collection) {
  const k = collection && typeof collection === 'object' ? collection.kind : null;
  if (k && KINDS.includes(k)) return k;
  const id = String(fabricTypeId || '').toLowerCase();
  const cid = String((collection && collection.id) || collection || '').toLowerCase();
  if (/^vel'?vet|^velvet|^vel-vet|^korduroy|^corduroy/.test(id)) return 'corduroy';
  const map = { velur: 'velour', velour: 'velour', bukle: 'boucle', boucle: 'boucle', shenill: 'chenille', chenille: 'chenille', rogozhka: 'matting', matting: 'matting', zamsha: 'suede', suede: 'suede', ekokozha: 'leather', leather: 'leather' };
  return map[id] || 'velour';
}

/* ---------- процедурный шум (бесшовный) ---------- */
function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function makeRng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/* value noise с периодом P клеток по обеим осям; x,y в клетках */
function tnoise(x, y, P, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (a) => ((a % P) + P) % P;
  const a = hash2(m(xi), m(yi), seed), b = hash2(m(xi + 1), m(yi), seed), c = hash2(m(xi), m(yi + 1), seed), d = hash2(m(xi + 1), m(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, P, seed, oct = 4) { let s = 0, amp = 0.5, f = 1, n = 0; for (let o = 0; o < oct; o++) { s += amp * tnoise(x * f, y * f, P * f, seed + o * 17); n += amp; amp *= 0.5; f *= 2; } return s / n; }

/* высота → карта нормалей (RGBA, линейная) + шероховатость из той же высоты */
function heightToTextures(H, N, strength, roughBase, roughVar) {
  const nrm = new Uint8Array(N * N * 4), rgh = new Uint8Array(N * N * 4);
  const at = (x, y) => H[((y + N) % N) * N + ((x + N) % N)];
  let mn = Infinity, mx = -Infinity; for (let i = 0; i < H.length; i++) { if (H[i] < mn) mn = H[i]; if (H[i] > mx) mx = H[i]; }
  const span = mx - mn || 1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) / span, dy = (at(x, y + 1) - at(x, y - 1)) / span;
    let nx = -dx * strength, ny = dy * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * N + x) * 4;
    nrm[i] = (nx * 0.5 + 0.5) * 255; nrm[i + 1] = (ny * 0.5 + 0.5) * 255; nrm[i + 2] = (nz * 0.5 + 0.5) * 255; nrm[i + 3] = 255;
    const h = (H[y * N + x] - mn) / span;
    const r = Math.min(1, Math.max(0, roughBase + (0.5 - h) * roughVar));
    rgh[i] = 255; rgh[i + 1] = r * 255; rgh[i + 2] = 255; rgh[i + 3] = 255; // three берёт шероховатость из G
  }
  return { nrm, rgh };
}
function dataTex(arr, N, srgb = false) {
  const t = new THREE.DataTexture(arr, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 8; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true;
  return t;
}

/* высотные поля по виду ткани (N×N, бесшовные) */
function fabricHeight(kind, N) {
  const H = new Float32Array(N * N);
  const rnd = makeRng(kind.length * 977 + 13);
  if (kind === 'velour' || kind === 'suede') {
    const P = kind === 'velour' ? 96 : 128;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      let h = fbm(u * P, v * P, P, 3, 3);
      if (kind === 'velour') h += 0.35 * tnoise(u * 6, v * 160, 6, 9) + 0.25 * fbm(u * 8, v * 8, 8, 5, 3); // направленный ворс + «пятна» примятого ворса
      H[y * N + x] = h;
    }
  } else if (kind === 'corduroy') {
    const ribs = 10; // 4 мм на плитке 4 см
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      const r = Math.pow(Math.abs(Math.sin(Math.PI * u * ribs)), 0.6);
      H[y * N + x] = r + 0.18 * fbm(u * 64, v * 64, 64, 4, 3) + 0.08 * tnoise(u * 10, v * 140, 10, 2);
    }
  } else if (kind === 'chenille') {
    const cords = 24; // 2,5 мм на 6 см
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      const c = Math.pow(Math.abs(Math.sin(Math.PI * (v * cords + 0.15 * tnoise(u * 12, v * 12, 12, 7)))), 0.8);
      const w = 0.25 * Math.pow(Math.abs(Math.sin(Math.PI * u * cords * 1.5)), 2);
      H[y * N + x] = c * (0.75 + 0.25 * fbm(u * 48, v * 48, 48, 8, 3)) - w * 0.4 + 0.25 * fbm(u * 96, v * 96, 96, 11, 2);
    }
  } else if (kind === 'matting') {
    const cells = 25; // 2 мм на 5 см
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N * cells, v = y / N * cells;
      const cx = Math.floor(u), cy = Math.floor(v), fx = u - cx, fy = v - cy;
      const horiz = (cx + cy) % 2 === 0;
      const t = horiz ? fy : fx; // нити поперёк клетки: две нити
      const thread = Math.pow(Math.abs(Math.sin(Math.PI * t * 2)), 0.7);
      const along = horiz ? fx : fy;
      const dip = 0.25 * Math.pow(Math.sin(Math.PI * along), 0.5);
      H[y * N + x] = thread * (0.7 + dip) + 0.2 * fbm(x / N * 80, y / N * 80, 80, 6, 2);
    }
  } else if (kind === 'boucle') {
    for (let i = 0; i < N * N; i++) H[i] = 0.15 * fbm((i % N) / N * 64, Math.floor(i / N) / N * 64, 64, 21, 2);
    const pxPerM = N / 0.08; // плитка 8 см
    const loops = Math.round(N * N / 140);
    for (let k = 0; k < loops; k++) {
      const cx = rnd() * N, cy = rnd() * N;
      const r = (0.0015 + rnd() * 0.001) * pxPerM; // петли 3–5 мм
      const tw = r * 0.38, amp = 0.7 + rnd() * 0.6;
      const ex = 0.8 + rnd() * 0.4;
      const R = Math.ceil(r + tw * 2);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const d = Math.hypot(dx * ex, dy / ex);
        const t = (d - r) / tw; if (t > 2.5 || t < -2.5) continue;
        const x = ((Math.round(cx + dx) % N) + N) % N, y = ((Math.round(cy + dy) % N) + N) % N;
        H[y * N + x] = Math.max(H[y * N + x], amp * Math.exp(-t * t) + 0.12);
      }
    }
  } else if (kind === 'leather') {
    /* Вороной: зерно 1,5 мм на плитке 10 см → ~66 клеток; высота = расстояние до границы клеток */
    const C = 64, pts = [];
    for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) pts.push([(i + 0.15 + rnd() * 0.7) / C, (j + 0.15 + rnd() * 0.7) / C]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, ci = Math.floor(u * C), cj = Math.floor(v * C);
      let f1 = 9, f2 = 9;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = (ci + di + C) % C, jj = (cj + dj + C) % C, p = pts[jj * C + ii];
        let px = p[0] + (ci + di < 0 ? -1 : ci + di >= C ? 1 : 0), py = p[1] + (cj + dj < 0 ? -1 : cj + dj >= C ? 1 : 0);
        const d = Math.hypot(px - u, py - v); if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
      }
      const edge = Math.min(1, (f2 - f1) * C * 2.2);
      H[y * N + x] = Math.sqrt(edge) * 0.85 + 0.15 * fbm(u * 32, v * 32, 32, 41, 3);
    }
  }
  return H;
}

const texCache = new Map();
function fabricMaps(kind, N) {
  const key = kind + N;
  if (texCache.has(key)) return texCache.get(key);
  const H = fabricHeight(kind, N);
  const rv = { boucle: 0.18, corduroy: 0.12, chenille: 0.14, matting: 0.1, leather: 0.18, velour: 0.08, suede: 0.06 }[kind] || 0.1;
  const { nrm, rgh } = heightToTextures(H, N, { boucle: 5, corduroy: 3.5, chenille: 3, matting: 3, leather: 2.2, velour: 1.6, suede: 1.2 }[kind] || 2, 1, rv);
  /* лёгкая альбедо-вариация (для ткани без фото образца): 0,94…1,0 вокруг среднего */
  const alb = new Uint8Array(N * N * 4);
  let mn = Infinity, mx = -Infinity; for (let i = 0; i < H.length; i++) { mn = Math.min(mn, H[i]); mx = Math.max(mx, H[i]); }
  const albAmp = { boucle: 0.16, chenille: 0.12, corduroy: 0.12, matting: 0.10, velour: 0.06, suede: 0.05, leather: 0.05 }[kind] || 0.06;
  for (let i = 0; i < H.length; i++) { const h = (H[i] - mn) / (mx - mn || 1); const v = 1 - albAmp + albAmp * h; const b = Math.round(v * 255); alb[i * 4] = b; alb[i * 4 + 1] = b; alb[i * 4 + 2] = b; alb[i * 4 + 3] = 255; }
  let mean = 0; for (let i = 0; i < H.length; i++) mean += alb[i * 4] / 255; mean /= H.length;
  const out = { normal: dataTex(nrm, N), rough: dataTex(rgh, N), albedo: dataTex(alb, N), albedoMean: mean };
  texCache.set(key, out);
  return out;
}

/* фото образца → высокочастотная яркость, среднее = 1 − amp/2 (умножается на цвет; цвет компенсируется) */
const swatchCache = new Map();
function swatchDetail(src) {
  if (swatchCache.has(src)) return swatchCache.get(src);
  const p = new Promise((resolve) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') return resolve(null);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, N, N);
        const d = g.getImageData(0, 0, N, N).data;
        const L = new Float32Array(N * N);
        for (let i = 0; i < N * N; i++) L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
        /* размытие (box 2 прохода, радиус 10) → high-pass */
        const blur = (src, r) => { const out = new Float32Array(N * N), tmp = new Float32Array(N * N); for (let y = 0; y < N; y++) { let s = 0; for (let x = -r; x <= r; x++) s += src[y * N + ((x + N) % N)]; for (let x = 0; x < N; x++) { tmp[y * N + x] = s / (2 * r + 1); s += src[y * N + ((x + r + 1) % N)] - src[y * N + ((x - r + N) % N)]; } } for (let x = 0; x < N; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[((y + N) % N) * N + x]; for (let y = 0; y < N; y++) { out[y * N + x] = s / (2 * r + 1); s += tmp[((y + r + 1) % N) * N + x] - tmp[((y - r + N) % N) * N + x]; } } return out; };
        const B = blur(blur(L, 10), 10);
        let sd = 0; for (let i = 0; i < N * N; i++) { const h = L[i] - B[i]; sd += h * h; } sd = Math.sqrt(sd / (N * N)) || 1;
        const amp = 0.06, base = 1 - amp; // значения 0,88…1,0, среднее 0,94
        const out = new Uint8Array(N * N * 4); let mean = 0;
        for (let i = 0; i < N * N; i++) { const h = Math.max(-2, Math.min(2, (L[i] - B[i]) / sd)) / 2; const v = base + amp * h; const b = Math.round(Math.max(0, Math.min(1, v)) * 255); out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = b; out[i * 4 + 3] = 255; mean += b / 255; }
        const t = dataTex(out, N); t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.repeat.set(1 / SWATCH_TILE, 1 / SWATCH_TILE);
        resolve({ tex: t, mean: mean / (N * N) });
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  swatchCache.set(src, p);
  return p;
}

const listeners = new Set();
/** вызывается, когда асинхронно подгрузилась деталь материала (фото образца) — перерисовать сцену */
export function onMaterialUpdate(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const notify = () => listeners.forEach((fn) => { try { fn(); } catch (e) { /* noop */ } });

const lighten = (c, k) => c.clone().lerp(new THREE.Color(1, 1, 1), k);
const matCache = new Map();
let defaultQuality = 'high';
export function setTextureQuality(q) { defaultQuality = q; }

export function fabricMaterial({ hex = '#E9E4DA', kind = 'velour', src450 = null, quality, collectionId = '' } = {}) {
  if (!KINDS.includes(kind)) kind = 'velour';
  const q = quality || defaultQuality;
  const N = q === 'high' ? 512 : 256;
  const key = `${hex}|${kind}|${src450 || ''}|${N}|${collectionId === 'vintazh' ? 'v' : ''}`;
  if (matCache.has(key)) return matCache.get(key);
  const k = KIND[kind];
  const maps = fabricMaps(kind, N);
  const base = new THREE.Color(hex);
  const m = new THREE.MeshPhysicalMaterial({
    color: base.clone().multiplyScalar(1 / maps.albedoMean),
    roughness: kind === 'leather' && collectionId === 'vintazh' ? 0.32 : k.rough,
    metalness: 0,
    sheen: k.sheen, sheenRoughness: k.sheenRough, sheenColor: lighten(base, k.sheenLift),
    normalMap: maps.normal, normalScale: new THREE.Vector2(k.nScale, k.nScale),
    roughnessMap: maps.rough, map: maps.albedo,
  });
  if (kind === 'leather') { m.clearcoat = k.clearcoat; m.clearcoatRoughness = k.clearcoatRough; m.specularIntensity = k.specular; }
  /* одинаковый масштаб фактуры: UV в метрах → повтор = 1 / размер плитки */
  for (const t of [maps.normal, maps.rough, maps.albedo]) t.repeat.set(1 / k.tile, 1 / k.tile);
  m.name = `fabric-${kind}-${hex}`;
  m.userData = { kind, hex, src450, baseColor: base.clone(), ready: Promise.resolve(m) };
  if (src450) {
    m.userData.ready = swatchDetail(src450).then((sw) => {
      if (sw) { m.map = sw.tex; m.color.copy(base).multiplyScalar(1 / sw.mean); m.needsUpdate = true; notify(); }
      return m;
    });
  }
  matCache.set(key, m);
  return m;
}

/* шов/строчка: тот же материал, цвет ×0,82, шероховатость +0,05 */
const seamCache = new WeakMap();
export function seamMaterial(fabric) {
  if (!fabric) return null;
  if (seamCache.has(fabric)) return seamCache.get(fabric);
  const s = fabric.clone();
  s.color = fabric.color.clone().multiplyScalar(0.82);
  if (s.sheenColor) s.sheenColor = fabric.sheenColor.clone().multiplyScalar(0.82);
  s.roughness = Math.min(1, fabric.roughness + 0.05);
  s.normalMap = null; s.map = null; s.roughnessMap = null;
  s.name = fabric.name + '-seam';
  seamCache.set(fabric, s);
  if (fabric.userData && fabric.userData.ready) fabric.userData.ready.then(() => { s.color.copy(fabric.color).multiplyScalar(0.82 * (fabric.map === null ? 1 : 0.94)); });
  return s;
}

/* ---------- дерево ---------- */
const WOOD = { oak: '#C8A57A', walnut: '#6B4A33', blackwood: '#2A2622' };
const woodCache = new Map();
function woodTextures(N) {
  const key = 'wood' + N;
  if (texCache.has(key)) return texCache.get(key);
  /* волокна вдоль U: кольца (полосы) с изгибами + мелкие поры */
  const col = new Uint8Array(N * N * 4), rgh = new Uint8Array(N * N * 4), H = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    const warp = 0.08 * fbm(u * 3, v * 6, 3, 31, 3) + 0.02 * tnoise(u * 2, v * 24, 2, 37);
    const ring = v * 14 + warp * 14;
    const fr = ring - Math.floor(ring);
    const late = Math.pow(Math.max(0, Math.sin(Math.PI * fr)), 6);
    const pores = tnoise(u * 160, v * 640, 160, 43);
    const fib = fbm(u * 8, v * 256, 8, 47, 3);
    const tone = 1 - 0.18 * late - 0.08 * fib - 0.06 * (pores > 0.82 ? 1 : 0);
    const i = (y * N + x) * 4;
    const b = Math.round(Math.max(0, Math.min(1, tone)) * 255);
    col[i] = col[i + 1] = col[i + 2] = b; col[i + 3] = 255;
    H[y * N + x] = 0.6 * late + 0.4 * fib - (pores > 0.82 ? 0.5 : 0);
  }
  const { nrm } = heightToTextures(H, N, 0.9, 0.55, 0.1);
  for (let i = 0; i < N * N; i++) { rgh[i * 4] = 255; rgh[i * 4 + 1] = Math.round((0.5 + 0.12 * (1 - col[i * 4] / 255)) * 255); rgh[i * 4 + 2] = 255; rgh[i * 4 + 3] = 255; }
  let mean = 0; for (let i = 0; i < N * N; i++) mean += col[i * 4] / 255; mean /= N * N;
  const out = { map: dataTex(col, N), rough: dataTex(rgh, N), normal: dataTex(nrm, N), mean };
  for (const t of [out.map, out.rough, out.normal]) t.repeat.set(1 / 0.45, 1 / 0.15); // плитка 45 × 15 см
  texCache.set(key, out);
  return out;
}
export function woodMaterial(tone = 'oak') {
  if (!WOOD[tone]) tone = 'oak';
  const N = defaultQuality === 'high' ? 1024 : 512;
  const key = tone + N;
  if (woodCache.has(key)) return woodCache.get(key);
  const t = woodTextures(N);
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(WOOD[tone]).multiplyScalar(1 / t.mean), map: t.map, roughnessMap: t.rough, roughness: 1,
    normalMap: t.normal, normalScale: new THREE.Vector2(0.25, 0.25), clearcoat: 0.1, clearcoatRoughness: 0.4, metalness: 0,
  });
  m.name = 'wood-' + tone; m.userData = { kind: 'wood', tone };
  woodCache.set(key, m);
  return m;
}

/* ---------- металл (шлифованный) ---------- */
const METAL = { black: '#2B2B2B', gold: '#B79A62' };
const metalCache = new Map();
function brushedTex(N) {
  const key = 'brushed' + N;
  if (texCache.has(key)) return texCache.get(key);
  const H = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) H[y * N + x] = tnoise(x / N * 4, y / N * 512, 4, 61) * 0.6 + tnoise(x / N * 2, y / N * 128, 2, 67) * 0.4;
  const { nrm, rgh } = heightToTextures(H, N, 0.6, 0.32, 0.12);
  const out = { normal: dataTex(nrm, N), rough: dataTex(rgh, N) };
  for (const t of [out.normal, out.rough]) t.repeat.set(1 / 0.2, 1 / 0.2);
  texCache.set(key, out);
  return out;
}
export function metalMaterial(finish = 'black') {
  if (!METAL[finish]) finish = 'black';
  if (metalCache.has(finish)) return metalCache.get(finish);
  const t = brushedTex(256);
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(METAL[finish]), metalness: 1, roughness: 1, roughnessMap: t.rough,
    normalMap: t.normal, normalScale: new THREE.Vector2(0.15, 0.15), anisotropy: 0.6, anisotropyRotation: Math.PI / 2,
  });
  if (finish === 'black') { m.metalness = 0.85; }
  m.name = 'metal-' + finish; m.userData = { kind: 'metal', finish };
  metalCache.set(finish, m);
  return m;
}

/* ---------- камень (вид) ---------- */
const STONE = { light: '#ECE9E4', grey: '#9C9A95', dark: '#2E2D2B' };
const stoneCache = new Map();
function stoneTextures(N, tone) {
  const key = 'stone' + N + tone;
  if (texCache.has(key)) return texCache.get(key);
  const col = new Uint8Array(N * N * 4);
  const dark = tone === 'dark';
  let mean = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    const w = fbm(u * 3, v * 3, 3, 71, 5);
    const vein = Math.abs(Math.sin((u * 2.2 + v * 1.1 + w * 2.6) * Math.PI * 2));
    const fine = Math.abs(Math.sin((u * 5.0 - v * 3.0 + fbm(u * 6, v * 6, 6, 73, 4) * 3.0) * Math.PI * 2));
    const vv = Math.pow(1 - vein, 18) * 0.55 + Math.pow(1 - fine, 40) * 0.3;
    const cloud = (fbm(u * 8, v * 8, 8, 79, 4) - 0.5) * 0.08;
    let t = dark ? 1 + vv * 1.8 + cloud : 1 - vv * 0.55 + cloud;
    t = Math.max(0, Math.min(dark ? 2.5 : 1, t));
    const b = Math.round(Math.min(1, t / (dark ? 2.5 : 1)) * 255);
    const i = (y * N + x) * 4; col[i] = col[i + 1] = col[i + 2] = b; col[i + 3] = 255; mean += b / 255;
  }
  mean /= N * N;
  const out = { map: dataTex(col, N), mean };
  out.map.repeat.set(1 / 1.2, 1 / 1.2);
  texCache.set(key, out);
  return out;
}
export function stoneMaterial(tone = 'light') {
  if (!STONE[tone]) tone = 'light';
  if (stoneCache.has(tone)) return stoneCache.get(tone);
  const t = stoneTextures(defaultQuality === 'high' ? 1024 : 512, tone);
  const c = new THREE.Color(STONE[tone]).multiplyScalar(1 / t.mean);
  const m = new THREE.MeshPhysicalMaterial({ color: c, map: t.map, roughness: 0.25, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.2 });
  m.name = 'stone-' + tone; m.userData = { kind: 'stone', tone };
  stoneCache.set(tone, m);
  return m;
}

/* ---------- матрас: белый чехол, стёжка ромбом 8 см ---------- */
let mattressMat = null;
export function mattressMaterial() {
  if (mattressMat) return mattressMat;
  const N = 256, H = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N * 2, v = y / N * 2; // 2 ромба на плитку
    const a = Math.abs(((u + v) % 1 + 1) % 1 - 0.5), b = Math.abs(((u - v) % 1 + 1) % 1 - 0.5);
    const line = Math.min(a, b);
    H[y * N + x] = Math.min(1, line * 8) * 0.9 + 0.1 * fbm(x / N * 64, y / N * 64, 64, 83, 2);
  }
  const { nrm } = heightToTextures(H, N, 3, 0.9, 0);
  const normal = dataTex(nrm, N); normal.repeat.set(1 / 0.16, 1 / 0.16);
  mattressMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#F2F1EC'), roughness: 0.9, sheen: 0.3, sheenRoughness: 0.8, sheenColor: new THREE.Color('#FFFFFF'), normalMap: normal, normalScale: new THREE.Vector2(0.8, 0.8) });
  mattressMat.name = 'mattress'; mattressMat.userData = { kind: 'mattress' };
  return mattressMat;
}

/* набор материалов для build(): cfg = { type, params, fabric: { hex, kind, src450, typeId, collectionId } } */
export function materialSet(cfg = {}) {
  const type = cfg.type || 'sofa';
  const p = normalize(type, cfg.params || {});
  const f = cfg.fabric || {};
  const kind = f.kind && KINDS.includes(f.kind) ? f.kind : kindOf(f.typeId, f.collectionId);
  const fabric = fabricMaterial({ hex: f.hex || '#E9E4DA', kind, src450: f.src450 || null, quality: cfg.quality, collectionId: f.collectionId || '' });
  let legs;
  const fin = p.legFinish;
  if (type === 'bed') legs = p.base === 'legs' ? woodMaterial(WOOD[fin] ? fin : 'oak') : metalMaterial('black');
  else if (p.legs === 'metal') legs = metalMaterial(METAL[fin] ? fin : 'black');
  else if (p.legs === 'wood') legs = woodMaterial(WOOD[fin] ? fin : 'oak');
  else legs = metalMaterial('black');
  let top = null;
  if (type === 'table') top = p.top === 'stone' ? stoneMaterial(STONE[p.topTone] ? p.topTone : 'light') : woodMaterial(WOOD[p.topTone] ? p.topTone : 'oak');
  return { fabric, legs, top, mattress: mattressMaterial() };
}
