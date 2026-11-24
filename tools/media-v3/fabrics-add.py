#!/usr/bin/env python3
"""Новые коллекции тканей с официальных сайтов поставщиков → раздел «Ткани» и конструктор.
  python3 tools/media-v3/fabrics-add.py <папка raw> [id …]        (без id — все папки, где есть meta.json)
  python3 tools/media-v3/fabrics-add.py --list                    (что сейчас в js/fabrics-data.js)

Вход — <raw>/<id>/meta.json и <raw>/<id>/img/<код>.<ext> (владелец, 24 ноября: «ткани надо с их офф сайта брать»):
  {"id","title","supplier","kind","source_url","specs":{"composition","martindale","weight","width",…},
   "colours":[{"code","name","file":"img/01.jpg",…}]}
Что делает:
  1) оригиналы → ricca/content/fabrics/_official/<id>/ (COLOURS.json, colours/, SPECS.md); папка вне репозитория (.gitignore);
  2) файлы сайта → ricca/img/fabrics/official/<id>/<код>-1200.webp, -600.webp, -160.webp и collection.json.
     Кадр — квадрат из центра фото цвета. Цвет не меняется. Крупное фото: не больше 1400 px; исходник меньше 1000 px
     увеличивается без ИИ (Lanczos, не больше ×1,6) с лёгкой резкостью — новых деталей не придумывает;
  3) вписывает коллекцию в ricca/js/fabrics-data.js в свой тип (Велюр, Букле, Шенилл, Рогожка, Мех), в конец типа.
     Существующие коллекции и номера их цветов не трогает: на номерах держатся ссылки #fabric-<id>-<N> и конструктор.
     Повторный запуск для того же id заменяет коллекцию на месте.
Названия поставщиков на сайт не идут: в данных только название коллекции. Факты — только цифры из характеристик поставщика.
Порядок и подписи на сайте можно поправить в tools/media-v3/fabrics-new.json: {"<id>": {"title","kind","type","facts","skip"}}."""
import glob, json, os, re, shutil, sys
import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'ricca'))
SRC = os.path.join(ROOT, 'content', 'fabrics', '_official')
DST = os.path.join(ROOT, 'img', 'fabrics', 'official')
DATA = os.path.join(ROOT, 'js', 'fabrics-data.js')
OVERRIDES = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fabrics-new.json')

# порядок типов на сайте; новые типы появляются только когда в них есть коллекции
TYPES = [('exclusive', 'Эксклюзивные'), ('velur', 'Велюр'), ('bukle', 'Букле'), ('shenill', 'Шенилл'), ('rogozhka', 'Рогожка'),
         ('zhakkard', 'Жаккард'), ('meh', 'Мех'), ('zamsha', 'Замша'), ('ekokozha', 'Экокожа')]
KIND_TYPE = [(r'букле', 'bukle'), (r'шенил', 'shenill'), (r'рогожк', 'rogozhka'), (r'жаккард', 'zhakkard'), (r'мех', 'meh'),
             (r'замш|нубук', 'zamsha'), (r'кож', 'ekokozha'), (r'велюр|бархат|вельвет', 'velur')]


def type_of(kind):
    for rx, t in KIND_TYPE:
        if re.search(rx, kind or '', re.I): return t
    return None


def hexof(im):
    a = np.asarray(im.convert('RGB').resize((64, 64), Image.BOX)).reshape(-1, 3).astype(float) / 255
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4).mean(0)
    s = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)
    return '#%02x%02x%02x' % tuple(int(round(v * 255)) for v in s)


def square(im, frac):
    w, h = im.size; s = int(min(w, h) * frac)
    return im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))


def large(sq):
    s = sq.width
    if s >= 1400: return sq.resize((1400, 1400), Image.LANCZOS)
    if s >= 1000: return sq
    t = min(1000, int(s * 1.6))
    return sq.resize((t, t), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))


def spaced(n):
    return f'{int(n):,}'.replace(',', ' ').replace(' ', ' ')


def facts_of(specs):
    """до трёх фактов: циклы, плотность, ширина — как их пишет поставщик"""
    out = []; s = specs or {}
    m = s.get('martindale')
    if m:
        try: out.append(f'{spaced(int(re.sub(r"[^0-9]", "", str(m))))} циклов')
        except ValueError: pass
    w = str(s.get('weight') or '').strip()
    if w:
        w = re.sub(r'\s*(гр?\.?)\s*/\s*', ' г/', w).replace('кв.м', 'м²').replace('м2', 'м²').replace('м.л.', 'м.п.').replace('пог.м', 'м.п.')
        w = re.sub(r'\s+', ' ', w).strip()
        if re.match(r'^\d', w): out.append(w)
    wd = re.search(r'(\d{2,3})', str(s.get('width') or ''))
    if wd: out.append(f'ширина {wd.group(1)} см')
    return out[:3]


def build(raw, cid, ov):
    meta = json.load(open(os.path.join(raw, cid, 'meta.json'), encoding='utf-8'))
    o = ov.get(cid, {})
    if o.get('skip'): print(cid, '— пропущена (fabrics-new.json)'); return None
    src = os.path.join(SRC, cid); os.makedirs(os.path.join(src, 'colours'), exist_ok=True)
    out = os.path.join(DST, cid); os.makedirs(out, exist_ok=True)
    colours, cj = [], []
    seen = set()
    for c in meta.get('colours', []):
        f = c.get('file') and os.path.join(raw, cid, c['file'])
        if not f or not os.path.isfile(f): continue
        code = str(c.get('code', '')).strip().replace('/', '-').replace(' ', '-')
        if not code or code in seen: continue
        seen.add(code)
        ext = os.path.splitext(f)[1].lower() or '.jpg'
        shutil.copyfile(f, os.path.join(src, 'colours', code + ext))
        cj.append({'code': code, 'name': c.get('name') or code, 'image': f'colours/{code}{ext}', 'source': c.get('image_url') or c.get('page_url') or ''})
        im = ImageOps.exif_transpose(Image.open(f)).convert('RGB')
        frac = max(0.4, min(0.94, 1800 / min(im.size)))        # большой исходник — берём меньшую долю, фактура ≈ 1:1
        sq = square(im, frac)
        big = large(sq); big.save(f'{out}/{code}-1200.webp', 'WEBP', quality=90, method=6)
        mid = sq.resize((700, 700), Image.LANCZOS) if sq.width > 700 else sq
        mid.save(f'{out}/{code}-600.webp', 'WEBP', quality=88, method=6)
        square(im, 0.5).resize((160, 160), Image.LANCZOS).save(f'{out}/{code}-160.webp', 'WEBP', quality=80, method=6)
        colours.append({'code': code, 'name': c.get('name') or code, 'hex': hexof(sq),
                        'src1200': f'img/fabrics/official/{cid}/{code}-1200.webp', 'src600': f'img/fabrics/official/{cid}/{code}-600.webp',
                        'thumb': f'img/fabrics/official/{cid}/{code}-160.webp'})
    json.dump(cj, open(os.path.join(src, 'COLOURS.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sp = meta.get('specs') or {}
    open(os.path.join(src, 'SPECS.md'), 'w', encoding='utf-8').write(
        f"# {meta.get('title', cid)} — {meta.get('supplier', '')} (внутреннее, на сайт не идёт)\n\nИсточник: {meta.get('source_url', '')}\n\n"
        + '\n'.join(f'- {k}: {v}' for k, v in sp.items() if v) + f"\n\nЗаметки: {meta.get('notes', '')}\n")
    kind = o.get('kind') or meta.get('kind') or ''
    tid = o.get('type') or type_of(kind)
    data = {'id': cid, 'title': o.get('title') or meta.get('title') or cid.upper(), 'kind': kind, 'type': tid,
            'facts': o['facts'] if 'facts' in o else facts_of(sp), 'colours': colours, 'heroes': [], 'inuse': []}
    json.dump(data, open(f'{out}/collection.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"{cid}: {data['title']} · {kind} → {tid} · цветов {len(colours)} из {len(meta.get('colours', []))} · {data['facts']}")
    return data


def read_lib():
    s = open(DATA, encoding='utf-8').read()
    m = re.match(r'(/\*.*?\*/\s*)window\.RICCA_FABRIC_LIBRARY = (.*);\s*$', s, re.S)
    return m.group(1), json.loads(m.group(2))


def write_lib(header, lib):
    open(DATA, 'w', encoding='utf-8').write(header + 'window.RICCA_FABRIC_LIBRARY = ' + json.dumps(lib, ensure_ascii=False, indent=2) + ';\n')


def insert(lib, d):
    if not d or not d['colours']: return False
    if not d['type']: print('  НЕТ ТИПА для', d['id'], '— укажите "type" в fabrics-new.json'); return False
    entry = {'id': d['id'], 'title': d['title'], 'kind': d['kind'], 'facts': d['facts'], 'texture': d['colours'][0]['src1200'],
             'colours': [{'name': '№ ' + c['code'], 'src900': c['src1200'], 'src450': c['src600'], 'src240': c['thumb'], 'hex': c['hex']} for c in d['colours']]}
    for t in lib['types']:                                   # уже есть — заменить на месте (в каком бы типе ни стояла)
        for i, c in enumerate(t['collections']):
            if c['id'] == d['id']:
                if t['id'] == d['type']: t['collections'][i] = entry; return True
                del t['collections'][i]; break
    t = next((x for x in lib['types'] if x['id'] == d['type']), None)
    if not t:
        t = {'id': d['type'], 'title': dict(TYPES)[d['type']], 'collections': []}
        order = [x for x, _ in TYPES]; lib['types'].append(t)
        lib['types'].sort(key=lambda x: order.index(x['id']) if x['id'] in order else 99)
    t['collections'].append(entry)
    return True


def main():
    if '--list' in sys.argv:
        _, lib = read_lib()
        for t in lib['types']: print(t['id'], t['title'], '·', ', '.join(f"{c['id']}({len(c['colours'])})" for c in t['collections']))
        return
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    raw = os.path.abspath(args[0]); ids = args[1:] or sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(raw, '*', 'meta.json')))
    ov = json.load(open(OVERRIDES, encoding='utf-8')) if os.path.exists(OVERRIDES) else {}
    ids.sort(key=lambda i: ov.get(i, {}).get('order', 999))
    header, lib = read_lib(); n = 0
    for cid in ids:
        d = build(raw, cid, ov)
        if insert(lib, d): n += 1
    write_lib(header, lib)
    print('вписано коллекций:', n, '· всего:', sum(len(t['collections']) for t in lib['types']), '· цветов:', sum(len(c['colours']) for t in lib['types'] for c in t['collections']))


if __name__ == '__main__':
    main()
