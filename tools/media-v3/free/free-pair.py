#!/usr/bin/env python3
"""Лист «фото | 3D» для ручной модели: python3 free-pair.py <папка со снимками> <id> [<id> …]  → <папка>/pair-<id>.jpg
Слева главное фото модели из каталога, справа снимок 3D (freeshot.js). Сравнивать форму, пропорции, ткань, ракурс."""
import sys, json, subprocess, os
from PIL import Image
d = sys.argv[1]
cat = json.loads(subprocess.run(['node', '-e', "global.window={};require('/home/user/ricca-designs-/ricca/js/catalog-data.js');console.log(JSON.stringify((window.RICCA_CATALOG_ALL||window.RICCA_CATALOG).map(m=>({id:m.id,p:m.photos.map(q=>q.src)}))))"], capture_output=True, text=True).stdout)
ph = {m['id']: m['p'] for m in cat}
if sys.argv[1] == '--photos':   # лист всех фото модели: python3 free-pair.py --photos <папка> <id> …  → <папка>/photos-<id>.jpg
    d = sys.argv[2]; os.makedirs(d, exist_ok=True)
    for mid in sys.argv[3:]:
        ims = [Image.open('/home/user/ricca-designs-/ricca/' + f).convert('RGB') for f in ph[mid]]
        ims = [i.resize((900, round(i.height * 900 / i.width)), Image.LANCZOS) for i in ims]
        cols = 2 if len(ims) > 1 else 1; rows = (len(ims) + cols - 1) // cols; h = max(i.height for i in ims)
        c = Image.new('RGB', (cols * 908, rows * (h + 8)), 'white')
        for k, i in enumerate(ims): c.paste(i, ((k % cols) * 908, (k // cols) * (h + 8)))
        c.save(f'{d}/photos-{mid}.jpg', quality=90); print(f'{d}/photos-{mid}.jpg', c.size, len(ims), 'фото')
    sys.exit(0)
for mid in sys.argv[2:]:
    a = Image.open('/home/user/ricca-designs-/ricca/' + ph[mid][0]).convert('RGB'); a = a.resize((760, round(a.height * 760 / a.width)), Image.LANCZOS)
    shots = [f for f in [f'{d}/{mid}.png', f'{d}/{mid}-front.png', f'{d}/{mid}-side.png', f'{d}/{mid}-top.png'] if os.path.exists(f)]
    ims = [a] + [Image.open(f).convert('RGB') for f in shots]
    ims = [i.resize((760, round(i.height * 760 / i.width)), Image.LANCZOS) for i in ims]
    cols = 2; rows = (len(ims) + 1) // 2; h = max(i.height for i in ims)
    c = Image.new('RGB', (cols * 768, rows * (h + 8)), 'white')
    for k, i in enumerate(ims): c.paste(i, ((k % cols) * 768, (k // cols) * (h + 8)))
    c.save(f'{d}/pair-{mid}.jpg', quality=88); print(f'{d}/pair-{mid}.jpg', c.size)
