#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
© 2026 ELUNA · RICCA DESIGNS. Генератор 3D-моделей матрасов (glTF 2.0 Binary, .glb).

Запуск из корня репозитория:  python3 tools/make-glb.py
Результат: models/eluna-air.glb, eluna-balance.glb, eluna-prime.glb, eluna-royal.glb

Модель — матрас в натуральную величину (метры, Y вверх, низ на y = 0, чтобы в AR
он вставал на пол), с вырезанной передней четвертью: видны все слои, пружинный
блок — настоящими цилиндрами независимых пружин. Слои и толщины — те же, что в
js/catalog.js (MODELS). Никаких внешних библиотек: файл собирается вручную.
"""
import json
import math
import os
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'models')

# Слои (сверху вниз), толщина в см — копия MODELS из js/catalog.js
LAYERS = {
    'air': [('knit', 0.6), ('foam', 2), ('felt', 0.6), ('springs', 14), ('felt', 0.6), ('coir', 1), ('knit', 0.6)],
    'balance': [('knit', 0.6), ('foam', 2), ('felt', 0.6), ('coir', 2), ('springs', 14), ('felt', 0.6), ('coir', 1), ('foam', 1.5), ('knit', 0.6)],
    'prime': [('cotton', 1), ('latex', 2), ('felt', 0.6), ('coir', 2), ('springs', 16), ('coir', 2), ('felt', 0.6), ('latex', 2), ('cotton', 1)],
}
LAYERS['royal'] = LAYERS['prime']  # Royal собирается под проект; в 3D показан разрез на базе Prime

W, D = 1.6, 2.0          # ширина × длина, м
COVER = 0.012            # толщина чехла и борта, м
PIPING = 0.012           # кант, м

# Материалы: цвет (sRGB 0..1), шероховатость, металличность
MATERIALS = {
    'cover_side': ((0.145, 0.150, 0.165), 0.92, 0.0),   # тёмный борт
    'cover_top':  ((0.850, 0.815, 0.750), 0.95, 0.0),   # стёганый верх, тёплая слоновая кость
    'piping':     ((0.784, 0.659, 0.420), 0.35, 0.85),  # золотой кант
    'knit':       ((0.925, 0.900, 0.850), 0.95, 0.0),
    'cotton':     ((0.950, 0.935, 0.890), 0.95, 0.0),
    'foam':       ((0.905, 0.860, 0.740), 0.90, 0.0),
    'latex':      ((0.945, 0.905, 0.765), 0.85, 0.0),
    'felt':       ((0.660, 0.640, 0.610), 0.98, 0.0),
    'coir':       ((0.540, 0.350, 0.200), 0.98, 0.0),
    'springs_bg': ((0.800, 0.795, 0.780), 0.95, 0.0),   # блок пружин под чехлом
    'spring':     ((0.930, 0.930, 0.925), 0.80, 0.0),   # независимые пружины в чехлах
}


class Mesh:
    """Накопитель треугольников по материалам."""

    def __init__(self):
        self.parts = {}  # material -> {'pos': [], 'nrm': [], 'idx': []}

    def part(self, m):
        return self.parts.setdefault(m, {'pos': [], 'nrm': [], 'idx': []})

    def quad(self, m, a, b, c, d, n):
        p = self.part(m)
        base = len(p['pos'])
        p['pos'] += [a, b, c, d]
        p['nrm'] += [n, n, n, n]
        p['idx'] += [base, base + 1, base + 2, base, base + 2, base + 3]

    def box(self, m, x0, y0, z0, x1, y1, z1):
        # 6 граней, нормали наружу, обход против часовой стрелки снаружи
        self.quad(m, (x0, y1, z1), (x1, y1, z1), (x1, y1, z0), (x0, y1, z0), (0, 1, 0))    # верх
        self.quad(m, (x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1), (0, -1, 0))   # низ
        self.quad(m, (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1), (0, 0, 1))    # перед (+z)
        self.quad(m, (x1, y0, z0), (x0, y0, z0), (x0, y1, z0), (x1, y1, z0), (0, 0, -1))   # зад
        self.quad(m, (x1, y0, z1), (x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (1, 0, 0))    # право
        self.quad(m, (x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0), (-1, 0, 0))   # лево

    def cylinder(self, m, cx, cz, y0, y1, r, seg=12, waist=0.0):
        """Вертикальный цилиндр; waist > 0 — «талия» посередине, как у пружины в чехле."""
        p = self.part(m)
        rings = 5 if waist else 2
        ys = [y0 + (y1 - y0) * i / (rings - 1) for i in range(rings)]
        ring_idx = []
        for yi, y in enumerate(ys):
            t = yi / (rings - 1)
            rr = r * (1 - waist * math.sin(math.pi * t)) if waist else r
            base = len(p['pos'])
            for s in range(seg):
                a = 2 * math.pi * s / seg
                nx, nz = math.cos(a), math.sin(a)
                p['pos'].append((cx + rr * nx, y, cz + rr * nz))
                p['nrm'].append((nx, 0, nz))
            ring_idx.append(base)
        for yi in range(rings - 1):
            b0, b1 = ring_idx[yi], ring_idx[yi + 1]
            for s in range(seg):
                s2 = (s + 1) % seg
                p['idx'] += [b0 + s, b1 + s, b1 + s2, b0 + s, b1 + s2, b0 + s2]
        # крышки
        for (y, n, rev) in ((y1, (0, 1, 0), False), (y0, (0, -1, 0), True)):
            base = len(p['pos'])
            p['pos'].append((cx, y, cz)); p['nrm'].append(n)
            for s in range(seg):
                a = 2 * math.pi * s / seg
                p['pos'].append((cx + r * math.cos(a), y, cz + r * math.sin(a))); p['nrm'].append(n)
            for s in range(seg):
                s2 = (s + 1) % seg
                tri = [base, base + 1 + s2, base + 1 + s] if not rev else [base, base + 1 + s, base + 1 + s2]
                p['idx'] += tri


def build(key):
    layers = LAYERS[key]
    hx, hz = W / 2, D / 2
    m = Mesh()
    inner_h = sum(t for _, t in layers) / 100.0
    y = COVER  # слои начинаются над нижним чехлом

    # --- слои. Вырезанная четверть: x > 0 и z > 0 (ближний правый угол) ---
    # Каждый слой — L-образная «подкова» из двух коробок + в четверти либо коробка (видна), либо пружины.
    ix, iz = hx - COVER, hz - COVER
    for i, (kind, cm) in enumerate(reversed(layers)):  # снизу вверх
        t = cm / 100.0
        y0, y1 = y, y + t
        # L-образная часть под чехлом (её грани на плоскостях среза — это и есть видимый разрез)
        bg = 'springs_bg' if kind == 'springs' else kind
        m.box(bg, -ix, y0, -iz, ix, y1, 0)
        m.box(bg, -ix, y0, 0, 0, y1, iz)
        if kind == 'springs':
            # в вырезе — настоящие независимые пружины
            pitch, r = 0.075, 0.03
            nx_, nz_ = int(ix / pitch), int(iz / pitch)
            for a in range(nx_):
                for b in range(nz_):
                    cx = pitch / 2 + a * pitch
                    cz = pitch / 2 + b * pitch
                    m.cylinder('spring', cx, cz, y0, y1, r, seg=10, waist=0.16)
        else:
            m.box(kind, 0, y0, 0, ix, y1, iz)   # открытая четверть
        y = y1
    top = y + COVER  # верх чехла

    # --- чехол: две коробки L-формы (тёмный борт), верх слоновой кости, низ ---
    def cover_part(x0, z0, x1, z1):
        m.box('cover_side', x0, 0, z0, x1, top, z1)
        m.box('cover_top', x0 + 1e-4, top - COVER * 0.6, z0 + 1e-4, x1 - 1e-4, top + 0.004, z1 - 1e-4)
    # чехол отступает от плоскостей среза на 2 мм, чтобы разрез слоёв не спорил с тёмным бортом
    cover_part(-hx, -hz, hx, -0.002)   # задняя половина
    cover_part(-hx, 0, -0.002, hz)     # передняя левая четверть
    # нижняя подложка под слоями в вырезе (чтобы четверть не висела в воздухе)
    m.box('cover_side', 0, 0, 0, hx, COVER, hz)

    # --- золотой кант по верхнему контуру L (6 рёбер) и по нижнему периметру ---
    e = PIPING / 2
    yt = top + 0.002
    def edge(x0, z0, x1, z1, yy):
        m.box('piping', min(x0, x1) - e, yy - e, min(z0, z1) - e, max(x0, x1) + e, yy + e, max(z0, z1) + e)
    for yy in (yt, COVER):
        edge(-hx, -hz, hx, -hz, yy)   # задний
        edge(hx, -hz, hx, 0, yy)      # правый до выреза
        edge(hx, 0, 0, 0, yy)         # внутренний (по вырезу)
        edge(0, 0, 0, hz, yy)         # внутренний (по вырезу)
        edge(0, hz, -hx, hz, yy)      # передний левый
        edge(-hx, hz, -hx, -hz, yy)   # левый
    return m, inner_h + 2 * COVER


def write_glb(path, mesh, name):
    bin_chunks = []
    offset = 0
    views, accessors, prims = [], [], []
    mats, mat_index = [], {}

    def add_view(data, target):
        nonlocal offset
        pad = (4 - len(data) % 4) % 4
        data += b'\0' * pad
        views.append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(data) - pad, 'target': target})
        bin_chunks.append(data)
        offset += len(data)
        return len(views) - 1

    for key, part in mesh.parts.items():
        if key not in mat_index:
            color, rough, metal = MATERIALS[key]
            mat_index[key] = len(mats)
            mats.append({'name': key, 'doubleSided': False,
                         'pbrMetallicRoughness': {'baseColorFactor': [color[0], color[1], color[2], 1.0],
                                                  'metallicFactor': metal, 'roughnessFactor': rough}})
        pos = part['pos']
        pos_b = b''.join(struct.pack('<3f', *p) for p in pos)
        nrm_b = b''.join(struct.pack('<3f', *n) for n in part['nrm'])
        idx_b = b''.join(struct.pack('<I', i) for i in part['idx'])
        v_pos, v_nrm, v_idx = add_view(pos_b, 34962), add_view(nrm_b, 34962), add_view(idx_b, 34963)
        mn = [min(p[k] for p in pos) for k in range(3)]
        mx = [max(p[k] for p in pos) for k in range(3)]
        accessors.append({'bufferView': v_pos, 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'min': mn, 'max': mx})
        accessors.append({'bufferView': v_nrm, 'componentType': 5126, 'count': len(pos), 'type': 'VEC3'})
        accessors.append({'bufferView': v_idx, 'componentType': 5125, 'count': len(part['idx']), 'type': 'SCALAR'})
        a = len(accessors)
        prims.append({'attributes': {'POSITION': a - 3, 'NORMAL': a - 2}, 'indices': a - 1, 'material': mat_index[key]})

    binary = b''.join(bin_chunks)
    gltf = {
        'asset': {'version': '2.0', 'generator': 'ELUNA make-glb.py',
                  'copyright': '© 2026 ELUNA · RICCA DESIGNS. Все права защищены.'},
        'scene': 0,
        'scenes': [{'nodes': [0]}],
        'nodes': [{'mesh': 0, 'name': name}],
        'meshes': [{'name': name, 'primitives': prims}],
        'materials': mats,
        'accessors': accessors,
        'bufferViews': views,
        'buffers': [{'byteLength': len(binary)}],
    }
    js = json.dumps(gltf, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    js += b' ' * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(binary)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(binary), 0x004E4942)); f.write(binary)
    tris = sum(len(p['idx']) // 3 for p in mesh.parts.values())
    return total, tris


def main():
    os.makedirs(OUT, exist_ok=True)
    for key in ('air', 'balance', 'prime', 'royal'):
        mesh, h = build(key)
        path = os.path.join(OUT, f'eluna-{key}.glb')
        size, tris = write_glb(path, mesh, f'Eluna {key.capitalize()}')
        print(f'{path}: {size // 1024} КБ, {tris} треугольников, высота {h * 1000:.0f} мм')


if __name__ == '__main__':
    sys.exit(main())
