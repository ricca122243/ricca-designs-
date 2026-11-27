// Карточки альбома для постов Telegram (27 ноября, первый пост канала): 1080×1350 в стиле сайта — заголовок, строка, логотип RD | RICCA, настоящее фото работы.
// Нужен локальный сервер папки ricca: python3 -m http.server 8765 --directory ricca (шрифты, логотип, фото берутся оттуда).
// node tools/tg-cards.cjs <cards.json> <папка>:
// [{ "head": "…", "sub": "…", "photo": "ricca-2521", "pos": "50% 60%" }, …]; фото — img/works/<id>-1-1600.webp (настоящие фото работ)
const { chromium } = require('playwright');
const fs = require('fs');
const [file, out] = process.argv.slice(2);
const cards = JSON.parse(fs.readFileSync(file, 'utf8'));
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
(async () => {
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const [i, c] of cards.entries()) {
    const html = `<!doctype html><html><head><base href="http://localhost:8765/"><meta charset="utf-8">
<link rel="stylesheet" href="css/fonts-v3.css"><style>
html,body{margin:0;background:#F4F5F7}
.c{position:relative;width:1080px;height:1350px;overflow:hidden;background:#F4F5F7;font-family:Montserrat,system-ui,sans-serif;color:#0A0A0A}
.top{position:absolute;left:0;right:0;top:0;height:280px;padding:64px 64px 0;box-sizing:border-box}
.h{font-weight:500;font-size:30px;line-height:1.35;letter-spacing:.12em;text-transform:uppercase;max-width:640px}
.s{margin-top:18px;font-weight:400;font-size:24px;line-height:1.45;color:#6B6E73;max-width:640px}
.logo{position:absolute;right:64px;top:62px;display:flex;align-items:center;gap:16px}
.logo img{height:30px;width:auto}.logo i{display:block;width:1px;height:34px;background:#0A0A0A;opacity:.5}
.logo b{display:block;font-weight:400;font-size:21px;letter-spacing:.32em}.logo small{display:block;margin-top:2px;font-size:10px;letter-spacing:.3em;color:#6B6E73}
.ph{position:absolute;left:0;right:0;bottom:0;height:1070px}
.ph img{width:100%;height:100%;object-fit:cover;object-position:${esc(c.pos || '50% 50%')};display:block}
.n{position:absolute;left:64px;bottom:48px;font-size:18px;letter-spacing:.2em;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.35)}
</style></head><body><div class="c">
<div class="top"><div class="h">${esc(c.head)}</div>${c.sub ? `<div class="s">${esc(c.sub)}</div>` : ''}
<div class="logo"><img src="img/logo/rd-monogram.svg" alt=""><i></i><span><b>RICCA</b><small>DESIGNS • ALMATY</small></span></div></div>
<div class="ph"><img src="img/works/${esc(c.photo)}-1-1600.webp" alt=""></div>
</div></body></html>`;
    await p.setContent(html, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/card-${String(i + 1).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  }
  await br.close(); console.log('карточек:', cards.length);
})();
