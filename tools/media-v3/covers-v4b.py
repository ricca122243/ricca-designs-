# Обложки каталога v4, правки по ревью (13 октября). Дополняет covers-v4.py: перезаписывает только перечисленные ниже файлы.
#   chairs     — «Стулья»: деталь материала из img/projects/p03-dining (спинка и ножки полукресла в букле, без вазы и столешницы),
#                чтобы плитка не повторяла соседнюю «Столы» (вся столовая из того же кадра). Визуализация, подпись «визуализация».
#   fabrics    — «Ткани»: спокойная стопка светло-серых → графитовых образцов из фото № 39, без бирок поставщика и без
#                зелёно-красного низа; насыщенность 0,75. Тот же файл — фото вверху экрана «Ткани» (RICCA_FABRIC_PHOTOS).
#   mattresses — «Матрасы ELUNA»: из главного кадра сайта ELUNA /img/hero.webp (матрас в луче света на чёрном) + знак ELUNA
#                /img/mark.png (BRIEF, правки 13 октября: обложка совпадает с тем, что видно по ссылке). Метки RICCA нет.
#                + mattresses-wide (16 : 7, планшет 600–1099 px).
#   armchair29 — обложка сетки кресла № 04: верхний кадр фото № 29 (кресло у стены с молдингами), без шва коллажа и рук;
#                полное фото остаётся вторым в галерее изделия.
# Запуск: python3 tools/media-v3/covers-v4b.py [chairs fabrics mattresses armchair29]
import sys, os
from PIL import Image, ImageFilter, ImageEnhance

ROOT = '/home/user/ricca-designs-'
R = ROOT + '/ricca'
CAT = R + '/img/catalog'
ONLY = set(sys.argv[1:])
want = lambda n: not ONLY or n in ONLY


def kb(path):
    return os.path.getsize(path) // 1024


def export(crop, name, sizes, q=82, sharpen=None):
    """crop — кадр 4:5 (или 16:7); sizes — [(w, h, суффикс, q)]"""
    for w, h, suf, qq in sizes:
        im = crop.resize((w, h), Image.LANCZOS)
        k = w / crop.width
        if sharpen and k > 1.15:
            im = im.filter(ImageFilter.UnsharpMask(*sharpen))
        out = f'{CAT}/{name}{suf}.webp'
        im.save(out, quality=qq, method=6)
        print('%-34s %4d×%-4d ×%.2f  %d KB' % (os.path.relpath(out, R), w, h, k, kb(out)))


if want('chairs'):
    src = Image.open(R + '/img/projects/p03-dining.webp').convert('RGB')
    box = (760, 960, 1180, 1485)            # 420 × 525: спинка и ножки одного полукресла
    c = src.crop(box)
    assert abs(c.width / c.height - 0.8) < 0.003
    c = c.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    export(c, 'cover-chairs', [(1200, 1500, '', 80), (600, 750, '-600', 80)], sharpen=(1.4, 45, 2))

if want('fabrics'):
    src = Image.open(R + '/content/client-photos/39-fabrics-swatch-books.jpg').convert('RGB')
    box = (560, 40, 1440, 1140)             # 880 × 1100: стопка светло-серых → графитовых образцов, бирок нет
    c = ImageEnhance.Color(src.crop(box)).enhance(0.75)
    export(c, 'cover-fabrics', [(1200, 1500, '', 74), (600, 750, '-600', 72)], sharpen=(1.2, 35, 2))

if want('mattresses'):
    src = Image.open(ROOT + '/img/hero.webp').convert('RGB')      # 1920 × 1072, сайт ELUNA
    mark = Image.open(ROOT + '/img/mark.png').convert('RGBA')     # 351 × 345, молочный знак ELUNA

    def with_mark(im, size, at):
        m = mark.resize((size, round(size * mark.height / mark.width)), Image.LANCZOS)
        im = im.copy(); im.paste(m, at, m)
        return im

    box = (863, 0, 1720, 1072)              # 857 × 1072 (4 : 5): угол матраса справа, луч сверху
    c = src.crop(box)
    for w, h, suf, q in [(1200, 1500, '', 82), (600, 750, '-600', 80)]:
        im = c.resize((w, h), Image.LANCZOS)
        if w > c.width * 1.15:
            im = im.filter(ImageFilter.UnsharpMask(1.2, 35, 2))
        s = round(w * 0.092)
        im = with_mark(im, s, (round(w * 0.075), round(w * 0.075)))
        out = f'{CAT}/cover-mattresses{suf}.webp'; im.save(out, quality=q, method=6)
        print('%-34s %4d×%-4d  %d KB' % (os.path.relpath(out, R), w, h, kb(out)))
    wide = src.crop((0, 130, 1920, 970))   # 1920 × 840 (16 : 7) — планшет
    im = wide.resize((1200, 525), Image.LANCZOS)
    im = with_mark(im, 52, (40, 36))
    out = f'{CAT}/cover-mattresses-wide.webp'; im.save(out, quality=82, method=6)
    print('%-34s 1200×525  %d KB' % (os.path.relpath(out, R), kb(out)))

if want('armchair29'):
    src = Image.open(CAT + '/29-armchairs-boucle-white-atelier.webp').convert('RGB')   # 1024 × 1280, коллаж из двух кадров
    box = (488, 0, 1016, 660)               # 528 × 660: правое кресло у стены, шов коллажа (≈ 674) не попадает
    c = src.crop(box)
    assert abs(c.width / c.height - 0.8) < 0.003
    export(c, '29-armchairs-boucle-white-atelier-cover', [(960, 1200, '', 82), (600, 750, '-600', 80)], sharpen=(1.2, 35, 2))
