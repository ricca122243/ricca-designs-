#!/usr/bin/env python3
"""Точная 3D-модель из фото каталога для конструктора (models3d/<id>.glb).
Исходник — GLB из Higgsfield по фото ricca.design/img/catalog/<фото>.webp: Tripo H3.1 (texture=false, orientation=align_image, 6 кредитов)
или Hunyuan3D v3 (15 кредитов); 40 МБ, 0,5–1,5 млн граней. Если фронт смотрит не на +z — --rot=-90 (или 90, 180).
Что делает: делит сетку на «fabric» и «legs» (тёмные грани у пола), склеивает вершины, прореживает до ~70k + 6k граней,
сглаживает, ставит пол на y=0 и центр по x/z. Нормали и UV конструктор считает сам при загрузке (js/cfg/app.js → prepExactGeo).
Нужны: pip install trimesh fast-simplification scipy pillow numpy. Запуск: python3 tools/media-v3/model3d.py in.glb ricca/models3d/sofa-25.glb
Потом в js/catalog-data.js у модели: glb: "models3d/sofa-25.glb"."""
import sys, numpy as np, trimesh, fast_simplification
PITS = next((int(a[7:]) for a in sys.argv[1:] if a.startswith('--pits=')), 0)   # --pits=N: заделка вмятин (итерации сглаживания эталона; 0 — выкл.)
CAP = next((float(a[6:]) for a in sys.argv[1:] if a.startswith('--cap=')), 0.012)   # --cap: предел подъёма вмятины, доля габарита
NSMOOTH = next((int(a[10:]) for a in sys.argv[1:] if a.startswith('--nsmooth=')), 2)   # --nsmooth=N: сглаживание нормалей
AGG = next((int(a[6:]) for a in sys.argv[1:] if a.startswith('--agg=')), 2)   # --agg: агрессивность прореживания (3 — бережнее, 7 — по умолчанию)
SMOOTH = next((int(a[9:]) for a in sys.argv[1:] if a.startswith('--smooth=')), 0)   # --smooth=N: сила сглаживания вмятин (итерации Таубина)
args = [a for a in sys.argv[1:] if not a.startswith('--rot=') and not a.startswith('--smooth=') and not a.startswith('--pits=') and not a.startswith('--cap=') and not a.startswith('--nsmooth=') and not a.startswith('--agg=')]; ROT = next((float(a[6:]) for a in sys.argv[1:] if a.startswith('--rot=')), 0)   # --rot=-90: повернуть вокруг вертикали (фронт должен смотреть на +z)
src, dst = args[0], args[1]; NF = int(args[2]) if len(args) > 2 else 70000; NL = int(args[3]) if len(args) > 3 else 6000
def raw_normals(path):
    # вершины и нормали из GLB напрямую (trimesh нормали из файла не сохраняет)
    import json, struct
    b = open(path, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n])
    off = 20 + n; assert b[off + 4:off + 8] == b'BIN\x00'; bl = struct.unpack('<I', b[off:off + 4])[0]; bin_ = b[off + 8:off + 8 + bl]
    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; st = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        return np.frombuffer(bin_, np.float32, a['count'] * 3, st).reshape(-1, 3)
    P, Nn = [], []
    for me in j['meshes']:
        for pr in me['primitives']:
            if 'NORMAL' not in pr['attributes']: continue
            P.append(acc(pr['attributes']['POSITION'])); Nn.append(acc(pr['attributes']['NORMAL']))
    if not P: return None, None
    P, Nn = np.vstack(P), np.vstack(Nn)
    # преобразование узла сцены (поворот осей), как у trimesh
    node = next((nd for nd in j.get('nodes', []) if 'mesh' in nd), {})
    if 'matrix' in node:
        M = np.array(node['matrix']).reshape(4, 4).T; P = P @ M[:3, :3].T + M[:3, 3]; Nn = Nn @ M[:3, :3].T
    elif 'rotation' in node:
        qx, qy, qz, qw = node['rotation']; R = trimesh.transformations.quaternion_matrix([qw, qx, qy, qz])[:3, :3]; P = P @ R.T; Nn = Nn @ R.T
    return P, Nn
RAW_P, RAW_N = raw_normals(src)
sc = trimesh.load(src)
m = sc.to_geometry() if hasattr(sc, 'to_geometry') else sc.dump(concatenate=True)
V, F = m.vertices.copy(), m.faces.copy()
if ROT:
    t = np.radians(ROT); c, sn = np.cos(t), np.sin(t); x, z = V[:, 0].copy(), V[:, 2].copy(); V[:, 0] = x * c + z * sn; V[:, 2] = -x * sn + z * c
    if RAW_P is not None:
        for A_ in (RAW_P, RAW_N):
            x, z = A_[:, 0].copy(), A_[:, 2].copy(); A_[:, 0] = x * c + z * sn; A_[:, 2] = -x * sn + z * c
# сверка: исходные вершины и сетка trimesh должны совпадать по габариту (иначе нормали не перенести)
if RAW_P is not None and np.abs(np.ptp(RAW_P, axis=0) - np.ptp(V, axis=0)).max() > 1e-3 * np.ptp(V, axis=0).max():
    print('нормали исходника: оси не совпали — считаем свои'); RAW_P = None
fc = V[F].mean(1)
y0, y1 = V[:, 1].min(), V[:, 1].max(); h = y1 - y0
tex_img = getattr(getattr(m.visual, 'material', None), 'baseColorTexture', None)
if tex_img is not None and getattr(m.visual, 'uv', None) is not None:
    # с текстурой: ножки — тёмные грани у пола
    tex = np.asarray(tex_img.convert('RGB')).astype(np.float32) / 255
    uv = m.visual.uv; H, W = tex.shape[:2]
    fuv = uv[F].mean(1); px = np.clip((fuv[:, 0] % 1) * (W - 1), 0, W - 1).astype(int); py = np.clip(((1 - fuv[:, 1]) % 1) * (H - 1), 0, H - 1).astype(int)
    lum = tex[py, px] @ [0.2126, 0.7152, 0.0722]
    low = fc[:, 1] < y0 + h * 0.16
    med = np.median(lum[~low]) if (~low).any() else lum.mean()
    legs = low & (lum < min(0.35, med * 0.55))
    print(f'граней {len(F)}, ножки по цвету {legs.sum()} ({legs.mean()*100:.1f} %), медиана яркости ткани {med:.2f}')
else:
    # без текстуры: ножки — нижние слои, где заполнено мало клеток сетки (у корпуса заполнена почти вся площадь)
    NL_, G = 48, 40
    lay = np.clip(((fc[:, 1] - y0) / h * NL_).astype(int), 0, NL_ - 1)
    gx = np.clip(((fc[:, 0] - V[:, 0].min()) / (np.ptp(V[:, 0]) + 1e-9) * G).astype(int), 0, G - 1)
    gz = np.clip(((fc[:, 2] - V[:, 2].min()) / (np.ptp(V[:, 2]) + 1e-9) * G).astype(int), 0, G - 1)
    occ = np.array([len(set(zip(gx[lay == i], gz[lay == i]))) for i in range(NL_)])
    full = occ[: NL_ // 2].max()
    cut = next((i for i in range(NL_ // 3) if occ[i] > full * 0.35), 0)
    legs = lay < cut
    print(f'граней {len(F)}, ножки по форме: слоёв {cut} из {NL_} ({legs.mean()*100:.1f} %)')
def part(mask, target):
    f = F[mask]
    if not len(f): return None
    used = np.unique(f); remap = np.full(len(V), -1); remap[used] = np.arange(len(used))
    v, f = V[used], remap[f]
    # сначала склеить вершины по положению (швы UV-развёртки дублируют вершины — после прореживания они дали бы трещины)
    g0 = trimesh.Trimesh(v, f, process=True); g0.merge_vertices(); g0.update_faces(g0.nondegenerate_faces()); g0.update_faces(g0.unique_faces())
    # мусор: крошечные отдельные куски (обрывки реконструкции) — убрать; мелкие дыры — зашить
    comps = g0.split(only_watertight=False)
    if len(comps) > 1:
        keep = [c for c in comps if len(c.faces) >= max(60, len(g0.faces) * 0.0008)]
        g0 = trimesh.util.concatenate(keep) if keep else g0
    try: g0.fill_holes()
    except Exception: pass
    v, f = g0.vertices, g0.faces
    # прореживание в два шага со сглаживанием между ними: вмятины и «рябь» реконструкции уходят, форма остаётся
    mid_t = max(target * 2, 120000)
    if len(f) > mid_t:
        v, f = fast_simplification.simplify(np.asarray(v, np.float32), np.asarray(f, np.int32), target_reduction=1 - mid_t / len(f), agg=AGG)
    g1 = trimesh.Trimesh(v, f, process=True); g1.merge_vertices(); g1.update_faces(g1.nondegenerate_faces())
    if SMOOTH: trimesh.smoothing.filter_taubin(g1, lamb=0.5, nu=-0.53, iterations=SMOOTH)
    # вмятины и дырки реконструкции: сравнить с сильно сглаженной копией и поднять вершины, которые провалились внутрь
    # (выпуклые детали не трогаем — только то, что ниже сглаженной поверхности больше порога)
    if PITS > 0:
        from scipy.sparse import coo_matrix
        from scipy.sparse.csgraph import connected_components
        size = np.ptp(g1.vertices, axis=0).max()
        # 1) мелкая рябь и неглубокие вмятины: мягкий эталон (Лаплас, 40 итераций), подъём к нему
        sm = g1.copy(); trimesh.smoothing.filter_laplacian(sm, lamb=0.5, iterations=40, volume_constraint=False)
        n = g1.vertex_normals; dv = sm.vertices - g1.vertices; depth = np.einsum('ij,ij->i', dv, n)
        thr = size * 0.004; w = np.clip((depth - thr) / (thr * 2), 0, 1)[:, None]
        g1.vertices = g1.vertices + dv * w * (depth > thr)[:, None]
        # 2) глубокие компактные ямы: жёсткий эталон (Таубин, PITS итераций); ядро ямы — провал глубже 1,2 % габарита;
        #    связные ядра не длиннее 15 % габарита считаем ямами (ложбины между подушками длинные — их не трогаем);
        #    вокруг ядра поднимаем всё, что ниже эталона, с плавным краем
        sm = g1.copy(); trimesh.smoothing.filter_taubin(sm, lamb=0.5, nu=-0.53, iterations=PITS)
        n = g1.vertex_normals; dv = sm.vertices - g1.vertices; depth = np.einsum('ij,ij->i', dv, n)
        core = depth > size * 0.012; idx = np.where(core)[0]
        if len(idx) > 5:
            e = g1.edges_unique; e = e[core[e[:, 0]] & core[e[:, 1]]]
            loc = np.full(len(g1.vertices), -1); loc[idx] = np.arange(len(idx))
            A = coo_matrix((np.ones(len(e)), (loc[e[:, 0]], loc[e[:, 1]])), shape=(len(idx), len(idx)))
            k, lab = connected_components(A, directed=False)
            lift = np.zeros(len(g1.vertices))
            for c in range(k):
                vi = idx[lab == c]
                if len(vi) < 8: continue
                ext = np.ptp(g1.vertices[vi], axis=0).max()
                if ext > size * 0.15: continue
                cen = g1.vertices[vi].mean(0); r = max(ext * 1.2, size * 0.03)
                d = np.linalg.norm(g1.vertices - cen, axis=1); fe = np.clip(1 - (d - r * 0.6) / (r * 0.4), 0, 1)
                lift = np.maximum(lift, fe)
            pos = np.maximum(depth, 0)[:, None]
            g1.vertices = g1.vertices + n * pos * lift[:, None] * (depth > size * 0.002)[:, None]
            print(f'   ям заделано: {sum(1 for c in range(k) if (lab == c).sum() >= 8 and np.ptp(g1.vertices[idx[lab == c]], axis=0).max() <= size * 0.15)}')
        trimesh.smoothing.filter_taubin(g1, lamb=0.5, nu=-0.53, iterations=6)
    v, f = g1.vertices, g1.faces
    if len(f) > target:
        v, f = fast_simplification.simplify(np.asarray(v, np.float32), np.asarray(f, np.int32), target_reduction=1 - target / len(f), agg=AGG)
    g = trimesh.Trimesh(v, f, process=True); g.merge_vertices(); g.update_faces(g.nondegenerate_faces()); g.update_faces(g.unique_faces()); g.fix_normals()
    if SMOOTH: trimesh.smoothing.filter_taubin(g, lamb=0.5, nu=-0.53, iterations=6)
    # нормали: усреднить по соседям NSMOOTH раз — мелкие ямки и рябь реконструкции перестают отбрасывать тени,
    # как в исходнике Tripo (там нормали тоже сглажены); форма при этом не меняется
    from scipy.sparse import coo_matrix
    nv = len(g.vertices); e = g.edges_unique
    A = coo_matrix((np.ones(len(e) * 2), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(nv, nv)).tocsr()
    deg = np.asarray(A.sum(1)).ravel() + 1
    if RAW_P is not None:
        # нормали исходника (они сглажены реконструкцией и прячут миллиметровые ямки): ближайшая исходная вершина
        from scipy.spatial import cKDTree
        _, ii = cKDTree(RAW_P).query(g.vertices, k=1)
        N = RAW_N[ii].astype(np.float64); N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
        # если исходные нормали смотрят внутрь относительно наших — перевернуть
        if (np.einsum('ij,ij->i', N, g.vertex_normals) < 0).mean() > 0.5: N = -N
    else:
        N = np.array(g.vertex_normals, dtype=np.float64)
    for _ in range(NSMOOTH):
        N = (A @ N + N) / deg[:, None]; N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
    g.vertex_normals = N
    return g
fab, lg = part(~legs, NF), part(legs, NL)
parts = {'fabric': fab}; 
if lg is not None and len(lg.faces) > 50: parts['legs'] = lg
else: parts['fabric'] = part(np.ones(len(F), bool), NF)
# пол на y=0, центр по x/z — по всей модели
allv = np.vstack([g.vertices for g in parts.values()]); mn, mx = allv.min(0), allv.max(0)
off = np.array([(mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2])
out = trimesh.Scene()
for name, g in parts.items():
    g.vertices -= off; g.visual = trimesh.visual.ColorVisuals(g); out.add_geometry(g, node_name=name, geom_name=name)
out.export(dst, include_normals=True)
import os; print('итог:', {k: len(g.faces) for k, g in parts.items()}, 'размер', (mx - mn).round(3).tolist(), 'файл', round(os.path.getsize(dst) / 1e6, 2), 'МБ')
