"""подбор формы при камерах, откалиброванных по стопам ножек (calib-d12.json), по «чистым» маскам обивки (без ножек и тени).
python opt2.py <start.json|-> <out.json> <группа,группа,...> [sweeps]"""
import sys, os, json, time
import numpy as np
from scipy import optimize
sys.path.insert(0, '/home/user/ricca-designs-/tools/media-v3/photofit')
import refs as R, photofit as F, runvo as M
HERE = os.path.dirname(os.path.abspath(__file__))
CAL = json.load(open(os.path.join(HERE, 'calib-d12.json')))['cams']
SIZE = 320
NAMES = [n for v in R.REFS['runvo'].values() for n in v]
MASK = {n: F.rs(np.load(os.path.join(HERE, 'view', 'clean-' + n.replace('p-armchair-07-', '') + '.npy')), SIZE) for n in NAMES}
GROUPS = {
    'path': ['pcx', 'pcy', 'Rx', 'Ry', 'aR', 'aL', 'eR', 'eL'],
    'pathn': ['pn', 'T', 'T_end'],
    'arc': ['R1', 'A1', 'R2', 'A2', 'eL', 'T'],
    'end': ['ERx', 'ERy', 'h0'],
    'seat': ['seat_cx', 'seat_cy', 'seat_a', 'seat_b', 'seat_n'],
    'seatz': ['seat_z0', 'seat_z1', 'seat_rt', 'seat_rb', 'seat_bulge'],
    'shellz': ['shell_z0', 'rt_out', 'rb_out', 'rt_in', 'rb_in', 'capL_rt'],
}
BND = dict(capL_len=(0.05, 0.45), capL_drop=(0.0, 0.3), cut_gap=(0.0, 0.04), seat_crown=(0, 0.04), ERx=(0.39, 0.46), ERy=(0.17, 0.27), h0=(125, 146), R1=(0.3, 1.5), A1=(10, 120), R2=(0.1, 0.8), A2=(0, 120), pcx=(-0.15, 0.15), pcy=(-0.5, 0.4), Rx=(0.25, 0.9), Ry=(0.2, 0.9), aR=(-40, 85), aL=(95, 220), eR=(0, 0.5), eL=(0, 0.5), pn=(1.4, 4), T=(0.12, 0.28), T_end=(0, 0.1),
           seat_cx=(-0.06, 0.06), seat_cy=(-0.15, 0.15), seat_a=(0.38, 0.5), seat_b=(0.3, 0.55), seat_n=(1.9, 5), seat_z0=(0.09, 0.2), seat_z1=(0.42, 0.52),
           seat_rt=(0.04, 0.17), seat_rb=(0.04, 0.17), seat_bulge=(0, 0.06), shell_z0=(0.15, 0.35), rt_out=(0.03, 0.2), rb_out=(0.03, 0.2), rt_in=(0.02, 0.12), rb_in=(0.02, 0.12), capL_rt=(0.05, 0.14))
BND.update(eR=(0.0, 0.45), R1=(0.25, 0.9), A1=(40, 170), h0=(118, 150), ERx=(0.38, 0.47), ERy=(0.15, 0.3), seat_b=(0.3, 0.5), seat_a=(0.38, 0.47))

def ious(p, h=0.012, cams=None):
    parts = M.build(p=p, h=h, legs=False); P, Nn, Lb, names = F.sample(parts, n=140_000)
    out = {}
    for n in NAMES: out[n] = F.iou(F.solid(F.splat(P, (cams or CAL)[n], SIZE, SIZE / 1280)), MASK[n])
    return out

def main():
    start, outf, groups = sys.argv[1], sys.argv[2], sys.argv[3].split(','); sweeps = int(sys.argv[4]) if len(sys.argv) > 4 else 2
    p = dict(M.P)
    if start != '-': p.update(json.load(open(start)))
    def L(pp):
        v = ious(pp); return 1 - np.mean(list(v.values()))
    best = L(p); print('старт', round(1 - best, 4), {k[-2:]: round(v, 3) for k, v in ious(p).items()}, flush=True)
    for sw in range(sweeps):
        for grp in groups:
            keys = GROUPS[grp]; t = time.time()
            for k in keys:                                   # покоординатно: золотое сечение в окне вокруг текущего значения
                lo, hi = BND[k]; span = (hi - lo) * (0.25 if sw == 0 else 0.1)
                a, b = max(lo, p[k] - span), min(hi, p[k] + span)
                f = lambda x: L(dict(p, **{k: float(x)}))
                res = optimize.minimize_scalar(f, bounds=(a, b), method='bounded', options=dict(xatol=(hi - lo) * 0.004, maxiter=14))
                if res.fun < best - 1e-5: best = res.fun; p[k] = float(res.x)
            print(f'  круг {sw} {grp}: {1 - best:.4f} за {time.time() - t:.0f} с  ' + ' '.join(f'{k}={p[k]:.3f}' for k in keys), flush=True)
            json.dump({k: v for k, v in p.items() if isinstance(v, (float, int))}, open(outf, 'w'), indent=1)
    print('итог', round(1 - best, 4), {k[-2:]: round(v, 3) for k, v in ious(p).items()}, flush=True)

if __name__ == '__main__':
    main()
