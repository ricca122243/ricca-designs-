/* RICCA · конструктор — QR-код ссылки на вариант (для «Посмотреть у себя дома» на компьютере).
   qrcode-generator 2.0.4 (MIT, vendor/qrcode). Возвращает SVG-текст: тёмные модули одним path, белое поле 4 модуля. */
import qrcode from '../../vendor/qrcode/qrcode.js';   // .js, не .mjs: часть хостингов отдаёт .mjs не как скрипт — тогда не стартует весь 3D

export function qrSvg(text, { size = 200, ecl = 'M', margin = 4, color = '#111111' } = {}) {
  const qr = qrcode(0, ecl);
  qr.addData(String(text), 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  const full = n + margin * 2;
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!qr.isDark(y, x)) { x++; continue; }
      let run = 1;
      while (x + run < n && qr.isDark(y, x + run)) run++;
      d += `M${x + margin} ${y + margin}h${run}v1h-${run}z`;
      x += run;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="QR-код ссылки на вариант">`
    + `<rect width="${full}" height="${full}" fill="#ffffff"/><path fill="${color}" d="${d}"/></svg>`;
}

export function qrModules(text, { ecl = 'M' } = {}) {
  const qr = qrcode(0, ecl); qr.addData(String(text), 'Byte'); qr.make();
  return qr.getModuleCount();
}
