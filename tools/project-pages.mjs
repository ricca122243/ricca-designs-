// Проекты (объекты) ателье: раздел «Проекты» на главной (лента кадров, рецепт DESIGN.md 4.14) и страница каждого проекта
// /projects/<slug> — устроена как страница модели (css/model.css). Владелец, 17 ноября: «в сайт как в каталоге: сначала карусель,
// потом, когда „Подробнее“ нажимаешь, уходит в страницу». Данные — tools/projects-data.json.
// Запуск: node tools/project-pages.mjs  → ricca/projects/*.html, блоки в index.html / en.html / horeca.html (между метками
// projects:start … projects:end), копии в dist/RICCA-site и адреса в sitemap.xml. После — python3 tools/gen-en.py.
import fs from 'fs';
const ROOT = new URL('..', import.meta.url).pathname;
const DATA = JSON.parse(fs.readFileSync(ROOT + 'tools/projects-data.json', 'utf8'));
const SITE = 'https://ricca.design';
const WA = (t) => `https://wa.me/77079550808?text=${encodeURIComponent(t)}`;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// неразрывные пробелы: перед тире и после коротких предлогов и союзов — строка не начинается с тире и не кончается предлогом
const nb = (s) => esc(s).replace(/ (—|–)/g, '&nbsp;$1').replace(/(^|[\s(«])([а-яёА-ЯЁa-zA-Z]{1,2}) (?=\S)/g, '$1$2&nbsp;');
const two = (n) => String(n).padStart(2, '0');

/* размер WebP из заголовка файла (без сторонних библиотек) */
function webpSize(file) {
  const b = fs.readFileSync(file); const tag = b.toString('ascii', 12, 16);
  if (tag === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (tag === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (tag === 'VP8L') { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  throw new Error('не WebP: ' + file);
}
function photo(p, id) {
  const meta = p.photos[id]; if (!meta) throw new Error(`${p.slug}: нет фото ${id} в photos`);
  const src = `${p.dir}/${p.prefix}${id}.webp`, small = `${p.dir}/${p.prefix}${id}-1000.webp`;
  const [w, h] = webpSize(ROOT + 'ricca/' + src), [sw] = webpSize(ROOT + 'ricca/' + small);
  return { id, src, small, w, h, sw, land: w > h, ...meta };
}
const img = (q, sizes, { lazy = true, alt = q.alt } = {}) =>
  `<img src="/${q.src}" srcset="/${q.small} ${q.sw}w, /${q.src} ${q.w}w" sizes="${sizes}" width="${q.w}" height="${q.h}" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async">`;
const href = (p) => `/projects/${p.slug}.html`;

/* ───── раздел «Проекты» на главной ───── */
function homeBlock(lang) {
  const en = lang === 'en', S = en ? DATA.section.en : DATA.section;
  const T = en ? { swipe: 'swipe sideways', prev: 'Back', next: 'Forward', photos: 'project photos' } : { swipe: 'листайте вбок', prev: 'Назад', next: 'Вперёд', photos: 'фото проекта' };
  const tx = (s) => (en ? esc(s) : nb(s));
  const items = DATA.projects.map((p) => {
    const H = en ? p.home.en : p.home, strip = p.home.strip.map((id) => photo(p, id));
    return `  <div class="prj__item rv">
    <ul class="prj__strip" role="list" tabindex="0" aria-label="${esc(H.title)}: ${T.photos} — ${T.swipe}" data-strip>
${strip.map((q, i) => `      <li style="--ar:${q.w}/${q.h};--fx:${q.fx}%;--fy:${q.fy}%"><a href="${href(p)}" tabindex="-1">${img(q, '(min-width: 900px) 46vw, 78vw', { alt: en ? `${H.title}: photo ${i + 1} of ${strip.length}` : q.alt })}</a></li>`).join('\n')}
    </ul>
    <div class="wrap prj__meta">
      <span class="prj__n" aria-hidden="true" data-strip-n>01 / ${two(strip.length)}</span>
      <span class="prj__track" aria-hidden="true"><span class="prj__fill" data-strip-fill style="transform:scaleX(${(1 / strip.length).toFixed(4)})"></span></span>
      <button class="icon-btn prj__prev" type="button" aria-label="${T.prev}" data-strip-prev><svg class="ico" aria-hidden="true"><use href="#i-chev-l"/></svg></button>
      <button class="icon-btn prj__next" type="button" aria-label="${T.next}" data-strip-next><svg class="ico" aria-hidden="true"><use href="#i-chev-r"/></svg></button>
      <p class="prj__cap"><a class="prj__name" href="${href(p)}">${tx(H.title)}</a><span class="prj__line">${tx(H.line)}</span></p>
      <a class="btn btn--line prj__more" href="${href(p)}">${tx(H.link)}</a>
    </div>
  </div>`;
  }).join('\n');
  return `<!-- projects:start — раздел «Проекты» собирает tools/project-pages.mjs из tools/projects-data.json; руками не править -->
<section class="sec prj" id="projects" aria-labelledby="prj-title">
  <div class="wrap">
    <header class="shead rv">
      <h2 class="title" id="prj-title">${tx(S.title)}</h2>
      <p class="shead__line">${tx(S.line)}</p>
    </header>
  </div>
${items}
</section>
<!-- projects:end -->`;
}

/* ───── «Наши объекты» на странице HoReCa ───── */
function horecaBlock() {
  return `<!-- projects:start — блок собирает tools/project-pages.mjs; руками не править -->
<section class="mp-sec" id="objects" aria-labelledby="objects-t">
  <div class="mp-sec__in"><h2 class="mp-sec__t" id="objects-t">Наши объекты</h2></div>
  <ul class="pj-cards" role="list">
${DATA.projects.map((p) => { const q = photo(p, p.cover); return `    <li><a href="${href(p)}"><figure class="mp-ph pj-cards__ph" style="--fx:${q.fx}%;--fy:${q.fy}%">${img(q, '(min-width: 960px) 56vw, 100vw')}</figure><span class="pj-cards__n">${nb(p.home.title)}</span><span class="pj-cards__l">${nb(p.home.line)}</span></a></li>`; }).join('\n')}
  </ul>
</section>
<!-- projects:end -->`;
}

/* ───── страница проекта ───── */
function page(p) {
  const P = p.page, u = `${SITE}/projects/${p.slug}`, cover = photo(p, p.cover);
  const used = new Set([p.cover]);
  /* ряды кадров зоны: горизонтальный — во всю ширину, два вертикальных подряд — парой, одиночный вертикальный — уже */
  const rows = (ids) => { const out = []; const ph = ids.map((id) => { if (used.has(id)) throw new Error(`${p.slug}: кадр ${id} стоит на странице дважды`); used.add(id); return photo(p, id); });
    for (let i = 0; i < ph.length; i++) { const a = ph[i], b = ph[i + 1];
      if (!a.land && b && !b.land) { out.push([a, b]); i++; } else out.push([a]); }
    return out; };
  const fig = (q, sizes) => `<figure class="pj-ph">${img(q, sizes)}${q.caption ? `<figcaption>${nb(q.caption)}</figcaption>` : ''}</figure>`;
  const zone = (z) => `<section class="mp-sec" id="${z.id}" aria-labelledby="${z.id}-t">
  <div class="mp-sec__in"><h2 class="mp-sec__t" id="${z.id}-t">${nb(z.name)}</h2><div class="mp-sec__p"><p>${nb(z.text)}</p></div></div>
  <div class="pj-stack">
${rows(z.photos).map((r) => (r.length === 2 ? `    <div class="pj-pair">${r.map((q) => fig(q, '(min-width: 960px) 28vw, 50vw')).join('')}</div>`
    : `    ${fig(r[0], '(min-width: 960px) 56vw, 100vw').replace('class="pj-ph"', `class="pj-ph${r[0].land ? '' : ' is-solo'}"`)}`)).join('\n')}
  </div>
</section>`;
  const zonesHtml = P.zones.map(zone).join('\n\n');
  const all = [cover, ...P.zones.flatMap((z) => z.photos.map((id) => photo(p, id)))];
  const ld = [{ '@context': 'https://schema.org', '@type': 'CreativeWork', name: P.h1, description: P.lead, url: u, image: all.map((q) => `${SITE}/${q.src}`), creator: { '@type': 'Organization', name: 'RICCA DESIGNS', url: SITE + '/' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [[1, 'Главная', `${SITE}/`], [2, DATA.section.title, `${SITE}/#projects`], [3, P.h1, u]].map(([position, name, item]) => ({ '@type': 'ListItem', position, name, item })) }];
  return `<!doctype html>
<html lang="ru" translate="no">
<head>
<meta charset="utf-8">
<meta name="google" content="notranslate">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<!-- Создано tools/project-pages.mjs из tools/projects-data.json — правки вручную пропадут при следующем запуске -->
<title>${esc(p.meta.title)}</title>
<meta name="description" content="${esc(p.meta.description)}">
<link rel="canonical" href="${u}">
<meta property="og:title" content="${esc(p.meta.title)}">
<meta property="og:description" content="${esc(P.lead)}">
<meta property="og:image" content="${SITE}/${cover.src}">
<link rel="icon" href="/img/v3/favicon-v3.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/fonts-v3.css">
<link rel="stylesheet" href="/css/model.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script src="/js/model.js" defer></script>
</head>
<body>
<header class="mp-top">
  <a class="mp-top__logo" href="/" aria-label="RICCA DESIGNS — на главную"><b>RD</b><span>RICCA<small>DESIGNS · ALMATY</small></span></a>
  <a class="mp-top__back" href="/#projects">‹ ${esc(DATA.section.title)}</a>
</header>
<main>
<div class="pj-hero">
  <figure class="pj-hero__ph" style="--fx:${cover.fx}%;--fy:${cover.fy}%">${img(cover, '100vw', { lazy: false })}</figure>
  <div class="pj-hero__in">
    <div class="pj-hero__a">
      <p class="mp-k">${nb(P.kicker)}</p>
      <h1 class="mp-t">${nb(P.h1)}</h1>
    </div>
    <div class="pj-hero__b">
      <p class="mp-d">${nb(P.lead)}</p>
      <div class="mp-acts">
        <a class="mp-btn" href="${WA('Здравствуйте! Хочу обсудить мебель для объекта.')}" target="_blank" rel="noopener">Обсудить проект</a>
        <a class="mp-btn mp-btn--line" href="/horeca.html">RICCA HoReCa</a>
      </div>
    </div>
  </div>
</div>

<section class="mp-sec" id="made" aria-labelledby="made-t">
  <div class="mp-sec__in"><h2 class="mp-sec__t" id="made-t">${nb(P.madeTitle)}</h2></div>
  <ul class="pj-made" role="list">
${P.made.map((m) => `    <li><b>${nb(m.name)}</b><span>${nb(m.line)}</span></li>`).join('\n')}
  </ul>
</section>

${zonesHtml}

<section class="mp-sec mp-write" id="write" aria-labelledby="write-t">
  <div class="mp-sec__in">
    <h2 class="mp-sec__t" id="write-t">${nb(P.closingTitle)}</h2>
    <div class="mp-sec__p"><p>${nb(P.closingLine)}</p></div>
    <form class="mp-form" data-wa-form data-model="мебель для объекта (${esc(P.h1)})" action="https://wa.me/77079550808" method="get" target="_blank">
      <label><span>Имя</span><input name="name" autocomplete="name" required></label>
      <label><span>Компания и&nbsp;город</span><input name="city" autocomplete="organization"></label>
      <label><span>Объект: тип, количество мест, сроки</span><textarea name="note" rows="3"></textarea></label>
      <button class="mp-btn" type="submit">${nb(P.cta)}</button>
      <p class="mp-fine">Отправляя заявку, вы даёте согласие на&nbsp;обработку <a href="/privacy.html">персональных данных</a>.</p>
    </form>
  </div>
</section>
</main>
<footer class="mp-foot"><p><a href="/">RICCA DESIGNS</a> · Ателье мягкой мебели</p><p>Алматы, ул.&nbsp;Алишера Навои,&nbsp;208/2 · <a href="tel:+77079550808">+7&nbsp;(707)&nbsp;955-08-08</a></p><p class="mp-copy">© 2026 RICCA DESIGNS. Фотографии, тексты, 3D-модели и&nbsp;чертежи принадлежат RICCA DESIGNS. Копирование и&nbsp;использование без письменного разрешения строго запрещены.</p></footer>
</body>
</html>
`;
}

/* ───── запись ───── */
const between = (s, block, findAnchor, file) => {
  const a = s.indexOf('<!-- projects:start'), b = s.indexOf('<!-- projects:end -->');
  if (a >= 0 && b > a) return s.slice(0, a) + block + s.slice(b + '<!-- projects:end -->'.length);
  const at = findAnchor(s); if (at < 0) throw new Error('нет места для блока «Проекты»: ' + file);
  return s.slice(0, at) + block + '\n\n' + s.slice(at);
};
/* главная: перед разделом «Нам доверяют» (вместе с его комментарием, если он стоит вплотную) */
const beforeTrust = (s) => { const sec = s.indexOf('<section class="sec trust"'); if (sec < 0) return -1;
  const c = s.lastIndexOf('<!--', sec), ce = s.indexOf('-->', c); return c >= 0 && ce >= 0 && ce < sec && !s.slice(ce + 3, sec).trim() ? c : sec; };
const beforeClients = (s) => s.indexOf('<section class="mp-sec" id="clients"');
const patch = (file, block, anchor) => { const f = ROOT + file; if (!fs.existsSync(f)) return; const s = fs.readFileSync(f, 'utf8'); const t = between(s, block, anchor, file); if (t !== s) fs.writeFileSync(f, t); };

for (const p of DATA.projects) {
  const html = page(p);
  for (const dir of ['ricca/projects', 'dist/RICCA-site/projects']) { fs.mkdirSync(ROOT + dir, { recursive: true }); fs.writeFileSync(`${ROOT}${dir}/${p.slug}.html`, html); }
  fs.cpSync(ROOT + 'ricca/' + p.dir, ROOT + 'dist/RICCA-site/' + p.dir, { recursive: true });
}
patch('ricca/index.html', homeBlock('ru'), beforeTrust);
patch('dist/RICCA-site/index.html', homeBlock('ru'), beforeTrust);
patch('dist/RICCA-site/en.html', homeBlock('en'), beforeTrust);
patch('ricca/horeca.html', horecaBlock(), beforeClients);
fs.copyFileSync(ROOT + 'ricca/horeca.html', ROOT + 'dist/RICCA-site/horeca.html');
for (const f of ['css/model.css', 'css/home.css', 'js/site.js']) fs.copyFileSync(ROOT + 'ricca/' + f, ROOT + 'dist/RICCA-site/' + f);
const sm = ROOT + 'dist/RICCA-site/sitemap.xml'; let s = fs.readFileSync(sm, 'utf8').replace(/\s*<url><loc>https:\/\/ricca\.design\/projects\/[^]*?<\/url>/g, '');
s = s.replace('</urlset>', DATA.projects.map((p) => `  <url><loc>${SITE}/projects/${p.slug}</loc><lastmod>${process.env.DAY || '2026-11-17'}</lastmod><priority>0.8</priority></url>`).join('\n') + '\n</urlset>');
fs.writeFileSync(sm, s);
console.log('проектов:', DATA.projects.length, '· страниц:', DATA.projects.map((p) => `/projects/${p.slug}`).join(', '));
