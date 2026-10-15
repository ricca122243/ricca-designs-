#!/usr/bin/env python3
"""Точная 3D-модель из фото каталога для конструктора (models3d/<id>.glb).
Исходник — GLB из Higgsfield (Hunyuan3D v3 по фото ricca.design/img/catalog/<фото>.webp, ~15 кредитов, ~40 МБ, 500k граней).
Что делает: делит сетку на «fabric» и «legs» (тёмные грани у пола), склеивает вершины, прореживает до ~70k + 6k граней,
сглаживает, ставит пол на y=0 и центр по x/z. Нормали и UV конструктор считает сам при загрузке (js/cfg/app.js → prepExactGeo).
Нужны: pip install trimesh fast-simplification scipy pillow numpy. Запуск: python3 tools/media-v3/model3d.py in.glb ricca/models3d/sofa-25.glb
Потом в js/catalog-data.js у модели: glb: "models3d/sofa-25.glb"."""
import sys, numpy as np, trimesh, fast_simplification
src, dst = sys.argv[1], sys.argv[2]; NF = int(sys.argv[3]) if len(sys.argv) > 3 else 70000; NL = int(sys.argv[4]) if len(sys.argv) > 4 else 6000
sc = trimesh.load(src)
m = sc.to_geometry() if hasattr(sc, 'to_geometry') else sc.dump(concatenate=True)
V, F = m.vertices.copy(), m.faces.copy()
# цвет каждой грани — из текстуры по UV центра
tex = np.asarray(m.visual.material.baseColorTexture.convert('RGB')).astype(np.float32) / 255
uv = m.visual.uv; H, W = tex.shape[:2]
fuv = uv[F].mean(1); px = np.clip((fuv[:, 0] % 1) * (W - 1), 0, W - 1).astype(int); py = np.clip(((1 - fuv[:, 1]) % 1) * (H - 1), 0, H - 1).astype(int)
col = tex[py, px]; lum = col @ [0.2126, 0.7152, 0.0722]
fc = V[F].mean(1)
y0, y1 = V[:, 1].min(), V[:, 1].max(); h = y1 - y0
low = fc[:, 1] < y0 + h * 0.16
med = np.median(lum[~low]) if (~low).any() else lum.mean()
legs = low & (lum < min(0.35, med * 0.55))
print(f'граней {len(F)}, ножки {legs.sum()} ({legs.mean()*100:.1f} %), медиана яркости ткани {med:.2f}')
def part(mask, target):
    f = F[mask]
    if not len(f): return None
    used = np.unique(f); remap = np.full(len(V), -1); remap[used] = np.arange(len(used))
    v, f = V[used], remap[f]
    # сначала склеить вершины по положению (швы UV-развёртки дублируют вершины — после прореживания они дали бы трещины)
    g0 = trimesh.Trimesh(v, f, process=True); g0.merge_vertices(); g0.update_faces(g0.nondegenerate_faces()); g0.update_faces(g0.unique_faces())
    v, f = g0.vertices, g0.faces
    if len(f) > target:
        v, f = fast_simplification.simplify(np.asarray(v, np.float32), np.asarray(f, np.int32), target_reduction=1 - target / len(f))
    g = trimesh.Trimesh(v, f, process=True); g.merge_vertices(); g.update_faces(g.nondegenerate_faces()); g.update_faces(g.unique_faces()); g.fix_normals()
    trimesh.smoothing.filter_taubin(g, lamb=0.5, nu=-0.53, iterations=6)   # сгладить «рябь» после прореживания
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
out.export(dst)
import os; print('итог:', {k: len(g.faces) for k, g in parts.items()}, 'размер', (mx - mn).round(3).tolist(), 'файл', round(os.path.getsize(dst) / 1e6, 2), 'МБ')
