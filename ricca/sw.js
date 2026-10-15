/* RICCA DESIGNS — фоновый помощник «приложения» (сайт, установленный на главный экран телефона).
   Задача — открываться быстрее и не показывать пустой экран без связи. Сайт он не подменяет:
   • страницы (/, /en, конструктор) — всегда сначала с сервера; нет связи → последняя сохранённая версия или offline.html;
   • стили и скрипты — тоже сначала с сервера (после обновления сайта сразу новые), сохранённые — только без связи;
   • фото и шрифты — из памяти телефона мгновенно, в фоне обновляются с сервера (фото — не больше 300 штук);
   • ролики, 3D-модели и всё с других сайтов (WhatsApp, 2ГИС, Instagram) не трогаем — идут как обычно.
   Поменяли логику этого файла → увеличьте VERSION: старая память удалится сама. */
const VERSION = 'v1';
const PAGES = `ricca-pages-${VERSION}`, CODE = `ricca-code-${VERSION}`, MEDIA = `ricca-media-${VERSION}`;
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/img/pwa/icon-192.png', '/img/v3/favicon-v3.svg'];
const MEDIA_MAX = 300;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ricca-') && ![PAGES, CODE, MEDIA].includes(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function trim(name, max) {
  const c = await caches.open(name), keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}
async function networkFirst(req, cacheName, fallback) {
  const c = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') c.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (fallback) { const off = await caches.match(fallback); if (off) return off; }
    throw err;
  }
}
async function staleWhileRevalidate(req, event) {
  const c = await caches.open(MEDIA);
  const hit = await c.match(req);
  const net = fetch(req).then((res) => {
    if (res.ok && res.type === 'basic') { c.put(req, res.clone()).then(() => trim(MEDIA, MEDIA_MAX)); }
    return res;
  }).catch(() => hit);
  if (hit) { event.waitUntil(net); return hit; }
  return net;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;                       // WhatsApp, 2ГИС, Instagram — мимо
  if (req.headers.has('range')) return;                                    // ролики (частичная загрузка) — мимо
  const p = url.pathname;
  if (/^\/(en\/)?(video|models3d)\//.test(p) || p === '/sw.js') return;   // тяжёлые ролики и 3D-модели — мимо
  if (req.mode === 'navigate') { event.respondWith(networkFirst(req, PAGES, OFFLINE)); return; }
  if (/\.(css|js|mjs|json|webmanifest)$/.test(p)) { event.respondWith(networkFirst(req, CODE)); return; }
  if (/\.(webp|png|jpe?g|svg|avif|gif|woff2?)$/.test(p)) { event.respondWith(staleWhileRevalidate(req, event)); }
});
