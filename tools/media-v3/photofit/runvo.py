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
    # панель-спинка, средняя линия в плане: от правого торца (ERx, ERy) курсом h0 (градусы; направление «вдоль панели назад»)
    # прямая eR, дуга радиуса R1 на угол A1, затем дуга R2 на угол A2 (поворот против часовой), затем прямая eL до левого конца
    ERx=0.403, ERy=0.20, h0=140.0, eR=0.24, R1=0.367, A1=126.0, R2=0.30, A2=0.0, eL=0.0,
    T=0.17, T_end=0.0,      # толщина панели и добавка к ней у правого торца
    shell_z0=0.20, shell_bulge=0.006,
    rt_in=0.07, rt_out=0.09, rb_in=0.09, rb_out=0.10,   # скругления рёбер: внутренняя сторона (к сиденью) и наружная
    end_r=0.03,             # скругление рёбер правого торца в плане
    capL_rt=0.11, capL_len=0.22, capL_drop=0.12,   # левый конец: полукруг в плане (радиус T/2), верх плавно опускается на capL_drop на длине capL_len
    # сиденье-пуф: овал (суперэллипс) с центром (seat_cx, seat_cy)
    seat_cx=0.0, seat_cy=-0.02, seat_a=0.426, seat_b=0.41, seat_n=2.4,
    seat_z0=0.121, seat_z1=0.455, seat_rt=0.126, seat_rb=0.115, seat_bulge=0.021, seat_crown=0.015,
    cut_gap=0.012, cut_k=0.02,     # сиденье вдавлено панелью: на сколько сиденье заходит в панель и мягкость складки
    # ножки: стопы (x, y) передние и задние (правая сторона; левые — зеркально)
    leg_f=(0.286, -0.276), leg_b=(0.340, 0.276), leg_splay=0.018, leg_zf=0.15, leg_zb=0.215,
    piping=0.0045,
)


def panel_path(p, step=0.004):
    """средняя линия панели в плане: от правого торца к левому концу (против часовой) → (N, 2)"""
    pts = [np.array([p['ERx'], p['ERy']])]; h = math.radians(p['h0'])
    for _ in range(int(p['eR'] / step)): pts.append(pts[-1] + step * np.array([math.cos(h), math.sin(h)]))
    for R_, A_ in ((p['R1'], p['A1']), (p['R2'], p['A2'])):
        if A_ < 0.5: continue
        n = max(2, int(R_ * math.radians(A_) / step)); dh = math.radians(A_) / n
        for _ in range(n):
            h += dh / 2; pts.append(pts[-1] + R_ * dh * np.array([math.cos(h), math.sin(h)])); h += dh / 2
    for _ in range(int(p['eL'] / step)): pts.append(pts[-1] + step * np.array([math.cos(h), math.sin(h)]))
    return np.array(pts)


def path_fields(g, path, T):
    """для точек плана: расстояние поперёк средней линии со знаком (плюс — к сиденью) и расстояние вдоль панели от кончика левого конца"""
    tr = cKDTree(path); q = np.stack([g.X.ravel(), g.Y.ravel()], 1); _, i = tr.query(q)
    tg = np.gradient(path, axis=0); tg /= np.linalg.norm(tg, axis=1)[:, None]
    d = q - path[i]; side = tg[i, 0] * d[:, 1] - tg[i, 1] * d[:, 0]
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
    along = (seg[-1] - seg[i]) + T / 2 - np.clip((d * tg[i]).sum(1), 0, T / 2) * (i == len(path) - 1)
    return side.reshape(g.X.shape), along.reshape(g.X.shape)


def build(fast=False, p=None, h=None, legs=True):
    p = dict(P, **(p or {})); g = S.Grid(box=(-0.60, 0.60, -0.60, 0.60, -0.02, 0.82), h=h or (0.008 if fast else 0.004))
    path = panel_path(p); T = p['T']
    seg = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
    Tt = T + p['T_end'] * np.clip(1 - seg / 0.30, 0, 1) ** 2
    shell2 = g.plan([S.band(path, Tt)], open_r=p['end_r'])
    side, along = path_fields(g, path, T)
    w = np.clip(side / 0.04 * 0.5 + 0.5, 0, 1); w = w * w * (3 - 2 * w)
    rt = p['rt_out'] + (p['rt_in'] - p['rt_out']) * w; rb = p['rb_out'] + (p['rb_in'] - p['rb_out']) * w
    # левый конец: полукруг в плане, рёбра круглее, верх плавно опускается
    E = path[-1]; dE = np.hypot(g.X - E[0], g.Y - E[1]); shell2 = np.minimum(shell2, dE - T / 2)
    k = np.clip(1 - (dE - T / 2) / 0.10, 0, 1); k = k * k * (3 - 2 * k)
    rt = rt + (np.maximum(rt, p['capL_rt']) - rt) * k; rb = rb + (np.maximum(rb, p['capL_rt']) - rb) * k
    tt = np.clip(1 - along / max(p['capL_len'], 1e-3), 0, 1)
    z1 = p['H'] - p['capL_drop'] * (1 - np.sqrt(1 - tt * tt))
    shell = g.extrude(shell2, p['shell_z0'], z1, rt, rb, bulge=p['shell_bulge'])
    seat2 = g.plan([S.superellipse(p['seat_cx'], p['seat_cy'], p['seat_a'], p['seat_b'], p['seat_n'])])
    seat = g.extrude(seat2, p['seat_z0'], p['seat_z1'], p['seat_rt'], p['seat_rb'], bulge=p['seat_bulge'], crown=p['seat_crown'])
    seat = S.smax(seat, -p['cut_gap'] - shell, p['cut_k'])           # панель вдавлена в сиденье: мягкая складка, без щели
    parts = {'seat': g.mesh(seat), 'shell': g.mesh(shell)}
    if legs:
        L = []
        for sx in (-1, 1):
            for (fx, fy), zt in ((p['leg_f'], p['leg_zf']), (p['leg_b'], p['leg_zb'])):
                sy = -1 if fy < 0 else 1
                L.append(S.blade((sx * (fx - p['leg_splay']), fy - sy * p['leg_splay'], zt), (sx * fx, fy, 0.0), 0.030, 0.018, 0.014, 0.010))
        parts['legs'] = S.merge(L)
    return parts


if __name__ == '__main__':
    out = [a for a in sys.argv[1:] if not a.startswith('--')][0]; os.makedirs(out, exist_ok=True)
    over = json.load(open(sys.argv[sys.argv.index('--params') + 1])) if '--params' in sys.argv else None
    parts = build('--fast' in sys.argv, over)
    S.save_parts(os.path.join(out, 'parts.npz'), parts)
    bb = np.vstack([v for v, f in parts.values()]); print('габариты, см:', np.round((bb.max(0) - bb.min(0)) * 100, 1), 'треугольников:', sum(len(f) for v, f in parts.values()))
    if '--glb' in sys.argv: print('GLB:', S.export_glb(os.path.join(out, 'runvo.glb'), parts), 'треугольников обивки')
