/* RICCA · конструктор — сцена: рендерер, студия (свет, пол, контактная тень, AO), камера и виды
   «3D · Спереди · Сбоку · Сверху» (плавный переход в ортографию), размерные линии, снимки. Рендер по требованию. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { onMaterialUpdate } from './materials.js';

const BG = '#F3F2EE';
const FOV = 30;
const AZ = THREE.MathUtils.degToRad(35), EL = THREE.MathUtils.degToRad(18);
const DIRS = {
  front: new THREE.Vector3(0, 0, 1),
  side: new THREE.Vector3(-1, 0, 0),
  top: new THREE.Vector3(0, 1, 0.0001).normalize(),
};
const dir3q = () => new THREE.Vector3(Math.sin(AZ) * Math.cos(EL), Math.sin(EL), Math.cos(AZ) * Math.cos(EL));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/* фон через EffectComposer проходит тон-маппинг (OutputPass) — подбираем такой линейный цвет, чтобы на экране
   получился ровно BG (бесшовно с рамкой страницы). Neutral tone mapping three.js, повторённый на JS. */
function neutralTM(c, exposure) {
  let r = c[0] * exposure, g = c[1] * exposure, b = c[2] * exposure;
  const x = Math.min(r, g, b), off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  r -= off; g -= off; b -= off;
  const peak = Math.max(r, g, b), S = 0.76;
  if (peak < S) return [r, g, b];
  const d = 1 - S, np = 1 - (d * d) / (peak + d - S);
  r *= np / peak; g *= np / peak; b *= np / peak;
  const k = 1 - 1 / (0.15 * (peak - np) + 1);
  return [r + (np - r) * k, g + (np - g) * k, b + (np - b) * k];
}
function preToneMapped(hex, exposure) {
  const t = new THREE.Color(hex); const target = [t.r, t.g, t.b]; // линейные
  let c = target.slice();
  for (let i = 0; i < 60; i++) { const f = neutralTM(c, exposure); c = c.map((v, k) => Math.max(0, v + (target[k] - f[k]) * 1.5)); }
  return new THREE.Color(c[0], c[1], c[2]); // уже линейный: присваиваем компонентами
}
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const isPhone = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900;

export function createStage(container, { quality = 'auto', ao, antialias = true } = {}) {
  const phone = quality === 'auto' ? isPhone() : quality === 'mid' || quality === 'low';
  const Qv = quality === 'auto' ? (phone ? 'mid' : 'high') : quality;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  } catch (e) { throw new Error('webgl'); }
  if (!renderer.getContext()) throw new Error('webgl');
  const dprCap = phone ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.9; // подобрано по ΔE2000 образцов (§8.3): среднее 0,7
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const canvas = renderer.domElement;
  canvas.style.display = 'block'; canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.style.touchAction = 'none';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const hemi = new THREE.HemisphereLight(0xfffaf2, 0xe8e4dc, 0.25);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.castShadow = true;
  key.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
  key.shadow.radius = 6; key.shadow.blurSamples = 16; key.shadow.bias = -0.0005; key.shadow.normalBias = 0.01;
  scene.add(key); scene.add(key.target);

  /* студия: пол того же цвета, что фон (тень — ShadowMaterial), контактная тень */
  const studio = new THREE.Group(); studio.name = 'studio';
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: 0x3a342c, opacity: 0.16, depthWrite: false }));
  floor.receiveShadow = true; floor.renderOrder = 1; studio.add(floor);
  scene.add(studio);
  const contact = makeContactShadow(renderer);
  studio.add(contact.plane);

  const root = new THREE.Group(); root.name = 'content'; scene.add(root);

  /* камеры */
  const persp = new THREE.PerspectiveCamera(FOV, 1, 0.05, 200);
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 200);
  let camera = persp;
  persp.position.set(3, 1.5, 4);
  const controls = new OrbitControls(persp, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minPolarAngle = THREE.MathUtils.degToRad(10); controls.maxPolarAngle = THREE.MathUtils.degToRad(88);
  controls.enablePan = !phone; controls.screenSpacePanning = true;
  controls.zoomSpeed = 0.8; controls.rotateSpeed = 0.7;

  /* пост: RenderPass → GTAO → Output */
  const aoMode = ao === false ? 'off' : phone ? 'idle' : 'always';
  let composer = null, gtao = null, renderPass = null;
  function ensureComposer() {
    if (composer || aoMode === 'off') return composer;
    const size = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio();
    composer = new EffectComposer(renderer);
    renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    gtao = new GTAOPass(scene, camera, size.x * pr, size.y * pr);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = 1.0;
    gtao.updateGtaoMaterial({ radius: 0.25, distanceExponent: 1, thickness: 1, scale: 1, samples: phone ? 8 : 16, distanceFallOff: 1 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: phone ? 8 : 16 });
    composer.addPass(gtao);
    composer.addPass(new OutputPass());
    return composer;
  }
  function setPassCamera(cam) {
    if (!composer) return;
    renderPass.camera = cam; gtao.camera = cam;
    gtao.gtaoMaterial.defines.PERSPECTIVE_CAMERA = cam.isPerspectiveCamera ? 1 : 0; gtao.gtaoMaterial.needsUpdate = true;
    if (gtao.pdMaterial.defines && 'PERSPECTIVE_CAMERA' in gtao.pdMaterial.defines) { gtao.pdMaterial.defines.PERSPECTIVE_CAMERA = cam.isPerspectiveCamera ? 1 : 0; gtao.pdMaterial.needsUpdate = true; }
    gtao.setSize(gtao.width, gtao.height);
  }

  /* оверлей размеров (SVG поверх canvas) */
  const svgNS = 'http://www.w3.org/2000/svg';
  const overlay = document.createElementNS(svgNS, 'svg');
  overlay.setAttribute('class', 'cfg-dims');
  Object.assign(overlay.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' });
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.appendChild(overlay);
  let dimList = null;

  /* состояние */
  const listeners = {};
  const emit = (e, d) => (listeners[e] || []).forEach((fn) => fn(d));
  let view = '3d';
  let object = null, box = new THREE.Box3(), size = new THREE.Vector3(1, 1, 1), center = new THREE.Vector3(), lastRadius = 0;
  let anim = null, raf = 0, idleT = 0, interacting = false, disposed = false, studioOn = true;
  let W = 1, H = 1;

  function resize() {
    const r = container.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    persp.aspect = W / H; persp.updateProjectionMatrix();
    fitOrtho();
    if (composer) { composer.setSize(W, H); composer.setPixelRatio(renderer.getPixelRatio()); }
    requestRender();
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(container); else window.addEventListener('resize', resize);

  const radius = () => Math.max(0.3, size.length() / 2);
  /* расстояние, при котором габарит занимает fill кадра по ширине и высоте */
  function fitDistance(dir, fov, aspect, fill = 0.74) {
    const f = dir.clone().normalize();
    const up = Math.abs(f.y) > 0.99 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    const r = new THREE.Vector3().crossVectors(up, f).normalize(), u = new THREE.Vector3().crossVectors(f, r);
    const ty = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * fill, tx = ty * aspect;
    let dist = 0.5;
    for (let i = 0; i < 8; i++) {
      const c = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(center);
      const cz = c.dot(f);
      dist = Math.max(dist, Math.abs(c.dot(r)) / tx + cz, Math.abs(c.dot(u)) / ty + cz);
    }
    return dist;
  }
  const framingDist = (dir) => fitDistance(dir || dir3q(), FOV, W / H);
  /* полувысота кадра для оси вида */
  function orthoHalf(v) {
    const ext = v === 'front' ? [size.x, size.y] : v === 'side' ? [size.z, size.y] : [size.x, size.z];
    const aspect = W / H;
    const m = dimList ? 1.34 : 1.18; // место под размерные ряды
    return Math.max(ext[1] / 2, ext[0] / 2 / aspect) * m + 0.03;
  }
  function viewTarget(v) { return v === 'top' ? new THREE.Vector3(center.x, 0, center.z) : center.clone(); }
  function fitOrtho(half) {
    const h = half || (view !== '3d' ? orthoHalf(view) : 1);
    const a = W / H;
    ortho.left = -h * a; ortho.right = h * a; ortho.top = h; ortho.bottom = -h; ortho.updateProjectionMatrix();
  }
  function useCamera(cam) {
    if (camera === cam) return;
    camera = cam; controls.object = cam; setPassCamera(cam);
  }

  /* ---------- рендер по требованию ---------- */
  function requestRender() { if (!raf && !disposed) raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = 0;
    let more = false;
    if (anim) { more = stepAnim(now) || more; }
    if (controls.enabled && !anim) { if (controls.update()) more = true; }
    renderFrame(more);
    if (more) requestRender();
  }
  function renderFrame(moving) {
    if (studioOn && contact.dirty) contact.update(scene, root);
    const useAO = aoMode === 'always' || (aoMode === 'idle' && !moving && !interacting);
    if (useAO && ensureComposer()) {
      if (renderPass.camera !== camera) setPassCamera(camera);
      if (studioOn) scene.background = bgComposite;
      composer.render();
      if (studioOn) scene.background = bgDirect;
    } else renderer.render(scene, camera);
    if (aoMode === 'idle' && (moving || interacting)) { clearTimeout(idleT); idleT = setTimeout(() => { interacting = false; requestRender(); }, 160); }
    if (dimList) drawDims();
    emit('render');
  }
  controls.addEventListener('change', () => requestRender());
  controls.addEventListener('start', () => { interacting = true; if (anim && anim.cancelable) anim = null; emit('interact'); });
  controls.addEventListener('end', () => { requestRender(); });

  /* ---------- объект ---------- */
  function setObject(group) {
    if (object) root.remove(object);
    object = group;
    if (group) root.add(group);
    box.setFromObject(root);
    if (box.isEmpty()) box.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1, 0.5));
    box.getSize(size); box.getCenter(center);
    fitLight();
    contact.fit(box); contact.dirty = true;
    renderer.shadowMap.needsUpdate = true;
    const r = radius();
    if (!lastRadius || Math.abs(r - lastRadius) / lastRadius > 0.1) { const first = !lastRadius; lastRadius = r; frame({ animate: !first && !reduced() }); }
    else if (view !== '3d') fitOrtho();
    requestRender();
  }
  function fitLight() {
    const r = Math.max(1, radius() * 1.4);
    /* ключевой свет: спереди-слева-сверху */
    key.position.set(center.x - r * 0.7, r * 2.6, center.z + r * 1.3);
    key.target.position.copy(center);
    const cam = key.shadow.camera;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.near = 0.1; cam.far = r * 6;
    cam.updateProjectionMatrix();
  }

  /* ---------- виды ---------- */
  function frame({ animate = true } = {}) {
    if (view === '3d') {
      const dir = camera === persp ? persp.position.clone().sub(controls.target).normalize() : dir3q();
      if (!isFinite(dir.x) || dir.lengthSq() < 0.5) dir.copy(dir3q());
      const fd = framingDist(dir);
      const to = { pos: center.clone().add(dir.multiplyScalar(fd)), target: center.clone(), fov: FOV };
      if (animate && !reduced()) startAnim(persp.position.clone(), controls.target.clone(), persp.fov, to.pos, to.target, FOV, 500, null);
      else { persp.position.copy(to.pos); controls.target.copy(to.target); persp.fov = FOV; persp.updateProjectionMatrix(); controls.update(); }
      controls.minDistance = fd * 0.6; controls.maxDistance = fd * 2.5;
    } else {
      const t = viewTarget(view);
      ortho.zoom = 1; fitOrtho();
      ortho.position.copy(t).add(DIRS[view].clone().multiplyScalar(50)); ortho.lookAt(t);
      controls.target.copy(t); controls.update();
    }
    emit('frame');
    requestRender();
  }

  function setView(v, { animate = true } = {}) {
    if (!['3d', 'front', 'side', 'top'].includes(v) || v === view) { if (v === view) frame({ animate }); return; }
    const from = view; view = v;
    const instant = !animate || reduced();
    const T = viewTarget(v === '3d' ? 'front' : v);
    if (v !== '3d') {
      /* перспектива → наклон к оси с сужением угла (dolly-zoom) → ортография */
      const half = orthoHalf(v);
      const endDir = DIRS[v].clone();
      if (from !== '3d') { /* из одного орто-вида в другой: через перспективу 6° */ enterPerspFromOrtho(); }
      const startDir = persp.position.clone().sub(controls.target).normalize();
      const startHalf = Math.tan(THREE.MathUtils.degToRad(persp.fov / 2)) * persp.position.distanceTo(controls.target);
      controls.enableRotate = false; controls.enablePan = true;
      controls.minPolarAngle = 0; controls.maxPolarAngle = Math.PI; // иначе update() наклонит камеру на 2–10°
      const finish = () => {
        fitOrtho(half); ortho.zoom = 1;
        ortho.position.copy(T).add(endDir.clone().multiplyScalar(50)); ortho.up.set(0, 1, 0); ortho.lookAt(T);
        useCamera(ortho); floor.visible = false; controls.target.copy(T); controls.update(); emit('view', v); requestRender();
      };
      if (instant) { finish(); return; }
      anim = { start: performance.now(), dur: 650, kind: 'toOrtho', startDir, endDir, startHalf, endHalf: half, t0: controls.target.clone(), t1: T, f0: persp.fov, f1: 6, done: finish, cancelable: false };
      requestRender();
    } else {
      enterPerspFromOrtho();
      floor.visible = true;
      controls.enableRotate = true; controls.enablePan = !phone;
      controls.minPolarAngle = THREE.MathUtils.degToRad(10); controls.maxPolarAngle = THREE.MathUtils.degToRad(88);
      const endDir = dir3q(), dist = framingDist(endDir);
      const startDir = persp.position.clone().sub(controls.target).normalize();
      const startHalf = Math.tan(THREE.MathUtils.degToRad(persp.fov / 2)) * persp.position.distanceTo(controls.target);
      const endHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * dist;
      const finish = () => { emit('view', v); requestRender(); };
      if (instant) { persp.fov = FOV; persp.updateProjectionMatrix(); persp.position.copy(center).add(endDir.multiplyScalar(dist)); controls.target.copy(center); controls.update(); finish(); return; }
      anim = { start: performance.now(), dur: 650, kind: 'toPersp', startDir, endDir, startHalf, endHalf, t0: controls.target.clone(), t1: center.clone(), f0: persp.fov, f1: FOV, done: finish, cancelable: false };
      requestRender();
    }
  }
  /* из ортографии в узкую перспективу с тем же кадром */
  function enterPerspFromOrtho() {
    if (camera !== ortho) return;
    const half = (ortho.top - ortho.bottom) / 2 / ortho.zoom;
    const dir = ortho.position.clone().sub(controls.target).normalize();
    persp.fov = 6; persp.updateProjectionMatrix();
    const dist = half / Math.tan(THREE.MathUtils.degToRad(3));
    persp.up.set(0, 1, 0);
    persp.position.copy(controls.target).add(dir.multiplyScalar(dist));
    persp.lookAt(controls.target);
    useCamera(persp);
  }
  function slerpDir(a, b, t) {
    const q = new THREE.Quaternion().setFromUnitVectors(a, b);
    const qi = new THREE.Quaternion().slerp(q, t);
    return a.clone().applyQuaternion(qi).normalize();
  }
  function stepAnim(now) {
    const a = anim;
    if (a.kind === 'move') {
      const t = Math.min(1, (now - a.start) / a.dur), k = ease(t);
      persp.position.lerpVectors(a.p0, a.p1, k); controls.target.lerpVectors(a.t0, a.t1, k);
      persp.fov = a.f0 + (a.f1 - a.f0) * k; persp.updateProjectionMatrix(); persp.lookAt(controls.target);
      if (t >= 1) { anim = null; controls.update(); if (a.done) a.done(); return false; }
      return true;
    }
    const t = Math.min(1, (now - a.start) / a.dur), k = ease(t);
    const dir = slerpDir(a.startDir, a.endDir, k);
    const fov = a.f0 + (a.f1 - a.f0) * k;
    const half = a.startHalf + (a.endHalf - a.startHalf) * k;
    const tgt = a.t0.clone().lerp(a.t1, k);
    persp.fov = fov; persp.updateProjectionMatrix();
    const dist = half / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    persp.position.copy(tgt).add(dir.multiplyScalar(dist));
    persp.up.set(0, 1, 0);
    if (Math.abs(dir.y) > 0.999) persp.up.set(0, 0, -1);
    persp.lookAt(tgt); controls.target.copy(tgt);
    if (t >= 1) { anim = null; persp.up.set(0, 1, 0); a.done(); return false; }
    return true;
  }
  function startAnim(p0, t0, f0, p1, t1, f1, dur, done) {
    anim = { kind: 'move', start: performance.now(), dur, p0, t0, f0, p1, t1, f1, done, cancelable: true };
    requestRender();
  }

  /* ---------- размеры (SVG) ---------- */
  function setDims(list) {
    const had = !!dimList;
    dimList = list && list.length ? list : null;
    if (!dimList) overlay.replaceChildren();
    if (view !== '3d' && camera === ortho && had !== !!dimList) { fitOrtho(); ortho.updateProjectionMatrix(); }
    requestRender();
  }
  const fmt = (m) => { const v = Math.round(m * 1000) / 10; return (Number.isInteger(v) ? String(v) : String(v).replace('.', ',')); };
  function toScreen(p) {
    const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera);
    return [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H, v.z];
  }
  function drawDims() {
    const L = [], T = [];
    const line = (x1, y1, x2, y2) => L.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" />`);
    const label = (x, y, ang, txt) => T.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" transform="rotate(${ang} ${x.toFixed(1)} ${y.toFixed(1)})">${txt}</text>`);
    const tick = (x, y) => line(x - 3.5, y + 3.5, x + 3.5, y - 3.5);
    if (view === '3d') {
      /* 3D: Ш × Г × В по габариту — вдоль нижних рёбер и переднего правого ребра */
      const mn = box.min, mx = box.max;
      const c = toScreen([center.x, center.y, center.z]);
      const seg = (p, q, val) => {
        const a = toScreen(p), b = toScreen(q);
        let dx = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dx, dy); if (len < 8) return;
        let nx = -dy / len, ny = dx / len;
        if (((a[0] + b[0]) / 2 - c[0]) * nx + ((a[1] + b[1]) / 2 - c[1]) * ny < 0) { nx = -nx; ny = -ny; }
        const off = 22, A = [a[0] + nx * off, a[1] + ny * off], B = [b[0] + nx * off, b[1] + ny * off];
        line(a[0] + nx * 5, a[1] + ny * 5, A[0] + nx * 5, A[1] + ny * 5); line(b[0] + nx * 5, b[1] + ny * 5, B[0] + nx * 5, B[1] + ny * 5);
        line(A[0], A[1], B[0], B[1]); tick(A[0], A[1]); tick(B[0], B[1]);
        let ang = (Math.atan2(dy, dx) * 180) / Math.PI; if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
        label((A[0] + B[0]) / 2 + nx * 10, (A[1] + B[1]) / 2 + ny * 10, ang, fmt(val));
      };
      seg([mn.x, 0, mx.z], [mx.x, 0, mx.z], size.x);
      seg([mx.x, 0, mx.z], [mx.x, 0, mn.z], size.z);
      seg([mx.x, 0, mx.z], [mx.x, mx.y, mx.z], size.y);
    } else {
      /* орто-виды: ряды размеров снаружи силуэта, ярус 2 — ближе всего, 0 — дальше */
      let sx0 = Infinity, sx1 = -Infinity, sy0 = Infinity, sy1 = -Infinity;
      for (let i = 0; i < 8; i++) { const p = toScreen([i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z]); sx0 = Math.min(sx0, p[0]); sx1 = Math.max(sx1, p[0]); sy0 = Math.min(sy0, p[1]); sy1 = Math.max(sy1, p[1]); }
      const rowOff = (tier) => 14 + (2 - (tier ?? 1)) * 18;
      for (const d of dimList) {
        const a = toScreen(d.a), b = toScreen(d.b);
        const horiz = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
        const len = horiz ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]);
        if (len < 3) continue;
        const place = d.place || (horiz ? 'bottom' : 'right');
        const off = rowOff(d.tier);
        const txt = fmt(d.value);
        const tw = txt.length * 6.6 + 4;
        if (horiz) {
          const y = place === 'top' ? sy0 - off : sy1 + off, sgn = place === 'top' ? -1 : 1;
          line(a[0], a[1] + sgn * 3, a[0], y + sgn * 4); line(b[0], b[1] + sgn * 3, b[0], y + sgn * 4);
          line(a[0], y, b[0], y); tick(a[0], y); tick(b[0], y);
          const mid = (a[0] + b[0]) / 2, fits = tw < len - 4;
          label(fits ? mid : Math.max(a[0], b[0]) + tw / 2 + 4, y - 7, 0, txt);
        } else {
          const x = place === 'left' ? sx0 - off : sx1 + off, sgn = place === 'left' ? -1 : 1;
          line(a[0] + sgn * 3, a[1], x + sgn * 4, a[1]); line(b[0] + sgn * 3, b[1], x + sgn * 4, b[1]);
          line(x, a[1], x, b[1]); tick(x, a[1]); tick(x, b[1]);
          const mid = (a[1] + b[1]) / 2, fits = tw < len - 4;
          label(x - 7, fits ? mid : Math.min(a[1], b[1]) - tw / 2 - 4, -90, txt);
        }
      }
    }
    overlay.innerHTML = `<g fill="none" stroke="#111" stroke-width="0.8" stroke-linecap="round">${L.join('')}</g>` +
      `<g fill="#111" stroke="#F3F2EE" stroke-width="3" paint-order="stroke" font-family="Montserrat, 'Helvetica Neue', Arial, sans-serif" font-size="11" font-weight="500" text-anchor="middle" dominant-baseline="middle" style="font-variant-numeric: tabular-nums; letter-spacing: .02em">${T.join('')}</g>`;
  }

  /* ---------- студия ---------- */
  function setStudio(on) { studioOn = !!on; studio.visible = studioOn; if (studioOn) scene.background = bgDirect; requestRender(); }

  /* ---------- снимок ---------- */
  async function snapshot({ width = 2400, height = 1600, view: sv = '3q', watermark = true, background = BG } = {}) {
    const prevSize = renderer.getSize(new THREE.Vector2()), prevPR = renderer.getPixelRatio();
    const maxTex = renderer.capabilities.maxTextureSize || 4096;
    const ss = Math.min(2, Math.floor(maxTex / Math.max(width, height) * 10) / 10) || 1;
    const RW = Math.round(width * ss), RH = Math.round(height * ss);
    let cam;
    if (sv === '3q' || sv === '3d') {
      cam = new THREE.PerspectiveCamera(FOV, RW / RH, 0.05, 200);
      const dist = fitDistance(dir3q(), FOV, RW / RH, 0.8);
      cam.position.copy(center).add(dir3q().multiplyScalar(dist)); cam.lookAt(center);
    } else if (sv === 'current') {
      cam = camera.clone(); if (cam.isPerspectiveCamera) { cam.aspect = RW / RH; } else { const h = (camera.top - camera.bottom) / 2 / camera.zoom; cam.left = -h * RW / RH; cam.right = h * RW / RH; cam.top = h; cam.bottom = -h; cam.zoom = 1; }
      cam.updateProjectionMatrix();
    } else {
      cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.05, 200);
      const savedW = W, savedH = H; W = RW; H = RH;
      const h = orthoHalf(sv); W = savedW; H = savedH;
      cam.left = -h * RW / RH; cam.right = h * RW / RH; cam.top = h; cam.bottom = -h; cam.updateProjectionMatrix();
      const t = viewTarget(sv); cam.position.copy(t).add(DIRS[sv].clone().multiplyScalar(50)); cam.lookAt(t);
    }
    const prevBg = scene.background;
    const useComp = aoMode !== 'off';
    scene.background = useComp ? preToneMapped(background, renderer.toneMappingExposure) : new THREE.Color(background);
    const prevMap = key.shadow.mapSize.clone();
    key.shadow.mapSize.set(4096, 4096); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
    renderer.shadowMap.needsUpdate = true;
    renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
    const out = document.createElement('canvas'); out.width = width; out.height = height;
    const g = out.getContext('2d');
    try {
      if (aoMode !== 'off' && ensureComposer()) {
        composer.setPixelRatio(1); composer.setSize(RW, RH);
        gtao.updateGtaoMaterial({ samples: 32 });
        setPassCamera(cam); composer.render();
      } else renderer.render(scene, cam);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(canvas, 0, 0, RW, RH, 0, 0, width, height);
    } finally {
      scene.background = prevBg;
      key.shadow.mapSize.copy(prevMap); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
      renderer.shadowMap.needsUpdate = true;
      renderer.setPixelRatio(prevPR); renderer.setSize(prevSize.x, prevSize.y, false);
      if (composer) { composer.setPixelRatio(prevPR); composer.setSize(prevSize.x, prevSize.y); gtao.updateGtaoMaterial({ samples: phone ? 8 : 16 }); setPassCamera(camera); }
      requestRender();
    }
    if (watermark) {
      const fs = Math.round(height * 0.02);
      g.font = `500 ${fs}px Montserrat, 'Helvetica Neue', Arial, sans-serif`;
      if ('letterSpacing' in g) g.letterSpacing = `${Math.round(fs * 0.28)}px`;
      g.fillStyle = 'rgba(17,17,17,0.72)'; g.textBaseline = 'alphabetic';
      g.fillText('RICCA DESIGNS', Math.round(height * 0.04), Math.round(height - height * 0.04));
    }
    return new Promise((res) => out.toBlob((b) => res(b), 'image/png'));
  }

  const offMat = onMaterialUpdate(() => requestRender());
  const bgDirect = new THREE.Color(BG);
  let bgComposite = preToneMapped(BG, renderer.toneMappingExposure);

  const stage = {
    renderer, scene, controls, canvas, root, studio, overlay,
    get camera() { return camera; },
    get view() { return view; },
    get box() { return box.clone(); },
    supportsPhotoreal: false,
    setObject, setView, frame, setDims, setStudio, requestRender, snapshot, resize,
    photoreal() { return null; },
    on(e, fn) { (listeners[e] = listeners[e] || []).push(fn); return stage; },
    off(e, fn) { listeners[e] = (listeners[e] || []).filter((f) => f !== fn); return stage; },
    renderNow() { renderFrame(false); },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); clearTimeout(idleT); offMat();
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      controls.dispose(); contact.dispose(); envRT.dispose();
      if (composer) composer.dispose();
      renderer.dispose(); canvas.remove(); overlay.remove();
    },
  };
  resize();
  frame({ animate: false });
  return stage;
}

/* ---------- контактная тень: глубина снизу → размытие → плоскость на полу ---------- */
function makeContactShadow(renderer) {
  const RES = 512, HEIGHT = 0.3, DARK = 1.8, OPACITY = 0.6;
  const rt = new THREE.WebGLRenderTarget(RES, RES); rt.texture.generateMipmaps = false;
  const rtB = new THREE.WebGLRenderTarget(RES, RES); rtB.texture.generateMipmaps = false;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, opacity: OPACITY, depthWrite: false, toneMapped: false }));
  plane.renderOrder = 2; plane.position.y = 0.001; plane.scale.y = -1; plane.name = 'contact-shadow';
  plane.material.color.set(0x2a251f);
  const cam = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, HEIGHT);
  cam.rotation.x = Math.PI / 2;
  const depthMat = new THREE.MeshDepthMaterial();
  depthMat.userData.darkness = { value: DARK };
  depthMat.onBeforeCompile = (sh) => {
    sh.uniforms.darkness = depthMat.userData.darkness;
    sh.fragmentShader = `uniform float darkness;\n${sh.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );')}`;
  };
  depthMat.depthTest = false; depthMat.depthWrite = false;
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
      void main(){ vec4 s = vec4(0.0);
        s += texture2D(tDiffuse, vUv - 4.0*dir) * 0.051; s += texture2D(tDiffuse, vUv - 3.0*dir) * 0.0918; s += texture2D(tDiffuse, vUv - 2.0*dir) * 0.12245;
        s += texture2D(tDiffuse, vUv - 1.0*dir) * 0.1531; s += texture2D(tDiffuse, vUv) * 0.1633; s += texture2D(tDiffuse, vUv + 1.0*dir) * 0.1531;
        s += texture2D(tDiffuse, vUv + 2.0*dir) * 0.12245; s += texture2D(tDiffuse, vUv + 3.0*dir) * 0.0918; s += texture2D(tDiffuse, vUv + 4.0*dir) * 0.051;
        gl_FragColor = s; }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat);
  const qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const qscene = new THREE.Scene(); qscene.add(quad);
  let size = 1;
  const blur = (amount) => {
    blurMat.uniforms.tDiffuse.value = rt.texture; blurMat.uniforms.dir.value.set(amount / RES, 0);
    renderer.setRenderTarget(rtB); renderer.render(qscene, qcam);
    blurMat.uniforms.tDiffuse.value = rtB.texture; blurMat.uniforms.dir.value.set(0, amount / RES);
    renderer.setRenderTarget(rt); renderer.render(qscene, qcam);
  };
  return {
    plane, dirty: true,
    fit(box) {
      const s = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) + 0.8;
      size = s;
      const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
      plane.scale.set(s, -1, s); plane.position.set(cx, 0.001, cz);
      cam.left = -s / 2; cam.right = s / 2; cam.top = s / 2; cam.bottom = -s / 2; cam.updateProjectionMatrix();
      cam.position.set(cx, 0, cz);
    },
    update(scene, root) {
      this.dirty = false;
      const bg = scene.background, env = scene.environment;
      scene.background = null; scene.environment = null;
      const vis = [];
      scene.children.forEach((c) => { if (c !== root) { vis.push([c, c.visible]); c.visible = false; } });
      scene.overrideMaterial = depthMat;
      const prevClear = renderer.getClearAlpha(), prevCol = renderer.getClearColor(new THREE.Color());
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
      scene.overrideMaterial = null;
      blur(3.5); blur(1.4);
      renderer.setRenderTarget(null);
      renderer.setClearColor(prevCol, prevClear);
      vis.forEach(([c, v]) => (c.visible = v));
      scene.background = bg; scene.environment = env;
    },
    dispose() { rt.dispose(); rtB.dispose(); plane.geometry.dispose(); plane.material.dispose(); blurMat.dispose(); quad.geometry.dispose(); depthMat.dispose(); },
  };
}
