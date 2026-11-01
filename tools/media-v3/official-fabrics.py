"""Официальные фото тканей поставщиков → файлы для сайта.

Вход:  ricca/content/fabrics/_official/<коллекция>/COLOURS.json (+ colours/, texture/, in-use/, SPECS.md)
Выход: ricca/img/fabrics/official/<коллекция>/
       <код>-1200.webp (1400 px, качество 90 — максимум, не уменьшать: решение владельца), -600.webp (700 px) — квадрат из центра фото цвета (видна фактура, не «плоский прямоугольник»)
       <код>-160.webp             — миниатюра для кнопки цвета
       hero-N-1600.webp           — крупные планы / драпировка поставщика } на сайт НЕ идут: на части есть названия поставщика,
       inuse-N-1200.webp          — фото «в изделии / в интерьере»        } люди и чужие интерьеры (сборка dist их отбрасывает)
       collection.json            — коды, названия цветов, средний цвет (hex), пути к файлам
Цвет фото не меняется (только масштаб и кадр).
Запуск: python3 tools/media-v3/official-fabrics.py sambia [eclipse ...]   (без аргументов — все готовые;
        --large-only — пересжать только большие фото <код>-1200.webp)
"""
import glob, json, os, sys
import numpy as np
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'ricca')
SRC = os.path.join(ROOT, 'content', 'fabrics', '_official')
DST = os.path.join(ROOT, 'img', 'fabrics', 'official')


def square_center(im, frac):
    w, h = im.size
    s = int(min(w, h) * frac)
    return im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))


def hexof(im):
    a = np.asarray(im.convert('RGB').resize((64, 64), Image.BOX)).reshape(-1, 3).astype(float) / 255
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4).mean(0)
    s = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)
    return '#%02x%02x%02x' % tuple(int(round(v * 255)) for v in s)


def save(im, path, size=None, q=84):
    if size:
        im = im.resize((size, size), Image.LANCZOS) if im.width == im.height else im
    im.convert('RGB').save(path, 'WEBP', quality=q, method=6)


def fit_long(im, long_side):
    w, h = im.size
    k = long_side / max(w, h)
    return im if k >= 1 else im.resize((round(w * k), round(h * k)), Image.LANCZOS)


def build(coll):
    src = os.path.join(SRC, coll)
    meta = json.load(open(os.path.join(src, 'COLOURS.json')))
    out = os.path.join(DST, coll)
    os.makedirs(out, exist_ok=True)
    colours = []
    for c in meta:
        f = os.path.join(src, c.get('image') or '')
        if not os.path.isfile(f):
            continue
        im = ImageOps.exif_transpose(Image.open(f)).convert('RGB')
        # кадр: чем больше исходник, тем меньшую долю берём, чтобы фактура читалась примерно 1:1
        frac = max(0.4, min(0.9, 1800 / min(im.size)))
        sq = square_center(im, frac)
        code = str(c.get('code', len(colours) + 1)).strip().replace('/', '-').replace(' ', '-')
        save(sq, f'{out}/{code}-1200.webp', 1400, 90)   # максимум качества — решение владельца («не уменьшать»); телефон берёт -600 через srcset
        if LARGE_ONLY:
            continue
        save(sq, f'{out}/{code}-600.webp', 700, 88)
        save(square_center(im, 0.5), f'{out}/{code}-160.webp', 160, 80)
        colours.append({'code': code, 'name': c.get('name', code), 'hex': hexof(sq),
                        'src1200': f'img/fabrics/official/{coll}/{code}-1200.webp',
                        'src600': f'img/fabrics/official/{coll}/{code}-600.webp',
                        'thumb': f'img/fabrics/official/{coll}/{code}-160.webp'})
    if LARGE_ONLY:   # только пересжатие -1200: остальные файлы и collection.json не трогаем
        print(coll, 'large only')
        return
    heroes = []
    for i, f in enumerate(sorted(glob.glob(os.path.join(src, 'texture', '*'))), 1):
        im = fit_long(ImageOps.exif_transpose(Image.open(f)).convert('RGB'), 2000)
        p = f'{out}/hero-{i}-1600.webp'; save(im, p, q=90)
        heroes.append({'src': f'img/fabrics/official/{coll}/hero-{i}-1600.webp', 'w': im.width, 'h': im.height})
    inuse = []
    for i, f in enumerate(sorted(glob.glob(os.path.join(src, 'in-use', '*'))), 1):
        im = fit_long(ImageOps.exif_transpose(Image.open(f)).convert('RGB'), 1600)
        p = f'{out}/inuse-{i}-1200.webp'; save(im, p, q=90)
        inuse.append({'src': f'img/fabrics/official/{coll}/inuse-{i}-1200.webp', 'w': im.width, 'h': im.height})
    data = {'id': coll, 'colours': colours, 'heroes': heroes, 'inuse': inuse}
    json.dump(data, open(f'{out}/collection.json', 'w'), ensure_ascii=False, indent=1)
    print(coll, 'colours', len(colours), 'heroes', len(heroes), 'inuse', len(inuse))


LARGE_ONLY = '--large-only' in sys.argv

if __name__ == '__main__':
    colls = [a for a in sys.argv[1:] if not a.startswith('--')] or [os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(SRC, '*', 'COLOURS.json'))]
    for c in colls:
        build(c)
