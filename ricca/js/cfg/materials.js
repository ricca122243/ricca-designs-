/* RICCA · конструктор — материалы (MeshPhysicalMaterial). Цвет ткани = hex образца (sRGB → линейный через ColorManagement).
   Фактура: процедурные бесшовные карты нормалей и шероховатости по виду ткани (генерируются один раз и кешируются),
   цвет и рисунок — настоящее фото образца (src450 → бесшовная плитка без студийного света и складок, swatchAlbedo).
   UV у всех деталей — в метрах (furniture3d.js), поэтому масштаб фактуры одинаков на любом размере изделия. */
import * as THREE from 'three';
import { normalize } from './params.js';

export const KINDS = ['velour', 'corduroy', 'boucle', 'chenille', 'matting', 'suede', 'leather'];

/* параметры по виду (§8.1): шероховатость, блеск ворса, карта нормалей (сила, размер плитки в м) */
const KIND = {
  velour: { rough: 0.88, sheen: 1.0, sheenRough: 0.30, sheenLift: 0.25, nScale: 0.20, tile: 0.06 },
  corduroy: { rough: 0.84, sheen: 0.9, sheenRough: 0.35, sheenLift: 0.20, nScale: 1.0, tile: 0.04 },
  boucle: { rough: 0.97, sheen: 0.18, sheenRough: 0.80, sheenLift: 0.08, nScale: 1.0, tile: 0.08 },   // рельеф петель — в основном с фото (swatchAlbedo)
  chenille: { rough: 0.88, sheen: 0.6, sheenRough: 0.50, sheenLift: 0.15, nScale: 0.5, tile: 0.06 },
  matting: { rough: 0.92, sheen: 0.15, sheenRough: 0.70, sheenLift: 0.05, nScale: 0.6, tile: 0.05 },
  suede: { rough: 0.86, sheen: 0.5, sheenRough: 0.60, sheenLift: 0.12, nScale: 0.15, tile: 0.06 },
  leather: { rough: 0.5, sheen: 0.15, sheenRough: 0.4, sheenLift: 0.05, nScale: 0.6, tile: 0.10, clearcoat: 0.12, clearcoatRough: 0.45, specular: 0.45 },
};

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
  t.generateMipmaps = true; t.anisotropy = 16; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true;
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
      const c = Math.pow(Math.abs(Math.sin(Math.PI * (v * cords + 0.25 * tnoise(u * 12, v * 12, 12, 7)))), 1.4);
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
    /* «комки» пряжи 2–3 см (4 цикла на плитку 8 см) — рельеф, который не исчезает в мипах на расстоянии всего дивана */
    for (let i = 0; i < N * N; i++) { const u = (i % N) / N, v = Math.floor(i / N) / N; H[i] = 0.15 * fbm(u * 64, v * 64, 64, 21, 2) + 0.35 * fbm(u * 4, v * 4, 4, 25, 3); }
    const pxPerM = N / 0.08; // плитка 8 см
    /* крупные петли 6–10 мм — второй слой, реже */
    const big = Math.round(N * N / 900);
    for (let k = 0; k < big; k++) {
      const cx = rnd() * N, cy = rnd() * N, r = (0.003 + rnd() * 0.002) * pxPerM, tw = r * 0.3, amp = 0.8 + rnd() * 0.5, ex = 0.75 + rnd() * 0.5;
      const R = Math.ceil(r + tw * 2.5);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const t = (Math.hypot(dx * ex, dy / ex) - r) / tw; if (t > 2.5 || t < -2.5) continue;
        const x = ((Math.round(cx + dx) % N) + N) % N, y = ((Math.round(cy + dy) % N) + N) % N;
        H[y * N + x] = Math.max(H[y * N + x], amp * Math.exp(-t * t) + 0.2);
      }
    }
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
      /* + мягкие складки «в руке» (3 цикла на 10 см) — видны и на расстоянии */
      H[y * N + x] = Math.sqrt(edge) * 0.85 + 0.15 * fbm(u * 32, v * 32, 32, 41, 3) + 0.25 * fbm(u * 3, v * 3, 3, 45, 3);
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
  const { nrm, rgh } = heightToTextures(H, N, { boucle: 5, corduroy: 3.5, chenille: 1.8, matting: 2.6, leather: 2.2, velour: 1.6, suede: 1.2 }[kind] || 2, 1, rv);
  /* лёгкая альбедо-вариация (для ткани без фото образца): 0,94…1,0 вокруг среднего */
  const alb = new Uint8Array(N * N * 4);
  let mn = Infinity, mx = -Infinity; for (let i = 0; i < H.length; i++) { mn = Math.min(mn, H[i]); mx = Math.max(mx, H[i]); }
  const albAmp = { boucle: 0.28, chenille: 0.12, corduroy: 0.14, matting: 0.10, velour: 0.06, suede: 0.05, leather: 0.05 }[kind] || 0.06;
  for (let i = 0; i < H.length; i++) { const h = (H[i] - mn) / (mx - mn || 1); const v = 1 - albAmp + albAmp * h; const b = Math.round(v * 255); alb[i * 4] = b; alb[i * 4 + 1] = b; alb[i * 4 + 2] = b; alb[i * 4 + 3] = 255; }
  let mean = 0; for (let i = 0; i < H.length; i++) mean += alb[i * 4] / 255; mean /= H.length;
  const out = { normal: dataTex(nrm, N), rough: dataTex(rgh, N), albedo: dataTex(alb, N), albedoMean: mean };
  texCache.set(key, out);
  return out;
}

/* фото образца → цветная бесшовная плитка (albedo, sRGB). Официальные фото — крупный план со складками и студийным светом:
   свет и складки убираем (делим на сильно размытую яркость — остаётся ровная ткань своего цвета), края сшиваем смешиванием
   с копией, сдвинутой на полплитки (без зеркал и швов). Размер плитки на изделии — PHOTO_TILE (м) по виду ткани. */
/* по фото: у букле в кадре ~65 петель по 3–4 мм → плитка ~22 см; меньше — петли мельче настоящих и видна «сетка» повторов */
const PHOTO_TILE = { boucle: 0.22, chenille: 0.2, matting: 0.18, corduroy: 0.18, velour: 0.25, suede: 0.25, leather: 0.22 };
/* радиус «выравнивания света» (доля плитки): у гладких тканей (велюр, замша, кожа) на фото — складки, их убираем сильнее;
   у букле, шенилла, рогожки крупные петли и плетение — часть ткани, их оставляем */
const PHOTO_FLAT = { boucle: 1 / 10, chenille: 1 / 12, matting: 1 / 12, corduroy: 1 / 16, velour: 1 / 32, suede: 1 / 32, leather: 1 / 32 };
const albedoCache = new Map();
/* расчёт плитки по пикселям (d — RGBA N×N) → RGBA N×N. Чистая функция: выполняется в фоновом потоке (Worker), чтобы выбор ткани
   не «замораживал» страницу (на телефоне это было 0,5–2 с на каждое нажатие) */
function albedoPixels(d, N, flat) {
  const L = new Float32Array(N * N);
  let Lm = 0; for (let i = 0; i < N * N; i++) { L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2] + 1; Lm += L[i]; }
  Lm /= N * N;
  const rf = (i) => (i < 0 ? -i - 1 : i >= N ? 2 * N - i - 1 : i);
  const blur = (a, r) => { const tmp = new Float32Array(N * N), out = new Float32Array(N * N), k = 1 / (2 * r + 1); for (let y = 0; y < N; y++) { let s = 0; for (let j = -r; j <= r; j++) s += a[y * N + rf(j)]; for (let x = 0; x < N; x++) { tmp[y * N + x] = s * k; s += a[y * N + rf(x + r + 1)] - a[y * N + rf(x - r)]; } } for (let x = 0; x < N; x++) { let s = 0; for (let j = -r; j <= r; j++) s += tmp[rf(j) * N + x]; for (let y = 0; y < N; y++) { out[y * N + x] = s * k; s += tmp[rf(y + r + 1) * N + x] - tmp[rf(y - r) * N + x]; } } return out; };
  const r = Math.max(2, Math.round(N * flat)), B = blur(blur(L, r), r);   // свет и складки (низкие частоты)
  const F = new Float32Array(N * N * 3);
  /* гладкие ткани (велюр, замша, кожа): в складках у них меняется и оттенок (ворс ложится по-разному) — цвет берём средний
     по всему фото, с фото — только фактура поверхности (яркость мелкого масштаба) */
  const smooth = flat < 1 / 24, M = [0, 0, 0];
  if (smooth) { for (let i = 0; i < N * N; i++) { M[0] += d[i * 4]; M[1] += d[i * 4 + 1]; M[2] += d[i * 4 + 2]; } M[0] /= N * N; M[1] /= N * N; M[2] /= N * N; }
  for (let i = 0; i < N * N; i++) {
    if (smooth) { const t = Math.max(0.7, Math.min(1.3, L[i] / B[i])); F[i * 3] = M[0] * t; F[i * 3 + 1] = M[1] * t; F[i * 3 + 2] = M[2] * t; continue; }
    const k = Math.max(0.5, Math.min(2, Lm / B[i])); F[i * 3] = d[i * 4] * k; F[i * 3 + 1] = d[i * 4 + 1] * k; F[i * 3 + 2] = d[i * 4 + 2] * k;
  }
  const tent = (i) => 1 - Math.abs((2 * (i + 0.5)) / N - 1);
  const out = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, w = Math.min(1, Math.min(tent(x), tent(y)) * 2.2), j = ((y + N / 2) % N) * N + ((x + N / 2) % N);
    for (let ch = 0; ch < 3; ch++) out[i * 4 + ch] = Math.max(0, Math.min(255, Math.round(w * F[i * 3 + ch] + (1 - w) * F[j * 3 + ch])));
    out[i * 4 + 3] = 255;
  }
  return out;
}
let albWorker = null, albSeq = 0;
const albJobs = new Map();
function albedoAsync(d, N, flat) {
  if (!albWorker && typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
    try {
      const code = `${albedoPixels.toString()}\nonmessage = (e) => { const { id, buf, N, flat } = e.data; const out = albedoPixels(new Uint8ClampedArray(buf), N, flat); postMessage({ id, buf: out.buffer }, [out.buffer]); };`;
      albWorker = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
      albWorker.onmessage = (e) => { const j = albJobs.get(e.data.id); albJobs.delete(e.data.id); if (j) j(new Uint8Array(e.data.buf)); };
      albWorker.onerror = () => { albWorker = false; albJobs.forEach((j) => j(null)); albJobs.clear(); };
    } catch (e) { albWorker = false; }
  }
  if (!albWorker) return Promise.resolve(albedoPixels(d, N, flat));   // без Worker — как раньше, в основном потоке
  return new Promise((res) => { const id = ++albSeq; albJobs.set(id, res); const buf = d.buffer.slice(0); albWorker.postMessage({ id, buf, N, flat }, [buf]); })
    .then((out) => out || albedoPixels(d, N, flat));
}
function swatchAlbedo(src, tile = 0.16, N = 384, flat = 1 / 10) {
  const ck = `${src}|${tile}|${N}|${flat}`;
  if (albedoCache.has(ck)) return albedoCache.get(ck);
  const p = new Promise((resolve) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') return resolve(null);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = N;
        const g = c.getContext('2d', { willReadFrequently: true });
        const cw = img.naturalWidth || img.width, chh = img.naturalHeight || img.height, cs = Math.min(cw, chh) * 0.7;   // центр 70 %: без краёв кадра
        g.drawImage(img, (cw - cs) / 2, (chh - cs) / 2, cs, cs, 0, 0, N, N);
        const d = g.getImageData(0, 0, N, N).data;
        albedoAsync(d, N, flat).then((out) => {
          const t = dataTex(out, N, true); t.repeat.set(1 / tile, 1 / tile);
          resolve({ tex: t });
        }).catch(() => resolve(null));
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  albedoCache.set(ck, p);
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

/* экокожа: отделка цвета (js/fabrics-data.js → colours[].finish) меняет зерно и лак */
const LEATHER_FINISH = {
  'гладкая': { rough: 0.45, nScale: 0.25, clearcoat: 0.18, clearcoatRough: 0.3 },
  'зернистая': { rough: 0.5, nScale: 0.9, clearcoat: 0.12, clearcoatRough: 0.45 },
  'винтаж': { rough: 0.6, nScale: 0.6, clearcoat: 0.04, clearcoatRough: 0.55, albAmp: 0.08 },
};
export function fabricMaterial({ hex = '#E9E4DA', kind = 'velour', src450 = null, src900 = null, quality, collectionId = '', finish = '' } = {}) {
  if (!KINDS.includes(kind)) kind = 'velour';
  const q = quality || defaultQuality;
  const N = q === 'high' ? 256 : 128;   // процедурный рельеф: подробность даёт фото ткани; 512 строился ~0,6 с и «замораживал» страницу
  const fin = kind === 'leather' ? (LEATHER_FINISH[String(finish).toLowerCase()] ? String(finish).toLowerCase() : (collectionId === 'vintazh' ? 'винтаж' : '')) : '';
  /* фото ткани: компьютер — 1400 px (src900) в плитку 1024, телефон — 700 px (src450) в 512, «Моя комната» на телефоне — 256 */
  const photo = q === 'high' ? src900 || src450 : src450 || src900, PN = q === 'high' ? 1024 : q === 'mid' ? 512 : 256;
  const key = `${hex}|${kind}|${photo || ''}|${N}|${fin}`;
  if (matCache.has(key)) return matCache.get(key);
  const k = fin ? { ...KIND[kind], ...LEATHER_FINISH[fin] } : KIND[kind];
  const maps = fabricMaps(kind, N);
  const base = new THREE.Color(hex);
  const m = new THREE.MeshPhysicalMaterial({
    color: base.clone().multiplyScalar(1 / maps.albedoMean),
    roughness: k.rough,
    metalness: 0,
    sheen: k.sheen, sheenRoughness: k.sheenRough, sheenColor: lighten(base, k.sheenLift),
    normalMap: maps.normal, normalScale: new THREE.Vector2(k.nScale, k.nScale),
    roughnessMap: maps.rough, map: maps.albedo,
  });
  if (kind === 'leather') { m.clearcoat = k.clearcoat; m.clearcoatRoughness = k.clearcoatRough; m.specularIntensity = k.specular; }
  else m.specularIntensity = kind === 'velour' || kind === 'suede' ? 0.25 : 0.4;   // ткань не бликует как пластик: свет даёт ворс (sheen)
  /* одинаковый масштаб фактуры: UV в метрах → повтор = 1 / размер плитки */
  for (const t of [maps.normal, maps.rough, maps.albedo]) t.repeat.set(1 / k.tile, 1 / k.tile);
  m.name = `fabric-${kind}-${hex}`;
  m.userData = { kind, hex, src450, finish: fin, baseColor: base.clone(), ready: Promise.resolve(m) };
  /* ткань на модели — настоящее фото образца (цвет, плетение, рисунок), а не заливка цветом: заказчик «ткань в 3D не видна» */
  if (photo) {
    m.userData.ready = swatchAlbedo(photo, PHOTO_TILE[kind] || 0.16, PN, PHOTO_FLAT[kind] || 1 / 10).then((sw) => {
      if (sw) { m.map = sw.tex; m.color.setRGB(1, 1, 1); m.needsUpdate = true; notify(); }
      return m;
    });
  }
  matCache.set(key, m);
  return m;
}

/* шов/строчка: тот же материал, цвет ×0,9, шероховатость +0,05 (рисуется только вблизи — stage.js) */
const seamCache = new WeakMap();
export function seamMaterial(fabric) {
  if (!fabric) return null;
  if (seamCache.has(fabric)) return seamCache.get(fabric);
  const s = fabric.clone();
  s.color = fabric.color.clone().multiplyScalar(0.9);
  if (s.sheenColor) s.sheenColor = fabric.sheenColor.clone().multiplyScalar(0.9);
  s.roughness = Math.min(1, fabric.roughness + 0.05);
  s.normalMap = null; s.roughnessMap = null;   // фото ткани остаётся (иначе при белом цвете материала шов был бы белым)
  s.name = fabric.name + '-seam';
  seamCache.set(fabric, s);
  if (fabric.userData && fabric.userData.ready) fabric.userData.ready.then(() => { s.map = fabric.map; s.color.copy(fabric.color).multiplyScalar(0.85); s.needsUpdate = true; });
  return s;
}

/* кант: та же ткань (цвет, фото, карта нормалей — не «пластиковая» трубка), рельеф вдвое мягче */
const pipeCache = new WeakMap();
export function pipingMaterial(fabric) {
  if (!fabric) return null;
  if (pipeCache.has(fabric)) return pipeCache.get(fabric);
  const s = fabric.clone();
  if (s.normalScale) s.normalScale = fabric.normalScale.clone().multiplyScalar(0.5); s.roughness = Math.min(1, fabric.roughness + 0.05);
  s.sheenRoughness = Math.min(1, (fabric.sheenRoughness || 0.5) + 0.2);
  s.name = fabric.name + '-piping';
  pipeCache.set(fabric, s);
  if (fabric.userData && fabric.userData.ready) fabric.userData.ready.then(() => { s.map = fabric.map; s.color.copy(fabric.color); s.needsUpdate = true; });
  return s;
}

/* ---------- дерево ---------- */
const WOOD = { oak: '#C9AE87', walnut: '#5E4330', blackwood: '#2A2622' };
const woodCache = new Map();
function woodTextures(N) {
  const key = 'wood' + N;
  if (texCache.has(key)) return texCache.get(key);
  /* волокна вдоль U: кольца (полосы) с изгибами + мелкие поры */
  const col = new Uint8Array(N * N * 4), rgh = new Uint8Array(N * N * 4), H = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    const warp = 0.08 * fbm(u * 3, v * 6, 3, 31, 3) + 0.02 * tnoise(u * 2, v * 24, 2, 37);
    const ring = v * 8 + warp * 8;
    const fr = ring - Math.floor(ring);
    const late = Math.pow(Math.max(0, Math.sin(Math.PI * fr)), 6);
    const pores = tnoise(u * 160, v * 640, 160, 43);
    const fib = fbm(u * 8, v * 256, 8, 47, 3);
    const tone = 1 - 0.30 * late - 0.12 * fib - 0.06 * (pores > 0.82 ? 1 : 0);
    const i = (y * N + x) * 4;
    const b = Math.round(Math.max(0, Math.min(1, tone)) * 255);
    col[i] = col[i + 1] = col[i + 2] = b; col[i + 3] = 255;
    H[y * N + x] = 0.6 * late + 0.4 * fib - (pores > 0.82 ? 0.5 : 0);
  }
  const { nrm } = heightToTextures(H, N, 0.9, 0.55, 0.1);
  for (let i = 0; i < N * N; i++) { rgh[i * 4] = 255; rgh[i * 4 + 1] = Math.round((0.5 + 0.12 * (1 - col[i * 4] / 255)) * 255); rgh[i * 4 + 2] = 255; rgh[i * 4 + 3] = 255; }
  let mean = 0; for (let i = 0; i < N * N; i++) mean += col[i * 4] / 255; mean /= N * N;
  const out = { map: dataTex(col, N), rough: dataTex(rgh, N), normal: dataTex(nrm, N), mean };
  for (const t of [out.map, out.rough, out.normal]) t.repeat.set(1 / 0.9, 1 / 0.25); // плитка 90 × 25 см — крупный рисунок не теряется в мипах
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
    normalMap: t.normal, normalScale: new THREE.Vector2(0.4, 0.4), clearcoat: 0.25, clearcoatRoughness: 0.35, metalness: 0,
  });
  m.name = 'wood-' + tone; m.userData = { kind: 'wood', tone };
  woodCache.set(key, m);
  return m;
}

/* ---------- металл (шлифованный) ---------- */
const METAL = { black: '#1E1E1E', gold: '#D2B07A' };
const metalCache = new Map();
/* у металла своя сила отражений: без собственной envMap three берёт scene.environmentIntensity (0,55) — stage.js передаёт студию сюда */
let envTex = null;
export function setEnvMap(tex) { envTex = tex; metalCache.forEach((m) => { m.envMap = tex; m.needsUpdate = true; }); }
function brushedTex(N, roughBase = 0.32) {
  const key = 'brushed' + N + roughBase;
  if (texCache.has(key)) return texCache.get(key);
  const H = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) H[y * N + x] = tnoise(x / N * 4, y / N * 512, 4, 61) * 0.6 + tnoise(x / N * 2, y / N * 128, 2, 67) * 0.4;
  const { nrm, rgh } = heightToTextures(H, N, 0.6, roughBase, 0.12);
  const out = { normal: dataTex(nrm, N), rough: dataTex(rgh, N) };
  for (const t of [out.normal, out.rough]) t.repeat.set(1 / 0.2, 1 / 0.2);
  texCache.set(key, out);
  return out;
}
export function metalMaterial(finish = 'black') {
  if (!METAL[finish]) finish = 'black';
  if (metalCache.has(finish)) return metalCache.get(finish);
  const t = brushedTex(256, finish === 'gold' ? 0.22 : 0.35);
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(METAL[finish]), metalness: 1, roughness: 1, roughnessMap: t.rough,
    normalMap: t.normal, normalScale: new THREE.Vector2(0.15, 0.15), anisotropy: 0.6, anisotropyRotation: Math.PI / 2,
  });
  if (finish === 'black') { m.metalness = 0.85; }
  m.envMapIntensity = finish === 'gold' ? 1.8 : 1.4;   // металл живёт отражениями студии
  if (envTex) m.envMap = envTex;
  m.name = 'metal-' + finish; m.userData = { kind: 'metal', finish };
  metalCache.set(finish, m);
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
  mattressMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#F2F1EC'), roughness: 0.9, sheen: 0.3, sheenRoughness: 0.8, sheenColor: new THREE.Color('#FFFFFF'), normalMap: normal, normalScale: new THREE.Vector2(0.25, 0.25) });
  mattressMat.name = 'mattress'; mattressMat.userData = { kind: 'mattress' };
  return mattressMat;
}

/* набор материалов для build(): cfg = { type, params, fabric: { hex, kind, src450, typeId, collectionId } } */
export function materialSet(cfg = {}) {
  const type = cfg.type || 'sofa';
  const p = normalize(type, cfg.params || {});
  const f = cfg.fabric || {};
  const kind = f.kind && KINDS.includes(f.kind) ? f.kind : kindOf(f.typeId, f.collectionId);
  const fabric = fabricMaterial({ hex: f.hex || '#E9E4DA', kind, src450: f.src450 || null, src900: f.src900 || null, quality: cfg.quality, collectionId: f.collectionId || '', finish: f.finish || '' });
  let legs;
  const fin = p.legFinish;
  if (type === 'bed') legs = p.base === 'legs' ? woodMaterial(WOOD[fin] ? fin : 'oak') : metalMaterial('black');
  else if (p.legs === 'metal') legs = metalMaterial(METAL[fin] ? fin : 'black');
  else if (p.legs === 'wood') legs = woodMaterial(WOOD[fin] ? fin : 'oak');
  else legs = metalMaterial('black');
  return { fabric, legs, top: null, mattress: mattressMaterial() };
}
