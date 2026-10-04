/*! © 2026 ELUNA · RICCA DESIGNS, Алматы. Все права защищены. Копирование без письменного разрешения запрещено. */
/* ==========================================================================
   ELUNA — расслойка: семь слоёв матраса.
   • Матрас закрыт, пока посетитель сам не нажмёт «Открыть» — никакой
     автоматики по скроллу. «Закрыть» собирает слои обратно.
   • Само движение — CSS-переходы (translate каждого слоя с задержкой по
     очереди), поэтому его можно прервать на середине и развернуть.
   • Список слева и слои справа связаны: наведение / фокус / нажатие на строку
     подсвечивает слой, наведение на слой в картинке подсвечивает строку.
     Попадание по слою — по альфа-маске картинки, а не по прямоугольнику.
   ========================================================================== */
(() => {
  'use strict';

  const E = window.ELUNA_CORE || {};
  const LAYERS = E.LAYERS || [];
  const reduceMotion = !!E.reduceMotion;
  const root = document.getElementById('layers');
  if (!root) return;

  const stage = document.getElementById('strataStage');
  const list = document.getElementById('strataList');
  const items = Array.from(list.querySelectorAll('.strata__item'));
  // в разметке слои идут снизу вверх (основание первым); для попадания нужен порядок сверху вниз
  const layerEls = Array.from(stage.querySelectorAll('.strata__layer')).sort((a, b) => a.dataset.i - b.dataset.i);
  const btnOpen = document.getElementById('strataOpen');
  const btnClose = document.getElementById('strataClose');
  const sw = btnOpen.closest('.strata__switch');
  const wrapEl = stage.querySelector('.strata__closed');   // собранный матрас (фото)
  // широкая раскладка (список и матрас рядом): там наведение показывает карточку; на узкой — только нажатие,
  // чтобы карточка не двигала страницу под курсором
  const side = window.matchMedia('(min-width: 1100px)');
  const det = {
    box: document.getElementById('strataDetail'),
    num: document.getElementById('sdNum'), name: document.getElementById('sdName'), role: document.getElementById('sdRole'),
    text: document.getElementById('sdText'), mm: document.getElementById('sdMm'), den: document.getElementById('sdDen'),
    hint: root.querySelector('.strata__hint'),
  };
  const HINT = {
    closed: 'Нажмите «Открыть» — матрас разойдётся на семь слоёв.',
    hover: 'Наведите на слой или строку списка — расскажем, зачем он нужен.',
    tap: 'Нажмите на слой или строку списка — расскажем, зачем он нужен.',
  };
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const hintText = () => (!open ? HINT.closed : side.matches && canHover.matches ? HINT.hover : HINT.tap);

  let open = false, pinned = -1, hovered = -1, shown = -2;
  let lr = 0;
  const relayout = () => { if (lr) return; lr = requestAnimationFrame(() => { lr = 0; fitZoom(); layoutLines(); }); };

  /* ---- собранный матрас крупным планом, как на фото: от списка до края экрана ----
     Камера «наезжает» ровно настолько, чтобы дальний конец матраса ушёл за правый край экрана —
     тогда кадр режет край экрана, а не картинка (никакой искусственной «стенки» сбоку).
     «Открыть» — камера отъезжает к 1 и показывает все семь слоёв. */
  const visual = root.querySelector('.strata__visual');
  const CORNER = 0.032, EDGE = 1.0028;   // ближний угол и правый край фото матраса — доли ширины кадра
  function fitZoom() {
    const r = visual.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    if (!r.width) return;
    const ox = r.left + CORNER * r.width, edge = r.left + EDGE * r.width;
    const z = Math.min(1.9, Math.max(1, (vw + 0.06 * r.width - ox) / (edge - ox)));
    stage.style.setProperty('--zoom', z.toFixed(3));
    // фото под реальный размер на экране: уменьшенная заранее версия не даёт ряби на мелких полосках боковины
    if (wrapEl && wrapEl.srcset) wrapEl.sizes = Math.round(r.width * 1.0511 * z) + 'px';
  }

  /* ---- открыть / закрыть ---- */
  function setOpen(v, opts) {
    v = !!v;
    if (v === open && !(opts && opts.force)) return;
    open = v;
    stage.dataset.state = v ? 'open' : 'closed';
    root.classList.toggle('is-open', v);
    sw.dataset.state = v ? 'open' : 'closed';
    // доступно только действие, которое имеет смысл: закрытый матрас можно открыть, открытый — закрыть
    const had = document.activeElement === btnOpen || document.activeElement === btnClose;
    btnOpen.setAttribute('aria-disabled', v ? 'true' : 'false');
    btnClose.setAttribute('aria-disabled', v ? 'false' : 'true');
    if (had) (v ? btnClose : btnOpen).focus({ preventScroll: true });
    stage.setAttribute('aria-label', v ? 'Матрас ELUNA открыт: семь слоёв' : 'Матрас ELUNA в собранном виде');
    if (det.hint) det.hint.textContent = hintText();
    if (!v) { pinned = -1; hovered = -1; }
    if (v) relayout();   // выноски считаются заново: список мог доехать после анимации появления
    sync();
  }
  btnOpen.addEventListener('click', () => setOpen(true));
  btnClose.addEventListener('click', () => setOpen(false));
  // нажатие на сам матрас (не на пустое небо вокруг): закрытый — открыть; открытый — выбрать слой под пальцем
  stage.addEventListener('click', (e) => {
    if (!open) { if (hitClosed(e.clientX, e.clientY)) setOpen(true); return; }
    const i = hit(e.clientX, e.clientY);
    if (i >= 0) { pinned = pinned === i ? -1 : i; sync(); revealDetail(); }
  });
  // узкая раскладка: карточка слоя под картинкой — показать её, если она ушла за край экрана
  function revealDetail() {
    if (side.matches || !det.box || pinned < 0) return;
    requestAnimationFrame(() => {
      const r = det.box.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 8 || r.top < 70) det.box.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---- активный слой: закреплённый (нажатие) важнее наведения ---- */
  const active = () => (hovered >= 0 ? hovered : pinned);
  function sync() {
    const a = open ? active() : -1;
    if (a >= 0) stage.dataset.active = String(a); else delete stage.dataset.active;
    items.forEach((it, i) => {
      it.classList.toggle('is-active', i === (hovered >= 0 ? hovered : pinned));
      it.setAttribute('aria-pressed', i === pinned && open ? 'true' : 'false');
    });
    list.classList.toggle('has-active', (hovered >= 0 ? hovered : pinned) >= 0);
    fillDetail(hovered >= 0 ? hovered : pinned);
    if (typeof syncLines === 'function') syncLines();
  }
  function fillDetail(i) {
    if (!det.box || i === shown) return;
    shown = i;
    const l = LAYERS[i];
    if (!l) { det.box.classList.remove('is-on'); return; }
    const put = () => {
      det.num.textContent = l.num; det.name.textContent = l.name; det.role.textContent = l.role;
      det.text.textContent = l.text; det.mm.textContent = `${Math.round(l.cm * 10)} мм`; det.den.textContent = l.density;
      det.box.classList.add('is-on'); det.box.classList.remove('is-swap');
    };
    if (reduceMotion || !det.box.classList.contains('is-on')) { put(); return; }
    det.box.classList.add('is-swap');
    clearTimeout(fillDetail.t); fillDetail.t = setTimeout(() => { if (shown === i) put(); }, 160);
  }

  items.forEach((it, i) => {
    it.addEventListener('mouseenter', () => { if (!side.matches) return; hovered = i; sync(); });
    it.addEventListener('mouseleave', () => { if (side.matches && hovered === i) { hovered = -1; sync(); } });
    // фокус с клавиатуры показывает слой; фокус от нажатия мышью — нет (иначе повторное нажатие «не снимает» выбор)
    it.addEventListener('focus', () => { if (!it.matches(':focus-visible')) return; hovered = i; sync(); });
    it.addEventListener('blur', () => { if (hovered === i) { hovered = -1; sync(); } });
    // нажатие на строку: закрытый матрас открывается (это решение посетителя), слой закрепляется
    it.addEventListener('click', () => {
      if (!open) { pinned = i; setOpen(true); revealDetail(); return; }
      pinned = pinned === i ? -1 : i; sync(); revealDetail();
    });
  });

  /* ---- попадание по слою: альфа-маски в малом разрешении ---- */
  const masks = layerEls.map(() => null);
  let wrapMask = null;
  function readMask(img) {
    const w = 160, h = Math.max(1, Math.round(w * img.naturalHeight / img.naturalWidth));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, w, h);
    return { w, h, a: x.getImageData(0, 0, w, h).data };
  }
  function buildMask(img, k) {
    try {
      const w = 160, h = Math.max(1, Math.round(w * img.naturalHeight / img.naturalWidth));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, w, h);
      masks[k] = { w, h, a: x.getImageData(0, 0, w, h).data };
    } catch (e) { masks[k] = null; }
  }
  layerEls.forEach((img, k) => {
    if (img.complete && img.naturalWidth) buildMask(img, k);
    else img.addEventListener('load', () => buildMask(img, k), { once: true });
  });
  if (wrapEl) {
    // порог выше: свечение вокруг матраса полупрозрачное — по нему матрас не открывается
    const mk = () => { try { wrapMask = readMask(wrapEl); wrapMask.min = 200; } catch (e) { wrapMask = null; } };
    if (wrapEl.complete && wrapEl.naturalWidth) mk(); else wrapEl.addEventListener('load', mk, { once: true });
  }
  const inMask = (m, el, cx, cy) => {
    if (!m) return false;
    const r = el.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false;
    const px = Math.min(m.w - 1, Math.floor((cx - r.left) / r.width * m.w));
    const py = Math.min(m.h - 1, Math.floor((cy - r.top) / r.height * m.h));
    return m.a[(py * m.w + px) * 4 + 3] > (m.min || 110);
  };
  function hit(cx, cy) {
    // верхний слой — первый в списке (чехол лежит поверх латекса и т. д.)
    for (let k = 0; k < layerEls.length; k++) if (inMask(masks[k], layerEls[k], cx, cy)) return +layerEls[k].dataset.i;
    return -1;
  }
  // собранный матрас: боковина или любой из придвинутых слоёв; маски ещё не готовы — считаем попаданием
  const hitClosed = (cx, cy) => (!wrapMask && !masks[0]) || inMask(wrapMask, wrapEl, cx, cy);
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let raf = 0, lx = 0, ly = 0;
    stage.addEventListener('pointermove', (e) => {
      lx = e.clientX; ly = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!open) { stage.classList.toggle('is-pointing', hitClosed(lx, ly)); return; }
        const i = hit(lx, ly);
        stage.classList.toggle('is-pointing', i >= 0);
        const h = side.matches ? i : -1;
        if (h !== hovered) { hovered = h; sync(); }
      });
    });
    stage.addEventListener('pointerleave', () => { stage.classList.remove('is-pointing'); if (hovered !== -1) { hovered = -1; sync(); } });
  }

  // свет за матрасом слегка следует за курсором (только мышь, только пока секция на экране)
  if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const vis = root.querySelector('.strata__visual');
    let tx = 0, ty = 0, raf2 = 0;
    vis.addEventListener('pointermove', (e) => {
      const r = vis.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
      if (raf2) return;
      raf2 = requestAnimationFrame(() => { raf2 = 0; vis.style.setProperty('--px', tx.toFixed(3)); vis.style.setProperty('--py', ty.toFixed(3)); });
    });
    vis.addEventListener('pointerleave', () => { vis.style.setProperty('--px', '0'); vis.style.setProperty('--py', '0'); });
  }

  /* ---- выноски: от строки списка к переднему левому углу слоя (только компьютер) ---- */
  // точка на передней кромке каждого слоя в раскрытом виде, в % кадра (сняты с вырезок)
  const ANCH = [[3.6, 11.7], [4.7, 20.6], [4.9, 28.4], [5.2, 36.5], [5.2, 44.0], [7.0, 58.7], [6.1, 71.1]];
  const svg = document.getElementById('strataLines');
  const NS = 'http://www.w3.org/2000/svg';
  const lines = items.map(() => {
    const g = document.createElementNS(NS, 'g');
    const path = document.createElementNS(NS, 'path'); path.setAttribute('pathLength', '1');
    const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('r', '2.4');
    g.appendChild(path); g.appendChild(dot); svg.appendChild(g);
    return { g, path, dot };
  });
  const geo = items.map(() => ({ x0: 0, y0: 0, xm: 0, x1: 0, y1: 0 }));
  let shiftPx = 0;
  const drawLine = (i, dx) => {
    const g = geo[i], x1 = g.x1 + dx;
    lines[i].path.setAttribute('d', `M${g.x0.toFixed(1)} ${g.y0.toFixed(1)}H${g.xm.toFixed(1)}L${x1.toFixed(1)} ${g.y1.toFixed(1)}`);
    lines[i].dot.setAttribute('cx', x1.toFixed(1)); lines[i].dot.setAttribute('cy', g.y1.toFixed(1));
  };
  function layoutLines() {
    if (!side.matches) { svg.classList.add('is-off'); return; }
    svg.classList.remove('is-off');
    const sr = root.getBoundingClientRect(), st = stage.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${sr.width.toFixed(0)} ${sr.height.toFixed(0)}`);
    svg.setAttribute('width', sr.width.toFixed(0)); svg.setAttribute('height', sr.height.toFixed(0));
    // сдвиг списка анимацией появления (.reveal → translateY) не учитываем: берём положение без трансформации
    const lt = new DOMMatrixReadOnly(getComputedStyle(list).transform === 'none' ? undefined : getComputedStyle(list).transform);
    shiftPx = 0.018 * st.width;   // активный слой выдвигается на 1,8cqw — точка выноски едет вместе с ним
    items.forEach((it, i) => {
      const r = it.getBoundingClientRect();
      const g = geo[i];
      g.x0 = r.right - lt.m41 - sr.left + 14; g.y0 = r.top - lt.m42 + r.height / 2 - sr.top;
      g.x1 = st.left - sr.left + ANCH[i][0] / 100 * st.width; g.y1 = st.top - sr.top + ANCH[i][1] / 100 * st.height;
      g.xm = Math.max(g.x0 + 12, g.x1 - Math.max(40, Math.abs(g.y1 - g.y0) * 0.9));
      drawLine(i, open && i === active() ? -shiftPx : 0);
    });
  }
  if (E.resizeHooks) E.resizeHooks.push(relayout); else window.addEventListener('resize', relayout);
  side.addEventListener('change', () => { relayout(); if (det.hint) det.hint.textContent = hintText(); if (!side.matches && hovered >= 0) { hovered = -1; sync(); } });
  list.addEventListener('transitionend', (e) => { if (e.target === list && e.propertyName === 'transform') relayout(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.addEventListener('load', relayout);
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(root);
  const syncLines = () => lines.forEach((l, i) => {
    const on = open && i === active();
    if (l.g.classList.contains('is-active') !== on) { l.g.classList.toggle('is-active', on); drawLine(i, on ? -shiftPx : 0); }
  });

  setOpen(false, { force: true });
  relayout();
  root.classList.add('is-ready');
  E.strata = { open: () => setOpen(true), close: () => setOpen(false), get isOpen() { return open; } };
})();
