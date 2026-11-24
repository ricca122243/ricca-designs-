"""совместный подбор (Нелдер—Мид) при камерах по стопам: python opt3.py <start.json> <out.json> <ключ,ключ,...> [maxiter]"""
import sys, json, time, numpy as np
from scipy import optimize
sys.path.insert(0, '.'); import opt2
STEP = dict(eR=0.03, R1=0.05, A1=6, R2=0.04, A2=8, eL=0.03, T=0.012, ERx=0.01, ERy=0.01, h0=4, seat_cx=0.012, seat_cy=0.02, seat_a=0.01, seat_b=0.015, seat_n=0.2,
            seat_z0=0.008, seat_z1=0.008, seat_rt=0.015, seat_rb=0.015, seat_bulge=0.006, shell_z0=0.01, rt_out=0.015, rb_out=0.015, rt_in=0.01, rb_in=0.01, capL_rt=0.015, T_end=0.01,
            capL_len=0.04, capL_drop=0.03, seat_egg=0.02, seat_rot=4, capL_r=0.01, seat_crown=0.006, cut_gap=0.01)
start, outf, keys = sys.argv[1], sys.argv[2], sys.argv[3].split(','); maxiter = int(sys.argv[4]) if len(sys.argv) > 4 else 600
p = dict(opt2.M.P); p.update(json.load(open(start)))
def clip(pp):
    for k in keys:
        if k in opt2.BND: pp[k] = float(np.clip(pp[k], *opt2.BND[k]))
    return pp
st = dict(best=9, n=0, t=time.time())
def L(x):
    pp = clip(dict(p, **{k: float(v) for k, v in zip(keys, x)})); v = opt2.ious(pp); vals = np.array(list(v.values()))
    l = 1 - vals.mean() + 0.25 * (1 - vals.min()); st['n'] += 1
    if l < st['best']:
        st['best'] = l; st['p'] = pp; st['v'] = v
        if st['n'] % 20 == 1 or time.time() - st['t'] > 20:
            st['t'] = time.time(); print(f"[{st['n']}] ср {vals.mean():.4f} мин {vals.min():.4f} " + ' '.join(f'{k}={pp[k]:.3f}' for k in keys), flush=True)
            json.dump({k: v for k, v in pp.items() if isinstance(v, (float, int))}, open(outf, 'w'), indent=1)
    return l
x0 = np.array([p[k] for k in keys], float); s = np.array([STEP[k] for k in keys])
sim = np.vstack([x0] + [x0 + s * np.eye(len(keys))[i] for i in range(len(keys))])
optimize.minimize(L, x0, method='Nelder-Mead', options=dict(initial_simplex=sim, maxiter=maxiter, xatol=1e-4, fatol=1e-5, adaptive=True))
pp = st['p']; json.dump({k: v for k, v in pp.items() if isinstance(v, (float, int))}, open(outf, 'w'), indent=1)
print('итог', st['n'], 'ср', round(float(np.mean(list(st['v'].values()))), 4), {k[-2:]: round(v, 3) for k, v in st['v'].items()}, ' '.join(f'{k}={pp[k]:.3f}' for k in keys), flush=True)
