"""Runvo (armchair-07), широкая версия — как на главном фото каталога (серии фото b и o). Форма снята с фото наложением (photofit.py).

РАБОЧАЯ ВЕРСИЯ (идёт подгонка) — описание конструкции будет обновлено по итогам наложения.
Оси: фронт кресла = ракурс фото o2 (камера az≈0); X вправо, −Y к зрителю, Z вверх.
Запуск: python runvo.py <outdir> [--fast] [--glb]   → parts.npz (и runvo.glb), затем photofit.py runvo <outdir>/parts.npz <outdir> --prior <prior.json>"""
import sys, os, math, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.spatial import cKDTree
import softsdf as S

P = dict(
    H=0.74,
    # панель-спинка: средняя линия — дуга суперэллипса с центром (pcx, pcy), полуоси Rx, Ry, показатель pn (2 — эллипс),
    # от угла aR (правый конец) до aL (левый конец), градусы от +X против часовой; на концах — прямые продолжения eR, eL по касательной
    pcx=0.0, pcy=0.10, Rx=0.385, Ry=0.385, pn=2.0, aR=4.0, aL=176.0, eR=0.0, eL=0.0,
    T=0.20,                 # толщина панели
    # вариант «L»: mode=1 — спинка + подлокотник под прямым углом в осях, повёрнутых на La градусов (ось u — вдоль спинки, w — вглубь):
    # спинка: наружная грань w=Lwb, левый торец u=Lul; подлокотник: наружная грань u=Lur, передний торец w=Lwe; радиус угла Lrc (по средней линии)
    # вариант «две дуги»: mode=2 — от правого торца (ERx, ERy) с курсом h0 (градусы, направление «вдоль панели назад»),
    # дуга радиуса R1 на угол A1, затем дуга R2 на угол A2 (поворот против часовой), затем прямая eL до левого конца
    ERx=0.428, ERy=0.22, h0=135.5, R1=0.605, A1=60.0, R2=0.30, A2=74.5,
    mode=0.0, La=40.0, Lul=-0.243, Lwb=0.465, Lur=0.564, Lwe=-0.08, Lrc=0.28,
    shell_z0=0.25, shell_bulge=0.006,
    rt_in=0.06, rt_out=0.10, rb_in=0.05, rb_out=0.11,   # скругления рёбер: внутренняя сторона (к сиденью) и наружная — сечение «D»
    end_r=0.03,             # скругление рёбер торцов в плане
    capL=1.0, capL_rt=0.11, # левый конец — мягко закруглён (полукруг в плане, радиус T/2; ребро сверху скруглено сильнее)
    T_end=0.0,              # добавка к толщине у правого торца (0 — толщина постоянная)
    # сиденье-пуф
    seat_cx=0.0, seat_cy=-0.02, seat_a=0.443, seat_b=0.40, seat_n=2.4,
    seat_z0=0.125, seat_z1=0.47, seat_rt=0.13, seat_rb=0.16, seat_bulge=0.02, seat_crown=0.015,
    # ножки: стопы (x, y) передние и задние (правая сторона; левые — зеркально)
    leg_f=(0.27, -0.27), leg_b=(0.34, 0.27), leg_splay=0.03, leg_z=0.16,
    piping=0.0045,
)


def panel_path(p, step=0.004):
    """средняя линия панели в плане: от правого конца к левому (против часовой) → (N, 2)"""
    if p.get('mode') == 2:
        pts = [np.array([p['ERx'], p['ERy']])]; h = math.radians(p['h0'])
        for R_, A_ in ((p['R1'], p['A1']), (p['R2'], p['A2'])):
            n = max(2, int(R_ * math.radians(A_) / step)); dh = math.radians(A_) / n
            for _ in range(n):
                h += dh / 2; pts.append(pts[-1] + step * np.array([math.cos(h), math.sin(h)]) * (R_ * dh / step)); h += dh / 2
        n = int(p['eL'] / step)
        for _ in range(n): pts.append(pts[-1] + step * np.array([math.cos(h), math.sin(h)]))
        return np.array(pts)
    if p.get('mode'):
        T = p['T']; a = math.radians(p['La']); c, s = math.cos(a), math.sin(a)
        uw = S.path_arc([(p['Lur'] - T / 2, p['Lwe']), (p['Lur'] - T / 2, p['Lwb'] - T / 2), (p['Lul'], p['Lwb'] - T / 2)], [p['Lrc']], step)
        return np.stack([uw[:, 0] * c - uw[:, 1] * s, uw[:, 0] * s + uw[:, 1] * c], 1)
    n = p['pn']
    def pt(a):
        c, s = math.cos(a), math.sin(a)
        return np.array([p['pcx'] + p['Rx'] * np.sign(c) * abs(c) ** (2 / n), p['pcy'] + p['Ry'] * np.sign(s) * abs(s) ** (2 / n)])
    A = np.radians(np.linspace(p['aR'], p['aL'], 721)); pts = np.array([pt(a) for a in A])
    def ext(q0, q1, L):
        if L <= 1e-6: return np.zeros((0, 2))
        d = (q0 - q1); d /= np.linalg.norm(d); k = max(2, int(L / step))
        return np.array([q0 + d * L * s for s in np.linspace(1, 0, k, endpoint=False)])
    pts = np.vstack([ext(pts[0], pts[3], p['eR']), pts, ext(pts[-1], pts[-4], p['eL'])[::-1]])
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    t = np.arange(0, seg[-1], step)
    return np.stack([np.interp(t, seg, pts[:, 0]), np.interp(t, seg, pts[:, 1])], 1)


def side_field(g, path):
    """для каждой точки плана: расстояние поперёк средней линии со знаком (плюс — внутренняя сторона, к сиденью)"""
    tr = cKDTree(path); q = np.stack([g.X.ravel(), g.Y.ravel()], 1); _, i = tr.query(q)
    tg = np.gradient(path, axis=0); tg /= np.linalg.norm(tg, axis=1)[:, None]
    d = q - path[i]; s = tg[i, 0] * d[:, 1] - tg[i, 1] * d[:, 0]
    return s.reshape(g.X.shape)


def build(fast=False, p=None, h=None, legs=True):
    p = dict(P, **(p or {})); g = S.Grid(box=(-0.60, 0.60, -0.60, 0.60, -0.02, 0.82), h=h or (0.008 if fast else 0.004))
    path = panel_path(p)
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
    Tt = p['T'] + p['T_end'] * np.clip(1 - seg / 0.30, 0, 1) ** 2                    # толщина вдоль линии (у правого торца может быть больше)
    shell2 = g.plan([S.band(path, Tt)], open_r=p['end_r'])
    w = np.clip(side_field(g, path) / 0.04 * 0.5 + 0.5, 0, 1); w = w * w * (3 - 2 * w)
    rt = p['rt_out'] + (p['rt_in'] - p['rt_out']) * w; rb = p['rb_out'] + (p['rb_in'] - p['rb_out']) * w
    if p['capL']:
        E = path[-1]; dE = np.hypot(g.X - E[0], g.Y - E[1])
        shell2 = np.minimum(shell2, dE - p['T'] / 2)
        k = np.clip(1 - (dE - p['T'] / 2) / 0.10, 0, 1); k = k * k * (3 - 2 * k)       # у левого конца рёбра круглее
        rt = rt + (np.maximum(rt, p['capL_rt']) - rt) * k; rb = rb + (np.maximum(rb, p['capL_rt']) - rb) * k
    shell = g.extrude(shell2, p['shell_z0'], p['H'], rt, rb, bulge=p['shell_bulge'])
    seat2 = g.plan([S.superellipse(p['seat_cx'], p['seat_cy'], p['seat_a'], p['seat_b'], p['seat_n'])])
    seat = g.extrude(seat2, p['seat_z0'], p['seat_z1'], p['seat_rt'], p['seat_rb'], bulge=p['seat_bulge'], crown=p['seat_crown'])
    parts = {'seat': g.mesh(seat), 'shell': g.mesh(shell)}
    if legs:
        L = []
        for sx in (-1, 1):
            for (fx, fy) in (p['leg_f'], p['leg_b']):
                sy = -1 if fy < 0 else 1
                L.append(S.blade((sx * (fx - p['leg_splay']), fy - sy * p['leg_splay'], p['leg_z']), (sx * fx, fy, 0.0), 0.034, 0.018, 0.016, 0.012))
        parts['legs'] = S.merge(L)
    return parts


if __name__ == '__main__':
    out = [a for a in sys.argv[1:] if not a.startswith('--')][0]; os.makedirs(out, exist_ok=True)
    over = json.load(open(sys.argv[sys.argv.index('--params') + 1])) if '--params' in sys.argv else None
    parts = build('--fast' in sys.argv, over)
    S.save_parts(os.path.join(out, 'parts.npz'), parts)
    bb = np.vstack([v for v, f in parts.values()]); print('габариты, см:', np.round((bb.max(0) - bb.min(0)) * 100, 1), 'треугольников:', sum(len(f) for v, f in parts.values()))
    if '--glb' in sys.argv: print('GLB:', S.export_glb(os.path.join(out, 'runvo.glb'), parts), 'треугольников обивки')
