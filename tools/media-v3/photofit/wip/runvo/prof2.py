"""профили силуэта по строкам и столбцам кадра: модель − фото, см. python prof2.py [k=v ...] [views=o3,b2,o4]"""
import sys, json, numpy as np, lab
import photofit as F, runvo as M
def table(parts, names):
    P, Nn, Lb, nm = F.sample(parts, n=900_000); sup = np.array([F.is_support(x) for x in nm]); Pb = P[~sup[Lb]]
    for n in names:
        c = lab.CAL[n]; mm = F.solid(F.splat(Pb, c, 1280, 1.0), 2); m = lab.clean(n); cm = c['scale'] / 100
        ys = np.where(m.any(1))[0]; xs = np.where(m.any(0))[0]
        print(n, 'строки (v: лев, прав — модель минус фото, см; плюс = вправо)')
        print('   ' + '  '.join(f"{v}:{(np.where(mm[v])[0].min() - np.where(m[v])[0].min()) / cm:+.1f},{(np.where(mm[v])[0].max() - np.where(m[v])[0].max()) / cm:+.1f}" for v in range(ys.min() + 15, ys.max() - 10, 45) if mm[v].any()))
        print('  столбцы (u: верх, низ — модель минус фото, см; плюс = вниз)')
        print('   ' + '  '.join(f"{u}:{(np.where(mm[:, u])[0].min() - np.where(m[:, u])[0].min()) / cm:+.1f},{(np.where(mm[:, u])[0].max() - np.where(m[:, u])[0].max()) / cm:+.1f}" for u in range(xs.min() + 15, xs.max() - 10, 55) if mm[:, u].any()))
if __name__ == '__main__':
    p = {}; views = ['o3', 'b2', 'o4']
    for a in sys.argv[1:]:
        if a.endswith('.json'): p.update(json.load(open(a)))
        elif a.startswith('views='): views = a[6:].split(',')
        elif '=' in a: k, v = a.split('='); p[k] = float(v)
    table(M.build(p=p, h=0.008, legs=False), views)
