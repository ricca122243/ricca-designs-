#!/usr/bin/env python3
"""Подогнать ручную модель под точные размеры изделия (из описания каталога):
   python3 free-scale.py <id> <ширина> <глубина> <высота>   (см)
Масштабирует все детали по трём осям (положения, размеры, трубы, оболочки ushell, поле measure и size).
Скругления (r, rx, rTop…) не меняются — мягкость остаётся прежней. Перед правкой кладёт копию <id>.json.bak."""
import json, sys, os, shutil
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
mid, W, D, H = sys.argv[1], *[float(v) / 100 for v in sys.argv[2:5]]
p = os.path.join(ROOT, 'ricca', 'models3d', 'free', mid + '.json'); s = json.load(open(p))
shutil.copyfile(p, p + '.bak')
fx, fz, fy = W / s['size'][0], D / s['size'][1], H / s['size'][2]
r = lambda v: round(v, 4)
for it in s['items']:
    k = it.get('k', 'box')
    if 'p' in it: it['p'] = [r(it['p'][0] * fx), r(it['p'][1] * fy), r(it['p'][2] * fz)]
    if 's' in it and k != 'ushell':
        sx, sy, sz = it['s']
        if k == 'part' and it.get('decorKind') == 'pillow': it['s'] = [r(sx * fx), sy, r(sz * fy)]   # подушка: s = [ширина, толщина, высота]
        else: it['s'] = [r(sx * fx), r(sy * fy), r(sz * fz)]
    if 'pts' in it: it['pts'] = [[r(q[0] * fx), r(q[1] * fy), r(q[2] * fz)] for q in it['pts']]
    if k == 'ushell':
        for key, f in (('W', fx), ('D', fz), ('h', fy), ('armH', fy), ('y0', fy), ('tS', fx), ('tB', fz)):
            if key in it: it[key] = r(it[key] * f)
for key, f in (('seatH', fy), ('armH', fy), ('legH', fy), ('railH', fy), ('mTop', fy), ('armW', fx), ('seatD', fz)):
    if key in s.get('measure', {}): s['measure'][key] = r(s['measure'][key] * f)
s['size'] = [W, D, H]
json.dump(s, open(p, 'w'), ensure_ascii=False, indent=1)
print(mid, 'масштаб x%.3f y%.3f z%.3f →' % (fx, fy, fz), [round(v * 100) for v in s['size']], 'см')
