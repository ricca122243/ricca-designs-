// node pdf.cjs <html> <out.pdf> <png-prefix> — PDF A4 и картинки страниц для проверки
const { chromium } = require('playwright');
const [src, out, png] = process.argv.slice(2);
(async () => {
  const br = await chromium.launch(); const p = await br.newPage();
  await p.goto(src.startsWith('http') ? src : 'file://' + src, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  // контент не должен залезать на подвал страницы
  const over = await p.evaluate(() => [...document.querySelectorAll('.page')].map((pg, i) => {
    const f = pg.querySelector('.foot').getBoundingClientRect();
    const last = [...pg.children].filter((c) => !c.classList.contains('foot')).pop().getBoundingClientRect();
    return `стр ${i + 1}: запас ${Math.round(f.top - last.bottom)} px`;
  }));
  console.log(over.join('; '));
  const fonts = await p.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight));
  console.log('шрифты:', [...new Set(fonts)].join(', '));
  await p.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await p.setViewportSize({ width: 794, height: 1123 });
  const pages = await p.$$('.page');
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${png}-${i + 1}.png` });
  await br.close();
})();
