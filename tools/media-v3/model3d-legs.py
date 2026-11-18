#!/usr/bin/env python3
"""Точная 3D-модель без отдельной сетки ножек (models3d/<id>.glb): отделить ножки или цоколь снизу в сетку «legs».
Нужно, когда опора — не ткань (деревянные ножки-«бочонки», тёмный диск), а модель из фото пришла одной сеткой:
иначе конструктор красит ножки выбранной тканью (js/cfg/app.js → loadExactGroup: matKey по имени сетки).
Делим разрезом графа: ниже --cut (в единицах модели, пол y=0) — точно ножки; выше --top и низ сиденья (грани вниз) — точно ткань;
между ними граница ложится по вогнутому излому — стыку ножки с низом сиденья (шов там дешевле, чем на ровной ножке).
Мелкие острова (< 4 см²) — в метку соседей. Нормали из файла сохраняются.
Запуск: python3 tools/media-v3/model3d-legs.py ricca/models3d/armchair-11.glb --cut=0.04 --top=0.2 [выход.glb]
  armchair-11 (ножки-бочонки): --cut=0.04 --top=0.2;  armchair-01 (диск снизу): --cut=0.012 --top=0.03"""
import sys, numpy as np, trimesh, scipy.sparse as sp
from scipy.sparse.csgraph import connected_components, maximum_flow, breadth_first_order

args = [a for a in sys.argv[1:] if not a.startswith('--')]
CUT = next((float(a[6:]) for a in sys.argv[1:] if a.startswith('--cut=')), None)
TOP = next((float(a[6:]) for a in sys.argv[1:] if a.startswith('--top=')), None)
src = args[0]; dst = args[1] if len(args) > 1 else src
if CUT is None or TOP is None: sys.exit('нужны --cut=<высота> и --top=<высота>')
sc = trimesh.load(src, process=False)
if 'legs' in sc.geometry: print('ножки уже отделены:', src); sys.exit(0)
g = sc.geometry['fabric']; V, F = g.vertices, g.faces; c = V[F].mean(1); area = g.area_faces; nf = len(F)
N = g.face_normals; adj = g.face_adjacency
hard_l = c[:, 1] < CUT
hard_f = (c[:, 1] > TOP) | ((N[:, 1] < -0.6) & (c[:, 1] > CUT + 0.005))
free = ~hard_l & ~hard_f
a0 = area / area.mean()
Cl = np.where(hard_f, 1e3, 0.0); Cf = np.where(hard_l, 1e3, np.where(free & (np.abs(N[:, 1]) < 0.5), 0.02 * a0, 0.0))   # цена метки «ножки» / «ткань»
E = g.face_adjacency_edges; L = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1); L = L / L.mean()
w = L * np.where(g.face_adjacency_convex, 1.0, np.exp(-(g.face_adjacency_angles / 0.35) ** 2))
s_, t_ = nf, nf + 1
rows = np.concatenate([adj[:, 0], adj[:, 1], np.full(nf, s_), np.arange(nf)]); cols = np.concatenate([adj[:, 1], adj[:, 0], np.arange(nf), np.full(nf, t_)])
G = sp.csr_matrix((np.maximum(np.round(np.concatenate([w, w, Cf, Cl]) * 1000), 0).astype(np.int32), (rows, cols)), shape=(nf + 2, nf + 2)); G.sum_duplicates()
R = G - maximum_flow(G, s_, t_, method='dinic').flow; R.data = np.maximum(R.data, 0); R.eliminate_zeros()
legs = np.zeros(nf + 2, bool); legs[breadth_first_order(R, s_, directed=True, return_predecessors=False)] = True; legs = legs[:nf]
for _ in range(3):
    for lab in (True, False):
        m = legs == lab; e = adj[m[adj[:, 0]] & m[adj[:, 1]]]
        n, cc = connected_components(sp.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(nf, nf)), directed=False)
        ca = np.bincount(cc[m], weights=area[m], minlength=n)
        small = np.zeros(nf, bool); small[m] = ca[cc[m]] < 0.0004
        legs[small] = not lab
VN = g.vertex_normals
def part(mask):
    m = trimesh.Trimesh(V, F[mask], vertex_normals=VN, process=False); m.remove_unreferenced_vertices(); return m
out = trimesh.Scene()
out.add_geometry(part(~legs), node_name='fabric', geom_name='fabric')
out.add_geometry(part(legs), node_name='legs', geom_name='legs')
out.export(dst, include_normals=True)
print(f'{src}: ножки ниже y={CUT}: {legs.sum()} из {nf} граней → {dst}')
