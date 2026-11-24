"""Galso (armchair-20) — низкое круглое кресло-«кадка». Форма снята с двух фото каталога наложением (photofit.py).

Что на фото (p-armchair-20 — три четверти справа, p-armchair-20-d1 — строго спереди):
  • кресло СИММЕТРИЧНОЕ: корпус-«барабан» в плане — скруглённый прямоугольник 95 × 88 см, высота 72 см;
  • сиденье — толстая подушка до ~40 см, фасад выпуклый, книзу корпус сужается «кадкой», внизу утопленный цоколь;
  • над сиденьем поднимается тонкая стенка-спинка (обод ~8–10 см), огибает тыл и ОБА бока; спереди боковины
    обрезаны вертикально на ~20–25 см позади фасада сиденья (на главном фото — правая боковина крупно);
  • кант: по внутренней кромке обода стенки, вниз по переднему ребру боковины до сиденья, дальше шов уходит вперёд
    по уровню сиденья и вертикально вниз у переднего угла корпуса (ниже сиденья чехол стенки продолжается до пола).
Запуск: python galso.py <outdir> [--fast] [--glb]   → parts.npz (и galso.glb), затем photofit.py galso <outdir>/parts.npz <outdir>"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import softsdf as S

P = dict(
    W=0.95, D=0.88, H=0.72,
    plan_n=3.4,            # показатель суперэллипса плана корпуса (2 — эллипс, больше — квадратнее)
    seat_top=0.40, seat_rt=0.075, seat_crown=0.018, seat_bulge=0.012,
    wall_t=0.095,          # толщина стенки-спинки
    wall_rt=0.04,          # скругление обода
    wing_cut=0.23,         # на сколько передний торец боковины позади фасада сиденья
    wing_r=0.035,          # скругление торца боковины в плане
    taper=0.075, taper_zm=0.36, rb=0.05,   # сужение корпуса книзу, высота самого широкого места, скругление у пола
    plinth_h=0.02, plinth_in=0.07,
    piping=0.0045,
)


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
    wall = g.extrude(wall2, z0, p['H'], p['wall_rt'], p['rb'], lean=lean)
    wall = np.maximum(wall, g.extrude(outer, z0, p['H'] + 0.1, 0.001, p['rb'], lean=lean))     # наружу не шире корпуса
    parts = {'body': g.mesh(np.minimum(seat, wall))}     # одна оболочка: чехол стенки и сиденья сходятся без щели
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
