import sys, os, json
sys.path.insert(0, '/home/user/ricca-designs-/tools/media-v3/photofit'); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import photofit as F, refs as R, opt as O
R.PRIOR[('galso', 'main')] = dict(az=(-64, -8), el=(0, 14))
it = sys.argv[1]
parts = F.read_parts(it + '/parts.npz'); L = dict(np.load(it + '/lines.npz')); cams = json.load(open(it + '/cams.json'))
for roll in (None, 0.0, 0.7):
    for dist in (None, 6.0, 12.0):
        c = json.loads(json.dumps(cams))
        if roll is not None: c['p-armchair-20']['roll'] = roll
        if dist is not None:
            for k in c: c[k]['dist'] = dist
        m = mn = None
        for _ in range(3): m, mn, c = F.quick_score(parts, 'galso', c, refine=120, n=300_000, size=320)
        le, det = O.line_err(L, c)
        a = c['p-armchair-20']; b = c['p-armchair-20-d1']
        print(f"roll {roll} dist0 {dist}: IoU {m:.4f}/{mn:.4f} линии {le:.2f}  main az {a['az']:.1f} el {a['el']:.2f} dist {a['dist']:.1f} | front az {b['az']:.1f} el {b['el']:.2f} dist {b['dist']:.1f} |", det)
