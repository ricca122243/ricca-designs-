#!/usr/bin/env python3
"""Заменить фото изделия в каталоге улучшенной версией (заказчик улучшает фото сам и присылает с тем же именем).
  python3 tools/media-v3/catalog-replace.py <улучшенный файл> <имя на сайте, напр. p-armchair-10> [--keep-color]
Что делает, чтобы фото встало на место прежнего без перекройки сайта:
  • цвет изделия подгоняется к прежнему фото (среднее и разброс по каналам на изделии) — улучшайзеры часто темнят и
    «уводят» оттенок, а цвет ткани должен остаться настоящим; --keep-color — не подгонять;
  • фон → ровный цвет страницы #FAFAF8 (заливка от краёв, мягкий край);
  • изделие ставится в тот же прямоугольник, что на прежнем фото (ширина и центр) — поле box в данных не меняется;
  • пишет img/catalog/<имя>.webp (размер прежнего) и <имя>-600.webp;
    прежние версии остаются в истории git."""
import sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.dont_write_bytecode = True   # общий модуль studio_box.py — без папки __pycache__ в репозитории
from studio_box import product_box

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
CAT = os.path.join(ROOT, 'ricca', 'img', 'catalog')
PAGE = np.array([250, 250, 248], np.float32)


def corners_bg(a):
    k = max(6, min(a.shape[:2]) // 60)
    return np.median(np.concatenate([a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3), a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3)]), 0)


def bg_mask(a, tol=22):
    """Доля фона 0…1: заливка от краёв по пикселям, близким к цвету фона, с мягким краем."""
    H, W, _ = a.shape
    d = np.abs(a - corners_bg(a)).max(2)
    near = Image.fromarray(np.where(d < tol, 255, 0).astype('uint8')).copy()   # copy: иначе floodfill не пишет в картинку из массива
    px = near.load(); step = max(4, min(W, H) // 150)
    for s in [(x, 0) for x in range(0, W, step)] + [(x, H - 1) for x in range(0, W, step)] + [(0, y) for y in range(0, H, step)] + [(W - 1, y) for y in range(0, H, step)]:
        if px[s] == 255: ImageDraw.floodfill(near, s, 128, thresh=0)
    m = (np.asarray(near) == 128).astype(np.uint8) * 255
    return np.asarray(Image.fromarray(m).filter(ImageFilter.GaussianBlur(max(1.0, W / 900)))) / 255.0


def bbox(a, th=25):
    """Рамка изделия — одинаковым правилом для старого и нового кадра (отличие от цвета фона > th). Пылинки на фоне не в счёт
    (studio_box.py): раздутая ими рамка ставила новое изделие не по центру — так «уехали» Molva и Ormel."""
    return product_box(a, th)[0]


def main():
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    src, name = args[0], args[1].replace('.webp', '').replace('.jpg', '')
    old_path = os.path.join(CAT, name + '.webp')
    old = np.asarray(Image.open(old_path).convert('RGB')).astype(np.float32)
    new = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    mo, mn = bg_mask(old), bg_mask(new)
    po, pn = mo < 0.5, mn < 0.5
    x0, y0, x1, y1 = bbox(old); X0, Y0, X1, Y1 = bbox(new)
    if '--keep-color' not in sys.argv:
        for c in range(3):   # цвет изделия → как на прежнем фото
            a, b = new[..., c][pn], old[..., c][po]
            new[..., c] = np.where(pn, (new[..., c] - a.mean()) / (a.std() + 1e-6) * b.std() + b.mean(), new[..., c])
        new = np.clip(new, 0, 255)
    new = new * (1 - mn[..., None]) + PAGE * mn[..., None]
    k = (x1 - x0) / (X1 - X0)                      # масштаб: ширина изделия как на прежнем фото
    H, W = old.shape[:2]
    big = Image.fromarray(new.astype('uint8')).resize((round(new.shape[1] * k), round(new.shape[0] * k)), Image.LANCZOS)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; CX, CY = (X0 + X1) / 2 * k, (Y0 + Y1) / 2 * k
    canvas = Image.new('RGB', (W, H), tuple(int(v) for v in PAGE))
    canvas.paste(big, (round(cx - CX), round(cy - CY)))
    canvas.save(old_path, quality=90, method=6)
    canvas.resize((600, round(600 * H / W)), Image.LANCZOS).save(os.path.join(CAT, name + '-600.webp'), quality=88, method=6)
    print(f'{name}: изделие ×{k:.3f}, центр ({cx:.0f}, {cy:.0f}) → {old_path}')


main()
