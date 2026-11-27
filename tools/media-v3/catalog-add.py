#!/usr/bin/env python3
"""Новое предметное фото для каталога: фон как у остальных кадров, изделие увеличено и стоит в рамке «как надо».
  python3 tools/media-v3/catalog-add.py <исходный файл> <имя на сайте, напр. p-sofa-52> [--box x0,y0,x1,y1] [--max 1.6]
Что делает (владелец, 25 ноября: «модели для каталога — увеличь, поставь как надо»):
  • фон → ровный цвет страницы #FAFAF8: по пикселям вне изделия подбирается плавная поверхность фона (градиент студии,
    «пол»), весь кадр делится на неё — изделие, его цвет и мягкая тень под ним остаются, серый фон и виньетка уходят;
  • рамка 4 : 3, изделие — не шире 76 % и не выше 68 % рамки, центр в (0,50; 0,52), как у остальных фото каталога;
  • увеличение без ИИ: Lanczos (не больше --max, по умолчанию ×1,6) и лёгкая резкость — новых деталей не придумывает;
  • пишет img/catalog/<имя>.webp (исходный кадр с ровным фоном), <имя>-r.webp (в рамке), к обоим — -600;
    печатает строку для photos в js/catalog-data.js: src, src600, studio, box, w, h (alt дописать руками).
--box — рамка изделия в пикселях исходника, если сама не нашлась (белое на белом)."""
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from studio_box import product_box

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'ricca'))
CAT = os.path.join(ROOT, 'img', 'catalog')
PAGE = np.array([250, 250, 248], np.float32)
FIT = (0.76, 0.68); CENTER = (0.50, 0.52); CANVAS_W = 1600


def rough_mask(a):
    """изделие грубо: тёмное, цветное или с фактурой ткани (белая ткань на белом фоне цвета не имеет, но имеет рисунок)"""
    g = a.mean(2); mean = ndimage.uniform_filter(g, 7); var = ndimage.uniform_filter(g * g, 7) - mean * mean
    dark = 255 - a.min(2); sat = a.max(2) - a.min(2)
    m = (dark > 60) | (sat > 22) | (np.sqrt(np.clip(var, 0, None)) > 3.0)
    m = ndimage.binary_opening(ndimage.binary_fill_holes(ndimage.binary_closing(m, structure=np.ones((9, 9), bool))), structure=np.ones((7, 7), bool))
    lab, n = ndimage.label(m)
    if n > 1:
        sizes = ndimage.sum(m, lab, range(1, n + 1)); m = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 0.02 * sizes.max()])
    return m


def flat_field(a, bb):
    """фон → PAGE: плавная поверхность (квадратичная по x, y) по пикселям вне рамки изделия; тени и изделие не участвуют"""
    H, W = a.shape[:2]; x0, y0, x1, y1 = bb; px, py = int(0.05 * W), int(0.05 * H)
    out = np.ones((H, W), bool); out[max(0, y0 - py):min(H, y1 + py), max(0, x0 - px):min(W, x1 + px)] = False
    yy, xx = np.mgrid[0:H, 0:W]; u = xx / W - 0.5; v = yy / H - 0.5
    A = np.stack([np.ones_like(u), u, v, u * u, v * v, u * v], -1)
    bg = np.empty_like(a); step = 4
    for c in range(3):
        sel = out[::step, ::step]; Xs = A[::step, ::step][sel]; ys = a[::step, ::step, c][sel]; w = np.ones(len(ys))
        for _ in range(5):                                   # устойчиво: тень темнее поверхности — вес ниже
            coef, *_ = np.linalg.lstsq(Xs * w[:, None], ys * w, rcond=None)
            r = ys - Xs @ coef; w = np.where(r < -3, 0.05, 1.0)
        bg[..., c] = A @ coef
    bg = np.clip(bg, 200, 255)
    return np.clip(a * (PAGE / bg), 0, 255), bg


def main():
    args = [x for x in sys.argv[1:] if not x.startswith('--')]; src, name = args[0], args[1].replace('.webp', '')
    opt = {sys.argv[i][2:]: sys.argv[i + 1] for i in range(1, len(sys.argv) - 1) if sys.argv[i].startswith('--')}
    kmax = float(opt.get('max', 1.6))
    a = np.asarray(Image.open(src).convert('RGB')).astype(np.float32); H, W = a.shape[:2]
    if 'box' in opt: bb = tuple(int(v) for v in opt['box'].split(','))
    else:
        m = rough_mask(a); ys, xs = np.where(m); bb = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    a, bg = flat_field(a, bb)
    if 'box' not in opt:
        b2, _ = product_box(a)                               # точная рамка — уже на ровном фоне
        edge = b2 and (b2[0] <= 1 or b2[1] <= 1 or b2[2] >= W - 1 or b2[3] >= H - 1)   # упёрлась в край кадра — это тень, а не изделие
        if b2 and not edge and (b2[2] - b2[0]) > 0.5 * (bb[2] - bb[0]): bb = b2
    # вдали от изделия — ровно цвет страницы (остатки студийного фона и дальние тени уходят плавно); тень под изделием остаётся
    x0, y0, x1, y1 = bb; yy, xx = np.mgrid[0:H, 0:W]
    dist = np.hypot(np.maximum(np.maximum(x0 - xx, xx - x1), 0), np.maximum(np.maximum(y0 - yy, yy - y1), 0))
    wgt = np.clip((dist - 0.025 * W) / (0.06 * W), 0, 1)
    # у края кадра фон и тень сходят на нет полностью (иначе тень, обрезанная краем снимка, даст ступеньку в рамке)
    brd = np.minimum(np.minimum(xx, W - 1 - xx), np.minimum(yy, H - 1 - yy)); outside = dist > 0
    wgt = np.where(outside, np.maximum(wgt, np.clip(1 - brd / (0.035 * W), 0, 1)), wgt)
    # изделие стоит близко к краю снимка: тень с этой стороны обрезана краем — сводим её на нет на 60 % зазора
    for gap, side, d1 in ((x0, xx < x0, x0 - xx), (W - x1, xx >= x1, xx - x1 + 1), (y0, yy < y0, y0 - yy), (H - y1, yy >= y1, yy - y1 + 1)):
        if gap < 0.08 * W: wgt = np.where(side, np.maximum(wgt, np.clip(d1 / (3.0 if gap < 0.04 * W else 0.6 * gap), 0, 1)), wgt)
    # цветное изделие у самого края снимка: клин тени между изделием и краем (серый, гладкий) убираем целиком —
    # иначе от него остаётся серый прямоугольник со срезанным краем
    sat = a.max(2) - a.min(2); inbox = np.zeros((H, W), bool); inbox[y0:y1, x0:x1] = True
    if np.median(sat[inbox]) > 15:
        g = a.mean(2); prod = ndimage.binary_fill_holes(ndimage.binary_closing((sat > 11) | (g < 110), iterations=2))   # само изделие: цветное или тёмное
        notp = ~ndimage.binary_dilation(prod, iterations=1); s = int(0.06 * W)
        for gap, strip in ((x0, xx < x0 + s), (W - x1, xx >= x1 - s), (y0, yy < y0 + s), (H - y1, yy >= y1 - s)):
            if gap < 0.04 * W:
                k = ndimage.gaussian_filter((notp & strip).astype(np.float32), 1.2); wgt = np.maximum(wgt, np.clip(k * 1.8, 0, 1))
    wgt = wgt[..., None]; wgt = wgt * wgt * (3 - 2 * wgt)
    a = a * (1 - wgt) + PAGE * wgt
    x0, y0, x1, y1 = bb; bw, bh = x1 - x0, y1 - y0
    flat = Image.fromarray(a.round().astype(np.uint8))
    flat.save(os.path.join(CAT, name + '.webp'), quality=92, method=6)
    flat.resize((600, round(600 * H / W)), Image.LANCZOS).save(os.path.join(CAT, name + '-600.webp'), quality=86, method=6)
    # рамка 4 : 3
    k = min(kmax, FIT[0] * CANVAS_W / bw, FIT[1] * (CANVAS_W * 3 / 4) / bh)
    cw = round(max(bw * k / FIT[0], bh * k / FIT[1] * 4 / 3)); ch = round(cw * 3 / 4)
    big = flat.resize((round(W * k), round(H * k)), Image.LANCZOS)
    if k > 1.02: big = big.filter(ImageFilter.UnsharpMask(radius=1.4, percent=45 + int(40 * (k - 1)), threshold=2))
    canvas = Image.new('RGB', (cw, ch), tuple(int(v) for v in PAGE))
    ox = round(CENTER[0] * cw - (x0 + x1) / 2 * k); oy = round(CENTER[1] * ch - (y0 + y1) / 2 * k)
    # узкая кромка исходника растворяется в фоне рамки (изделие у самого края кадра не задевается)
    f = 6; mk = np.ones((big.height, big.width), np.float32)
    ramp = np.linspace(0, 1, f); mk[:, :f] *= ramp; mk[:, -f:] *= ramp[::-1]; mk[:f, :] *= ramp[:, None]; mk[-f:, :] *= ramp[::-1][:, None]
    canvas.paste(big, (ox, oy), Image.fromarray((mk * 255).astype(np.uint8)))
    canvas.save(os.path.join(CAT, name + '-r.webp'), quality=90, method=6)
    canvas.resize((600, 450), Image.LANCZOS).save(os.path.join(CAT, name + '-r-600.webp'), quality=86, method=6)
    box = [round(bw * k / cw, 3), round(bh * k / ch, 3)]
    rec = {"src": f"img/catalog/{name}-r.webp", "src600": f"img/catalog/{name}-r-600.webp", "alt": "", "studio": True, "box": box, "w": cw, "h": ch}
    print(json.dumps(dict(name=name, scale=round(k, 2), frame=[cw, ch], product_px=[round(bw * k), round(bh * k)], bbox_src=bb, photo=rec), ensure_ascii=False))


if __name__ == '__main__':
    main()
