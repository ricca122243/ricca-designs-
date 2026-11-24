"""Сверка 3D-модели с фото каталога — не на глаз, а наложением.
Для каждого опорного фото (refs.py) подбирается камера, при которой силуэт модели лучше всего ложится на силуэт
изделия на фото; затем считается совпадение (IoU обивки, среднее и 95-е расхождение контуров в сантиметрах) и
рисуются листы: фото | фото с контуром модели | «глиняный» вид модели с контуром фото.

Модель: GLB сайта (сетки fabric и legs) или parts.npz (<имя>_v, <имя>_f — детали по отдельности; имена на leg/frame/plinth — опоры).
Оси как в Blender: X вправо, −Y к зрителю (фронт), Z вверх, метры.

Запуск:  python photofit.py <chair> <model.glb|parts.npz> <outdir> [--cams cams.json] [--quick] [--turn] [--prior prior.json]
  chair — ключ из refs.REFS (runvo, galso). В outdir: sheet.jpg, <фото>.jpg, scores.json, cams.json.
Как библиотека: sample(parts) → fit_all(...) → см. main()."""
import sys, os, json, struct, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage, optimize
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import refs as R

TARGET = np.array([0.0, 0.0, 0.37])          # куда смотрит камера (середина кресла)
SUPPORT = ('leg', 'frame', 'plinth')         # имена деталей-опор


# ───────── чтение модели ─────────
def read_glb(path):
    """GLB → {имя сетки: (V, F)} в осях Blender (glTF: Y вверх → Z вверх, −Y к зрителю)"""
    b = open(path, 'rb').read()
    assert b[:4] == b'glTF'
    jl = struct.unpack('<I', b[12:16])[0]; js = json.loads(b[20:20 + jl]); bo = 20 + jl + 8; binb = b[bo:]
    def acc(i):
        a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        dt = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}[a['componentType']]
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
        st = bv.get('byteStride', 0)
        if st and st != np.dtype(dt).itemsize * n:
            raw = np.frombuffer(binb, np.uint8, count=st * a['count'], offset=off).reshape(a['count'], st)[:, :np.dtype(dt).itemsize * n]
            return np.frombuffer(raw.tobytes(), dt).reshape(a['count'], n)
        return np.frombuffer(binb, dt, count=a['count'] * n, offset=off).reshape(a['count'], n)
    def mat(nd):
        if 'matrix' in nd: return np.array(nd['matrix'], float).reshape(4, 4).T
        M = np.eye(4)
        if 'scale' in nd: M = np.diag(list(nd['scale']) + [1.0]) @ M
        if 'rotation' in nd:
            x, y, z, w = nd['rotation']
            Rm = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                           [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                           [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
            T = np.eye(4); T[:3, :3] = Rm; M = T @ M
        if 'translation' in nd:
            T = np.eye(4); T[:3, 3] = nd['translation']; M = T @ M
        return M
    out = {}
    def walk(i, M):
        nd = js['nodes'][i]; M = M @ mat(nd)
        if 'mesh' in nd:
            me = js['meshes'][nd['mesh']]; Vs, Fs, k = [], [], 0
            for pr in me['primitives']:
                v = acc(pr['attributes']['POSITION']).astype(float)
                v = (np.c_[v, np.ones(len(v))] @ M.T)[:, :3]
                f = acc(pr['indices']).reshape(-1, 3).astype(np.int64) if 'indices' in pr else np.arange(len(v)).reshape(-1, 3)
                Vs.append(v); Fs.append(f + k); k += len(v)
            V = np.vstack(Vs); F = np.vstack(Fs)
            V = np.stack([V[:, 0], -V[:, 2], V[:, 1]], 1)        # glTF (x, y вверх, z к зрителю) → Blender
            out[nd.get('name', me.get('name', f'mesh{i}'))] = (V, F)
        for c in nd.get('children', []): walk(c, M)
    for r in js['scenes'][js.get('scene', 0)]['nodes']: walk(r, np.eye(4))
    return out


def read_parts(path):
    if path.lower().endswith('.glb'): return read_glb(path)
    z = np.load(path); names = sorted({k[:-2] for k in z.files if k.endswith('_v')})
    return {n: (z[n + '_v'].astype(float), z[n + '_f'].astype(np.int64)) for n in names}


def is_support(name):
    return name.lower().startswith(SUPPORT)


def sample(parts, n=900_000, seed=1):
    """точки на поверхности: равномерно по площади, с нормалями и номером детали"""
    rng = np.random.default_rng(seed); names = list(parts)
    areas = []
    for nm in names:
        V, F = parts[nm]; a = 0.5 * np.linalg.norm(np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]), axis=1); areas.append(a)
    tot = sum(a.sum() for a in areas); P, Nn, Lb = [], [], []
    for i, nm in enumerate(names):
        V, F = parts[nm]; a = areas[i]
        k = max(4000, int(n * a.sum() / tot)) if not is_support(nm) else max(60_000, int(n * a.sum() / tot))
        fi = rng.choice(len(F), k, p=a / a.sum()); u = rng.random((k, 2)); s = u.sum(1) > 1; u[s] = 1 - u[s]
        A, B, C = V[F[fi, 0]], V[F[fi, 1]], V[F[fi, 2]]
        P.append(A + (B - A) * u[:, :1] + (C - A) * u[:, 1:]); nr = np.cross(B - A, C - A); nr /= np.linalg.norm(nr, axis=1)[:, None] + 1e-12
        Nn.append(nr); Lb.append(np.full(k, i))
    return np.vstack(P), np.vstack(Nn), np.concatenate(Lb), names


# ───────── камера ─────────
def cam_basis(az, el):
    a, e = math.radians(az), math.radians(el)
    v = np.array([math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), -math.sin(e)])   # взгляд: az>0 — камера слева от фронта, el>0 — сверху
    r = np.array([math.cos(a), -math.sin(a), 0.0]); up = np.cross(r, v)
    return r, up, v


def project(P, cam):
    """cam = dict(az, el, roll, dist, scale, u0, v0); scale — пикселей на метр на расстоянии dist (в пикселях фото 1280)"""
    r, up, v = cam_basis(cam['az'], cam['el']); C = TARGET - cam['dist'] * v
    p = P - C; x = p @ r; y = p @ up; z = p @ v
    if cam.get('roll'):
        c, s = math.cos(math.radians(cam['roll'])), math.sin(math.radians(cam['roll'])); x, y = c * x - s * y, s * x + c * y
    f = cam['scale'] * cam['dist']
    return cam['u0'] + f * x / z, cam['v0'] - f * y / z, z


def splat(P, cam, size, k=1.0, vals=None):
    """маска (и по желанию карта значений ближайшей точки) в кадре size×size; k — масштаб относительно фото 1280"""
    u, v, z = project(P, cam); ui = np.round(u * k).astype(np.int64); vi = np.round(v * k).astype(np.int64)
    ok = (ui >= 0) & (ui < size) & (vi >= 0) & (vi < size)
    m = np.zeros((size, size), bool); m[vi[ok], ui[ok]] = True
    if vals is None: return m
    o = np.argsort(-z[ok]); idx = (vi[ok] * size + ui[ok])[o]
    outs = []
    for a in vals:
        buf = np.zeros(size * size, a.dtype); buf[idx] = a[ok][o]; outs.append(buf.reshape(size, size))
    zb = np.full(size * size, np.inf); zb[idx] = z[ok][o]
    return m, outs, zb.reshape(size, size)


def rs(m, size):
    """маску фото (1280) — к размеру листа"""
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((size, size), Image.BILINEAR)) > 127


def solid(m, it=2):
    return ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=it))


def iou(a, b):
    u = (a | b).sum(); return float((a & b).sum() / u) if u else 0.0


def align(P, cam, bb):
    """масштаб и сдвиг так, чтобы рамка проекции совпала с рамкой маски фото (bb = x0, y0, x1, y1 в пикселях фото)"""
    c = dict(cam, scale=1.0, u0=0.0, v0=0.0); u, v, _ = project(P, c)
    s = math.sqrt(((bb[2] - bb[0]) * (bb[3] - bb[1])) / max((u.max() - u.min()) * (v.max() - v.min()), 1e-9))
    return dict(cam, scale=s, u0=(bb[0] + bb[2]) / 2 - s * (u.min() + u.max()) / 2, v0=(bb[1] + bb[3]) / 2 - s * (v.min() + v.max()) / 2)


def fit_camera(Pb, ref_body, cam0=None, size=320, quick=False, prior=None):
    """камера под одно фото по силуэту обивки. Сначала перебор азимута/высоты/расстояния с подгонкой рамки, затем уточнение"""
    k = size / ref_body.shape[0]
    small = rs(ref_body, size)
    ys, xs = np.where(ref_body); bb = (xs.min(), ys.min(), xs.max(), ys.max())
    Ps = Pb[::max(1, len(Pb) // 120_000)]
    def score(c): return iou(solid(splat(Ps, c, size, k)), small)
    best = None; prior = prior or {}
    azr = prior.get('az', (-70, 70)); elr = prior.get('el', (0, 55))
    if cam0 is None or not quick:
        for dist in (3.0, 6.0, 14.0):
            for el in np.linspace(elr[0], elr[1], max(2, int((elr[1] - elr[0]) / 5) + 1)):
                for az in np.linspace(azr[0], azr[1], max(2, int((azr[1] - azr[0]) / 8) + 1)):
                    c = align(Ps, dict(az=az, el=el, roll=0.0, dist=dist), bb); s = score(c)
                    if best is None or s > best[0]: best = (s, c)
    if cam0 is not None:
        s = score(cam0)
        if best is None or s >= best[0] - 0.01: best = (s, dict(cam0))
    c0 = best[1]; keys = ['az', 'el', 'roll', 'ld', 'scale', 'u0', 'v0']
    x0 = np.array([c0['az'], c0['el'], c0.get('roll', 0.0), math.log(c0['dist']), c0['scale'], c0['u0'], c0['v0']])
    step = np.array([4.0, 3.0, 1.0, 0.25, 0.03 * c0['scale'], 12.0, 12.0])
    def unpack(x): return dict(az=float(np.clip(x[0], *azr)), el=float(np.clip(x[1], *elr)), roll=float(np.clip(x[2], -6, 6)), dist=float(np.exp(np.clip(x[3], math.log(1.6), math.log(40)))), scale=x[4], u0=x[5], v0=x[6])
    def loss(x): return 1 - score(unpack(x))
    sim = np.vstack([x0] + [x0 + step * np.eye(7)[i] for i in range(7)])
    res = optimize.minimize(loss, x0, method='Nelder-Mead', options=dict(initial_simplex=sim, maxiter=260 if quick else 520, xatol=0.05, fatol=2e-4))
    sim = np.vstack([res.x] + [res.x + 0.35 * step * np.eye(7)[i] for i in range(7)])
    res = optimize.minimize(loss, res.x, method='Nelder-Mead', options=dict(initial_simplex=sim, maxiter=200 if quick else 420, xatol=0.02, fatol=1e-4))
    return unpack(res.x), 1 - res.fun


# ───────── оценка и листы ─────────
def contour(m):
    return m & ~ndimage.binary_erosion(m)


def chamfer(a, b):
    """расхождение контуров масок a и b в пикселях: среднее и 95-й процентиль (в обе стороны)"""
    ca, cb = contour(a), contour(b)
    if not ca.any() or not cb.any(): return 99.0, 99.0
    da = ndimage.distance_transform_edt(~cb)[ca]; db = ndimage.distance_transform_edt(~ca)[cb]; d = np.concatenate([da, db])
    return float(d.mean()), float(np.percentile(d, 95))


def render(P, Nn, Lb, names, cam, size=640):
    """«глина»: ближайшая точка в пикселе, свет сверху-слева; + карта деталей и глубина.
    Берутся только точки, обращённые к камере (обратная сторона замкнутой сетки не видна), каждая красит 2×2 пикселя"""
    k = size / 1280; r, up, v = cam_basis(cam['az'], cam['el']); C = TARGET - cam['dist'] * v
    d = P - C; d /= np.linalg.norm(d, axis=1)[:, None]
    front = np.einsum('ij,ij->i', Nn, d) < 0.08
    P, Nn, Lb = P[front], Nn[front], Lb[front]
    light = (-0.45 * r + 0.75 * up - 0.5 * v); light /= np.linalg.norm(light)
    sh = np.clip(np.clip(Nn @ light, 0, 1) * 0.72 + 0.26 + 0.12 * np.clip(Nn @ -v, 0, 1), 0, 1).astype(np.float32)
    u, vv, z = project(P, cam); u = u * k; vv = vv * k
    U = np.concatenate([np.floor(u), np.floor(u) + 1, np.floor(u), np.floor(u) + 1]).astype(np.int64)
    V = np.concatenate([np.floor(vv), np.floor(vv), np.floor(vv) + 1, np.floor(vv) + 1]).astype(np.int64)
    Z = np.tile(z, 4); S = np.tile(sh, 4); Lq = np.tile((Lb + 1).astype(np.int32), 4)
    ok = (U >= 0) & (U < size) & (V >= 0) & (V < size); o = np.argsort(-Z[ok]); idx = (V[ok] * size + U[ok])[o]
    shade = np.zeros(size * size, np.float32); shade[idx] = S[ok][o]
    lab = np.zeros(size * size, np.int32); lab[idx] = Lq[ok][o]
    zb = np.full(size * size, np.inf); zb[idx] = Z[ok][o]
    nrm = np.zeros((size * size, 3), np.float32); nrm[idx] = np.tile(Nn.astype(np.float32), (4, 1))[ok][o]
    shade, lab, zb, nrm = shade.reshape(size, size), lab.reshape(size, size), zb.reshape(size, size), nrm.reshape(size, size, 3)
    m = lab > 0; full = solid(m, 2); hole = full & ~m
    if hole.any():
        idx2 = ndimage.distance_transform_edt(~m, return_distances=False, return_indices=True)
        for a in (shade, lab, zb, nrm): a[hole] = a[idx2[0][hole], idx2[1][hole]]
    # линии формы: излом нормали больше ~35° между соседними пикселями (складка между деталями, ребро, край детали перед другой)
    ns = np.stack([ndimage.uniform_filter(nrm[..., c], 3) for c in range(3)], -1); ns /= np.linalg.norm(ns, axis=2)[..., None] + 1e-9
    edge = np.zeros((size, size), bool)
    for dy, dx in ((0, 1), (1, 0)):
        dot = (ns * np.roll(ns, (-dy, -dx), (0, 1))).sum(2); e = dot < 0.80; edge |= e | np.roll(e, (dy, dx), (0, 1))
    zf = ndimage.median_filter(np.where(np.isfinite(zb), zb, 0), 3)
    for ax in (0, 1):
        d1 = np.abs(np.diff(zf, axis=ax, prepend=zf.take([0], axis=ax))); d2 = np.abs(np.diff(zf, 2, axis=ax, prepend=zf.take([0], axis=ax), append=zf.take([-1], axis=ax)))
        edge |= (d2 > 0.03)
    edge &= ndimage.binary_erosion(full, iterations=4)
    return full, shade, lab, zb, edge


def quick_score(parts, chair, cams, refine=60, n=160_000, size=224):
    """быстрая оценка для автоподбора параметров формы: средний IoU обивки по всем фото при слегка уточнённых камерах.
    Возвращает (средний IoU, худший IoU, камеры). Маски фото кэшируются."""
    P, Nn, Lb, names = sample(parts, n=n); sup = np.array([is_support(x) for x in names]); Pb = P[~sup[Lb]]
    out = dict(cams); vals = []
    for view, photos in R.REFS[chair].items():
        for nme in photos:
            if nme not in _MASKS: _MASKS[nme] = R.obj_mask(R.load(nme), split=True)[0]
            body = _MASKS[nme]; small = rs(body, size); k = size / body.shape[0]; pr = R.PRIOR.get((chair, view), {})
            azr = pr.get('az', (-70, 70)); elr = pr.get('el', (0, 55)); c0 = cams[nme]
            x0 = np.array([c0['az'], c0['el'], math.log(c0['dist']), c0['scale'], c0['u0'], c0['v0']])
            def unpack(x): return dict(az=float(np.clip(x[0], *azr)), el=float(np.clip(x[1], *elr)), roll=c0.get('roll', 0.0), dist=float(np.exp(np.clip(x[2], math.log(1.6), math.log(40)))), scale=x[3], u0=x[4], v0=x[5])
            def loss(x): return 1 - iou(solid(splat(Pb, unpack(x), size, k)), small)
            if refine:
                step = np.array([2.0, 1.5, 0.12, 0.012 * c0['scale'], 5.0, 5.0]); sim = np.vstack([x0] + [x0 + step * np.eye(6)[i] for i in range(6)])
                res = optimize.minimize(loss, x0, method='Nelder-Mead', options=dict(initial_simplex=sim, maxiter=refine, xatol=0.05, fatol=3e-4)); x0 = res.x
            out[nme] = unpack(x0); vals.append(1 - loss(x0))
    return float(np.mean(vals)), float(np.min(vals)), out


_MASKS = {}


def evaluate(parts, chair, outdir, cams=None, quick=False, log=print, prior=None):
    os.makedirs(outdir, exist_ok=True)
    P, Nn, Lb, names = sample(parts)
    sup = np.array([is_support(n) for n in names]); body_pts = ~sup[Lb]
    Pb = P[body_pts]
    cams = dict(cams or {}); scores = {}; rows = []
    for view, photos in R.REFS[chair].items():
        for nme in photos:
            img = R.load(nme).astype(np.uint8); body, legs = R.obj_mask(img.astype(np.float32), split=True)
            cam, s = fit_camera(Pb, body, cams.get(nme), quick=quick, prior=(prior or {}).get(view, R.PRIOR.get((chair, view)))); cams[nme] = cam
            size = 640; k = size / 1280
            mask, shade, lab, zb, crease = render(P, Nn, Lb, names, cam, size)
            mb = solid(splat(Pb, cam, size, k), 2)
            pb = rs(body, size); pl = rs(legs, size)
            i_body = iou(mb, pb); cm_px = cam['scale'] * k / 100.0     # пикселей листа на сантиметр
            d_mean, d_95 = chamfer(mb, pb)
            ml = solid(splat(P[~body_pts], cam, size, k), 1) if (~body_pts).any() else np.zeros_like(mb)
            i_all = iou(mb | ml, pb | pl)
            scores[nme] = dict(view=view, iou_body=round(i_body, 4), iou_all=round(i_all, 4), contour_mean_cm=round(d_mean / cm_px, 2),
                               contour_p95_cm=round(d_95 / cm_px, 2), cam={kk: round(float(vv), 3) for kk, vv in cam.items()})
            log(f"{nme:22s} {view:6s} IoU обивки {i_body:.3f}  контур: среднее {d_mean / cm_px:.1f} см, 95% {d_95 / cm_px:.1f} см  "
                f"камера az {cam['az']:.1f} el {cam['el']:.1f} dist {cam['dist']:.1f}")
            # листы
            ph = np.asarray(Image.fromarray(img).resize((size, size), Image.LANCZOS)).astype(np.float32)
            ov = ph.copy()
            only_m = mb & ~pb; only_p = pb & ~mb
            ov[only_m] = ov[only_m] * 0.45 + np.array([40, 110, 255]) * 0.55      # синее: модель шире фото
            ov[only_p] = ov[only_p] * 0.45 + np.array([255, 40, 200]) * 0.55     # малиновое: на фото есть, в модели нет
            def thick(c, it=1): return ndimage.binary_dilation(c, iterations=it) if it > 0 else c
            # внутренние линии модели: границы деталей и резкие перепады глубины (складки между деталями)
            lb_edge = np.zeros_like(mask)
            for i, nm in enumerate(names):
                pk = lab == i + 1; lb_edge |= (pk ^ ndimage.binary_erosion(pk)) & ndimage.binary_erosion(mask, iterations=2)
            ov[thick(crease | lb_edge, 0)] = (255, 230, 0)
            ov[thick(contour(mb))] = (255, 0, 0)
            clay = np.full((size, size, 3), 244.0); tint = np.ones((len(names) + 1, 3))
            for i, nm in enumerate(names):
                tint[i + 1] = (0.25, 0.25, 0.27) if is_support(nm) else ((0.80, 0.78, 0.74) if i % 2 == 0 else (0.72, 0.74, 0.80))
            clay[mask] = (shade[mask][:, None] * tint[lab[mask]] * 255)
            clay[thick(crease | lb_edge, 0)] *= 0.72
            clay[thick(contour(pb))] = (0, 170, 60)                           # зелёное: контур изделия на фото
            ys, xs = np.where(pb | mb); x0, x1, y0, y1 = max(xs.min() - 14, 0), min(xs.max() + 14, size), max(ys.min() - 14, 0), min(ys.max() + 40, size)
            tiles = [Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).crop((x0, y0, x1, y1)) for a in (ph, ov, clay)]
            H = 400; tiles = [t.resize((int(t.width * H / t.height), H), Image.LANCZOS) for t in tiles]
            row = Image.new('RGB', (sum(t.width for t in tiles) + 16, H + 26), 'white'); x = 0
            for t in tiles: row.paste(t, (x, 26)); x += t.width + 8
            ImageDraw.Draw(row).text((4, 6), f"{nme} ({view}) · IoU {i_body:.3f} · контур {d_mean / cm_px:.1f} / {d_95 / cm_px:.1f} см · фото | наложение (красный — модель, синее — лишнее, малиновое — не хватает) | модель + зелёный контур фото", fill=(0, 0, 0))
            row.save(os.path.join(outdir, nme + '.jpg'), quality=88); rows.append(row)
    W = max(r.width for r in rows); sheet = Image.new('RGB', (W, sum(r.height for r in rows)), 'white'); y = 0
    for r in rows: sheet.paste(r, (0, y)); y += r.height
    sheet.save(os.path.join(outdir, 'sheet.jpg'), quality=85)
    vals = [s['iou_body'] for s in scores.values()]
    summary = dict(chair=chair, iou_body_mean=round(float(np.mean(vals)), 4), iou_body_min=round(float(np.min(vals)), 4),
                   contour_mean_cm=round(float(np.mean([s['contour_mean_cm'] for s in scores.values()])), 2),
                   contour_p95_cm_max=round(float(np.max([s['contour_p95_cm'] for s in scores.values()])), 2), photos=scores)
    bb = np.vstack([v for v, f in parts.values()]); summary['size_cm'] = [round(float(x) * 100, 1) for x in (bb.max(0) - bb.min(0))]
    json.dump(summary, open(os.path.join(outdir, 'scores.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(cams, open(os.path.join(outdir, 'cams.json'), 'w'), indent=1)
    log(f"ИТОГО {chair}: IoU обивки среднее {summary['iou_body_mean']:.3f}, худшее {summary['iou_body_min']:.3f}; контур среднее {summary['contour_mean_cm']:.1f} см, худшее 95% {summary['contour_p95_cm_max']:.1f} см; габариты {summary['size_cm']} см")
    return summary


def turntable(parts, path, views=((0, 8), (40, 12), (90, 8), (180, 10), (-90, 8), (-40, 12), (25, 55), (0, 89)), size=420):
    """«глина» с ракурсов, которых нет на фото (az, el): спереди, три четверти, бока, сзади, сверху — нет ли там нелепого"""
    P, Nn, Lb, names = sample(parts, n=700_000); bb = P.min(0), P.max(0); ext = float(np.linalg.norm(bb[1] - bb[0]))
    tiles = []
    for az, el in views:
        cam = dict(az=az, el=el, roll=0.0, dist=6.0, scale=0.80 * 1280 / ext, u0=640.0, v0=640.0 + 0.0)
        mask, shade, lab, zb, edge = render(P, Nn, Lb, names, cam, size)
        img = np.full((size, size, 3), 244.0); tint = np.ones((len(names) + 1, 3))
        for i, nm in enumerate(names): tint[i + 1] = (0.25, 0.25, 0.27) if is_support(nm) else (0.80, 0.78, 0.74)
        img[mask] = shade[mask][:, None] * tint[lab[mask]] * 255; img[edge] *= 0.75
        tl = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)); ImageDraw.Draw(tl).text((6, 6), f"az {az} el {el}", fill=(0, 0, 0)); tiles.append(tl)
    n = 4; rows = [tiles[i:i + n] for i in range(0, len(tiles), n)]
    sheet = Image.new('RGB', (n * (size + 4), len(rows) * (size + 4)), 'white')
    for y, r in enumerate(rows):
        for x, tl in enumerate(r): sheet.paste(tl, (x * (size + 4), y * (size + 4)))
    sheet.save(path, quality=88)


def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]; chair, model, outdir = a[0], a[1], a[2]
    cams = None
    if '--cams' in sys.argv:
        p = sys.argv[sys.argv.index('--cams') + 1]
        if os.path.exists(p): cams = json.load(open(p))
    elif os.path.exists(os.path.join(outdir, 'cams.json')): cams = json.load(open(os.path.join(outdir, 'cams.json')))
    prior = json.load(open(sys.argv[sys.argv.index('--prior') + 1])) if '--prior' in sys.argv else None   # {"low": {"az": [0, 60], "el": [0, 18]}, …}
    parts = read_parts(model)
    evaluate(parts, chair, outdir, cams=cams, quick='--quick' in sys.argv, prior=prior)
    if '--turn' in sys.argv: turntable(parts, os.path.join(outdir, 'turn.jpg'))      # виды со всех сторон, не только как на фото


if __name__ == '__main__':
    main()
