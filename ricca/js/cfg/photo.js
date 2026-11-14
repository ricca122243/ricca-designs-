/* RICCA · конструктор — «Фото комнаты»: мебель на фотографии вашей комнаты.
   Клиент снимает комнату (или берёт фото из галереи) → на фото появляется текущий вариант из конструктора в реальном
   масштабе → двигает его пальцем по полу, поворачивает, меняет ткань → сохраняет картинку или отправляет в WhatsApp.
   Работает на любом телефоне и компьютере (без AR и датчиков): фото — фон сцены, камера three.js настроена как
   обычный телефонный кадр комнаты (высота 1,4 м, наклон вниз 8°, объектив 26 мм), мебель стоит на невидимом полу
   и отбрасывает на него мягкую тень — так она «встаёт» в комнату. Свет подстраивается под фото (яркость и оттенок),
   высоту съёмки и наклон клиент может поправить двумя ползунками, если мебель кажется «висящей» или «утопленной».
   Ничего не отправляется наружу: фото остаётся в браузере (canvas/blob), в адрес не пишется. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const DEG = Math.PI / 180;
const DEF = { eye: 1.4, tilt: 8, dist: 3.2 };
const FOV = { portrait: 66, landscape: 48 };          // телефон 26 мм: ≈69° по длинной стороне кадра, ≈49° по короткой
const LIGHT = { env: 0.42, hemi: 0.3, key: 1.35, fill: 0.3, exposure: 0.98 };
const LIM = { x: 8, near: 1.2, far: 14, eye: [0.6, 2.2], tilt: [-5, 40] };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const el = (tag, cls) => { const e = document.createElement(tag); e.className = cls; return e; };

export function mountPhoto({ host, engine, getCurrent, onChange } = {}) {
  /* ═════════ DOM: обёртка → рамка по пропорции фото (картинка + прозрачный WebGL сверху) ═════════ */
  host.innerHTML = '';
  const wrap = el('div', 'ph'); host.appendChild(wrap);
  const box = el('div', 'ph__box'); wrap.appendChild(box);
  const img = el('img', 'ph__bg'); img.alt = ''; img.decoding = 'async'; box.appendChild(img);
  const canvas = el('canvas', 'ph__gl'); box.appendChild(canvas);
  const hint = el('p', 'ph__hint'); hint.hidden = true; wrap.appendChild(hint);

  /* ═════════ three ═════════ */
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }); } catch (e) { throw new Error('webgl'); }
  if (!renderer.getContext()) throw new Error('webgl');
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = LIGHT.exposure;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV.portrait, 1, 0.05, 80);
  /* окружение для PBR-материалов — своё (текстуры-рендертаргеты между WebGL-контекстами не делятся) */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04); pmrem.dispose();
  scene.environment = envRT.texture; scene.environmentIntensity = LIGHT.env;
  const hemi = new THREE.HemisphereLight(0xffffff, 0xb8b0a4, LIGHT.hemi); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff6ec, LIGHT.key); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight(0xeef2f8, LIGHT.fill); scene.add(fill); scene.add(fill.target);
  /* пол: невидим, только принимает тень */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ color: 0x1f2226, opacity: 0.42, depthWrite: false }));
  floor.receiveShadow = true; scene.add(floor);
  const root = new THREE.Group(); scene.add(root);

  /* ═════════ состояние ═════════ */
  const st = { photo: null, w: 0, h: 0, eye: DEF.eye, tilt: DEF.tilt, x: 0, z: -DEF.dist, rot: 0, bgCanvas: null };
  let piece = null, dims = { w: 1, d: 1, h: 1 }, raf = 0, active = false, W = 1, H = 1, dragging = null;

  function fitCamera() {
    camera.aspect = W / H;
    camera.fov = (st.w ? st.w > st.h : W > H) ? FOV.landscape : FOV.portrait;
    camera.position.set(0, st.eye, 0);
    camera.rotation.set(-st.tilt * DEG, 0, 0);
    camera.updateProjectionMatrix();
  }
  function placeLights() {
    const r = Math.max(1.2, Math.max(dims.w, dims.d) * 1.3);
    key.position.set(st.x - r * 0.9, r * 1.9, st.z + r * 1.1); key.target.position.set(st.x, 0, st.z);
    fill.position.set(st.x + r * 1.5, r * 1.1, st.z + r * 2.2); fill.target.position.set(st.x, 0, st.z);
    const c = key.shadow.camera; c.left = -r * 1.4; c.right = r * 1.4; c.top = r * 1.4; c.bottom = -r * 1.4; c.near = 0.1; c.far = r * 8; c.updateProjectionMatrix();
    key.target.updateMatrixWorld(); fill.target.updateMatrixWorld();
  }
  function placePiece() {
    if (!piece) return;
    piece.position.set(st.x, 0, st.z);
    piece.rotation.y = st.rot * DEG;
    placeLights();
  }
  function resize() {
    const r = wrap.getBoundingClientRect();
    const rw = Math.max(1, r.width), rh = Math.max(1, r.height);
    let bw = rw, bh = rh;
    if (st.w) { const k = Math.min(rw / st.w, rh / st.h); bw = Math.max(1, Math.round(st.w * k)); bh = Math.max(1, Math.round(st.h * k)); }
    box.style.width = `${bw}px`; box.style.height = `${bh}px`;
    W = bw; H = bh;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    fitCamera(); render();
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null;
  if (ro) ro.observe(wrap); else window.addEventListener('resize', resize);
  const offMat = engine.onMaterialUpdate ? engine.onMaterialUpdate(() => render()) : null;

  function render() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (active && st.photo) renderer.render(scene, camera); }); }

  /* ═════════ фото ═════════ */
  async function setPhoto(fileOrBlob) {
    if (!fileOrBlob) return;
    const bmp = await fileToBitmap(fileOrBlob);
    const c = document.createElement('canvas');
    /* до 2000 px по длинной стороне — хватает экрану и снимку, а память телефона не страдает */
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) bmp.close();
    st.w = c.width; st.h = c.height; st.bgCanvas = c;
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.92));
    if (st.photo) URL.revokeObjectURL(st.photo);
    st.photo = URL.createObjectURL(blob);
    img.src = st.photo;
    wrap.classList.add('has-photo');
    tuneLight(c);
    /* мебель — по центру кадра, в 3,2 м от камеры (обычная дистанция съёмки комнаты) */
    st.x = 0; st.z = -DEF.dist; st.rot = 0;
    placePiece();
    showHint(matchMedia('(pointer: coarse)').matches ? 'Тяните мебель по полу · двумя пальцами — поворот и ближе/дальше' : 'Тяните мебель мышью по полу · колесо — ближе/дальше');
    resize();
    if (onChange) onChange(api);
  }
  async function fileToBitmap(f) {
    if (typeof createImageBitmap === 'function') {
      try { return await createImageBitmap(f, { imageOrientation: 'from-image' }); } catch (e) { /* старый Safari */ }
    }
    const url = URL.createObjectURL(f);
    try {
      const im = new Image(); im.src = url; await im.decode();
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0);
      return c;
    } finally { URL.revokeObjectURL(url); }
  }
  /* свет — под фото: тёмная комната → мебель темнее, тёплый свет → тёплый ключевой, цвет пола → отсвет снизу */
  function tuneLight(c) {
    try {
      const s = document.createElement('canvas'); s.width = 32; s.height = 32;
      const g = s.getContext('2d'); g.drawImage(c, 0, 0, 32, 32);
      const d = g.getImageData(0, 0, 32, 32).data;
      let r = 0, gg = 0, b = 0, fr = 0, fg = 0, fb = 0, fn = 0;
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const i = (y * 32 + x) * 4; r += d[i]; gg += d[i + 1]; b += d[i + 2];
        if (y >= 22) { fr += d[i]; fg += d[i + 1]; fb += d[i + 2]; fn++; }
      }
      const n = 1024; r /= n * 255; gg /= n * 255; b /= n * 255;
      const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
      renderer.toneMappingExposure = clamp(0.78 + (lum - 0.45) * 0.7, 0.7, 1.12);
      const mx = Math.max(r, gg, b, 0.01);
      key.color.setRGB(1 - (1 - r / mx) * 0.3, 1 - (1 - gg / mx) * 0.3, 1 - (1 - b / mx) * 0.3);
      const fl = new THREE.Color(fr / (fn * 255), fg / (fn * 255), fb / (fn * 255)); fl.lerp(new THREE.Color(0xffffff), 0.35);
      hemi.groundColor.copy(fl);
    } catch (e) { /* без подстройки */ }
  }
  function showHint(text, ms = 3800) { hint.textContent = text; hint.hidden = false; clearTimeout(showHint.t); showHint.t = setTimeout(() => { hint.hidden = true; }, ms); }

  /* ═════════ мебель ═════════ */
  function adopt(g) {
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = false;
      /* металл в materials.js держит карту отражений студийного рендерера — здесь нужна своя */
      const fix = (m) => { if (m && m.envMap && m.envMap !== envRT.texture) { const c = m.clone(); c.envMap = envRT.texture; c.userData = m.userData; return c; } return m; };
      o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material);
    });
  }
  function setPiece(group, d) {
    if (piece) root.remove(piece);
    piece = group; dims = d || dims;
    if (piece) { adopt(piece); root.add(piece); }
    placePiece(); render();
  }
  function refresh() {
    const cur = getCurrent();
    try {
      const mats = engine.materialSet({ type: cur.type, params: cur.params, fabric: cur.fabric, quality: 'mid' });
      const ex = engine.exact ? engine.exact() : null;
      const g = ex ? ex.clone(true) : engine.build(cur.type, cur.params, mats, { quality: 'mid' });
      if (ex && engine.setMaterials) engine.setMaterials(g, mats);
      const d = engine.dims(cur.type, cur.params);
      const old = piece; setPiece(g, d);
      if (old && old !== g && engine.disposePiece && !(old.name || '').startsWith('exact:')) engine.disposePiece(old);
      Object.values(mats).forEach((m) => { if (m && m.userData && m.userData.ready) m.userData.ready.then(render).catch(() => {}); });
    } catch (e) { console.warn('photo: модель', e); }
  }

  /* ═════════ указатель: тянуть по полу, двумя пальцами — поворот и дистанция, колесо — ближе/дальше ═════════ */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const pts = new Map();
  function floorAt(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (!piece || !st.photo) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (x) { /* */ }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      const p = floorAt(e.clientX, e.clientY);
      dragging = p ? { dx: st.x - p.x, dz: st.z - p.z } : null;
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      dragging = { two: true, ang: Math.atan2(b.y - a.y, b.x - a.x), rot0: st.rot, dist: Math.hypot(b.x - a.x, b.y - a.y), z0: st.z };
    }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId) || !dragging) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dragging.two && pts.size === 2) {
      const [a, b] = [...pts.values()];
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      st.rot = Math.round(dragging.rot0 + (ang - dragging.ang) / DEG);
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      st.z = clamp(dragging.z0 * (dragging.dist / Math.max(20, dist)), -LIM.far, -LIM.near);
    } else if (!dragging.two) {
      const p = floorAt(e.clientX, e.clientY); if (!p) return;
      st.x = clamp(p.x + dragging.dx, -LIM.x, LIM.x); st.z = clamp(p.z + dragging.dz, -LIM.far, -LIM.near);
    }
    placePiece(); render();
  });
  const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2 && dragging && dragging.two) dragging = null; if (!pts.size) { dragging = null; if (onChange) onChange(api); } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', (e) => { if (!piece || !st.photo) return; e.preventDefault(); st.z = clamp(st.z * (e.deltaY > 0 ? 1.05 : 0.95), -LIM.far, -LIM.near); placePiece(); render(); }, { passive: false });

  /* ═════════ снимок: фото + мебель + знак ═════════ */
  async function snapshot({ watermark = true } = {}) {
    if (!st.bgCanvas || !piece) return null;
    const out = document.createElement('canvas'); out.width = st.w; out.height = st.h;
    const g = out.getContext('2d');
    g.drawImage(st.bgCanvas, 0, 0);
    /* 3D-слой — в размере фото, тень покрупнее */
    const prevPR = renderer.getPixelRatio(), pw = W, ph = H;
    renderer.setPixelRatio(1); renderer.setSize(st.w, st.h, false);
    W = st.w; H = st.h; fitCamera();
    key.shadow.mapSize.set(4096, 4096); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
    renderer.render(scene, camera);
    g.drawImage(canvas, 0, 0, st.w, st.h);
    key.shadow.mapSize.set(2048, 2048); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; }
    W = pw; H = ph; renderer.setPixelRatio(prevPR); renderer.setSize(W, H, false); fitCamera(); render();
    if (watermark) {
      const s = Math.round(Math.max(st.w, st.h) / 46);
      g.font = `500 ${s}px Montserrat, Arial, sans-serif`; g.fillStyle = 'rgba(255,255,255,.92)'; g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = s * 0.6;
      g.textAlign = 'right'; g.textBaseline = 'alphabetic'; g.fillText('RICCA DESIGNS', st.w - s, st.h - s);
    }
    return new Promise((res) => out.toBlob(res, 'image/jpeg', 0.92));
  }

  const api = {
    enter() { active = true; resize(); refresh(); },
    leave() { active = false; },
    setPhoto, refresh, snapshot, render,
    get hasPhoto() { return !!st.photo; },
    get state() { return st; },
    set(k, v) {
      if (k === 'eye') st.eye = clamp(+v, LIM.eye[0], LIM.eye[1]);
      else if (k === 'tilt') st.tilt = clamp(+v, LIM.tilt[0], LIM.tilt[1]);
      else if (k === 'rot') st.rot = Math.round(+v);
      else return;
      fitCamera(); placePiece(); render();
    },
    rotate(d) { st.rot = Math.round(st.rot + d); placePiece(); render(); },
    closer(d) { st.z = clamp(st.z + d, -LIM.far, -LIM.near); placePiece(); render(); },
    center() { st.x = 0; st.z = -DEF.dist; st.rot = 0; placePiece(); render(); },
    reset() { st.eye = DEF.eye; st.tilt = DEF.tilt; api.center(); fitCamera(); render(); },
    dispose() { if (ro) ro.disconnect(); else window.removeEventListener('resize', resize); if (offMat) offMat(); if (st.photo) URL.revokeObjectURL(st.photo); envRT.dispose(); renderer.dispose(); },
  };
  resize();
  return api;
}
