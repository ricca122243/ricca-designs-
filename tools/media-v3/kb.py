#!/usr/bin/env python3
"""Ken Burns loop renderer (subpixel-precise, no jitter).

Usage: kb.py config.json out_intermediate.mp4 [--preview DIR]
config: {"W":1600,"H":900,"fps":25,"fade":1.0,
         "shots":[{"type":"photo","src":..., "L":4.0,
                   "a":[cx,cy,w], "b":[cx,cy,w]},   # fractions of source width/height; w = crop width / source width
                  {"type":"frames","dir":..., "L":2.6}]}
Timeline: shot k visible L_k seconds, consecutive shots overlap by `fade`;
last shot fades into the first; frame 0 = shot 0 fully visible (after its fade-in).
"""
import json, sys, os, subprocess, math, glob
from PIL import Image

cfg = json.load(open(sys.argv[1]))
out = sys.argv[2]
preview = None
if len(sys.argv) > 3 and sys.argv[3] == '--preview':
    preview = sys.argv[4]
W, H, fps, F = cfg['W'], cfg['H'], cfg['fps'], cfg.get('fade', 1.0)
AR = W / H
shots = cfg['shots']
N = len(shots)

def smooth(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)

# prepare
for s in shots:
    if s['type'] == 'photo':
        im = Image.open(s['src']).convert('RGB')
        sw, sh = im.size
        rects = []
        for key in ('a', 'b'):
            cx, cy, wf = s[key]
            w = wf * sw
            h = w / AR
            rects.append([cx * sw - w / 2, cy * sh - h / 2, w, h])
        for r in rects:
            assert r[0] >= -0.01 and r[1] >= -0.01 and r[0] + r[2] <= sw + 0.01 and r[1] + r[3] <= sh + 0.01, (s['src'], r, sw, sh)
        maxw = max(r[2] for r in rects)
        k = W / maxw  # pre-scale so the widest window == output width
        if abs(k - 1) > 1e-3:
            im = im.resize((round(sw * k), round(sh * k)), Image.LANCZOS)
        kx = im.size[0] / sw
        ky = im.size[1] / sh
        s['_im'] = im
        s['_rects'] = [[r[0] * kx, r[1] * ky, r[2] * kx, r[3] * ky] for r in rects]
        s['_upscale'] = W / min(r[2] for r in rects)  # source px -> output px at tightest window
    else:
        files = sorted(glob.glob(os.path.join(s['dir'], '*.png')))
        s['_frames'] = files
        s['L'] = s.get('L', len(files) / fps)
        assert len(files) >= round(s['L'] * fps), (len(files), s['L'])

starts = []
t = 0.0
for s in shots:
    starts.append(t)
    t += s['L'] - F
T = t  # loop length
nframes = round(T * fps)
sys.stderr.write('loop T=%.3fs frames=%d\n' % (T, nframes))
for s in shots:
    if s['type'] == 'photo':
        sys.stderr.write('  %s L=%.2f max upscale vs source %.2fx\n' % (os.path.basename(s['src']), s['L'], s['_upscale']))

def render_shot(s, lt):
    """lt: local time in [0, L)"""
    if s['type'] == 'photo':
        u = lt / s['L']
        # gentle ease so motion never "starts" abruptly but stays almost linear
        e = 0.85 * u + 0.15 * smooth(u)
        a, b = s['_rects']
        x = a[0] + (b[0] - a[0]) * e
        y = a[1] + (b[1] - a[1]) * e
        w = a[2] + (b[2] - a[2]) * e
        h = w / AR
        return s['_im'].transform((W, H), Image.EXTENT, (x, y, x + w, y + h), resample=Image.BICUBIC)
    else:
        i = min(int(round(lt * fps)), len(s['_frames']) - 1)
        im = Image.open(s['_frames'][i]).convert('RGB')
        if im.size != (W, H):
            im = im.resize((W, H), Image.LANCZOS)
        return im

def frame_at(g):
    tau = g + F  # frame 0 = shot 0 just after its fade-in
    layers = []  # (start, shot, local)
    for k, s in enumerate(shots):
        for off in (0.0, T):
            lt = tau - starts[k] - off
            if 0 <= lt < s['L'] - 1e-9:
                layers.append((starts[k] + off, k, lt))
    layers.sort()
    assert 1 <= len(layers) <= 2, (g, layers)
    base = render_shot(shots[layers[0][1]], layers[0][2])
    if len(layers) == 2:
        k, lt = layers[1][1], layers[1][2]
        alpha = smooth(lt / F)
        top = render_shot(shots[k], lt)
        base = Image.blend(base, top, alpha)
    return base

if preview:
    os.makedirs(preview, exist_ok=True)
    for sec in range(int(math.ceil(T)) + 1):
        g = min(sec, T - 1.0 / fps)
        frame_at(g).save(os.path.join(preview, 'p%02d.jpg' % sec), quality=88)
    sys.exit(0)

cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (W, H), '-r', str(fps), '-i', '-',
       '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
       '-c:v', 'libx264', '-preset', 'medium', '-crf', '6', '-colorspace', 'bt709', '-color_primaries', 'bt709',
       '-color_trc', 'bt709', '-color_range', 'tv', out]
p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
for i in range(nframes):
    p.stdin.write(frame_at(i / fps).tobytes())
p.stdin.close()
p.wait()
sys.stderr.write('done %s\n' % out)
