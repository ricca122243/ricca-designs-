# Обложки плиток «предметного» ряда каталога (F2, 10 октября): Стулья · Столы · Хранение · Матрасы ELUNA.
# Одна подача: предмет на тоне --studio (#F7F6F0), ширина ≈ 78 % плитки (высота не больше 66 %), общий «пол» — низ предмета
# на 78 % высоты плитки. ELUNA — слои матраса из рендера на чёрном, вырезанные на светлый тон (без чёрного блока).
# Запуск: python3 tools/media-v3/covers-studio.py <outDir>   (по умолчанию ricca/img/catalog)
import sys, os
from PIL import Image, ImageFilter, ImageDraw
import numpy as np
R = '/home/user/ricca-designs-/ricca'
OUT = sys.argv[1] if len(sys.argv) > 1 else R + '/img/catalog'
os.makedirs(OUT, exist_ok=True)
W, H = 1200, 1500
BG = (247, 246, 240)
BASE = 0.78   # низ предмета, доля высоты
def save(im, name):
    im = im.convert('RGB'); assert im.size == (W, H)
    im.save(f'{OUT}/{name}.webp', quality=84, method=6)
    im.resize((600, 750), Image.LANCZOS).save(f'{OUT}/{name}-600.webp', quality=82, method=6)
def place(obj, alpha, name, tw=0.78, th=0.66, base=BASE, shadow=False):
    ow, oh = obj.size
    s = min(tw * W / ow, th * H / oh)
    nw, nh = round(ow * s), round(oh * s)
    obj = obj.resize((nw, nh), Image.LANCZOS); alpha = alpha.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGB', (W, H), BG)
    x, y = round((W - nw) / 2), round(base * H - nh)
    if shadow:
        sh = Image.new('L', (W, H), 0); d = ImageDraw.Draw(sh)
        d.ellipse((x + nw * 0.06, y + nh - 26, x + nw * 0.94, y + nh + 22), fill=70)
        sh = sh.filter(ImageFilter.GaussianBlur(22))
        canvas = Image.composite(Image.new('RGB', (W, H), (205, 202, 192)), canvas, sh)
    canvas.paste(obj, (x, y), alpha)
    print(name, 'obj %dx%d = %.0f%% w, %.0f%% h, top %d' % (nw, nh, 100 * nw / W, 100 * nh / H, y))
    save(canvas, name)
def studio(src, name, **kw):
    im = Image.open(src).convert('RGB')
    bgc = np.array(im.getpixel((4, 4)))
    a = np.asarray(im).astype(int); d = np.abs(a - bgc).max(axis=2)
    ys, xs = np.where(d > 7); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    crop = im.crop((x0, y0, x1, y1))
    # фон рендера → прозрачность по разнице с фоном (мягкий край, тени сохраняются полупрозрачными)
    dd = np.clip((d[y0:y1, x0:x1] - 2) * 255 / 22, 0, 255).astype('uint8')
    place(crop, Image.fromarray(dd), name, **kw)
def eluna(src, name, **kw):
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(float); lum = a.max(axis=2)
    chroma = a.max(axis=2) - a.min(axis=2)
    # слои и пружины: светлое — по яркости, кокос и синий слой — по цвету; серая плита основания и тень (нейтральные, тёмные) — вне маски
    m = Image.fromarray((((lum > 95) | ((chroma > 24) & (lum > 30))) * 255).astype('uint8'))
    m = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))   # убрать искры
    m = m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))   # закрыть мелкие зазубрины края
    inv = Image.fromarray(255 - np.asarray(m)).copy(); ImageDraw.floodfill(inv, (0, 0), 128)
    keep = (np.asarray(m) > 0) | (np.asarray(inv) == 255)          # заполнить «дыры» (тени между пружинами внутри силуэта)
    # пружинный блок — по контуру (многоугольник по кадру f24, 1920 × 1080): внутри — всё, что светлее чёрного фона;
    # ниже нижнего края пружин — серая плита основания, её не берём
    W0, H0 = im.size
    def poly(pts):
        z = Image.new('L', (W0, H0), 0); ImageDraw.Draw(z).polygon(pts, fill=255); return np.asarray(z) > 0
    above = poly([(0, 0), (W0, 0), (W0, 664), (1600, 664), (967, 937), (320, 674), (0, 674)])
    springs = poly([(318, 470), (318, 674), (967, 937), (1602, 664), (1602, 470)]) & (lum > 26)
    keep = (keep & above) | springs
    inv = Image.fromarray(((~keep) * 255).astype('uint8')).copy(); ImageDraw.floodfill(inv, (0, 0), 128)
    keep = keep | (np.asarray(inv) == 255)
    keep = np.asarray(Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.MinFilter(3))) > 0
    al = Image.fromarray((keep * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.1))
    ys, xs = np.where(keep); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    place(im.crop((x0, y0, x1, y1)), al.crop((x0, y0, x1, y1)), name, shadow=True, **kw)
studio(R + '/img/catalog/p-chair-08.webp', 'cover-chairs')
studio(R + '/img/catalog/p-table-03.webp', 'cover-tables')
studio(R + '/img/catalog/p-storage-01.webp', 'cover-storage')
eluna(R + '/img/eluna/seq/f24.webp', 'cover-mattresses', tw=0.80)
