import sys, numpy as np
sys.path.insert(0, '/home/user/ricca-designs-/tools/media-v3/photofit')
import refs as R
from scipy import ndimage
from PIL import Image
tiles = []
for n in ['o2', 'b1', 'o', 'o3', 'b2', 'o4']:
    a = R.load('p-armchair-07-' + n); body, legs = R.obj_mask(a, split=True)
    g = a.max(2); sat = a.max(2) - a.min(2)
    solid_dark = ndimage.binary_opening((g < 95) & (sat < 45), structure=np.ones((7, 7), bool))       # ножки: сплошное тёмное
    lab, k = ndimage.label(solid_dark); keep = np.zeros_like(solid_dark)
    for i in range(1, k + 1):
        yy, xx = np.where(lab == i)
        if len(yy) > 250 and (yy.max() - yy.min()) > 1.3 * (xx.max() - xx.min()): keep |= lab == i     # вытянутые по вертикали
    legm = ndimage.binary_dilation(keep, iterations=4)
    # тень на полу: гладкое серое внутри маски (малый разброс яркости), ниже середины
    gm = a.mean(2); mean = ndimage.uniform_filter(gm, 9); var = ndimage.uniform_filter(gm * gm, 9) - mean * mean
    smooth = (np.sqrt(np.clip(var, 0, None)) < 2.5) & (gm > 150) & body
    smooth = ndimage.binary_opening(smooth, structure=np.ones((5, 5), bool))
    clean = body & ~legm & ~ndimage.binary_dilation(smooth, iterations=3)
    clean = ndimage.binary_opening(clean, structure=np.ones((11, 11), bool)); lab, k = ndimage.label(clean)
    sizes = ndimage.sum(clean, lab, range(1, k + 1)); clean = lab == (1 + int(np.argmax(sizes)))
    clean = ndimage.binary_fill_holes(ndimage.binary_dilation(clean, iterations=2) & body & ~legm)
    iou = (body & clean).sum() / (body | clean).sum()
    print(n, 'маска обивки', int(body.sum()), '«чистая» обивка', int(clean.sum()), f'IoU(маска, чистая) = {iou:.4f}', 'ножки в маске', int((body & legm).sum()), 'гладкое (тень)', int((body & smooth).sum()))
    vis = a.copy().astype(np.uint8); extra = body & ~clean; vis[extra] = (255, 0, 255)
    e = body ^ ndimage.binary_erosion(body, iterations=2); vis[e] = (255, 0, 0)
    ys, xs = np.where(body); y0 = max(ys.max() - 330, 0)
    tiles.append(Image.fromarray(vis[y0:y0 + 380, 100:1180]).resize((720, 253)))
    np.save(f'{sys.argv[1]}/clean-{n}.npy', clean); np.save(f'{sys.argv[1]}/legm-{n}.npy', keep)
sh = Image.new('RGB', (1440, 253 * 3), 'white')
for i, t in enumerate(tiles): sh.paste(t, ((i % 2) * 720, (i // 2) * 253))
sh.save(f'{sys.argv[1]}/masks-legs.jpg', quality=88)
