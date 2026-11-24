"""Runvo (armchair-07), широкая версия — как на главном фото каталога (серии фото b и o). Форма снята с фото наложением (photofit.py).

РАБОЧАЯ ВЕРСИЯ (идёт подгонка) — описание конструкции будет обновлено по итогам наложения.
Оси: фронт кресла = ракурс фото o2 (камера az≈0); X вправо, −Y к зрителю, Z вверх.
Запуск: python runvo.py <outdir> [--fast] [--glb]   → parts.npz (и runvo.glb), затем photofit.py runvo <outdir>/parts.npz <outdir>"""
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import softsdf as S

P = dict(
    H=0.74, crown=0.004,
    # панель-спинка: полукольцо в плане. Центр (cx, yc), наружный радиус Ro, толщина T (внутренний радиус Ro − T).
    # Концы — «крылья»: внутренняя сторона от излома на угле aB* идёт по прямой к наружной окружности (вершина клина на угле a*),
    # кончик клина скруглён радиусом tip*. Углы — градусы от оси +X (правый конец около 0, левый около 180)
    cx=-0.003, yc=0.085, Ro=0.488, ell=1.0, T=0.195,
    aR=-8.0, aBR=31.0, tipR=0.027,
    aL=188.0, aBL=149.0, tipL=0.027,
    ridge_r=0.012,                   # смягчение излома внутренней стороны
    sh_z0=0.21, sh_bulge=0.004,
    rt_out=0.075, rt_in=0.085, rb_out=0.075, rb_in=0.085,
    eRh=0.15, eRv=0.105, eRbh=0.10, eRbv=0.11,     # правый торец: верхний угол (по дуге × по высоте) и нижний
    eLh=0.28, eLv=0.22, eLbh=0.10, eLbv=0.08,      # левый конец: верх плавно опускается к кончику
    # сиденье-пуф
    seat_cx=-0.006, seat_cy=-0.01, seat_a=0.437, seat_b=0.42, seat_bb=0.40, seat_n=2.2,
    seat_z0=0.12, seat_z1=0.465, seat_rt=0.15, seat_rb=0.105, seat_bulge=0.0, seat_crown=0.015,
    cut_gap=0.004, cut_k=0.015,
    # ножки: стопы (x, y) передние и задние (правая сторона; левые — зеркально)
    leg_f=(0.286, -0.279), leg_b=(0.340, 0.279), leg_lean=(0.11, 0.155),     # наклон: на сколько верх ближе к середине на метр высоты
    leg_w=(0.030, 0.027), leg_wf=(0.014, 0.012), leg_zf=0.145, leg_zb=0.235, arm_z=0.134, arm_len=0.066, arm_w=0.022,
    piping=0.0045, seam=0.0026,
    seam_in=0.026,                   # кант наружной стороны панели: отступ от кромок (по развёртке стенки)
    seat_seam_dz=0.045,              # шов сиденья: на сколько ниже верха
)


def _pol(p, a, r):
    a = np.radians(a); return np.array([p['cx'] + r * np.cos(a), p['yc'] + r * np.sin(a) * p['ell']])


def ring_polys(p, step=0.5):
    """план панели (многоугольник) и план пустоты внутри неё (для толщины): наружная дуга, прямые «крылья», внутренняя дуга"""
    Ri = p['Ro'] - p['T']
    ao = np.arange(p['aR'], p['aL'] + 1e-6, step); out = np.stack([_pol(p, a, p['Ro']) for a in ao])
    ai = np.arange(p['aBL'], p['aBR'] - 1e-6, -step); inn = np.stack([_pol(p, a, Ri) for a in ai])
    ring = [tuple(v) for v in np.vstack([out, inn])]
    A_R, A_L = _pol(p, p['aR'], p['Ro']), _pol(p, p['aL'], p['Ro'])
    far = np.array([[A_L[0] - 0.3, A_L[1] - 1.5], [A_R[0] + 0.3, A_R[1] - 1.5]])                       # пустота открыта вперёд
    void = [tuple(v) for v in np.vstack([inn, A_R[None], far[::-1], A_L[None]])]
    return ring, void


def _corner(q, h, v):
    """скруглённый угол торца: на расстоянии q по дуге от кончика кромка отступает на столько (эллипс h × v)"""
    t = np.clip(q / max(h, 1e-4), 0, 1)
    return v * (1 - np.sqrt(np.clip(1 - (1 - t) ** 2, 0, 1)))


def tips(p):
    """углы кончиков (с учётом скругления клина): правого и левого"""
    return p['aR'] + math.degrees(1.4 * p['tipR'] / p['Ro']), p['aL'] - math.degrees(1.4 * p['tipL'] / p['Ro'])


def edges(p, a):
    """верхняя и нижняя кромки панели на угле a (градусы): верх ровный с едва заметной горкой, к кончикам скругляется"""
    aTR, aTL = tips(p)
    qR = np.radians(a - aTR) * p['Ro']; qL = np.radians(aTL - a) * p['Ro']
    z1 = p['H'] + p['crown'] * np.clip(np.sin(np.radians(np.clip(a, 0, 180))), 0, 1) ** 2 - _corner(qR, p['eRh'], p['eRv']) - _corner(qL, p['eLh'], p['eLv'])
    z0 = p['sh_z0'] + _corner(qR, p['eRbh'], p['eRbv']) + _corner(qL, p['eLbh'], p['eLbv'])
    return z1, z0


def shell_field(g, p):
    ring, void = ring_polys(p)
    d = g.plan([ring])
    dR = g.reround(d, open_r=p['tipR']); dL = g.reround(d, open_r=p['tipL']); dM = g.reround(d, open_r=p['ridge_r'])
    wx = np.clip((np.abs(g.X - p['cx']) - 0.30) / 0.06, 0, 1)                    # у кончиков — своё скругление, в середине — только излом
    d2 = dM * (1 - wx) + np.where(g.X > p['cx'], dR, dL) * wx
    dV = np.maximum(g.plan([void]), 0)                                              # расстояние до внутренней стороны
    X = g.X - p['cx']; Y = (g.Y - p['yc']) / p['ell']; r = np.hypot(X, Y)
    a = np.degrees(np.arctan2(Y, X)); a = np.where(a < -90, a + 360, a)
    dO = np.maximum(p['Ro'] - r, 0); Tt = np.maximum(dO + dV, 1e-3)
    z1, z0 = edges(p, a)
    w = np.clip(dO / Tt, 0, 1); w = w * w * (3 - 2 * w)
    lim = 0.47 * Tt
    rt = np.minimum(p['rt_out'] + (p['rt_in'] - p['rt_out']) * w, lim); rb = np.minimum(p['rb_out'] + (p['rb_in'] - p['rb_out']) * w, lim)
    return g.extrude(d2, z0, z1, rt, rb, bulge=p['sh_bulge']), d2


def seat_poly(p, k=240):
    """план сиденья: суперэллипс, перед и тыл — со своей глубиной (тыл скрыт панелью, виден только по складке)"""
    t = np.linspace(0, 2 * math.pi, k, endpoint=False); c, s = np.cos(t), np.sin(t); n = p['seat_n']
    b = np.where(s < 0, p['seat_b'], p['seat_bb'])
    return list(zip(p['seat_cx'] + p['seat_a'] * np.sign(c) * np.abs(c) ** (2 / n), p['seat_cy'] + b * np.sign(s) * np.abs(s) ** (2 / n)))


def seat_field(g, p):
    seat2 = g.plan([seat_poly(p)])
    return g.extrude(seat2, p['seat_z0'], p['seat_z1'], p['seat_rt'], p['seat_rb'], bulge=p['seat_bulge'], crown=p['seat_crown'], crown_w=0.25), seat2


def _runs(pts, ok, closed=True, nmin=6):
    """куски линии, где ok (видимые): список ломаных"""
    n = len(pts); idx = np.arange(n)
    if closed and ok.all(): return [np.vstack([pts, pts[:1]])]
    if closed and ok.any() and ok[0] and ok[-1]:
        k = int(np.argmin(ok)); pts = np.roll(pts, -k, axis=0); ok = np.roll(ok, -k)
    out = []; cur = []
    for q, v in zip(pts, ok):
        if v: cur.append(q)
        elif cur:
            if len(cur) >= nmin: out.append(np.array(cur))
            cur = []
    if len(cur) >= nmin: out.append(np.array(cur))
    return out


def seams(g, seat, shell, p):
    """канты и швы: кант по контуру наружной стороны панели (по правому торцу — «D», дальше вдоль верхней и нижней кромок),
    шов по верхнему периметру сиденья, тонкие вертикальные швы внутренней стороны спинки (середина и два излома)"""
    out = {}; r = p['piping']; lift = 0.35 * r
    # 1) шов сиденья: горизонтальная линия на seat_seam_dz ниже верха, там, где сиденье не закрыто панелью
    k = int(round((p['seat_z1'] - p['seat_seam_dz'] - g.box[4]) / g.h)); zs = g.zs[k]
    c = max(g.plan_contours(seat[:, :, k], 0.0), key=len)[:-1]
    line = S.resample(np.c_[np.vstack([c, c[:1]]), np.full(len(c) + 1, zs)], 0.006)[:-1]
    line = g.project(seat, line, iters=8, lock_z=True, lift=lift)
    for i, seg in enumerate(_runs(line, g.sample(shell, line) > 0.012)):
        out[f'piping_seat{i}'] = S.tube(S.resample(seg, 0.006, smooth=2), r=r, seg=8)
    # 2) кант наружной стороны панели: развёртка стенки (q — по дуге от правого кончика, z), контур с отступом seam_in
    from scipy import ndimage
    from skimage import measure
    aTR, aTL = tips(p); Q = math.radians(aTL - aTR) * p['Ro']; res = 0.002
    qs = np.arange(-0.03, Q + 0.03, res); zz = np.arange(0.10, 0.80, res)
    z1, z0 = edges(p, aTR + np.degrees(qs / p['Ro']))
    m = (zz[None, :] > z0[:, None]) & (zz[None, :] < z1[:, None]) & (qs[:, None] > 0) & (qs[:, None] < Q)
    dist = ndimage.gaussian_filter(ndimage.distance_transform_edt(m) * res, 2.0)
    c = max(measure.find_contours(dist, p['seam_in']), key=len)[:-1]
    q = qs[0] + c[:, 0] * res; z = zz[0] + c[:, 1] * res; a = np.radians(aTR) + q / p['Ro']
    line = np.stack([p['cx'] + (p['Ro'] + 0.004) * np.cos(a), p['yc'] + (p['Ro'] + 0.004) * np.sin(a) * p['ell'], z], 1)
    line = S.resample(np.vstack([line, line[:1]]), 0.007, smooth=2)[:-1]
    line = g.project(shell, line, iters=16, lift=lift)
    ok = np.abs(g.sample(shell, line) - lift) < 0.004
    for i, seg in enumerate(_runs(line, ok)):
        closed = len(seg) == len(line) + 1
        out[f'piping_shell{i}'] = S.tube(S.resample(seg, 0.007, smooth=2), r=r, seg=8)
    # 3) вертикальные швы внутренней стороны: от складки у сиденья вверх и через верх до канта
    Ri = p['Ro'] - p['T']; rs = p['seam']
    for i, a in enumerate((90.0, p['aBR'], p['aBL'])):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        if i == 0: ca = 0.006 / Ri                                         # шов середины — на X ≈ +0.003 (как на фото спереди)
        z1a, _ = edges(p, np.array([a])); zt = float(z1a[0])
        up = [(p['cx'] + Ri * ca, p['yc'] + Ri * sa * p['ell'], z) for z in np.arange(0.33, zt - 0.05, 0.006)]
        over = [(p['cx'] + rr * ca, p['yc'] + rr * sa * p['ell'], zt + 0.01) for rr in np.arange(Ri + 0.01, p['Ro'] - 0.02, 0.006)]
        ln = g.project(shell, np.array(up + over), iters=14, lift=0.15 * rs)
        ok = (np.abs(g.sample(shell, ln) - 0.15 * rs) < 0.003) & (g.sample(seat, ln) > 0.004) & (ln[:, 2] < zt - p['seam_in'] * 0.55 + 1.0 * (np.arange(len(ln)) < len(up)))
        for j, seg in enumerate(_runs(ln, ok, closed=False)[:1]):
            out[f'seam_back{i}'] = S.tube(S.resample(seg, 0.006, smooth=2), r=rs, seg=6)
    return out


def _loft(rings):
    """замкнутая сетка по четырёхугольным сечениям (кольца по 4 точки, по порядку вдоль оси), нормали наружу"""
    V = np.array([q for rg in rings for q in rg], float); F = []
    for i in range(len(rings) - 1):
        a, b = 4 * i, 4 * (i + 1)
        for j in range(4):
            k = (j + 1) % 4; F += [(a + j, a + k, b + k), (a + j, b + k, b + j)]
    t = 4 * (len(rings) - 1); F += [(0, 2, 1), (0, 3, 2), (t, t + 1, t + 2), (t, t + 2, t + 3)]
    F = np.array(F, np.int64)
    if np.einsum('ij,ij->i', V[F[:, 0]], np.cross(V[F[:, 1]], V[F[:, 2]])).sum() < 0: F = F[:, ::-1].copy()
    return V, F


def leg(p, sx, front):
    """ножка: сужающаяся к полу стойка с наклоном вразлёт и две короткие косынки у верха (к середине кресла по X и по Y)"""
    fx, fy = p['leg_f'] if front else p['leg_b']; fx *= sx; sy = -1 if front else 1
    lean = np.array([-sx * p['leg_lean'][0], -sy * p['leg_lean'][1]]); zt = p['leg_zf'] if front else p['leg_zb']; za = p['arm_z']
    def ring(z):
        t = min(z / za, 1.0); w = np.array(p['leg_wf']) * (1 - t) + np.array(p['leg_w']) * t; c = np.array([fx, fy]) + lean * min(z, za + 0.02)
        return [(c[0] + ax * w[0] / 2, c[1] + ay * w[1] / 2, z) for ax, ay in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    meshes = [_loft([ring(0.0), ring(za * 0.5), ring(za), ring(zt)])]
    c = np.array([fx, fy]) + lean * za
    for u in (np.array([-sx, 0.0]), np.array([0.0, -sy])):                    # косынки: клин, у стойки выше
        n = np.array([-u[1], u[0]]); rings = []
        for s_, hgt in ((0.0, 0.036), (0.022, 0.020), (0.040, 0.013), (p['arm_len'], 0.011)):
            q = c + u * s_
            rings.append([(q[0] + n[0] * e * p['arm_w'] / 2, q[1] + n[1] * e * p['arm_w'] / 2, za - hgt * (1 - tz)) for e, tz in ((-1, 0), (1, 0), (1, 1), (-1, 1))])
        meshes.append(_loft(rings))
    return S.merge(meshes)


def build(fast=False, p=None, h=None, legs=True, lines=True):
    p = dict(P, **(p or {})); g = S.Grid(box=(-0.60, 0.60, -0.56, 0.66, -0.02, 0.82), h=h or (0.008 if fast else 0.004))
    shell, sh2 = shell_field(g, p)
    seat0, seat2 = seat_field(g, p)
    seat = S.smax(seat0, -p['cut_gap'] - shell, p['cut_k'])          # панель вдавлена в сиденье: мягкая складка, без щели
    parts = {'seat': g.mesh(seat), 'shell': g.mesh(shell)}
    if lines: parts.update(seams(g, seat0, shell, p))
    if legs: parts['legs'] = S.merge([leg(p, sx, fr) for sx in (-1, 1) for fr in (True, False)])
    return parts


if __name__ == '__main__':
    out = [a for a in sys.argv[1:] if not a.startswith('--')][0]; os.makedirs(out, exist_ok=True)
    over = json.load(open(sys.argv[sys.argv.index('--params') + 1])) if '--params' in sys.argv else None
    parts = build('--fast' in sys.argv, over)
    S.save_parts(os.path.join(out, 'parts.npz'), parts)
    bb = np.vstack([v for v, f in parts.values()]); print('габариты, см:', np.round((bb.max(0) - bb.min(0)) * 100, 1), 'треугольников:', sum(len(f) for v, f in parts.values()))
    if '--glb' in sys.argv: print('GLB:', S.export_glb(os.path.join(out, 'runvo.glb'), parts), 'треугольников обивки')
