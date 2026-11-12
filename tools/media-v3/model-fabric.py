#!/usr/bin/env python3
"""Ткань для 3D каждой модели — ближайшая по цвету к обивке на главном фото (владелец, 12 ноября: «3D — прямо как на фото»).
Считает преобладающий цвет изделия на главном кадре, находит ближайший цвет в библиотеке тканей (js/fabrics-data.js, по ΔE в Lab)
и записывает в js/catalog-data.js поле fab: "<коллекция>:<N>" — как в адресе конструктора (&f=alba:12).
Конструктор открывает модель сразу в этой ткани; клиент меняет её как обычно.
Запуск: python3 tools/media-v3/model-fabric.py   (повторный запуск обновляет значения)."""
import os, sys, json, re, subprocess
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'); os.chdir(ROOT)
import numpy as np
from PIL import Image
def lab(rgb):
    c = np.asarray(rgb, float) / 255.0; c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]); xyz = c @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
js = "global.window={};require('./ricca/js/catalog-data.js');require('./ricca/js/fabrics-data.js');console.log(JSON.stringify({c:window.RICCA_CATALOG_ALL||window.RICCA_CATALOG,f:window.RICCA_FABRIC_LIBRARY}))"
d = json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True).stdout)
fabs = []
for t in d['f']['types'] if isinstance(d['f'], dict) else d['f']:
    for c in t['collections']:
        cols = [x for x in c['colours'] if x and x.get('name') and (x.get('src450') or x.get('src900'))]   # номер цвета — как в js/cfg/fabrics.js
        for i, col in enumerate(cols):
            h = col.get('hex', '').lstrip('#')
            if len(h) == 6: fabs.append((f"{c['id']}:{col.get('n', i + 1)}", [int(h[k:k + 2], 16) for k in (0, 2, 4)], t['id']))
FL = lab(np.array([f[1] for f in fabs]))
def dominant(path, bed):
    a = np.asarray(Image.open(path).convert('RGB').resize((300, 225) if True else None)).reshape(-1, 3).astype(float)
    mn = a.min(1); sat = a.max(1) - mn
    m = ~((mn >= 236) & (sat < 12))                      # не фон
    if bed:                                              # постель белая — обивку ищем среди остального, если его достаточно
        m2 = m & ~((mn >= 196) & (sat < 22))
        if m2.sum() >= 0.06 * len(a): m = m2
    p = a[m]
    if len(p) < 50: return None
    L = lab(p); rng = np.random.default_rng(0); cen = L[rng.choice(len(L), 4, replace=False)]
    for _ in range(12):                                  # k-средних: 4 группы, берём самую большую (у двухцветных — основную ткань)
        k = ((L[:, None, :] - cen[None]) ** 2).sum(2).argmin(1)
        cen = np.array([L[k == j].mean(0) if (k == j).any() else cen[j] for j in range(4)])
    cnt = np.bincount(k, minlength=4).astype(float)
    cnt *= np.where(cen[:, 0] < 22, 0.35, 1.0)           # очень тёмная группа — чаще тень и ножки, чем ткань
    return cen[cnt.argmax()]
p = 'ricca/js/catalog-data.js'; s = open(p, encoding='utf-8').read(); n = 0; rep = []
for m in d['c']:
    if m.get('category') not in ('sofas', 'beds', 'armchairs', 'poufs') or not m.get('cfg'): continue
    ph = next((q for q in m['photos'] if q.get('studio')), m['photos'][0]); c = dominant('ricca/' + ph.get('src600', ph['src']), m['category'] == 'beds')
    if c is None: continue
    dE = np.sqrt(((FL - c) ** 2).sum(1)); k = int(dE.argmin()); ref = fabs[k][0]
    i = s.find(f'    id: "{m["id"]}",\n'); j = s.index('\n  }', i); blk = s[i:j]
    blk = re.sub(r'\n    fab: "[^"]*",', '', blk); blk = re.sub(r'(\n    cfg: "[^"]*",)', lambda mm: mm.group(1) + f'\n    fab: "{ref}",', blk, count=1)
    s = s[:i] + blk + s[j:]; n += 1; rep.append((m['id'], ref, round(float(dE[k]), 1)))
open(p, 'w', encoding='utf-8').write(s)
print('ткань подобрана моделям:', n, '· среднее отличие цвета ΔE:', round(float(np.mean([r[2] for r in rep])), 1), '· худшие:', sorted(rep, key=lambda r: -r[2])[:5])
json.dump(rep, open('/tmp/model-fabric.json', 'w'))
