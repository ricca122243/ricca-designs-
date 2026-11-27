# Предметные рендеры p-* (img/catalog): ровный фон #F7F6F0 → фон страницы #FAFAF8 (13 октября, ревью: «вырезка на бежевом»).
# Меняются только пиксели, близкие к фону (по каждому каналу не дальше 16 уровней от #F7F6F0), с плавным спадом — изделие,
# его цвет и фактура не трогаются; мягкие тени у пола переходят плавно. После этого в CSS --studio = #FAFAF8, рамки не видны.
# Файлы, у которых фон в углах не #F7F6F0, пропускаются. Повторный запуск безопасен (фон уже #FAFAF8 — файл пропускается).
# Запуск: python3 tools/media-v3/studio-rekey.py
import glob, os
import numpy as np
from PIL import Image

CAT = '/home/user/ricca-designs-/ricca/img/catalog'
BG = np.array([247, 246, 240], np.float32)
TO = np.array([250, 250, 248], np.float32)
done = skipped = 0
for f in sorted(glob.glob(CAT + '/p-*.webp')):
    im = Image.open(f)
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    corners = np.concatenate([a[:12, :12].reshape(-1, 3), a[:12, -12:].reshape(-1, 3), a[-12:, :12].reshape(-1, 3), a[-12:, -12:].reshape(-1, 3)])
    if np.abs(np.median(corners, 0) - BG).max() > 3:
        skipped += 1
        continue
    d = np.abs(a - BG).max(axis=2, keepdims=True)
    x = np.clip(1 - d / 16.0, 0, 1)
    w = x * x * (3 - 2 * x)
    out = np.clip(np.round(a + (TO - BG) * w), 0, 255).astype(np.uint8)
    Image.fromarray(out).save(f, quality=86, method=6)
    done += 1
print('re-keyed', done, 'skipped', skipped)
