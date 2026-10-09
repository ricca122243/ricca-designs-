# Фото-обложки плиток каталога: Диваны · Кровати · Кресла и пуфы · Ткани (1200 × 1500 + -600, без фильтров и перекраски).
# Предметный ряд (Стулья · Столы · Матрасы ELUNA) делает covers-studio.py.
# 10 октября (вечер): чужие фото сняты с сайта — обложки только из оставленных кадров (MANIFEST.md, «Снято с сайта 10 октября»):
#   Диваны — № 52 (партнёр, вид сверху), Кресла — № 37 (живое фото), Кровати — № 40 (партнёр), Ткани — № 39 (живое фото).
# Запуск: python3 tools/media-v3/covers.py <outDir> [имя …]   (по умолчанию ricca/img/catalog и все четыре обложки)
import sys, os
from PIL import Image
R = '/home/user/ricca-designs-/ricca'
C = R + '/content/client-photos'
OUT = sys.argv[1] if len(sys.argv) > 1 else R + '/img/catalog'
ONLY = set(sys.argv[2:])
os.makedirs(OUT, exist_ok=True)
W, H = 1200, 1500

def save(im, name):
    im = im.convert('RGB')
    assert im.size == (W, H)
    im.save(f'{OUT}/{name}.webp', quality=82, method=6)
    im.resize((600, 750), Image.LANCZOS).save(f'{OUT}/{name}-600.webp', quality=80, method=6)

def photo(src, box, name):
    if ONLY and name not in ONLY:
        return
    im = Image.open(src).convert('RGB').crop(box)
    assert abs(im.size[0] / im.size[1] - 0.8) < 0.002, im.size
    print(name, os.path.basename(src), box, 'scale %.2f' % (W / im.size[0]))
    save(im.resize((W, H), Image.LANCZOS), name)

photo(C + '/partner/LIKELY-sarnico-top.jpg', (0, 43, 955, 1237), 'cover-sofas')             # вид сверху, ×1,26 (№ 42 — первый план видео входа, не повторяем)
photo(C + '/partner/LIKELY-barolo-bedroom-b.jpg', (0, 0, 2048, 2560), 'cover-beds')
photo(C + '/37-armchairs-round-pair-light.jpg', (0, 40, 960, 1240), 'cover-armchairs')     # ×1,25
photo(C + '/39-fabrics-swatch-books.jpg', (0, 80, 1920, 2480), 'cover-fabrics')
