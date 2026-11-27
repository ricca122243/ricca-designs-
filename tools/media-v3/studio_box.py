"""Рамка изделия на предметном фото (светлый ровный фон, img/catalog/p-*.webp). Общий модуль для models-data.py (поле box
в данных: по нему сетка и окно модели подбирают увеличение) и catalog-replace.py / studio-recenter.py (куда ставить изделие).
Зачем отдельно: раньше рамкой считалось всё, что отличается от фона, и одна пылинка или чёрточка на фоне раздувала её —
изделие ставилось «по центру» раздутой рамки и уезжало вниз или вбок (Molva, Ormel, Kalvo), а box занижал увеличение.
Теперь мелкие пятна на чистом фоне вдали от изделия (меньше 1 % его площади) не считаются; ножки и тень рядом
с изделием остаются (их и не должно отрезать: тонкие ножки размыканием маски «съелись» бы). Нужны numpy, pillow, scipy."""
import numpy as np
from scipy import ndimage

CENTER = (0.5, 0.52)   # где стоит центр рамки изделия на всех студийных кадрах каталога (доли ширины и высоты)
TOL = 0.03             # отклонение больше — изделие не по центру: сетка и окно увеличивают кадр от центра и срежут его


def corners_bg(a, k=8):
    """Цвет фона — медиана углов k × k."""
    return np.median(np.concatenate([a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3), a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3)]), 0)


def product_box(a, th=25):
    """a — массив H × W × 3. → ((x0, y0, x1, y1) в пикселях или None, [(x, y, пикселей) — отброшенные пятна на фоне])."""
    a = np.asarray(a, dtype=np.float32); H, W = a.shape[:2]
    d = np.abs(a - corners_bg(a)).max(2); m = d > th
    if not m.any(): return None, []
    # одно целое с изделием: что ближе 2 % ширины кадра (ножки за щелью тени, отдельная подушка) и что связано с ним через
    # бледные пиксели (> 4: ножки белой кровати, у которой само основание почти цвета фона); пятно на чистом фоне — отдельно
    r = max(1, round(W * 0.02))
    lab, n = ndimage.label(ndimage.maximum_filter(m.astype(np.uint8), size=2 * r + 1) | ndimage.binary_dilation(d > 4, iterations=2))
    cnt = np.bincount(lab[m], minlength=n + 1); cnt[0] = 0
    keep = cnt >= cnt.max() * 0.01
    ys, xs = np.where(m & keep[lab]); bb = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    faint = np.bincount(lab[d > 12], minlength=n + 1)   # бледная чёрточка (отличие 12–25) в рамку не попадает, но на фото видна
    specks = []
    for i in np.where(((cnt > 0) | (faint >= 8)) & ~keep)[0]:
        yy, xx = np.where((lab == i) & (d > 12))   # сами пиксели пятна, без поля группировки
        if xx.min() >= bb[0] and xx.max() < bb[2] and yy.min() >= bb[1] and yy.max() < bb[3]: continue   # внутри рамки — деталь изделия (ножка белой кровати, шов)
        specks.append((int(xx.mean()), int(yy.mean()), int(max(cnt[i], faint[i]))))
    return bb, specks


def off_center(bb, W, H):
    """Центр рамки (доли кадра), если он дальше TOL от CENTER; иначе None."""
    cx, cy = (bb[0] + bb[2]) / 2 / W, (bb[1] + bb[3]) / 2 / H
    return (cx, cy) if abs(cx - CENTER[0]) > TOL or abs(cy - CENTER[1]) > TOL else None
