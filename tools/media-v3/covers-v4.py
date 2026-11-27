# Обложки плиток каталога v4 (10 октября, ночь: «не дёшево» — атмосферные интерьеры, никаких вырезок на бежевом).
# Решение по кадрам — scratchpad v4/SPEC.md §2–§5 (основа «Галерея BOCA»):
#   Диваны, Кровати, Кресла, Стулья, Столы — наши ИИ-интерьеры img/projects (Higgsfield; на сайте подпись «визуализация»,
#   alt начинается с «Визуализация:»; никогда не выдаются за реализованные проекты);
#   Ткани — живое фото № 39 (кадр прежний, только легче файл); Матрасы ELUNA — рендер разреза на чёрном (как карточка «Новости»).
# Кадр выбран так, чтобы предмет категории был главным в плитке 4:5. Метка RICCA DESIGNS — CSS-слой, в файл не впечатывается.
# Цвет не правится (без фильтров и перекраски); после увеличения > ×1,15 — лёгкая резкость.
# Попутно (SPEC §5): img/projects/p03-dining-chairs.webp, img/eluna/mattress-tile.webp, луна img/eluna/moon-600/300/256.webp.
# Запуск: python3 tools/media-v3/covers-v4.py [имя …]   (по умолчанию всё; имена: sofas beds armchairs chairs tables fabrics
#         mattresses chairs-spec tile moon)
import sys, os, shutil
from PIL import Image, ImageFilter, ImageDraw
import numpy as np

ROOT = '/home/user/ricca-designs-'
R = ROOT + '/ricca'
PRJ = R + '/img/projects'
CAT = R + '/img/catalog'
ELU = R + '/img/eluna'
ONLY = set(sys.argv[1:])
W, H = 1200, 1500


def want(name):
    return not ONLY or name in ONLY


def save_cover(src, box, name, q=82, q600=80, pre_blur=0.0):
    """box — кадр 4:5 в пикселях исходника; пишет cover-<name>.webp (1200 × 1500) и -600 (600 × 750)."""
    im = Image.open(src).convert('RGB')
    x0, y0, x1, y1 = box
    assert 0 <= x0 < x1 <= im.width and 0 <= y0 < y1 <= im.height, (src, box, im.size)
    crop = im.crop(box)
    assert abs(crop.width / crop.height - 0.8) < 0.003, crop.size
    k = W / crop.width
    big = (crop.filter(ImageFilter.GaussianBlur(pre_blur)) if pre_blur else crop).resize((W, H), Image.LANCZOS)
    if k > 1.15:
        big = big.filter(ImageFilter.UnsharpMask(radius=1.4, percent=45 if k < 1.6 else 70, threshold=2))
    small = crop.resize((600, 750), Image.LANCZOS)
    big.save(f'{CAT}/cover-{name}.webp', quality=q, method=6)
    small.save(f'{CAT}/cover-{name}-600.webp', quality=q600, method=6)
    print('cover-%s  %s  box %s  scale ×%.2f  %d / %d KB' % (
        name, os.path.relpath(src, ROOT), box, k,
        os.path.getsize(f'{CAT}/cover-{name}.webp') // 1024, os.path.getsize(f'{CAT}/cover-{name}-600.webp') // 1024))


# --- плитки 1–5: ИИ-интерьеры (визуализации) ---------------------------------------------------------------------------
if want('sofas'):
    # модульный диван, стол из чёрного дуба, оттоманка; экран в стене срезан правым краем — диван главный
    save_cover(PRJ + '/p08-media.webp', (0, 270, 984, 1500), 'sofas')
if want('beds'):
    # кадр целиком: кровать и так главная, воздух сверху; файл = исходник без перекодирования
    shutil.copyfile(PRJ + '/p02-bedroom.webp', CAT + '/cover-beds.webp')
    shutil.copyfile(PRJ + '/p02-bedroom-600.webp', CAT + '/cover-beds-600.webp')
    print('cover-beds  ricca/img/projects/p02-bedroom.webp  кадр целиком, копия без перекодирования')
if want('armchairs'):
    # кресло на чёрной раме, торшер, окно; верх стеллажей отрезан, кресло — в центре внимания
    save_cover(PRJ + '/p04-study.webp', (0, 300, 960, 1500), 'armchairs')
if want('chairs'):
    # крупно полукресло в букле у чёрного стола (диптих со «Столами»: деталь → вся комната), кадр SPEC §5
    save_cover(PRJ + '/p03-dining.webp', (620, 775, 1200, 1500), 'chairs')
if want('tables'):
    # стол, ветка в вазе, светильник, арка; дверная ручка слева срезана
    save_cover(PRJ + '/p03-dining.webp', (120, 150, 1200, 1500), 'tables')

# --- плитка 6: ткани — фото № 39 (кадр прежний, covers.py), файл легче -------------------------------------------------
# Зерно фото не сжимается: при q74 большой файл 516 КБ. Большой файл грузится только на планшетах / 3× (плитка ряда 2 —
# 290 px, берёт -600), поэтому у него лёгкое сглаживание зерна до уменьшения (σ 0,9 px исходника ≈ 0,56 px итога) и q62
# (≈ 300 КБ, было 643); малый -600 — без сглаживания, q72 (было 169 КБ).
if want('fabrics'):
    save_cover(R + '/content/client-photos/39-fabrics-swatch-books.jpg', (0, 80, 1920, 2480), 'fabrics', q=62, q600=72,
               pre_blur=0.9)

# --- плитка 7: матрасы ELUNA — разрез на чёрном ------------------------------------------------------------------------
if want('mattresses'):
    # тот же рендер, что img/eluna/mattress-layers.webp и кадр f01 последовательности img/eluna/seq (1920 × 1080);
    # берём его версию 2560 × 1440 с сайта ELUNA в корне репозитория (ассет ELUNA), чтобы не увеличивать ×1,39
    save_cover(ROOT + '/img/seq2560/f01.webp', (704, 0, 1856, 1440), 'mattresses', q=84, q600=82)

# --- SPEC §5: доп. файлы для вёрстки ----------------------------------------------------------------------------------
if want('chairs-spec'):
    im = Image.open(PRJ + '/p03-dining.webp').convert('RGB').crop((620, 775, 1200, 1500)).resize((600, 750), Image.LANCZOS)
    im.save(PRJ + '/p03-dining-chairs.webp', quality=80, method=6)
    print('p03-dining-chairs.webp 600×750  %d KB' % (os.path.getsize(PRJ + '/p03-dining-chairs.webp') // 1024))
if want('tile'):
    im = Image.open(ELU + '/mattress-layers.webp').convert('RGB').crop((280, 0, 920, 800))
    im.save(ELU + '/mattress-tile.webp', quality=80, method=6)
    print('mattress-tile.webp 640×800  %d KB' % (os.path.getsize(ELU + '/mattress-tile.webp') // 1024))

# --- луна для карточки «Новости»: диск во весь квадрат, чистый край, вокруг прозрачно -----------------------------------
if want('moon'):
    src = Image.open(ELU + '/moon-hd-1280.webp').convert('RGBA')
    a = np.asarray(src).astype(np.float64)
    al = a[..., 3] / 255.0
    # диск по альфе: центр — центр масс, радиус — по площади (с учётом сглаженного края)
    ys, xs = np.mgrid[0:src.height, 0:src.width]
    m = al.sum()
    cx, cy = (al * xs).sum() / m + 0.5, (al * ys).sum() / m + 0.5
    r = np.sqrt(m / np.pi)
    print('moon disc: centre %.2f, %.2f  r %.2f px (source %dx%d)' % (cx, cy, r, src.width, src.height))
    # квадрат, описанный около диска (r − 1 px: край внутрь на пиксель, чтобы не тащить старую полупрозрачную кайму)
    rr = r - 1.0
    box = (cx - rr, cy - rr, cx + rr, cy + rr)
    for size in (600, 300, 256):
        rgb = src.convert('RGB').transform((size * 4, size * 4), Image.EXTENT, box, resample=Image.BICUBIC)
        rgb = rgb.resize((size, size), Image.LANCZOS)
        # новая альфа — аналитический круг со сглаживанием 4 × 4
        ss = size * 4
        mask = Image.new('L', (ss, ss), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, ss - 1, ss - 1), fill=255)
        mask = mask.resize((size, size), Image.LANCZOS)
        # вне диска — чистый чёрный (без цветной каймы при сжатии и масштабе)
        rgbn = np.asarray(rgb).astype(np.float64) * (np.asarray(mask)[..., None] > 0)
        out = Image.fromarray(rgbn.astype('uint8')).convert('RGBA')
        out.putalpha(mask)
        p = f'{ELU}/moon-{size}.webp'
        out.save(p, quality=86 if size > 300 else 84, method=6, alpha_quality=100, exact=True)
        print('moon-%d.webp %dx%d RGBA  %d KB' % (size, size, size, os.path.getsize(p) // 1024))
