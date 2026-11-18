"""Venra (sofa-22): низкий диван-«ванна» 2,50 × 0,95 × 0,60 м — цельная скруглённая оболочка, две плоские подушки, низкие опоры.
Запуск: python venra.py <out.glb> <папка для проверочных кадров>"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bl_lib as L

out, shots = sys.argv[1], sys.argv[2]
W, D, H, FOOT = 2.50, 0.95, 0.60, 0.03
ARM, BACK, DECK = 0.29, 0.28, 0.17          # толщина подлокотника и спинки, высота настила под подушками
L.reset()
body = L.box('body', (W, D, H - FOOT), (0, 0, FOOT + (H - FOOT) / 2), bevel=0.143, seg=12)
well = L.box('well', (W - 2 * ARM, D - BACK + 0.4, 1.0), (0, -(BACK + 0.4) / 2, DECK + 0.5), bevel=0.05, seg=6)
L.boolean(body, well, 'DIFFERENCE')
L.soften(body, voxel=0.011, iters=16)
cw = (W - 2 * ARM) / 2 + 0.006; cd = D - BACK + 0.0; ct = 0.20
cush = []
for sx in (-1, 1):
    c = L.box('cush', (cw, cd, ct), (sx * (cw / 2 + 0.004), -D / 2 + cd / 2 + 0.03, DECK + ct / 2 - 0.012), bevel=0.075, seg=10)
    L.subsurf(c, 1); L.crown(c, 0.022); cush.append(c)
feet = [L.cyl('foot', 0.045, FOOT + 0.02, (sx * (W / 2 - 0.30), sy * (D / 2 - 0.16), FOOT / 2 + 0.01)) for sx in (-1, 1) for sy in (-1, 1)]
L.decimate(body, 52000)
fabric = L.join([body] + cush, 'fabric'); legs = L.join(feet, 'legs')
print('fabric tris', L.tris(fabric), 'legs tris', L.tris(legs))
L.export(out, fabric, legs)
L.render(os.path.join(shots, 'venra-front.png'), fabric, legs, az=0, el=3, dist=11, lens=100, target=(0, 0, 0.3))
L.render(os.path.join(shots, 'venra-34.png'), fabric, legs, az=34, el=9, dist=11, lens=100, target=(0, 0, 0.3))
