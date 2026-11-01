#!/usr/bin/env python3
"""«Состав» моделей каталога → ricca/js/composition-data.js (window.RICCA_COMPOSITION).
Берёт модели из ricca/js/catalog-data.js (диваны, кровати, кресла; стулья и столы — нет), определяет тип и подставляет черновой
состав по типу, verified: false. Файл потом правится руками — поэтому скрипт НЕ перезаписывает его без --force.
Новая модель в каталоге: python3 tools/composition-data.py --add (допишет только новые модели, остальное не тронет).
Запуск из корня репозитория."""
import json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ricca'))
OUT = os.path.join(ROOT, 'js', 'composition-data.js')
src = open(os.path.join(ROOT, 'js', 'catalog-data.js'), encoding='utf-8').read()
def block(name):
    m = re.search(r'window\.' + name + r' = (\[|\{)', src); i = m.end() - 1; depth = 0
    for j in range(i, len(src)):
        depth += src[j] in '[{'; depth -= src[j] in ']}'
        if depth == 0: return src[i:j + 1]
def js_to_json(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S); t = re.sub(r'//[^\n]*', '', t)
    t = re.sub(r'([{,]\s*)([A-Za-z_]\w*)\s*:', r'\1"\2":', t); t = re.sub(r"'((?:[^'\\]|\\.)*)'", lambda m: json.dumps(m.group(1)), t)
    t = re.sub(r',(\s*[}\]])', r'\1', t); return json.loads(t)
cat = js_to_json(block('RICCA_CATALOG')); names = js_to_json(block('RICCA_MODEL_NAMES'))

def type_of(it):
    c, tags = it['category'], it.get('tags', [])
    if c == 'beds': return 'bed'
    if c == 'armchairs': return 'pouf' if re.search(r'пуф|банкетк', it.get('type', '') + it.get('subtitle', ''), re.I) else 'armchair'
    if c == 'sofas':
        if 'foldout' in tags or re.search(r'раскладн', (it.get('mechanism') or '') + it.get('subtitle', ''), re.I): return 'foldout'
        if 'modular' in tags: return 'modular'
        return 'sofa'
    return None

def overrides(it, t):
    """очевидное из подписи модели: металлические ножки, подъёмный механизм у кровати"""
    ru, en = [], []
    sub = (it.get('subtitle', '') + ' ' + ' '.join(it.get('options', []))).lower()
    if re.search(r'металлическ|чёрных ножк|на металлической базе|латунн', sub) and t in ('sofa', 'modular', 'foldout', 'armchair'):
        ru.append({'key': 'legs', 'name': 'Ножки: металл [ОТДЕЛКА]'}); en.append({'key': 'legs', 'name': 'Legs: metal [ОТДЕЛКА]'})
    if t == 'bed':
        tags = it.get('tags', []); mech = (it.get('mechanism') or '').lower()
        if 'lift' not in tags and 'подъём' not in mech:
            ru.append({'key': 'lift', 'hidden': True}); en.append({'key': 'lift', 'hidden': True})
    return {'ru': ru, 'en': en} if ru else {}

TYPES = {
  'sofa': {
    'ru': {'label': 'Диван прямой / угловой', 'layers': [
      {'key': 'cover', 'name': 'Обивка: [ТКАНЬ ПО ВЫБОРУ]', 'benefit': 'образцы в шоуруме'},
      {'key': 'back', 'name': 'Подушки спинки: холлофайбер в чехле', 'benefit': 'мягкие, взбиваются заново'},
      {'key': 'seat', 'name': 'Сиденье: ППУ высокой упругости [ПЛОТНОСТЬ] + синтепон', 'benefit': 'держит форму годами'},
      {'key': 'base', 'name': 'Основание: пружины «змейка» [ИЛИ НЕЗАВИСИМЫЙ БЛОК]', 'benefit': 'ровная посадка по всей длине'},
      {'key': 'frame', 'name': 'Каркас: массив [ПОРОДА] + фанера [ТОЛЩИНА] мм', 'benefit': 'не скрипит и не расшатывается'},
      {'key': 'legs', 'name': 'Ножки: [МАССИВ / МЕТАЛЛ]', 'benefit': ''}]},
    'en': {'label': 'Straight / corner sofa', 'layers': [
      {'key': 'cover', 'name': 'Upholstery: [ТКАНЬ ПО ВЫБОРУ]', 'benefit': 'samples in the showroom'},
      {'key': 'back', 'name': 'Back cushions: hollow fibre in a cover', 'benefit': 'soft, plump up again'},
      {'key': 'seat', 'name': 'Seat: high-resilience foam [ПЛОТНОСТЬ] + wadding', 'benefit': 'keeps its shape for years'},
      {'key': 'base', 'name': 'Base: zigzag springs [ИЛИ НЕЗАВИСИМЫЙ БЛОК]', 'benefit': 'even seating along the whole length'},
      {'key': 'frame', 'name': 'Frame: solid [ПОРОДА] + [ТОЛЩИНА] mm plywood', 'benefit': 'doesn’t creak or loosen'},
      {'key': 'legs', 'name': 'Legs: [МАССИВ / МЕТАЛЛ]', 'benefit': ''}]}},
  'bed': {
    'ru': {'label': 'Кровать', 'layers': [
      {'key': 'cover', 'name': 'Обивка: [ТКАНЬ ПО ВЫБОРУ]', 'benefit': 'образцы в шоуруме'},
      {'key': 'head', 'name': 'Изголовье: ППУ [ПЛОТНОСТЬ]', 'benefit': 'удобно опереться спиной'},
      {'key': 'base', 'name': 'Основание: ортопедические ламели из берёзы', 'benefit': 'проветривают матрас'},
      {'key': 'lift', 'name': 'Механизм: газлифт [ЕСЛИ ЕСТЬ]', 'benefit': 'поднимается одной рукой'},
      {'key': 'frame', 'name': 'Каркас: массив [ПОРОДА] + фанера [ТОЛЩИНА] мм', 'benefit': 'не скрипит и не расшатывается'}]},
    'en': {'label': 'Bed', 'layers': [
      {'key': 'cover', 'name': 'Upholstery: [ТКАНЬ ПО ВЫБОРУ]', 'benefit': 'samples in the showroom'},
      {'key': 'head', 'name': 'Headboard: foam [ПЛОТНОСТЬ]', 'benefit': 'comfortable to lean on'},
      {'key': 'base', 'name': 'Base: orthopaedic birch slats', 'benefit': 'let the mattress breathe'},
      {'key': 'lift', 'name': 'Mechanism: gas lift [ЕСЛИ ЕСТЬ]', 'benefit': 'lifts with one hand'},
      {'key': 'frame', 'name': 'Frame: solid [ПОРОДА] + [ТОЛЩИНА] mm plywood', 'benefit': 'doesn’t creak or loosen'}]}},
  'armchair': {
    'ru': {'label': 'Кресло', 'layers': [
      {'key': 'cover', 'name': 'Обивка: [ТКАНЬ ПО ВЫБОРУ]', 'benefit': 'образцы в шоуруме'},
      {'key': 'seat', 'name': 'Сиденье: ППУ высокой упругости [ПЛОТНОСТЬ]', 'benefit': 'не проседает'},
      {'key': 'base', 'name': 'Основание: пружины «змейка» [ИЛИ РЕМНИ]', 'benefit': 'ровная упругая посадка'},
      {'key': 'frame', 'name': 'Каркас: массив [ПОРОДА] + фанера', 'benefit': 'не скрипит и не расшатывается'}]},
    'en': {'label': 'Armchair', 'layers': [
      {'key': 'cover', 'name': 'Upholstery: [ТКАНЬ ПО ВЫБОРУ]', 'benefit': 'samples in the showroom'},
      {'key': 'seat', 'name': 'Seat: high-resilience foam [ПЛОТНОСТЬ]', 'benefit': 'doesn’t sag'},
      {'key': 'base', 'name': 'Base: zigzag springs [ИЛИ РЕМНИ]', 'benefit': 'even, springy seating'},
      {'key': 'frame', 'name': 'Frame: solid [ПОРОДА] + plywood', 'benefit': 'doesn’t creak or loosen'}]}},
  'pouf': {
    'ru': {'label': 'Пуф / банкетка', 'layers': [
      {'key': 'cover', 'name': 'Обивка: [ТКАНЬ ПО ВЫБОРУ]', 'benefit': 'образцы в шоуруме'},
      {'key': 'fill', 'name': 'Наполнение: ППУ [ПЛОТНОСТЬ]', 'benefit': 'держит форму'},
      {'key': 'frame', 'name': 'Каркас: [МАТЕРИАЛ]', 'benefit': 'не скрипит и не расшатывается'}]},
    'en': {'label': 'Pouf / bench', 'layers': [
      {'key': 'cover', 'name': 'Upholstery: [ТКАНЬ ПО ВЫБОРУ]', 'benefit': 'samples in the showroom'},
      {'key': 'fill', 'name': 'Filling: foam [ПЛОТНОСТЬ]', 'benefit': 'keeps its shape'},
      {'key': 'frame', 'name': 'Frame: [МАТЕРИАЛ]', 'benefit': 'doesn’t creak or loosen'}]}},
}
import copy
mod = copy.deepcopy(TYPES['sofa']); mod['ru']['label'] = 'Диван модульный'; mod['en']['label'] = 'Modular sofa'
mod['ru']['layers'].insert(5, {'key': 'modules', 'name': 'Модули', 'benefit': 'каждый модуль на своём каркасе — переставляются и соединяются стяжками'})
mod['en']['layers'].insert(5, {'key': 'modules', 'name': 'Modules', 'benefit': 'each module on its own frame — rearranged and joined with connectors'})
TYPES['modular'] = mod
fo = copy.deepcopy(TYPES['sofa']); fo['ru']['label'] = 'Диван раскладной'; fo['en']['label'] = 'Sofa bed'
fo['ru']['layers'][4:4] = [{'key': 'mech', 'name': 'Механизм: [ТИП]', 'benefit': 'раскладывается одним движением'},
                           {'key': 'sleep', 'name': 'Спальное место: [ППУ / ПРУЖИННЫЙ БЛОК]', 'benefit': 'ровное, без стыков'}]
fo['en']['layers'][4:4] = [{'key': 'mech', 'name': 'Mechanism: [ТИП]', 'benefit': 'unfolds in one movement'},
                           {'key': 'sleep', 'name': 'Sleeping surface: [ППУ / ПРУЖИННЫЙ БЛОК]', 'benefit': 'flat, without joints'}]
TYPES['foldout'] = fo
DEF = {'sofa': (3, 3), 'modular': (4, 2), 'foldout': (3, 3), 'bed': (3, 3), 'armchair': (3, 3), 'pouf': (2, 3)}

existing = {}
if os.path.exists(OUT):
    if '--add' not in sys.argv and '--force' not in sys.argv:
        sys.exit('composition-data.js уже есть — он правится руками. Новые модели: --add; переписать всё: --force')
    if '--add' in sys.argv:
        old = open(OUT, encoding='utf-8').read()
        existing = {m: True for m in re.findall(r'model_id: "([^"]+)"', old)}

models = []
for it in cat:
    t = type_of(it)
    if not t or it['id'] in existing: continue
    s, h = DEF[t]
    models.append({'model_id': it['id'], 'name': names.get(it['id'], ''), 'type': t, 'verified': False, 'softness': s, 'seat_height': h, 'layers': overrides(it, t)})

def jsv(v): return json.dumps(v, ensure_ascii=False)
def model_js(m):
    lay = m['layers']
    lay_js = '{}' if not lay else '{ ru: ' + jsv(lay['ru']) + ', en: ' + jsv(lay['en']) + ' }'
    return (f'    {{ model_id: "{m["model_id"]}", type: "{m["type"]}", verified: false, softness: {m["softness"]}, seat_height: {m["seat_height"]}, '
            f'layers: {lay_js} }},   // {m["name"]}')

if '--add' in sys.argv and existing:
    old = open(OUT, encoding='utf-8').read(); i = old.index('  models: [') + len('  models: [')
    new = old[:i] + '\n' + '\n'.join(model_js(m) for m in models) + old[i:]
    open(OUT, 'w', encoding='utf-8').write(new); print('добавлено моделей:', len(models)); sys.exit()

head = '''/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
   RICCA DESIGNS — «СОСТАВ» МОДЕЛЕЙ (блок в окне «Подробнее» каждой модели каталога)

   Как это работает:
   • types — черновой состав по типу изделия (слои сверху вниз: от обивки к каркасу), русский и английский.
   • models — каждая модель каталога: тип, мягкость и высота посадки (1–5), свои слои поверх типа.
   • Пока у модели verified: false — блок «Состав» у неё НЕ показывается. Проверили состав с мастером, заполнили
     все [СКОБКИ] — ставьте verified: true. Если у проверенной модели в слоях остались [СКОБКИ], блок всё равно скрыт.
   • Свой слой у модели: в layers пишите { key: '…', name: '…', benefit: '…' } — слой с тем же key заменяется
     (например, пух в подушках: { key: 'back', name: 'Подушки спинки: пух и перо', benefit: 'мягкие, как облако' }),
     новый key — добавляется вниз. Убрать слой: { key: 'lift', hidden: true }.
   • softness — мягкость (1 — жёстко, 5 — очень мягко); seat_height — посадка (1 — низкая, 5 — высокая).
   • Новая модель в каталоге: python3 tools/composition-data.py --add — допишет её сюда с черновым составом.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
window.RICCA_COMPOSITION = {
  ui: {
    ru: { title: 'Состав', softness: 'Мягкость', seat: 'Посадка', low: 'низкая', high: 'высокая' },
    en: { title: 'What it’s made of', softness: 'Softness', seat: 'Seat height', low: 'low', high: 'high' }
  },
  types: '''
types_js = json.dumps(TYPES, ensure_ascii=False, indent=2).replace('\n', '\n  ')
body = head + types_js + ',\n  models: [\n' + '\n'.join(model_js(m) for m in models) + '\n  ]\n};\n'
open(OUT, 'w', encoding='utf-8').write(body)
print('моделей:', len(models), {t: sum(1 for m in models if m['type'] == t) for t in DEF})
