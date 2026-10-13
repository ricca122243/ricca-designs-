/* RICCA · конструктор — стиль «Моей комнаты»: цвет стен, пол и подсказка «Ткани к вашей комнате».
   WALLS / FLOORS — готовые варианты (живое применение в room.js). floorMaterial() — процедурные бесшовные полы на canvas.
   suggestFabrics() — чистая функция (работает в node): 6 цветов библиотеки по двум простым правилам —
   1) тон: ткань заметно светлее или темнее стены (|ΔL*| ≥ 18), чтобы силуэт мебели читался;
   2) тепло: к тёплому полу (дерево, ковёр) — тёплые и нейтральные оттенки, к холодному (бетон, мрамор) — холодные и нейтральные.
   Это подсказка, а не правило: решает клиент, образцы — в шоуруме. */

export const WALLS = [
  { id: 'milk', title: 'Молочный', hex: '#EEEBE4', skirt: '#F7F6F2' },
  { id: 'warmgrey', title: 'Тёплый серый', hex: '#CDC7BC', skirt: '#F3F1EC' },
  { id: 'graphite', title: 'Графит', hex: '#4D4D4B', skirt: '#454543' },
  { id: 'olive', title: 'Оливковый', hex: '#8C8B6C', skirt: '#838263' },
  { id: 'terracotta', title: 'Терракотовый', hex: '#B87559', skirt: '#AD6D52' },
];
/* warm: +1 тёплый, 0 нейтральный, −1 холодный; swatch — цвет квадратика на кнопке */
export const FLOORS = [
  { id: 'oak', title: 'Светлый дуб', warm: 1, swatch: '#D6C3A3' },
  { id: 'darkoak', title: 'Тёмный дуб', warm: 1, swatch: '#6B4E37' },
  { id: 'concrete', title: 'Бетон', warm: -1, swatch: '#A9A7A2' },
  { id: 'marble', title: 'Мрамор', warm: -1, swatch: '#E8E6E1' },
  { id: 'carpet', title: 'Ковёр', warm: 1, swatch: '#BFB4A2' },
];
export const wallOf = (id) => WALLS.find((w) => w.id === id) || WALLS[0];
export const floorOf = (id) => FLOORS.find((f) => f.id === id) || FLOORS[0];

/* ═════════ цвет: sRGB → CIE Lab (D65) ═════════ */
export function hexToLab(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}
const dE = (p, q) => Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
/* температура ткани: +1 тёплая (жёлто-красная), −1 холодная (сине-зелёная, серо-голубая), 0 нейтральная (малая насыщенность) */
export function warmthOf(lab) {
  const C = Math.hypot(lab.a, lab.b);
  if (C < 6) return lab.b > 2.5 ? 0.3 : lab.b < -1.5 ? -0.3 : 0;
  const h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;            // −180…180
  if (h > -10 && h < 105) return 1;                               // красный → жёлтый
  if (h >= 105 && h < 150) return 0.2;                            // оливковый
  return -1;                                                      // зелёный → синий → фиолетовый
}

/* 6 цветов к стене и полу. all — плоский список тканей (fabrics.js → allFabrics), у каждой hex.
   → { picks: [{ fabric, why }], rule: 'одна строка, почему так' } */
export function suggestFabrics(all, wallId, floorId, { count = 6 } = {}) {
  const wall = wallOf(wallId), floor = floorOf(floorId);
  const wl = hexToLab(wall.hex);
  const light = wl.L >= 70, dark = wl.L < 45;
  const fl = hexToLab(floor.swatch);
  const scored = [];
  for (const f of all || []) {
    if (!f || !/^#[0-9a-f]{6}$/i.test(f.hex || '')) continue;
    const lab = hexToLab(f.hex);
    const dL = lab.L - wl.L;
    if (Math.abs(dL) < 18) continue;                               // правило 1: тон
    if (dark && dL < 0) continue;                                  // к тёмной стене — только светлее (тёмное сольётся)
    if (dE(lab, wl) < 22) continue;                                // и не «тот же цвет, что стена»
    /* у цветной стены (олива, терракота) — не тот же оттенок: тёмная терракота на терракоте сливается */
    const wC = Math.hypot(wl.a, wl.b), fC = Math.hypot(lab.a, lab.b);
    if (wC > 15 && fC > 12) { const dh = Math.abs(((Math.atan2(lab.b, lab.a) - Math.atan2(wl.b, wl.a)) * 180 / Math.PI + 540) % 360 - 180); if (dh < 22) continue; }
    const w = warmthOf(lab);
    if (floor.warm > 0 && w < -0.5) continue;                      // правило 2: к тёплому полу — без холодных
    if (floor.warm < 0 && w > 0.5 && Math.hypot(lab.a, lab.b) > 14) continue;   // к холодному — без ярко-тёплых
    const C = Math.hypot(lab.a, lab.b);
    /* баллы: контраст «в меру» (лучше всего ~30 единиц светлоты), спокойная насыщенность, не сливаться с полом */
    let s = 1 - Math.min(1, Math.abs(Math.abs(dL) - 30) / 30);
    s += Math.abs(w) <= 0.3 ? 0.35 : (floor.warm > 0 ? w > 0.5 : w < -0.5) ? 0.4 : 0.25;
    s += C < 22 ? 0.35 : C < 35 ? 0.15 : -0.25;
    if (Math.abs(lab.L - fl.L) < 10) s -= 0.3;
    if (lab.L < 22) s -= 0.3;                                       // почти чёрные — реже
    scored.push({ f, lab, dL, w, C, s });
  }
  scored.sort((a, b) => b.s - a.s || a.f.hex.localeCompare(b.f.hex));
  /* 6 мест: по тону (к светлой стене — средние и глубокие, к тёмной — светлые, к средней — и светлее, и темнее)
     и по теплу (к тёплому полу — тёплые и нейтральные, к холодному — холодные и нейтральные); в каждой коллекции — один цвет */
  const T = {
    mid: (c) => Math.abs(c.dL) >= 18 && Math.abs(c.dL) < 36 && (light ? c.dL < 0 : dark ? c.dL > 0 : true),
    deep: (c) => Math.abs(c.dL) >= 36 && (light ? c.dL < 0 : dark ? c.dL > 0 : true),
    up: (c) => c.dL > 0, down: (c) => c.dL < 0, any: () => true,
  };
  const W = { warm: (c) => c.w > 0.5, cool: (c) => c.w < -0.5, neutral: (c) => Math.abs(c.w) <= 0.3, any: () => true };
  const tones = light || dark ? ['mid', 'mid', 'deep', 'mid', 'deep', 'any'] : ['up', 'down', 'up', 'down', 'any', 'any'];
  const temps = floor.warm > 0 ? ['warm', 'neutral', 'warm', 'neutral', 'warm', 'any'] : ['cool', 'neutral', 'cool', 'neutral', 'neutral', 'any'];
  const picks = [];
  /* разные коллекции, заметно разные цвета и не больше одного почти чёрного */
  const free = (c, gap) => !picks.includes(c) && !picks.some((p) => p.f.collectionId === c.f.collectionId) && !picks.some((p) => dE(p.lab, c.lab) < gap)
    && !(c.lab.L < 30 && picks.some((p) => p.lab.L < 30));
  for (let i = 0; i < count; i++) {
    const t = T[tones[i] || 'any'], w = W[temps[i] || 'any'];
    const c = scored.find((x) => free(x, 14) && t(x) && w(x)) || scored.find((x) => free(x, 14) && t(x)) || scored.find((x) => free(x, 14)) || scored.find((x) => free(x, 8)) || scored.find((x) => !picks.includes(x) && !picks.some((p) => dE(p.lab, x.lab) < 8));
    if (c) picks.push(c);
  }
  const why = (c) => [c.dL < 0 ? 'темнее стены' : 'светлее стены', c.w > 0.5 ? 'тёплый' : c.w < -0.5 ? 'холодный' : 'нейтральный'].join(' · ');
  const rule = `${light ? 'Светлая стена — ткань на тон-два темнее' : dark ? 'Тёмная стена — светлая ткань' : 'Стена средней светлоты — ткань светлее или глубже'}; ${floor.warm > 0 ? 'тёплый пол — тёплые и нейтральные оттенки' : 'холодный пол — холодные и нейтральные оттенки'}.`;
  return { picks: picks.slice(0, count).map((c) => ({ fabric: c.f, why: why(c) })), rule };
}

/* ═════════ полы: canvas-текстуры (бесшовные), кеш ═════════ */
const floorCache = new Map();
export function floorMaterial(THREE, renderer, id) {
  id = floorOf(id).id;
  if (floorCache.has(id)) return floorCache.get(id);
  const S = id === 'carpet' ? 512 : 1024;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  let seed = { oak: 7, darkoak: 11, concrete: 23, marble: 31, carpet: 43 }[id];
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  /* рисуем и с переносом по краям — плитка бесшовная */
  const wrap = (fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
  let repeat = 1, rough = 0.62, env = 0.9;
  if (id === 'oak' || id === 'darkoak') {
    const dark = id === 'darkoak', rows = 10, rh = S / rows;
    const base = dark ? [112, 80, 56] : [216, 196, 163];
    g.fillStyle = `rgb(${base.join(',')})`; g.fillRect(0, 0, S, S);
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      let x = rnd() * S; const end = x + S;
      while (x < end) {
        const len = Math.min(end - x, 420 + rnd() * 480);
        const l = 0.94 + rnd() * 0.1, warm = rnd() * 6 - 3;
        g.fillStyle = `rgb(${Math.round(base[0] * l + warm)}, ${Math.round(base[1] * l)}, ${Math.round(base[2] * l - warm)})`;
        g.fillRect(x % S, y, len, rh); if ((x % S) + len > S) g.fillRect((x % S) - S, y, len, rh);
        for (let k = 0; k < 26; k++) {
          const yy = y + 2 + rnd() * (rh - 4), a = (dark ? 0.06 : 0.025) + rnd() * 0.05, amp = 0.6 + rnd() * 1.6, ph = rnd() * 6.28;
          g.strokeStyle = dark ? `rgba(36, 22, 12, ${a})` : `rgba(110, 80, 45, ${a})`; g.lineWidth = 0.6 + rnd() * 1.1;
          for (const off of [0, -S]) {
            g.beginPath();
            for (let t = 0; t <= len; t += 16) { const px = (x % S) + off + t; const py = yy + Math.sin(ph + t * 0.01) * amp; if (t === 0) g.moveTo(px, py); else g.lineTo(px, py); }
            g.stroke();
          }
        }
        g.fillStyle = dark ? 'rgba(25, 16, 9, 0.5)' : 'rgba(90, 66, 40, 0.35)'; g.fillRect(x % S, y, 1.2, rh);
        x += len;
      }
      g.fillStyle = dark ? 'rgba(25, 16, 9, 0.45)' : 'rgba(90, 66, 40, 0.32)'; g.fillRect(0, y, S, 1.4);
    }
    rough = dark ? 0.55 : 0.62;
  } else if (id === 'concrete') {
    /* микроцемент: мягкие пятна разной светлоты + мелкое зерно; плитка 2,4 м */
    g.fillStyle = '#A9A7A2'; g.fillRect(0, 0, S, S);
    for (let k = 0; k < 220; k++) {
      const x = rnd() * S, y = rnd() * S, r = 30 + rnd() * 160, v = rnd() < 0.5 ? 255 : 0, a = 0.01 + rnd() * 0.025;
      wrap((ox, oy) => { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, `rgba(${v},${v},${v},${a})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r); });
    }
    grain(g, S, rnd, 10);
    repeat = 0.5; rough = 0.78; env = 0.7;
  } else if (id === 'marble') {
    /* светлый мрамор плитами 60 × 60 см (на плитке 1,2 м — 2 × 2), мягкие прожилки, тонкий шов */
    g.fillStyle = '#E9E7E2'; g.fillRect(0, 0, S, S);
    for (let k = 0; k < 60; k++) {
      const x = rnd() * S, y = rnd() * S, r = 60 + rnd() * 200, a = 0.03 + rnd() * 0.04, v = rnd() < 0.6 ? 255 : 196;
      wrap((ox, oy) => { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, `rgba(${v},${v - 2},${v - 6},${a})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r); });
    }
    /* прожилки: ломаная с шумом, много проходов с малой прозрачностью — мягко, без «нарисованной» линии */
    for (let v = 0; v < 7; v++) {
      const pts = []; let x = rnd() * S, y = rnd() * S, ang = rnd() * Math.PI * 2;
      for (let i = 0; i < 70; i++) { pts.push([x, y]); ang += (rnd() - 0.5) * 0.5; x += Math.cos(ang) * 14; y += Math.sin(ang) * 14; }
      const main = rnd() < 0.4;
      for (let pass = 0; pass < 5; pass++) {
        g.strokeStyle = `rgba(118, 112, 104, ${(main ? 0.05 : 0.03) * (1 - pass * 0.15)})`; g.lineWidth = (main ? 1.2 : 0.7) + pass * (main ? 2.2 : 1.4);
        wrap((ox, oy) => { g.beginPath(); pts.forEach(([px, py], i) => { const jx = (rnd() - 0.5) * 2, jy = (rnd() - 0.5) * 2; if (i === 0) g.moveTo(px + ox + jx, py + oy + jy); else g.lineTo(px + ox + jx, py + oy + jy); }); g.stroke(); });
      }
    }
    grain(g, S, rnd, 4);
    g.fillStyle = 'rgba(150, 146, 138, 0.55)';
    for (const p of [0, S / 2]) { g.fillRect(p, 0, 1.5, S); g.fillRect(0, p, S, 1.5); }
    rough = 0.2; env = 1;
  } else if (id === 'carpet') {
    /* ковёр по всей комнате: мелкий ворс; плитка 40 см */
    g.fillStyle = '#BFB4A2'; g.fillRect(0, 0, S, S);
    for (let k = 0; k < 50; k++) {
      const x = rnd() * S, y = rnd() * S, r = 30 + rnd() * 90, v = rnd() < 0.5 ? 255 : 0, a = 0.02 + rnd() * 0.03;
      wrap((ox, oy) => { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, `rgba(${v},${v},${v},${a})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, 2 * r, 2 * r); });
    }
    grain(g, S, rnd, 22);
    repeat = 3; rough = 1; env = 0.5;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.repeat.set(repeat, repeat);
  tex.anisotropy = Math.min(8, renderer && renderer.capabilities && renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4);
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: rough, metalness: 0, envMapIntensity: env });
  m.name = 'floor-' + id;
  floorCache.set(id, m);
  return m;
}
/* мелкое зерно ±amp по яркости (попиксельно — бесшовно само по себе) */
function grain(g, S, rnd, amp) {
  const im = g.getImageData(0, 0, S, S), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const v = (rnd() - 0.5) * 2 * amp; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  g.putImageData(im, 0, 0);
}
