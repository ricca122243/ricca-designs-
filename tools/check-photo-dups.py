"""Проверка повторов: одинаковые и почти одинаковые предметные фото в каталоге (владелец, 11 ноября: «один диван повторился — не допускай»).
Запуск из корня: python3 tools/check-photo-dups.py — печатает пары с расстоянием меньше 0,30 (меньше 0,15 — почти наверняка один и тот же кадр)."""
import os, sys, json, subprocess
os.chdir('/home/user/ricca-designs-'); sys.dont_write_bytecode = True; sys.path.insert(0, 'tools/media-v3')
import numpy as np
from PIL import Image
from studio_box import product_box
cat = json.loads(subprocess.run(['node', '-e', "global.window={};require('./ricca/js/catalog-data.js');console.log(JSON.stringify({c:window.RICCA_CATALOG,n:window.RICCA_MODEL_NAMES}))"], capture_output=True, text=True).stdout)
def sig(path):
    im = Image.open(path).convert('RGB'); a = np.asarray(im); bb, _ = product_box(a)
    if bb is not None and bb[2] - bb[0] > 20 and bb[3] - bb[1] > 20: im = im.crop(tuple(int(v) for v in bb))
    g = np.asarray(im.convert('L').resize((32, 32), Image.LANCZOS)).astype(float); return (g - g.mean()) / (g.std() + 1e-6), im.width / im.height
R = []
for m in cat['c']:
    if m.get('category') not in ('sofas', 'beds', 'armchairs'): continue
    for k, p in enumerate(m['photos']):
        if not p.get('studio'): continue
        s, ar = sig('ricca/' + p.get('src600', p['src'])); R.append((cat['n'].get(m['id'], m['id']), m['id'], k, s, ar))
pairs = []
for i in range(len(R)):
    for j in range(i + 1, len(R)):
        d = float(np.abs(R[i][3] - R[j][3]).mean()) + 0.6 * abs(np.log(R[i][4] / R[j][4]))
        if d < 0.30: pairs.append((round(d, 2), f'{R[i][0]}#{R[i][2]}', f'{R[j][0]}#{R[j][2]}', R[i][1] == R[j][1]))
for p in sorted(pairs): print(p)
