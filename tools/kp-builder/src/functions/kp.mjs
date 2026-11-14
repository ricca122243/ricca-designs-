// Конструктор КП RICCA — общее хранилище на Netlify (Functions + Blobs).
// Документы: kp/settings, kp/project, kp/clients, models/<id>, custom/<id> — JSON до 256 КБ.
// Фото: POST /api/photo (jpeg/png/webp до 5,5 МБ) → { id }; GET /api/photo/<id> открыт всем (картинки моделей и логотипы).
// Всё остальное — только с заголовком x-kp-code, равным переменной окружения KP_CODE (задаётся в настройках сайта Netlify).
import { getStore } from '@netlify/blobs';

export const config = { path: '/api/*' };

const COLS = new Set(['kp', 'models', 'custom']);
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function codeOk(req) {
  const want = String(process.env.KP_CODE || '');
  const got = String(req.headers.get('x-kp-code') || '');
  if (!want || got.length !== want.length) return false;
  let d = 0;
  for (let i = 0; i < want.length; i++) d |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return d === 0;
}

export default async (req) => {
  const url = new URL(req.url);
  const [kind, a, b] = url.pathname.replace(/^\/api\//, '').split('/');
  const docs = getStore({ name: 'kp-docs', consistency: 'strong' });
  const photos = getStore({ name: 'kp-photos', consistency: 'strong' });

  if (kind === 'photo' && req.method === 'GET') {
    if (!ID.test(a || '')) return new Response('bad id', { status: 400 });
    const r = await photos.getWithMetadata(a, { type: 'arrayBuffer' });
    if (!r) return new Response('not found', { status: 404 });
    return new Response(r.data, {
      headers: { 'content-type': (r.metadata && r.metadata.type) || 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' },
    });
  }

  if (!codeOk(req)) return json({ error: 'code' }, 401);

  if (kind === 'check') return json({ ok: true });

  if (kind === 'state' && req.method === 'GET') {
    const { blobs } = await docs.list();
    const out = {};
    await Promise.all(blobs.map(async ({ key }) => {
      const v = await docs.get(key, { type: 'json' });
      if (v) out[key] = v;
    }));
    return json({ docs: out });
  }

  if (kind === 'doc' && COLS.has(a) && ID.test(b || '')) {
    if (req.method === 'PUT') {
      const text = await req.text();
      if (text.length > 256 * 1024) return json({ error: 'too_large' }, 413);
      let data;
      try { data = JSON.parse(text); } catch { return json({ error: 'bad_json' }, 400); }
      if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'bad_json' }, 400);
      await docs.setJSON(`${a}/${b}`, data);
      return json({ ok: true });
    }
    if (req.method === 'DELETE') { await docs.delete(`${a}/${b}`); return json({ ok: true }); }
  }

  if (kind === 'photo' && req.method === 'POST') {
    const type = (req.headers.get('content-type') || '').split(';')[0].trim();
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return json({ error: 'type' }, 415);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return json({ error: 'empty' }, 400);
    if (buf.byteLength > 5.5 * 1024 * 1024) return json({ error: 'too_large' }, 413);
    const id = crypto.randomUUID().replace(/-/g, '');
    await photos.set(id, buf, { metadata: { type } });
    return json({ id });
  }

  if (kind === 'photo' && req.method === 'DELETE' && ID.test(a || '')) { await photos.delete(a); return json({ ok: true }); }

  return json({ error: 'not_found' }, 404);
};
