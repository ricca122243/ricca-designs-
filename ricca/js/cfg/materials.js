/* RICCA · конструктор — материалы (MeshPhysicalMaterial). Цвет ткани = hex образца (sRGB → линейный через ColorManagement).
   Фактура: процедурные бесшовные карты нормалей и шероховатости по виду ткани (генерируются один раз и кешируются),
   цвет и рисунок — настоящее фото образца (src450 → бесшовная плитка без студийного света и складок, swatchAlbedo).
   UV у всех деталей — в метрах (furniture3d.js), поэтому масштаб фактуры одинаков на любом размере изделия. */
import * as THREE from 'three';
import { normalize } from './params.js';

export const KINDS = ['velour', 'corduroy', 'boucle', 'chenille', 'matting', 'suede', 'leather'];

/* параметры по виду (§8.1): шероховатость, блеск ворса, карта нормалей (сила, размер плитки в м) */
const KIND = {
  velour: { rough: 0.9, sheen: 0.9, sheenRough: 0.38, sheenLift: 0.22, nScale: 0.20, tile: 0.06 },
  corduroy: { rough: 0.84, sheen: 0.9, sheenRough: 0.35, sheenLift: 0.20, nScale: 1.0, tile: 0.04 },
  boucle: { rough: 0.97, sheen: 0.2, sheenRough: 0.85, sheenLift: 0.08, nScale: 0.55, tile: 0.08 },   // рельеф петель — в основном с фото (swatchAlbedo)
  chenille: { rough: 0.88, sheen: 0.6, sheenRough: 0.50, sheenLift: 0.15, nScale: 0.5, tile: 0.06 },
  matting: { rough: 0.92, sheen: 0.15, sheenRough: 0.70, sheenLift: 0.05, nScale: 0.6, tile: 0.05 },
  suede: { rough: 0.9, sheen: 0.45, sheenRough: 0.65, sheenLift: 0.12, nScale: 0.15, tile: 0.06 },
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
      /* велюр: очень слабый направленный ворс (линии не должны читаться как вельвет) + «пятна» примятого ворса */
      if (kind === 'velour') h += 0.12 * tnoise(u * 6, v * 160, 6, 9) + 0.4 * fbm(u * 6, v * 6, 6, 5, 3);
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
  const out = { normal: dataTex(nrm, N), rough: dataTex(rgh, N), albedo: dataTex(alb, N), albedoMean: mean, H, N };
  texCache.set(key, out);
  return out;
}
/* рельеф из фото образца (swatchPixels): вес фото / процедурного слоя, сила нормалей, шероховатость по высоте.
   Фактурные ткани — рельеф в основном с фото (петли, узелки, плетение совпадают с рисунком цвета);
   гладкие (велюр, замша, кожа) — в основном процедурный ворс/зерно, с фото лишь мелкое зерно */
const PHOTO_RELIEF = {
  boucle: { wPhoto: 1.0, wProc: 0.3, strength: 2.4, roughBase: 0.95, roughVar: 0.12 },
  chenille: { wPhoto: 1.0, wProc: 0.45, strength: 1.7, roughBase: 0.88, roughVar: 0.12 },
  matting: { wPhoto: 1.0, wProc: 0.5, strength: 2.0, roughBase: 0.92, roughVar: 0.08 },
  corduroy: { wPhoto: 0.6, wProc: 1.0, strength: 2.4, roughBase: 0.84, roughVar: 0.1 },
  velour: { wPhoto: 0.35, wProc: 1.0, strength: 0.8, roughBase: 0.9, roughVar: 0.06 },
  suede: { wPhoto: 0.3, wProc: 1.0, strength: 0.6, roughBase: 0.9, roughVar: 0.05 },
  leather: { wPhoto: 0.5, wProc: 1.0, strength: 1.3, roughBase: 0.5, roughVar: 0.15 },
};

/* фото образца → цветная бесшовная плитка (albedo, sRGB). Официальные фото — крупный план со складками и студийным светом:
   свет и складки убираем (делим на сильно размытую яркость — остаётся ровная ткань своего цвета), края сшиваем смешиванием
   с копией, сдвинутой на полплитки (без зеркал и швов). Размер плитки на изделии — PHOTO_TILE (м) по виду ткани. */
/* по фото: у букле в кадре ~65 петель по 3–4 мм → плитка ~22 см; меньше — петли мельче настоящих и видна «сетка» повторов */
const PHOTO_TILE = { boucle: 0.22, chenille: 0.2, matting: 0.18, corduroy: 0.18, velour: 0.25, suede: 0.25, leather: 0.22 };
/* радиус «выравнивания света» (доля плитки): у гладких тканей (велюр, замша, кожа) на фото — складки, их убираем сильнее;
   у букле, шенилла, рогожки крупные петли и плетение — часть ткани, их оставляем */
/* фактурные — окно 1/16 плитки (~1,4 см): остаточный градиент света крупнее этого давал «клетку» на диване (стык копий плитки) */
const PHOTO_FLAT = { boucle: 1 / 16, chenille: 1 / 16, matting: 1 / 16, corduroy: 1 / 18, velour: 1 / 32, suede: 1 / 32, leather: 1 / 32 };
const albedoCache = new Map();
/* расчёт плитки по пикселям (d — RGBA N×N) → { alb, nrm, rgh } (RGBA N×N каждая). Чистая функция: выполняется в фоновом
   потоке (Worker), чтобы выбор ткани не «замораживал» страницу (на телефоне это было 0,5–2 с на каждое нажатие).
   Рельеф (карта нормалей и шероховатость) считается ИЗ ТОГО ЖЕ ФОТО: мелкомасштабная яркость ≈ высота (петли букле, узелки
   шенилла, плетение рогожки на свету светлее) + процедурный ворс/зерно (o.procH, плитка повторяется o.rep раз) —
   так рельеф совпадает с рисунком цвета, и петли читаются как петли, а не как «апельсиновая корка» поверх фото.
   o = { procH: Float32Array M×M, M, rep, wPhoto, wProc, strength, roughBase, roughVar } (без o — только альбедо) */
function swatchPixels(d, N, flat, o) {
  const L = new Float32Array(N * N);
  let Lm = 0; for (let i = 0; i < N * N; i++) { L[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2] + 1; Lm += L[i]; }
  Lm /= N * N;
  const rf = (i) => (i < 0 ? -i - 1 : i >= N ? 2 * N - i - 1 : i);
  const blur = (a, r) => { const tmp = new Float32Array(N * N), out = new Float32Array(N * N), k = 1 / (2 * r + 1); for (let y = 0; y < N; y++) { let s = 0; for (let j = -r; j <= r; j++) s += a[y * N + rf(j)]; for (let x = 0; x < N; x++) { tmp[y * N + x] = s * k; s += a[y * N + rf(x + r + 1)] - a[y * N + rf(x - r)]; } } for (let x = 0; x < N; x++) { let s = 0; for (let j = -r; j <= r; j++) s += tmp[rf(j) * N + x]; for (let y = 0; y < N; y++) { out[y * N + x] = s * k; s += tmp[rf(y + r + 1) * N + x] - tmp[rf(y - r) * N + x]; } } return out; };
  const r = Math.max(2, Math.round(N * flat)), B = blur(blur(L, r), r);   // свет и складки (низкие частоты)
  /* гладкие ткани (велюр, замша, кожа): в складках у них меняется и оттенок (ворс ложится по-разному) — цвет берём средний
     по всему фото, с фото — только самое мелкое зерно (≤ 1,5 мм: окно N/160), иначе рёбра складок фото ложатся на диван
     диагональными «царапинами» */
  const smooth = flat < 1 / 24, M = [0, 0, 0];
  /* складки среднего масштаба (ребро «вихря» на фото образца ~1 см) у фактурных тканей: вторая, более узкая выравнивающая
     маска — остаётся только плетение/петли (≤ 5 мм); сила ограничена, чтобы не «стереть» рисунок ткани */
  const r2 = Math.max(2, Math.round(N / (smooth ? 160 : 56))), B2 = blur(blur(L, r2), r2);
  const F = new Float32Array(N * N * 3), Hp = new Float32Array(N * N);
  if (smooth) { for (let i = 0; i < N * N; i++) { M[0] += d[i * 4]; M[1] += d[i * 4 + 1]; M[2] += d[i * 4 + 2]; } M[0] /= N * N; M[1] /= N * N; M[2] /= N * N; }
  const lim = smooth ? 0.07 : 0.3;
  for (let i = 0; i < N * N; i++) {
    const q = L[i] / B2[i];
    Hp[i] = Math.max(-0.5, Math.min(0.5, q - 1));
    if (smooth) { const t = Math.max(1 - lim, Math.min(1 + lim, q)); F[i * 3] = M[0] * t; F[i * 3 + 1] = M[1] * t; F[i * 3 + 2] = M[2] * t; continue; }
    const k = Math.max(0.6, Math.min(1.6, Lm / B[i])) * Math.max(0.85, Math.min(1.18, B[i] / B2[i]));
    F[i * 3] = d[i * 4] * k; F[i * 3 + 1] = d[i * 4 + 1] * k; F[i * 3 + 2] = d[i * 4 + 2] * k;
  }
  /* бесшовность: смешивание с копией, сдвинутой на полплитки (и цвет, и высота). Веса нормированы на √(w²+(1−w)²):
     обычное линейное смешивание двух некоррелированных фактур гасит контраст петель у кромки плитки — на диване
     читалась «клетка» с шагом плитки. Среднее смешивается линейно, отклонения — с сохранением дисперсии */
  const tent = (i) => 1 - Math.abs((2 * (i + 0.5)) / N - 1);
  const Fm = [0, 0, 0]; for (let i = 0; i < N * N; i++) { Fm[0] += F[i * 3]; Fm[1] += F[i * 3 + 1]; Fm[2] += F[i * 3 + 2]; } Fm[0] /= N * N; Fm[1] /= N * N; Fm[2] /= N * N;
  const alb = new Uint8Array(N * N * 4), H = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, w = Math.min(1, Math.min(tent(x), tent(y)) * 3), j = ((y + N / 2) % N) * N + ((x + N / 2) % N);
    const v = 1 - w, k = 1 / Math.sqrt(w * w + v * v);
    for (let ch = 0; ch < 3; ch++) alb[i * 4 + ch] = Math.max(0, Math.min(255, Math.round(Fm[ch] + k * (w * (F[i * 3 + ch] - Fm[ch]) + v * (F[j * 3 + ch] - Fm[ch])))));
    alb[i * 4 + 3] = 255;
    H[i] = k * (w * Hp[i] + v * Hp[j]);
  }
  if (!o || !o.procH) return { alb };
  /* высота: фото (нормировано по СКО) + процедурный слой (ворс, зерно) */
  let s2 = 0; for (let i = 0; i < N * N; i++) s2 += H[i] * H[i]; const rmsP = Math.sqrt(s2 / (N * N)) || 1;
  const P = o.procH, Mq = o.M, rep = Math.max(1, Math.round(o.rep || 1));
  let pm = 0; for (let i = 0; i < P.length; i++) pm += P[i]; pm /= P.length;
  let q2 = 0; for (let i = 0; i < P.length; i++) q2 += (P[i] - pm) * (P[i] - pm); const rmsQ = Math.sqrt(q2 / P.length) || 1;
  const wP = o.wPhoto / rmsP, wQ = o.wProc / rmsQ;
  const Hc = new Float32Array(N * N);
  for (let y = 0; y < N; y++) { const py = Math.floor((y * rep * Mq) / N) % Mq; for (let x = 0; x < N; x++) { const px = Math.floor((x * rep * Mq) / N) % Mq; Hc[y * N + x] = wP * H[y * N + x] + wQ * (P[py * Mq + px] - pm); } }
  /* нормали из градиента высоты (размах ≈ 4 СКО), шероховатость: вершины петель чуть глаже, впадины матовее */
  const at = (x, y) => Hc[((y + N) % N) * N + ((x + N) % N)];
  const nrm = new Uint8Array(N * N * 4), rgh = new Uint8Array(N * N * 4), st = o.strength || 1, rb = o.roughBase ?? 0.9, rv = o.roughVar || 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) / 4, dy = (at(x, y + 1) - at(x, y - 1)) / 4;
    let nx = -dx * st, ny = dy * st, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * N + x) * 4;
    nrm[i] = (nx * 0.5 + 0.5) * 255; nrm[i + 1] = (ny * 0.5 + 0.5) * 255; nrm[i + 2] = (nz * 0.5 + 0.5) * 255; nrm[i + 3] = 255;
    const h = Math.max(-1, Math.min(1, Hc[y * N + x] / 2));
    const rr = Math.min(1, Math.max(0, rb - h * rv));
    rgh[i] = 255; rgh[i + 1] = rr * 255; rgh[i + 2] = 255; rgh[i + 3] = 255;
  }
  return { alb, nrm, rgh };
}
let albWorker = null, albSeq = 0;
const albJobs = new Map();
function swatchAsync(d, N, flat, o) {
  if (!albWorker && typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
    try {
      const code = `${swatchPixels.toString()}\nonmessage = (e) => { const { id, buf, N, flat, o } = e.data; if (o && o.proc) o.procH = new Float32Array(o.proc); const out = swatchPixels(new Uint8ClampedArray(buf), N, flat, o); const tr = [out.alb.buffer]; if (out.nrm) tr.push(out.nrm.buffer, out.rgh.buffer); postMessage({ id, alb: out.alb.buffer, nrm: out.nrm ? out.nrm.buffer : null, rgh: out.rgh ? out.rgh.buffer : null }, tr); };`;
      albWorker = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
      albWorker.onmessage = (e) => { const j = albJobs.get(e.data.id); albJobs.delete(e.data.id); if (j) j({ alb: new Uint8Array(e.data.alb), nrm: e.data.nrm ? new Uint8Array(e.data.nrm) : null, rgh: e.data.rgh ? new Uint8Array(e.data.rgh) : null }); };
      albWorker.onerror = () => { albWorker = false; albJobs.forEach((j) => j(null)); albJobs.clear(); };
    } catch (e) { albWorker = false; }
  }
  if (!albWorker) return Promise.resolve(swatchPixels(d, N, flat, o));   // без Worker — как раньше, в основном потоке
  return new Promise((res) => {
    const id = ++albSeq; albJobs.set(id, res);
    const buf = d.buffer.slice(0), tr = [buf];
    let oo = null;
    if (o && o.procH) { const proc = o.procH.buffer.slice(0); tr.push(proc); oo = { M: o.M, rep: o.rep, wPhoto: o.wPhoto, wProc: o.wProc, strength: o.strength, roughBase: o.roughBase, roughVar: o.roughVar, proc }; }
    albWorker.postMessage({ id, buf, N, flat, o: oo }, tr);
  }).then((out) => out || swatchPixels(d, N, flat, o));
}
/* «энергия складок» по уменьшенной копии фото (64 px — мелкая фактура усредняется, остаются складки и вихри):
   среднее квадрата градиента яркости в окне. Кандидаты: центр 70 % (с предпочтением — меньше повторов) и 9 окон по 45 % */
function flattestWindow(img, cw, chh) {
  const centre = { x: 0.15, y: 0.15, f: 0.7 };
  try {
    const S = 64, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d', { willReadFrequently: true }), m = Math.min(cw, chh);
    g.drawImage(img, (cw - m) / 2, (chh - m) / 2, m, m, 0, 0, S, S);
    const d = g.getImageData(0, 0, S, S).data, L0 = new Float32Array(S * S), L = new Float32Array(S * S);
    let mean = 0; for (let i = 0; i < S * S; i++) { L0[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]; mean += L0[i]; }
    mean = mean / (S * S) + 8;
    /* сглаживаем 3×3: плетение и петли не считаются складками — только перепады света крупнее ~1 см */
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let s = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += L0[Math.min(S - 1, Math.max(0, y + j)) * S + Math.min(S - 1, Math.max(0, x + i))]; L[y * S + x] = s / 9; }
    const E = new Float32Array(S * S);
    for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
      const gx = L[y * S + x + 1] - L[y * S + x - 1], gy = L[(y + 1) * S + x] - L[(y - 1) * S + x];
      E[y * S + x] = (gx * gx + gy * gy) / (mean * mean);
    }
    /* энергия окна: средний квадрат градиента + штраф за самый «складчатый» участок (вихрь в углу окна тоже виден на диване) */
    const en = (w) => {
      const x0 = Math.round(w.x * S), y0 = Math.round(w.y * S), n = Math.round(w.f * S); let s = 0, mx = 0;
      for (let y = Math.max(1, y0); y < Math.min(S - 1, y0 + n); y++) for (let x = Math.max(1, x0); x < Math.min(S - 1, x0 + n); x++) { s += E[y * S + x]; if (E[y * S + x] > mx) mx = E[y * S + x]; }
      return s / (n * n) + mx * 0.02;
    };
    let best = centre, be = en(centre) * 0.7;
    for (const f of [0.45, 0.38]) for (let yi = 0; yi <= 3; yi++) for (let xi = 0; xi <= 3; xi++) {
      const w = { x: 0.02 + xi * (0.96 - f) / 3, y: 0.02 + yi * (0.96 - f) / 3, f }, e = en(w) * (f < 0.4 ? 1.08 : 1);
      if (e < be) { be = e; best = w; }
    }
    return best;
  } catch (e) { return centre; }
}
/* relief = { procH, M, rep, wPhoto, wProc, strength, roughBase, roughVar, key } — рельеф из фото (см. swatchPixels) */
function swatchAlbedo(src, tile = 0.16, N = 384, flat = 1 / 10, relief = null) {
  const ck = `${src}|${tile}|${N}|${flat}|${relief ? relief.key : ''}`;
  if (albedoCache.has(ck)) return albedoCache.get(ck);
  const p = new Promise((resolve) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') return resolve(null);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = N;
        const g = c.getContext('2d', { willReadFrequently: true });
        const cw = img.naturalWidth || img.width, chh = img.naturalHeight || img.height, m = Math.min(cw, chh);
        /* окно кадра без складок: на многих фото образца ткань закручена «вихрем» или лежит складкой — на диване это давало
           повторяющийся рисунок-«муляж». Берём центр 70 % (если ровный) или самый ровный угол 45 %; масштаб плитки — по окну */
        const win = flattestWindow(img, cw, chh);
        const cs = m * win.f;
        g.drawImage(img, (cw - m) / 2 + win.x * m, (chh - m) / 2 + win.y * m, cs, cs, 0, 0, N, N);
        const d = g.getImageData(0, 0, N, N).data;
        const tl = tile * (win.f / 0.7);
        swatchAsync(d, N, flat, relief).then((out) => {
          const t = dataTex(out.alb, N, true); t.repeat.set(1 / tl, 1 / tl);
          const res = { tex: t };
          if (out.nrm) { res.nrm = dataTex(out.nrm, N); res.rgh = dataTex(out.rgh, N); res.nrm.repeat.set(1 / tl, 1 / tl); res.rgh.repeat.set(1 / tl, 1 / tl); }
          resolve(res);
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

/* ---------- обивка: швы, валик припуска и лёгкие складки — в шейдере (без лишних треугольников) ----------
   furniture3d.js кладёт в атрибут seam (vec4) расстояние по поверхности до линии шва (x), признак (y) и направление шва в UV (zw).
   Здесь: тонкая тень шва (сглажена по fwidth — не мерцает и тает, когда тоньше пикселя), валик припуска по обе стороны,
   натяжные складки поперёк шва у самой кромки и очень слабая «неидеальность» натяжения ткани по всей поверхности.
   Рельеф — производные высоты в экранном пространстве (как bump map, но без текстуры). На телефоне (lite) — только шов. */
/* occ (float, 0…1) — «контактное» затенение, записанное в вершины furniture3d.js: низ подушки у основания, тыл подушки
   сиденья под спинкой, верх рамы под подушкой — объём читается и на телефоне (там нет AO) */
const UPH_VERT_PARS = 'attribute vec4 seam;\nattribute float occ;\nvarying vec4 vSeam;\nvarying vec2 vFabUv;\nvarying float vOcc;\n';
const UPH_FRAG_PARS = `varying vec4 vSeam;
varying vec2 vFabUv;
varying float vOcc;
float uphHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float uphNoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(uphHash(i), uphHash(i + vec2(1.0, 0.0)), u.x), mix(uphHash(i + vec2(0.0, 1.0)), uphHash(i + vec2(1.0, 1.0)), u.x), u.y); }
vec3 uphBump(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
  vec3 sx = dFdx(surfPos), sy = dFdy(surfPos);
  vec3 r1 = cross(sy, surfNorm), r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}
`;
const UPH_FRAG = `
{
  float uphH = 0.0, uphDark = 0.0;
  if (vSeam.y > 0.5) {
    float sd = vSeam.x, ad = abs(sd);
    float fw = max(fwidth(sd), 1e-6);
    float w = UPH_SEAM_W, we = max(w, fw * 0.9), vis = w / we;
    float g = exp(-(sd * sd) / (we * we));
    uphDark = UPH_SEAM_DARK * g * mix(0.45, 1.0, vis);
    float rw = max(0.0035, fw);
    uphH += vis * (0.0007 * exp(-pow((ad - 0.0048) / rw, 2.0)) - 0.0012 * exp(-(sd * sd) / (w * w)));
#ifndef UPH_LITE
    float tl = length(vSeam.zw);
    if (tl > 0.05) {
      float s = dot(vFabUv, vSeam.zw / tl);
      float fs = fwidth(s);
      float amp = smoothstep(0.1, 0.9, tl) * smoothstep(0.012, 0.004, fs) * exp(-ad / 0.014) * smoothstep(0.002, 0.007, ad);
      float wr = sin(s * 285.0 + 5.0 * uphNoise(vec2(s * 14.0, 2.7)));
      uphH += 0.0009 * amp * wr * (0.35 + 0.65 * uphNoise(vec2(s * 22.0, 7.1)));
    }
#endif
  }
#ifndef UPH_LITE
  float fu = length(fwidth(vFabUv));
  uphH += smoothstep(0.03, 0.01, fu) * (0.0010 * (uphNoise(vFabUv * 7.0) - 0.5) + 0.0004 * (uphNoise(vFabUv * 19.0 + 3.1) - 0.5));
#endif
  normal = uphBump(-vViewPosition, normal, vec2(dFdx(uphH), dFdy(uphH)), faceDirection);
  diffuseColor.rgb *= 1.0 - uphDark;
}
`;
function upholstery(m, { lite = false, dark = 0.36, width = 0.0022 } = {}) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + UPH_VERT_PARS)
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvSeam = seam;\nvFabUv = uv;\nvOcc = occ;');
    sh.fragmentShader = (lite ? '#define UPH_LITE\n' : '') + `#define UPH_SEAM_W ${width.toFixed(4)}\n#define UPH_SEAM_DARK ${dark.toFixed(3)}\n` +
      sh.fragmentShader.replace('#include <common>', '#include <common>\n' + UPH_FRAG_PARS)
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + UPH_FRAG)
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n{ float uphAO = 1.0 - 0.6 * clamp(vOcc, 0.0, 1.0); reflectedLight.indirectDiffuse *= uphAO; reflectedLight.directDiffuse *= uphAO; reflectedLight.directSpecular *= uphAO; reflectedLight.indirectSpecular *= uphAO; }');
  };
  m.customProgramCacheKey = () => `ricca-uph-${lite ? 1 : 0}-${dark}-${width}`;
  return m;
}

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
  else m.specularIntensity = kind === 'velour' || kind === 'suede' ? 0.2 : kind === 'boucle' ? 0.2 : 0.3;   // ткань не бликует как пластик: свет даёт ворс (sheen)
  /* одинаковый масштаб фактуры: UV в метрах → повтор = 1 / размер плитки */
  for (const t of [maps.normal, maps.rough, maps.albedo]) t.repeat.set(1 / k.tile, 1 / k.tile);
  upholstery(m, { lite: q !== 'high', dark: kind === 'leather' ? 0.42 : kind === 'boucle' ? 0.22 : 0.3 });
  m.name = `fabric-${kind}-${hex}`;
  m.userData = { kind, hex, src450, finish: fin, baseColor: base.clone(), ready: Promise.resolve(m) };
  /* ткань на модели — настоящее фото образца (цвет, плетение, рисунок), а не заливка цветом: заказчик «ткань в 3D не видна».
     Рельеф тоже из фото (+ процедурный ворс) — петли и плетение совпадают с рисунком цвета */
  if (photo) {
    const rel = PHOTO_RELIEF[kind] || PHOTO_RELIEF.velour, ptile = PHOTO_TILE[kind] || 0.16;
    const relief = { ...rel, procH: maps.H, M: maps.N, rep: Math.max(1, Math.round(ptile / k.tile)), key: `${kind}${fin}|${N}` };
    if (kind === 'leather') { relief.roughBase = k.rough; relief.strength *= k.nScale / 0.6; }
    m.userData.ready = swatchAlbedo(photo, ptile, PN, PHOTO_FLAT[kind] || 1 / 10, relief).then((sw) => {
      if (sw) {
        m.map = sw.tex; m.color.setRGB(1, 1, 1);
        if (sw.nrm) { m.normalMap = sw.nrm; m.roughnessMap = sw.rgh; m.normalScale.set(1, 1); }
        m.needsUpdate = true; notify();
      }
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
  s.roughness = 1;
  s.normalMap = null; s.roughnessMap = null;   // фото ткани остаётся (иначе при белом цвете материала шов был бы белым)
  /* строчка — матовая нитка: без блика ворса вдоль трубки (на велюре шов блестел «как винил») */
  s.sheen = Math.min(0.3, fabric.sheen || 0); s.sheenRoughness = 0.9; s.specularIntensity = 0.1;
  s.name = fabric.name + '-seam';
  seamCache.set(fabric, s);
  if (fabric.userData && fabric.userData.ready) fabric.userData.ready.then(() => { s.map = fabric.map; s.color.copy(fabric.color).multiplyScalar(0.85); s.needsUpdate = true; });
  return s;
}

/* кант: та же ткань (цвет, фото, карта нормалей — не «пластиковая» трубка), рельеф вдвое мягче, блик ворса слабее и шире */
const pipeCache = new WeakMap();
export function pipingMaterial(fabric) {
  if (!fabric) return null;
  if (pipeCache.has(fabric)) return pipeCache.get(fabric);
  const s = fabric.clone();
  if (s.normalScale) s.normalScale = fabric.normalScale.clone().multiplyScalar(0.5); s.roughness = Math.min(1, fabric.roughness + 0.08);
  s.sheen = (fabric.sheen || 0) * 0.5; s.sheenRoughness = Math.min(1, (fabric.sheenRoughness || 0.5) + 0.35); s.specularIntensity = Math.min(fabric.specularIntensity || 0.3, 0.15);
  s.name = fabric.name + '-piping';
  pipeCache.set(fabric, s);
  if (fabric.userData && fabric.userData.ready) fabric.userData.ready.then(() => {
    s.map = fabric.map; s.color.copy(fabric.color);
    if (fabric.normalMap) { s.normalMap = fabric.normalMap; s.roughnessMap = fabric.roughnessMap; s.normalScale.copy(fabric.normalScale).multiplyScalar(0.5); }
    s.needsUpdate = true;
  });
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

/* ---------- декор кровати: покрывало (лён) и подушки (хлопок) — плетение + мягкие складки ткани, иначе «пластик» ---------- */
const decorCache = new Map();
export function decorMaterial(kind = 'decor') {
  if (decorCache.has(kind)) return decorCache.get(kind);
  const N = defaultQuality === 'high' ? 512 : 256, key = 'decorTex' + N;
  let t = texCache.get(key);
  if (!t) {
    /* плитка 30 см: нить ~1,2 мм (250 на плитку) + складки 5–30 см (fbm, 5 октав) */
    const H = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      const thread = Math.pow(Math.max(Math.abs(Math.sin(Math.PI * u * 250)), Math.abs(Math.sin(Math.PI * v * 250))), 0.7);
      H[y * N + x] = 0.16 * thread + 1.0 * fbm(u * 3, v * 3, 3, 91, 5) + 0.3 * fbm(u * 9, v * 9, 9, 97, 3);
    }
    /* сила 9: градиент по пикселю у складок масштаба 10 см мал — иначе рельефа не видно */
    const { nrm, rgh } = heightToTextures(H, N, 9, 0.92, 0.05);
    t = { normal: dataTex(nrm, N), rough: dataTex(rgh, N) };
    for (const tx of [t.normal, t.rough]) tx.repeat.set(1 / 0.3, 1 / 0.3);
    texCache.set(key, t);
  }
  const throwK = kind === 'throw';
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(throwK ? '#C9C4BB' : '#EEECE7'), roughness: 1, metalness: 0, roughnessMap: t.rough,
    normalMap: t.normal, normalScale: new THREE.Vector2(throwK ? 0.75 : 0.55, throwK ? 0.75 : 0.55),
    sheen: throwK ? 0.5 : 0.35, sheenRoughness: 0.75, sheenColor: new THREE.Color(throwK ? '#E9E6E0' : '#FFFFFF'), specularIntensity: 0.2,
  });
  m.name = 'decor-' + kind; m.userData = { kind };
  decorCache.set(kind, m);
  return m;
}

/* ---------- матрас: белый чехол, стёжка ромбом 8 см ---------- */
let mattressMat = null;
export function mattressMaterial() {
  if (mattressMat) return mattressMat;
  const N = 256, H = new Float32Array(N * N);
  /* стёжка «волнами» (как на матрасах в работах ателье): две семьи синусоид, плитка 24 см; строчка — узкая канавка,
     между строчками чехол слегка выпуклый */
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    const w1 = v * 2 + 0.12 * Math.sin(u * Math.PI * 4), w2 = u * 2 + 0.12 * Math.sin(v * Math.PI * 4);
    const l1 = Math.abs(((w1 % 1) + 1) % 1 - 0.5), l2 = Math.abs(((w2 % 1) + 1) % 1 - 0.5);
    const line = Math.min(l1, l2);
    H[y * N + x] = Math.pow(Math.min(1, line * 5), 0.7) * 0.85 + 0.15 * fbm(u * 48, v * 48, 48, 83, 2);
  }
  const { nrm } = heightToTextures(H, N, 2.2, 0.9, 0);
  const normal = dataTex(nrm, N); normal.repeat.set(1 / 0.24, 1 / 0.24);
  mattressMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#F3F2EE'), roughness: 0.92, sheen: 0.25, sheenRoughness: 0.85, sheenColor: new THREE.Color('#FFFFFF'), normalMap: normal, normalScale: new THREE.Vector2(0.38, 0.38), specularIntensity: 0.3 });
  mattressMat.name = 'mattress'; mattressMat.userData = { kind: 'mattress' };
  return mattressMat;
}
/* кант матраса: тканевая лента (тёмно-серая, как на матрасах в работах ателье) */
let tapeMat = null;
export function tapeMaterial() {
  if (tapeMat) return tapeMat;
  tapeMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#4A4A4C'), roughness: 0.85, sheen: 0.3, sheenRoughness: 0.7, sheenColor: new THREE.Color('#9A9A9C'), specularIntensity: 0.3 });
  tapeMat.name = 'mattress-tape'; tapeMat.userData = { kind: 'tape' };
  return tapeMat;
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
  /* кровать на ножках: деревянная отделка — дерево, чёрная или золотистая — металл (Bukel, Grafel: чёрные металлические ножки) */
  if (type === 'bed') legs = p.base === 'legs' ? (METAL[fin] && !WOOD[fin] ? metalMaterial(fin) : woodMaterial(WOOD[fin] ? fin : 'oak')) : metalMaterial('black');
  else if (p.legs === 'metal' || p.legs === 'disc') legs = metalMaterial(METAL[fin] ? fin : 'black');
  else if (p.legs === 'wood') legs = woodMaterial(WOOD[fin] ? fin : 'oak');
  else legs = metalMaterial('black');
  return { fabric, legs, top: null, mattress: mattressMaterial(), tape: tapeMaterial() };
}
