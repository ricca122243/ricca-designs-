"""калибровка камер по стопам ножек (точки на полу, одни и те же на всех фото)"""
import sys, json, math, numpy as np
from scipy import optimize
sys.path.insert(0, '/home/user/ricca-designs-/tools/media-v3/photofit')
import photofit as F
OBS = {
 'o2': dict(FL=(333, 1143), FR=(876, 1141), BL=(299, 1121), BR=(914, 1121)),
 'b1': dict(FL=(274, 1140), FR=(592, 1154), BL=(559, 1127), BR=(938, 1143)),
 'o':  dict(FL=(308, 1112), FR=(608, 1125), BL=(576, 1099), BR=(934, 1114)),
 'o3': dict(FL=(197, 984), FR=(564, 1151), BR=(961, 1005)),
 'b2': dict(FL=(317, 968), FR=(628, 1111), BR=(964, 986)),
 'o4': dict(FL=(299, 976), FR=(611, 1093), BR=(947, 995)),
}
names = list(OBS)
def unpack(x, dist):
    xf, yf, xb, yb = x[:4]; feet = dict(FL=(-xf, yf, 0), FR=(xf, yf, 0), BL=(-xb, yb, 0), BR=(xb, yb, 0)); cams = {}
    for i, n in enumerate(names):
        az, el, sc, u0, v0 = x[4 + 5 * i: 9 + 5 * i]
        cams[n] = dict(az=az, el=el, roll=0.0, dist=dist, scale=sc * 100, u0=u0 * 100, v0=v0 * 100)
    return feet, cams
def resid(x, dist, s_o2):
    feet, cams = unpack(x, dist); r = []
    for n in names:
        for k, (u, v) in OBS[n].items():
            pu, pv, _ = F.project(np.array([feet[k]], float), cams[n]); r += [pu[0] - u, pv[0] - v]
    r.append((cams['o2']['scale'] - s_o2) * 2)            # масштаб фронтального фото — по высоте 74 см
    r.append((x[1] + x[3]) * 2000)                       # центр ножек — в начале координат
    for n, top in (('o2', 450), ('b1', 552), ('o', 560)):      # низкие ракурсы: верх спинки (z=0.74) и стопы (z=0) задают масштаб
        c = cams[n]; pu, pv, _ = F.project(np.array([[0, 0.25, 0.74]], float), c); r.append((pv[0] - top) * 0.5)
    return np.array(r)
for dist in (12.0,):
    for s_o2 in (927.0,):
        x0 = [0.28, -0.25, 0.33, 0.25]
        for n in names:
            az, el = (0, 5) if n == 'o2' else ((-45, 6) if n in ('b1', 'o') else (-45, 33))
            x0 += [az, el, 9.0, 6.2, 8.0]
        res = optimize.least_squares(resid, x0, args=(dist, s_o2), x_scale=[0.05] * 4 + [5, 3, 0.5, 0.5, 0.5] * 6)
        feet, cams = unpack(res.x, dist); rr = resid(res.x, dist, s_o2)[:42]
        print(f'dist {dist}: стопы xf {res.x[0]:.3f} yf {res.x[1]:.3f} xb {res.x[2]:.3f} yb {res.x[3]:.3f}; невязка rms {np.sqrt((rr ** 2).mean()):.1f} px, макс {np.abs(rr).max():.1f}')
        for n in names: c = cams[n]; print(f"   {n}: az {c['az']:.1f} el {c['el']:.1f} scale {c['scale']:.0f} u0 {c['u0']:.0f} v0 {c['v0']:.0f}")
        json.dump(dict(feet={k: list(v) for k, v in feet.items()}, cams={'p-armchair-07-' + n: c for n, c in cams.items()}), open(f'calib-d{int(dist)}.json', 'w'), indent=1)
