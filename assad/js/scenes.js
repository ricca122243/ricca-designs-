/* Векторные «рендеры» фасадов. В продакшене заменяются фото клиента. */
(function () {
  const MAT = {
    ldsp:   { a: '#b98d62', b: '#a77a52', wood: true,  name: 'ЛДСП Egger · Дуб Галифакс' },
    mdf:    { a: '#e9e6df', b: '#dcd8cf', wood: false, name: 'МДФ эмаль · Кашемир матовый' },
    veneer: { a: '#8b5e3c', b: '#74492c', wood: true,  name: 'Шпон дуба · масло' },
    dark:   { a: '#2d2f33', b: '#222427', wood: false, name: 'МДФ эмаль · Графит матовый' },
    sage:   { a: '#9aa58f', b: '#879279', wood: false, name: 'МДФ эмаль · Шалфей' },
  };
  let uid = 0;
  function defs(m, id) {
    const w = m.wood ? `<pattern id="w${id}" width="6" height="60" patternUnits="userSpaceOnUse"><rect width="6" height="60" fill="${m.a}"/><rect x="2" width="1.2" height="60" fill="${m.b}" opacity=".55"/><rect x="4.5" width=".6" height="60" fill="#000" opacity=".06"/></pattern>` : '';
    return `<defs>${w}
      <linearGradient id="f${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
      <linearGradient id="wall${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f3f0"/><stop offset="1" stop-color="#e9e7e2"/></linearGradient>
      <linearGradient id="floor${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9d4cb"/><stop offset="1" stop-color="#cdc7bc"/></linearGradient>
      <linearGradient id="mir${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dfe6ea"/><stop offset=".45" stop-color="#f7fafb"/><stop offset=".55" stop-color="#e3e9ec"/><stop offset="1" stop-color="#c9d2d7"/></linearGradient>
      <filter id="sh${id}" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity=".18"/></filter>
    </defs>`;
  }
  const fill = (m, id) => m.wood ? `url(#w${id})` : m.a;
  function door(x, y, w, h, m, id, handle = 'v', r = 1.5) {
    const hd = handle === 'v' ? `<rect x="${x + w - 7}" y="${y + h / 2 - 14}" width="1.6" height="28" rx=".8" fill="#333" opacity=".55"/>`
      : handle === 'h' ? `<rect x="${x + w / 2 - 14}" y="${y + 7}" width="28" height="1.6" rx=".8" fill="#333" opacity=".55"/>` : '';
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill(m, id)}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="url(#f${id})"/><rect x="${x + .5}" y="${y + .5}" width="${w - 1}" height="${h - 1}" rx="${r}" fill="none" stroke="#000" stroke-opacity=".12"/>${hd}</g>`;
  }
  function room(id, W = 400, H = 300, floorY = 240) {
    return `<rect width="${W}" height="${H}" fill="url(#wall${id})"/><rect y="${floorY}" width="${W}" height="${H - floorY}" fill="url(#floor${id})"/><rect y="${floorY - 1}" width="${W}" height="1" fill="#000" opacity=".08"/>`;
  }
  const S = {
    kitchen(m, id) {
      let s = room(id) + `<g filter="url(#sh${id})">`;
      // верхние шкафы
      const top = [[40, 70], [110, 70], [180, 70], [250, 70], [320, 50]];
      let x = 40; for (const [, w] of top.slice(0, 4)) { s += door(x, 60, 68, 70, m, id, 'none'); x += 70; }
      s += `<rect x="320" y="30" width="50" height="100" rx="1.5" fill="#f1efe9"/><rect x="320" y="30" width="50" height="100" fill="url(#f${id})"/>`;
      // вытяжка
      s += `<rect x="178" y="118" width="72" height="16" fill="#2b2b2b"/><rect x="178" y="118" width="72" height="3" fill="#444"/>`;
      // фартук
      s += `<rect x="40" y="132" width="330" height="40" fill="#e7e2d8"/><g stroke="#fff" stroke-opacity=".6"><line x1="40" y1="152" x2="370" y2="152"/><line x1="100" y1="132" x2="100" y2="172"/><line x1="160" y1="132" x2="160" y2="172"/><line x1="220" y1="132" x2="220" y2="172"/><line x1="280" y1="132" x2="280" y2="172"/><line x1="340" y1="132" x2="340" y2="172"/></g>`;
      // столешница
      s += `<rect x="36" y="172" width="338" height="6" fill="#2a2a2c"/><rect x="36" y="178" width="338" height="1" fill="#000" opacity=".25"/>`;
      // нижние
      x = 40; for (let i = 0; i < 4; i++) { s += door(x, 180, 68, 24, m, id, 'h'); s += door(x, 206, 68, 34, m, id, 'h'); x += 70; }
      s += door(320, 180, 50, 60, m, id, 'v');
      // варочная + мойка
      s += `<rect x="186" y="166" width="56" height="7" rx="1" fill="#111"/><circle cx="200" cy="169.5" r="2" fill="#555"/><circle cx="228" cy="169.5" r="2" fill="#555"/>`;
      s += `<rect x="50" y="167" width="46" height="5" rx="1" fill="#9aa0a6"/><rect x="70" y="150" width="2" height="18" fill="#9aa0a6"/><path d="M71 150 q10 -8 16 2" fill="none" stroke="#9aa0a6" stroke-width="2"/>`;
      // цоколь, подсветка
      s += `<rect x="40" y="240" width="330" height="1" fill="#000" opacity=".15"/><rect x="40" y="130" width="280" height="2" fill="#ffe9b0" opacity=".9"/></g>`;
      return s;
    },
    wardrobe(m, id) {
      let s = room(id) + `<g filter="url(#sh${id})">`;
      s += `<rect x="60" y="30" width="280" height="210" fill="#2a2a2c"/>`;
      s += door(66, 36, 88, 198, m, id, 'none');
      s += `<rect x="158" y="36" width="88" height="198" fill="url(#mir${id})"/><rect x="158" y="36" width="88" height="198" fill="none" stroke="#000" stroke-opacity=".15"/>`;
      s += door(250, 36, 84, 198, m, id, 'none');
      s += `<g stroke="#1a1a1a" stroke-width="2"><line x1="155" y1="36" x2="155" y2="234"/><line x1="248" y1="36" x2="248" y2="234"/></g>`;
      s += `<rect x="60" y="30" width="280" height="4" fill="#111"/><rect x="60" y="236" width="280" height="4" fill="#111"/></g>`;
      return s;
    },
    closet(m, id) {
      let s = room(id) + `<g filter="url(#sh${id})">`;
      // открытая система: стойки и полки
      s += `<rect x="40" y="30" width="320" height="210" fill="${fill(m, id)}" opacity=".18"/>`;
      [40, 150, 260, 356].forEach(x => s += `<rect x="${x}" y="30" width="4" height="210" fill="${m.wood ? m.b : '#3a3a3c'}"/>`);
      [60, 110, 160, 210].forEach(y => s += `<rect x="44" y="${y}" width="106" height="3" fill="${m.wood ? m.b : '#3a3a3c'}"/>`);
      // штанга с вещами
      s += `<rect x="154" y="60" width="106" height="2" fill="#555"/>`;
      ['#cfd3d8', '#9aa58f', '#2d2f33', '#e9e6df', '#b98d62', '#6b7f99'].forEach((c, i) => s += `<path d="M${165 + i * 16} 62 l-6 60 h12 z" fill="${c}"/>`);
      [150, 185, 220].forEach(y => s += `<rect x="154" y="${y}" width="106" height="3" fill="${m.wood ? m.b : '#3a3a3c'}"/>`);
      // ящики справа
      [60, 100, 140, 180].forEach(y => s += door(266, y, 88, 36, m, id, 'h'));
      // корзины-полки сверху
      s += `<rect x="44" y="40" width="106" height="3" fill="${m.wood ? m.b : '#3a3a3c'}"/>`;
      [[50, 68], [100, 68]].forEach(([x, y]) => s += `<rect x="${x}" y="${y}" width="40" height="38" rx="2" fill="#f3f1ec" stroke="#000" stroke-opacity=".1"/>`);
      s += `<rect x="40" y="28" width="320" height="2" fill="#ffe9b0" opacity=".9"/></g>`;
      return s;
    },
    hall(m, id) {
      let s = room(id) + `<g filter="url(#sh${id})">`;
      s += door(50, 30, 90, 210, m, id, 'v');
      // открытая ниша с крючками и зеркалом
      s += `<rect x="144" y="30" width="150" height="150" fill="${fill(m, id)}" opacity=".2"/><rect x="150" y="40" width="80" height="120" fill="url(#mir${id})" stroke="#000" stroke-opacity=".12"/>`;
      [250, 268, 286].forEach(x => s += `<circle cx="${x}" cy="60" r="3" fill="#333"/>`);
      // скамья с обувницей
      s += door(144, 186, 150, 54, m, id, 'h');
      s += `<rect x="144" y="180" width="150" height="8" rx="1" fill="#5b5f66"/>`;
      s += door(298, 30, 52, 210, m, id, 'v');
      s += `<rect x="144" y="28" width="150" height="2" fill="#ffe9b0" opacity=".9"/></g>`;
      return s;
    },
    tv(m, id) {
      let s = room(id) + `<g filter="url(#sh${id})">`;
      // рейки
      for (let x = 40; x < 360; x += 10) s += `<rect x="${x}" y="30" width="4" height="150" fill="${m.wood ? m.b : '#3a3a3c'}" opacity=".9"/>`;
      // телевизор
      s += `<rect x="130" y="60" width="140" height="80" rx="2" fill="#0f0f10"/><rect x="134" y="64" width="132" height="72" fill="#1c1e22"/>`;
      // парящая тумба
      s += door(60, 190, 92, 36, m, id, 'none'); s += door(154, 190, 92, 36, m, id, 'none'); s += door(248, 190, 92, 36, m, id, 'none');
      s += `<rect x="60" y="226" width="280" height="6" fill="#ffe9b0" opacity=".6"/>`;
      // полка
      s += `<rect x="60" y="150" width="120" height="4" fill="${fill(m, id)}"/></g>`;
      return s;
    },
    kids(m, id) {
      let s = room(id) + `<g filter="url(#sh${id})">`;
      // кровать-чердак
      s += `<rect x="40" y="110" width="200" height="12" fill="${fill(m, id)}"/><rect x="40" y="96" width="200" height="14" rx="2" fill="#cfd3d8"/><rect x="40" y="90" width="200" height="4" fill="${fill(m, id)}"/>`;
      [40, 236].forEach(x => s += `<rect x="${x}" y="60" width="4" height="180" fill="${m.wood ? m.b : '#3a3a3c'}"/>`);
      // лесенка
      for (let y = 130; y < 240; y += 22) s += `<rect x="222" y="${y}" width="16" height="3" fill="${m.wood ? m.b : '#3a3a3c'}"/>`;
      // стол под кроватью
      s += `<rect x="50" y="170" width="150" height="5" fill="${fill(m, id)}"/><rect x="60" y="175" width="4" height="65" fill="#555"/><rect x="186" y="175" width="4" height="65" fill="#555"/>`;
      s += door(150, 178, 46, 62, m, id, 'h');
      // шкаф
      s += door(258, 30, 50, 210, m, id, 'v'); s += door(310, 30, 50, 210, m, id, 'v');
      // декор
      s += `<circle cx="120" cy="60" r="14" fill="#f3c969" opacity=".8"/></g>`;
      return s;
    },
    chip(m, id) { // образец материала
      return `<rect width="120" height="120" rx="8" fill="${fill(m, id)}"/><rect width="120" height="120" rx="8" fill="url(#f${id})"/>`;
    },
  };
  window.SCENES = {
    MAT,
    render(scene, matId = 'ldsp', W = 400, H = 300) {
      const m = MAT[matId] || MAT.ldsp; const id = 's' + (uid++);
      const vb = scene === 'chip' ? '0 0 120 120' : `0 0 ${W} ${H}`;
      return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${defs(m, id)}${S[scene](m, id)}</svg>`;
    },
  };
})();
