"""Пуф Ovalo (pouf-02): 3D для сайта и конструктора — models3d/free/pouf-02.json.
24 ноября, владелец: «это круглый пуф, крест-накрест кант делит его на четыре части — на фото видно».
Тело: мягкий цилиндр движка (k: cyl) круглый в плане, Ø 0,80 × 0,47 м, бока полностью скруглены (как на фото — «подушка»).
Кант: две петли по профилю тела — одна спереди назад, другая слева направо; на верху и внизу они пересекаются.
Точки канта считаются по той же формуле профиля, что softCyl в js/cfg/furniture3d.js, и уходят в тело на 1,5 мм — кант лежит на ткани.
Запуск из корня: python3 tools/media-v3/pouf-02-json.py (пишет ricca/ и dist/)."""
import json, math, os

W, H = 0.80, 0.47            # диаметр и высота
R_TOP, R_BOT, BAR = 0.235, 0.21, 0.035
PIPE_D, SINK = 0.014, 0.0015 # диаметр канта, насколько утоплен в ткань
YC, ZC = H / 2, W / 2        # центр тела: z = 0 — тыл изделия

A = W / 2 / (1 + BAR); Hh = H / 2
rT, rB = min(R_TOP, Hh, A * 0.9), min(R_BOT, Hh, A * 0.9)
barrel = lambda y: 1 + BAR * math.sin(math.pi * min(1, max(0, (y + Hh) / (2 * Hh))))

# профиль softCyl: [радиус, y] от центра низа до центра верха
prof = []
for i in range(0, 9): prof.append((A - rB) * i / 8)
prof = [(r, -Hh) for r in prof]
for k in range(1, 13):
    a = k * math.pi / 24; dl = rB - rB * math.sin(a); prof.append(((A - dl), -Hh + rB - rB * math.cos(a)))
for k in range(1, 3):
    prof.append((A, -Hh + rB + (2 * Hh - rT - rB) * k / 2))
for k in range(1, 13):
    a = k * math.pi / 24; dl = rT - rT * math.cos(a); prof.append(((A - dl), Hh - rT + rT * math.sin(a)))
for i in range(1, 9): prof.append(((A - rT) * (8 - i) / 8, Hh))
prof = [(r * barrel(y), y) for r, y in prof]

# петля в плоскости: верх → перёд → низ → тыл → верх (u — координата вдоль плоскости)
half = [(r, y) for r, y in reversed(prof)]                       # от центра верха вниз по переду
loop = half + [(-r, y) for r, y in reversed(half[1:-1])]         # по тылу вверх
# утопить в ткань по нормали
pts = []
n = len(loop)
for i, (u, y) in enumerate(loop):
    u0, y0 = loop[i - 1]; u1, y1 = loop[(i + 1) % n]
    tu, ty = u1 - u0, y1 - y0; L = math.hypot(tu, ty) or 1
    nu, ny = ty / L, -tu / L                                      # нормаль наружу (петля идёт по часовой)
    if nu * u + ny * y < 0: nu, ny = -nu, -ny
    pts.append((u - nu * SINK, y - ny * SINK))
# прореживание: точки не чаще 2,5 см
thin = [pts[0]]
for p in pts[1:]:
    if math.hypot(p[0] - thin[-1][0], p[1] - thin[-1][1]) >= 0.025: thin.append(p)
r4 = lambda v: round(v, 4)
fb = [[0, r4(YC + y), r4(ZC + u)] for u, y in thin]               # спереди назад (плоскость x = 0)
lr = [[r4(u), r4(YC + y), r4(ZC)] for u, y in thin]               # слева направо (плоскость z = центр)

spec = {
    "id": "pouf-02",
    "size": [W, W, H],
    "view": {"az": -14, "el": 3.5, "fov": 20, "zoom": 1.1},
    "light": {"az": 20, "contrast": 0.35, "high": 1.4, "exposure": 0.92, "top": 2.2},
    "fab": "molly:11",
    "measure": {"seatH": H},
    "items": [
        {"id": "body", "k": "cyl", "p": [0, YC, ZC], "s": [W, H, W], "rTop": R_TOP, "rBottom": R_BOT, "barrel": BAR, "crown": 0},
        {"id": "pipeFB", "k": "tube", "m": "fabric", "d": PIPE_D, "round": 0.01, "closed": True, "pts": fb},
        {"id": "pipeLR", "k": "tube", "m": "fabric", "d": PIPE_D, "round": 0.01, "closed": True, "pts": lr},
    ],
}
out = json.dumps(spec, ensure_ascii=False, separators=(',', ':'))
for d in ('ricca', 'dist/RICCA-site'):
    f = f'{d}/models3d/free/pouf-02.json'
    if os.path.isdir(os.path.dirname(f)): open(f, 'w', encoding='utf-8').write(out + '\n')
print('точек в петле:', len(thin), '| байт:', len(out))
