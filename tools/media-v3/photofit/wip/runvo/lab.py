"""рабочие инструменты подгонки Runvo: калиброванные камеры (по стопам ножек), «чистые» маски обивки, обратная проекция"""
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
PF = '/home/user/ricca-designs-/tools/media-v3/photofit'
sys.path.insert(0, PF)
import refs as R, photofit as F
HERE = os.path.dirname(os.path.abspath(__file__))
WF = os.path.dirname(HERE)
NAMES = ['b1', 'o', 'o3', 'b2', 'o4', 'o2']
FULL = {n: 'p-armchair-07-' + n for n in NAMES}
CAL = {k: v for k, v in json.load(open(os.path.join(HERE, 'cal', 'cal2-d13.json')))['cams'].items()}
_cache = {}
def clean(n):
    if n not in _cache: _cache[n] = np.load(os.path.join(WF, 'view', f'clean-{n}.npy'))
    return _cache[n]
def photo(n): return R.load(FULL[n]).astype(np.uint8)
def backproject(uv, cam, z0):
    """пиксели (N,2) → точки на плоскости z=z0"""
    uv = np.atleast_2d(np.asarray(uv, float)); r, up, v = F.cam_basis(cam['az'], cam['el']); C = F.TARGET - cam['dist'] * v
    f = cam['scale'] * cam['dist']
    d = r[None] * ((uv[:, 0] - cam['u0']) / f)[:, None] + up[None] * (-(uv[:, 1] - cam['v0']) / f)[:, None] + v[None]
    lam = (z0 - C[2]) / d[:, 2]
    return C[None] + lam[:, None] * d
def ray(uv, cam):
    uv = np.atleast_2d(np.asarray(uv, float)); r, up, v = F.cam_basis(cam['az'], cam['el']); C = F.TARGET - cam['dist'] * v
    f = cam['scale'] * cam['dist']
    d = r[None] * ((uv[:, 0] - cam['u0']) / f)[:, None] + up[None] * (-(uv[:, 1] - cam['v0']) / f)[:, None] + v[None]
    return C, d / np.linalg.norm(d, axis=1)[:, None]
def proj(P, n):
    u, v, z = F.project(np.atleast_2d(np.asarray(P, float)), CAL[n]); return np.stack([u, v], 1)
def ray_plane_x(uv, n, x0):
    """пиксели → точки на вертикальной плоскости X = x0 (камера n)"""
    C, d = ray(uv, CAL[n]); lam = (x0 - C[0]) / d[:, 0]; return C[None] + lam[:, None] * d
