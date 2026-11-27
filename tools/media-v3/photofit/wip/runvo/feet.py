import sys, numpy as np
sys.path.insert(0, '/home/user/ricca-designs-/tools/media-v3/photofit')
import refs as R
from scipy import ndimage
from PIL import Image
out = {}
for n in ['o2', 'b1', 'o', 'o3', 'b2', 'o4']:
    a = R.load('p-armchair-07-' + n); body, legs = R.obj_mask(a, split=True)
    ys, xs = np.where(body); print(n, 'обивка: x', xs.min(), xs.max(), 'y', ys.min(), ys.max())
    dark = (255 - a.min(2) > 115) & ((a.max(2) - a.min(2)) < 40)
    lab, k = ndimage.label(legs)
    for i in range(1, k + 1):
        yy, xx = np.where(lab == i)
        # стопа: нижние 6 строк
        b = yy >= yy.max() - 5
        print(f'   нога {i}: x {xx.min()}..{xx.max()} y {yy.min()}..{yy.max()}  стопа ({xx[b].mean():.0f}, {yy.max()}) площадь {len(yy)}')
    vis = a.copy().astype(np.uint8); e = legs ^ ndimage.binary_erosion(legs); vis[e] = (255, 0, 0)
    y0 = max(ys.max() - 260, 0); Image.fromarray(vis[y0:min(y0 + 520, 1280)]).save(f'{sys.argv[1]}/legs-{n}.jpg', quality=90)
