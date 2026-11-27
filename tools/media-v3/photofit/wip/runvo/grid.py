"""вырезка фото с сеткой в координатах исходного кадра: python grid.py <фото> x0 y0 x1 y1 scale step out.jpg [contrast]"""
import sys
from PIL import Image, ImageDraw, ImageEnhance
n, x0, y0, x1, y1, sc, step, out = sys.argv[1], *map(int, sys.argv[2:6]), float(sys.argv[6]), int(sys.argv[7]), sys.argv[8]
im = Image.open(f'/home/user/ricca-designs-/ricca/img/catalog/p-armchair-07-{n}.webp').convert('RGB').crop((x0, y0, x1, y1))
im = im.resize((int(im.width * sc), int(im.height * sc)), Image.LANCZOS)
if len(sys.argv) > 9: im = ImageEnhance.Contrast(im).enhance(float(sys.argv[9]))
d = ImageDraw.Draw(im, 'RGBA')
for x in range((x0 // step + 1) * step, x1, step):
    X = (x - x0) * sc; d.line([(X, 0), (X, im.height)], fill=(0, 255, 255, 110 if x % (step * 5) else 230), width=1); d.text((X + 2, 2), str(x), fill=(0, 0, 255, 255))
for y in range((y0 // step + 1) * step, y1, step):
    Y = (y - y0) * sc; d.line([(0, Y), (im.width, Y)], fill=(0, 255, 255, 110 if y % (step * 5) else 230), width=1); d.text((2, Y + 2), str(y), fill=(0, 0, 255, 255))
im.save(out, quality=92); print(out, im.size)
