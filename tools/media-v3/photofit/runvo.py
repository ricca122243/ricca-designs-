"""Runvo (armchair-07), широкая версия — как на главном фото каталога (серии фото b и o). Форма снята с фото наложением (photofit.py).

Что на фото (o2 — спереди; b1, o — низко три четверти слева; o3, b2, o4 — сверху-слева; b3, d1 — крупно подлокотник):
  • сиденье — отдельная толстая подушка-«пуф» почти во всю ширину, в плане скруглённый квадрат, бока очень круглые,
    по верхнему периметру шов-кант; стоит на четырёх тонких чёрных ножках-пластинах вразлёт;
  • спинка и правый подлокотник — ОДНА изогнутая панель постоянной толщины: идёт вдоль тыла, большим радиусом
    заворачивает направо и вперёд, к концу чуть загибается внутрь; низ панели — не у пола, а около низа сиденья;
    сечение панели — скруглённый прямоугольник, поэтому торец подлокотника — плоская «D» с кантом по контуру;
  • левый конец спинки — простой торец; слева подлокотника нет;
  • владелец: «спинка полукруглая» — в плане панель скорее дуга вокруг круглого сиденья, чем прямая спинка с углом
    (первая версия ниже — прямая спинка + угол — на фото сверху ложится плохо: IoU 0,86–0,88; это отправная точка, не истина);
  • серии t и h на сайте — та же конструкция, но выше и уже и с рамой-перекладинами: это другая версия, сюда не идёт.
Запуск: python runvo.py <outdir> [--fast] [--glb]   → parts.npz (и runvo.glb), затем photofit.py runvo <outdir>/parts.npz <outdir>"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import softsdf as S

P = dict(
    W=0.97, D=0.86, H=0.74,
    # панель спинка+подлокотник
    T=0.17,                 # толщина
    back_x0=-0.455,         # левый торец спинки (x)
    corner_r=0.28,          # радиус поворота (по средней линии)
    arm_end_y=-0.03,        # где кончается подлокотник (y средней линии у торца)
    arm_in=0.06,            # на сколько конец подлокотника уходит внутрь (к сиденью)
    shell_z0=0.25, shell_rt=0.075, shell_rb=0.075, shell_bulge=0.008,
    end_r=0.03,             # скругление рёбер торцов в плане
    # сиденье
    seat_cx=-0.02, seat_cy=-0.03, seat_a=0.455, seat_b=0.40, seat_n=2.8,
    seat_z0=0.215, seat_z1=0.47, seat_rt=0.13, seat_rb=0.13, seat_bulge=0.02, seat_crown=0.02,
    # ножки: верх (x, y), стопа (x, y) для правой передней и правой задней; левые — зеркально
    leg_top_f=(0.30, -0.22), leg_foot_f=(0.36, -0.31), leg_top_b=(0.30, 0.22), leg_foot_b=(0.36, 0.31), leg_z=0.25,
    piping=0.0045,
)


def build(fast=False):
    p = P; g = S.Grid(h=0.008 if fast else 0.004)
    T = p['T']; yb = p['D'] / 2 - T / 2; xa = p['W'] / 2 - T / 2
    path = S.path_arc([(p['back_x0'], yb), (xa, yb), (xa - p['arm_in'], p['arm_end_y'])], [p['corner_r']])
    shell2 = g.plan([S.band(path, T)], open_r=p['end_r'])
    shell = g.extrude(shell2, p['shell_z0'], p['H'], p['shell_rt'], p['shell_rb'], bulge=p['shell_bulge'])
    seat2 = g.plan([S.superellipse(p['seat_cx'], p['seat_cy'], p['seat_a'], p['seat_b'], p['seat_n'])])
    seat = g.extrude(seat2, p['seat_z0'], p['seat_z1'], p['seat_rt'], p['seat_rb'], bulge=p['seat_bulge'], crown=p['seat_crown'])
    parts = {'seat': g.mesh(seat), 'shell': g.mesh(shell)}
    legs = []
    for sx in (-1, 1):
        for top, foot in ((p['leg_top_f'], p['leg_foot_f']), (p['leg_top_b'], p['leg_foot_b'])):
            legs.append(S.blade((sx * top[0], top[1], p['leg_z']), (sx * foot[0], foot[1], 0.0), 0.034, 0.018, 0.016, 0.012))
    parts['legs'] = S.merge(legs)
    return parts


if __name__ == '__main__':
    out = [a for a in sys.argv[1:] if not a.startswith('--')][0]; os.makedirs(out, exist_ok=True)
    parts = build('--fast' in sys.argv)
    S.save_parts(os.path.join(out, 'parts.npz'), parts)
    bb = np.vstack([v for v, f in parts.values()]); print('габариты, см:', np.round((bb.max(0) - bb.min(0)) * 100, 1), 'треугольников:', sum(len(f) for v, f in parts.values()))
    if '--glb' in sys.argv: print('GLB:', S.export_glb(os.path.join(out, 'runvo.glb'), parts), 'треугольников обивки')
