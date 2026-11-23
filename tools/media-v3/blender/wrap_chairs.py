"""Galso (armchair-20) и Runvo (armchair-07): спинка с подлокотником — один мягкий объём, который огибает сиденье.
24 ноября, владелец (разметка на фото): «спинка и подлокотник — одно целое, плавно огибает сиденье, всё округлое».
Форма «лепится» полем расстояний: план каждой детали (лента спинки-подлокотника, сиденье) рисуется контуром,
поднимается по высоте со скруглёнными верхним и нижним рёбрами и выпуклыми «подушкой» стенками; детали
сливаются, поверхность снимается марширующими кубами (scikit-image) и чуть сглаживается в Blender.
Оси Blender: X вправо, −Y к зрителю (фронт), Z вверх, метры. Итог — GLB: сетки fabric и legs.
Запуск: python wrap_chairs.py galso|runvo <out.glb>   (нужен scikit-image в том же Python, что и bpy)"""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from skimage import measure
import bpy
import bl_lib as L

H3 = 0.004            # шаг сетки, м
H2 = H3 / 2           # шаг плана (точнее расстояния)
BOX = (-0.52, 0.52, -0.50, 0.50, -0.02, 0.80)   # x0 x1 y0 y1 z0 z1


def plan_sdf(polys, open_r=0.0):
    """знаковое расстояние в плане (минус внутри) по многоугольникам [(x, y), ...]; open_r — скругление выпуклых углов"""
    x0, x1, y0, y1 = BOX[:4]
    nx, ny = int(round((x1 - x0) / H2)) + 1, int(round((y1 - y0) / H2)) + 1
    im = Image.new('L', (nx, ny), 0); dr = ImageDraw.Draw(im)
    for p in polys: dr.polygon([((x - x0) / H2, (y - y0) / H2) for x, y in p], fill=255)
    m = np.array(im).T > 127   # [ix, iy]
    sd = lambda mk: (ndimage.distance_transform_edt(~mk) - ndimage.distance_transform_edt(mk)) * H2
    d = sd(m)
    if open_r: d = sd(d <= -open_r) - open_r
    return d[::2, ::2]


def rrect(x0, x1, y0, y1, r):
    """прямоугольник со скруглёнными углами; r = (лев-перед, прав-перед, прав-зад, лев-зад)"""
    P = []
    for (cx, cy, rr, a0) in ((x0 + r[0], y0 + r[0], r[0], 180), (x1 - r[1], y0 + r[1], r[1], 270),
                             (x1 - r[2], y1 - r[2], r[2], 0), (x0 + r[3], y1 - r[3], r[3], 90)):
        for k in range(13):
            a = math.radians(a0 + 90 * k / 12); P.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return P


def superellipse(cx, cy, a, b, n, k=180):
    t = np.linspace(0, 2 * math.pi, k, endpoint=False); c, s = np.cos(t), np.sin(t)
    return list(zip(cx + a * np.sign(c) * np.abs(c) ** (2 / n), cy + b * np.sign(s) * np.abs(s) ** (2 / n)))


def band_poly(xl, yb, xa, yf, rc, T, step=0.005, end_in_r=0.0):
    """лента ширины T: спинка вдоль y=yb от x=xl, дуга радиуса rc по средней линии, подлокотник вдоль x=xa до y=yf;
    end_in_r — большой радиус внутреннего (к сиденью) угла на конце подлокотника: спереди торец кажется узким, сбоку-спереди — широким"""
    cx, cy = xa - rc, yb - rc
    pts = [(x, yb) for x in np.arange(xl, cx, step)]
    n = max(16, int(rc * math.pi / 2 / step))
    pts += [(cx + rc * math.cos(t), cy + rc * math.sin(t)) for t in np.linspace(math.pi / 2, 0, n)]
    pts += [(xa, y) for y in np.arange(cy - step, yf - 1e-6, -step)]
    p = np.array(pts); d = np.gradient(p, axis=0); d /= np.linalg.norm(d, axis=1)[:, None]
    nr = np.stack([d[:, 1], -d[:, 0]], 1)
    inner, outer = p + nr * T / 2, (p - nr * T / 2)[::-1]   # inner — сторона сиденья
    if end_in_r:
        r = end_in_r; x0 = xa - T / 2
        inner = inner[~((inner[:, 1] < yf + r) & (np.abs(inner[:, 0] - x0) < 1e-6))]
        arc = [(x0 + r + r * math.cos(a), yf + r + r * math.sin(a)) for a in np.linspace(math.pi, 1.5 * math.pi, 16)]
        inner = np.vstack([inner, arc])
    return [tuple(v) for v in np.vstack([inner, outer])]


def solid(d2, z0, z1, rt, rb, bulge=0.0, crown=0.0):
    """поднять план по высоте: скругления верха rt и низа rb, стенки выпуклые (bulge), верх с куполом (crown)"""
    zs = np.arange(BOX[4], BOX[5] + 1e-9, H3)
    out = np.empty(d2.shape + (len(zs),), np.float32)
    dome = crown * np.clip(-d2 / 0.18, 0, 1) ** 0.6
    for k, z in enumerate(zs):
        t = min(max((z - z0) / (z1 - z0), 0), 1)
        u = d2 - bulge * math.sin(math.pi * t) ** 0.7
        top = z1 + dome
        if z > (z0 + z1) / 2:
            r = rt; qz = z - (top - rt)
        else:
            r = rb; qz = np.full_like(u, (z0 + rb) - z)
        qu = u + r
        out[..., k] = np.hypot(np.maximum(qu, 0), np.maximum(qz, 0)) + np.minimum(np.maximum(qu, qz), 0) - r
    return out


def tub(foot, z0, z1, zm, grow, ibot, itop=0.0, k=0.02):
    """силуэт «кадкой» (фото Galso спереди): шире всего на высоте zm (на grow наружу от контура плана),
    книзу сужается на ibot, кверху на itop; возвращает поле, которым обрезают детали (мягкий max)"""
    zs = np.arange(BOX[4], BOX[5] + 1e-9, H3)
    out = np.empty(foot.shape + (len(zs),), np.float32)
    for kz, z in enumerate(zs):
        if z < zm: o = grow - (grow + ibot) * ((zm - z) / (zm - z0)) ** 2
        else: o = grow - (grow + itop) * (min(z - zm, z1 - zm) / (z1 - zm)) ** 2
        out[..., kz] = foot - o
    return out


def smax(a, b, k):
    h = np.maximum(k - np.abs(a - b), 0) / k
    return np.maximum(a, b) + h * h * k / 4


def to_mesh(vol, name, smooth=4):
    v = np.pad(vol, 1, constant_values=1.0)
    verts, faces, _, _ = measure.marching_cubes(v, 0.0, spacing=(H3, H3, H3), gradient_direction='ascent')
    verts += np.array([BOX[0], BOX[2], BOX[4]]) - H3
    me = bpy.data.meshes.new(name); me.from_pydata(verts.tolist(), [], faces.tolist()); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode='OBJECT')
    if smooth:
        s = o.modifiers.new('sm', 'SMOOTH'); s.factor = 0.5; s.iterations = smooth; L._apply(o, s)
    return o


which, out = sys.argv[-2], sys.argv[-1]
L.reset()
if which == 'galso':
    # фото: низкое, спинка и подлокотник одной высоты, наружный угол сзади-справа круглый, торец подлокотника
    # плоский со скруглёнными рёбрами почти вровень с сиденьем; сиденье — толстая подушка с бочкообразным фасадом
    W, D, H, T = 0.95, 0.88, 0.72, 0.18
    # силуэт сужается книзу «кадкой» (вид спереди): детали чуть шире плана, лишнее срезает общая огибающая;
    # левый торец спинки на 4 см внутри от края сиденья — сиденье выступает, как на фото сбоку
    bp = band_poly(-W / 2 + 0.04, D / 2 - T / 2, W / 2 - T / 2, -D / 2 + 0.03, 0.30, T, end_in_r=0.12)
    sp = rrect(-W / 2, W / 2 - T + 0.03, -D / 2, D / 2 - T + 0.03, (0.26, 0.05, 0.05, 0.05))
    band, seat, foot = plan_sdf([bp], open_r=0.06), plan_sdf([sp]), plan_sdf([bp, sp], open_r=0.05)
    vol = np.minimum(solid(band - 0.03, 0.02, H, 0.085, 0.03),
                     solid(seat - 0.03, 0.02, 0.405, 0.09, 0.03, crown=0.016))
    vol = smax(vol, tub(foot, 0.02, H, 0.30, 0.022, 0.09, 0.005), 0.02)
    fabric = to_mesh(vol, 'fabric')
    plinth = L.box('plinth', (0.52, 0.46, 0.022), (0, 0.0, 0.011), bevel=0.008, seg=4)
    legs = L.join([plinth], 'legs')
else:   # runvo
    # фото: спинка-валик полной высоты по тылу, большим радиусом уходит в правый подлокотник той же высоты,
    # конец подлокотника — полукруг («D») на середине глубины сиденья; сиденье — широкая «галька» на тонких ножках
    W, D, H, T = 0.97, 0.85, 0.74, 0.21
    band = plan_sdf([band_poly(-W / 2 + T / 2, D / 2 - T / 2, W / 2 - T / 2, -0.02, 0.30, T)], open_r=T / 2 - 0.002)
    seat = plan_sdf([superellipse(0.0, -0.01, 0.465, 0.415, 2.6)])
    vol = np.minimum(solid(band, 0.19, H, 0.10, 0.07, bulge=0.012),
                     solid(seat, 0.17, 0.485, 0.13, 0.155, bulge=0.022, crown=0.015))
    fabric = to_mesh(vol, 'fabric')
    tops = [(-0.25, -0.13, 0.20), (0.25, -0.13, 0.20), (-0.28, 0.22, 0.20), (0.28, 0.22, 0.20)]   # ножки спрятаны под сиденьем: на фото оно далеко выступает вперёд
    legs = L.join([L.leg('leg', t, length=0.205, r_top=0.016, r_bot=0.008, splay=(10, 6)) for t in tops], 'legs')
for p in fabric.data.polygons: p.use_smooth = True
L.decimate(fabric, 70000)
print(which, 'fabric', L.tris(fabric), 'legs', L.tris(legs), 'bbox', [round(v, 3) for v in np.array([v.co[:] for v in fabric.data.vertices]).min(0)], [round(v, 3) for v in np.array([v.co[:] for v in fabric.data.vertices]).max(0)])
L.export3(out, fabric, legs)
