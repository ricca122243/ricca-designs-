"""ELUNA tile cover from the owner's starry-sky mattress image.

The source is landscape (875x721); the tile needs 4:5 (1200x1500, 600x750)
and 16:7 (1200x525). The mattress is never cropped or altered: the night sky
around it is continued (base colour extrapolated from the source sky, faint
nebula, stars with the same density as in the source) and blended in under a
feathered seam that lies entirely in sky.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]
rng = np.random.default_rng(13)
src_im = Image.open(SRC).convert('RGB')
src_im = src_im.crop((0, 1, src_im.width, src_im.height))  # the first row is a light compression line


def box(a, r):
    """Box blur of an HxW(xC) float array with radius r (edge-clamped)."""
    if r < 1:
        return a
    out = a
    for ax in (0, 1):
        n = out.shape[ax]
        pad = [(0, 0)] * out.ndim
        pad[ax] = (r + 1, r)
        p = np.pad(out, pad, mode='edge')
        c = np.cumsum(p, axis=ax)
        hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=ax)
        lo = np.take(c, np.arange(0, n), axis=ax)
        out = (hi - lo) / (2 * r + 1)
    return out


def gblur(a, sigma):
    r = max(1, int(round(sigma * 0.87)))  # 3 box passes ~ gaussian
    for _ in range(3):
        a = box(a, r)
    return a


def compose(W, H, scale, ox, oy, feather_edges, name, feather=80):
    sw, sh = round(src_im.width * scale), round(src_im.height * scale)
    s = src_im.resize((sw, sh), Image.LANCZOS)
    if scale > 1:
        s = s.filter(ImageFilter.UnsharpMask(radius=1.2, percent=35, threshold=2))
    S = np.asarray(s).astype(np.float64)

    # sky mask inside the source: dark pixels away from the mattress, stars removed
    L = np.asarray(s.convert('L').filter(ImageFilter.MedianFilter(7))).astype(np.float64)
    sky = (L < 52).astype(np.float64)
    sky = np.minimum(sky, (gblur(sky, 6) > 0.98))  # stay clear of the mattress glow edge
    smooth_src = np.asarray(s.filter(ImageFilter.MedianFilter(7))).astype(np.float64)

    canvas = np.zeros((H, W, 3))
    mask = np.zeros((H, W))
    canvas[oy:oy + sh, ox:ox + sw] = smooth_src * sky[..., None]
    mask[oy:oy + sh, ox:ox + sw] = sky

    # push-pull fill: a smooth extrapolation of the source sky, no hard scale switches
    def resize_f(a, size):
        return np.stack([np.asarray(Image.fromarray(a[..., c].astype(np.float32), 'F').resize(size, Image.BILINEAR)) for c in range(a.shape[2])], -1).astype(np.float64)
    levels = [(canvas, mask)]
    while min(levels[-1][1].shape) > 4:
        c, m = levels[-1]
        h2, w2 = (m.shape[0] + 1) // 2, (m.shape[1] + 1) // 2
        cm = np.pad(c * m[..., None], ((0, h2 * 2 - m.shape[0]), (0, w2 * 2 - m.shape[1]), (0, 0)))
        mm = np.pad(m, ((0, h2 * 2 - m.shape[0]), (0, w2 * 2 - m.shape[1])))
        sw_ = cm.reshape(h2, 2, w2, 2, 3).sum((1, 3))
        mw = mm.reshape(h2, 2, w2, 2).sum((1, 3))
        levels.append((sw_ / np.maximum(mw, 1e-9)[..., None], np.minimum(mw, 1.0)))
    filled_c = levels[-1][0].copy()
    filled_c[levels[-1][1] == 0] = np.median(smooth_src[sky > 0], axis=0)
    for c, m in reversed(levels[:-1]):
        up = resize_f(filled_c, (m.shape[1], m.shape[0]))
        filled_c = c * m[..., None] + up * (1 - m[..., None])
    base = filled_c
    base = gblur(base, 3)

    # deeper night away from the source (only in the added sky)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    dy = np.maximum(np.maximum(oy - yy, yy - (oy + sh - 1)), 0)
    dx = np.maximum(np.maximum(ox - xx, xx - (ox + sw - 1)), 0)
    base *= (1.0 - 0.22 * np.clip(np.hypot(dy, dx) / 520, 0, 1))[..., None]

    if 'top' in feather_edges and ox == 0 and sw == W:
        # above the source: continue its own top-row sky colour, slowly deepening (no drift to the average)
        prof = np.median(smooth_src[:24], axis=0)[None]
        prof = gblur(prof, 40)[0]
        f_rows = oy + int(feather)
        t = np.clip((oy - np.arange(f_rows)) / max(oy, 1), 0, 1)
        base[:f_rows] = prof[None] * (1 - 0.15 * t)[:, None, None]

    # faint nebula: low-frequency multiplicative noise with a slight violet/blue drift
    def lowfreq(cell):
        g = rng.standard_normal((H // cell + 3, W // cell + 3))
        im = Image.fromarray(((g * 40) + 128).clip(0, 255).astype(np.uint8))
        im = im.resize((W + 3 * cell, H + 3 * cell), Image.BICUBIC).crop((cell, cell, W + cell, H + cell))
        return (np.asarray(im).astype(np.float64) - 128) / 40
    neb = 0.6 * lowfreq(140) + 0.4 * lowfreq(55)
    neb = np.tanh(neb / 1.3) * 1.3  # no bright blobs
    tint = lowfreq(220)
    base[..., 0] *= 1 + 0.09 * neb + 0.03 * tint
    base[..., 1] *= 1 + 0.08 * neb
    base[..., 2] *= 1 + 0.10 * neb - 0.02 * tint
    base += rng.normal(0, 0.9, base.shape)  # match the grain of the photo

    # stars at the source's density
    Lraw = np.asarray(src_im.convert('L')).astype(np.float64)
    Lbg = np.asarray(src_im.convert('L').filter(ImageFilter.MedianFilter(9))).astype(np.float64)
    d = Lraw[:150] - Lbg[:150]
    mx = np.asarray(Image.fromarray(d.clip(0, 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))).astype(np.float64)
    nstars_src = int(((d >= mx - 0.5) & (d > 10)).sum())
    density = nstars_src / (150 * src_im.width) / (scale * scale)
    stars = np.zeros((H, W, 3))
    n = int(0.5 * density * W * H)
    ys = rng.uniform(0, H, n)
    xs = rng.uniform(0, W, n)
    amp = 10 + 120 * (rng.pareto(3.0, n).clip(0, 1.5) / 1.5) ** 1.3
    big = rng.random(n) < 0.02
    amp[big] = rng.uniform(110, 180, big.sum())
    col = np.stack([rng.uniform(.88, 1, n), rng.uniform(.92, 1, n), np.ones(n)], 1)
    for y, x, a, c, b in zip(ys, xs, amp, col, big):
        sig = 1.1 * scale if b else 0.55 * scale
        r = int(np.ceil(sig * 3)) + 1
        y0, y1, x0, x1 = int(y) - r, int(y) + r + 1, int(x) - r, int(x) + r + 1
        if y0 < 0 or x0 < 0 or y1 > H or x1 > W:
            continue
        gy, gx = np.mgrid[y0:y1, x0:x1]
        g = np.exp(-((gy - y) ** 2 + (gx - x) ** 2) / (2 * sig * sig))
        stars[y0:y1, x0:x1] += (a * g)[..., None] * c
    sky_img = np.clip(base + stars, 0, 255)

    # feathered paste of the real image; seams lie in pure sky
    alpha = np.ones((sh, sw))
    f = int(feather)
    ramp = np.linspace(0, 1, f)
    if 'top' in feather_edges:
        alpha[:f] *= ramp[:, None]
    if 'bottom' in feather_edges:
        alpha[-f:] *= ramp[::-1][:, None]
    if 'left' in feather_edges:
        alpha[:, :f] *= ramp[None, :]
    alpha = alpha ** 1.5
    keep = gblur((np.asarray(s.convert('L').filter(ImageFilter.MedianFilter(5))) > 62).astype(np.float64), 4)
    alpha = np.maximum(alpha, np.clip(keep * 1.5, 0, 1))
    out = sky_img.copy()
    region = out[oy:oy + sh, ox:ox + sw]
    out[oy:oy + sh, ox:ox + sw] = region * (1 - alpha[..., None]) + S * alpha[..., None]
    img = Image.fromarray(np.clip(out, 0, 255).round().astype(np.uint8))
    img.save(f'{OUT}/{name}.png')
    return img


# 4:5 — the source framing kept at the bottom, night sky continued above
sc = 1200 / src_im.width
p = compose(1200, 1500, sc, 0, 1500 - round(src_im.height * sc), ('top',), 'cover-portrait', feather=110)
# 16:7 — full height, sky continued to the left; the mattress runs off the right edge as in the source
w = compose(1200, 525, 525 / src_im.height, 1200 - round(src_im.width * 525 / src_im.height), 0, ('left',), 'cover-wide', feather=60)
print('ok', p.size, w.size)
