// Страница каждой модели (владелец, 15 ноября: «как у Mononova — нажмёшь на диван, целая вкладка: размер, чертёж, 3D, всё аккуратно»).
// Запуск: node tools/model-pages.mjs  → ricca/models/<имя>.html и dist/RICCA-site/models/<имя>.html, + адреса в sitemap.xml.
// Данные — js/catalog-data.js; габариты — тем же расчётом, что в конструкторе (js/cfg/params.js → dims).
import fs from 'fs';
const ROOT = new URL('..', import.meta.url).pathname;
const { decodeCfg } = await import(ROOT + 'ricca/js/cfg/share.js');
const { dims, normalize } = await import(ROOT + 'ricca/js/cfg/params.js');
globalThis.window = {}; await import(ROOT + 'ricca/js/catalog-data.js');
const ALL = window.RICCA_CATALOG_ALL;
const CATS = { sofas: ['Диваны', 'Диван'], beds: ['Кровати', 'Кровать'], armchairs: ['Кресла', 'Кресло'], poufs: ['Пуфы и банкетки', 'Пуф'], chairs: ['Стулья', 'Стул'], tables: ['Столы', 'Стол'] };
const SITE = 'https://ricca.design';
const WA = (t) => `https://wa.me/77079550808?text=${encodeURIComponent(t)}`;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nb = (s) => esc(s).replace(/ (—|–)/g, '&nbsp;$1').replace(/(^|\s)([а-яёА-ЯЁa-z]{1,2}) /g, '$1$2&nbsp;');
const slug = (m) => m.short.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const cm = (v) => Math.round(v * 100);

function size(m) {
  if (!m.cfg) return '';
  try { const s = decodeCfg(m.cfg.startsWith('t.') ? m.cfg : 't.' + m.cfg); const d = dims(s.type, normalize(s.type, s.params)); return `${cm(d.w)} × ${cm(d.d)} × ${cm(d.h)} см`; } catch { return ''; }
}
const cfgHref = (m) => `/configurator.html#cfg=v1~${/~|^t\./.test(m.cfg) ? m.cfg : 't.' + encodeURIComponent(m.cfg)}${m.fab ? `&f=${encodeURIComponent(m.fab)}` : ''}`;

function page(m) {
  const [catName, kind] = CATS[m.category] || ['Каталог', m.type];
  const title = m.name, sz = size(m), ph = m.photos.slice(0, 6);
  const same = ALL.filter((x) => x.category === m.category && x.id !== m.id && x.photos?.length && x.short);
  const i0 = same.findIndex((x) => ALL.indexOf(x) > ALL.indexOf(m));
  const rec = [...same.slice(Math.max(i0, 0)), ...same.slice(0, Math.max(i0, 0))].slice(0, 4);
  const rows = [
    ['Размер на фото', sz ? `${sz} <small>ширина × глубина × высота</small>` : ''],
    ['Размер', nb(m.sizes)],
    ['Ткань', nb(m.materials)],
    ['Наполнение', nb(m.filling)],
    ['Исполнение', (m.options || []).map(nb).join(' · ')],
    ['Изготовление', nb(m.lead)],
    ['Гарантия', nb(m.warranty)],
    ['Доставка', nb(m.delivery)],
  ].filter(([, v]) => v);
  const desc = `${title} на заказ в Алматы — ${m.description} Размер и ткань под ваш интерьер, изготовление до 30 дней, гарантия 5 лет.`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'Product', name: title, description: m.description, brand: { '@type': 'Brand', name: 'RICCA DESIGNS' }, image: ph.map((p) => `${SITE}/${p.src}`), category: catName, url: `${SITE}/models/${slug(m)}` },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [[1, 'Главная', `${SITE}/`], [2, catName, `${SITE}/#catalog/${m.category}`], [3, title, `${SITE}/models/${slug(m)}`]].map(([position, name, item]) => ({ '@type': 'ListItem', position, name, item })) }];
  const pic = (p, i) => `<figure class="mp__ph${p.studio && !p.scene ? ' is-studio' : ''}"><img src="/${esc(p.src)}" ${p.src600 ? `srcset="/${esc(p.src600)} 600w, /${esc(p.src)} ${p.w || 1400}w" sizes="(min-width: 960px) 58vw, 100vw" ` : ''}width="${p.w || 1200}" height="${p.h || 900}" alt="${esc(p.alt || title)}"${i ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async"></figure>`;
  return `<!doctype html>
<html lang="ru" translate="no">
<head>
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- Создано tools/model-pages.mjs из js/catalog-data.js — правки вручную пропадут при следующем запуске -->
<title>${esc(title)} на заказ в Алматы — RICCA DESIGNS</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/models/${slug(m)}">
<meta property="og:title" content="${esc(title)} — RICCA DESIGNS">
<meta property="og:description" content="${esc(m.description)}">
<meta property="og:image" content="${SITE}/${esc(ph[0].src)}">
<link rel="icon" href="/img/v3/favicon-v3.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/fonts-v3.css">
<link rel="stylesheet" href="/css/model.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<header class="mp-top">
  <a class="mp-top__logo" href="/">RICCA</a>
  <a class="mp-top__back" href="/#catalog/${m.category}">‹ ${catName}</a>
</header>
<main class="mp">
  <div class="mp__gal" aria-label="Фото модели">${ph.map(pic).join('')}</div>
  <div class="mp__info">
    <p class="mp__k">${esc(kind)}${m.subtitle && m.subtitle !== kind ? ` · ${esc(m.subtitle)}` : ''}</p>
    <h1 class="mp__t">${esc(m.short)}</h1>
    <p class="mp__d">${nb(m.description)}</p>
    <div class="mp__acts">
      <a class="mp__btn" href="${WA(`Здравствуйте! Интересует ${title}. Подскажите стоимость и сроки.`)}" target="_blank" rel="noopener">Узнать цену в WhatsApp</a>
      ${m.cfg ? `<a class="mp__btn mp__btn--line" href="${cfgHref(m)}">Собрать в 3D</a>` : ''}
    </div>
    ${m.cfg ? `<p class="mp__links"><a href="${cfgHref(m)}&draw=1">Чертёж</a><a href="${WA(`Здравствуйте! Пришлите, пожалуйста, 3D-модель «${title}» для дизайн-проекта.`)}" target="_blank" rel="noopener">3D-файл для дизайнера</a></p>` : ''}
    <dl class="mp__spec">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <p class="mp__note">Шоурум: Алматы, ул.&nbsp;Алишера Навои,&nbsp;208/2 · <a href="tel:+77079550808">+7&nbsp;(707)&nbsp;955-08-08</a></p>
  </div>
</main>
${rec.length ? `<section class="mp-rec" aria-labelledby="rec-t">
  <h2 class="mp-rec__t" id="rec-t">Ещё ${catName.toLowerCase()}</h2>
  <ul class="mp-rec__l" role="list">${rec.map((x) => { const p = x.photos.find((q) => q.studio && !q.scene) || x.photos[0]; return `<li><a href="/models/${slug(x)}"><span class="mp-rec__ph"><img src="/${esc(p.src600 || p.src)}" width="600" height="450" alt="" loading="lazy" decoding="async"></span><span class="mp-rec__n">${esc(x.name)}</span></a></li>`; }).join('')}</ul>
</section>` : ''}
<footer class="mp-foot"><a href="/">RICCA DESIGNS</a> · Ателье мягкой мебели · Алматы</footer>
</body>
</html>
`;
}

const list = ALL.filter((m) => m.short && m.photos?.length && CATS[m.category]);
for (const dir of ['ricca/models', 'dist/RICCA-site/models']) {
  fs.mkdirSync(ROOT + dir, { recursive: true });
  for (const m of list) fs.writeFileSync(`${ROOT}${dir}/${slug(m)}.html`, page(m));
}
fs.copyFileSync(ROOT + 'ricca/css/model.css', ROOT + 'dist/RICCA-site/css/model.css');
// карта сайта: главная, en и страницы моделей
const sm = ROOT + 'dist/RICCA-site/sitemap.xml'; let s = fs.readFileSync(sm, 'utf8').replace(/\s*<url><loc>https:\/\/ricca\.design\/models\/[^]*?<\/url>/g, '');
const day = new Date().toISOString().slice(0, 10);
s = s.replace('</urlset>', list.map((m) => `  <url><loc>${SITE}/models/${slug(m)}</loc><lastmod>${day}</lastmod><priority>0.7</priority></url>`).join('\n') + '\n</urlset>');
fs.writeFileSync(sm, s);
console.log('страниц:', list.length, 'без размера:', list.filter((m) => !size(m)).map((m) => m.id).join(' '));
