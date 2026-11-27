#!/usr/bin/env python3
"""Первый экран сайта — реальные работы ателье (Instagram @ricca.designs, ricca/content/instagram/, в git не входит).
Для каждого кадра из HERO: ricca/img/hero/<shortcode>-<N>-l.webp (ландшафт 16 : 10 для компьютера, ширина до 1920)
и -p.webp (портрет 9 : 16 для телефона, высота до 1600). Кадр — центр по фокусу (fx, fy — доли ширины/высоты). Фото проявляются под сайт (photo_grade.py:
баланс белого, экспозиция, резкость; мебель не меняется), кадрируются и уменьшаются; метаданные не пишутся. Запуск из корня: python3 tools/media-v3/hero-photos.py
"""
import glob, os, sys
from PIL import Image, ImageOps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from photo_grade import grade, resize_sharp  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'ricca', 'content', 'instagram')
OUT = os.path.join(ROOT, 'ricca', 'img', 'hero')
# (shortcode, кадр, фокус x, фокус y)
HERO = [('DdAJz7PiC61', 2, 0.5, 0.56), ('C_tjlDdgnmn', 4, 0.5, 0.6), ('C7E_JvdoXM-', 1, 0.5, 0.56), ('C9h3Txai1KF', 1, 0.5, 0.5)]


def crop(im, ratio, fx, fy):
    W, H = im.size
    cw, ch = (W, int(W / ratio)) if W / H > ratio else (int(H * ratio), H)
    if cw > W: cw, ch = W, int(W / ratio)
    if ch > H: ch, cw = H, int(H * ratio)
    x0 = int(min(max(0, W * fx - cw / 2), W - cw)); y0 = int(min(max(0, H * fy - ch / 2), H - ch))
    return im.crop((x0, y0, x0 + cw, y0 + ch))


def fit(im, w=None, h=None):
    k = min(w / im.width if w else 9, h / im.height if h else 9, 1)
    return resize_sharp(im, (round(im.width * k), round(im.height * k)))


os.makedirs(OUT, exist_ok=True)
for sc, n, fx, fy in HERO:
    f = glob.glob(os.path.join(SRC, f'*-{sc}-{n}.jpg'))
    if not f: print('нет исходника', sc, n); continue
    im = grade(ImageOps.exif_transpose(Image.open(f[0])).convert('RGB'))
    fit(crop(im, 16 / 10, fx, fy), w=1920).save(f'{OUT}/{sc}-{n}-l.webp', 'WEBP', quality=86, method=6)
    fit(crop(im, 9 / 16, fx, fy), h=1600).save(f'{OUT}/{sc}-{n}-p.webp', 'WEBP', quality=86, method=6)
    print(sc, n, Image.open(f'{OUT}/{sc}-{n}-l.webp').size, Image.open(f'{OUT}/{sc}-{n}-p.webp').size)
