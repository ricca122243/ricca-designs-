#!/usr/bin/env python3
"""Крупные планы для окна модели (15 ноября, владелец: «две фото приближенно, три фото других разных видов»).

У каждой модели в окне — до трёх видов изделия и два крупных плана. Где своих кадров-деталей меньше двух, крупный план
вырезается из настоящего студийного фото этой же модели (самый подробный вид): край с подлокотником и ткань у основания.
Это кадрирование настоящего снимка — без дорисовки; увеличение не больше ×1,25, мелкие исходники пропускаются.

Файлы: img/catalog/p-<id>-z<N>.webp (до 1200 px) и -600.webp (900 px). В js/catalog-data.js в фото модели дописывается
запись с "zoom": true. Повторный запуск ничего не дублирует. Запуск из корня: python3 tools/media-v3/zoom-crops.py
После — python3 tools/media-v3/models-data.py."""
import json, os, re, sys
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
import numpy as np
from studio_box import product_box

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'ricca'))
CAT = os.path.join(ROOT, 'js', 'catalog-data.js')
MIN_SRC = 480          # кадр уже этого (px исходника) не режем — будет мыльно
MAX_UP = 1.25
src = open(CAT, encoding='utf-8').read()
names = dict(re.findall(r'^\s*"?([a-z]+-\d+)"?\s*:\s*\'([^\']+)\'', src, re.M))
names.update(re.findall(r"'([a-z]+-\d+)': '([^']+)'", src))
GEN = {'sofas': 'дивана', 'beds': 'кровати', 'armchairs': 'кресла', 'poufs': 'пуфа'}


def items():
    for m in re.finditer(r'\n  \{\n    id: "([^"]+)",', src):
        start = m.start(); end = src.find('\n  }', start)
        yield m.group(1), start, end


def is_detail(p, a):
    if 'деталь' in p.get('alt', '') or p.get('zoom'): return True
    bb, _ = product_box(a)
    if bb is None: return True
    H, W = a.shape[:2]
    edges = (bb[0] <= W * 0.01) + (bb[2] >= W * 0.99) + (bb[1] <= H * 0.01) + (bb[3] >= H * 0.99)
    return edges >= 2


def save(im, base):
    w = min(1200, im.width); big = im.resize((w, round(w * 3 / 4)), Image.LANCZOS) if im.width != w else im
    big.save(os.path.join(ROOT, base + '.webp'), quality=88, method=6)
    sm = big.resize((900, 675), Image.LANCZOS) if big.width > 900 else big
    sm.save(os.path.join(ROOT, base + '-600.webp'), quality=86, method=6)
    return big.size


out = src; report = []
for pid, s0, s1 in items():
    block = src[s0:s1]
    if 'hidden: true' in block or not re.search(r'category: "(sofas|beds|armchairs|poufs)"', block): continue
    cat = re.search(r'category: "(\w+)"', block).group(1)
    ph = [json.loads(x) for x in re.findall(r'^\s*(\{"src".*?\}),?\s*$', block, re.M)]
    ph = [p for p in ph if os.path.exists(os.path.join(ROOT, p['src']))]
    if any(p.get('zoom') for p in ph): continue
    views, dets = [], []
    for p in ph:
        if not p.get('studio'): continue
        a = np.asarray(Image.open(os.path.join(ROOT, p['src'])).convert('RGB'))
        (dets if is_detail(p, a) else views).append((p, a))
    need = 2 - len(dets)
    if need <= 0 or not views: continue
    # самый подробный вид: шире всего изделие в пикселях
    best = max(views, key=lambda v: (lambda bb: 0 if bb is None else bb[2] - bb[0])(product_box(v[1])[0]))
    p, a = best; bb, _ = product_box(a); H, W = a.shape[:2]
    x0, y0, x1, y1 = [float(v) for v in bb]; bw, bh = x1 - x0, y1 - y0
    wide = bw / max(1, bh) > 1.6
    zones = [  # (центр x, центр y — доли изделия, ширина кадра — доля ширины изделия, подпись)
        (0.24 if wide else 0.32, 0.45, 0.5 if wide else 0.68, 'край и подлокотник'),
        (0.62, 0.64, 0.46 if wide else 0.62, 'ткань и основание'),
    ]
    made = []
    for k, (cx, cy, fw, cap) in enumerate(zones[:need] if need == 2 else zones[1:2]):
        cw = fw * bw; ch = cw * 3 / 4
        if cw < MIN_SRC: report.append(f'{pid}: мелкий исходник ({int(cw)} px) — без крупного плана'); break
        X = min(max(0, x0 + cx * bw - cw / 2), W - cw); Y = min(max(0, y0 + cy * bh - ch / 2), H - ch)
        crop = Image.fromarray(a).crop((round(X), round(Y), round(X + cw), round(Y + ch)))
        if crop.width * MAX_UP < 900: crop = crop  # 900 px превью может быть мельче — окно не растягивает больше ×1,1
        n = len(made) + 1 + len(dets)
        base = f'img/catalog/p-{pid}-z{n}'
        w, h = save(crop, base)
        name = names.get(pid, '')
        alt = f"{'Деталь ' + GEN[cat] + (' ' + name if name else '')}: {cap} — крупно"
        made.append({'src': base + '.webp', 'src600': base + '-600.webp', 'alt': alt, 'studio': True, 'zoom': True, 'w': w, 'h': h})
    if not made: continue
    # дописать в конец списка фото модели
    pb = block.find('    photos: ['); pe = block.find('\n    ]', pb)
    lines = ''.join(',\n      ' + json.dumps(m, ensure_ascii=False) for m in made)
    nb = block[:pe] + lines + block[pe:]
    nb = nb.replace('}\n,\n', '},\n')
    out = out.replace(block, nb, 1)
    report.append(f'{pid}: +{len(made)} крупно (из {os.path.basename(p["src"])}), видов {len(views)}, деталей {len(dets)}')

open(CAT, 'w', encoding='utf-8').write(out)
print('\n'.join(report))
