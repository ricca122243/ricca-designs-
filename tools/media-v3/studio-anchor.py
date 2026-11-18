#!/usr/bin/env python3
"""Кадры-детали (изделие уходит за край снимка): положить на холст 4 : 3 так, чтобы обрезанный край изделия совпал с краем рамки.
Раньше такой квадратный кадр стоял посреди рамки 4 : 3 и срез изделия «висел в воздухе» (жалоба владельца 12 ноября: «дешёвка»).
Правило: сторона, которой изделие касается края снимка, прижимается к тому же краю холста; свободные стороны получают поле в тон сайта.
Трогает только предметные кадры (studio) каталога, у которых изделие касается края и кадр не 4 : 3. Результат — файл с суффиксом -a,
запись кадра в js/catalog-data.js обновляется. Запуск: python3 tools/media-v3/studio-anchor.py   (повторный запуск ничего не меняет)."""
import os, sys, json, re, subprocess
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'); os.chdir(ROOT)
sys.dont_write_bytecode = True; sys.path.insert(0, 'tools/media-v3')
import numpy as np
from PIL import Image
from studio_box import product_box
T = np.array([250, 250, 248], np.uint8)
p = 'ricca/js/catalog-data.js'; s = open(p, encoding='utf-8').read()
cat = json.loads(subprocess.run(['node', '-e', "global.window={};require('./ricca/js/catalog-data.js');console.log(JSON.stringify(window.RICCA_CATALOG_ALL||window.RICCA_CATALOG))"], capture_output=True, text=True).stdout)
n = 0
for m_ in cat:
    if m_.get('category') not in ('sofas', 'beds', 'armchairs'): continue
    for q in m_['photos']:
        if not q.get('studio') or q['src'].endswith('-a.webp'): continue
        a = np.asarray(Image.open('ricca/' + q['src']).convert('RGB')); H, W = a.shape[:2]
        if abs(W / H - 4 / 3) <= 0.05: continue
        bb, _ = product_box(a)
        if bb is None: continue
        x0, y0, x1, y1 = [float(v) for v in bb]; bw, bh = x1 - x0, y1 - y0
        L, Tp, R, B = x0 <= 3, y0 <= 3, x1 >= W - 3, y1 >= H - 3
        if not (L or Tp or R or B): continue
        if L and R and bh > W * 0.75 * 0.96: R = False            # полоса во всю ширину выше рамки — прижимаем только слева
        if L and R: cw = W; ch = round(cw * 3 / 4)
        elif Tp and B: ch = H; cw = round(ch * 4 / 3)
        else:
            ch = max(bh / (0.9 if (Tp or B) else 0.72), bw / (0.9 if (L or R) else 0.76) * 0.75); ch = int(round(ch)); cw = int(round(ch * 4 / 3))
        ox = 0 if L else (cw - W if R else int(round(cw * 0.5 - (x0 + x1) / 2)))
        oy = 0 if Tp else (ch - H if B else int(round(ch * 0.52 - (y0 + y1) / 2)))
        c = a.copy(); mn = c.min(2); sat = c.max(2).astype(int) - mn.astype(int); c[(mn >= 242) & (sat < 8)] = T
        out = Image.new('RGB', (cw, ch), tuple(int(v) for v in T)); out.paste(Image.fromarray(c), (ox, oy))
        base = q['src'][:-5] + '-a'
        out.save('ricca/' + base + '.webp', 'WEBP', quality=88, method=6)
        sw = min(900, cw); out.resize((sw, round(ch * sw / cw)), Image.LANCZOS).save('ricca/' + base + '-600.webp', 'WEBP', quality=84, method=6)
        pat = re.compile(r'\{"src": "' + re.escape(q['src']) + r'".*?\}(?=,?\n)'); m = pat.search(s); assert m, q['src']
        e = json.loads(m.group(0)); e['src'] = base + '.webp'; e['src600'] = base + '-600.webp'; e['box'] = [round(min(bw, cw) / cw, 3), round(min(bh, ch) / ch, 3)]; e['w'] = cw; e['h'] = ch
        s = s[:m.start()] + json.dumps(e, ensure_ascii=False) + s[m.end():]; n += 1
open(p, 'w', encoding='utf-8').write(s)
print('деталей прижато к краю рамки:', n)
