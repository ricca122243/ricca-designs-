(function () {
  const D = window.BARBER;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = n => n.toLocaleString('ru-RU') + ' ₸';
  const pad = n => String(n).padStart(2, '0');
  const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const LEN = { short: 'Короткие', medium: 'Средние', long: 'Длинные', beard: 'Борода', perm: 'Завивка' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- контакты ---------- */
  const hours = `${pad(D.hours.open)}:00–${pad(D.hours.close)}:00`;
  const price = s => s.price, priceOf = (s, b) => (b && b.level === 'senior' && s.senior) ? s.senior : s.price;
  $('#heroCity').textContent = `Барбершоп · ${D.city}`;
  $('#factHours').textContent = hours;
  $('#factRating').textContent = D.rating;
  $('#factRatingSub').textContent = `${D.ratingCount} оценок в 2ГИС`;
  $('#factPrice').textContent = 'от ' + money(Math.min(...D.services.filter(x => x.cat === 'hair').map(price)));
  $('#cHours').textContent = `Ежедневно ${hours}. Оплата картой, наличными, QR.`;
  $('#cInst').href = D.instagram;
  $('#fName').textContent = D.name;
  $('#year').textContent = new Date().getFullYear();
  $('.logo-text').textContent = D.short;
  if (D.promo) $('#promo').innerHTML = `<span>${esc(D.promo)}</span>`;
  $('#branchesGrid').innerHTML = D.branches.map(b => `<div class="branch"><h3>${esc(b.name)}</h3><p class="muted">${esc(b.note)} · ${D.city}</p>
    <a class="phone" href="tel:${b.phone.replace(/[^\d+]/g, '')}">${esc(b.phone)}</a>
    <div class="branch-links"><button class="btn" data-book data-branch="${b.id}">Записаться</button>
    <a class="btn btn-ghost" href="https://wa.me/${b.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
    <a class="btn btn-ghost" href="${esc(b.map)}" target="_blank" rel="noopener">2ГИС</a></div></div>`).join('');
  $('#gallery').innerHTML = (D.gallery || []).map(g => `<img src="${esc(g)}" alt="Barber Shop 86" loading="lazy">`).join('');

  /* ---------- причёски ---------- */
  const svgHead = h => `<svg viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="60" cy="150" rx="46" ry="26" fill="hsl(${h} 25% 8%)"/>
    <path d="M38 95c-6 14-4 30 2 40h40c6-10 8-26 2-40" fill="hsl(28 40% 38%)"/>
    <ellipse cx="60" cy="66" rx="30" ry="38" fill="hsl(28 45% 46%)"/>
    <path d="M30 60c0-28 14-42 30-42s30 14 30 42c-4-14-12-20-30-20s-26 6-30 20z" fill="hsl(${h} 20% 14%)"/>
    <path d="M32 58c6-10 14-16 28-16s22 6 28 16c-2-18-12-30-28-30S34 40 32 58z" fill="hsl(${h} 18% 18%)"/>
  </svg>`;

  const grid = $('#stylesGrid');
  const filt = { length: 'all', tag: 'all' };
  function renderStyles() {
    const list = D.styles.filter(s => (filt.length === 'all' || s.length === filt.length) && (filt.tag === 'all' || s.tags.includes(filt.tag)));
    grid.innerHTML = list.map(s => {
      const svc = D.services.find(x => x.id === s.service);
      return `<article class="card">
        <div class="card-img" style="--h:${s.hue}">${s.img ? `<img src="${esc(s.img)}" alt="${esc(s.name)}" loading="lazy">` : svgHead(s.hue)}<span class="card-len">${LEN[s.length]}</span></div>
        <div class="card-body">
          <h3>${esc(s.name)}</h3>
          <p>${esc(s.desc)}</p>
          <div class="card-meta"><span>${svc.senior ? 'от ' : ''}${money(svc.price)}</span><span class="muted">${svc.min} мин</span></div>
          <button class="btn" data-book data-service="${svc.id}" data-style="${esc(s.name)}">Хочу так</button>
        </div></article>`;
    }).join('');
    $('#stylesEmpty').hidden = list.length > 0;
  }
  $$('.chip-row').forEach(row => row.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('.chip', row).forEach(c => c.classList.toggle('is-on', c === b));
    filt[row.dataset.group] = b.dataset.v; renderStyles();
  }));
  renderStyles();

  /* ---------- прайс, мастера, отзывы ---------- */
  $('#priceList').innerHTML = D.services.map(s => `<li data-book data-service="${s.id}">
    <span class="price-name">${esc(s.name)}<br><span class="price-min">${s.min} мин</span></span><span class="price-dots"></span><span class="price-val">${money(s.price)}${s.senior ? `<span class="price-min"> / ${money(s.senior)}</span>` : ''}</span></li>`).join('');
  $('#priceList').insertAdjacentHTML('afterend', '<p class="muted small" style="margin-top:14px">Первая цена у ведущего барбера, вторая у старшего.</p>');
  $('#barbersGrid').innerHTML = D.barbers.filter(b => b.id !== 'any').map(b => `<div class="barber">
    <div class="avatar">${esc(b.name[0])}</div><h3>${esc(b.name)}</h3><p class="muted">${esc(b.role)}</p>
    ${b.tag ? `<div class="barber-meta"><b>${esc(b.tag)}</b></div>` : ''}
    <button class="btn btn-sm" data-book data-barber="${b.id}">Записаться к ${esc(b.name)}</button></div>`).join('');
  $('#reviewsGrid').innerHTML = D.reviews.map(r => `<div class="review"><div class="stars">${'★'.repeat(r.rating)}</div><p>${esc(r.text)}</p><b>${esc(r.name)}</b></div>`).join('');

  /* ---------- nav / fab ---------- */
  const nav = $('#nav'), fab = $('.fab');
  addEventListener('scroll', () => {
    nav.classList.toggle('is-solid', scrollY > 40);
    fab.classList.toggle('is-on', scrollY > innerHeight * 0.7);
  }, { passive: true });

  /* ---------- запись ---------- */
  const dlg = $('#book');
  const st = { step: 0, branch: null, service: null, barber: null, day: null, slot: null, style: '' };
  const steps = $$('.step', dlg), stepTabs = $$('#steps li');
  const titles = ['Филиал', 'Услуга', 'Мастер', 'Дата и время', 'Контакты', 'Готово'];
  const next = $('#next'), back = $('#back');

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-book]'); if (!t) return;
    e.preventDefault();
    open({ branch: t.dataset.branch, service: t.dataset.service, barber: t.dataset.barber, style: t.dataset.style });
  });
  $('#bookClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  function open(o) {
    st.branch = o.branch ? D.branches.find(b => b.id === o.branch) : (st.branch || null);
    st.service = o.service ? D.services.find(s => s.id === o.service) : null;
    st.barber = o.barber ? D.barbers.find(b => b.id === o.barber) : null;
    st.style = o.style || '';
    st.day = null; st.slot = null;
    dlg.classList.remove('is-done');
    st.skipService = !!st.service;
    renderBranch(); renderService(); renderBarber();
    go(st.branch ? (st.skipService ? 2 : 1) : 0);
    if (!dlg.open) dlg.showModal();
  }
  function go(n) {
    st.step = n;
    steps.forEach(s => s.classList.toggle('is-on', +s.dataset.step === n));
    stepTabs.forEach((t, i) => { t.classList.toggle('is-on', i === n); t.classList.toggle('is-done', i < n); });
    $('#bookTitle').textContent = titles[n];
    back.style.visibility = n === 0 ? 'hidden' : '';
    next.textContent = n === 4 ? 'Записаться' : 'Дальше';
    if (n === 3) renderDays();
    if (n === 4) renderSummary();
    if (n === 5) { dlg.classList.add('is-done'); renderDone(); }
    refresh();
  }
  function refresh() {
    const ok = [!!st.branch, !!st.service, !!st.barber, !!(st.day && st.slot), true][st.step];
    next.disabled = !ok;
    $('#total').innerHTML = st.service ? `${money(priceOf(st.service, st.barber))}<small>${st.service.min} мин</small>` : '';
  }
  back.addEventListener('click', () => go(st.step === 2 && st.skipService ? 0 : st.step - 1));
  next.addEventListener('click', () => {
    if (st.step === 4 && !validate()) return;
    go(st.step === 0 && st.skipService ? 2 : st.step + 1);
  });

  function renderBranch() {
    $('#pickBranch').innerHTML = D.branches.map(b => `<button type="button" class="pick ${st.branch && st.branch.id === b.id ? 'is-on' : ''}" data-id="${b.id}">
      <div class="pick-main"><b>${esc(b.name)}</b><span>${esc(b.note)}</span></div></button>`).join('');
  }
  $('#pickBranch').addEventListener('click', e => {
    const b = e.target.closest('.pick'); if (!b) return;
    st.branch = D.branches.find(x => x.id === b.dataset.id);
    renderBranch(); refresh();
  });
  function renderService() {
    $('#pickService').innerHTML = D.services.map(s => `<button type="button" class="pick ${st.service && st.service.id === s.id ? 'is-on' : ''}" data-id="${s.id}">
      <div class="pick-main"><b>${esc(s.name)}</b><span>${s.min} мин</span></div><div class="pick-price">${s.senior ? '<small>от</small>' : ''}${money(s.price)}</div></button>`).join('');
  }
  $('#pickService').addEventListener('click', e => {
    const b = e.target.closest('.pick'); if (!b) return;
    st.service = D.services.find(s => s.id === b.dataset.id); st.slot = null; st.skipService = false;
    renderService(); refresh();
  });
  function renderBarber() {
    $('#pickBarber').innerHTML = D.barbers.map(b => `<button type="button" class="pick ${st.barber && st.barber.id === b.id ? 'is-on' : ''}" data-id="${b.id}">
      <div class="avatar" style="width:44px;height:44px;font-size:20px">${b.id === 'any' ? '✦' : esc(b.name[0])}</div>
      <div class="pick-main"><b>${esc(b.name)}</b><span>${esc(b.role)}${b.level === 'senior' ? ' · старший' : ''}</span>${b.tag ? `<span class="pick-tag">${esc(b.tag)}</span>` : ''}</div>${st.service ? `<div class="pick-price">${money(priceOf(st.service, b))}</div>` : ''}</button>`).join('');
  }
  $('#pickBarber').addEventListener('click', e => {
    const b = e.target.closest('.pick'); if (!b) return;
    st.barber = D.barbers.find(x => x.id === b.dataset.id); st.day = null; st.slot = null;
    renderBarber(); refresh();
  });

  /* дни и слоты. Занятость: детерминированная «псевдослучайность», пока нет бэкенда */
  function busy(dayKey, min, barberId) {
    let h = 0; const s = dayKey + min + barberId;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 100 < 28;
  }
  function worksOn(b, dow) { return b.id === 'any' || !b.days || b.days.includes(dow); }
  function renderDays() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const html = [];
    for (let i = 0; i < D.daysAhead; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const dis = !worksOn(st.barber, d.getDay());
      if (!st.day && !dis) st.day = key;
      html.push(`<button type="button" class="day ${st.day === key ? 'is-on' : ''}" data-key="${key}" ${dis ? 'disabled' : ''}>
        <small>${i === 0 ? 'сег' : i === 1 ? 'зав' : DOW[d.getDay()]}</small><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()]}</small></button>`);
    }
    $('#pickDay').innerHTML = html.join('');
    renderSlots();
  }
  $('#pickDay').addEventListener('click', e => {
    const b = e.target.closest('.day'); if (!b || b.disabled) return;
    st.day = b.dataset.key; st.slot = null;
    $$('.day').forEach(x => x.classList.toggle('is-on', x === b));
    renderSlots(); refresh();
  });
  function renderSlots() {
    const now = new Date();
    const isToday = st.day === new Date(now.getTime() - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    const dur = st.service ? st.service.min : 30, step = D.slotMinutes;
    const html = []; let free = 0;
    for (let m = D.hours.open * 60; m + dur <= D.hours.close * 60; m += step) {
      const past = isToday && m <= now.getHours() * 60 + now.getMinutes() + 30;
      const dis = past || busy(st.day, m, st.barber.id);
      if (!dis) free++;
      const label = `${pad(m / 60 | 0)}:${pad(m % 60)}`;
      html.push(`<button type="button" class="slot ${st.slot === label ? 'is-on' : ''}" data-t="${label}" ${dis ? 'disabled' : ''}>${label}</button>`);
    }
    $('#pickSlot').innerHTML = html.join('');
    $('#slotHint').textContent = free ? `Свободно: ${free} окон. Длительность ${dur} мин.` : 'На этот день всё занято, выберите другой.';
  }
  $('#pickSlot').addEventListener('click', e => {
    const b = e.target.closest('.slot'); if (!b || b.disabled) return;
    st.slot = b.dataset.t;
    $$('.slot').forEach(x => x.classList.toggle('is-on', x === b));
    refresh();
  });

  function fmtDay(key) {
    const [y, m, d] = key.split('-').map(Number); const dt = new Date(y, m - 1, d);
    return `${DOW[dt.getDay()]}, ${d} ${MONTHS[m - 1]}`;
  }
  function renderSummary() {
    $('#summary').innerHTML = `<div>Филиал: <b>${esc(st.branch.name)}, ${esc(st.branch.note)}</b></div><div>Услуга: <b>${esc(st.service.name)}${st.style ? ' («' + esc(st.style) + '»)' : ''}</b></div>
      <div>Мастер: <b>${esc(st.barber.name)}</b></div><div>Когда: <b>${fmtDay(st.day)}, ${st.slot}</b></div><div>Стоимость: <b>${money(priceOf(st.service, st.barber))}</b></div>`;
  }
  function validate() {
    const f = $('#bookForm'); let ok = true;
    const name = f.name, phone = f.phone;
    name.classList.toggle('is-bad', !(ok = name.value.trim().length >= 2) ? true : false);
    const digits = phone.value.replace(/\D/g, '');
    const pok = digits.length >= 10; phone.classList.toggle('is-bad', !pok);
    if (!pok) ok = false;
    if (!ok) (name.classList.contains('is-bad') ? name : phone).focus();
    return ok;
  }
  function renderDone() {
    const f = $('#bookForm');
    const msg = `Здравствуйте! Хочу записаться.\nФилиал: ${st.branch.name} (${st.branch.note})\n` +
      `Услуга: ${st.service.name}${st.style ? ' (' + st.style + ')' : ''}\n` +
      `Мастер: ${st.barber.name}\nКогда: ${fmtDay(st.day)}, ${st.slot}\n` +
      `Имя: ${f.name.value.trim()}\nТелефон: ${f.phone.value.trim()}` +
      (f.note.value.trim() ? `\nКомментарий: ${f.note.value.trim()}` : '');
    $('#sendWa').href = `https://wa.me/${st.branch.whatsapp}?text=${encodeURIComponent(msg)}`;
    // .ics
    const [y, mo, d] = st.day.split('-').map(Number), [hh, mm] = st.slot.split(':').map(Number);
    const start = new Date(y, mo - 1, d, hh, mm), end = new Date(start.getTime() + st.service.min * 6e4);
    const ics = dt => `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//barber//RU', 'BEGIN:VEVENT', `DTSTART:${ics(start)}`, `DTEND:${ics(end)}`,
      `SUMMARY:${D.name}: ${st.service.name}`, `LOCATION:${st.branch.name}, ${st.branch.note}, ${D.city}`, `DESCRIPTION:Мастер ${st.barber.name}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    $('#addCal').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(body);
  }
})();
