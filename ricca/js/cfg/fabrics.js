/* RICCA · конструктор — библиотека тканей.
   getLibrary(): window.RICCA_FABRIC_LIBRARY (js/fabrics-data.js), если он есть и в нём есть цвета; иначе запасная библиотека
   js/cfg/fabrics-fallback.js (та же форма). Ссылка на ткань в адресе: «<typeId>/<collectionId>/<slug цвета>». */
import FALLBACK from './fabrics-fallback.js';

/* тип ткани → вид материала для 3D (materials.js → KINDS) */
const KIND_BY_TYPE = { velur: 'velour', velvet: 'corduroy', vel_vet: 'corduroy', velvet_: 'corduroy', bukle: 'boucle', shenill: 'chenille', rogozhka: 'matting', zamsha: 'suede', ekokozha: 'leather' };
const KINDS = ['velour', 'corduroy', 'boucle', 'chenille', 'matting', 'suede', 'leather'];
/* порядок вкладок: Велюр · Вельвет · Букле · Шенилл · Рогожка · Замша · Экокожа (только те, что есть) */
const ORDER = ['velur', 'velvet', 'bukle', 'shenill', 'rogozhka', 'zamsha', 'ekokozha'];

const stemOf = (src) => String(src || '').split('/').pop().replace(/\.(webp|jpe?g|png|avif)$/i, '').replace(/-(450|900|600)$/, '');
export const slugOf = (c) => (c && c.slug) || stemOf(c && (c.src450 || c.src900)).replace(/^\d+-/, '') || String((c && c.name) || '').toLowerCase();

export function kindOf(typeId, collection) {
  const k = collection && collection.kind;
  if (k && KINDS.includes(k)) return k;
  if (KIND_BY_TYPE[typeId]) return KIND_BY_TYPE[typeId];
  if (/vel.?vet|вельвет/i.test(String(typeId))) return 'corduroy';
  return 'velour';
}

function valid(lib) {
  return !!(lib && Array.isArray(lib.types) && lib.types.some((t) => t && Array.isArray(t.collections)
    && t.collections.some((c) => c && Array.isArray(c.colours) && c.colours.some((x) => x && x.src450 && x.hex))));
}

let cached = null;
export function getLibrary() {
  if (cached) return cached;
  const ext = typeof window !== 'undefined' ? window.RICCA_FABRIC_LIBRARY : null;
  const src = valid(ext) ? ext : FALLBACK;
  const types = src.types
    .map((t) => ({
      id: String(t.id), title: String(t.title || t.id),
      collections: (t.collections || []).map((c) => ({
        id: String(c.id), title: String(c.title || c.id), kind: kindOf(t.id, c), texture: c.texture || '',
        kindTitle: c.kind && !KINDS.includes(c.kind) ? String(c.kind) : '',                       // «микровелюр» (js/fabrics-data.js)
        facts: Array.isArray(c.facts) ? String(c.facts[0] || '') : String(c.facts || ''),           // одна строка
        colours: (c.colours || []).filter((x) => x && x.src450 && /^#[0-9a-f]{6}$/i.test(x.hex || ''))
          .map((x) => ({ name: String(x.name || ''), slug: slugOf(x), src450: x.src450, src900: x.src900 || x.src450, hex: x.hex.toUpperCase() })),
      })).filter((c) => c.colours.length),
    }))
    .filter((t) => t.collections.length)
    .sort((a, b) => (ORDER.indexOf(a.id) + 99) % 99 - (ORDER.indexOf(b.id) + 99) % 99);
  cached = { types, source: src === FALLBACK ? 'fallback' : 'site' };
  return cached;
}

/* плоский объект ткани для состояния и 3D */
export function fabricOf(type, collection, colour) {
  return {
    typeId: type.id, typeTitle: type.title, collectionId: collection.id, collectionTitle: collection.title,
    colour: colour.name, slug: colour.slug, hex: colour.hex, kind: collection.kind, src450: colour.src450, src900: colour.src900,
  };
}

export const fabricRef = (f) => (f && f.typeId ? `${f.typeId}/${f.collectionId}/${f.slug}` : '');

export function findFabric(ref, lib = getLibrary()) {
  const [tid, cid, slug] = String(ref || '').split('/');
  const t = lib.types.find((x) => x.id === tid); if (!t) return null;
  const c = t.collections.find((x) => x.id === cid); if (!c) return null;
  const col = c.colours.find((x) => x.slug === slug) || null;
  return col ? fabricOf(t, c, col) : null;
}

/* по умолчанию: велюр Alba, самый светлый молочный/бежевый */
export function defaultFabric(lib = getLibrary()) {
  const pref = findFabric('velur/alba/molochnyy', lib); if (pref) return pref;
  const t = lib.types[0], c = t.collections[0];
  const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
  const col = c.colours.slice().sort((a, b) => lum(b.hex) - lum(a.hex))[0];
  return fabricOf(t, c, col);
}
