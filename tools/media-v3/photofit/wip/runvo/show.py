"""наложение при ФИКСИРОВАННЫХ камерах (калибровка по стопам): python show.py <params.json|-> <out.jpg> [фото,...] [k=v ...]"""
import sys, os, json
import numpy as np
from PIL import Image
from scipy import ndimage
sys.path.insert(0, '/home/user/ricca-designs-/tools/media-v3/photofit')
import refs as R, photofit as F, runvo as M
HERE = os.path.dirname(os.path.abspath(__file__))
def main():
    pj, outp = sys.argv[1], sys.argv[2]; sel = sys.argv[3].split(',') if len(sys.argv) > 3 and '=' not in sys.argv[3] else ['b1', 'o3', 'o4', 'o2']
    p = {} if pj == '-' else json.load(open(pj))
    camf = 'calib-d12.json'
    for a in sys.argv[3:]:
        if a.startswith('cams='): camf = a[5:]
        elif '=' in a: k, v = a.split('='); p[k] = float(v)
    CAL = json.load(open(os.path.join(HERE, camf))); CAL = CAL.get('cams', CAL)
    parts = M.build(p=p, h=0.008, legs=True); P, Nn, Lb, names = F.sample(parts, n=700_000)
    sup = np.array([F.is_support(n) for n in names]); Pb = P[~sup[Lb]]; size = int(p.pop('size', 800)); k = size / 1280; rows = []; two = p.pop('two', 0)
    for s in sel:
        n = 'p-armchair-07-' + s; cam = CAL[n]; img = R.load(n)
        clean = F.rs(np.load(os.path.join(HERE, 'view', f'clean-{s}.npy')), size)
        mask, shade, lab, zb, crease = F.render(P, Nn, Lb, names, cam, size); mb = F.solid(F.splat(Pb, cam, size, k), 2)
        ph = np.asarray(Image.fromarray(img.astype(np.uint8)).resize((size, size), Image.LANCZOS)).astype(np.float32); ov = ph.copy()
        om, op = mb & ~clean, clean & ~mb
        ov[om] = ov[om] * 0.45 + np.array([40, 110, 255]) * 0.55; ov[op] = ov[op] * 0.45 + np.array([255, 40, 200]) * 0.55
        lb = np.zeros_like(mask)
        for i, nm in enumerate(names):
            pk = lab == i + 1; lb |= (pk ^ ndimage.binary_erosion(pk)) & ndimage.binary_erosion(mask, iterations=2)
        ov[crease | lb] = (255, 230, 0); ov[ndimage.binary_dilation(F.contour(mb))] = (255, 0, 0)
        clay = np.full((size, size, 3), 244.0)
        tint = np.array([[1, 1, 1]] + [(0.25, 0.25, 0.27) if F.is_support(nm) else ((0.80, 0.78, 0.74) if i % 2 == 0 else (0.72, 0.74, 0.80)) for i, nm in enumerate(names)])
        clay[mask] = shade[mask][:, None] * tint[lab[mask]] * 255; clay[crease | lb] *= 0.72; clay[ndimage.binary_dilation(F.contour(clean))] = (0, 170, 60)
        ys, xs = np.where(clean | mb); x0, x1, y0, y1 = max(xs.min() - 12, 0), min(xs.max() + 12, size), max(ys.min() - 12, 0), min(ys.max() + 70, size)
        tl = [Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).crop((x0, y0, x1, y1)) for a in ((ov, clay) if two else (ph, ov, clay))]
        row = Image.new('RGB', (sum(t.width for t in tl) + 16, tl[0].height), 'white'); x = 0
        for t in tl: row.paste(t, (x, 0)); x += t.width + 8
        rows.append(row); print(s, 'IoU', round(F.iou(mb, clean), 4))
    Wd = max(r.width for r in rows); sh = Image.new('RGB', (Wd, sum(r.height for r in rows)), 'white'); y = 0
    for r in rows: sh.paste(r, (0, y)); y += r.height
    sh.save(outp, quality=88)
main()
