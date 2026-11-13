// Ручная модель по фото: снимок 3D на размере телефона (390×844) через настоящий конструктор.
// node free-shot.js <папка> <id> [...]      BASE=http://localhost:8826 (исходники ricca/)   VIEW=front|side|top   DPR=2   SPEC=<имя файла без .json> — другой файл для этой модели
// Файл модели: ricca/models3d/free/<id>.json (ткань — поле fab файла, иначе из каталога). Печатает ошибки консоли.
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs');
global.window = {}; require('/home/user/ricca-designs-/ricca/js/catalog-data.js');
(async () => {
  const [out, ...ids] = process.argv.slice(2); const B = process.env.BASE || 'http://localhost:8826'; const VIEW = process.env.VIEW || '';
  const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +(process.env.DPR || 2), isMobile: process.env.PHONE !== '0', hasTouch: process.env.PHONE !== '0', serviceWorkers: 'block', reducedMotion: 'reduce' });   // PHONE=0 — то же окно, но как компьютер (с затенением AO)
  for (const id of ids) {
    const m = (window.RICCA_CATALOG_ALL || window.RICCA_CATALOG).find((x) => x.id === id); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message.slice(0, 200))); p.on('console', (c) => { if (c.type() === 'error' || /exact|3D /.test(c.text())) errs.push(c.text().slice(0, 200)); });
    try {
      const fid = process.env.SPEC || id; const file = `/home/user/ricca-designs-/ricca/models3d/free/${fid}.json`; const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
      const fab = spec.fab || m.fab || '';
      /* отделка ножек и рам из файла модели (legs: { kind: 'metal' | 'wood', finish: 'black' | 'gold' | 'chrome' | 'bronze' | 'bordeaux' | 'pink' | 'taupe' | 'oak' | 'walnut' | 'blackwood' | 'smoked' }) —
         подставляется в рецепт так же, как потом будет записано в каталог */
      let cfg = m.cfg;
      if (spec.legs && spec.legs.finish) {
        const t = cfg.split('~').filter((x) => !/^lf\./.test(x) && !(spec.legs.kind && /^lg\./.test(x) && !/^t\.bed/.test(cfg)));
        if (spec.legs.kind && !/^t\.bed/.test(cfg)) t.push('lg.' + spec.legs.kind);
        t.push('lf.' + spec.legs.finish); cfg = t.join('~');
      }
      await p.goto(`${B}/configurator.html?t=${Date.now()}#cfg=v1~${cfg}${fab ? '&f=' + encodeURIComponent(fab) : ''}&m=${id}&free=models3d/free/${fid}.json`, { waitUntil: 'load' });
      await p.waitForSelector('canvas', { timeout: 90000 });
      await p.waitForFunction(() => { const t = document.querySelector('[data-exact-off]'); return !!t; }, null, { timeout: 60000 }).catch(() => errs.push('точная модель не включилась (нет кнопки «Изменить форму»)'));
      await p.waitForTimeout(6000);
      if (VIEW) { await p.evaluate((v) => { const b = document.querySelector(`.vp__views [data-view="${v}"]`); if (b) b.click(); }, VIEW); await p.waitForTimeout(3500); }
      const c = await p.locator('canvas').first().boundingBox();
      await p.screenshot({ path: `${out}/${id}${VIEW ? '-' + VIEW : ''}.png`, clip: { x: c.x, y: c.y, width: c.width, height: c.height } });
      const dims = await p.evaluate(() => { const e = [...document.querySelectorAll('*')].find((n) => n.children.length === 0 && /^\d+[\d,]*\s*×\s*\d+[\d,]*\s*×\s*\d+[\d,]*\s*см$/.test((n.textContent || '').trim())); return e ? e.textContent.trim() : ''; });
      const fd = await p.evaluate(() => window.RICCA_FREE_DIMS || null); const cm = (v) => Math.round(v * 100);
      const own = fd ? `модель ${cm(fd.w)} × ${cm(fd.d)} × ${cm(fd.h)} см · рецепт ${cm(fd.rw)} × ${cm(fd.rd)} × ${cm(fd.rh)} см` : 'РУЧНАЯ МОДЕЛЬ НЕ ЗАГРУЗИЛАСЬ';
      console.log(id, 'ok', '|', own, errs.length ? '| ЗАМЕЧАНИЯ: ' + JSON.stringify([...new Set(errs)]) : '');
    } catch (e) { console.log(id, 'ОШИБКА', String(e).slice(0, 300), JSON.stringify(errs)); }
    await p.close();
  }
  await br.close();
})();
