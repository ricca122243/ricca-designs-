"""Сверка внутренних линий: линии, снятые с фото (PHOTO), против линий модели (карта рёбер рендера и проекции швов).
python chk.py <itdir> [--noimg]"""
import sys, os, json, math
sys.path.insert(0, '/home/user/ricca-designs-/tools/media-v3/photofit')
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance
from scipy import ndimage
import photofit as F, refs as R

PHOTO = {
 'p-armchair-20': {
  'welt':  [(1035,521),(1010,526),(980,532),(940,540),(900,549.5),(860,559.5),(840,566),(826,574),(815,584),(808,595),(803,610),(801,625),(800,640),(797,680),(793,725),(791,748)],
  'notch': [(800,785),(806,788),(812,790),(824,792),(836,793),(848,794),(860,797),(866,800),(872,803)],
  'seam':  [(879,820),(880,840),(883,860),(882,880),(880,900),(877,930),(873,960),(870,980),(867,1010),(864,1030),(860,1050),(855,1070)],
  'tipR':  [(764,610),(761,620),(759,640),(758,660),(759,680),(760,700),(762,720),(765,740),(767,750)],
  'tipL':  [(283,600),(282,640),(284,680),(288,720),(294,750)],
  'fold':  [(300,764),(320,761),(340,759),(360,756),(380,754),(400,752),(420,751),(440,749),(460,747),(480,746),(500,745),(520,744),(540,743),(560,743),(580,743),(600,743),(620,744),(640,744),(660,745),(680,746),(700,748),(720,749),(740,751),(760,753)],
 },
 'p-armchair-20-d1': {
  'tipL':  [(292,612),(294,640),(298,680),(301,705),(305,765),(308,800),(312,822)],
  'tipR':  [(978,620),(972,650),(968,690),(966,705),(962,765),(960,800),(959,822)],
  'fold':  [(320,825),(340,820),(360,817),(380,813),(400,810),(420,807),(440,804),(460,802),(480,800),(500,798),(520,796),(540,795),(560,794),(580,793),(600,792),(620,792),(640,792),(660,792),(680,793),(700,794),(720,795),(740,796),(760,797),(780,799),(800,801),(820,803),(840,806),(860,809),(880,812),(900,815),(920,819),(940,823),(950,826)],
 },
}
# с чем сравнивать: 'edge' — карта рёбер рендера; иначе имя линии из lines.npz
AGAINST = {'welt': 'weltR', 'notch': 'weltR', 'seam': 'seamR', 'tipR': 'tipR', 'tipL': 'tipL', 'fold': 'env:seatcloud'}
CROPS = {
 'p-armchair-20': {'ear': (730,480,1070,830), 'seam': (740,740,1070,1130), 'left': (180,520,440,860), 'fold': (270,560,800,830)},
 'p-armchair-20-d1': {'L': (262,560,442,860), 'R': (838,560,1018,860), 'fold': (270,700,1000,900)},
}

def dense(L, step=2.0):
    L = np.asarray(L, float); out = [L[0]]
    for a, b in zip(L[:-1], L[1:]):
        n = max(1, int(np.linalg.norm(b - a) / step)); out += [a + (b - a) * s for s in np.linspace(0, 1, n + 1)[1:]]
    return np.array(out)

def line_dist(pts, tgt, L, cam, cap=8.0):
    """расхождение линии с фото и линии модели, см (по точкам линии фото). env:<облако> — верхний видимый край облака точек"""
    cm = cam['scale'] / 100.0; D = dense(pts, 3.0)
    name = tgt[4:] if tgt.startswith('env:') else tgt
    if name not in L: return np.full(len(D), cap)
    u, v, z = F.project(L[name], cam)
    if tgt.startswith('env:'):
        d = np.full(len(D), cap * cm)
        for i, (x, y) in enumerate(D):
            sel = np.abs(u - x) < 4
            if sel.any(): d[i] = abs(y - v[sel].min())
    else:
        Q = dense(np.c_[u, v], 1.5); d = np.sqrt(((D[:, None, :] - Q[None, :, :]) ** 2).sum(2)).min(1)
    return np.minimum(d / cm, cap)


def run(itdir, img=True, log=print):
    parts = F.read_parts(os.path.join(itdir, 'parts.npz')); cams = json.load(open(os.path.join(itdir, 'cams.json')))
    lines = dict(np.load(os.path.join(itdir, 'lines.npz'))) if os.path.exists(os.path.join(itdir, 'lines.npz')) else {}
    P, Nn, Lb, names = F.sample(parts, n=2_600_000); sup = np.array([F.is_support(n) for n in names]); Pb = P[~sup[Lb]]
    res = {}; size = 1280
    for nme, pl in PHOTO.items():
        cam = cams[nme]; cm = cam['scale'] / 100.0
        mask, shade, lab, zb, edge = F.render(P, Nn, Lb, names, cam, size)
        lb_edge = np.zeros_like(mask)
        for i, nm in enumerate(names):
            pk = lab == i + 1; lb_edge |= (pk ^ ndimage.binary_erosion(pk)) & ndimage.binary_erosion(mask, iterations=3)
        emap = edge | lb_edge
        dist_e = ndimage.distance_transform_edt(~emap)
        proj = {}
        for k, L3 in lines.items():
            u, v, z = F.project(L3, cam); proj[k] = np.c_[u, v]
        res[nme] = {}
        for k, L in pl.items():
            d = line_dist(L, AGAINST[k], lines, cam)
            res[nme][k] = (float(d.mean()), float(np.percentile(d, 90)))
        log(nme + ': ' + '  '.join(f"{k} {a:.1f}/{b:.1f}" for k, (a, b) in res[nme].items()) + '  (см: среднее/90%)')
        if img:
            ph = R.load(nme).astype(np.uint8)
            mb = F.solid(F.splat(Pb, cam, size, 1.0), 2)
            ov = np.asarray(ImageEnhance.Contrast(Image.fromarray(ph)).enhance(1.5)).copy()
            ov[emap] = (255, 235, 0); ov[F.contour(mb)] = (255, 0, 0)
            im = Image.fromarray(ov); dr = ImageDraw.Draw(im)
            for k, q in proj.items():
                if k in ('weltR', 'seatcloud'): continue
                dr.line([tuple(x) for x in q], fill=(0, 255, 255) if k in ('welt', 'seamR', 'seamL') else (255, 120, 255), width=1)
            for k, L in pl.items():
                for x, y in L: dr.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=(0, 255, 0))
            clay = np.full((size, size, 3), 244.0); clay[mask] = shade[mask][:, None] * np.array([0.82, 0.80, 0.76]) * 255
            clay[lab == (names.index('plinth') + 1 if 'plinth' in names else -1)] *= 0.35
            clay[emap] *= 0.7
            pbm = R.obj_mask(R.load(nme), split=True)[0]; clay[F.contour(pbm)] = (0, 170, 60)
            cl = Image.fromarray(np.clip(clay, 0, 255).astype(np.uint8))
            for cn, box in CROPS[nme].items():
                s = 3 if (box[2] - box[0]) < 400 else 2
                a = im.crop(box); b = cl.crop(box); c = Image.fromarray(ph).crop(box)
                tall = a.width > 1.25 * a.height
                row = Image.new('RGB', (a.width * s, a.height * s * 3 + 16) if tall else (a.width * s * 3 + 16, a.height * s), 'white')
                for i, t in enumerate((c, a, b)): row.paste(t.resize((t.width * s, t.height * s), Image.LANCZOS), (0, i * (a.height * s + 8)) if tall else (i * (a.width * s + 8), 0))
                row.save(os.path.join(itdir, f'z-{nme[-2:]}-{cn}.jpg'), quality=88)
            w = Image.new('RGB', (size * 2 + 8, size), 'white'); w.paste(im, (0, 0)); w.paste(cl, (size + 8, 0)); w.resize((size + 4, size // 2), Image.LANCZOS).save(os.path.join(itdir, f'full-{nme[-2:]}.jpg'), quality=86)
    json.dump(res, open(os.path.join(itdir, 'lines.json'), 'w'), indent=1)
    return res

if __name__ == '__main__':
    run(sys.argv[1], img='--noimg' not in sys.argv)
