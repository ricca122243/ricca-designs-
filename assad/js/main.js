(function () {
  const D = window.ASSAD, SC = window.SCENES;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = n => Math.round(n / 1000) * 1000;
  const fmt = n => money(n).toLocaleString('ru-RU') + ' ₸';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'], MON = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const wa = text => `https://wa.me/${D.whatsapp}?text=${encodeURIComponent(text)}`;

  /* контакты */
  ['#hdrWa', '#heroWa', '#cWa'].forEach(s => $(s).href = wa('Здравствуйте! Хочу заказать корпусную мебель.'));
  $('#cAddress').textContent = D.address; $('#cHours').textContent = D.hours;
  $('#cPhone').textContent = D.phone; $('#cPhone').href = 'tel:' + D.phone.replace(/[^\d+]/g, '');
  $('#cInst').href = D.instagram; $('#cMap').href = D.map; $('#year').textContent = new Date().getFullYear();

  /* hero сцена и бегущая строка */
  $('#heroScene').innerHTML = SC.render('kitchen', 'mdf', 400, 300);
  const words = D.products.map(p => p.name).concat(['Любой размер', 'Любой цвет', 'Свой цех в Алматы', 'Замер бесплатно']);
  $('#ticker').innerHTML = words.concat(words).map(w => `<span>${esc(w)}</span>`).join('');
  $('#statsList').innerHTML = D.stats.map(([b, s]) => `<li class="rv"><b data-count="${esc(b)}">${esc(b)}</b><span>${esc(s)}</span></li>`).join('');

  /* каталог */
  const matOrder = ['ldsp', 'mdf', 'veneer', 'dark', 'sage'];
  const matColor = { ldsp: '#b98d62', mdf: '#e9e6df', veneer: '#8b5e3c', dark: '#2d2f33', sage: '#9aa58f' };
  $('#catGrid').innerHTML = D.products.map((p, i) => `<article class="cat rv" data-id="${p.id}" style="transition-delay:${i * 60}ms">
    <div class="cat-img"><div class="cat-mat">${matOrder.slice(0, 4).map((m, j) => `<button type="button" data-m="${m}" class="${j === 0 ? 'is-on' : ''}" style="background:${matColor[m]}" aria-label="${esc(SC.MAT[m].name)}"></button>`).join('')}</div><div class="cat-svg">${SC.render(p.scene, 'ldsp')}</div></div>
    <div class="cat-body"><div><h3><i>${p.num}</i>${esc(p.name)}</h3><p>${esc(p.desc)}</p></div><div class="cat-price">от ${fmt(p.base)}<small>за ${p.unit}</small></div></div></article>`).join('');
  $('#catGrid').addEventListener('click', e => {
    const m = e.target.closest('.cat-mat button');
    if (m) {
      const card = m.closest('.cat'); const p = D.products.find(x => x.id === card.dataset.id);
      $$('.cat-mat button', card).forEach(b => b.classList.toggle('is-on', b === m));
      const box = $('.cat-svg', card); box.style.opacity = 0;
      setTimeout(() => { box.innerHTML = SC.render(p.scene, m.dataset.m); box.style.transition = 'opacity .5s'; box.style.opacity = 1; }, 120);
      return;
    }
    const card = e.target.closest('.cat'); if (!card) return;
    setProduct(card.dataset.id); location.hash = '#calc';
  });

  /* материалы */
  const swInfo = { ldsp: 'Австрийские плиты с текстурой дерева. 200+ декоров, кромка ABS 2 мм, не боится влаги.', mdf: 'Фасады МДФ, покрытые эмалью в любой цвет RAL. Матовые, глянцевые, soft-touch.', veneer: 'Натуральный шпон дуба под маслом. Тепло дерева, которое стареет красиво.', dark: 'Глубокий графит в матовой эмали. Не оставляет отпечатков благодаря покрытию anti-touch.', sage: 'Спокойный шалфей. Трендовый цвет кухонь и детских 2026 года.' };
  $('#swatches').innerHTML = matOrder.map((m, i) => `<div class="sw ${i === 0 ? 'is-on' : ''}" data-m="${m}">${SC.render('chip', m)}<span>${esc(SC.MAT[m].name.split(' · ')[1] || SC.MAT[m].name)}</span></div>`).join('') + `<div class="sw" style="display:grid;place-items:center;border:1px dashed #444;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#888">+ 200 декоров</div>`;
  $('#swatches').addEventListener('click', e => {
    const s = e.target.closest('.sw[data-m]'); if (!s) return;
    $$('.sw').forEach(x => x.classList.toggle('is-on', x === s));
    const h = $('#swName'); h.style.opacity = 0; setTimeout(() => { h.textContent = SC.MAT[s.dataset.m].name; $('#swNote').textContent = swInfo[s.dataset.m]; h.style.opacity = 1; }, 200);
  });

  /* калькулятор */
  const C = { product: D.products[0], mat: D.materials[0], hw: D.hardware[0], len: D.products[0].def };
  const seg = (el, items, cur, on) => { el.innerHTML = items.map(i => `<button type="button" data-id="${i.id}" class="${i.id === cur.id ? 'is-on' : ''}">${esc(i.name)}${i.note ? `<small>${esc(i.note)}</small>` : ''}</button>`).join(''); el.onclick = e => { const b = e.target.closest('button'); if (b) on(items.find(i => i.id === b.dataset.id)); }; };
  function setProduct(id) { C.product = D.products.find(p => p.id === id); C.len = C.product.def; const r = $('#calcLen'); r.min = C.product.min; r.max = C.product.max; r.value = C.len; renderCalc(); }
  function renderCalc() {
    seg($('#calcProduct'), D.products, C.product, p => setProduct(p.id));
    seg($('#calcMat'), D.materials, C.mat, m => { C.mat = m; renderCalc(); });
    seg($('#calcHw'), D.hardware, C.hw, h => { C.hw = h; renderCalc(); });
    $('#calcLenOut').textContent = C.len + ' м'; $('#calcUnit').textContent = C.product.unit;
    const per = C.product.base * C.mat.k * C.hw.k, total = per * C.len;
    animateNumber($('#calcTotal'), total);
    $('#calcPer').textContent = `${fmt(per)} за ${C.product.unit} · ${C.product.name.toLowerCase()}, ${C.mat.name}, фурнитура ${C.hw.name}`;
    $('#calcWa').href = wa(`Здравствуйте! Посчитал на сайте: ${C.product.name}, ${C.len} ${C.product.unit}, фасады ${C.mat.name}, фурнитура ${C.hw.name}. Ориентир ${fmt(total)}. Хочу точную смету.`);
  }
  $('#calcLen').addEventListener('input', e => { C.len = +e.target.value; renderCalc(); });
  let numTween = null;
  function animateNumber(el, to) {
    const from = +(el.dataset.v || 0); el.dataset.v = to;
    if (!window.gsap) { el.textContent = fmt(to); return; }
    numTween && numTween.kill(); const o = { v: from };
    numTween = gsap.to(o, { v: to, duration: .6, ease: 'power2.out', onUpdate: () => el.textContent = fmt(o.v) });
  }
  renderCalc();

  /* шаги, отзывы, защищённая галерея */
  $('#stepsList').innerHTML = D.steps.map(([h, t]) => `<li class="rv"><h3>${esc(h)}</h3><p>${esc(t)}</p></li>`).join('');
  $('#reviewsList').innerHTML = D.reviews.map((r, i) => `<div class="rev rv" style="transition-delay:${i * 60}ms"><span class="stars">★★★★★</span><q>${esc(r.text)}</q><b>${esc(r.name)} · 2ГИС</b></div>`).join('');
  $('#protectDemo').innerHTML = SC.render('wardrobe', 'veneer'); $('#protectDemo').addEventListener('contextmenu', e => e.preventDefault());

  /* водяной знак */
  const drop = $('#wmDrop'), file = $('#wmFile'), cv = $('#wmCanvas'), dl = $('#wmDownload');
  let img = null;
  drop.addEventListener('click', () => file.click());
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', e => load(e.dataTransfer.files[0]));
  file.addEventListener('change', () => load(file.files[0]));
  $('#wmText').addEventListener('input', draw); $('#wmSize').addEventListener('input', draw);
  function load(f) { if (!f || !f.type.startsWith('image/')) return; const u = URL.createObjectURL(f); const i = new Image(); i.onload = () => { img = i; URL.revokeObjectURL(u); draw(); }; i.src = u; }
  function draw() {
    if (!img) return; const W = Math.min(img.naturalWidth, 1600), H = Math.round(img.naturalHeight * W / img.naturalWidth);
    cv.width = W; cv.height = H; const c = cv.getContext('2d'); c.drawImage(img, 0, 0, W, H);
    const text = $('#wmText').value || 'ASSAD', size = W * (+$('#wmSize').value) / 100;
    c.save(); c.translate(W / 2, H / 2); c.rotate(-Math.PI / 8); c.font = `500 ${size}px Montserrat, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(255,255,255,.28)'; c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = size / 30;
    const stepX = c.measureText(text).width + size * 2, stepY = size * 3.5;
    for (let y = -H; y < H; y += stepY) for (let x = -W * 1.2; x < W * 1.2; x += stepX) { c.strokeText(text, x, y); c.fillText(text, x, y); }
    c.restore();
    c.font = `600 ${Math.max(14, W / 50)}px Montserrat, sans-serif`; c.textAlign = 'right'; c.textBaseline = 'bottom'; c.fillStyle = 'rgba(255,255,255,.9)'; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 8;
    c.fillText(text, W - 24, H - 20);
    cv.hidden = false; dl.hidden = false; dl.href = cv.toDataURL('image/jpeg', .9);
  }

  /* запись на замер */
  const dlg = $('#measure'), M = { product: D.products[0], day: null, slot: null };
  document.addEventListener('click', e => { if (e.target.closest('[data-measure]')) { e.preventDefault(); M.product = C.product; renderMeasure(); dlg.showModal(); } });
  $('#measureClose').addEventListener('click', () => dlg.close()); dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  function renderMeasure() {
    seg($('#mProduct'), D.products, M.product, p => { M.product = p; renderMeasure(); });
    const today = new Date(); today.setHours(0, 0, 0, 0); let html = '';
    for (let i = 1; i <= 10; i++) { const d = new Date(today); d.setDate(today.getDate() + i); const key = d.toISOString().slice(0, 10); if (!M.day) M.day = key;
      html += `<button type="button" class="day ${M.day === key ? 'is-on' : ''}" data-key="${key}"><small>${DOW[d.getDay()]}</small><b>${d.getDate()}</b><small>${MON[d.getMonth()]}</small></button>`; }
    $('#mDays').innerHTML = html;
    $('#mSlots').innerHTML = ['10:00', '12:00', '14:00', '16:00', '18:00'].map((t, i) => `<button type="button" class="slot ${M.slot === t ? 'is-on' : ''}" data-t="${t}" ${hash(M.day + t) % 4 === 0 ? 'disabled' : ''}>${t}</button>`).join('');
    sum();
  }
  function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
  $('#mDays').addEventListener('click', e => { const b = e.target.closest('.day'); if (!b) return; M.day = b.dataset.key; M.slot = null; renderMeasure(); });
  $('#mSlots').addEventListener('click', e => { const b = e.target.closest('.slot'); if (!b || b.disabled) return; M.slot = b.dataset.t; $$('.slot').forEach(x => x.classList.toggle('is-on', x === b)); sum(); });
  $('#measureForm').addEventListener('input', sum);
  function fmtDay(k) { const [y, m, d] = k.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${DOW[dt.getDay()]}, ${d} ${MON[m - 1]}`; }
  function sum() {
    const f = $('#measureForm'); const ok = M.slot && f.name.value.trim().length > 1 && f.phone.value.replace(/\D/g, '').length >= 10;
    $('#mSum').textContent = M.slot ? `${M.product.name} · ${fmtDay(M.day)}, ${M.slot}` : 'Выберите день и время';
    $('#mSend').style.opacity = ok ? 1 : .4; $('#mSend').style.pointerEvents = ok ? '' : 'none';
    if (ok) $('#mSend').href = wa(`Здравствуйте! Запись на замер.\nИзделие: ${M.product.name}\nКогда: ${fmtDay(M.day)}, ${M.slot}\nИмя: ${f.name.value.trim()}\nТелефон: ${f.phone.value.trim()}${f.addr.value.trim() ? '\nАдрес: ' + f.addr.value.trim() : ''}`);
  }

  /* скролл-анимации */
  $$('.sec-head, .calc-copy, .calc-box, .mat-wrap, .tool, .contacts > *').forEach(el => el.classList.add('rv'));
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { threshold: .12 });
  $$('.rv').forEach(el => io.observe(el));
  addEventListener('scroll', () => $('#hdr').classList.toggle('is-scrolled', scrollY > 20), { passive: true });

  if (window.gsap && window.ScrollTrigger && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.to('#heroScene', { yPercent: -18, scale: 1.06, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: .6 } });
    gsap.to('.hero-h', { yPercent: 22, opacity: .15, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: .6 } });
    $$('.stats b').forEach(b => { const raw = b.dataset.count, n = parseInt(raw, 10); if (isNaN(n)) return;
      const o = { v: 0 }; ScrollTrigger.create({ trigger: b, start: 'top 85%', once: true, onEnter: () => gsap.to(o, { v: n, duration: 1.4, ease: 'power2.out', onUpdate: () => b.textContent = raw.replace(String(n), Math.round(o.v)) }) }); });
    $$('.cat').forEach(c => gsap.fromTo($('.cat-img', c), { yPercent: 4 }, { yPercent: -4, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } }));
    // лёгкий наклон карточек за курсором
    $$('.cat').forEach(c => { c.addEventListener('mousemove', e => { const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; gsap.to(c, { rotateY: x * 6, rotateX: -y * 6, transformPerspective: 900, duration: .5, ease: 'power2.out' }); }); c.addEventListener('mouseleave', () => gsap.to(c, { rotateX: 0, rotateY: 0, duration: .8, ease: 'power3.out' })); });
  }
})();
