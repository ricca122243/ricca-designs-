# Чистый край собранного матраса: убираем прилипшее к низу тёмное небо и звёзды,
# контур сглаживаем по полю расстояний, свечение вокруг — ровное (без пятен).
from PIL import Image
import numpy as np, os
from scipy import ndimage as ndi
src = Image.open('seg/closed_before_fringe.webp').convert('RGBA')
a = np.array(src).astype(np.float32)
A = a[...,3]; rgb = a[...,:3]
L = rgb @ np.array([.2126,.7152,.0722], np.float32)
body0 = A >= 200
din = ndi.distance_transform_edt(body0)
band = body0 & (din <= 5) & (L < 85)
body = body0 & ~band
body = ndi.binary_opening(body, iterations=1) | (body & (ndi.distance_transform_edt(body) > 2))
# сглаженный контур: поле расстояний со знаком → гаусс → альфа с антиалиасингом
sdf = ndi.distance_transform_edt(body) - ndi.distance_transform_edt(~body)
sdf = ndi.gaussian_filter(sdf, 1.6)
ab = np.clip(sdf + 0.5, 0, 1)
# цвет тела у края — от ближайшего «чистого» пикселя тела (не от неба)
core = body & (ndi.distance_transform_edt(body) >= 2)
_, idx = ndi.distance_transform_edt(~core, return_indices=True)
rgb_b = rgb[idx[0], idx[1]]
rgb_b = np.where(core[...,None], rgb, rgb_b)
# свечение: нормированная свёртка альфы только по пикселям свечения → без пятен от звёзд
gmask = (~body0).astype(np.float32)
num = ndi.gaussian_filter(A * gmask, 4.0); den = ndi.gaussian_filter(gmask, 4.0)
ag = np.where(den > 1e-3, num / np.maximum(den, 1e-3), 0) / 255.0
ag = np.clip(ag, 0, 0.2)
glow = np.array([163,174,214], np.float32)
oa = ab + ag * (1 - ab)
orgb = (rgb_b * ab[...,None] + glow * (ag * (1 - ab))[...,None]) / np.maximum(oa, 1e-4)[...,None]
out = np.dstack([orgb, oa * 255]).clip(0,255).astype(np.uint8)
im = Image.fromarray(out, 'RGBA')
im.save('src/img/layers/closed.webp', 'WEBP', quality=92, alpha_quality=100, method=6)
W, H = im.size
for w in (640, 800, 1000, 1250):
    v = im.convert('RGBa').resize((w, round(H * w / W)), Image.LANCZOS, reducing_gap=3.0).convert('RGBA')
    v.save(f'src/img/layers/closed-{w}.webp', 'WEBP', quality=92, alpha_quality=100, method=6)
bg = np.zeros((H,W,3),np.float32); bg[...] = (20,24,50)
c = (out[...,:3]*(out[...,3:]/255.)+bg*(1-out[...,3:]/255.)).clip(0,255).astype(np.uint8)
b0 = (a[...,:3]*(a[...,3:]/255.)+bg*(1-a[...,3:]/255.)).clip(0,255).astype(np.uint8)
tiles = []
for (y0,y1,x0,x1) in [(740,980,360,740),(280,520,90,330),(150,330,500,900),(880,1120,700,1100)]:
    t0 = Image.fromarray(b0[y0:y1,x0:x1]).resize(((x1-x0)*2,(y1-y0)*2), Image.NEAREST)
    t1 = Image.fromarray(c[y0:y1,x0:x1]).resize(((x1-x0)*2,(y1-y0)*2), Image.NEAREST)
    tiles.append((t0,t1))
Wt = max(t[0].width for t in tiles)*2+10; Ht = sum(t[0].height+10 for t in tiles)
sheet = Image.new('RGB',(Wt,Ht),(255,0,0)); y=0
for t0,t1 in tiles: sheet.paste(t0,(0,y)); sheet.paste(t1,(t0.width+10,y)); y+=t0.height+10
sheet.save('cmp/edge_sheet.png')
Image.fromarray(c).resize((W//2,H//2), Image.LANCZOS).save('cmp/closed_clean_half.png')
for f in sorted(os.listdir('src/img/layers')):
    if f.startswith('closed'): print(f, os.path.getsize('src/img/layers/'+f)//1024, 'KB')
