"""Собирает ricca/js/fabrics-data.js ТОЛЬКО из официальных фото поставщиков (img/fabrics/official/<коллекция>/collection.json).
Старые фото (снятые с вешалок) не используются. Коллекции без официальных фото на сайт не попадают.
Шапка файла (комментарий для заказчика) сохраняется из текущего fabrics-data.js.
Запуск: python3 tools/media-v3/build-fabrics-data.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'ricca')
OFF = os.path.join(ROOT, 'img', 'fabrics', 'official')

# порядок и подписи; факты — только из официальных характеристик (SPECS.md поставщика)
TYPES = [
    ('velur', 'Велюр', [
        ('alba', 'ALBA', 'микровелюр', ['90 000 циклов', '480 г/м.п.', 'ширина 140 см']),
        ('torrens-plain', 'TORRENS PLAIN', 'микровелюр', ['190 000 циклов', 'для владельцев животных', 'ширина 140 см']),
        ('torrens', 'TORRENS', 'микровелюр с муаром', ['190 000 циклов', 'муар скрывает следы', 'для владельцев животных']),
        ('eclipse', 'ECLIPSE', 'велюр', ['75 000 циклов', '440 г/м²', 'ширина 142 см']),
        ('beauty', 'BEAUTY', 'велюр в рубчик', ['100 000 циклов', '320 г/м²', 'для вакуумной упаковки']),
        ('river', 'RIVER', 'велюр', []),
        ('kiton', 'KITON', 'микровелюр', []),
    ]),
    ('bukle', 'Букле', [
        ('coco', 'COCO', 'букле', ['65 000 циклов', '480 г/м²', 'ширина 142 см']),
        ('noble', 'NOBLE', 'букле', ['65 000 циклов', '630 г/м²', 'ширина 140 см']),
        ('pique', 'PIQUE', 'букле', ['50 000 циклов', '500 г/м²', 'для любых форм мебели']),
        ('historiya', 'HISTORIYA', 'букле', []),
    ]),
    ('shenill', 'Шенилл', [
        ('lucky', 'LUCKY', 'шенилл', ['100 000 циклов', '420 г/м²', 'для любых форм мебели']),
        ('molly', 'MOLLY', 'шенилл', ['80 000 циклов', '430 г/м²', 'дышащий материал']),
        ('sambia', 'САМБИЯ', 'шенилл', ['70 000 циклов', 'простой уход: мыльный раствор', 'ширина 140 см']),
    ]),
    ('zamsha', 'Замша', [('timeless', 'TIMELESS', 'искусственная замша', [])]),
    ('ekokozha', 'Экокожа', [('ekokozha-alba', 'ALBA', 'экокожа', [])]),
]


def colour_label(coll_title, code, name):
    """Название цвета у поставщика часто = «Коллекция NN». На сайте показываем номер, без повтора коллекции."""
    n = (name or '').strip()
    for t in (coll_title, coll_title.title(), coll_title.capitalize()):
        n = re.sub(r'^.*?' + re.escape(t) + r'\s*', '', n, flags=re.I) if t and t.lower() in n.lower() else n
    n = re.sub(r'^[^/]*/\s*', '', n) if '/' in n else n
    n = n.strip(' -–—/')
    return n or f'№ {code}'


types = []
for tid, ttitle, colls in TYPES:
    out_c = []
    for cid, title, kind, facts in colls:
        p = os.path.join(OFF, cid, 'collection.json')
        if not os.path.exists(p):
            continue
        d = json.load(open(p))
        colours = []
        for c in d['colours']:
            colours.append({
                'name': '№ ' + c['code'].replace('FL', 'FL '),
                'src900': c['src1200'], 'src450': c['src600'], 'src240': c['thumb'], 'hex': c['hex'],
            })
        if not colours:
            continue
        out_c.append({'id': cid, 'title': title, 'kind': kind, 'facts': facts,
                      'texture': d['heroes'][0]['src'] if d['heroes'] else None,
                      'heroes': d['heroes'], 'inuse': d['inuse'], 'colours': colours})
    if out_c:
        types.append({'id': tid, 'title': ttitle, 'collections': out_c})

lib = {'types': types, 'totalNote': 'Больше 50 коллекций и 1000 цветов — в шоуруме'}
dst = os.path.join(ROOT, 'js', 'fabrics-data.js')
old = open(dst).read() if os.path.exists(dst) else ''
m = re.match(r'(/\*.*?\*/\s*)', old, re.S)
header = m.group(1) if m else ''
header = header.replace('/*\n', '/*\n * ФОТО — ТОЛЬКО ОФИЦИАЛЬНЫЕ, С САЙТОВ ПОСТАВЩИКОВ (img/fabrics/official/<коллекция>/; собирает tools/media-v3/build-fabrics-data.py).\n * heroes — крупные планы/драпировка, inuse — фото «в изделии». Код цвета (code) — как у поставщика.\n *\n', 1)
open(dst, 'w').write(header + 'window.RICCA_FABRIC_LIBRARY = ' + json.dumps(lib, ensure_ascii=False, indent=2) + ';\n')
print('types', len(types), 'collections', sum(len(t['collections']) for t in types),
      'colours', sum(len(c['colours']) for t in types for c in t['collections']))
