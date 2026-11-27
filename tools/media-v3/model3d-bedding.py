#!/usr/bin/env python3
"""Кровати (models3d/bed-*.glb): отделить постель — матрас, одеяло, подушки — от обивки кровати.
Модель из фото одной сеткой и без цвета, поэтому делим по форме. Конструктор (js/cfg/app.js → loadExactGroup)
красит сетку fabric выбранной тканью, а bedding оставляет белой; legs (ножки) не трогаем.

Как делим (12 нояб.: прежнее деление по порогам давало рваную границу — ткань «лезла» в одеяло и подушки):
  1. Ориентиры: верх бортика рамы спереди; передняя плоскость изголовья по высоте (самая задняя грань, смотрящая вперёд,
     в каждом слое — подушки впереди неё); ширина и передний край рамы под постелью; «ушки» изголовья, если есть.
  2. Мягкая оценка «постель или обивка» для каждой грани: выше бортика, впереди изголовья, у ушек — не шире матраса.
     Уверенные места закреплены: ниже бортика и за изголовьем — обивка; всё, что свисает за раму, — постель.
  3. Разрез графа (min-cut) по соседним граням: шов между соседями дешёвый на вогнутом изломе (стык одеяла с рамой,
     подушки с изголовьем) и дорогой на ровном месте — граница ложится по настоящему стыку, ровно, без зубцов.
  4. Мелкие острова (< 40 см²) любой метки — в метку соседей; одиночные зубцы на границе — в метку соседок.
Правка 12 нояб. (проверка): верх подушек, прижатых к изголовью, закреплён за постелью (грани смотрят вверх или вниз,
а изголовье — вперёд), иначе на подушках оставались чёрные зубцы (Linel, Novel); габарит рамы берётся ниже бортика
и по выпуклой оболочке — одеяло Novel, свисающее по бокам и на углы, иначе считалось рамой.
Повторный запуск безопасен: если постель уже отделена, fabric + bedding сливаются обратно и делятся заново.
Нужны: trimesh, numpy, scipy.
Запуск: python3 tools/media-v3/model3d-bedding.py ricca/models3d/bed-26.glb [выход.glb]   (по умолчанию — поверх входа)."""
import sys, numpy as np, trimesh, scipy.sparse as sp
from scipy.sparse.csgraph import maximum_flow, breadth_first_order, connected_components
from scipy.spatial import ConvexHull


def load_whole(path):
    """GLB → сцена и одна сетка обивки+постели (если постель уже отделена — сливаем обратно)."""
    sc = trimesh.load(path, process=False)   # без склейки вершин: нормали из файла (гладкость модели) остаются как есть
    parts = [sc.geometry[k] for k in ('fabric', 'bedding') if k in sc.geometry]
    if len(parts) == 1: return sc, parts[0]
    V = np.vstack([p.vertices for p in parts]); VN = np.vstack([p.vertex_normals for p in parts])
    F = np.vstack([parts[0].faces, parts[1].faces + len(parts[0].vertices)])
    g = trimesh.Trimesh(V, F, vertex_normals=VN, process=False)
    g.merge_vertices(merge_tex=True, merge_norm=True)
    return sc, g


def segment(g, S=0.02, TH=0.35):
    V, F = g.vertices, g.faces; c = V[F].mean(1); N = g.face_normals; area = g.area_faces; nf = len(F)
    ax = np.abs(c[:, 0])
    ymax = V[:, 1].max(); xmax = np.abs(V[:, 0]).max(); zmax = V[:, 2].max()
    # верх бортика рамы спереди
    front = (N[:, 1] > 0.85) & (c[:, 2] > zmax - 0.05) & (c[:, 1] < ymax * 0.6)
    rail = np.percentile(c[front, 1], 30)
    # передняя плоскость изголовья по высоте: самая задняя грань, смотрящая вперёд, в каждом слое
    fw = (N[:, 2] > 0.8) & (ax < 0.3) & (c[:, 2] < 0)
    ys, zs = [], []
    for y0 in np.arange(rail, ymax - 0.01, 0.02):
        m = fw & (np.abs(c[:, 1] - y0) < 0.01)
        if m.sum() > 5: ys.append(y0); zs.append(np.percentile(c[m, 2], 3))
    zs = np.array(zs); zs = np.minimum(zs, np.median(zs) + 0.01)   # слой, где за подушкой не видно изголовья, — к медиане
    zhb = np.interp(c[:, 1], ys, zs); zf = float(np.median(zs))
    # ширина постели — по верху матраса в середине кровати
    mtop = (N[:, 1] > 0.85) & (c[:, 1] > rail + 0.03) & (c[:, 2] > zf + 0.2) & (c[:, 2] < zmax - 0.1)
    xin = np.percentile(ax[mtop], 99) if mtop.sum() > 50 else xmax - 0.03
    lim = min(xmax - 0.03, xin + 0.025)
    mt = np.percentile(c[mtop, 1], 90) if mtop.sum() > 50 else rail + 0.1
    # габарит рамы под постелью — по срезам пониже бортика (одеяло может свисать на 4–5 см по всей длине — Novel)
    # и по нижней четверти срезов (свисающее одеяло есть лишь в части срезов)
    band = (c[:, 1] > rail - 0.10) & (c[:, 1] < rail - 0.05)
    xs = [ax[m].max() for z0 in np.linspace(zf + 0.1, zmax - 0.05, 25) for m in [band & (np.abs(c[:, 2] - z0) < 0.02)] if m.sum() > 5]
    xframe = float(np.percentile(xs, 25)) if xs else xmax
    zz = [c[m, 2].max() for x0 in np.linspace(-xframe + 0.1, xframe - 0.1, 25) for m in [band & (np.abs(c[:, 0] - x0) < 0.02)] if m.sum() > 5]
    zframe = float(np.percentile(zz, 25)) if zz else zmax
    # «ушки» изголовья: боковины выше матраса, выходящие вперёд; там постель не шире матраса
    wing = (c[:, 1] > mt + 0.08) & (ax > lim - 0.01) & (c[:, 2] > zhb + 0.03)
    zear = np.percentile(c[wing, 2], 99) + 0.02 if wing.sum() > 30 else -1e9
    ear = c[:, 2] < zear
    # мягкая оценка: d > 0 — постель, d < 0 — обивка (в метрах)
    dy = c[:, 1] - (rail + 0.01); dz = c[:, 2] - (zhb + 0.012)
    d = np.minimum(dy, dz); d = np.where(ear, np.minimum(d, lim - ax), d)
    p = 1 / (1 + np.exp(-d / S))
    a0 = area / area.mean()
    Cb = a0 * (1 - p); Cf = a0 * p                   # цена метки «постель» / «обивка»
    # след рамы сверху (выпуклая оболочка срезов пониже бортика, впереди изголовья): скруглённые углы рамы
    # учтены — одеяло, свисающее на угол, тоже «за рамой»
    fp = band & (c[:, 2] > zf + 0.05) & (ax < xframe + 0.005) & (c[:, 2] < zframe + 0.005)
    hull = ConvexHull(c[fp][:, [0, 2]]); hd = (c[:, [0, 2]] @ hull.equations[:, :2].T + hull.equations[:, 2]).max(1)
    outside = ((hd > 0.004) | (ax > xframe + 0.006) | (c[:, 2] > zframe + 0.006)) & (c[:, 1] > 0.03) & (c[:, 2] > zf + 0.05) & ~ear   # свисает за раму (боковины-ушки изголовья — не в счёт)
    hard_f = ((d < -0.05) & ~outside) | (dz < -0.006) | ((N[:, 2] > 0.7) & (np.abs(c[:, 2] - zhb) < 0.015) & (c[:, 1] > rail + 0.03))
    hard_f |= ear & (ax > lim - 0.045) & (np.abs(N[:, 0]) > 0.6) & (c[:, 1] > rail + 0.02)   # внутренняя сторона ушек
    # верх и низ подушек, прижатых к изголовью: грани, смотрящие вверх или вниз, ниже верха изголовья — постель
    # (передняя плоскость изголовья смотрит вперёд, даже наклонная: N.z > 0.75)
    pil = (c[:, 1] > rail + 0.03) & (c[:, 1] < ymax - 0.04) & (ax < lim - 0.02) & (c[:, 2] > zhb - 0.004) & (N[:, 2] < 0.75) \
        & ((N[:, 1] > 0.5) | (N[:, 1] < -0.3))
    hard_f &= ~pil
    hard_b = ((d > 0.07) | outside | pil) & ~hard_f
    Cb[hard_f] = 1e3; Cf[hard_b] = 1e3
    # шов между соседями: дёшев на вогнутом изломе, дорог на ровном и выпуклом месте
    adj = g.face_adjacency; ang = g.face_adjacency_angles; cvx = g.face_adjacency_convex
    E = g.face_adjacency_edges; L = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1); L = L / L.mean()
    w = L * np.where(cvx, 1.0, np.exp(-(ang / TH) ** 2))
    s, t = nf, nf + 1
    rows = np.concatenate([adj[:, 0], adj[:, 1], np.full(nf, s), np.arange(nf)])
    cols = np.concatenate([adj[:, 1], adj[:, 0], np.arange(nf), np.full(nf, t)])
    cap = np.maximum(np.round(np.concatenate([w, w, Cf, Cb]) * 1000), 0).astype(np.int32)
    G = sp.csr_matrix((cap, (rows, cols)), shape=(nf + 2, nf + 2)); G.sum_duplicates()
    R = G - maximum_flow(G, s, t, method='dinic').flow; R.data = np.maximum(R.data, 0); R.eliminate_zeros()
    bed = np.zeros(nf + 2, bool); bed[breadth_first_order(R, s, directed=True, return_predecessors=False)] = True; bed = bed[:nf]
    # зубцы на границе: грань, у которой две или три соседки другой метки, — в метку соседок (кроме закреплённых)
    free = ~(hard_f | hard_b)
    for _ in range(6):
        other = np.zeros(nf); np.add.at(other, adj[:, 0], bed[adj[:, 1]] != bed[adj[:, 0]]); np.add.at(other, adj[:, 1], bed[adj[:, 0]] != bed[adj[:, 1]])
        flip = free & (other >= 2)
        if not flip.any(): break
        bed[flip] = ~bed[flip]
    # мелкие острова любой метки — в метку соседей
    for _ in range(3):
        for lab in (True, False):
            m = bed == lab; e = adj[m[adj[:, 0]] & m[adj[:, 1]]]
            n, cc = connected_components(sp.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(nf, nf)), directed=False)
            ca = np.bincount(cc[m], weights=area[m], minlength=n)
            small = np.zeros(nf, bool); small[m] = ca[cc[m]] < 0.004
            bed[small] = not lab
    return bed, dict(rail=rail, headboard=zf, frame_w=xframe, frame_z=zframe, mt=mt, lim=lim, zear=zear)


def write(sc, g, bed, dst):
    VN = g.vertex_normals
    def part(mask):
        m = trimesh.Trimesh(g.vertices, g.faces[mask], vertex_normals=VN, process=False); m.remove_unreferenced_vertices(); return m
    out = trimesh.Scene()
    out.add_geometry(part(~bed), node_name='fabric', geom_name='fabric')
    if 'legs' in sc.geometry: out.add_geometry(sc.geometry['legs'], node_name='legs', geom_name='legs')
    out.add_geometry(part(bed), node_name='bedding', geom_name='bedding')
    out.export(dst, include_normals=True)


if __name__ == '__main__':
    src = sys.argv[1]; dst = sys.argv[2] if len(sys.argv) > 2 else src
    sc, g = load_whole(src); bed, info = segment(g); write(sc, g, bed, dst)
    print(f'{src}: ' + ', '.join(f'{k}={v:.3f}' if isinstance(v, float) else f'{k}={v}' for k, v in info.items())
          + f'; постель {bed.sum()} из {len(bed)} граней → {dst}')
