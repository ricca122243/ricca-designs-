#!/usr/bin/env python3
"""Кадры «изделие крупно» для страниц моделей (владелец, 16 ноября: «почему она далеко», затем «качество ужас»).

Увеличение в браузере (transform: scale) на iPhone мылит картинку. Поэтому кадр готовится заранее: из оригинального
студийного фото вырезается рамка 4:3 вокруг изделия (изделие ≈ 86 % ширины, ≤ 80 % высоты), без увеличения — пиксели
оригинала 1:1, только уменьшение до 2000 px. Где рамка выходит за край снимка — дополняется цветом фона.
Файлы: img/catalog/t/<имя>.webp, список — img/catalog/t/tight.json {src: [файл, w, h]}.
Запуск из корня: python3 tools/media-v3/tight-crops.py, затем node tools/model-pages.mjs."""
import json, os, re, sys, subprocess
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
import numpy as np
from studio_box import product_box, corners_bg

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'ricca'))
OUT = os.path.join(ROOT, 'img', 'catalog', 't'); os.makedirs(OUT, exist_ok=True)
js = "global.window={};require('%s/js/catalog-data.js');const o=[];for(const m of window.RICCA_CATALOG_ALL)for(const p of m.photos)if(p.studio&&!p.scene&&!/-(d\\d|z\\d|c\\d)/.test(p.src))o.push(p.src);console.log(JSON.stringify(o))" % ROOT
srcs = json.loads(subprocess.check_output(['node', '-e', js]))
res = {}
for src in srcs:
    im = Image.open(os.path.join(ROOT, src)).convert('RGB'); a = np.asarray(im); H, W = a.shape[:2]
    bb, _ = product_box(a)
    if not bb: continue
    x0, y0, x1, y1 = bb; bw, bh = x1 - x0, y1 - y0
    cw = max(bw / 0.86, bh / 0.80 * 4 / 3); ch = cw * 3 / 4
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 + bh * 0.02
    L, T = round(cx - cw / 2), round(cy - ch / 2); cw, ch = round(cw), round(ch)
    bg = tuple(int(v) for v in corners_bg(a.astype(np.float32)))
    can = Image.new('RGB', (cw, ch), bg); can.paste(im, (-L, -T))
    if cw > 2000: can = can.resize((2000, round(2000 * ch / cw)), Image.LANCZOS)
    name = os.path.basename(src); can.save(os.path.join(OUT, name), 'WEBP', quality=92, method=6)
    small = can.resize((900, round(900 * can.height / can.width)), Image.LANCZOS); small.save(os.path.join(OUT, name.replace('.webp', '-900.webp')), 'WEBP', quality=90, method=6)
    res[src] = ['img/catalog/t/' + name, can.width, can.height]
json.dump(res, open(os.path.join(OUT, 'tight.json'), 'w'))
print('кадров:', len(res), 'из', len(srcs))
