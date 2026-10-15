#!/usr/bin/env python3
"""Кровати (models3d/bed-*.glb): отделить постель — матрас, одеяло, подушки — от обивки кровати.
Без этого ткань из конструктора красила всю модель вместе с матрасом (жалоба 15 октября).
Модель из фото одной сеткой и без цвета, поэтому делим по форме:
  • верх бортика рамы — по горизонтальным граням у переднего края;
  • передняя плоскость изголовья — по самым верхним граням;
  • постель = грани выше бортика, перед изголовьем и внутри рамы по ширине.
Выход: тот же GLB с тремя сетками — fabric (обивка), legs (ножки, если были), bedding (постель).
Конструктор (js/cfg/app.js → loadExactGroup) красит fabric выбранной тканью, а bedding оставляет белым.
Запуск: python3 tools/media-v3/model3d-bedding.py ricca/models3d/bed-26.glb [выход.glb]   (по умолчанию — поверх входа)."""
import sys, numpy as np, trimesh

src = sys.argv[1]; dst = sys.argv[2] if len(sys.argv) > 2 else src
sc = trimesh.load(src, process=False)   # без склейки вершин: нормали из файла (гладкость модели) остаются как есть
if 'bedding' in sc.geometry:
    print('постель уже отделена:', src); sys.exit(0)
g = sc.geometry['fabric']
V, F = g.vertices, g.faces
c = V[F].mean(1); N = g.face_normals
ymax = V[:, 1].max(); xmax = np.abs(V[:, 0]).max(); zmax = V[:, 2].max()
zf = np.percentile(c[c[:, 1] > ymax - 0.04, 2], 98)                       # передняя плоскость изголовья
front = (N[:, 1] > 0.85) & (c[:, 2] > zmax - 0.05) & (c[:, 1] < ymax * 0.6)
rail = np.percentile(c[front, 1], 30)                                      # верх бортика рамы спереди
bed = (c[:, 1] > rail + 0.008) & (c[:, 2] > zf + 0.008) & (np.abs(c[:, 0]) < xmax - 0.03)
# одиночные «островки» на границе: грань постели, у которой все соседи — обивка (и наоборот), переклассифицируем
adj = g.face_adjacency
for _ in range(2):
    cnt = np.zeros(len(F)); tot = np.zeros(len(F))
    for a, b in adj:
        tot[a] += 1; tot[b] += 1; cnt[a] += bed[b]; cnt[b] += bed[a]
    share = np.divide(cnt, tot, out=np.zeros_like(cnt), where=tot > 0)
    bed = np.where(share > 0.67, True, np.where(share < 0.33, False, bed))
VN = g.vertex_normals   # нормали из файла (process=False — trimesh берёт их как есть)
def part(mask):
    m = trimesh.Trimesh(V, F[mask], vertex_normals=VN, process=False); m.remove_unreferenced_vertices(); return m
out = trimesh.Scene()
out.add_geometry(part(~bed), node_name='fabric', geom_name='fabric')
if 'legs' in sc.geometry: out.add_geometry(sc.geometry['legs'], node_name='legs', geom_name='legs')
out.add_geometry(part(bed), node_name='bedding', geom_name='bedding')
out.export(dst, include_normals=True)
print(f'{src}: бортик y={rail:.3f}, изголовье z={zf:.3f}; постель {bed.sum()} из {len(F)} граней → {dst}')
