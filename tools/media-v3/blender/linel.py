"""Linel (bed-26): кровать 1,76 × 2,16 м — тонкое изголовье 1,10 м со скруглёнными верхними углами, прямой мягкий короб на
чёрных ножках-пластинах, матрас, одеяло с отворотом, четыре подушки. Запуск: python linel.py <out.glb> <папка кадров>"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bl_lib as L

out, shots = sys.argv[1], sys.argv[2]
MW, ML = 1.60, 2.00                       # матрас
BW, BL, BH, LEG = 1.74, 2.10, 0.26, 0.19  # короб и ножки
HW, HH, HT = 1.86, 1.12, 0.085            # изголовье: ширина, высота от пола, толщина
L.reset()
base = L.box('base', (BW, BL, BH), (0, 0, LEG + BH / 2), bevel=0.035, seg=6)
head = L.box('head', (HW, HT, HH - 0.06), (0, BL / 2 + HT / 2 - 0.01, 0.06 + (HH - 0.06) / 2))
L.round_top_corners(head, 0.11, 12); L.soft_edges(head, 0.02, 5)
top = LEG + BH
mat = L.box('mat', (MW, ML, 0.22), (0, -0.01, top - 0.10 + 0.11), bevel=0.05, seg=6)
duv = L.box('duv', (MW + 0.05, ML * 0.70, 0.06), (0, -ML / 2 + ML * 0.35 - 0.02, top + 0.12 + 0.012), bevel=0.028, seg=5); L.crown(duv, 0.012)
fold = L.box('fold', (MW + 0.05, 0.22, 0.065), (0, -ML / 2 + ML * 0.70 + 0.07, top + 0.12 + 0.035), bevel=0.03, seg=5)
py = BL / 2 - 0.27; pz = top + 0.12
pil = [L.pillow('p', (0.72, 0.44, 0.20), (sx * 0.39, py + 0.12, pz + 0.23), rot=(58, 0, 0)) for sx in (-1, 1)]
pil += [L.pillow('p', (0.58, 0.36, 0.17), (sx * 0.37, py - 0.10, pz + 0.19), rot=(48, 0, sx * -4)) for sx in (-1, 1)]
legs = [L.box('leg', (0.022, 0.09, LEG + 0.02), (sx * (BW / 2 - 0.035), sy * (BL / 2 - 0.10), LEG / 2 + 0.01)) for sx in (-1, 1) for sy in (-1, 1)]
legs += [L.box('leg', (0.022, 0.05, 0.08), (sx * (HW / 2 - 0.05), BL / 2 + HT / 2 - 0.01, 0.04)) for sx in (-1, 1)]
fabric = L.join([base, head], 'fabric'); bedding = L.join([mat, duv, fold] + pil, 'bedding'); lg = L.join(legs, 'legs')
print('fabric', L.tris(fabric), 'bedding', L.tris(bedding), 'legs', L.tris(lg))
L.export3(out, fabric, lg, bedding); L.white(bedding)
L.render(os.path.join(shots, 'linel-34.png'), fabric, lg, az=-40, el=11, dist=13, lens=100, target=(0, 0.05, 0.5), rgb=(0.52, 0.53, 0.55))
