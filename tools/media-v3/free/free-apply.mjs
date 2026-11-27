// Записать готовые ручные модели в каталог:  node tools/media-v3/free/free-apply.mjs <id> [<id> …]   (без id — все файлы ricca/models3d/free/*.json)
// Для каждой модели: glb → "models3d/free/<id>.json"; ткань — поле fab файла; отделка ножек — поле legs файла (в рецепт);
// размеры — поле size файла в рецепт (прямой диван, кресло, пуф, банкетка), если движок принимает их без поправок.
// Ткани ручных моделей копятся в tools/media-v3/free/fab-manual.json — их не перезаписывает model-fabric.py.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const d = ROOT + '/ricca/js/cfg';
const P = await import(d + '/params.js'), V = await import(d + '/validate.js'), S = await import(d + '/share.js');
const FREE = ROOT + '/ricca/models3d/free', CAT = ROOT + '/ricca/js/catalog-data.js', MAN = ROOT + '/tools/media-v3/free/fab-manual.json';
const fabs = new Set(fs.readFileSync(ROOT + '/tools/media-v3/free/fabrics.tsv', 'utf8').split('\n').slice(1).map((l) => l.split('\t')[0]).filter(Boolean));
let ids = process.argv.slice(2); if (!ids.length) ids = fs.readdirSync(FREE).filter((f) => /\.json$/.test(f) && !f.startsWith('_')).map((f) => f.replace(/\.json$/, ''));
let s = fs.readFileSync(CAT, 'utf8'); const manual = fs.existsSync(MAN) ? JSON.parse(fs.readFileSync(MAN, 'utf8')) : {};
const enc = (type, params) => S.encodeCfg({ type, params }, { defaults: P.DEFAULTS[type], withNote: false, withQty: false }).replace(/^v1~/, '');
for (const id of ids) {
  const file = `${FREE}/${id}.json`; if (!fs.existsSync(file)) { console.log(id, 'НЕТ ФАЙЛА'); continue; }
  let spec; try { spec = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log(id, 'ФАЙЛ С ОШИБКОЙ', String(e).slice(0, 80)); continue; }
  const i = s.indexOf(`    id: "${id}",\n`); if (i < 0) { console.log(id, 'нет в каталоге'); continue; }
  const j = s.indexOf('\n  }', i); let blk = s.slice(i, j);
  const m = blk.match(/\n    cfg: "([^"]*)",/); if (!m) { console.log(id, 'нет рецепта'); continue; }
  const dc = S.decodeCfg('v1~' + m[1], { defaults: P.DEFAULTS }); const type = dc.type; let params = V.validate(type, dc.params).params; const notes = [];
  if (spec.legs && spec.legs.finish) {
    const t = { ...params, legFinish: spec.legs.finish }; if (spec.legs.kind && type !== 'bed' && 'legs' in t) t.legs = spec.legs.kind;
    const v = V.validate(type, t); if (!v.errors.length && v.params.legFinish === spec.legs.finish) { params = v.params; notes.push('ножки ' + spec.legs.finish); } else notes.push('ножки НЕ приняты движком');
  }
  if (Array.isArray(spec.size) && ['sofa', 'armchair', 'pouf', 'bench'].includes(type)) {
    const t = { ...params }; if ('w' in t) t.w = spec.size[0]; if ('d' in t) t.d = spec.size[1]; if ('h' in t) t.h = spec.size[2];
    const v = V.validate(type, t), dm = P.dims(type, v.params);
    if (!v.errors.length && Math.abs(dm.w - spec.size[0]) < 0.016 && Math.abs(dm.d - spec.size[1]) < 0.016 && Math.abs(dm.h - spec.size[2]) < 0.016) { params = v.params; notes.push(`размер ${Math.round(dm.w * 100)}×${Math.round(dm.d * 100)}×${Math.round(dm.h * 100)}`); }
    else notes.push(`размер файла ${spec.size.map((x) => Math.round(x * 100)).join('×')} в рецепт не лёг (движок даёт ${Math.round(dm.w * 100)}×${Math.round(dm.d * 100)}×${Math.round(dm.h * 100)}) — оставлен прежний`);
  }
  const cfg = enc(type, params);
  blk = blk.replace(/\n    cfg: "[^"]*",/, `\n    cfg: "${cfg}",`);
  blk = blk.replace(/\n    glb: "[^"]*",/, '');
  blk = blk.replace(/(\n    cfg: "[^"]*",)/, `$1\n    glb: "models3d/free/${id}.json",`);
  if (spec.fab && fabs.has(spec.fab)) { blk = blk.replace(/\n    fab: "[^"]*",/, ''); blk = blk.replace(/(\n    cfg: "[^"]*",)/, `$1\n    fab: "${spec.fab}",`); manual[id] = spec.fab; notes.push('ткань ' + spec.fab); }
  else if (spec.fab) notes.push(`ткань ${spec.fab} НЕ НАЙДЕНА в библиотеке — оставлена прежняя`);
  s = s.slice(0, i) + blk + s.slice(j);
  const dm = P.dims(type, params); console.log(id, type, `${Math.round(dm.w * 100)}×${Math.round(dm.d * 100)}×${Math.round(dm.h * 100)}`, '|', notes.join('; '));
}
fs.writeFileSync(CAT, s); fs.writeFileSync(MAN, JSON.stringify(manual, null, 1) + '\n');
console.log('каталог обновлён; дальше: python3 tools/media-v3/models-data.py');
