#!/usr/bin/env python3
"""ELUNA loop v2 — calm 10 s cycle (review F1, 9 Oct):
closed hold 1.4 s -> cover dissolves away 0.8 s -> slow open 2.3 s -> exploded hold 2.6 s -> slow reassemble 2.1 s
-> cover returns 0.8 s. The stack is scaled to 0.88 with ~12 % headroom on pure black, and the top edge of the
render gets a short fade, so layers entering from above never look sliced by the frame edge.

Usage: eluna2.py OUT_master.mp4 [W H] [--poster DIR]
"""
import subprocess, sys
import numpy as np
from PIL import Image

SRC = '/home/user/ricca-designs-/ricca/img/eluna/seq/f%02d.webp'
out = sys.argv[1]
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 and sys.argv[2].isdigit() else (1280, 720)
poster_dir = sys.argv[sys.argv.index('--poster') + 1] if '--poster' in sys.argv else None
fps = 25
import os
SCALE, TOP, FADE = 0.88, 0.115, float(os.environ.get('ELUNA_FADE', '0.075'))  # stack scale, top offset (share of H), top-edge fade (share of scaled height)

raw = [Image.open(SRC % i).convert('RGB') for i in range(1, 25)]
sw, sh = int(round(W * SCALE)), int(round(H * SCALE))
x0, y0 = (W - sw) // 2, int(round(H * TOP))
ramp = np.ones((sh, 1, 1), np.float32)
fh = max(1, int(round(sh * FADE)))
_x = np.linspace(0, 1, fh); ramp[:fh, 0, 0] = _x * _x * (3 - 2 * _x)

def place(im):
    small = np.asarray(im.resize((sw, sh), Image.LANCZOS), np.float32) * ramp
    canvas = np.zeros((H, W, 3), np.float32)
    h = min(sh, H - y0)
    canvas[y0:y0 + h, x0:x0 + sw] = small[:h]
    return canvas

fr = [place(im) for im in raw]          # 0..23  (f01..f24)

def sm(x):
    x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)

# opening f09..f24 (index 8..23): progress weighted by the visual change, so big jumps get more time
lo, hi = 8, 23
g = [np.asarray(raw[i].convert('L').resize((320, 180)), float) for i in range(24)]
d = [np.abs(g[i + 1] - g[i]).mean() for i in range(lo, hi)]
m = sum(d) / len(d)
cum = [0.0]
for x in d:
    cum.append(cum[-1] + (x + m) / 2)

def idx(e):
    target = e * cum[-1]
    for k in range(len(d)):
        if cum[k + 1] >= target:
            return lo + k + (target - cum[k]) / (cum[k + 1] - cum[k])
    return float(hi)

def at(p):
    a = int(p); f = p - a
    if a >= 23 or f < 1e-4:
        return fr[min(a, 23)]
    return fr[a] * (1 - f) + fr[a + 1] * f

HOLD0, DIS, OPEN, HOLD1, CLOSE = 1.4, 0.8, 2.3, 2.6, 2.1
T = HOLD0 + DIS + OPEN + HOLD1 + CLOSE + DIS   # 10.0 s

def frame(t):
    if t < HOLD0:
        return fr[0]
    t -= HOLD0
    if t < DIS:
        a = sm(t / DIS); return fr[0] * (1 - a) + fr[lo] * a
    t -= DIS
    if t < OPEN:
        return at(idx(sm(t / OPEN)))
    t -= OPEN
    if t < HOLD1:
        return fr[hi]
    t -= HOLD1
    if t < CLOSE:
        return at(idx(1 - sm(t / CLOSE)))
    t -= CLOSE
    a = sm(t / DIS); return fr[lo] * (1 - a) + fr[0] * a

n = round(T * fps)
if poster_dir:
    Image.fromarray(np.clip(fr[0], 0, 255).astype(np.uint8)).save(f'{poster_dir}/eluna-poster-{W}.png')
    Image.fromarray(np.clip(fr[hi], 0, 255).astype(np.uint8)).save(f'{poster_dir}/eluna-poster-open-{W}.png')
cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
       '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-crf', '6', '-preset', 'medium',
       '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', out]
pr = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for i in range(n):
    pr.stdin.write(np.clip(frame(i / fps) + 0.5, 0, 255).astype(np.uint8).tobytes())
pr.stdin.close(); pr.wait()
print('frames', n, 'T', T, out)
