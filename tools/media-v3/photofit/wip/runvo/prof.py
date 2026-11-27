"""профили силуэта: модель против фото по высотам (низкие ракурсы) — python prof.py [k=v ...]"""
import sys, json, numpy as np, lab
import photofit as F, runvo as M
def table(parts, names=('o2', 'b1'), zs=(0.72, 0.70, 0.66, 0.60, 0.54, 0.50, 0.46, 0.44, 0.40, 0.36, 0.30, 0.24, 0.20, 0.16, 0.14)):
    P, Nn, Lb, nm = F.sample(parts, n=900_000); sup = np.array([F.is_support(x) for x in nm]); Pb = P[~sup[Lb]]
    for n in names:
        c = lab.CAL[n]; mm = F.solid(F.splat(Pb, c, 1280, 1.0), 2); m = lab.clean(n); print(n, '  z_img: фото [лев, прав] | модель [лев, прав] | разница, см')
        for z in zs:
            v = int(round(c['v0'] - c['scale'] * (z - 0.37))); a = np.where(m[v])[0]; b = np.where(mm[v])[0]
            if len(a) and len(b):
                f = lambda x: (x - c['u0']) / c['scale']
                print(f'   {z:.2f}: {f(a.min()):+.3f} {f(a.max()):+.3f} | {f(b.min()):+.3f} {f(b.max()):+.3f} | {100 * (f(b.min()) - f(a.min())):+.1f} {100 * (f(b.max()) - f(a.max())):+.1f}')
        ya = np.where(m.any(1))[0]; yb = np.where(mm.any(1))[0]; g = lambda y: 0.37 + (c['v0'] - y) / c['scale']
        print(f'   верх: фото {g(ya.min()):.3f} модель {g(yb.min()):.3f}; низ: фото {g(ya.max()):.3f} модель {g(yb.max()):.3f}')
if __name__ == '__main__':
    p = {}
    for a in sys.argv[1:]:
        if a.endswith('.json'): p.update(json.load(open(a)))
        elif '=' in a: k, v = a.split('='); p[k] = float(v)
    table(M.build(p=p, h=0.008, legs=False))
