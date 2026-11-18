"""Blender (bpy) — заготовки для мягкой мебели RICCA. Оси Blender: X вправо, −Y к зрителю (фронт), Z вверх; метры.
Итог — GLB с двумя сетками: fabric (обивка) и legs (ножки); ткань и UV конструктор сайта накладывает сам."""
import bpy, math
import numpy as np


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def _apply(o, mod):
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=mod.name)


def box(name, size, loc, bevel=0.0, seg=8):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        m = o.modifiers.new('bv', 'BEVEL'); m.width = bevel; m.segments = seg; m.limit_method = 'NONE'; _apply(o, m)
    return o


def cyl(name, r, h, loc, verts=32):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=loc, vertices=verts)
    o = bpy.context.object; o.name = name; return o


def boolean(a, b, op='DIFFERENCE'):
    m = a.modifiers.new('bool', 'BOOLEAN'); m.operation = op; m.object = b; m.solver = 'EXACT'; _apply(a, m)
    bpy.data.objects.remove(b, do_unlink=True); return a


def soften(o, voxel=0.012, iters=12, factor=0.5):
    """сплавить в одну оболочку и скруглить рёбра: воксельная пересборка + сглаживание"""
    m = o.modifiers.new('rm', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = voxel; m.adaptivity = 0; _apply(o, m)
    if iters:
        s = o.modifiers.new('sm', 'SMOOTH'); s.factor = factor; s.iterations = iters; _apply(o, s)
    return o


def crown(o, amount=0.015, axis_up=2):
    """подушка: верх чуть выпуклый к середине"""
    me = o.data; n = len(me.vertices); co = np.empty(n * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    lo, hi = co.min(0), co.max(0); c = (lo + hi) / 2; h = (hi - lo) / 2
    u = np.clip(1 - ((co[:, 0] - c[0]) / h[0]) ** 2, 0, 1) * np.clip(1 - ((co[:, 1] - c[1]) / h[1]) ** 2, 0, 1)
    top = np.clip((co[:, axis_up] - c[axis_up]) / h[axis_up], 0, 1)
    co[:, axis_up] += amount * u * top
    me.vertices.foreach_set('co', co.ravel()); me.update(); return o


def subsurf(o, levels=2):
    m = o.modifiers.new('ss', 'SUBSURF'); m.levels = levels; m.render_levels = levels; _apply(o, m); return o


def decimate(o, faces):
    n = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if n > faces:
        m = o.modifiers.new('dc', 'DECIMATE'); m.ratio = faces / n; _apply(o, m)
    return o


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.object; o.name = name; o.data.name = name
    for p in o.data.polygons: p.use_smooth = True
    return o


def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def export(path, fabric, legs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in (fabric, legs):
        if o: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_normals=True,
                              export_texcoords=False, export_materials='NONE', export_yup=True)


def _mat(name, rgb, rough=0.9):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*rgb, 1); b.inputs['Roughness'].default_value = rough; return m


def render(path, fabric, legs, az=0, el=4, dist=9.0, lens=85, target=(0, 0, 0.3), res=(900, 506), samples=24, rgb=(0.47, 0.45, 0.42)):
    """проверочный кадр: светлый фон, мягкий свет слева-спереди, камера как на фото каталога"""
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.filepath = path; sc.render.image_settings.file_format = 'PNG'
    if not sc.world: sc.world = bpy.data.worlds.new('w')
    sc.world.use_nodes = True; bg = sc.world.node_tree.nodes.get('Background'); bg.inputs[0].default_value = (0.96, 0.96, 0.97, 1); bg.inputs[1].default_value = 0.75
    if not fabric.data.materials: fabric.data.materials.append(_mat('fab', rgb))
    if legs and not legs.data.materials: legs.data.materials.append(_mat('leg', (0.03, 0.03, 0.03), 0.5))
    for n in ('chk_floor', 'chk_cam', 'chk_key'):
        if n in bpy.data.objects: bpy.data.objects.remove(bpy.data.objects[n], do_unlink=True)
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0)); fl = bpy.context.object; fl.name = 'chk_floor'; fl.data.materials.append(_mat('fl', (0.93, 0.93, 0.94), 1))
    bpy.ops.object.light_add(type='AREA', location=(-3.5, -5, 5)); k = bpy.context.object; k.name = 'chk_key'; k.data.energy = 420; k.data.size = 5
    k.rotation_euler = (math.radians(50), 0, math.radians(-35))
    a, e = math.radians(az), math.radians(el)
    loc = (target[0] + dist * math.sin(a) * math.cos(e), target[1] - dist * math.cos(a) * math.cos(e), target[2] + dist * math.sin(e))
    bpy.ops.object.camera_add(location=loc); cam = bpy.context.object; cam.name = 'chk_cam'; cam.data.lens = lens
    d = np.array(target) - np.array(loc); cam.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(-d[0], d[1]) * -1 if False else math.atan2(d[0], d[1]) * -1)
    sc.camera = cam; bpy.ops.render.render(write_still=True)


# ───────── дополнения 18 ноября: кровати (сетка bedding) и скульптурные кресла ─────────
import bmesh


def round_top_corners(o, r=0.10, seg=10):
    """скруглить два верхних угла плиты (рёбра вдоль Y при z = max и |x| = max) — изголовье"""
    bm = bmesh.new(); bm.from_mesh(o.data)
    zmax = max(v.co.z for v in bm.verts); xmax = max(abs(v.co.x) for v in bm.verts)
    ed = [e for e in bm.edges if all(abs(v.co.z - zmax) < 1e-4 and abs(abs(v.co.x) - xmax) < 1e-4 for v in e.verts)]
    bmesh.ops.bevel(bm, geom=ed, offset=r, segments=seg, profile=0.5, affect='EDGES')
    bm.to_mesh(o.data); bm.free(); return o


def soft_edges(o, width=0.015, seg=4, angle=40):
    m = o.modifiers.new('bv', 'BEVEL'); m.width = width; m.segments = seg; m.limit_method = 'ANGLE'; m.angle_limit = math.radians(angle); _apply(o, m); return o


def pillow(name, size, loc, rot=(0, 0, 0), puff=0.75):
    """подушка: плита → мягкая линза с тонкими краями; size = (ширина, высота, толщина), лежит в плоскости XY, затем rot"""
    o = box(name, (size[0], size[1], size[2]), (0, 0, 0), bevel=min(size[2] * 0.4, 0.05), seg=6); subsurf(o, 2)
    me = o.data; n = len(me.vertices); co = np.empty(n * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    u = np.clip(np.abs(co[:, 0]) / (size[0] / 2), 0, 1); v = np.clip(np.abs(co[:, 1]) / (size[1] / 2), 0, 1)
    f = (1 - puff) + puff * np.sqrt(np.clip((1 - u ** 4) * (1 - v ** 4), 0, 1)); co[:, 2] *= f
    me.vertices.foreach_set('co', co.ravel()); me.update()
    o.rotation_euler = tuple(math.radians(a) for a in rot); o.location = loc
    bpy.context.view_layer.objects.active = o; bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); return o


def tube(name, pts, r, zscale=1.0):
    """валик по ломаной: круглое сечение радиуса r, по высоте растянуто в zscale раз"""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts): sp.points[i].co = (p[0], p[1], p[2], 1)
    cu.bevel_depth = r; cu.bevel_resolution = 10; cu.use_fill_caps = True
    o = bpy.data.objects.new(name, cu); bpy.context.collection.objects.link(o)
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH'); o = bpy.context.object
    if zscale != 1.0:
        zc = sum(p[2] for p in pts) / len(pts)
        for v in o.data.vertices: v.co.z = zc + (v.co.z - zc) * zscale
    return o


def leg(name, top, length=0.2, r_top=0.02, r_bot=0.01, splay=(0, 0)):
    """коническая ножка; splay = (наклон наружу по x, по y) в градусах, знак берётся от положения"""
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=r_bot, radius2=r_top, depth=length, location=(0, 0, 0))
    o = bpy.context.object; o.name = name
    sx = 1 if top[0] >= 0 else -1; sy = 1 if top[1] >= 0 else -1
    o.rotation_euler = (math.radians(sy * splay[1]), math.radians(-sx * splay[0]), 0)
    dz = length / 2 * math.cos(math.radians(max(splay)))
    o.location = (top[0] + sx * math.sin(math.radians(splay[0])) * length / 2, top[1] + sy * math.sin(math.radians(splay[1])) * length / 2, top[2] - dz)
    return o


def export3(path, fabric, legs, bedding=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in (fabric, legs, bedding):
        if o: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_normals=True,
                              export_texcoords=False, export_materials='NONE', export_yup=True)


def white(o):
    if o and not o.data.materials: o.data.materials.append(_mat('bed', (0.9, 0.9, 0.9), 0.8))


def pebble(name, a, b, c, loc, n=3.0, seg=72):
    """сиденье-«галька»: суперэллипсоид с полуосями a, b, c — пухлая кромка вместо острой, как у эллипсоида"""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=1, location=(0, 0, 0))
    o = bpy.context.object; o.name = name; me = o.data; k = len(me.vertices); co = np.empty(k * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    r = np.hypot(co[:, 0], co[:, 1]); z = np.abs(co[:, 2]); f = (r ** n + z ** n) ** (1.0 / n); f[f == 0] = 1
    co /= f[:, None]; co *= np.array([a, b, c]); co += np.array(loc)
    me.vertices.foreach_set('co', co.ravel()); me.update(); return o
