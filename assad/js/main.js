(function () {
  const D = window.ASSAD, SC = window.SCENES;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = n => Math.round(n / 1000) * 1000, fmt = n => money(n).toLocaleString('ru-RU') + ' ₸';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const wa = t => `https://wa.me/${D.whatsapp}?text=${encodeURIComponent(t)}`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, hasGsap = !!(window.gsap && window.ScrollTrigger) && !reduced;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* контакты */
  ['#heroWa', '#cWa'].forEach(s => $(s).href = wa('Здравствуйте! Хочу заказать корпусную мебель.'));
  $('#cAddress').textContent = D.address; $('#cHours').textContent = D.hours;
  $('#cPhone').textContent = D.phone; $('#cPhone').href = 'tel:' + D.phone.replace(/[^\d+]/g, '');
  $('#cInst').href = D.instagram; $('#cMap').href = D.map; $('#year').textContent = new Date().getFullYear();

  /* стена фасадов в hero: сетка заполняется ровно, без обрезков */
  const wall = $('#wall');
  const pal = [['#b98d62', 'Дуб Галифакс'], ['#e9e6df', 'Эмаль кашемир'], ['#8b5e3c', 'Шпон дуба'], ['#2d2f33', 'Графит'], ['#cdbfa6', 'Эмаль песок'], ['#a77a52', 'Орех'], ['#e4ddd0', 'Эмаль лён'], ['#9aa58f', 'Шалфей']];
  function buildWall() {
    const mobile = innerWidth < 960, cols = mobile ? 4 : 6, rows = mobile ? 5 : 8;
    wall.style.gridTemplateColumns = `repeat(${cols},1fr)`; wall.style.gridTemplateRows = `repeat(${rows},1fr)`;
    const occ = Array.from({ length: rows }, () => Array(cols).fill(false));
    let rnd = 7, html = '', n = 0; const rand = () => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (occ[r][c]) continue;
      let w = 1, h = 1; const x = rand();
      if (x < .3 && c + 1 < cols && !occ[r][c + 1]) w = 2;
      else if (x < .45 && r + 1 < rows) h = 2;
      for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) occ[r + i][c + j] = true;
      const [col, name] = pal[(n * 5 + r * 3) % pal.length]; n++;
      const cls = [w === 2 ? 'w2' : '', h === 2 ? 'h2' : '', n % 7 === 3 ? 'knob' : '', n === 11 ? 'glass' : ''].join(' ');
      html += `<i class="${cls}" title="${name}" style="background:${col};animation-delay:${0.25 + c * 0.07 + r * 0.05}s;--d:${(n % 3) + 1}"></i>`;
    }
    wall.innerHTML = html;
  }
  buildWall();
  let panels = $$('i', wall);
  if (hasGsap) {
    // лёгкий параллакс за курсором, по глубине
    addEventListener('mousemove', e => {
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      panels.forEach(p => { const d = +p.style.getPropertyValue('--d'); gsap.to(p, { x: x * 10 * d, y: y * 8 * d, duration: 1.2, ease: 'power2.out', overwrite: 'auto' }); });
    }, { passive: true });
    // разбирается при скролле
    gsap.to(panels, { yPercent: i => -20 - (i % 5) * 18, opacity: 0, stagger: { each: .01, from: 'random' }, ease: 'none', scrollTrigger: { trigger: '#hero', start: '35% top', end: 'bottom top', scrub: .8 } });
    gsap.to('.hero-text', { yPercent: 10, opacity: .2, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: .8 } });
  }

  /* цифры */
  $('#statsList').innerHTML = D.stats.map(([b, s]) => `<li class="rv"><b data-count="${esc(b)}">${esc(b)}</b><span>${esc(s)}</span></li>`).join('');

  /* каталог: лента */
  const matOrder = ['ldsp', 'mdf', 'veneer', 'dark', 'sage'], matColor = { ldsp: '#b98d62', mdf: '#e9e6df', veneer: '#8b5e3c', dark: '#2d2f33', sage: '#9aa58f' };
  const rail = $('#rail');
  rail.innerHTML = D.products.map(p => `<article class="cat" data-id="${p.id}">
    <div class="cat-img"><div class="cat-mat">${matOrder.slice(0, 4).map((m, j) => `<button type="button" data-m="${m}" class="${j === 0 ? 'is-on' : ''}" style="background:${matColor[m]}" aria-label="${esc(SC.MAT[m].name)}"></button>`).join('')}</div><div class="cat-svg">${SC.render(p.scene, 'ldsp')}</div></div>
    <div class="cat-body"><div><h3><i>${p.num}</i>${esc(p.name)}</h3><p>${esc(p.desc)}</p></div><div class="cat-price">от ${fmt(p.base)}<small>за ${p.unit}</small></div></div></article>`).join('');
  rail.addEventListener('click', e => {
    const m = e.target.closest('.cat-mat button');
    if (m) { const card = m.closest('.cat'), p = D.products.find(x => x.id === card.dataset.id);
      $$('.cat-mat button', card).forEach(b => b.classList.toggle('is-on', b === m));
      const box = $('.cat-svg', card); box.style.transition = 'opacity .4s'; box.style.opacity = 0;
      setTimeout(() => { box.innerHTML = SC.render(p.scene, m.dataset.m); box.style.opacity = 1; }, 160); return; }
    const card = e.target.closest('.cat'); if (!card) return;
    setProduct(card.dataset.id); $('#calc').scrollIntoView({ behavior: 'smooth' });
  });
  let railST = null;
  function setupRail() {
    if (!hasGsap) return;
    if (railST) { railST.kill(); gsap.set(rail, { x: 0 }); railST = null; }
    if (innerWidth < 900) return;
    const dist = rail.scrollWidth - innerWidth;
    railST = gsap.to(rail, { x: -dist, ease: 'none', scrollTrigger: { trigger: '#railWrap', start: 'top 15%', end: () => '+=' + dist, pin: '#catalog', pinSpacing: true, scrub: .9, invalidateOnRefresh: true } }).scrollTrigger;
  }

  /* материалы */
  const swInfo = { ldsp: 'Австрийские плиты с текстурой дерева. 200+ декоров, кромка ABS 2 мм, не боится влаги.', mdf: 'Фасады МДФ в эмали любого цвета RAL. Матовые, глянцевые, soft-touch.', veneer: 'Натуральный шпон дуба под маслом. Тепло дерева, которое красиво стареет.', dark: 'Глубокий графит в матовой эмали с покрытием anti-touch: без отпечатков.', sage: 'Спокойный шалфей. Цвет кухонь и детских этого года.' };
  const prev = $('#matPreview');
  prev.innerHTML = matOrder.map((m, i) => SC.render('kitchen', m).replace('<svg ', `<svg data-m="${m}" class="${i === 0 ? 'is-on' : ''}" `)).join('');
  $('#palette').innerHTML = matOrder.map((m, i) => `<button type="button" data-m="${m}" class="${i === 0 ? 'is-on' : ''}" aria-label="${esc(SC.MAT[m].name)}">${SC.render('chip', m)}</button>`).join('');
  function pickMat(m) {
    $$('#palette button').forEach(b => b.classList.toggle('is-on', b.dataset.m === m));
    $$('svg', prev).forEach(s => s.classList.toggle('is-on', s.dataset.m === m));
    const h = $('#matName'); h.style.opacity = 0; setTimeout(() => { h.textContent = SC.MAT[m].name; $('#matNote').textContent = swInfo[m]; h.style.opacity = 1; }, 180);
  }
  $('#palette').addEventListener('mouseover', e => { const b = e.target.closest('button'); if (b) pickMat(b.dataset.m); });
  $('#palette').addEventListener('click', e => { const b = e.target.closest('button'); if (b) pickMat(b.dataset.m); });

  /* калькулятор */
  const C = { product: D.products[0], mat: D.materials[0], hw: D.hardware[0], len: D.products[0].def };
  const seg = (el, items, cur, on) => { el.innerHTML = items.map(i => `<button type="button" data-id="${i.id}" class="${i.id === cur.id ? 'is-on' : ''}">${esc(i.name)}${i.note ? `<small>${esc(i.note)}</small>` : ''}</button>`).join(''); el.onclick = e => { const b = e.target.closest('button'); if (b) on(items.find(i => i.id === b.dataset.id)); }; };
  function setProduct(id) { C.product = D.products.find(p => p.id === id); C.len = C.product.def; const r = $('#calcLen'); r.min = C.product.min; r.max = C.product.max; r.value = C.len; renderCalc(); }
  let numTween = null;
  function animateNumber(el, to) { const from = +(el.dataset.v || 0); el.dataset.v = to; if (!window.gsap) { el.textContent = fmt(to); return; } numTween && numTween.kill(); const o = { v: from }; numTween = gsap.to(o, { v: to, duration: .6, ease: 'power2.out', onUpdate: () => el.textContent = fmt(o.v) }); }
  function renderCalc() {
    seg($('#calcProduct'), D.products, C.product, p => setProduct(p.id));
    seg($('#calcMat'), D.materials, C.mat, m => { C.mat = m; renderCalc(); });
    seg($('#calcHw'), D.hardware, C.hw, h => { C.hw = h; renderCalc(); });
    $('#calcLenOut').textContent = C.len + ' м'; $('#calcUnit').textContent = C.product.unit;
    const per = C.product.base * C.mat.k * C.hw.k, total = per * C.len;
    animateNumber($('#calcTotal'), total);
    $('#calcPer').textContent = `${fmt(per)} за ${C.product.unit}: ${C.product.name.toLowerCase()}, ${C.mat.name}, фурнитура ${C.hw.name}`;
    $('#calcWa').href = wa(`Здравствуйте! Посчитал на сайте: ${C.product.name}, ${C.len} ${C.product.unit}, фасады ${C.mat.name}, фурнитура ${C.hw.name}. Ориентир ${fmt(total)}. Хочу точную смету.`);
  }
  $('#calcLen').addEventListener('input', e => { C.len = +e.target.value; renderCalc(); });
  renderCalc();

  /* процесс: стопка */
  $('#stack').innerHTML = D.steps.map(([h, t], i) => `<div class="step"><span class="tnum">0${i + 1}</span><h3>${esc(h)}</h3><p>${esc(t)}</p></div>`).join('');
  if (hasGsap) $$('.step').forEach((s, i, a) => { if (i < a.length - 1) gsap.to(s, { scale: .94, opacity: .6, ease: 'none', scrollTrigger: { trigger: a[i + 1], start: 'top 80%', end: 'top 20%', scrub: true } }); });

  /* отзывы: цитата */
  let qi = 0, qt = null;
  $('#quoteNav').innerHTML = D.reviews.map((_, i) => `<button type="button" data-i="${i}" aria-label="Отзыв ${i + 1}"></button>`).join('');
  function showQuote(i) { qi = i; const r = D.reviews[i]; const q = $('#quote'); q.style.opacity = 0; setTimeout(() => { q.innerHTML = `«${esc(r.text)}»<footer><b>★★★★★</b>${esc(r.name)} · 2ГИС</footer>`; q.style.transition = 'opacity .6s'; q.style.opacity = 1; }, 250);
    $$('#quoteNav button').forEach((b, j) => b.classList.toggle('is-on', j === i)); clearInterval(qt); qt = setInterval(() => showQuote((qi + 1) % D.reviews.length), 6000); }
  $('#quoteNav').addEventListener('click', e => { const b = e.target.closest('button'); if (b) showQuote(+b.dataset.i); });
  showQuote(0);

  /* защищённая галерея */
  $('#protectDemo').innerHTML = SC.render('wardrobe', 'veneer'); $('#protectDemo').addEventListener('contextmenu', e => e.preventDefault());

  /* водяной знак */
  const drop = $('#wmDrop'), file = $('#wmFile'), cv = $('#wmCanvas'), dl = $('#wmDownload'); let img = null;
  drop.addEventListener('click', () => file.click());
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', e => load(e.dataTransfer.files[0])); file.addEventListener('change', () => load(file.files[0]));
  $('#wmText').addEventListener('input', draw); $('#wmSize').addEventListener('input', draw);
  function load(f) { if (!f || !f.type.startsWith('image/')) return; const u = URL.createObjectURL(f), i = new Image(); i.onload = () => { img = i; URL.revokeObjectURL(u); draw(); }; i.src = u; }
  function draw() {
    if (!img) return; const W = Math.min(img.naturalWidth, 1600), H = Math.round(img.naturalHeight * W / img.naturalWidth);
    cv.width = W; cv.height = H; const c = cv.getContext('2d'); c.drawImage(img, 0, 0, W, H);
    const text = $('#wmText').value || 'ASSAD', size = W * (+$('#wmSize').value) / 100;
    c.save(); c.translate(W / 2, H / 2); c.rotate(-Math.PI / 8); c.font = `500 ${size}px Montserrat, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(255,255,255,.28)'; c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = size / 30;
    const sx = c.measureText(text).width + size * 2, sy = size * 3.5;
    for (let y = -H; y < H; y += sy) for (let x = -W * 1.2; x < W * 1.2; x += sx) { c.strokeText(text, x, y); c.fillText(text, x, y); }
    c.restore();
    c.font = `600 ${Math.max(14, W / 50)}px Montserrat, sans-serif`; c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillStyle = 'rgba(255,255,255,.9)'; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 8; c.fillText(text, W - 24, H - 20);
    cv.hidden = false; dl.hidden = false; dl.href = cv.toDataURL('image/jpeg', .9);
  }

  /* запись на замер */
  const dlg = $('#measure'), M = { product: D.products[0], day: null, slot: null };
  document.addEventListener('click', e => { if (e.target.closest('[data-measure]')) { e.preventDefault(); M.product = C.product; renderMeasure(); dlg.showModal(); } });
  $('#measureClose').addEventListener('click', () => dlg.close()); dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  function renderMeasure() {
    seg($('#mProduct'), D.products, M.product, p => { M.product = p; renderMeasure(); });
    const today = new Date(); today.setHours(0, 0, 0, 0); let h = '';
    for (let i = 1; i <= 10; i++) { const d = new Date(today); d.setDate(today.getDate() + i); const key = d.toISOString().slice(0, 10); if (!M.day) M.day = key;
      h += `<button type="button" class="day ${M.day === key ? 'is-on' : ''}" data-key="${key}"><small>${DOW[d.getDay()]}</small><b>${d.getDate()}</b><small>${MON[d.getMonth()]}</small></button>`; }
    $('#mDays').innerHTML = h;
    $('#mSlots').innerHTML = ['10:00', '12:00', '14:00', '16:00', '18:00'].map(t => `<button type="button" class="slot ${M.slot === t ? 'is-on' : ''}" data-t="${t}" ${hash(M.day + t) % 4 === 0 ? 'disabled' : ''}>${t}</button>`).join('');
    sum();
  }
  $('#mDays').addEventListener('click', e => { const b = e.target.closest('.day'); if (!b) return; M.day = b.dataset.key; M.slot = null; renderMeasure(); });
  $('#mSlots').addEventListener('click', e => { const b = e.target.closest('.slot'); if (!b || b.disabled) return; M.slot = b.dataset.t; $$('.slot').forEach(x => x.classList.toggle('is-on', x === b)); sum(); });
  $('#measureForm').addEventListener('input', sum);
  const fmtDay = k => { const [y, m, d] = k.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${DOW[dt.getDay()]}, ${d} ${MON[m - 1]}`; };
  function sum() {
    const f = $('#measureForm'), ok = M.slot && f.name.value.trim().length > 1 && f.phone.value.replace(/\D/g, '').length >= 10;
    $('#mSum').textContent = M.slot ? `${M.product.name} · ${fmtDay(M.day)}, ${M.slot}` : 'Выберите день и время';
    $('#mSend').style.opacity = ok ? 1 : .4; $('#mSend').style.pointerEvents = ok ? '' : 'none';
    if (ok) $('#mSend').href = wa(`Здравствуйте! Запись на замер.\nИзделие: ${M.product.name}\nКогда: ${fmtDay(M.day)}, ${M.slot}\nИмя: ${f.name.value.trim()}\nТелефон: ${f.phone.value.trim()}${f.addr.value.trim() ? '\nАдрес: ' + f.addr.value.trim() : ''}`);
  }

  /* появление, шапка, курсор */
  $$('.sec-top, .mat-side, .calc-left, .calc-right, .tool, .quote-wrap, .contacts > *').forEach(el => el.classList.add('rv'));
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { threshold: .1 });
  $$('.rv').forEach(el => io.observe(el));
  addEventListener('scroll', () => $('#hdr').classList.toggle('is-scrolled', scrollY > 30), { passive: true });
  const cur = $('#cursor');
  if (matchMedia('(hover:hover)').matches && !reduced) {
    addEventListener('mousemove', e => { cur.classList.add('is-on'); cur.style.transform = `translate(${e.clientX}px,${e.clientY}px) translate(-50%,-50%)`; }, { passive: true });
    document.addEventListener('mouseover', e => cur.classList.toggle('is-big', !!e.target.closest('a,button,.cat,.palette button')));
    document.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
  }
  if (hasGsap) {
    $$('.stats b').forEach(b => { const raw = b.dataset.count, n = parseInt(raw, 10); if (isNaN(n)) return; const o = { v: 0 };
      ScrollTrigger.create({ trigger: b, start: 'top 85%', once: true, onEnter: () => gsap.to(o, { v: n, duration: 1.4, ease: 'power2.out', onUpdate: () => b.textContent = raw.replace(String(n), Math.round(o.v)) }) }); });
    setupRail(); let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { setupRail(); ScrollTrigger.refresh(); }, 200); });
    addEventListener('load', () => ScrollTrigger.refresh());
  }
})();
