#!/usr/bin/env python3
"""Подбор ткани для ручной модели по цвету на фото.

  python3 free-fab.py photo <id>                — цвет изделия на главном фото и 12 ближайших тканей библиотеки
  python3 free-fab.py shot <снимок.png> [<id>]  — цвет изделия на снимке 3D (free-shot.js); с id — разница с фото

Цвет — медиана по изделию (фон и тени отброшены), в координатах L (светлота), C (насыщенность), h (оттенок, градусы).
Оттенок и насыщенность важнее светлоты: светлоту правит exposure в поле light файла модели.
"""
import sys, csv, math, json, subprocess, os
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))

def lab(rgb):
    r, g, b = [x / 255 for x in rgb]
    f = lambda u: ((u + 0.055) / 1.055) ** 2.4 if u > 0.04045 else u / 12.92
    r, g, b = f(r), f(g), f(b)
    X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047; Y = 0.2126 * r + 0.7152 * g + 0.0722 * b; Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    g2 = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return (116 * g2(Y) - 16, 500 * (g2(X) - g2(Y)), 200 * (g2(Y) - g2(Z)))

def lch(L):
    return (L[0], math.hypot(L[1], L[2]), math.degrees(math.atan2(L[2], L[1])) % 360)

def product_lab(path, shot=False):
    """медиана Lab по изделию: фон — цвет углов; у снимка 3D отрезаем кнопки сверху и подпись снизу"""
    im = Image.open(path).convert('RGB'); w, h = im.size
    if shot: im = im.crop((0, int(h * 0.2), w, int(h * 0.86)))
    im.thumbnail((360, 360)); w, h = im.size; px = im.load()
    bg = px[2, 2]
    pts = [(x, y) for y in range(h) for x in range(w) if max(abs(px[x, y][i] - bg[i]) for i in range(3)) > 26]
    if not pts: return None
    y0 = min(p[1] for p in pts); y1 = max(p[1] for p in pts)
    cut = y0 + (y1 - y0) * 0.78                     # низ — ножки и тень
    labs = [lab(px[x, y]) for x, y in pts if y <= cut]
    # цветная обивка рядом с белой постелью или подушками (кровати): считаем только цветные точки
    col = [v for v in labs if math.hypot(v[1], v[2]) > 10]
    if len(col) >= 0.25 * len(labs) and len(col) < 0.9 * len(labs): labs = col
    else:
        # серая или тёмная обивка рядом с белой постелью: считаем только то, что темнее постели
        dark = [v for v in labs if v[0] < 72]; light = [v for v in labs if v[0] > 88 and math.hypot(v[1], v[2]) < 6]   # белая постель: очень светлая и почти без цвета
        if len(dark) >= 0.2 * len(labs) and len(light) >= 0.2 * len(labs): labs = dark
    med = lambda k: sorted(v[k] for v in labs)[len(labs) // 2]
    return (med(0), med(1), med(2))

def main_photo(mid):
    js = "global.window={};require('%s/ricca/js/catalog-data.js');const a=window.RICCA_CATALOG_ALL||window.RICCA_CATALOG;const m=a.find(x=>x.id===process.argv[1]);const p=(m.photos||[])[0];console.log(JSON.stringify([(p&&(p.src||p))||m.img,m.fab||'']))" % ROOT
    return json.loads(subprocess.check_output(['node', '-e', js, mid]))

def show(tag, L):
    l, c, hh = lch(L); return f'{tag}: L {l:.0f}  C {c:.0f}  h {hh:.0f}°'

def dist(A, B, wl=0.35):
    return math.hypot(A[1] - B[1], A[2] - B[2]) + wl * abs(A[0] - B[0])

if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'photo':
        mid = sys.argv[2]; src, fab = main_photo(mid); T = product_lab(os.path.join(ROOT, 'ricca', src))
        print(show(f'{mid} фото ({src})', T), '| сейчас в каталоге:', fab)
        rows = list(csv.DictReader(open(os.path.join(os.path.dirname(__file__), 'fabrics.tsv')), delimiter='\t'))
        out = []
        for r in rows:
            hx = r['hex'].lstrip('#'); L = lab(tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4)))
            out.append((dist(L, T), r['ref'], r['type'], r['name'], r['hex'], L))
        out.sort(key=lambda o: o[0])
        for o in out[:12]: print(f'  {o[0]:5.1f}  {o[1]:<18} {o[2]:<9} {o[3]:<22} {o[4]}  ' + show('', o[5])[2:])
    else:
        S = product_lab(sys.argv[2], shot=True); print(show('снимок 3D', S))
        if len(sys.argv) > 3:
            src, fab = main_photo(sys.argv[3]); T = product_lab(os.path.join(ROOT, 'ricca', src)); print(show('фото', T))
            ls, cs, hs = lch(S); lt, ct, ht = lch(T); dh = ((hs - ht + 180) % 360) - 180
            print(f'разница: светлота {ls - lt:+.0f}, насыщенность {cs - ct:+.0f}, оттенок {dh:+.0f}°  → расстояние {dist(S, T):.1f} (хорошо — до 10)')
