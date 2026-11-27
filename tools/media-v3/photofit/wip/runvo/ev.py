"""оценка и наложение при ФИКСИРОВАННЫХ камерах (калибровка по стопам, cal2-d13) по «чистым» маскам обивки.
python ev.py <out.jpg|-> [params.json ...] [k=v ...] [sel=b1,o3,o2] [size=800] [h=0.008]"""
import sys, os, json, importlib
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
import lab
import photofit as F
import runvo as M

def ious(parts, size=320, names=lab.NAMES, n=200_000):
    P, Nn, Lb, nm = F.sample(parts, n=n); sup = np.array([F.is_support(x) for x in nm]); Pb = P[~sup[Lb]]
    return {k: F.iou(F.solid(F.splat(Pb, lab.CAL[k], size, size / 1280)), F.rs(lab.clean(k), size)) for k in names}

def overlay(parts, outp, sel, size=800, two=False, crop=None):
    P, Nn, Lb, names = F.sample(parts, n=900_000); sup = np.array([F.is_support(n) for n in names]); Pb = P[~sup[Lb]]; k = size / 1280; rows = []; res = {}
    for s in sel:
        cam = lab.CAL[s]; img = lab.photo(s); clean = F.rs(lab.clean(s), size)
        mask, shade, lb_, zb, crease = F.render(P, Nn, Lb, names, cam, size); mb = F.solid(F.splat(Pb, cam, size, k), 2)
        ph = np.asarray(Image.fromarray(img).resize((size, size), Image.LANCZOS)).astype(np.float32); ov = ph.copy()
        om, op = mb & ~clean, clean & ~mb
        ov[om] = ov[om] * 0.45 + np.array([40, 110, 255]) * 0.55; ov[op] = ov[op] * 0.45 + np.array([255, 40, 200]) * 0.55
        lb = np.zeros_like(mask)
        for i, nm in enumerate(names):
            pk = lb_ == i + 1; lb |= (pk ^ ndimage.binary_erosion(pk)) & ndimage.binary_erosion(mask, iterations=2)
        ov[crease | lb] = (255, 230, 0); ov[F.contour(mb)] = (255, 0, 0)
        clay = np.full((size, size, 3), 244.0)
        tint = np.array([[1, 1, 1]] + [(0.25, 0.25, 0.27) if F.is_support(nm) else ((0.80, 0.78, 0.74) if i % 2 == 0 else (0.72, 0.74, 0.80)) for i, nm in enumerate(names)])
        clay[mask] = shade[mask][:, None] * tint[lb_[mask]] * 255; clay[crease | lb] *= 0.72; clay[F.contour(clean)] = (0, 170, 60)
        if crop: x0, y0, x1, y1 = [int(c * k) for c in crop]
        else:
            ys, xs = np.where(clean | mb); x0, x1, y0, y1 = max(xs.min() - 12, 0), min(xs.max() + 12, size), max(ys.min() - 12, 0), min(ys.max() + 70, size)
        tl = [Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).crop((x0, y0, x1, y1)) for a in ((ov, clay) if two else (ph, ov, clay))]
        row = Image.new('RGB', (sum(t.width for t in tl) + 16, tl[0].height), 'white'); x = 0
        for t in tl: row.paste(t, (x, 0)); x += t.width + 8
        rows.append(row); res[s] = round(F.iou(mb, clean), 4)
    Wd = max(r.width for r in rows); sh = Image.new('RGB', (Wd, sum(r.height for r in rows)), 'white'); y = 0
    for r in rows: sh.paste(r, (0, y)); y += r.height
    sh.save(outp, quality=88); return res

if __name__ == '__main__':
    outp = sys.argv[1]; p = {}; sel = ['b1', 'o3', 'o2']; size = 800; h = 0.008; two = False; crop = None
    for a in sys.argv[2:]:
        if a.endswith('.json'): p.update(json.load(open(a)))
        elif a.startswith('sel='): sel = a[4:].split(',')
        elif a.startswith('size='): size = int(a[5:])
        elif a.startswith('h='): h = float(a[2:])
        elif a.startswith('two='): two = bool(int(a[4:]))
        elif a.startswith('crop='): crop = [int(v) for v in a[5:].split(',')]
        elif '=' in a: k, v = a.split('='); p[k] = float(v)
    parts = M.build(p=p, h=h, legs=True)
    v = ious(parts); print('IoU (чистые маски, камеры по стопам):', {k: round(x, 4) for k, x in v.items()}, 'среднее', round(float(np.mean(list(v.values()))), 4), 'мин', round(min(v.values()), 4))
    bb = np.vstack([vv for vv, f in parts.values() ]); print('габариты', np.round((bb.max(0) - bb.min(0)) * 100, 1))
    if outp != '-': print(overlay(parts, outp, sel, size, two, crop))
