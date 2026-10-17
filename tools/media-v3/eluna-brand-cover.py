"""ELUNA tile cover with the brand lockup (mark + ELUNA in Michroma + SLEEP TECH), optional moon.
Base images: cover-portrait.png / cover-wide.png (owner's starry-sky mattress, sky continued)."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SP = '/tmp/claude-0/-home-user-ricca-designs-/af9da8db-05a5-58b4-b4cb-5bd9366cc95c/scratchpad/eluna'
R = '/home/user/ricca-designs-'
CREAM = (245, 239, 230)
MARK = Image.open(R + '/img/mark.png').convert('RGBA')
MOON = Image.open(R + '/img/moon-hd.webp').convert('RGBA')
LOGO = R + '/fonts/Michroma-Regular.ttf'
SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
try:
    import glob
    inter = glob.glob(R + '/fonts/Inter-300*latin*.woff2')
except Exception:
    inter = []


def spaced(draw, xy, text, font, fill, tracking, anchor_center=True):
    """Draw text with letter spacing; xy is the centre-top if anchor_center."""
    widths = [draw.textlength(ch, font=font) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x, y = xy
    if anchor_center:
        x -= total / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill)
        x += w + tracking
    return total


def glow_layer(size, draw_fn, radius):
    lay = Image.new('RGBA', size, (0, 0, 0, 0))
    draw_fn(lay)
    g = lay.filter(ImageFilter.GaussianBlur(radius))
    return g, lay


def lockup(canvas, cx, top, scale, moon=None):
    W, H = canvas.size
    over = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    if moon:
        mx, my, ms, mo = moon
        m = MOON.resize((ms, ms), Image.LANCZOS)
        a = np.asarray(m).astype(np.float32)
        a[..., 3] *= mo
        m = Image.fromarray(a.clip(0, 255).astype(np.uint8))
        halo = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
        hd = ImageDraw.Draw(halo)
        r = ms * 0.62
        hd.ellipse((mx + ms / 2 - r, my + ms / 2 - r, mx + ms / 2 + r, my + ms / 2 + r), fill=(170, 190, 255, int(60 * mo)))
        canvas.alpha_composite(halo.filter(ImageFilter.GaussianBlur(ms * 0.18)))
        canvas.alpha_composite(m, (int(mx), int(my)))
    ms = int(150 * scale)
    mk = MARK.resize((ms, int(ms * MARK.height / MARK.width)), Image.LANCZOS)
    over.alpha_composite(mk, (int(cx - mk.width / 2), int(top)))
    d = ImageDraw.Draw(over)
    f1 = ImageFont.truetype(LOGO, int(64 * scale))
    y1 = top + mk.height + 46 * scale
    spaced(d, (cx, y1), 'ELUNA', f1, CREAM + (255,), 0.32 * 64 * scale)
    f2 = ImageFont.truetype(SANS, int(21 * scale))
    y2 = y1 + 64 * scale * 1.35 + 18 * scale
    spaced(d, (cx, y2), 'SLEEP TECH', f2, CREAM + (190,), 0.5 * 21 * scale)
    # soft glow behind the lockup
    canvas.alpha_composite(over.filter(ImageFilter.GaussianBlur(14 * scale)).point(lambda v: v) if False else Image.new('RGBA', canvas.size, (0, 0, 0, 0)))
    g = over.copy()
    ga = np.asarray(g).astype(np.float32)
    ga[..., 3] *= 0.35
    g = Image.fromarray(ga.astype(np.uint8)).filter(ImageFilter.GaussianBlur(18 * scale))
    canvas.alpha_composite(g)
    canvas.alpha_composite(over)


def make(variant):
    p = Image.open(SP + '/cover-portrait.png').convert('RGBA')
    w = Image.open(SP + '/cover-wide.png').convert('RGBA')
    if variant == 'a':      # lockup only
        lockup(p, 600, 190, 1.35)
        lockup(w, 330, 120, 0.85)
    else:                   # lockup + moon
        lockup(p, 600, 230, 1.25, moon=(760, -120, 520, 0.95))
        lockup(w, 330, 125, 0.82, moon=(470, -70, 230, 0.9))
    p.convert('RGB').save(f'{SP}/brand-{variant}-portrait.png')
    w.convert('RGB').save(f'{SP}/brand-{variant}-wide.png')
    sheet = Image.new('RGB', (600 + 20 + 1200, 750), (250, 250, 248))
    sheet.paste(p.convert('RGB').resize((600, 750), Image.LANCZOS), (0, 0))
    sheet.paste(w.convert('RGB'), (620, 0))
    sheet.save(f'{SP}/brand-{variant}-sheet.jpg', quality=88)


for v in sys.argv[1:] or ['a', 'b']:
    make(v)
print('ok')
