"""Автоподбор параметров формы: потери = (1 − IoU обивки) + расхождение внутренних линий с фото.
python opt.py <params_in.json|-> <cams.json> <out_prefix> <group[,group…]> [maxiter] [--wide]"""
import sys, os, json, math, time
sys.path.insert(0, '/home/user/ricca-designs-/tools/media-v3/photofit'); sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy import optimize
import photofit as F, refs as R, galso as G, chk as C

GROUPS = {
 'plan':  dict(D=0.02, plan_nf=0.4, plan_nb=0.4, W=0.01),
 'prof':  dict(taper=0.01, taper_p=0.3, zw=0.04, top_in=0.004, rb=0.01),
 'top':   dict(top_drop=0.012, drop_y1=0.06, drop_y0=0.06, Rc=0.012, H=0.008),
 'ear':   dict(y_tip=0.02, t_tip=0.006, t_top=0.005, bowl_g=0.25, bev_lo=10.0, bev_hi=10.0, w_lean=0.012),
 'seam':  dict(y_seam=0.03, zn_seam=0.015, zn_front=0.015),
 'cav':   dict(Yb=0.04, cav_p=0.3, cav_q=0.2, seat_top=0.01, seat_crown=0.008),
 'seat':  dict(seat_top=0.01, seat_rt=0.012, seat_crown=0.008, crown_w=0.05, rt_hug=0.008),
}
LIM = dict(bev_lo=(0, 80), bev_hi=(20, 86), rt_hug=(0.012, 0.08), plan_nf=(2.0, 8), plan_nb=(2.0, 8), taper_p=(1.0, 5), r_rim=(0.012, 0.06), t_tip=(0.01, 0.12), t_top=(0.004, 0.08), bowl_g=(0.5, 4), cav_p=(1.2, 5), cav_q=(0.8, 4),
           seat_crown=(0.0, 0.05), crown_w=(0.08, 0.4), seat_rt=(0.02, 0.12), top_in=(0.0, 0.04), rb=(0.02, 0.1), top_drop=(0.0, 0.12), Rc=(0.02, 0.12), drop_y0=(-0.19, 0.2), drop_y1=(0.0, 0.5), zw=(0.4, 0.68))
WL = 0.6     # вес линий: 1 см среднего расхождения = 0.6 % IoU

def line_err(L, cams):
    tot = []; det = {}
    for nme, pl in C.PHOTO.items():
        cam = cams[nme]; cm = cam['scale'] / 100.0
        for k, pts in pl.items():
            e = float(C.line_dist(pts, C.AGAINST[k], L, cam).mean()); tot.append(e); det[nme[-2:] + k] = round(e, 2)
    return float(np.mean(tot)), det

def evaluate(p, cams, refine=50):
    parts, L = G.build(True, p)
    mean, mn, cams2 = F.quick_score(parts, 'galso', cams, refine=refine)
    le, det = line_err(L, cams2)
    return (1 - mean) * 100 + WL * le, mean, mn, le, det, cams2

if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    p = dict(G.P)
    if a[0] != '-': p.update(json.load(open(a[0])))
    cams = json.load(open(a[1])); pref = a[2]; groups = a[3].split(','); maxiter = int(a[4]) if len(a) > 4 else 60
    if '--wide' in sys.argv: R.PRIOR[('galso', 'main')] = dict(az=(-64, -8), el=(0, 14))
    names = []; steps = []
    for gname in groups:
        for k, s in GROUPS[gname].items():
            if k not in names: names.append(k); steps.append(s)
    x0 = np.array([p[k] for k in names]); steps = np.array(steps); state = dict(cams=cams, best=1e9, n=0, t=time.time())
    def f(x):
        q = dict(p)
        for k, v in zip(names, x):
            lo, hi = LIM.get(k, (-1e9, 1e9)); q[k] = float(np.clip(v, lo, hi))
        try: loss, mean, mn, le, det, c2 = evaluate(q, state['cams'])
        except Exception as e:
            print('ошибка сборки:', repr(e)[:120]); return 99.0
        state['n'] += 1
        if loss < state['best']:
            state['best'] = loss; state['cams'] = c2
            json.dump(q, open(pref + '.params.json', 'w'), indent=1); json.dump(c2, open(pref + '.cams.json', 'w'), indent=1)
            print(f"{state['n']:3d} {time.time() - state['t']:5.0f}s loss {loss:.3f} IoU {mean:.4f}/{mn:.4f} линии {le:.2f} см az {c2['p-armchair-20']['az']:.1f} el {c2['p-armchair-20']['el']:.1f} | " + ' '.join(f"{k}={q[k]:.4f}" for k in names), flush=True)
        return loss
    l0 = f(x0); print('старт', l0, evaluate(p, state['cams'])[4])
    sim = np.vstack([x0] + [x0 + steps * np.eye(len(x0))[i] for i in range(len(x0))])
    res = optimize.minimize(f, x0, method='Nelder-Mead', options=dict(initial_simplex=sim, maxiter=maxiter, xatol=1e-4, fatol=1e-3))
    q = json.load(open(pref + '.params.json')); print('итог', state['best'], evaluate(q, state['cams'])[1:5])
