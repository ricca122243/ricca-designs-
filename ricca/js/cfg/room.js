/* RICCA · конструктор — «Моя комната»: планировщик.
   Комната W × L × H (пол — светлый дуб, стены 10 см с плинтусом, ближние к камере стены прячутся), мебель: «Мой вариант»
   и быстрые предметы. Выбор и перетаскивание по полу (мышь и палец), поворот 15° / 90°, копия, удаление, «Изменить».
   Камера: обзор вокруг комнаты, «Облёт» (сам), «Взгляд из комнаты» (с высоты глаз 1,6 м), «Сбросить вид».
   Состояние — localStorage (ricca.room.v1) и адрес #room=… Рисует тот же stage.js, студия выключена. */
import * as THREE from 'three';
import { summaryLines, cfgId } from './share.js';

const LIM = { W: [2, 12], L: [2, 12], H: [2.4, 4] };
const WALL_T = 0.10, SKIRT_H = 0.06, SKIRT_T = 0.012, EYE_H = 1.6;
const WALL_COLOR = '#EEEDE8';
const QUICK = {
  sofa: {}, armchair: {}, chair: {}, pouf: {},
  table: { shape: 'rect', w: 1.8, d: 0.9 },
  bed: { mw: 1.6, ml: 2.0 },
};
const WALL_TYPES = new Set(['sofa', 'corner', 'ushape', 'modular', 'bed']);
const DEG = Math.PI / 180;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const round1 = (m) => Math.round(m * 100) / 100;                     // шаг 1 см
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICONS = 'img/cfg/icons.svg';
const ico = (id) => `<svg class="ico" aria-hidden="true"><use href="${ICONS}#${id}"/></svg>`;

export function mountRoom({ stage, panel, viewport, engine, share, fabrics, getCurrent, onEdit, onChange, initialHash = null, storageKey = 'ricca.room.v1' }) {
  const $ = (s) => panel.querySelector(s);
  const $$ = (s) => Array.from(panel.querySelectorAll(s));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = () => matchMedia('(max-width: 899px)').matches;
  const isHttp = /^https?:$/.test(location.protocol);

  /* ═════════ состояние ═════════ */
  const room = { W: 4.5, L: 3.8, H: 2.7, items: [] };
  let seq = 0, selected = null, editingId = null, active = false, gridOn = false;
  const nextId = () => `i${++seq}`;
  const dimsOf = (it) => { try { return engine.dims(it.type, it.params); } catch (e) { return { w: 1, d: 1, h: 1 }; } };
  const titleOf = (it) => share.titleOf(it.type, it.params || {});
  const fabricFor = (type, f) => (type === 'table' ? null : f || fabrics.defaultFabric());

  function normItem(raw) {
    if (!raw || !engine.DEFAULTS[raw.type]) return null;
    let params; try { params = engine.normalize(raw.type, raw.params || {}); } catch (e) { return null; }
    const fabric = raw.fabric || (raw.fabricRef && fabrics.findFabric(raw.fabricRef, fabrics.library)) || null;
    return { id: nextId(), type: raw.type, params, fabric: fabricFor(raw.type, fabric), x: +raw.x || 0, z: +raw.z || 0, rot: Math.round(+raw.rot || 0), mine: !!raw.mine };
  }
  function loadState() {
    let src = null;
    if (initialHash) { try { src = share.decodeRoom(initialHash, { defaults: engine.DEFAULTS }); src.fromHash = true; } catch (e) { src = null; } }
    if (!src) { try { const raw = localStorage.getItem(storageKey); if (raw) src = JSON.parse(raw); } catch (e) { src = null; } }
    if (!src || typeof src !== 'object') return;
    room.W = clamp(+src.W || 4.5, ...LIM.W); room.L = clamp(+src.L || 3.8, ...LIM.L); room.H = clamp(+src.H || 2.7, ...LIM.H);
    room.items = (Array.isArray(src.items) ? src.items : []).slice(0, 40).map(normItem).filter(Boolean);
    room.items.forEach(clampItem);
  }
  let saveT = 0;
  function persist() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ v: 1, W: room.W, L: room.L, H: room.H,
          items: room.items.map((it) => ({ type: it.type, params: it.params, fabricRef: fabrics.fabricRef(it.fabric), x: it.x, z: it.z, rot: it.rot, mine: it.mine || undefined })) }));
      } catch (e) { /* без localStorage — живём без него */ }
      if (active) { try { history.replaceState(null, '', '#room=' + encodeRoom()); } catch (e) { /* file:// */ } }
    }, 250);
    renderSend();
    if (onChange) try { onChange(api); } catch (e) { /* */ }
  }
  const encodeRoom = () => share.encodeRoom(room, { defaults: engine.DEFAULTS });
  const planLink = () => (isHttp ? `${location.origin}${location.pathname}#room=${encodeRoom()}` : '');

  /* сообщение в WhatsApp: размер комнаты, по строке на предмет; для «Моего варианта» — все выбранные параметры */
  function waText() {
    const fm = (m) => String(Math.round(m * 10) / 10).replace('.', ',');
    const lines = [`Здравствуйте! План комнаты из конструктора RICCA: ${fm(room.W)} × ${fm(room.L)} м, потолок ${fm(room.H)} м`];
    if (!room.items.length) lines.push('Мебель пока не расставлена.');
    room.items.forEach((it, i) => {
      const d = dimsOf(it);
      const st = { type: it.type, params: it.params, fabric: it.fabric, qty: 1, note: '' };
      let head = `${i + 1}. ${titleOf(it)} ${share.fmtCm(d.w)} × ${share.fmtCm(d.d)} см`;
      if (it.mine) {
        head += ` · № ${cfgId({ type: it.type, params: it.params, fabric: it.fabric })}`;
        lines.push(head);
        try {
          summaryLines(st, { dims: d }).filter((r) => !['Количество', 'Пожелание'].includes(r.label)).forEach((r) => lines.push(`   ${r.label}: ${r.value}`));
        } catch (e) { /* */ }
      } else lines.push(head);
    });
    const link = planLink(); if (link) lines.push(`План: ${link}`);
    lines.push('Рассчитайте, пожалуйста, стоимость.');
    return lines.join('\n');
  }
  const waHref = () => share.waUrl(waText());

  /* ═════════ 3D ═════════ */
  const has3D = !!(stage && stage.scene);
  const group = new THREE.Group(); group.name = 'room';
  const shell = new THREE.Group(); shell.name = 'room-shell';
  const itemsG = new THREE.Group(); itemsG.name = 'room-items';
  group.add(shell, itemsG);
  const nodes = new Map();      // id → { node, piece, outline, tint }
  const walls = [];
  let floorMesh = null, gridLines = null;
  const floorMat = has3D ? makeFloorMaterial(stage.renderer) : null;
  const wallMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(WALL_COLOR), roughness: 0.95, metalness: 0 });
  const skirtMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#F7F6F2'), roughness: 0.6, metalness: 0 });
  const outlineMat = new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.9, depthWrite: false });
  const tintMat = new THREE.MeshBasicMaterial({ color: 0xd2453a, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false });
  const noRay = () => {};

  function buildShell() {
    shell.children.slice().forEach((c) => { shell.remove(c); c.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); });
    walls.length = 0;
    const { W, L, H } = room;
    const fg = new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2);
    const uv = fg.attributes.uv, pos = fg.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + W / 2) / 1.2, (pos.getZ(i) + L / 2) / 1.2);  // доска 12 см, плитка 1,2 м
    floorMesh = new THREE.Mesh(fg, floorMat); floorMesh.receiveShadow = true; floorMesh.name = 'floor';
    shell.add(floorMesh);
    const mk = (n, len, cx, cz, rotY) => {
      const g = new THREE.Group(); g.name = 'wall-' + n.join(',');
      const wall = new THREE.Mesh(new THREE.BoxGeometry(len, H, WALL_T), wallMat); wall.position.y = H / 2; wall.receiveShadow = true;
      const sk = new THREE.Mesh(new THREE.BoxGeometry(len - 2 * WALL_T, SKIRT_H, SKIRT_T), skirtMat); sk.position.set(0, SKIRT_H / 2, WALL_T / 2 + SKIRT_T / 2); sk.receiveShadow = true;
      g.add(wall, sk); g.position.set(cx, 0, cz); g.rotation.y = rotY;
      g.userData.normal = new THREE.Vector3(...n);
      shell.add(g); walls.push(g);
    };
    /* стена: локальная +Z смотрит в комнату, наружная нормаль — n */
    mk([0, 0, -1], W + 2 * WALL_T, 0, -L / 2 - WALL_T / 2, 0);
    mk([0, 0, 1], W + 2 * WALL_T, 0, L / 2 + WALL_T / 2, Math.PI);
    mk([-1, 0, 0], L + 2 * WALL_T, -W / 2 - WALL_T / 2, 0, Math.PI / 2);
    mk([1, 0, 0], L + 2 * WALL_T, W / 2 + WALL_T / 2, 0, -Math.PI / 2);
    /* сетка 1 м */
    const pts = [];
    for (let x = Math.ceil(-W / 2 + 0.001); x <= W / 2 - 0.001; x++) pts.push(x, 0.002, -L / 2, x, 0.002, L / 2);
    for (let z = Math.ceil(-L / 2 + 0.001); z <= L / 2 - 0.001; z++) pts.push(-W / 2, 0.002, z, W / 2, 0.002, z);
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    gridLines = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.22, depthWrite: false }));
    gridLines.visible = gridOn; gridLines.raycast = noRay; gridLines.name = 'grid';
    shell.add(gridLines);
  }

  function roundRectPts(hw, hd, r, y) {
    const pts = []; const seg = 6;
    const corners = [[hw - r, hd - r, 0], [-hw + r, hd - r, 90], [-hw + r, -hd + r, 180], [hw - r, -hd + r, 270]];
    for (const [cx, cz, a0] of corners) for (let i = 0; i <= seg; i++) { const a = (a0 + (90 * i) / seg) * DEG; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r)); }
    return pts;
  }
  function buildNode(it) {
    const q = phone() ? 'low' : 'mid';
    const mats = engine.materialSet({ type: it.type, params: it.params, fabric: it.fabric, quality: q });
    const piece = engine.build(it.type, it.params, mats, { quality: q });
    const node = new THREE.Group(); node.name = 'room-item'; node.userData.itemId = it.id;
    node.add(piece);
    const d = dimsOf(it);
    const ol = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(roundRectPts(d.w / 2 + 0.03, d.d / 2 + 0.03, 0.05, 0.004)), outlineMat);
    ol.visible = false; ol.raycast = noRay; ol.renderOrder = 3; node.add(ol);
    const tint = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.d).rotateX(-Math.PI / 2), tintMat);
    tint.position.y = 0.003; tint.visible = false; tint.raycast = noRay; tint.renderOrder = 2; node.add(tint);
    itemsG.add(node);
    nodes.set(it.id, { node, piece, outline: ol, tint });
    place(it);
  }
  function dropNode(id) {
    const n = nodes.get(id); if (!n) return;
    itemsG.remove(n.node);
    engine.disposePiece(n.piece);
    n.outline.geometry.dispose(); n.tint.geometry.dispose();
    nodes.delete(id);
  }
  function place(it) {
    const n = nodes.get(it.id); if (!n) return;
    n.node.position.set(it.x, 0, it.z); n.node.rotation.y = it.rot * DEG;
  }
  const shadowsDirty = () => { if (has3D) stage.renderer.shadowMap.needsUpdate = true; };
  const redraw = () => { if (has3D && active) { shadowsDirty(); stage.requestRender(); } };

  /* ═════════ геометрия пятна: пределы и пересечения ═════════ */
  function halfExt(it) {
    const d = dimsOf(it), a = it.rot * DEG, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
    return { hx: c * d.w / 2 + s * d.d / 2, hz: s * d.w / 2 + c * d.d / 2 };
  }
  function clampItem(it) {
    const { hx, hz } = halfExt(it);
    it.x = hx >= room.W / 2 ? 0 : clamp(it.x, -room.W / 2 + hx, room.W / 2 - hx);
    it.z = hz >= room.L / 2 ? 0 : clamp(it.z, -room.L / 2 + hz, room.L / 2 - hz);
    it.x = round1(it.x); it.z = round1(it.z);
  }
  function overlaps(a, b) {
    const da = dimsOf(a), db = dimsOf(b);
    const ax = (t) => [[Math.cos(t), -Math.sin(t)], [Math.sin(t), Math.cos(t)]];
    const A = ax(a.rot * DEG), B = ax(b.rot * DEG);
    const dx = b.x - a.x, dz = b.z - a.z;
    const rad = (axes, d, v) => (d.w / 2) * Math.abs(axes[0][0] * v[0] + axes[0][1] * v[1]) + (d.d / 2) * Math.abs(axes[1][0] * v[0] + axes[1][1] * v[1]);
    for (const v of [...A, ...B]) {
      if (Math.abs(dx * v[0] + dz * v[1]) >= rad(A, da, v) + rad(B, db, v) - 0.005) return false;
    }
    return true;
  }
  function updateTints() {
    for (const it of room.items) {
      const n = nodes.get(it.id); if (!n) continue;
      n.tint.visible = room.items.some((o) => o !== it && overlaps(it, o));
    }
  }
  function findSpot(it) {
    const tryAt = (x, z, rot) => {
      const c = { ...it, x, z, rot }; clampItem(c);
      return room.items.some((o) => o.id !== it.id && overlaps(c, o)) ? null : c;
    };
    const d = dimsOf(it);
    if (WALL_TYPES.has(it.type)) {
      for (let k = 0; k <= 30; k++) for (const s of [1, -1]) { const r = tryAt(s * k * 0.1, -room.L / 2 + d.d / 2 + 0.02, 0); if (r) return r; }
      for (let k = 0; k <= 30; k++) for (const s of [1, -1]) { const r = tryAt(-room.W / 2 + d.d / 2 + 0.02, s * k * 0.1, 90); if (r) return r; }
    }
    for (let ring = 0; ring <= 40; ring++) {
      for (let i = -ring; i <= ring; i++) for (let j = -ring; j <= ring; j++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
        const r = tryAt(i * 0.15, j * 0.15 + 0.2, it.rot); if (r) return r;
      }
    }
    const c = { ...it, x: 0, z: 0 }; clampItem(c); return c;
  }

  /* ═════════ панель ═════════ */
  function renderDims() { $$('[data-room-dim]').forEach((inp) => { if (document.activeElement !== inp) inp.value = share.fmtCm(room[inp.dataset.roomDim]); }); }
  function renderItems() {
    const ul = $('[data-room-items]'); if (!ul) return;
    ul.innerHTML = room.items.map((it) => {
      const d = dimsOf(it);
      return `<li><button type="button" data-room-item="${it.id}" aria-pressed="${selected === it.id}"><span>${esc(titleOf(it))}${it.mine ? ' <i class="rp__mine-tag">мой вариант</i>' : ''}</span><span class="rp__sz">${share.fmtCm(d.w)} × ${share.fmtCm(d.d)} см</span></button></li>`;
    }).join('');
    const empty = $('[data-room-empty]'); if (empty) empty.hidden = room.items.length > 0;
  }
  function renderSend() { $$('[data-room-send]').forEach((a) => { a.href = waHref(); }); }
  let statusT = 0;
  function status(msg) {
    const el = $('[data-room-status]'); if (!el) return;
    el.textContent = msg; clearTimeout(statusT); if (msg) statusT = setTimeout(() => { el.textContent = ''; }, 3200);
  }

  /* панель инструментов над выбранным предметом */
  const bar = document.createElement('div');
  bar.className = 'rt'; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Выбранный предмет'); bar.hidden = true;
  bar.innerHTML = [
    ['rotl', 'i-rotl', 'Повернуть на 15° против часовой', '15°'], ['rotr', 'i-rotr', 'Повернуть на 15° по часовой', '15°'], ['rot90', 'i-rot90', 'Повернуть на 90°', '90°'],
    ['dup', 'i-dup', 'Дублировать', ''], ['edit', 'i-edit', 'Изменить', ''], ['del', 'i-delete', 'Удалить', ''],
  ].map(([k, i, t, x]) => `<button type="button" class="rt__b" data-rt="${k}" title="${t}" aria-label="${t}">${ico(i)}${x ? `<span class="rt__x" aria-hidden="true">${x}</span>` : ''}</button>`).join('');
  bar.addEventListener('pointerdown', (e) => e.stopPropagation());
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rt]'); if (!b || !selected) return;
    const k = b.dataset.rt;
    if (k === 'rotl') rotate(selected, 15); else if (k === 'rotr') rotate(selected, -15); else if (k === 'rot90') rotate(selected, 90);
    else if (k === 'dup') duplicate(selected); else if (k === 'del') remove(selected); else if (k === 'edit') edit(selected);
  });
  function placeBar() {
    if (!has3D || !active || !selected || mode === 'tour') { bar.hidden = true; return; }
    const it = room.items.find((x) => x.id === selected); if (!it) { bar.hidden = true; return; }
    const d = dimsOf(it);
    const p = new THREE.Vector3(it.x, d.h + 0.08, it.z).project(stage.camera);
    if (p.z > 1 || p.z < -1) { bar.hidden = true; return; }
    const cr = stage.canvas.getBoundingClientRect(), vr = viewport.getBoundingClientRect();
    bar.hidden = false;
    const bw = bar.offsetWidth || 280, bh = bar.offsetHeight || 46;
    let x = (p.x * 0.5 + 0.5) * cr.width + cr.left - vr.left - bw / 2;
    let y = (-p.y * 0.5 + 0.5) * cr.height + cr.top - vr.top - bh - 10;
    x = clamp(x, 8, vr.width - bw - 8); y = clamp(y, 8, vr.height - bh - 8);
    bar.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  /* ═════════ действия ═════════ */
  function select(id) {
    selected = id && room.items.some((x) => x.id === id) ? id : null;
    for (const [k, n] of nodes) n.outline.visible = k === selected;
    $$('[data-room-item]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.roomItem === selected)));
    placeBar(); if (has3D && active) stage.requestRender();
  }
  function addItem(spec, { quiet = false } = {}) {
    if (!spec || !engine.DEFAULTS[spec.type]) return null;
    if (spec.from === 'model' && editingId) {
      const ex = room.items.find((x) => x.id === editingId);
      editingId = null;
      if (ex) {
        ex.type = spec.type; ex.params = engine.normalize(spec.type, spec.params || {}); ex.fabric = fabricFor(spec.type, spec.fabric); ex.mine = true;
        clampItem(ex);
        if (has3D) { dropNode(ex.id); buildNode(ex); }
        updateTints(); renderItems(); select(ex.id); persist(); redraw();
        if (!quiet) status(`Обновлено: ${titleOf(ex)}`);
        return ex;
      }
    }
    const it = normItem({ type: spec.type, params: spec.params, fabric: spec.fabric, rot: spec.rot || 0, mine: spec.mine ?? spec.from === 'model' });
    if (!it) return null;
    if (spec.x !== undefined && spec.z !== undefined) { it.x = spec.x; it.z = spec.z; clampItem(it); }
    else Object.assign(it, findSpot(it));
    room.items.push(it);
    if (has3D) buildNode(it);
    updateTints(); renderItems(); select(it.id); persist(); redraw();
    if (!quiet) status(`Добавлено: ${titleOf(it)}`);
    return it;
  }
  function rotate(id, deg) {
    const it = room.items.find((x) => x.id === id); if (!it) return;
    it.rot = ((Math.round(it.rot + deg) % 360) + 360) % 360;
    clampItem(it); place(it); updateTints(); persist(); placeBar(); redraw();
  }
  function moveBy(id, dx, dz) {
    const it = room.items.find((x) => x.id === id); if (!it) return;
    it.x += dx; it.z += dz; clampItem(it); place(it); updateTints(); persist(); placeBar(); redraw();
  }
  function duplicate(id) {
    const it = room.items.find((x) => x.id === id); if (!it) return;
    addItem({ type: it.type, params: { ...it.params }, fabric: it.fabric, rot: it.rot, mine: it.mine }, { quiet: true });
    status('Копия добавлена');
  }
  function remove(id) {
    const i = room.items.findIndex((x) => x.id === id); if (i < 0) return;
    const [it] = room.items.splice(i, 1);
    dropNode(id); if (editingId === id) editingId = null;
    if (selected === id) selected = null;
    updateTints(); renderItems(); select(null); persist(); redraw();
    status(`Удалено: ${titleOf(it)}`);
  }
  function edit(id) {
    const it = room.items.find((x) => x.id === id); if (!it) return;
    editingId = id;
    if (onEdit) onEdit({ type: it.type, params: { ...it.params }, fabric: it.fabric, id: it.id });
  }
  function setDim(key, raw) {
    const n = parseFloat(String(raw).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(n)) { renderDims(); return; }
    const [a, b] = LIM[key];
    const v = clamp(n / 100, a, b);
    if (Math.abs(v - n / 100) > 1e-6) status(key === 'H' ? 'Высота потолка — от 240 до 400 см' : 'Размер комнаты — от 2 до 12 м');
    if (Math.abs(room[key] - v) < 1e-6) { renderDims(); return; }
    room[key] = round1(v);
    room.items.forEach((it) => { clampItem(it); place(it); });
    if (has3D) { buildShell(); stage.setObject(group, { reframe: false }); setOrbit({ animate: !reduced() }); }
    updateTints(); renderDims(); renderItems(); persist(); redraw();
  }

  /* ═════════ камера ═════════ */
  let mode = 'orbit';           // orbit | tour | eye
  let saved = null, camAnim = 0, eye = null;
  const cam = () => stage.camera;
  const centroid = () => {
    if (!room.items.length) return new THREE.Vector3(0, 0.35, 0);
    const c = new THREE.Vector3(); room.items.forEach((it) => c.add(new THREE.Vector3(it.x, 0, it.z)));
    c.multiplyScalar(1 / room.items.length); c.y = 0.35; return c;
  };
  function fitDist(fovDeg) {
    const r = Math.hypot(room.W, room.L, room.H) / 2;
    const c = stage.canvas; const aspect = Math.max(0.3, (c.clientWidth || 1) / (c.clientHeight || 1));
    const v = fovDeg * DEG, h = 2 * Math.atan(Math.tan(v / 2) * aspect);
    return (r / Math.sin(Math.min(v, h) / 2)) * 0.82;
  }
  function orbitPose() {
    const az = 35 * DEG, el = 46 * DEG, d = fitDist(30);
    const t = new THREE.Vector3(0, 0.35, 0);
    return { pos: t.clone().add(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d)), target: t, fov: 30 };
  }
  function orbitLimits() {
    const c = stage.controls, d = fitDist(30), diag = Math.hypot(room.W, room.L);
    c.minDistance = Math.min(0.8, diag * 0.15); c.maxDistance = Math.max(d * 1.8, diag * 3);
    c.minPolarAngle = 0; c.maxPolarAngle = 80 * DEG;
    c.enablePan = true; c.screenSpacePanning = false; c.enableRotate = true; c.enableZoom = true;
  }
  function tweenCam(to, dur, done) {
    cancelAnimationFrame(camAnim);
    const p = cam(), c = stage.controls;
    const p0 = p.position.clone(), t0 = c.target.clone(), f0 = p.fov;
    if (dur <= 0 || reduced()) { p.position.copy(to.pos); c.target.copy(to.target); p.fov = to.fov; p.updateProjectionMatrix(); p.lookAt(to.target); if (done) done(); stage.requestRender(); return; }
    const start = performance.now();
    const step = (now) => {
      const k = ease(Math.min(1, (now - start) / dur));
      p.position.lerpVectors(p0, to.pos, k); c.target.lerpVectors(t0, to.target, k);
      p.fov = f0 + (to.fov - f0) * k; p.updateProjectionMatrix(); p.lookAt(c.target);
      stage.requestRender();
      if (k < 1) camAnim = requestAnimationFrame(step); else if (done) done();
    };
    camAnim = requestAnimationFrame(step);
  }
  function setOrbit({ animate = false } = {}) {
    stopTour(false); leaveEye(false);
    mode = 'orbit';
    const c = stage.controls;
    c.enabled = false; orbitLimits();
    tweenCam(orbitPose(), animate ? 600 : 0, () => { c.enabled = true; c.update(); stage.requestRender(); });
    syncCamButtons();
  }

  /* облёт: замкнутая Catmull-Rom через 4 высоких угла и 2 точки на высоте глаз, 20 с */
  let tour = null;
  function tourCurve() {
    const { W, L, H } = room, m = 0.9, hh = H + 1.3;
    const pts = [
      [W / 2 + m, hh, L / 2 + m], [W / 2 - 0.6, EYE_H, 0], [W / 2 + m, hh, -L / 2 - m],
      [-W / 2 - m, hh, -L / 2 - m], [-W / 2 + 0.6, EYE_H, 0], [-W / 2 - m, hh, L / 2 + m],
    ].map((a) => new THREE.Vector3(...a));
    return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  }
  function startTour() {
    if (!has3D) return;
    leaveEye(false); cancelAnimationFrame(camAnim);
    mode = 'tour'; select(null);
    const c = stage.controls; c.enabled = false;
    const p = cam();
    tour = { curve: tourCurve(), start: performance.now(), p0: p.position.clone(), t0: c.target.clone(), f0: p.fov, raf: 0, still: 0 };
    const look = centroid();
    if (reduced()) {
      const corners = [0, 2, 3, 5].map((i) => tour.curve.points[i]);
      let k = 0;
      const show = () => { p.position.copy(corners[k % 4]); c.target.copy(look); p.fov = 30; p.updateProjectionMatrix(); p.lookAt(look); updateWalls(); stage.requestRender(); k++; };
      show(); tour.still = setInterval(show, 3000);
    } else {
      /* начинаем с точки кривой, ближайшей к текущей камере — без рывка */
      let best = 0, bd = Infinity;
      for (let i = 0; i < 200; i++) { const d = tour.curve.getPointAt(i / 200).distanceToSquared(p.position); if (d < bd) { bd = d; best = i / 200; } }
      tour.u0 = best;
      const T = 20000;
      const step = (now) => {
        if (!tour) return;
        const t = (now - tour.start) / 1000;
        const s = t < 1 ? (t * t) / 2 : t - 0.5;                   // разгон 1 с
        const u = (tour.u0 + (s * 1000) / T) % 1;
        const pt = tour.curve.getPointAt(u);
        const k = ease(Math.min(1, t / 1.2));
        p.position.lerpVectors(tour.p0, pt, k);
        c.target.lerpVectors(tour.t0, look, k);
        p.fov = tour.f0 + (34 - tour.f0) * k; p.updateProjectionMatrix();
        p.lookAt(c.target);
        stage.requestRender();
        tour.raf = requestAnimationFrame(step);
      };
      tour.raf = requestAnimationFrame(step);
    }
    syncCamButtons();
  }
  function stopTour(resume = true) {
    if (!tour) return;
    cancelAnimationFrame(tour.raf); clearInterval(tour.still); tour = null;
    if (resume) {
      mode = 'orbit';
      const c = stage.controls; orbitLimits();
      const p = cam(); if (p.fov !== 30) { p.fov = 30; p.updateProjectionMatrix(); }
      c.enabled = true; c.update(); stage.requestRender();
      syncCamButtons();
    }
  }

  /* взгляд из комнаты: 1,6 м, в 40 см от середины стены +Z */
  function enterEye() {
    if (!has3D) return;
    stopTour(false); cancelAnimationFrame(camAnim);
    mode = 'eye';
    stage.controls.enabled = false;
    eye = { x: 0, z: room.L / 2 - 0.4, yaw: 0, pitch: -8 * DEG, fov: 60 };
    const to = eyePose();
    tweenCam(to, reduced() ? 0 : 700, () => applyEye());
    syncCamButtons();
  }
  function eyePose() {
    const pos = new THREE.Vector3(eye.x, EYE_H, eye.z);
    const dir = new THREE.Vector3(-Math.sin(eye.yaw) * Math.cos(eye.pitch), Math.sin(eye.pitch), -Math.cos(eye.yaw) * Math.cos(eye.pitch));
    return { pos, target: pos.clone().add(dir.multiplyScalar(2)), fov: eye.fov };
  }
  function applyEye() {
    if (!eye) return;
    const to = eyePose(), p = cam();
    p.position.copy(to.pos); stage.controls.target.copy(to.target); p.fov = to.fov; p.updateProjectionMatrix(); p.lookAt(to.target);
    updateWalls(); placeBar(); stage.requestRender();
  }
  function walkTo(x, z) {
    if (!eye) return;
    const x1 = clamp(x, -room.W / 2 + 0.3, room.W / 2 - 0.3), z1 = clamp(z, -room.L / 2 + 0.3, room.L / 2 - 0.3);
    const x0 = eye.x, z0 = eye.z, start = performance.now(), dur = reduced() ? 0 : 800;
    cancelAnimationFrame(camAnim);
    const step = (now) => {
      if (!eye) return;
      const k = dur ? ease(Math.min(1, (now - start) / dur)) : 1;
      eye.x = x0 + (x1 - x0) * k; eye.z = z0 + (z1 - z0) * k; applyEye();
      if (k < 1) camAnim = requestAnimationFrame(step);
    };
    camAnim = requestAnimationFrame(step);
  }
  function leaveEye(resume = true) {
    if (mode !== 'eye') return;
    eye = null; cancelAnimationFrame(camAnim);
    if (resume) setOrbit({ animate: true });
  }
  function syncCamButtons() {
    const t = $('[data-room-cam="tour"]'), e = $('[data-room-cam="eye"]');
    if (t) t.setAttribute('aria-pressed', String(mode === 'tour'));
    if (e) e.setAttribute('aria-pressed', String(mode === 'eye'));
  }

  /* стены, обращённые к камере, прячем (разрез) */
  const _dir = new THREE.Vector3();
  function updateWalls() {
    if (!has3D || !active) return;
    const p = cam(); p.getWorldDirection(_dir);
    for (const w of walls) {
      if (mode === 'eye') { w.visible = true; continue; }
      const n = w.userData.normal;
      const outside = n.x ? (p.position.x - (n.x * room.W) / 2) * n.x > 0 : (p.position.z - (n.z * room.L) / 2) * n.z > 0;
      w.visible = !(n.dot(_dir) < -0.2 || (outside && n.dot(_dir) < 0.15));
    }
  }

  /* ═════════ указатель: выбор, перетаскивание, вращение двумя пальцами, взгляд ═════════ */
  const ray = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = (e) => { const r = stage.canvas.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  function pickItem(e) {
    ray.setFromCamera(ndc(e), cam());
    const hit = ray.intersectObjects(itemsG.children, true).find((h) => h.object.visible);
    let o = hit && hit.object;
    while (o && !(o.userData && o.userData.itemId)) o = o.parent;
    return o ? o.userData.itemId : null;
  }
  function floorAt(e) { ray.setFromCamera(ndc(e), cam()); const v = new THREE.Vector3(); return ray.ray.intersectPlane(floorPlane, v) ? v : null; }
  const ptrs = new Map();
  let drag = null, look = null, twist = null, pinch = null;
  function onDown(e) {
    if (!active || e.button > 0) return;
    if (mode === 'tour') stopTour(true);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2 && drag) {          // второй палец на выбранном предмете — вращение
      const [a, b] = [...ptrs.values()];
      const it = room.items.find((x) => x.id === drag.id);
      twist = { id: drag.id, a0: Math.atan2(b.y - a.y, b.x - a.x), rot0: it ? it.rot : 0 };
      drag = null; e.preventDefault(); return;
    }
    if (ptrs.size === 2 && mode === 'eye') {
      const [a, b] = [...ptrs.values()]; pinch = { d0: Math.hypot(b.x - a.x, b.y - a.y), f0: eye ? eye.fov : 60 }; look = null; return;
    }
    if (ptrs.size > 1) return;
    const id = pickItem(e);
    if (id) {
      e.preventDefault();
      stage.controls.enabled = false;
      const it = room.items.find((x) => x.id === id);
      const f = floorAt(e);
      drag = { id, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, off: f ? new THREE.Vector2(it.x - f.x, it.z - f.z) : new THREE.Vector2() };
      select(id);
      try { stage.canvas.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    } else if (mode === 'eye') {
      look = { sx: e.clientX, sy: e.clientY, yaw0: eye.yaw, pitch0: eye.pitch, moved: false };
      try { stage.canvas.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    } else {
      look = { sx: e.clientX, sy: e.clientY, moved: false, orbit: true };
    }
  }
  function onMove(e) {
    if (!active) return;
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (twist && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      const it = room.items.find((x) => x.id === twist.id); if (!it) return;
      const da = (Math.atan2(b.y - a.y, b.x - a.x) - twist.a0) / DEG;
      it.rot = Math.round(twist.rot0 - da); clampItem(it); place(it); updateTints(); placeBar(); redraw();
      return;
    }
    if (pinch && ptrs.size >= 2 && eye) {
      const [a, b] = [...ptrs.values()]; const d = Math.hypot(b.x - a.x, b.y - a.y);
      eye.fov = clamp(pinch.f0 * (pinch.d0 / Math.max(10, d)), 40, 75); applyEye(); return;
    }
    if (drag && e.pointerId === drag.pointerId) {
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
      drag.moved = true;
      const f = floorAt(e); if (!f) return;
      const it = room.items.find((x) => x.id === drag.id); if (!it) return;
      it.x = f.x + drag.off.x; it.z = f.z + drag.off.y; clampItem(it); place(it); updateTints(); placeBar(); redraw();
      return;
    }
    if (look) {
      const dx = e.clientX - look.sx, dy = e.clientY - look.sy;
      if (Math.hypot(dx, dy) > 5) look.moved = true;
      if (!look.orbit && eye && look.moved) {
        eye.yaw = look.yaw0 + dx * 0.25 * DEG;
        eye.yaw = clamp(eye.yaw, -Math.PI, Math.PI);
        eye.pitch = clamp(look.pitch0 + dy * 0.2 * DEG, -35 * DEG, 35 * DEG);
        applyEye();
      }
    }
  }
  function onUp(e) {
    if (!active) return;
    ptrs.delete(e.pointerId);
    if (twist) {
      if (ptrs.size < 2) {
        const it = room.items.find((x) => x.id === twist.id);
        if (it) { it.rot = ((Math.round(it.rot / 15) * 15) % 360 + 360) % 360; clampItem(it); place(it); updateTints(); persist(); placeBar(); redraw(); }
        twist = null; if (mode === 'orbit') stage.controls.enabled = true;
      }
      return;
    }
    if (pinch) { if (ptrs.size < 2) pinch = null; return; }
    if (drag && e.pointerId === drag.pointerId) {
      if (drag.moved) { persist(); status(''); }
      drag = null;
      if (mode === 'orbit') stage.controls.enabled = true;
      return;
    }
    if (look) {
      const l = look; look = null;
      if (!l.moved) {
        if (mode === 'eye') { const f = floorAt(e); if (f) walkTo(f.x, f.z); }
        else select(null);
      }
    }
  }
  function onWheel(e) {
    if (!active) return;
    if (mode === 'tour') { stopTour(true); return; }
    if (mode === 'eye' && eye) { e.preventDefault(); eye.fov = clamp(eye.fov + Math.sign(e.deltaY) * 3, 40, 75); applyEye(); }
  }
  function onKey(e) {
    if (!active) return;
    const t = e.target; if (t && (t.closest && t.closest('input, textarea, select, [contenteditable="true"], dialog[open]'))) return;
    if (mode === 'tour') { stopTour(true); }
    if (!selected) return;
    const k = e.key;
    const step = 0.05;
    if (k === 'ArrowLeft') { e.preventDefault(); moveBy(selected, -step, 0); }
    else if (k === 'ArrowRight') { e.preventDefault(); moveBy(selected, step, 0); }
    else if (k === 'ArrowUp') { e.preventDefault(); moveBy(selected, 0, -step); }
    else if (k === 'ArrowDown') { e.preventDefault(); moveBy(selected, 0, step); }
    else if (k === 'r' || k === 'R' || k === 'к' || k === 'К') { e.preventDefault(); rotate(selected, e.shiftKey ? -15 : 15); }
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); remove(selected); }
    else if (k === 'Escape') select(null);
  }
  const host = has3D ? stage.canvas.parentElement : null;
  const onCtrlStart = () => { if (mode === 'tour') stopTour(true); };
  const onBefore = () => updateWalls();
  const onRender = () => placeBar();

  /* ═════════ панель: события ═════════ */
  function bindPanel() {
    panel.addEventListener('click', (e) => {
      const add = e.target.closest('[data-room-add]');
      if (add) {
        const k = add.dataset.roomAdd;
        if (k === 'current') { const cur = getCurrent(); addItem({ ...cur, mine: true }); }
        else addItem({ type: k, params: { ...(QUICK[k] || {}) }, fabric: null, mine: false });
        return;
      }
      const li = e.target.closest('[data-room-item]'); if (li) { select(li.dataset.roomItem === selected ? null : li.dataset.roomItem); return; }
      const camB = e.target.closest('[data-room-cam]');
      if (camB) {
        const k = camB.dataset.roomCam;
        if (k === 'tour') { if (mode === 'tour') stopTour(true); else startTour(); }
        else if (k === 'eye') { if (mode === 'eye') leaveEye(true); else enterEye(); }
        else if (k === 'reset') setOrbit({ animate: true });
        return;
      }
      const g = e.target.closest('[data-room-grid]');
      if (g) { gridOn = !gridOn; g.setAttribute('aria-pressed', String(gridOn)); if (gridLines) gridLines.visible = gridOn; redraw(); return; }
      const send = e.target.closest('[data-room-send]');
      if (send) sharePlan(e, send);
    });
    $$('[data-room-dim]').forEach((inp) => {
      inp.addEventListener('change', () => setDim(inp.dataset.roomDim, inp.value));
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); setDim(inp.dataset.roomDim, inp.value); } });
      inp.addEventListener('blur', () => renderDims());
    });
  }
  /* на телефоне — «Поделиться» с картинкой плана, иначе ссылка wa.me */
  async function sharePlan(e, a) {
    a.href = waHref();
    if (!has3D || !phone() || !navigator.canShare || !navigator.share) return;
    e.preventDefault();
    try {
      select(null);
      const blob = await stage.snapshot({ width: 1600, height: 1600, view: 'current', watermark: true });
      const file = new File([blob], 'ricca-plan.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'План комнаты RICCA', text: waText() }); return; }
    } catch (err) { if (err && err.name === 'AbortError') return; }
    window.open(waHref(), '_blank', 'noopener');
  }

  /* ═════════ вход и выход ═════════ */
  function enter() {
    if (active) return;
    active = true;
    renderDims(); renderItems(); renderSend();
    if (!has3D) { status('Трёхмерный вид недоступен — список и отправка плана работают.'); return; }
    const p = stage.camera, c = stage.controls;
    saved = {
      pos: p.position.clone(), target: c.target.clone(), fov: p.fov,
      ctl: { minDistance: c.minDistance, maxDistance: c.maxDistance, minPolarAngle: c.minPolarAngle, maxPolarAngle: c.maxPolarAngle, enablePan: c.enablePan, screenSpacePanning: c.screenSpacePanning, enableRotate: c.enableRotate },
    };
    if (stage.view !== '3d') stage.setView('3d', { animate: false });
    if (stage.cancelAnim) stage.cancelAnim();
    stage.setStudio(false);
    stage.setObject(group, { reframe: false });
    if (!viewport.contains(bar)) viewport.appendChild(bar);
    host.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    host.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('keydown', onKey);
    c.addEventListener('start', onCtrlStart);
    stage.on('beforeRender', onBefore); stage.on('render', onRender);
    shadowsDirty();
    setOrbit({ animate: false });
    updateTints();
    persist();
  }
  function leave() {
    if (!active) return;
    stopTour(false); eye = null; cancelAnimationFrame(camAnim); mode = 'orbit'; syncCamButtons();
    active = false; bar.hidden = true; drag = look = twist = pinch = null; ptrs.clear();
    if (!has3D) return;
    host.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    host.removeEventListener('wheel', onWheel, { capture: true });
    window.removeEventListener('keydown', onKey);
    stage.controls.removeEventListener('start', onCtrlStart);
    stage.off('beforeRender', onBefore); stage.off('render', onRender);
    if (group.parent) group.parent.remove(group);
    const p = stage.camera, c = stage.controls;
    if (saved) {
      Object.assign(c, saved.ctl);
      p.position.copy(saved.pos); c.target.copy(saved.target); p.fov = saved.fov; p.updateProjectionMatrix(); p.lookAt(c.target);
    }
    c.enabled = true;
    shadowsDirty();
  }
  function dispose() {
    leave();
    for (const id of [...nodes.keys()]) dropNode(id);
    shell.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    bar.remove();
  }

  /* ═════════ старт ═════════ */
  loadState();
  if (has3D) { buildShell(); room.items.forEach(buildNode); updateTints(); }
  bindPanel(); renderDims(); renderItems(); renderSend();

  const api = {
    enter, leave, addItem, dispose,
    select, rotate, duplicate, remove, moveBy, edit,
    startTour, stopTour, enterEye, leaveEye, resetView: () => setOrbit({ animate: true }),
    waText, waHref, encode: encodeRoom,
    get room() { return room; }, get selected() { return selected; }, get mode() { return mode; },
    get group() { return group; },
    /* для проверок: экранная точка предмета */
    screenOf(id) {
      const it = room.items.find((x) => x.id === id); if (!it || !has3D) return null;
      const p = new THREE.Vector3(it.x, dimsOf(it).h * 0.5, it.z).project(cam());
      const r = stage.canvas.getBoundingClientRect();
      return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height };
    },
  };
  return api;
}

/* ═════════ пол: светлый дуб, доска 12 см, плитка 1,2 × 1,2 м (процедурно, бесшовно) ═════════ */
function makeFloorMaterial(renderer) {
  const S = 1024, rows = 10, rh = S / rows;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#D6C3A3'; g.fillRect(0, 0, S, S);
  const drawWrapped = (x, y, w, h, fill) => { g.fillStyle = fill; g.fillRect(x, y, w, h); if (x + w > S) g.fillRect(x - S, y, w, h); };
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    let x = rnd() * S; const end = x + S;
    while (x < end) {
      const len = Math.min(end - x, 420 + rnd() * 480);
      const l = 0.94 + rnd() * 0.1, warm = rnd() * 6 - 3;
      const col = `rgb(${Math.round(216 * l + warm)}, ${Math.round(196 * l)}, ${Math.round(163 * l - warm)})`;
      drawWrapped(x % S, y, len, rh, col);
      /* волокна */
      for (let k = 0; k < 26; k++) {
        const yy = y + 2 + rnd() * (rh - 4), a = 0.025 + rnd() * 0.05, amp = 0.6 + rnd() * 1.6, ph = rnd() * 6.28;
        g.strokeStyle = `rgba(110, 80, 45, ${a})`; g.lineWidth = 0.6 + rnd() * 1.1;
        for (const off of [0, -S]) {
          g.beginPath();
          for (let t = 0; t <= len; t += 16) { const px = (x % S) + off + t; const py = yy + Math.sin(ph + t * 0.01) * amp; if (t === 0) g.moveTo(px, py); else g.lineTo(px, py); }
          g.stroke();
        }
      }
      /* стык торцов */
      g.fillStyle = 'rgba(90, 66, 40, 0.35)'; g.fillRect(x % S, y, 1.2, rh);
      x += len;
    }
    g.fillStyle = 'rgba(90, 66, 40, 0.32)'; g.fillRect(0, y, S, 1.4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0, envMapIntensity: 0.9 });
}
