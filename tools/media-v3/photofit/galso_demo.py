"""ВЕРСИЯ НА ДЕМО (25 ноября): её владелец назвал «норм» и попросил «в спинку чуть-чуть добавить мягкость» — добавлено
(стенка 12 см, верх круглым валиком, внутренняя сторона пухлая, мягкая складка у сиденья). Из неё собран ricca/models3d/armchair-20.glb.
Доводка по фото идёт в galso.py; когда она будет принята, этот файл сольётся с ним.

Galso (armchair-20) — низкое круглое кресло-«кадка». Форма снята с двух фото каталога наложением (photofit.py).

Что на фото (p-armchair-20 — три четверти справа, p-armchair-20-d1 — строго спереди):
  • кресло СИММЕТРИЧНОЕ: корпус-«барабан» в плане — скруглённый прямоугольник 95 × 88 см, высота 72 см;
  • сиденье — толстая подушка до ~40 см, фасад выпуклый, книзу корпус сужается «кадкой», внизу утопленный цоколь;
  • над сиденьем поднимается тонкая стенка-спинка (обод ~8–10 см), огибает тыл и ОБА бока; спереди боковины
    обрезаны вертикально на ~20–25 см позади фасада сиденья (на главном фото — правая боковина крупно);
  • кант: по внутренней кромке обода стенки, вниз по переднему ребру боковины до сиденья, дальше шов уходит вперёд
    по уровню сиденья и вертикально вниз у переднего угла корпуса (ниже сиденья чехол стенки продолжается до пола).
Запуск: python galso_demo.py <outdir> [--fast] [--glb]   → parts.npz (и galso.glb), затем photofit.py galso <outdir>/parts.npz <outdir>"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy import ndimage
import softsdf as S

P = dict(
    W=0.95, D=0.88, H=0.72,
    plan_n=3.4,            # показатель суперэллипса плана корпуса (2 — эллипс, больше — квадратнее)
    seat_top=0.40, seat_rt=0.075, seat_crown=0.018, seat_bulge=0.0,
    wall_t=0.12,           # толщина стенки-спинки (25 ноября, владелец: «в спинку чуть-чуть добавь мягкость» — толще)
    wall_rt=0.058,         # скругление обода — верх спинки круглый валик
    wall_bulge=0.016,      # пухлость внутренней стороны спинки
    tuck=0.022,            # мягкая складка там, где спинка уходит в сиденье
    top_drop=0.04, drop_y1=0.30, drop_y0=-0.10,   # «холмик» (владелец: «спинка как холмик идёт»): верх выше у середины спинки, к ушкам ниже на top_drop
    ear_r=0.075,           # передний верхний угол ушка — круглое плечо
    wing_cut=0.23,         # на сколько передний торец боковины позади фасада сиденья
    wing_r=0.055,          # скругление торца боковины в плане
    taper=0.075, taper_zm=0.36, rb=0.05,   # сужение корпуса книзу, высота самого широкого места, скругление у пола
    plinth_h=0.015, plinth_in=0.11,
    piping=0.0045,         # радиус канта
    rim_in=0.028,          # кант обода: на сколько от внутренней стороны стенки
    seam_in=0.03,          # шов на уровне сиденья: на сколько от наружного контура
    seam_fwd=0.05,         # вертикальный шов: на сколько впереди торца ушка (на фото — почти сразу под ушком)
)


def seams(g, vol, outer, top, p, yf):
    """канты и швы, как на фото (25 ноября, владелец: «там линии ещё есть, тоже добавь их»). С каждой стороны одна линия:
    по внутренней кромке обода спинки и ушка → вниз по переднему ребру ушка до сиденья → по уровню сиденья наружу-вперёд
    → вертикально вниз по боку корпуса чуть впереди ушка. Обод — одна линия через весь тыл; правая сторона зеркалит левую."""
    r = p['piping']; yc = yf + p['wing_cut']; lift = 0.35 * r
    interp = lambda arr, x, y: ndimage.map_coordinates(arr, [(np.atleast_1d(x) - g.box[0]) / g.h, (np.atleast_1d(y) - g.box[2]) / g.h], order=1, mode='nearest')
    # 1) обод: линия уровня плана на rim_in от внутренней стороны стенки, только там, где стенка есть
    lvl = -(p['wall_t'] - p['rim_in'])
    c = max(g.plan_contours(outer, lvl), key=len)                                      # замкнутая линия, точки по порядку
    c = np.roll(c, -int(np.argmin(c[:, 1])), axis=0); c = c[c[:, 1] > yc + 0.012]      # разрезать спереди, оставить тыл и бока
    if c[0, 0] > 0: c = c[::-1]                                                        # слева (x<0) через тыл направо
    rim = np.c_[c, interp(top, c[:, 0], c[:, 1]) + 0.01]
    rim = g.project(vol, S.resample(rim, 0.006), lift=lift)
    out = {}
    lines = [rim]
    for sx in (-1, 1):
        e = rim[0] if sx < 0 else rim[-1]                                              # конец обода у торца ушка
        # 2) вниз по переднему ребру ушка: от конца обода к основанию ушка (точки рядом с поверхностью — садятся на неё надёжно)
        s = np.linspace(0, 1, 40)[1:, None]; b0 = np.array([e[0], yc - 0.25 * p['wing_r'], p['seat_top'] + 0.015])
        down = e[None] * (1 - s) + b0[None] * s; down[:, 1] -= 0.02 * np.sin(np.pi * s[:, 0])          # плечо ушка выпуклое
        down = g.project(vol, down, iters=10, lift=lift)
        # 3) по уровню сиденья наружу и вперёд: вдоль наружного контура на seam_in от него
        cc = max(g.plan_contours(outer, -p['seam_in']), key=len)
        cc = cc[(np.sign(cc[:, 0]) == sx) & (cc[:, 1] < yc - 0.02) & (cc[:, 1] > yc - p['seam_fwd'])]
        cc = cc[np.argsort(-cc[:, 1])]                                                 # от ушка к фасаду
        k = np.linspace(0, 1, 10)[1:-1, None]; link = down[-1][None, :2] * (1 - k) + cc[0][None, :] * k   # перемычка у основания ушка
        run = np.vstack([link, cc]); run = g.project(vol, np.c_[run, np.full(len(run), p['seat_top'] - 0.005)], iters=10, lift=lift)
        # 4) вертикально вниз у переднего угла: корпус книзу сужается — точки идут по его стенке
        zs2 = np.arange(run[-1][2] - 0.006, p['plinth_h'] + p['rb'] * 0.7, -0.005)
        o = run[-1]; n = np.array([o[0], o[1]]) / np.hypot(o[0], o[1])
        lean = np.array([p['taper'] * max(0.0, (p['taper_zm'] - z) / p['taper_zm']) ** 2 for z in zs2])
        drop = g.project(vol, np.c_[o[0] + (p['seam_in'] - lean) * n[0], o[1] + (p['seam_in'] - lean) * n[1], zs2], iters=10, lift=lift)
        seg = np.vstack([e[None], down, run, drop]); seg = seg[np.abs(g.sample(vol, seg) - lift) < 0.004]   # не севшие на поверхность — прочь
        lines.append(S.resample(seg, 0.005, smooth=3))
    lines[0] = S.resample(rim, 0.006, smooth=2)
    for i, ln in enumerate(lines): out[f'piping{i}'] = S.tube(ln, r=r, seg=8)
    return out


def build(fast=False):
    p = P; g = S.Grid(h=0.008 if fast else 0.004)
    outer = g.plan([S.superellipse(0, 0, p['W'] / 2, p['D'] / 2, p['plan_n'])])
    lean = lambda z: p['taper'] * max(0.0, (p['taper_zm'] - z) / p['taper_zm']) ** 2
    z0 = p['plinth_h']
    # сиденье: весь план до высоты сиденья
    seat = g.extrude(outer, z0, p['seat_top'], p['seat_rt'], p['rb'], bulge=p['seat_bulge'], crown=p['seat_crown'], lean=lean)
    # стенка: кольцо толщиной wall_t по тылу и бокам, спереди обрезано
    yf = -p['D'] / 2; ring = np.maximum(outer, -(outer + p['wall_t']))
    wall2 = g.reround(np.maximum(ring, (yf + p['wing_cut']) - g.Y), open_r=p['wing_r'])
    tt = np.clip((p['drop_y1'] - g.Y) / (p['drop_y1'] - p['drop_y0']), 0, 1)
    top = p['H'] - p['top_drop'] * tt * tt * (3 - 2 * tt)                        # гребень спинки горкой
    dy = np.clip(g.Y - (yf + p['wing_cut']), 0, p['ear_r'])
    top = top - (p['ear_r'] - np.sqrt(np.clip(p['ear_r'] ** 2 - (p['ear_r'] - dy) ** 2, 0, None)))   # плечо у торца ушка
    wall = g.extrude(wall2, p['seat_top'] - 0.12, top, p['wall_rt'], 0.03, bulge=p['wall_bulge'], lean=lean)   # ниже сиденья стенку закрывает корпус
    env = g.extrude(outer, z0, p['H'] + 0.1, 0.001, p['rb'], lean=lean)                        # наружная оболочка корпуса
    wall = np.maximum(wall, env)                                                                # наружу не шире корпуса
    vol = np.maximum(S.smin(seat, wall, p['tuck']), env)                                        # мягкая складка внутри, снаружи — ровная стенка без пояска
    parts = {'body': g.mesh(vol)}
    parts.update(seams(g, vol, outer, top, p, yf))
    # цоколь
    pl = g.extrude(outer + p['plinth_in'], 0.0, z0 + 0.01, 0.002, 0.002)
    parts['plinth'] = g.mesh(pl, smooth=1)
    return parts


if __name__ == '__main__':
    out = [a for a in sys.argv[1:] if not a.startswith('--')][0]; os.makedirs(out, exist_ok=True)
    parts = build('--fast' in sys.argv)
    S.save_parts(os.path.join(out, 'parts.npz'), parts)
    bb = np.vstack([v for v, f in parts.values()]); print('габариты, см:', np.round((bb.max(0) - bb.min(0)) * 100, 1), 'треугольников:', sum(len(f) for v, f in parts.values()))
    if '--glb' in sys.argv: print('GLB:', S.export_glb(os.path.join(out, 'galso.glb'), parts), 'треугольников обивки')
