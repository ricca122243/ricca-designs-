"""быстрая проба набора параметров: python try.py <cams.json> k=v k=v ...  → quick_score по фото (камеры уточняются)"""
import sys, os, json
sys.path.insert(0, '/home/user/ricca-designs-/tools/media-v3/photofit')
import numpy as np, refs as R, photofit as F, runvo as M
PR = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prior.json')))
for v, d in PR.items(): R.PRIOR[('runvo', v)] = dict(az=tuple(d['az']), el=tuple(d['el']))
cams = json.load(open(sys.argv[1])); over = {}
for a in sys.argv[2:]:
    if a.endswith('.json'): over.update(json.load(open(a)))
    else:
        k, v = a.split('='); over[k] = float(v)
parts = M.build(p=over, h=0.01, legs=False)
c = cams
for it in range(2): mean, mn, c = F.quick_score(parts, 'runvo', c, refine=120)
names = [n for v in R.REFS['runvo'].values() for n in v]
P, Nn, Lb, nm = F.sample(parts, n=160000); 
print(f'среднее {mean:.4f} худшее {mn:.4f}', ' '.join(f"{n[-2:]}:az{c[n]['az']:.0f}/el{c[n]['el']:.0f}" for n in names))
bb = np.vstack([v for v, f in parts.values()]); print('габариты', np.round((bb.max(0) - bb.min(0)) * 100, 1))
