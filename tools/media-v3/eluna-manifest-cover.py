"""ELUNA tile cover from the owner's «Манифест» poster (1792x2400).
4:5 — the poster itself, trimmed top/bottom. 16:7 — the poster's own elements re-laid out
(logo, «МАНИФЕСТ» + headline, mattress, RICCA DESIGNS) on a matching starry sky, lighten-blended."""
import numpy as np
from PIL import Image, ImageChops

SRC = '/home/user/ricca-designs-/ricca/content/eluna/eluna-manifest-poster-src.png'
OUT = '/tmp/claude-0/-home-user-ricca-designs-/af9da8db-05a5-58b4-b4cb-5bd9366cc95c/scratchpad/eluna'
im = Image.open(SRC).convert('RGB')
W, H = im.size
a = np.asarray(im).astype(np.float64)
L = a.mean(2)


def bbox(y0, y1, thr=120, pad=24):
    cols = np.where((L[y0:y1] > thr).sum(0) > 0)[0]
    return max(0, cols[0] - pad), min(W, cols[-1] + pad)


# 4:5 — trim 160 px (70 top, 90 bottom)
p = im.crop((0, 70, W, 70 + int(W / 0.8)))
p = p.resize((1200, 1500), Image.LANCZOS)
p.save(OUT + '/manifest-portrait.png')

# 16:7 background: per-row sky colour from the poster's empty columns, plus its own stars
rng = np.random.default_rng(7)
CW, CH = 1200, 525
sky_rows = np.median(a[:, -260:-60] if False else a[:, 1500:1780], axis=1)  # right margin above/below mattress
top, mid = np.median(a[0:90].reshape(-1, 3), 0), np.median(a[1020:1150].reshape(-1, 3), 0)
yy = np.linspace(0, 1, CH)[:, None, None]
bg = top[None, None] * (1 - yy) + mid[None, None] * yy + np.zeros((CH, CW, 3))
bg += rng.normal(0, 0.8, bg.shape)
n = 420
for y, x, amp in zip(rng.uniform(0, CH, n), rng.uniform(0, CW, n), 25 + 140 * rng.random(n) ** 3):
    yi, xi = int(y), int(x)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if 0 <= yi + dy < CH and 0 <= xi + dx < CW:
                w = np.exp(-((dy) ** 2 + (dx) ** 2) / 0.6)
                bg[yi + dy, xi + dx] += amp * w
canvas = Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8))


def place(box, scale, xy, feather=0, edges='ltb'):
    global canvas
    part = im.crop(box)
    part = part.resize((max(1, int(part.width * scale)), max(1, int(part.height * scale))), Image.LANCZOS)
    if feather:
        pa = np.asarray(part).astype(np.float64)
        h, w = pa.shape[:2]
        m = np.ones((h, w))
        r = np.linspace(0, 1, feather)
        if 'l' in edges: m[:, :feather] *= r[None]
        if 'r' in edges: m[:, -feather:] *= r[::-1][None]
        if 't' in edges: m[:feather] *= r[:, None]
        if 'b' in edges: m[-feather:] *= r[::-1][:, None]
        part = Image.fromarray((pa * m[..., None] ** 1.5).astype(np.uint8))
    layer = Image.new('RGB', canvas.size, (0, 0, 0))
    layer.paste(part, xy)
    canvas = ImageChops.lighter(canvas, layer)
    return part.size


lx0, lx1 = bbox(110, 220)
hx0, hx1 = 96, 1520
mx0, mx1 = bbox(1430, 1960, thr=60)
rx0, rx1 = bbox(2255, 2305)
s_logo = 34 / (207 - 121)
place((lx0, 100, lx1, 228), s_logo, (40, 34), feather=8, edges='ltrb')
s_head = 0.33
hw = place((hx0, 420, hx1, 1200), s_head, (40, 84), feather=18, edges="ltrb")
s_m = 0.355
mw = place((mx0, 1380, W, 2000), s_m, (CW - int((W - mx0) * s_m), 262), feather=40, edges='ltb')
place((rx0, 2245, rx1, 2315), 0.42, (40, 462), feather=8, edges='ltrb')
canvas.save(OUT + '/manifest-wide.png')
sheet = Image.new('RGB', (600 + 20 + 1200, 750), (250, 250, 248))
sheet.paste(p.resize((600, 750), Image.LANCZOS), (0, 0))
sheet.paste(canvas, (620, 0))
sheet.save(OUT + '/manifest-sheet.jpg', quality=88)
print('boxes', (lx0, lx1), (hx0, hx1), (mx0, mx1), (rx0, rx1), hw, mw)
