#!/usr/bin/env python3
"""Show start/end crop of each photo shot: framing.py config.json out.jpg"""
import json, sys
from PIL import Image, ImageDraw
cfg = json.load(open(sys.argv[1]))
W, H = cfg['W'], cfg['H']
AR = W / H
tw = 480 if W > H else 270
th = round(tw / AR)
rows = []
for s in cfg['shots']:
    if s['type'] != 'photo':
        continue
    im = Image.open(s['src']).convert('RGB')
    sw, sh = im.size
    tiles = []
    # overview with rects
    ov = im.copy()
    ov.thumbnail((th * 2, th))
    d = ImageDraw.Draw(ov)
    sc = ov.size[0] / sw
    crops = []
    for key, col in (('a', (0, 200, 0)), ('b', (230, 0, 0))):
        cx, cy, wf = s[key]
        w = wf * sw; h = w / AR
        x0, y0 = cx * sw - w / 2, cy * sh - h / 2
        d.rectangle([x0 * sc, y0 * sc, (x0 + w) * sc, (y0 + h) * sc], outline=col, width=2)
        crops.append(im.crop((round(x0), round(y0), round(x0 + w), round(y0 + h))).resize((tw, th), Image.LANCZOS))
    row = Image.new('RGB', (ov.size[0] + 2 * tw + 16, th), 'white')
    row.paste(ov, (0, 0)); row.paste(crops[0], (ov.size[0] + 8, 0)); row.paste(crops[1], (ov.size[0] + tw + 16, 0))
    rows.append(row)
mw = max(r.size[0] for r in rows)
out = Image.new('RGB', (mw, sum(r.size[1] + 8 for r in rows)), 'white')
y = 0
for r in rows:
    out.paste(r, (0, y)); y += r.size[1] + 8
out.save(sys.argv[2], quality=85)
