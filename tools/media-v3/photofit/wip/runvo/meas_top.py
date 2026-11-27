import numpy as np, lab
from PIL import Image, ImageDraw
# верхний силуэт в высоких ракурсах → план на высоте z
out = {}
for n in ['o3', 'b2', 'o4']:
    m = lab.clean(n); cols = np.where(m.any(0))[0]; top = np.array([[c, np.argmax(m[:, c])] for c in cols[::6]])
    out[n] = top
def plan(z):
    return {n: lab.backproject(t, lab.CAL[n], z)[:, :2] for n, t in out.items()}
for z in (0.70, 0.72, 0.735):
    im = Image.new('RGB', (900, 900), 'white'); d = ImageDraw.Draw(im); sc = 700
    for g in np.arange(-0.6, 0.61, 0.1):
        d.line([(450 + g * sc, 0), (450 + g * sc, 900)], fill=(200, 230, 230) if abs(g) > 1e-6 else (255, 150, 150)); d.line([(0, 450 - g * sc), (900, 450 - g * sc)], fill=(200, 230, 230) if abs(g) > 1e-6 else (255, 150, 150))
    for (n, p), col in zip(plan(z).items(), ((255, 0, 0), (0, 160, 0), (0, 0, 255))):
        for x, y in p: d.ellipse([450 + x * sc - 2, 450 - y * sc - 2, 450 + x * sc + 2, 450 - y * sc + 2], fill=col)
    d.text((5, 5), f'z={z} red o3 green b2 blue o4', fill=(0, 0, 0)); im.save(f'top-plan-{z}.jpg', quality=90)
    P = plan(z)
    # разброс между видами: по углу вокруг (0, 0.06)
    print(z, {n: (round(float(p[:, 1].max()), 3), round(float(p[np.argmax(p[:, 1]), 0]), 3)) for n, p in P.items()})
