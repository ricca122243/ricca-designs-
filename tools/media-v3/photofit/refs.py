"""Опорные фото для сверки 3D с фото: маска изделия на белом фоне и, где ткань двухцветная, маски деталей.
Фото каталога — студийные рендеры 1280×1280 на белом; у одной модели один и тот же ракурс снят в разных тканях.
Запуск: python refs.py <outdir>  → <outdir>/<chair>/<view>.npz (mask, parts) и контрольные листы *.jpg"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
CAT = os.path.join(ROOT, 'ricca', 'img', 'catalog')

# ракурс → фото в разных тканях (камера одна и та же); первый в списке — основной для наложения
REFS = {
    'runvo': {   # серии b (коричневая) и o (оранжевая/белая) — широкая версия, она же на главном фото каталога
        'low':   ['p-armchair-07-b1', 'p-armchair-07-o'],
        'high':  ['p-armchair-07-o3', 'p-armchair-07-b2'],
        'top':   ['p-armchair-07-o4'],
        'front': ['p-armchair-07-o2'],
    },
    'runvo-tall': {   # серии t (двухцветная) и h — та же конструкция, но кресло выше и уже; каркас с перекладинами. Только для понимания устройства
        'low':   ['p-armchair-07-t1', 'p-armchair-07-h1'],
        'high':  ['p-armchair-07-t2', 'p-armchair-07-h2'],
        'front': ['p-armchair-07-t3', 'p-armchair-07-h3'],
    },
    'galso': {
        'main':  ['p-armchair-20'],
        'front': ['p-armchair-20-d1'],
    },
}


# что известно о камере заранее (градусы): az>0 — камера слева от фронта, el>0 — сверху. Без этого круглый силуэт
# ложится на фото при любом повороте, и подбор камеры «уезжает».
PRIOR = {
    ('runvo', 'front'): dict(az=(-8, 8), el=(0, 14)),
    ('runvo', 'low'):   dict(az=(-80, 20), el=(0, 20)),     # 25 ноября: наложение показало — камера СПРАВА (az около −30…−35), а не слева
    ('runvo', 'high'):  dict(az=(-80, 20), el=(15, 75)),
    ('runvo', 'top'):   dict(az=(-80, 20), el=(15, 75)),
    ('galso', 'front'): dict(az=(-6, 6), el=(0, 14)),
    ('galso', 'main'):  dict(az=(-50, -8), el=(0, 14)),    # видна наружная сторона правой боковины — камера справа
}


def load(name):
    return np.asarray(Image.open(os.path.join(CAT, name + '.webp')).convert('RGB')).astype(np.float32)


def obj_mask(a, thr=20, split=False):
    """изделие на белом фоне. Обивка: цветная или с рисунком ткани (у белой ткани на белом фоне цвета нет, но есть
    мелкая фактура — её видно по местному разбросу яркости). Ножки: тёмные. Тень на полу — гладкая, серая, не тёмная:
    в маску не входит, даже если заперта между ножками. split=True → (обивка, ножки) отдельно"""
    g = a.mean(2)
    mean = ndimage.uniform_filter(g, 7); var = ndimage.uniform_filter(g * g, 7) - mean * mean
    dark = 255 - a.min(2); sat = a.max(2) - a.min(2)
    tex = (np.sqrt(np.clip(var, 0, None)) > 3.0) & (dark > 8)
    darkpix = dark > 115
    med = float(np.median(sat[sat > thr])) if (sat > thr).any() else 0
    if med > 60: thr = 0.4 * med          # яркая ткань окрашивает тень под сиденьем — порог цвета выше, тень отпадает
    m0 = darkpix | (sat > thr) | (tex if med <= 60 else (tex & (sat > thr)))
    m1 = ndimage.binary_fill_holes(ndimage.binary_closing(m0, structure=np.ones((9, 9), bool)))
    plain = m1 & ~ndimage.binary_dilation(m0, iterations=2)          # залитое, но само на изделие не похожее
    lab, n = ndimage.label(plain)
    if n:
        sizes = ndimage.sum(plain, lab, range(1, n + 1))
        m1 &= ~np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 1200])   # большие гладкие пятна — тень между ножками
    core = ndimage.binary_opening(m1, structure=np.ones((15, 15), bool))        # тело обивки без тонкого (ножки, линия тени)
    lab, n = ndimage.label(core)
    if n > 1:
        sizes = ndimage.sum(core, lab, range(1, n + 1)); core = lab == (1 + int(np.argmax(sizes)))
    body = ndimage.binary_fill_holes(ndimage.binary_dilation(core, iterations=3) & m1)
    legs = ndimage.binary_dilation(darkpix & (sat < 40), iterations=1) & m1 & ~body
    lab, n = ndimage.label(legs)
    if n:
        sizes = ndimage.sum(legs, lab, range(1, n + 1)); legs = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 150])
    return (body, legs) if split else (body | legs)


def two_tone(a, m):
    """двухцветное фото Runvo (t1–t3): сиденье бирюзовое, спинка сиреневая, каркас чёрный.
    Узор ткани пёстрый — цвет усредняется по окну, потом ближайший из трёх средних."""
    blur = np.stack([ndimage.uniform_filter(a[..., c], 17) for c in range(3)], -1)
    r, g, b = blur[..., 0], blur[..., 1], blur[..., 2]
    lum = blur.mean(2)
    seat = (b - r > 18) & (g - r > 10)
    frame = (lum < 75) & (np.abs(b - r) < 25)
    shell = ~seat & ~frame
    out = np.zeros(m.shape, np.uint8)
    out[m & shell] = 2; out[m & seat] = 1; out[m & frame] = 3
    # чистка: мелкие островки — в соседа
    for k in (1, 2, 3):
        lab, n = ndimage.label(out == k)
        if n > 1:
            sizes = ndimage.sum(out == k, lab, range(1, n + 1))
            for i, s in enumerate(sizes):
                if s < 400: out[lab == i + 1] = 0
    holes = m & (out == 0)
    if holes.any():
        idx = ndimage.distance_transform_edt(out == 0, return_distances=False, return_indices=True)
        out[holes] = out[idx[0][holes], idx[1][holes]]
    return out   # 0 фон, 1 сиденье, 2 спинка-подлокотник, 3 каркас


if __name__ == '__main__':
    out = sys.argv[1]
    for chair, views in REFS.items():
        os.makedirs(os.path.join(out, chair), exist_ok=True)
        tiles = []
        for view, names in views.items():
            masks = []
            for nme in names:
                a = load(nme); body, legs = obj_mask(a, split=True); m = body | legs; masks.append(m)
                parts = two_tone(a, m) if '-t' in nme[-3:] else None
                np.savez_compressed(os.path.join(out, chair, f'{view}--{nme}.npz'), mask=m, body=body, legs=legs, parts=parts if parts is not None else np.zeros((1, 1), np.uint8))
                vis = a.copy(); edge = body ^ ndimage.binary_erosion(body, iterations=2); vis[edge] = (255, 0, 0)
                edge = legs ^ ndimage.binary_erosion(legs, iterations=1); vis[edge] = (0, 160, 255)
                if parts is not None:
                    for k, col in ((1, (0, 255, 255)), (2, (255, 0, 255)), (3, (255, 255, 0))):
                        pk = parts == k; e = pk ^ ndimage.binary_erosion(pk, iterations=2); vis[e] = col
                tiles.append(Image.fromarray(vis.astype(np.uint8)).resize((420, 420), Image.LANCZOS))
            base = masks[0]
            print(chair, view, 'площадь маски', int(base.sum()), '| совпадение масок между тканями (IoU):',
                  ' '.join(f"{n[-2:]}={(base & mk).sum() / (base | mk).sum():.3f}" for n, mk in zip(names[1:], masks[1:])))
        n = 5; rows = [tiles[i:i + n] for i in range(0, len(tiles), n)]
        sheet = Image.new('RGB', (n * 424, len(rows) * 424), 'white')
        for y, r in enumerate(rows):
            for x, t in enumerate(r): sheet.paste(t, (x * 424, y * 424))
        sheet.save(os.path.join(out, f'{chair}-masks.jpg'), quality=85)
