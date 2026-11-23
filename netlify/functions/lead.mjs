/* RICCA DESIGNS — заявка с сайта → Telegram.
   Адрес: POST /api/lead (JSON). Токен бота и чат — только в переменных окружения Netlify:
     TELEGRAM_BOT_TOKEN — токен бота от @BotFather;
     TELEGRAM_CHAT_ID   — id чата или группы, куда приходят заявки.
   В коде и в репозитории их нет. Резерв — Netlify Forms (форма «lead», её шлёт js/lead.js параллельно).
   Защита: только POST, только со своих адресов, поле-ловушка (bot-field), обрезка длины, текст без разметки.
   TELEGRAM_API_BASE — необязательная переменная для локальной проверки (подставной сервер вместо api.telegram.org). */

const ALLOWED_HOSTS = /^(ricca\.design|www\.ricca\.design|ricca-demo\.netlify\.app|[a-z0-9-]+--ricca-demo\.netlify\.app|[a-z0-9-]+--ricca-design[a-z0-9-]*\.netlify\.app|localhost(:\d+)?|127\.0\.0\.1(:\d+)?)$/i;
const INTEREST = { sofa: 'Диван', bed: 'Кровать', other: 'Другое' };
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
// убрать управляющие символы и лишние пробелы, обрезать длину
const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, max);
const hostOf = (u) => { try { return new URL(u).host; } catch (e) { return ''; } };
const env = (k) => (globalThis.Netlify && Netlify.env && Netlify.env.get(k)) || process.env[k] || '';

/* телефон: +7 и десять цифр (Казахстан, Россия); «8…» в начале считаем за «7…» */
function phoneOf(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
  return d.length === 10 ? `+7${d}` : '';
}
const prettyPhone = (p) => p.replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 $1 $2-$3-$4');

export default async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method' });
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  if (origin && !ALLOWED_HOSTS.test(hostOf(origin))) return json(403, { ok: false, error: 'origin' });

  let data;
  try {
    const raw = await req.text();
    if (raw.length > 8000) return json(413, { ok: false, error: 'size' });
    data = JSON.parse(raw);
  } catch (e) { return json(400, { ok: false, error: 'json' }); }
  if (!data || typeof data !== 'object') return json(400, { ok: false, error: 'json' });

  /* поле-ловушка: человек его не видит и не заполняет. Боту отвечаем «принято» и ничего не шлём */
  if (clean(data['bot-field'], 50)) return json(200, { ok: true });

  const name = clean(data.name, 80);
  const phone = phoneOf(data.phone);
  if (!name || !phone) return json(422, { ok: false, error: 'fields' });
  const interest = INTEREST[data.interest] || INTEREST.other;
  const comment = clean(data.comment, 600);
  const config = clean(String(data.config || '').replace(/\r/g, ''), 1500);
  const title = clean(data.title, 140);
  const pageRaw = clean(data.page, 400);
  const page = ALLOWED_HOSTS.test(hostOf(pageRaw)) ? pageRaw : '';
  const lang = data.lang === 'en' ? 'EN' : 'RU';
  const utm = [];
  if (data.utm && typeof data.utm === 'object') for (const k of UTM_KEYS) { const v = clean(data.utm[k], 120); if (v) utm.push(`${k.slice(4)}=${v}`); }

  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID');
  if (!token || !chat) return json(503, { ok: false, error: 'not_configured' });

  const lines = [
    'Новая заявка с сайта RICCA',
    `Имя: ${name}`,
    `Телефон: ${prettyPhone(phone)}`,
    `Интересует: ${interest}`,
    comment && `Комментарий: ${comment}`,
    (title || page) && `Страница: ${[title, page].filter(Boolean).join(' — ')}`,
    config && `Конфигурация:\n${config}`,
    `UTM: ${utm.length ? utm.join(', ') : 'нет'}`,
    `Язык: ${lang}`,
  ].filter(Boolean);

  try {
    const base = env('TELEGRAM_API_BASE') || 'https://api.telegram.org';
    const r = await fetch(`${base}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: lines.join('\n').slice(0, 3900), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return json(502, { ok: false, error: 'telegram' });
  } catch (e) { return json(502, { ok: false, error: 'telegram' }); }
  return json(200, { ok: true });
};

export const config = { path: '/api/lead' };
