"""Лепка мягкой мебели полем расстояний (SDF) — заготовки для моделей, которые сверяются с фото (photofit.py).
Деталь = контур в плане (вид сверху) → подъём по высоте со скруглёнными рёбрами, выпуклыми стенками и куполом;
детали сливаются/обрезаются, поверхность снимается марширующими кубами. Плюс сетки без поля: кант (трубка по линии),
ножки-пластины. Оси Blender: X вправо, −Y к зрителю (фронт), Z вверх, метры.
Нужны numpy, scipy, scikit-image, Pillow (в окружении Blender: tools/media-v3/blender/README или pip install)."""
import math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from skimage import measure


class Grid:
    def __init__(self, box=(-0.58, 0.58, -0.56, 0.56, -0.02, 0.82), h=0.004):
        self.box, self.h = box, h
        self.h2 = h / 2                                  # план считается вдвое точнее
        self.xs = np.arange(box[0], box[1] + 1e-9, h); self.ys = np.arange(box[2], box[3] + 1e-9, h); self.zs = np.arange(box[4], box[5] + 1e-9, h)
        self.X, self.Y = np.meshgrid(self.xs, self.ys, indexing='ij')

    # ── план ──
    def plan(self, polys, open_r=0.0, close_r=0.0):
        """знаковое расстояние в плане (минус внутри) по многоугольникам; open_r скругляет выпуклые углы, close_r — вогнутые"""
        x0, x1, y0, y1 = self.box[:4]; h2 = self.h2
        nx, ny = int(round((x1 - x0) / h2)) + 1, int(round((y1 - y0) / h2)) + 1
        im = Image.new('L', (nx, ny), 0); dr = ImageDraw.Draw(im)
        for p in polys: dr.polygon([((x - x0) / h2, (y - y0) / h2) for x, y in p], fill=255)
        d = self._sd(np.array(im).T > 127)
        if open_r: d = self._sd(d <= -open_r) - open_r
        if close_r: d = self._sd(d <= close_r) + close_r
        return d[::2, ::2][:len(self.xs), :len(self.ys)]

    def reround(self, d, open_r=0.0, close_r=0.0):
        """скруглить углы уже готового планового поля (после вычитаний и обрезок): open_r — выпуклые, close_r — вогнутые"""
        from scipy.ndimage import zoom
        big = zoom(d, 2, order=1)
        if open_r: big = self._sd(big <= -open_r) - open_r
        if close_r: big = self._sd(big <= close_r) + close_r
        return big[::2, ::2][:d.shape[0], :d.shape[1]]

    def _sd(self, mk):
        return (ndimage.distance_transform_edt(~mk) - ndimage.distance_transform_edt(mk)) * self.h2

    # ── объём ──
    def extrude(self, d2, z0, z1, rt, rb, bulge=0.0, crown=0.0, crown_w=0.18, lean=None, zmid=None):
        """поднять план: низ z0, верх z1 (числа или карты по плану), скругление верхнего ребра rt и нижнего rb,
        bulge — стенки выпуклые «подушкой» (максимум на середине высоты), crown — купол верха к середине.
        lean(z) → добавка к плановому расстоянию на высоте z (сужение/расширение силуэта по высоте)"""
        out = np.empty(d2.shape + (len(self.zs),), np.float32)
        z0a = np.asarray(z0, np.float32) + np.zeros_like(d2, np.float32); z1a = np.asarray(z1, np.float32) + np.zeros_like(d2, np.float32)
        z1a = z1a + crown * np.clip(-d2 / crown_w, 0, 1) ** 0.6
        zm = (z0a + z1a) / 2 if zmid is None else zmid
        for k, z in enumerate(self.zs):
            t = np.clip((z - z0a) / np.maximum(z1a - z0a, 1e-6), 0, 1)
            u = d2 - bulge * np.sin(np.pi * t) ** 0.7
            if lean is not None: u = u + lean(z)
            top = z > zm
            r = np.where(top, rt, rb); qz = np.where(top, z - (z1a - rt), (z0a + rb) - z); qu = u + r
            out[..., k] = np.hypot(np.maximum(qu, 0), np.maximum(qz, 0)) + np.minimum(np.maximum(qu, qz), 0) - r
        return out

    def halfspace(self, n, p):
        """поле полупространства: минус там, где (P − p)·n < 0"""
        n = np.asarray(n, float); n /= np.linalg.norm(n)
        out = np.empty((len(self.xs), len(self.ys), len(self.zs)), np.float32)
        base = (self.X - p[0]) * n[0] + (self.Y - p[1]) * n[1]
        for k, z in enumerate(self.zs): out[..., k] = base + (z - p[2]) * n[2]
        return out

    def mesh(self, vol, smooth=3):
        """поверхность поля (ноль) → (V, F); сглаживание — несколько шагов усреднения по соседям"""
        v = np.pad(vol, 1, constant_values=1.0)
        V, F, _, _ = measure.marching_cubes(v, 0.0, spacing=(self.h,) * 3, gradient_direction='ascent')
        V = V + np.array([self.box[0], self.box[2], self.box[4]]) - self.h
        A, B, C = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
        if np.einsum('ij,ij->i', A, np.cross(B, C)).sum() < 0: F = F[:, ::-1].copy()     # объём со знаком > 0 → нормали наружу
        if smooth: V = laplacian(V, F, smooth)
        return V.astype(np.float64), F.astype(np.int64)


def smin(a, b, k):
    """мягкое слияние (k — ширина перехода, м); k=0 — обычное"""
    if not k: return np.minimum(a, b)
    h = np.maximum(k - np.abs(a - b), 0) / k
    return np.minimum(a, b) - h * h * k / 4


def smax(a, b, k):
    if not k: return np.maximum(a, b)
    h = np.maximum(k - np.abs(a - b), 0) / k
    return np.maximum(a, b) + h * h * k / 4


def laplacian(V, F, iters=3, lam=0.5):
    n = len(V); I = np.concatenate([F[:, 0], F[:, 1], F[:, 2], F[:, 1], F[:, 2], F[:, 0]]); J = np.concatenate([F[:, 1], F[:, 2], F[:, 0], F[:, 0], F[:, 1], F[:, 2]])
    deg = np.bincount(I, minlength=n).astype(np.float64)
    for _ in range(iters):
        acc = np.zeros_like(V)
        for c in range(3): acc[:, c] = np.bincount(I, weights=V[J, c], minlength=n)
        V = V + lam * (acc / np.maximum(deg, 1)[:, None] - V)
    return V


# ── контуры плана ──
def rrect(x0, x1, y0, y1, r):
    """прямоугольник со скруглёнными углами; r = (лев-перед, прав-перед, прав-зад, лев-зад) или одно число"""
    if np.isscalar(r): r = (r,) * 4
    P = []
    for (cx, cy, rr, a0) in ((x0 + r[0], y0 + r[0], r[0], 180), (x1 - r[1], y0 + r[1], r[1], 270), (x1 - r[2], y1 - r[2], r[2], 0), (x0 + r[3], y1 - r[3], r[3], 90)):
        for k in range(17):
            a = math.radians(a0 + 90 * k / 16); P.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return P


def superellipse(cx, cy, a, b, n, k=240):
    t = np.linspace(0, 2 * math.pi, k, endpoint=False); c, s = np.cos(t), np.sin(t)
    return list(zip(cx + a * np.sign(c) * np.abs(c) ** (2 / n), cy + b * np.sign(s) * np.abs(s) ** (2 / n)))


def path_arc(points, radii, step=0.004):
    """ломаная со скруглёнными углами: points — вершины, radii — радиус в каждой внутренней вершине → плотная линия"""
    pts = [np.array(p, float) for p in points]; out = [pts[0]]
    for i in range(1, len(pts) - 1):
        a, b, c = pts[i - 1], pts[i], pts[i + 1]; r = radii[i - 1]
        u = (a - b) / np.linalg.norm(a - b); w = (c - b) / np.linalg.norm(c - b)
        ang = math.acos(np.clip(u @ w, -1, 1)); t = r / math.tan(ang / 2)
        p1, p2 = b + u * t, b + w * t; bis = (u + w); bis /= np.linalg.norm(bis); cen = b + bis * (r / math.sin(ang / 2))
        a1 = math.atan2(*(p1 - cen)[::-1]); a2 = math.atan2(*(p2 - cen)[::-1]); d = (a2 - a1 + math.pi) % (2 * math.pi) - math.pi
        out.append(p1)
        for s in np.linspace(0, 1, max(4, int(abs(d) * r / step)))[1:-1]: out.append(cen + r * np.array([math.cos(a1 + d * s), math.sin(a1 + d * s)]))
        out.append(p2)
    out.append(pts[-1])
    dense = [out[0]]
    for p in out[1:]:
        n = max(1, int(np.linalg.norm(p - dense[-1]) / step)); a0 = dense[-1]
        dense.extend([a0 + (p - a0) * s for s in np.linspace(0, 1, n + 1)[1:]])
    return np.array(dense)


def band(path, T):
    """полоса ширины T вдоль линии (T — число или массив по точкам) → многоугольник; концы обрезаны прямо"""
    p = np.asarray(path, float); d = np.gradient(p, axis=0); d /= np.linalg.norm(d, axis=1)[:, None]
    nr = np.stack([d[:, 1], -d[:, 0]], 1); T = np.asarray(T, float) * np.ones(len(p))
    return [tuple(v) for v in np.vstack([p + nr * T[:, None] / 2, (p - nr * T[:, None] / 2)[::-1]])]


# ── сетки без поля ──
def tube(line, r=0.004, seg=8, closed=False):
    """кант: трубка радиуса r вдоль 3D-линии"""
    P = np.asarray(line, float)
    if closed: P = np.vstack([P, P[:1]])
    d = np.gradient(P, axis=0); d /= np.linalg.norm(d, axis=1)[:, None] + 1e-12
    ref = np.array([0, 0, 1.0]); a = np.cross(d, ref); bad = np.linalg.norm(a, axis=1) < 1e-6; a[bad] = np.cross(d[bad], np.array([1.0, 0, 0]))
    a /= np.linalg.norm(a, axis=1)[:, None]; b = np.cross(d, a)
    ang = np.linspace(0, 2 * math.pi, seg, endpoint=False)
    V = (P[:, None, :] + r * (np.cos(ang)[None, :, None] * a[:, None, :] + np.sin(ang)[None, :, None] * b[:, None, :])).reshape(-1, 3)
    F = []
    for i in range(len(P) - 1):
        for j in range(seg):
            p, q = i * seg + j, i * seg + (j + 1) % seg; F += [(p, q, q + seg), (p, q + seg, p + seg)]
    return V, np.array(F, np.int64)


def blade(top, foot, w_top, t_top, w_foot, t_foot):
    """ножка-пластина: прямоугольное сечение w×t сужается от top к foot; w — вдоль X-ной стороны"""
    top, foot = np.array(top, float), np.array(foot, float)
    def ring(c, w, t): return [c + np.array([sx * w / 2, sy * t / 2, 0]) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    V = np.array(ring(top, w_top, t_top) + ring(foot, w_foot, t_foot))
    F = [(0, 1, 5), (0, 5, 4), (1, 2, 6), (1, 6, 5), (2, 3, 7), (2, 7, 6), (3, 0, 4), (3, 4, 7), (0, 2, 1), (0, 3, 2), (4, 5, 6), (4, 6, 7)]
    return V, np.array(F, np.int64)


def box(c, s):
    c, s = np.array(c, float), np.array(s, float) / 2
    V = np.array([c + s * np.array([sx, sy, sz]) for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)])
    F = [(0, 2, 1), (1, 2, 3), (4, 5, 6), (5, 7, 6), (0, 1, 5), (0, 5, 4), (2, 6, 7), (2, 7, 3), (0, 4, 6), (0, 6, 2), (1, 3, 7), (1, 7, 5)]
    return V, np.array(F, np.int64)


def merge(meshes):
    Vs, Fs, k = [], [], 0
    for V, F in meshes: Vs.append(V); Fs.append(F + k); k += len(V)
    return np.vstack(Vs), np.vstack(Fs)


def save_parts(path, parts):
    np.savez_compressed(path, **{f'{n}_v': V for n, (V, F) in parts.items()}, **{f'{n}_f': F for n, (V, F) in parts.items()})


def export_glb(path, parts, tris=90000):
    """GLB для сайта: сетки fabric (вся обивка и кант) и legs (опоры), гладкие нормали, без UV — ткань кладёт конструктор.
    Запускать в Python с bpy."""
    import bpy, sys, os
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'blender'))
    import bl_lib as L
    L.reset()
    def obj(name, V, F):
        me = bpy.data.meshes.new(name); me.from_pydata(V.tolist(), [], F.tolist()); me.update()
        o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
        for p in me.polygons: p.use_smooth = True
        return o
    sup = ('leg', 'frame', 'plinth')
    fab = merge([m for n, m in parts.items() if not n.lower().startswith(sup)])
    legs = [m for n, m in parts.items() if n.lower().startswith(sup)]
    fo = obj('fabric', *fab); L.decimate(fo, tris)
    lo = obj('legs', *merge(legs)) if legs else None
    if lo:
        for p in lo.data.polygons: p.use_smooth = False
    L.export3(path, fo, lo)
    return L.tris(fo)
