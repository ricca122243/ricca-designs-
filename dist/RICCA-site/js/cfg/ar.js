/* RICCA · конструктор — «Посмотреть у себя дома» (AR через камеру телефона).
   Модель текущего варианта → GLB в метрах (GLTFExporter, бинарный, начало координат — центр пятна на полу)
   → <model-viewer ar ar-modes="webxr quick-look" ar-placement="floor" ar-scale="fixed"> (vendor/model-viewer, грузится только здесь)
   → activateAR(). iPhone: Quick Look с USDZ, который model-viewer делает сам; если не вышло — USDZ из three (USDZExporter).
   Ничего не отправляется наружу: всё в blob-ссылках, они освобождаются при закрытии. */
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const MV_SRC = new URL('../../vendor/model-viewer/model-viewer.min.js', import.meta.url).href;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Mac/.test(navigator.platform || '') && navigator.maxTouchPoints > 1);
const abortErr = () => { const e = new Error('aborted'); e.name = 'AbortError'; return e; };
const timeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

/* модель варианта (низкое качество — для телефона) */
export async function buildPiece({ type, params, fabric, engine }) {
  const mats = engine.materialSet({ type, params, fabric, quality: 'low' });
  const ready = Object.values(mats).filter((m) => m && m.userData && m.userData.ready).map((m) => m.userData.ready);
  if (ready.length) await timeout(Promise.all(ready).catch(() => null), 2500);   // фактура ткани из фото образца
  const group = engine.build(type, params, mats, { quality: 'low' });
  group.updateMatrixWorld(true);
  return group;
}

/* GLB → Blob (model/gltf-binary).
   Фактуры материалов — DataTexture (процедурные карты), GLTFExporter умеет только картинки/canvas:
   для выгрузки делаем копию сцены с теми же сетками и копиями материалов, где каждая DataTexture → CanvasTexture. */
export async function exportGLB(group, { maxTextureSize = 1024 } = {}) {
  const exporter = new GLTFExporter();
  const { root, dispose } = exportable(group, maxTextureSize);
  try {
    const buf = await exporter.parseAsync(root, { binary: true, onlyVisible: true, maxTextureSize });
    return new Blob([buf], { type: 'model/gltf-binary' });
  } finally { dispose(); }
}

const drawable = (img) => (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement)
  || (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement)
  || (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap)
  || (typeof OffscreenCanvas !== 'undefined' && img instanceof OffscreenCanvas);

function dataToCanvas(tex, maxSize) {
  const img = tex.image; const { width: w, height: h, data } = img || {};
  if (!data || !w || !h) return null;
  const ch = Math.round(data.length / (w * h));
  if (!(ch >= 1 && ch <= 4)) return null;
  const isHalf = tex.type === THREE.HalfFloatType;
  const isFloat = data instanceof Float32Array || isHalf;
  const val = (i) => { const v = isHalf ? THREE.DataUtils.fromHalfFloat(data[i]) : data[i]; return isFloat ? Math.round(Math.max(0, Math.min(1, v)) * 255) : v; };
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); const id = g.createImageData(w, h); const o = id.data;
  for (let p = 0, n = w * h; p < n; p++) {
    const s = p * ch, d = p * 4;
    if (ch >= 3) { o[d] = val(s); o[d + 1] = val(s + 1); o[d + 2] = val(s + 2); o[d + 3] = ch === 4 ? val(s + 3) : 255; }
    else if (ch === 2) { o[d] = val(s); o[d + 1] = val(s + 1); o[d + 2] = 0; o[d + 3] = 255; }
    else { o[d] = o[d + 1] = o[d + 2] = val(s); o[d + 3] = 255; }
  }
  g.putImageData(id, 0, 0);
  if (Math.max(w, h) <= maxSize) return c;
  const k = maxSize / Math.max(w, h); const c2 = document.createElement('canvas');
  c2.width = Math.max(1, Math.round(w * k)); c2.height = Math.max(1, Math.round(h * k));
  c2.getContext('2d').drawImage(c, 0, 0, c2.width, c2.height);
  return c2;
}

function exportable(group, maxSize) {
  const texCache = new Map(), matCache = new Map(), made = [];
  const conv = (t) => {
    if (!t || !t.isTexture) return t;
    if (drawable(t.image)) return t;
    if (texCache.has(t.uuid)) return texCache.get(t.uuid);
    const cv = dataToCanvas(t, maxSize);
    let nt = null;
    if (cv) {
      nt = new THREE.CanvasTexture(cv);
      for (const k of ['wrapS', 'wrapT', 'magFilter', 'minFilter', 'colorSpace', 'channel', 'rotation', 'name']) nt[k] = t[k];
      nt.repeat.copy(t.repeat); nt.offset.copy(t.offset); nt.center.copy(t.center);
      nt.flipY = !!t.flipY; nt.needsUpdate = true; made.push(nt);
    }
    texCache.set(t.uuid, nt);
    return nt;
  };
  const convMat = (m) => {
    if (!m) return m;
    if (matCache.has(m.uuid)) return matCache.get(m.uuid);
    let nm = m, changed = false;
    for (const k of Object.keys(m)) {
      const v = m[k];
      if (v && v.isTexture && !drawable(v.image)) {
        if (!changed) { nm = m.clone(); changed = true; made.push(nm); }
        nm[k] = conv(v);
      }
    }
    matCache.set(m.uuid, nm);
    return nm;
  };
  const root = group.clone(true);                 // те же геометрии, свои Object3D
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(convMat) : convMat(o.material);
    /* атрибут швов (шейдер конструктора) в AR не нужен — без него GLB легче */
    if (o.geometry && o.geometry.attributes.seam) { const g = o.geometry.clone(); g.deleteAttribute('seam'); o.geometry = g; made.push(g); }
  });
  root.updateMatrixWorld(true);
  return { root, dispose: () => made.forEach((x) => x.dispose && x.dispose()) };
}

let mvLoading = null;
export function loadModelViewer() {
  if (typeof customElements !== 'undefined' && customElements.get('model-viewer')) return Promise.resolve();
  if (!mvLoading) mvLoading = import(MV_SRC).then(() => customElements.whenDefined('model-viewer')).catch((e) => { mvLoading = null; throw e; });
  return mvLoading;
}

export async function prepareAR({ type, params, fabric, engine, signal, title = 'RICCA DESIGNS' } = {}) {
  const urls = [];
  let mv = null, group = null, disposed = false, failedQL = false;
  const check = () => { if (disposed || (signal && signal.aborted)) throw abortErr(); };
  const dispose = () => {
    disposed = true;
    if (mv) { mv.remove(); mv = null; }
    if (group && engine.disposePiece) engine.disposePiece(group);
    group = null;
    urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
  };
  if (signal) signal.addEventListener('abort', dispose, { once: true });
  try {
    group = await buildPiece({ type, params, fabric, engine }); check();
    const blob = await exportGLB(group); check();
    const url = URL.createObjectURL(blob); urls.push(url);
    await loadModelViewer(); check();
    mv = document.createElement('model-viewer');
    mv.setAttribute('src', url);
    mv.setAttribute('ar', '');
    mv.setAttribute('ar-modes', 'webxr quick-look');
    mv.setAttribute('ar-placement', 'floor');
    mv.setAttribute('ar-scale', 'fixed');
    mv.setAttribute('loading', 'eager');
    mv.setAttribute('reveal', 'auto');
    mv.setAttribute('shadow-intensity', '1');
    mv.setAttribute('environment-image', 'neutral');
    mv.setAttribute('alt', title);
    mv.setAttribute('aria-hidden', 'true');
    mv.setAttribute('tabindex', '-1');
    /* 1 × 1 px, вне глаз, но в документе — иначе model-viewer не загрузит модель */
    Object.assign(mv.style, { position: 'fixed', left: '0', bottom: '0', width: '1px', height: '1px', opacity: '0.01', pointerEvents: 'none', zIndex: '-1' });
    mv.addEventListener('ar-status', (e) => { if (e.detail && e.detail.status === 'failed') failedQL = true; });
    const loaded = new Promise((res, rej) => {
      mv.addEventListener('load', () => res(), { once: true });
      mv.addEventListener('error', (e) => rej(new Error('model-viewer: ' + ((e.detail && e.detail.type) || 'error'))), { once: true });
    });
    document.body.appendChild(mv);
    await timeout(loaded, 15000); check();
    await new Promise((r) => setTimeout(r, 60));                       // canActivateAR обновляется после проверки WebXR
    const session = {
      blob, url, size: blob.size, mv, group,
      get canActivate() { return !!(mv && mv.canActivateAR); },
      async activate() {
        if (!mv) throw new Error('disposed');
        if (isIOS() && failedQL) return quickLookFallback(group, urls);
        await mv.activateAR();
        if (isIOS()) setTimeout(() => { if (failedQL && group) quickLookFallback(group, urls).catch(() => {}); }, 1500);
      },
      dispose,
    };
    return session;
  } catch (e) {
    dispose();
    throw e;
  }
}

/* запасной путь iPhone: USDZ из three → <a rel="ar"> */
async function quickLookFallback(group, urls) {
  const { USDZExporter } = await import('three/addons/exporters/USDZExporter.js');
  const blob = await exportUSDZ(group, USDZExporter);
  const url = URL.createObjectURL(blob); urls.push(url);
  const a = document.createElement('a');
  a.rel = 'ar'; a.href = url;
  a.appendChild(document.createElement('img'));
  document.body.appendChild(a); a.click(); a.remove();
}
export async function exportUSDZ(group, USDZExporter) {
  if (!USDZExporter) ({ USDZExporter } = await import('three/addons/exporters/USDZExporter.js'));
  const ex = new USDZExporter();
  const { root, dispose } = exportable(group, 1024);
  try {
    const buf = ex.parseAsync ? await ex.parseAsync(root, { quickLookCompatible: true, maxTextureSize: 1024 }) : await new Promise((res, rej) => ex.parse(root, res, rej, { quickLookCompatible: true }));
    return new Blob([buf], { type: 'model/vnd.usdz+zip' });
  } finally { dispose(); }
}
