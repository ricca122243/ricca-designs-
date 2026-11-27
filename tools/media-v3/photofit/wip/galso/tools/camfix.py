"""camfix.py <itdir_src> <itdir_dst> [roll=0] — пересчитать камеры с заданным креном (быстрая подгонка по силуэту), сохранить в dst/cams.json и нарисовать разницу силуэтов"""
import sys, os, json, shutil
sys.path.insert(0, '/home/user/ricca-designs-/tools/media-v3/photofit'); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import photofit as F, refs as R
R.PRIOR[('galso', 'main')] = dict(az=(-64, -8), el=(0, 14))
src, dst = sys.argv[1], sys.argv[2]; roll = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
os.makedirs(dst, exist_ok=True)
for f in ('parts.npz', 'lines.npz', 'params.json'):
    if os.path.exists(os.path.join(src, f)) and src != dst: shutil.copy(os.path.join(src, f), dst)
parts = F.read_parts(dst + '/parts.npz'); c = json.load(open(src + '/cams.json'))
for k in c: c[k]['roll'] = roll
for _ in range(3): m, mn, c = F.quick_score(parts, 'galso', c, refine=120, n=300_000, size=320)
json.dump(c, open(dst + '/cams.json', 'w'), indent=1); print('IoU', round(m, 4), round(mn, 4), {k: {a: round(b, 2) for a, b in v.items()} for k, v in c.items()})
# разница силуэтов крупно
P, Nn, Lb, names = F.sample(parts, n=1_500_000); sup = np.array([F.is_support(n) for n in names]); Pb = P[~sup[Lb]]
for nme in c:
    body = R.obj_mask(R.load(nme), split=True)[0]; mb = F.solid(F.splat(Pb, c[nme], 1280, 1.0), 2)
    ph = R.load(nme).copy(); om = mb & ~body; op = body & ~mb
    ph[om] = ph[om] * 0.3 + np.array([40, 110, 255]) * 0.7; ph[op] = ph[op] * 0.3 + np.array([255, 40, 200]) * 0.7
    ys, xs = np.where(body | mb); Image.fromarray(ph.astype(np.uint8)).crop((xs.min() - 20, ys.min() - 20, xs.max() + 20, ys.max() + 20)).save(os.path.join(dst, f'diff-{nme[-2:]}.jpg'), quality=90)
    print(nme, 'IoU@1280', round(F.iou(mb, body), 4), 'лишнее px', int(om.sum()), 'не хватает px', int(op.sum()))
