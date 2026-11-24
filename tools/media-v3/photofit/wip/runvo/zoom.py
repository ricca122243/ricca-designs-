"""крупное наложение куска кадра: python zoom.py <out.jpg> <фото> x0,y0,x1,y1 [params.json] [k=v] [h=0.006] [mag=2.5]
слева фото с сеткой, справа то же фото с линиями модели (жёлтые — внутренние линии и границы деталей, красная — силуэт)"""
import sys, json, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import lab
import photofit as F, runvo as M
outp, n, crop = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')]; p = {}; h = 0.006; mag = 2.5
for a in sys.argv[4:]:
    if a.endswith('.json'): p.update(json.load(open(a)))
    elif a.startswith('h='): h = float(a[2:])
    elif a.startswith('mag='): mag = float(a[4:])
    elif '=' in a: k, v = a.split('='); p[k] = float(v)
parts = M.build(p=p, h=h, legs=True)
P, Nn, Lb, names = F.sample(parts, n=4_000_000); sup = np.array([F.is_support(x) for x in names]); size = 1280
cam = lab.CAL[n]; mask, shade, lb_, zb, crease = F.render(P, Nn, Lb, names, cam, size); mb = F.solid(F.splat(P[~sup[Lb]], cam, size, 1.0), 2)
lb = np.zeros_like(mask)
for i, nm in enumerate(names):
    pk = lb_ == i + 1; lb |= (pk ^ ndimage.binary_erosion(pk)) & ndimage.binary_erosion(mask, iterations=2)
x0, y0, x1, y1 = crop
ph = lab.photo(n).astype(np.float32); ov = ph.copy(); ov[crease | lb] = (255, 235, 0); ov[F.contour(mb)] = (255, 0, 0)
clay = np.full((size, size, 3), 244.0); tint = np.array([[1, 1, 1]] + [(0.25, 0.25, 0.27) if F.is_support(nm) else ((0.80, 0.78, 0.74) if i % 2 == 0 else (0.72, 0.74, 0.80)) for i, nm in enumerate(names)])
clay[mask] = shade[mask][:, None] * tint[lb_[mask]] * 255; clay[F.contour(lab.clean(n))] = (0, 170, 60)
tiles = []
for a in (ph, ov, clay):
    t = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).crop((x0, y0, x1, y1)); t = t.resize((int(t.width * mag), int(t.height * mag)), Image.LANCZOS); d = ImageDraw.Draw(t, 'RGBA')
    step = 20 if (x1 - x0) < 500 else 50
    for x in range((x0 // step + 1) * step, x1, step):
        X = (x - x0) * mag; d.line([(X, 0), (X, t.height)], fill=(0, 255, 255, 70)); d.text((X + 2, 2), str(x), fill=(0, 0, 255, 255))
    for y in range((y0 // step + 1) * step, y1, step):
        Y = (y - y0) * mag; d.line([(0, Y), (t.width, Y)], fill=(0, 255, 255, 70)); d.text((2, Y + 2), str(y), fill=(0, 0, 255, 255))
    tiles.append(t)
sh = Image.new('RGB', (sum(t.width for t in tiles) + 16, tiles[0].height), 'white'); x = 0
for t in tiles: sh.paste(t, (x, 0)); x += t.width + 8
sh.save(outp, quality=90); print(outp, sh.size)
