#!/usr/bin/env node
/* RICCA DESIGNS — номера счётчиков из переменных окружения в готовый сайт.
   Запускает Netlify при каждой выкладке (netlify.toml → [build] command). Читает:
     GA4_ID         — идентификатор потока Google Analytics 4, вид G-XXXXXXXXXX;
     META_PIXEL_ID  — номер пикселя Meta, только цифры.
   и подставляет их вместо заглушек %GA4_ID% и %META_PIXEL_ID% в dist/RICCA-site/js/analytics.js.
   Переменной нет или она записана с ошибкой — заглушка остаётся, этот счётчик просто не подключается; выкладка не падает.
   В репозитории номеров нет: файл в нём всегда с заглушками.
   Проверка у себя: GA4_ID=G-TEST12345 META_PIXEL_ID=1234567890 node tools/analytics-env.mjs путь/к/analytics.js */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = process.argv[2] || fileURLToPath(new URL('../dist/RICCA-site/js/analytics.js', import.meta.url));
const vars = [
  { env: 'GA4_ID', token: "'%GA4_ID%'", ok: /^G-[A-Z0-9]{4,20}$/, name: 'Google Analytics 4', hint: 'вид G-XXXXXXXXXX' },
  { env: 'META_PIXEL_ID', token: "'%META_PIXEL_ID%'", ok: /^\d{6,20}$/, name: 'Meta Pixel', hint: 'только цифры' },
];

if (!fs.existsSync(file)) { console.log(`analytics-env: файла ${file} нет — пропускаю`); process.exit(0); }
let code = fs.readFileSync(file, 'utf8'), changed = false;
for (const v of vars) {
  const val = (process.env[v.env] || '').trim();
  if (!val) { console.log(`analytics-env: ${v.env} не задана — ${v.name} не подключён (заглушка)`); continue; }
  if (!v.ok.test(val)) { console.log(`analytics-env: ${v.env} записана с ошибкой (${v.hint}) — ${v.name} не подключён`); continue; }
  if (!code.includes(v.token)) { console.log(`analytics-env: заглушки для ${v.env} в файле нет — возможно, номер уже подставлен`); continue; }
  code = code.replace(v.token, `'${val}'`); changed = true;
  console.log(`analytics-env: ${v.name} подключён`);
}
if (changed) fs.writeFileSync(file, code);
