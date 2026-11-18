"""Runvo (armchair-07): кресло 0,97 × 0,85 × 0,74 м — круглое сиденье-«галька», высокий валик спинки, который огибает тыл и уходит
в правый подлокотник, четыре чёрные конические ножки вразлёт. Запуск: python runvo.py <out.glb> <папка кадров>"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bl_lib as L
import bpy

out, shots = sys.argv[1], sys.argv[2]
W, D, H, LEG = 0.97, 0.85, 0.74, 0.18
L.reset()
SC = 0.14                                          # половина толщины сиденья
seat = L.pebble('seat', 0.485, 0.43, SC, (0, -0.02, LEG + SC), n=3.2)
L.crown(seat, 0.012)
zc = 0.50                                          # валик спинки: от 0,26 до 0,74 м
a, b, cy = 0.38, 0.33, 0.05
pts = [(a * math.cos(math.radians(t)), cy + b * math.sin(math.radians(t)), zc) for t in range(116, -60, -4)]
back = L.tube('back', pts, 0.135, zscale=1.78)
L.soften(back, voxel=0.011, iters=24)
tops = [(sx * 0.26, sy * 0.22 - 0.02, LEG + 0.04) for sx in (-1, 1) for sy in (-1, 1)]
legs = [L.leg('leg', t, length=0.215, r_top=0.019, r_bot=0.009, splay=(13, 11)) for t in tops]
L.decimate(back, 30000)
fabric = L.join([seat, back], 'fabric'); lg = L.join(legs, 'legs')
print('fabric', L.tris(fabric), 'legs', L.tris(lg))
L.export3(out, fabric, lg)
L.render(os.path.join(shots, 'runvo-front.png'), fabric, lg, az=-12, el=6, dist=6.5, lens=100, target=(0, 0, 0.38), rgb=(0.36, 0.24, 0.15))
L.render(os.path.join(shots, 'runvo-top.png'), fabric, lg, az=22, el=38, dist=6.5, lens=100, target=(0, 0, 0.38), rgb=(0.36, 0.24, 0.15))
