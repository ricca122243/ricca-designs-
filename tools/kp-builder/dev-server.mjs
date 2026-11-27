// Локальная проверка конструктора КП: раздаёт _site и повторяет /api из src/functions/kp.mjs в памяти (без Netlify).
// Запуск: KP_CODE=1234 PORT=8790 node tools/kp-builder/dev-server.mjs   →   http://localhost:8790/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SITE = path.join(path.dirname(new URL(import.meta.url).pathname), '_site');
const CODE = process.env.KP_CODE || '1234';
const PORT = +(process.env.PORT || 8790);
const docs = new Map(); const photos = new Map();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.txt': 'text/plain' };
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const COLS = new Set(['kp', 'models', 'custom']);
const send = (res, status, body, type = 'application/json; charset=utf-8') => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const read = (req) => new Promise((ok) => { const ch = []; req.on('data', (c) => ch.push(c)); req.on('end', () => ok(Buffer.concat(ch))); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) {
    const [kind, a, b] = url.pathname.slice(5).split('/');
    if (kind === 'photo' && req.method === 'GET') { const p = photos.get(a); return p ? send(res, 200, p.buf, p.type) : send(res, 404, 'not found', 'text/plain'); }
    if (req.headers['x-kp-code'] !== CODE) return send(res, 401, { error: 'code' });
    if (kind === 'check') return send(res, 200, { ok: true });
    if (kind === 'state') return send(res, 200, { docs: Object.fromEntries(docs) });
    if (kind === 'doc' && COLS.has(a) && ID.test(b || '')) {
      if (req.method === 'PUT') { const t = (await read(req)).toString(); try { docs.set(`${a}/${b}`, JSON.parse(t)); } catch { return send(res, 400, { error: 'bad_json' }); } return send(res, 200, { ok: true }); }
      if (req.method === 'DELETE') { docs.delete(`${a}/${b}`); return send(res, 200, { ok: true }); }
    }
    if (kind === 'photo' && req.method === 'POST') { const buf = await read(req); const id = crypto.randomUUID().replace(/-/g, ''); photos.set(id, { buf, type: req.headers['content-type'] || 'image/jpeg' }); return send(res, 200, { id }); }
    if (kind === 'photo' && req.method === 'DELETE') { photos.delete(a); return send(res, 200, { ok: true }); }
    return send(res, 404, { error: 'not_found' });
  }
  const file = path.join(SITE, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(SITE) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'not found', 'text/plain');
  send(res, 200, fs.readFileSync(file), TYPES[path.extname(file)] || 'application/octet-stream');
}).listen(PORT, () => console.log(`КП: http://localhost:${PORT}/  (код ${CODE})`));
