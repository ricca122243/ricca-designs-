#!/usr/bin/env python3
"""Предметное фото каталога (img/catalog/p-*.webp, светлый фон) — изделие в центр кадра и чистый фон, как на остальных кадрах.
  python3 tools/media-v3/studio-recenter.py <имя, напр. p-sofa-26> [ещё имена…] [--fit] [--force]
Зачем: сетка каталога и окно модели увеличивают кадр от его центра (js/site.js zoomAttr, fitZoom) — изделие, стоящее низко
или сбоку (так бывает, когда кадр центрировали по рамке, раздутой пылинкой на фоне), уходит за край; models-data.py
предупреждает о таких кадрах. Что делает:
  • фон: всё, что не соединено с изделием (пылинки, чёрточки, полоски), → цвет фона этого же файла; изделие с ножками
    и мягкой тенью не трогается (граница плавная — отличие там не больше 4 уровней);
  • центр рамки изделия → (0.50, 0.52) кадра, как у остальных фото; сдвиг целыми пикселями, без пересчёта изображения;
  • --fit — ещё и размер как у остальных: рамка вписывается в 74 % ширины × 76 % высоты (если изделие снято мелко);
  • размер файла прежний (обычно 1200 × 900) + <имя>-600.webp; box этого фото в js/catalog-data.js — новый.
После запуска: python3 tools/media-v3/models-data.py (box в js/models-data.js). Прежние версии файлов — в истории git."""
import sys, os, re
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
sys.dont_write_bytecode = True   # общий модуль studio_box.py — без папки __pycache__ в репозитории
from studio_box import product_box, off_center, corners_bg, CENTER

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'ricca'))
CAT = os.path.join(ROOT, 'img', 'catalog')
FIT = (0.74, 0.76)


def clean(a, bb):
    """Фон без посторонних пятен: оставляем только то, что соединено с изделием (отличие от фона > 4), остальное — цвет фона."""
    bg = corners_bg(a)
    low = np.abs(a - bg).max(2) > 4
    lab, n = ndimage.label(ndimage.binary_dilation(low, iterations=2))
    x0, y0, x1, y1 = bb
    ids = np.unique(lab[y0:y1, x0:x1]); ids = ids[ids > 0]   # всё, что заходит в рамку изделия: само изделие, его тень
    zone = Image.fromarray((np.isin(lab, ids) * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2))
    k = np.asarray(zone, np.float32)[..., None] / 255
    return a * k + bg * (1 - k), bg, np.isin(lab, ids)


def main():
    names = [x.replace('.webp', '') for x in sys.argv[1:] if not x.startswith('--')]
    data_path = os.path.join(ROOT, 'js', 'catalog-data.js'); data = open(data_path, encoding='utf-8').read()
    for name in names:
        path = os.path.join(CAT, name + '.webp')
        a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32); H, W = a.shape[:2]
        bb, specks = product_box(a)
        if bb is None: print(f'{name}: изделие не найдено — пропущено'); continue
        bw, bh = bb[2] - bb[0], bb[3] - bb[1]
        s = min(FIT[0] * W / bw, FIT[1] * H / bh) if '--fit' in sys.argv else 1.0
        if not specks and not off_center(bb, W, H) and abs(s - 1) < 0.02 and '--force' not in sys.argv:
            print(f'{name}: уже по центру, пятен нет — без изменений'); continue
        c, bg, zone = clean(a, bb)
        ys, xs = np.where(zone); zx0, zy0, zx1, zy1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1   # изделие с тенью
        cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
        dx, dy = round(CENTER[0] * W - cx * s), round(CENTER[1] * H - cy * s)
        if zx0 * s + dx < 0 or zy0 * s + dy < 0 or zx1 * s + dx > W or zy1 * s + dy > H:
            print(f'{name}: после сдвига изделие с тенью не помещается в кадр — пропущено'); continue
        im = Image.fromarray(np.clip(np.round(c), 0, 255).astype('uint8'))
        if abs(s - 1) >= 0.02: im = im.resize((round(W * s), round(H * s)), Image.LANCZOS)
        else: s = 1.0
        canvas = Image.new('RGB', (W, H), tuple(int(v) for v in bg))
        canvas.paste(im, (dx, dy))
        canvas.save(path, quality=90, method=6)
        canvas.resize((600, round(600 * H / W)), Image.LANCZOS).save(os.path.join(CAT, name + '-600.webp'), quality=88, method=6)
        nb, _ = product_box(np.asarray(Image.open(path).convert('RGB')))
        box = [round(np.float64(nb[2] - nb[0]) / W, 3), round(np.float64(nb[3] - nb[1]) / H, 3)]   # округление как в models-data.py
        src = f'"src": "img/catalog/{name}.webp"'
        data, k = re.subn(r'(' + re.escape(src) + r'[^\n]*?"box": )\[[^\]]*\]', lambda m: m.group(1) + json_box(box), data)
        print(f'{name}: сдвиг ({dx:+d}, {dy:+d}) px{f", ×{s:.3f}" if s != 1 else ""}, убрано пятен: {len(specks)}, '
              f'центр ({(nb[0] + nb[2]) / 2 / W:.3f}, {(nb[1] + nb[3]) / 2 / H:.3f}), box {box}{"" if k else " — в catalog-data.js не найдено, впишите руками"}')
    open(data_path, 'w', encoding='utf-8').write(data)


def json_box(b):
    return f'[{b[0]}, {b[1]}]'


main()
