"""Galso (armchair-20) — низкое кресло-«кадка». Форма снята с двух фото каталога наложением (photofit.py).
(шапка обновляется по итогам сверки — см. конец работы)
Запуск: python galso.py <outdir> [--fast] [--glb] [--params p.json]
        → parts.npz, lines.npz (и galso.glb), затем photofit.py galso <outdir>/parts.npz <outdir>"""
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy import ndimage
import softsdf as S

P = dict(
    # корпус-«барабан»
    W=0.965, D=0.88, H=0.72, z0=0.013,
    plan_nf=3.4, plan_nb=3.4,   # показатель суперэллипса плана спереди и сзади (2 — эллипс, больше — квадратнее)
    zw=0.58, taper=0.080, taper_p=2.2, top_in=0.006,     # самое широкое место по высоте; сужение к полу; сужение к гребню
    rb=0.05,
    # сиденье
    seat_top=0.43, seat_rt=0.06, seat_crown=0.02, crown_w=0.25, seat_bulge=0.0,
    rt_hug=0.028, hug_len=0.10,                          # у ушек плечо сиденья круче: сиденье «обнимает» ушко
    # стенка-«чаша»: спинка и два ушка одной деталью
    y_tip=-0.142,          # Y внутренней кромки торца ушка на уровне сиденья
    t_tip=0.033, t_top=0.014,                            # толщина ушка у торца (по X) на уровне сиденья и толщина гребня
    bev_lo=25.0, bev_hi=72.0,                            # торец ушка — скошенная лента: угол к фронту внизу и вверху, град
    w_lean=0.016,          # наружный кант торца уходит назад кверху
    r_rim=0.012,           # скругление наружной кромки обода
    r_in=0.006,            # внутренняя кромка обода
    Rc=0.05,               # радиус верхнего переднего угла ушка
    top_drop=0.03, drop_y1=0.30, drop_y0=-0.10,          # гребень ниже к ушкам: на сколько и между какими Y
    Yb=0.24, cav_p=2.0, cav_q=1.0,                       # ниша на уровне сиденья: задняя точка и форма дуги
    bowl_g=1.15,           # профиль «чаши» по высоте
    k_fold=0.004,
    # швы
    y_seam=0.028, zn_seam=0.372, zn_front=0.405,
    piping=0.0045, groove=0.006,
    plinth_in=0.03,
)


def lean_fn(p):
    def lean(z):
        if z < p['zw']: return p['taper'] * ((p['zw'] - z) / p['zw']) ** p['taper_p']
        return p['top_in'] * ((z - p['zw']) / (p['H'] - p['zw'])) ** 2
    return lean


def htop(p, Y):
    t = np.clip((p['drop_y1'] - Y) / (p['drop_y1'] - p['drop_y0']), 0, 1)
    return p['H'] - p['top_drop'] * t * t * (3 - 2 * t)


def rint(a, b, r):
    """пересечение полей со скруглённым ребром радиуса r"""
    return np.minimum(np.maximum(a, b), 0) + np.hypot(np.maximum(a + r, 0), np.maximum(b + r, 0)) - r


def plan_poly(p, k=480):
    t = np.linspace(0, 2 * math.pi, k, endpoint=False); c, s_ = np.cos(t), np.sin(t)
    n = np.where(s_ < 0, p['plan_nf'], p['plan_nb'])
    return list(zip(p['W'] / 2 * np.sign(c) * np.abs(c) ** (2 / n), p['D'] / 2 * np.sign(s_) * np.abs(s_) ** (2 / n)))


def cavity_plan(p, g, xt):
    """ниша на уровне сиденья: дуга от кромки одного ушка через заднюю точку Yb к другому, спереди открыта"""
    X = np.linspace(-xt, xt, 241); yt = p['y_tip']
    Y = yt + (p['Yb'] - yt) * (1 - np.abs(X / xt) ** p['cav_p']) ** (1 / p['cav_q'])
    poly = list(zip(X, Y)) + [(xt + 0.03, -0.75), (-xt - 0.03, -0.75)]
    return g.plan([poly])


def bin_line(Q, key, n):
    """облако точек вдоль линии → ломаная: среднее по корзинам параметра key"""
    e = np.linspace(key.min(), key.max() + 1e-9, n + 1); k = np.clip(np.digitize(key, e) - 1, 0, n - 1)
    return np.array([Q[k == i].mean(0) for i in range(n) if (k == i).any()])


def smooth_line(L, it=2):
    L = L.copy()
    for _ in range(it): L[1:-1] = (L[:-2] + 2 * L[1:-1] + L[2:]) / 4
    return L


class Model:
    def __init__(self, p, fast=False, h=None):
        self.p = p; self.g = g = S.Grid(h=h or (0.008 if fast else 0.004))
        self.outer = g.plan([plan_poly(p)])
        self.lean = lean_fn(p)
        self.yw0 = p['y_tip'] + math.tan(math.radians(p['bev_lo'])) * p['t_tip']     # наружный кант торца на уровне сиденья

    def xo(self, Y, z):
        """X наружной поверхности (правая сторона) на данных Y, z"""
        g = self.g; Y = np.atleast_1d(np.asarray(Y, float)); z = np.atleast_1d(np.asarray(z, float)) + np.zeros_like(Y)
        out = np.empty(len(Y)); pos = g.xs >= 0
        for i, (y, zz) in enumerate(zip(Y, z)):
            fy = (y - g.ys[0]) / g.h; j = int(np.clip(math.floor(fy), 0, len(g.ys) - 2)); t = fy - j
            row = (self.outer[pos, j] * (1 - t) + self.outer[pos, j + 1] * t) + self.lean(zz)
            out[i] = np.interp(0.0, row, g.xs[pos])
        return out

    def bevel(self, z):
        """скошенный торец ушка на высоте z: угол (рад) и Y наружного канта"""
        p = self.p; t = float(np.clip((z - p['seat_top']) / (p['H'] - p['Rc'] - p['seat_top']), -0.3, 1.0))
        return math.radians(p['bev_lo'] + (p['bev_hi'] - p['bev_lo']) * max(t, 0.0)), self.yw0 + p['w_lean'] * t

    def build(self, grooves=True):
        p = self.p; g = self.g; lean = self.lean; z0 = p['z0']
        # сиденье: плечо мягкое спереди и круче у ушек
        t = np.clip((p['y_tip'] - g.Y) / p['hug_len'], 0, 1); rt = p['rt_hug'] + (p['seat_rt'] - p['rt_hug']) * t * t * (3 - 2 * t)
        seat = g.extrude(self.outer, z0, p['seat_top'], rt, p['rb'], bulge=p['seat_bulge'], crown=p['seat_crown'], crown_w=p['crown_w'], lean=lean)
        # стенка-«чаша»
        xt = float(self.xo(p['y_tip'], p['seat_top'])[0]) - p['t_tip']
        cav_s = cavity_plan(p, g, xt); cav_t = self.outer + lean(p['H'] - 0.02) + p['t_top']
        Ht = htop(p, g.Y); aX = np.abs(g.X)
        rim = np.empty(seat.shape, np.float32); ncav = np.empty(seat.shape, np.float32); cut = np.empty(seat.shape, np.float32); zf = p['seat_top']
        for k, z in enumerate(g.zs):
            al, yw = self.bevel(z); xw = float(self.xo(yw, z)[0])
            front = math.sin(al) * (aX - xw) - math.cos(al) * (g.Y - yw)
            cut[..., k] = rint(z - Ht, front, p['Rc'])
            rim[..., k] = np.maximum(rint(self.outer + lean(z), cut[..., k], p['r_rim']), 0.20 - z)     # ниже 20 см стенки нет: там корпус сиденья
            w = float(np.clip((z - zf) / (p['H'] - zf), 0, 1)) ** p['bowl_g']
            ncav[..., k] = -((1 - w) * cav_s + w * cav_t)
        shell = rint(rim, ncav, p['r_in'])
        body = S.smin(seat, shell, p['k_fold'])
        V, Fc = g.mesh(body)
        L = self.lines(V, seat, shell, rim, ncav, cut)
        if grooves and p['groove'] > 0:
            body = carve(g, body, [L['seamR'], L['seamL']], p['groove']); V, Fc = g.mesh(body)
        parts = {'body': (V, Fc)}
        parts['piping'] = S.tube(L['welt'], p['piping'], seg=8)
        pl = g.extrude(self.outer + lean(0.0) + p['plinth_in'], 0.0, z0 + 0.012, 0.002, 0.002)
        parts['plinth'] = g.mesh(pl, smooth=1)
        return parts, L

    def lines(self, V, seat, shell, rim, ncav, cut):
        """линии, которые видны на фото: кант, шов, складка, кромка ушка. Снимаются с готовой поверхности (где сходятся два поля)"""
        g = self.g; p = self.p; h = g.h
        idx = [(V[:, 0] - g.box[0]) / h, (V[:, 1] - g.box[2]) / h, (V[:, 2] - g.box[4]) / h]
        smp = lambda vol: ndimage.map_coordinates(vol, idx, order=1, mode='nearest')
        fs, fw, fr, fc, fg = smp(seat), smp(shell), smp(rim), smp(ncav), smp(cut)
        io = ndimage.map_coordinates(self.outer, idx[:2], order=1, mode='nearest') + np.array([self.lean(z) for z in V[:, 2]])
        out = {}
        # складка сиденье–спинка
        m = (np.abs(fs - fw) < 0.7 * h) & (io < -0.012) & (np.abs(fs) < 2 * h)
        Q = V[m]; a = np.arctan2(Q[:, 1] - p['y_tip'] + 0.05, Q[:, 0]); out['fold'] = bin_line(Q, a, 90)
        # внутренняя кромка обода у торца ушка
        m = (np.abs(fr - fc) < 0.7 * h) & (fs > 0.012) & (V[:, 1] < self.yw0 + 0.06) & (np.abs(fw) < 2 * h) & (np.abs(fr) < 2 * h)
        for nm, sgn in (('tipR', 1), ('tipL', -1)):
            Q = V[m & (V[:, 0] * sgn > 0)]
            if len(Q) > 8: out[nm] = bin_line(Q, Q[:, 2], 40)
        # наружная кромка обода (по ней идёт кант): торец правого ушка снизу вверх, гребень вокруг тыла
        m = (np.abs(io - fg) < 0.7 * h) & (np.abs(fw) < 2 * h) & (np.abs(io) < 1.5 * h + 0.4 * p['r_rim']) & (V[:, 2] > p['zn_front'] + 0.05) & (V[:, 0] > -0.02)
        Q = V[m]; zs = p['H'] - p['top_drop'] - p['Rc'] - 0.03
        fr_ = Q[Q[:, 2] < zs]; tp = Q[Q[:, 2] >= zs]
        a = bin_line(fr_, fr_[:, 2], max(6, int((zs - p['zn_front']) / 0.01)))
        th = np.arctan2(tp[:, 1] - (self.yw0 - 0.03), tp[:, 0]); b = bin_line(tp, th, 150)
        b = b[b[:, 0] > 0.003]
        # низ ушка: от вертикального шва вперёд по линии выреза и вверх на кант
        yb = self.bevel(p['zn_front'])[1]
        yz = S.path_arc([(p['y_seam'], p['zn_seam']), (yb, p['zn_front']), (self.bevel(p['zn_front'] + 0.07)[1], p['zn_front'] + 0.07)], [0.02], step=0.003)
        low = np.c_[self.xo(yz[:, 0], yz[:, 1]), yz[:, 0], yz[:, 1]]
        a = a[a[:, 2] > low[-1, 2] + 0.004]
        side = smooth_line(np.vstack([low, a, b]), 3)
        mid = side[-1] * np.array([0, 1, 1])
        out['weltR'] = side; out['welt'] = np.vstack([side, mid, side[::-1] * np.array([-1, 1, 1])])
        zz = np.arange(p['z0'] + 0.004, p['zn_seam'] - 0.004, 0.004)
        seam = np.c_[self.xo(np.full(len(zz), p['y_seam']), zz), np.full(len(zz), p['y_seam']), zz]
        out['seamR'] = seam; out['seamL'] = seam * np.array([-1, 1, 1])
        return out


def carve(g, vol, lines, r):
    """врезанный шов: канавка радиуса r вдоль 3D-линий (поле расстояния до линии считается только рядом с ней)"""
    from scipy.spatial import cKDTree
    R = r + 3 * g.h; lo = np.array([g.box[0], g.box[2], g.box[4]])
    for l in lines:
        pts = np.vstack([a + (b - a) * s for a, b in zip(l[:-1], l[1:]) for s in np.linspace(0, 1, 5)[:-1]]); tree = cKDTree(pts)
        i0 = np.maximum(np.floor((l.min(0) - R - lo) / g.h).astype(int), 0); i1 = np.minimum(np.ceil((l.max(0) + R - lo) / g.h).astype(int) + 1, vol.shape)
        sub = vol[i0[0]:i1[0], i0[1]:i1[1], i0[2]:i1[2]]
        X, Y, Z = np.meshgrid(g.xs[i0[0]:i1[0]], g.ys[i0[1]:i1[1]], g.zs[i0[2]:i1[2]], indexing='ij')
        d, _ = tree.query(np.c_[X.ravel(), Y.ravel(), Z.ravel()], distance_upper_bound=R)
        d = np.minimum(d, R).reshape(sub.shape).astype(np.float32)
        vol[i0[0]:i1[0], i0[1]:i1[1], i0[2]:i1[2]] = S.smax(sub, r - d, 0.004)
    return vol


def build(fast=False, p=None, h=None):
    m = Model(p or P, fast=fast, h=h)
    return m.build(grooves=not fast)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]; out = args[0]; os.makedirs(out, exist_ok=True)
    p = dict(P)
    if '--params' in sys.argv: p.update(json.load(open(sys.argv[sys.argv.index('--params') + 1])))
    parts, L = build('--fast' in sys.argv, p)
    S.save_parts(os.path.join(out, 'parts.npz'), parts); np.savez(os.path.join(out, 'lines.npz'), **L)
    json.dump(p, open(os.path.join(out, 'params.json'), 'w'), indent=1)
    bb = np.vstack([v for v, f in parts.values()]); print('габариты, см:', np.round((bb.max(0) - bb.min(0)) * 100, 1), 'треугольников:', sum(len(f) for v, f in parts.values()))
    if '--glb' in sys.argv: print('GLB:', S.export_glb(os.path.join(out, 'galso.glb'), parts), 'треугольников обивки')
