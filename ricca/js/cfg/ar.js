/* RICCA · конструктор — «Посмотреть у себя дома» (AR через камеру телефона).
   Модель текущего варианта → GLB в метрах (GLTFExporter, бинарный, начало координат — центр пятна на полу)
   → <model-viewer ar ar-modes="webxr quick-look" ar-placement="floor" ar-scale="fixed"> (vendor/model-viewer, грузится только здесь)
   → activateAR(). iPhone: Quick Look с USDZ, который model-viewer делает сам; если не вышло — USDZ из three (USDZExporter).
   Ничего не отправляется наружу: всё в blob-ссылках, они освобождаются при закрытии. */
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

/* GLB → Blob (model/gltf-binary) */
export async function exportGLB(group, { maxTextureSize = 1024 } = {}) {
  const exporter = new GLTFExporter();
  const buf = await exporter.parseAsync(group, { binary: true, onlyVisible: true, maxTextureSize });
  return new Blob([buf], { type: 'model/gltf-binary' });
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
  const ex = new USDZExporter();
  const buf = ex.parseAsync ? await ex.parseAsync(group) : await new Promise((res, rej) => ex.parse(group, res, rej));
  const url = URL.createObjectURL(new Blob([buf], { type: 'model/vnd.usdz+zip' })); urls.push(url);
  const a = document.createElement('a');
  a.rel = 'ar'; a.href = url;
  a.appendChild(document.createElement('img'));
  document.body.appendChild(a); a.click(); a.remove();
}
