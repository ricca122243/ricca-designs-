"""автоподбор параметров формы Runvo: потери = 1 − quick_score по всем фото. Запуск: python opt.py <start.json|-> <cams.json> <out.json> <группа,группа,...> [maxiter]"""
import sys, os, json, time
import numpy as np
from scipy import optimize
sys.path.insert(0, '/home/user/ricca-designs-/tools/media-v3/photofit')
import refs as R, photofit as F, runvo as M
PR = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prior.json')))
for v, d in PR.items(): R.PRIOR[('runvo', v)] = dict(az=tuple(d['az']), el=tuple(d['el']))      # только в памяти: камера справа от фронта (см. шапку runvo.py)

GROUPS = {
    'path': ['pcx', 'pcy', 'Rx', 'Ry', 'aR', 'aL', 'eR', 'eL'],
    'pathn': ['pn', 'T'],
    'seat': ['seat_cx', 'seat_cy', 'seat_a', 'seat_b', 'seat_n'],
    'seatz': ['seat_z0', 'seat_z1', 'seat_rt', 'seat_rb', 'seat_bulge'],
    'shellz': ['shell_z0', 'rt_out', 'rb_out', 'rt_in', 'rb_in'],
    'tt': ['T_R', 'T_L'],
    'L': ['La', 'Lul', 'Lwb', 'Lur', 'Lwe', 'Lrc', 'T'],
}
STEP = dict(La=5, Lul=0.03, Lwb=0.03, Lur=0.03, Lwe=0.04, Lrc=0.05, pcx=0.02, pcy=0.02, Rx=0.02, Ry=0.02, aR=8, aL=8, eR=0.04, eL=0.04, pn=0.3, T=0.02, seat_cx=0.02, seat_cy=0.02, seat_a=0.015, seat_b=0.02,
            seat_n=0.3, seat_z0=0.01, seat_z1=0.01, seat_rt=0.02, seat_rb=0.02, seat_bulge=0.008, shell_z0=0.015, rt_out=0.02, rb_out=0.02, rt_in=0.015, rb_in=0.015, T_R=0.02, T_L=0.02)
LIM = dict(eR=(0, 0.5), eL=(0, 0.5), pn=(1.3, 5), seat_n=(1.8, 5), T=(0.1, 0.3), seat_bulge=(0, 0.06), rt_in=(0.02, 0.12), rb_in=(0.02, 0.12), rt_out=(0.03, 0.2), rb_out=(0.03, 0.2),
           seat_rt=(0.04, 0.17), seat_rb=(0.04, 0.17), T_R=(0.1, 0.32), T_L=(0.1, 0.32), aR=(-60, 80), aL=(100, 240))

def clipd(p):
    for k, (a, b) in LIM.items():
        if k in p: p[k] = float(np.clip(p[k], a, b))
    return p

def main():
    start, camsf, outf, groups = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(',')
    maxiter = int(sys.argv[5]) if len(sys.argv) > 5 else 60
    p = dict(M.P); 
    if start != '-': p.update(json.load(open(start)))
    cams = json.load(open(camsf)); state = dict(best=9.0, cams=cams, n=0, p=dict(p))
    def score(pp, refine=30):
        parts = M.build(p=clipd(dict(pp)), h=0.012, legs=False)
        mean, mn, c = F.quick_score(parts, 'runvo', state['cams'], refine=refine)
        return 1 - (0.7 * mean + 0.3 * mn), mean, mn, c
    l0, mean, mn, c = score(p, 80); state.update(best=l0, cams=c); print(f'старт: среднее {mean:.4f} худшее {mn:.4f}', flush=True)
    for grp in groups:
        keys = GROUPS[grp]; x0 = np.array([p[k] for k in keys]); st = np.array([STEP[k] for k in keys])
        def loss(x):
            pp = dict(p); pp.update({k: float(v) for k, v in zip(keys, x)})
            l, mean, mn, c = score(pp); state['n'] += 1
            if l < state['best']:
                state.update(best=l, cams=c, p=clipd(pp)); print(f"  [{grp} {state['n']}] {l:.4f} среднее {mean:.4f} худшее {mn:.4f} " + ' '.join(f'{k}={v:.3f}' for k, v in zip(keys, x)), flush=True)
            return l
        sim = np.vstack([x0] + [x0 + st * np.eye(len(keys))[i] for i in range(len(keys))])
        t = time.time(); optimize.minimize(loss, x0, method='Nelder-Mead', options=dict(initial_simplex=sim, maxiter=maxiter, xatol=1e-3, fatol=1e-4))
        p = dict(state['p']); print(f'группа {grp}: {state["best"]:.4f} за {time.time() - t:.0f} с', flush=True)
        json.dump({k: p[k] for k in p if k in STEP or k in M.P and isinstance(p[k], float)}, open(outf, 'w'), indent=1); json.dump(state['cams'], open(outf.replace('.json', '-cams.json'), 'w'), indent=1)

if __name__ == '__main__':
    main()
