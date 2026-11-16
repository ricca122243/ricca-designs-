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

const cfgOf = (m) => (m.cfg.startsWith('t.') ? m.cfg : 't.' + m.cfg);
const cfgHref = (m) => `/configurator.html#cfg=v1~${cfgOf(m)}${m.fab ? `&f=${encodeURIComponent(m.fab)}` : ''}${m.glb ? `&m=${encodeURIComponent(m.id)}` : ''}`;
function seat(m) {
  if (!m.cfg || !['sofas', 'armchairs'].includes(m.category)) return '';
  try { const s = decodeCfg(cfgOf(m)); const p = normalize(s.type, s.params); return p.seatH ? `Высота сиденья — ${cm(p.seatH)}&nbsp;см, глубина посадки — ${cm(p.seatD)}&nbsp;см.` : ''; } catch { return ''; }
}
await import(ROOT + 'ricca/js/fabrics-data.js');
/* палитра на странице — только свои коллекции RICCA (букле, велюр, экокожа): крупные квадраты, ссылка на цвет в разделе «Ткани» */
const FAB = window.RICCA_FABRIC_LIBRARY.types.flatMap((t) => t.collections).filter((c) => /^ricca/.test(c.id))
  .flatMap((c) => c.colours.map((k, i) => ({ ...k, id: c.id, n: i + 1, kind: c.kind.split(':')[0] }))
    .filter((k, i) => (c.id === 'ricca' ? [0, 3, 6, 9, 12, 15].includes(i) : i < 3))).slice(0, 12);
const ATL = [['01', 'Каркас', 'Фанера и&nbsp;массив дерева. Детали вырезает станок с&nbsp;ЧПУ SCM&nbsp;— точно по&nbsp;чертежу.', 'img/process/atelier-02-cnc-1000.webp'],
  ['02', 'Пошив', 'Кроим по&nbsp;лекалам модели, шьём на&nbsp;промышленных машинах Dürkopp Adler.', 'img/process/atelier-04-sew-1000.webp'],
  ['03', 'Обивка', 'Обтяжка вручную: ткань без складок, швы по&nbsp;линии. Собираем, проверяем, упаковываем.', 'img/process/atelier-05-uph-1000.webp']];
const DET = /-(d\d|z\d|c\d)/, ZOOM = /-z\d/, REAL = /-d\d/;   // z — увеличенные вырезки: на крупном кадре размыты (владелец: «ужас, дешевит»), на странице не ставим

function page(m) {
  const [catName, kind] = CATS[m.category] || ['Каталог', m.type];
  const title = m.name, nm = esc(m.short), sz = size(m), u = `${SITE}/models/${slug(m)}`;
  const hero = m.photos.filter((p) => !DET.test(p.src)).slice(0, 4);
  const det = m.photos.filter((p) => REAL.test(p.src)).slice(0, 3);   // только настоящие крупные планы съёмки (-d); своих вырезок не ставим (владелец, 16 ноября)
  const heroL = hero.length ? hero : m.photos.slice(0, 1);
  const drw = m.cfg && fs.existsSync(`${ROOT}ricca/img/drawings/${slug(m)}.webp`) ? `/img/drawings/${slug(m)}.webp` : '';
  const same = ALL.filter((x) => x.category === m.category && x.id !== m.id && x.photos?.length && x.short);
  const i0 = same.findIndex((x) => ALL.indexOf(x) > ALL.indexOf(m));
  const rec = [...same.slice(Math.max(i0, 0)), ...same.slice(0, Math.max(i0, 0))].slice(0, 4);
  const desc = `${title} на заказ в Алматы — ${m.description} Размер и ткань под ваш интерьер, изготовление до 30 дней, гарантия 5 лет.`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'Product', name: title, description: m.description, brand: { '@type': 'Brand', name: 'RICCA DESIGNS' }, image: m.photos.slice(0, 6).map((p) => `${SITE}/${p.src}`), category: catName, url: u },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [[1, 'Главная', `${SITE}/`], [2, catName, `${SITE}/#catalog/${m.category}`], [3, title, u]].map(([position, name, item]) => ({ '@type': 'ListItem', position, name, item })) }];
  const img = (p, sizes, lazy = true) => `<img src="/${esc(p.src)}"${p.src600 ? ` srcset="/${esc(p.src600)} 600w, /${esc(p.src)} ${p.w || 1400}w" sizes="${sizes}"` : ''} width="${p.w || 1200}" height="${p.h || 900}" alt="${esc(p.alt || title)}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async">`;
  const fig = (p, cls = '') => `<figure class="mp-ph${p.studio && !p.scene && !DET.test(p.src) ? ' is-studio' : ''}${cls}">${img(p, '(min-width: 960px) 60vw, 100vw')}</figure>`;
  const acc = (t, body, open = false) => `<details class="mp-acc"${open ? ' open' : ''}><summary>${t}<span class="mp-acc__i" aria-hidden="true"></span></summary><div class="mp-acc__b">${body}</div></details>`;
  const sec = (id, h, text, inner = '') => `<section class="mp-sec" id="${id}" aria-labelledby="${id}-t"><div class="mp-sec__in"><h2 class="mp-sec__t" id="${id}-t">${h}</h2>${text ? `<div class="mp-sec__p">${text}</div>` : ''}</div>${inner}</section>`;
  const waModel = WA(`Здравствуйте! Пришлите, пожалуйста, 3D-модель «${title}» для дизайн-проекта.`);
  return `<!doctype html>
<html lang="ru" translate="no">
<head>
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- Создано tools/model-pages.mjs из js/catalog-data.js — правки вручную пропадут при следующем запуске -->
<title>${esc(title)} на заказ в Алматы — RICCA DESIGNS</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${u}">
<meta property="og:title" content="${esc(title)} — RICCA DESIGNS">
<meta property="og:description" content="${esc(m.description)}">
<meta property="og:image" content="${SITE}/${esc(m.photos[0].src)}">
<link rel="icon" href="/img/v3/favicon-v3.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/fonts-v3.css">
<link rel="stylesheet" href="/css/model.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script src="/js/model.js" defer></script>
</head>
<body>
<header class="mp-top">
  <a class="mp-top__logo" href="/" aria-label="RICCA DESIGNS — на главную"><b>RD</b><span>RICCA<small>DESIGNS · ALMATY</small></span></a>
  <a class="mp-top__back" href="/#catalog/${m.category}">‹ ${catName}</a>
</header>
<main>
<div class="mp-hero">
  <div class="mp-gal" aria-label="Фото модели" data-gal>${heroL.map((p, i) => `<figure class="mp-ph${p.studio && !p.scene ? ' is-studio' : ''}">${img(p, '(min-width: 960px) 60vw, 100vw', i > 0)}</figure>`).join('')}</div>
  ${heroL.length > 1 ? `<p class="mp-gal__n" aria-hidden="true"><span data-gal-i>1</span> / ${heroL.length}</p>` : ''}
  <div class="mp-info">
    <p class="mp-k">${esc(kind)}${m.subtitle && m.subtitle !== kind ? ` · ${esc(m.subtitle)}` : ''}</p>
    <h1 class="mp-t">${nm}</h1>
    <p class="mp-d">${nb(m.description)}</p>
    ${sz ? `<p class="mp-size"><span>${sz.replace(' см', '')}</span> см · ширина × глубина × высота</p>` : ''}
    <div class="mp-acts">
      <a class="mp-btn" href="${WA(`Здравствуйте! Интересует ${title}. Подскажите стоимость и сроки.`)}" target="_blank" rel="noopener">Узнать цену</a>
      ${m.cfg ? `<a class="mp-btn mp-btn--line" href="${cfgHref(m)}">Собрать в 3D</a>` : `<a class="mp-btn mp-btn--line" href="#write">Написать нам</a>`}
    </div>
    <div class="mp-accs">
      ${acc('Размеры', `${sz ? `<p>На фото: ${sz} (ширина × глубина × высота).</p>` : ''}<p>${nb(m.sizes)}</p>${seat(m) ? `<p>${seat(m)}</p>` : ''}`, true)}
      ${acc('Ткань и наполнение', `<p>${nb(m.materials)}</p><p>${nb(m.filling)}</p>`)}
      ${acc('Доставка, сборка, упаковка', `<p>${nb(m.delivery)}. По Алматы привозим и собираем сами; в другие города отправляем транспортной компанией.</p><p>Каждое изделие упаковываем в плотную плёнку и картон, углы защищаем.</p>`)}
      ${acc('Сроки и гарантия', `<p>Изготовление&nbsp;— ${nb(m.lead.replace(/^До/, 'до'))}</p><p>Гарантия 5&nbsp;лет: если обнаружится брак, заменим. Срок службы&nbsp;— от&nbsp;15&nbsp;лет.</p>`)}
    </div>
  </div>
</div>

${drw ? sec('draw', 'Чертёж', `<p>Три проекции и&nbsp;точные габариты в&nbsp;сантиметрах. Пропорции выстраиваем под ваше пространство&nbsp;— чертёж пересчитается в&nbsp;конструкторе.</p><p class="mp-link"><a href="${cfgHref(m)}&draw=1">Открыть чертёж в&nbsp;конструкторе</a></p>`,
  `<a class="mp-draw" href="${drw}" target="_blank" rel="noopener" aria-label="Чертёж ${esc(title)} крупно"><img src="${drw}" width="2000" height="1414" alt="Чертёж: ${esc(title)} — вид спереди, слева и сверху с размерами" loading="lazy" decoding="async"></a>`) : ''}

${m.cfg ? sec('three', '3D-модель', `<p>Рассмотрите модель со&nbsp;всех сторон, примерьте ткань и&nbsp;размер&nbsp;— в&nbsp;3D-конструкторе. Для архитекторов и&nbsp;дизайнеров подготовим 3D-модель для&nbsp;проекта.</p>
  <p class="mp-dl"><a href="${waModel}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M4 15v4h16v-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>Получить 3D-модель ${nm}</a></p>`,
  `<a class="mp-3d" href="${cfgHref(m)}">${fig(heroL[1] || heroL[0])}<span class="mp-3d__b">Открыть в 3D</span></a>`) : ''}

${sec('design', 'Дизайн', `<p>${nb(m.description)}</p><p>Форму и&nbsp;пропорции выстраиваем под ваше пространство, ткань подбираем вместе&nbsp;— в&nbsp;шоуруме или по&nbsp;фото.</p>`,
  `<div class="mp-stack">${(det.length ? det : heroL.slice(1, 3)).map((p) => fig(p)).join('')}</div>`)}

${sec('comfort', 'Комфорт', `<p>Мягкость посадки подбираем индивидуально&nbsp;— от&nbsp;обволакивающей до&nbsp;упругой.${seat(m) ? ` ${seat(m)}` : ''}</p><p>Оценить посадку можно в&nbsp;шоуруме&nbsp;— вживую и&nbsp;не&nbsp;торопясь.</p>`)}

${sec('fabric', 'Ткань', `<p>Велюр, букле, шенилл и&nbsp;экокожа. В&nbsp;шоуруме образцы можно потрогать и&nbsp;сравнить при дневном свете.</p><p class="mp-link"><a href="/#catalog/fabrics">Вся палитра тканей</a></p>`,
  `<ul class="mp-fab" role="list">${FAB.map((f) => `<li><a href="/#fabric-${f.id}-${f.n}"><img src="/${esc(f.src450 || f.src900)}" width="600" height="600" alt="Ткань: ${esc(f.kind)}, ${esc(f.name.toLowerCase())}" loading="lazy" decoding="async"><span>${esc(f.name)}<small>${esc(f.kind)}</small></span></a></li>`).join('')}</ul>`)}

${sec('atelier', 'Сделано в&nbsp;Алматы', `<p>Каждую модель шьём в&nbsp;своём ателье&nbsp;— от&nbsp;первого эскиза до&nbsp;последнего стежка.</p><p class="mp-link"><a href="/#atelier">Подробнее об&nbsp;ателье</a></p>`,
  `<ol class="mp-atl" role="list">${ATL.map(([n, h, t, s]) => `<li><figure class="mp-ph"><img src="/${s}" width="1000" height="1250" alt="" loading="lazy" decoding="async"></figure><p class="mp-atl__n">${n}</p><h3>${h}</h3><p>${t}</p></li>`).join('')}</ol>`)}

<section class="mp-sec mp-write" id="write" aria-labelledby="write-t">
  <div class="mp-sec__in">
    <h2 class="mp-sec__t" id="write-t">Написать нам</h2>
    <div class="mp-sec__p"><p>Ответим в&nbsp;WhatsApp: рассчитаем стоимость ${esc(m.name.replace(/^\S+/, (w) => ({ Диван: 'дивана', Кровать: 'кровати', Кресло: 'кресла', Пуф: 'пуфа', Банкетка: 'банкетки', Стул: 'стула', Стол: 'стола' })[w] || w.toLowerCase()))} и&nbsp;сроки.</p></div>
    <form class="mp-form" data-wa-form data-model="${esc(title)}" action="${WA(`Здравствуйте! Интересует ${title}.`)}" method="get" target="_blank">
      <label><span>Имя</span><input name="name" autocomplete="name" required></label>
      <label><span>Город</span><input name="city" autocomplete="address-level2"></label>
      <label><span>Размер или пожелания</span><textarea name="note" rows="3"></textarea></label>
      <button class="mp-btn" type="submit">Отправить в WhatsApp</button>
      <p class="mp-fine">Отправляя заявку, вы даёте согласие на&nbsp;обработку <a href="/privacy.html">персональных данных</a>.</p>
    </form>
  </div>
</section>

${rec.length ? `<section class="mp-sec mp-rec" aria-labelledby="rec-t"><div class="mp-sec__in"><h2 class="mp-sec__t" id="rec-t">Ещё ${catName.toLowerCase()}</h2></div>
  <ul class="mp-rec__l" role="list">${rec.map((x) => { const p = x.photos.find((q) => q.studio && !q.scene) || x.photos[0]; return `<li><a href="/models/${slug(x)}"><span class="mp-rec__ph"><img src="/${esc(p.src600 || p.src)}" width="600" height="450" alt="" loading="lazy" decoding="async"></span><span class="mp-rec__n">${esc(x.name)}</span></a></li>`; }).join('')}</ul>
</section>` : ''}
</main>
<footer class="mp-foot"><p><a href="/">RICCA DESIGNS</a> · Ателье мягкой мебели</p><p>Алматы, ул.&nbsp;Алишера Навои,&nbsp;208/2 · <a href="tel:+77079550808">+7&nbsp;(707)&nbsp;955-08-08</a></p><p class="mp-copy">© 2026 RICCA DESIGNS. Фотографии, тексты, 3D-модели и&nbsp;чертежи принадлежат RICCA DESIGNS. Копирование и&nbsp;использование без письменного разрешения строго запрещены.</p></footer>
</body>
</html>
`;
}

const list = ALL.filter((m) => m.short && m.photos?.length && CATS[m.category]);
for (const dir of ['ricca/models', 'dist/RICCA-site/models']) {
  fs.mkdirSync(ROOT + dir, { recursive: true });
  for (const m of list) fs.writeFileSync(`${ROOT}${dir}/${slug(m)}.html`, page(m));
}
for (const f of ['css/model.css', 'js/model.js']) fs.copyFileSync(ROOT + 'ricca/' + f, ROOT + 'dist/RICCA-site/' + f);
fs.cpSync(ROOT + 'ricca/img/drawings', ROOT + 'dist/RICCA-site/img/drawings', { recursive: true });
// карта сайта: главная, en и страницы моделей
const sm = ROOT + 'dist/RICCA-site/sitemap.xml'; let s = fs.readFileSync(sm, 'utf8').replace(/\s*<url><loc>https:\/\/ricca\.design\/models\/[^]*?<\/url>/g, '');
const day = new Date().toISOString().slice(0, 10);
s = s.replace('</urlset>', list.map((m) => `  <url><loc>${SITE}/models/${slug(m)}</loc><lastmod>${day}</lastmod><priority>0.7</priority></url>`).join('\n') + '\n</urlset>');
fs.writeFileSync(sm, s);
console.log('страниц:', list.length, 'без размера:', list.filter((m) => !size(m)).map((m) => m.id).join(' '));
