# Вмятины от стёжки → продолжение полосок стёжки сквозь вмятину.
# Поле направлений полосок (тензор структуры) считается по чистой ткани вокруг и плавно
# переносится внутрь; каждый пиксель вмятины = интерполяция между двумя краями вдоль своей полоски.
# Тонкая фактура ткани возвращается из чистого участка рядом (высокие частоты).
import numpy as np, cv2, sys
from PIL import Image
from scipy import ndimage as ndi
SRC, OUT = sys.argv[1], sys.argv[2]
im = np.array(Image.open(SRC).convert('RGBA')).astype(np.float32)
rgb = im[..., :3]; A = im[..., 3]
H, W = A.shape
L = rgb @ np.array([.299, .587, .114], np.float32)
DEF = [((722, 476), (132, 50), -9), ((902, 366), (64, 29), -6), ((1228, 395), (46, 19), -5), ((1484, 302), (62, 20), -5)]
def ell(c, ax, ang, grow=0):
    m = np.zeros((H, W), np.uint8)
    cv2.ellipse(m, c, (ax[0] + grow, ax[1] + grow), ang, 0, 360, 255, -1)
    return m > 0
hole = np.zeros((H, W), bool)
for d in DEF: hole |= ell(*d)
# поле направлений: тензор структуры по чистой ткани, нормированная свёртка
gx = ndi.sobel(ndi.gaussian_filter(L, 1.2), 1); gy = ndi.sobel(ndi.gaussian_filter(L, 1.2), 0)
w = (~ndi.binary_dilation(hole, iterations=6) & (A > 250)).astype(np.float32)
def nconv(x, s): return ndi.gaussian_filter(x * w, s) / np.maximum(ndi.gaussian_filter(w, s), 1e-4)
S = 22
Jxx, Jyy, Jxy = nconv(gx * gx, S), nconv(gy * gy, S), nconv(gx * gy, S)
th = 0.5 * np.arctan2(2 * Jxy, Jxx - Jyy) + np.pi / 2       # направление ВДОЛЬ полосок
dxf, dyf = np.cos(th), np.sin(th)
# поле с удвоенным углом — для гладкой билинейной выборки без скачка знака
c2, s2 = np.cos(2 * th), np.sin(2 * th)
def samp(f, x, y): return ndi.map_coordinates(f, [y, x], order=1, mode='nearest')
def trace(px, py, sign):
    x, y = px.astype(np.float32).copy(), py.astype(np.float32).copy()
    vx = samp(dxf, x, y) * sign; vy = samp(dyf, x, y) * sign
    vx = np.where(vx < 0, -vx, vx) if sign > 0 else np.where(vx > 0, -vx, vx)   # +: вправо, −: влево
    vy = np.where(np.sign(vx) != np.sign(samp(dxf, x, y) * sign), -samp(dyf, x, y) * sign, samp(dyf, x, y) * sign) if False else vy
    n = np.hypot(vx, vy); vx /= n; vy /= n
    length = np.zeros_like(x); done = np.zeros(x.shape, bool)
    for _ in range(1400):
        a2 = np.arctan2(samp(s2, x, y), samp(c2, x, y)) / 2
        ux, uy = np.cos(a2), np.sin(a2)
        flip = (ux * vx + uy * vy) < 0
        ux = np.where(flip, -ux, ux); uy = np.where(flip, -uy, uy)
        vx = np.where(done, vx, ux); vy = np.where(done, vy, uy)
        x = np.where(done, x, x + 0.5 * vx); y = np.where(done, y, y + 0.5 * vy)
        length = np.where(done, length, length + 0.5)
        inside = hole[np.clip(np.round(y).astype(int), 0, H - 1), np.clip(np.round(x).astype(int), 0, W - 1)]
        done |= ~inside
        if done.all(): break
    # ещё 1.5 px за край — берём чистый пиксель, не антиалиас границы
    x = x + 1.5 * vx; y = y + 1.5 * vy; length = length + 1.5
    return x, y, length
ys, xs = np.nonzero(hole)
xr, yr, lr = trace(xs, ys, +1)
xl, yl, ll = trace(xs, ys, -1)
out = rgb.copy()
wr = ll / (ll + lr); wl = lr / (ll + lr)
for ch in range(3):
    f = rgb[..., ch]
    out[ys, xs, ch] = wr * samp(f, xr, yr) + wl * samp(f, xl, yl)
# фактура ткани: высокие частоты с ближайшего чистого участка вдоль полоски (за правым краем)
hp = rgb - np.stack([ndi.gaussian_filter(rgb[..., c], 1.4) for c in range(3)], -1)
off = (lr + 6)
gxs, gys = xs + (xr - xs) / np.maximum(lr, 1) * off, ys + (yr - ys) / np.maximum(lr, 1) * off
for ch in range(3):
    out[ys, xs, ch] += 0.85 * samp(hp[..., ch], gxs, gys)
# мягкий шов по краю вмятины
feather = ndi.gaussian_filter(hole.astype(np.float32), 1.5)
feather = np.where(hole, np.maximum(feather, 0.5) * 0 + np.clip(ndi.distance_transform_edt(hole) / 3.0, 0, 1), 0)
res = rgb * (1 - feather[..., None]) + out * feather[..., None]
res = np.dstack([res, A]).clip(0, 255).astype(np.uint8)
Image.fromarray(res, 'RGBA').save(OUT, 'WEBP', quality=92, alpha_quality=100, method=6)
print('filled px', len(xs), 'max path', float((ll + lr).max()))
