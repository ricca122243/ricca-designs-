"""Единая обработка фото работ ателье (телефонные снимки из Instagram) под сайт: холодный белый, ровный свет.
Только то, что делает фотограф при проявке: баланс белого по светлым нейтральным участкам (стены, потолок, бельё),
экспозиция (белое — почти белое, без пересвета), мягкий контраст, лёгкая резкость после уменьшения. Сама мебель,
её цвет и форма не меняются; ничего не дорисовывается. Общий модуль для works-photos.py и hero-photos.py.
"""
import numpy as np
from PIL import Image, ImageFilter


def _to_lin(a):
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def _to_srgb(a):
    a = np.clip(a, 0, 1)
    return np.where(a <= 0.0031308, a * 12.92, 1.055 * np.power(a, 1 / 2.4) - 0.055)


def _lum(a):
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def analyze(im):
    """Коэффициенты проявки по уменьшенной копии (быстро и без шума): gains (баланс белого), expo (экспозиция), gamma."""
    s = im.copy(); s.thumbnail((320, 320))
    a = _to_lin(np.asarray(s.convert('RGB')).astype(np.float32) / 255)
    L = _lum(a)
    mx, mn = a.max(-1), a.min(-1)
    chroma = (mx - mn) / np.maximum(mx, 1e-4)
    bright = L > np.percentile(L, 60)
    neutral = bright & (chroma < 0.16)
    if neutral.mean() < 0.02:   # почти нет нейтральных светлых участков — берём самые светлые малонасыщенные
        neutral = bright & (chroma < np.percentile(chroma[bright], 25))
    m = a[neutral].mean(0) + 1e-5
    gains = m.mean() / m
    gains = np.clip(gains, 0.78, 1.32)
    gains = 1 + (gains - 1) * 0.9   # не до стерильности: чуть-чуть тёплого света остаётся
    a = a * gains
    L = _lum(a)
    p98 = np.percentile(L, 98)
    expo = float(np.clip(0.86 / max(p98, 1e-3), 0.85, 1.7))   # белое ≈ 0,86 в линейном свете (светлая стена, не пересвет)
    L = np.clip(L * expo, 0, 1)
    med = float(np.median(L))
    gamma = 1.0
    if med < 0.2:   # тёмный кадр — подтянуть средние тона, но не «выбелить»
        gamma = float(np.clip(np.log(0.2) / np.log(max(med, 1e-3)), 0.72, 1.0))
    return gains.astype(np.float32), expo, gamma


def grade(im, params=None):
    """Проявка полного кадра по коэффициентам (см. analyze). Возвращает новый RGB Image."""
    gains, expo, gamma = params or analyze(im)
    a = _to_lin(np.asarray(im.convert('RGB')).astype(np.float32) / 255)
    a = np.clip(a * gains * expo, 0, 1)
    if gamma != 1.0:
        a = np.power(a, gamma)
    # чёрная точка: самые тёмные 0,5 % — к 0,004 (глубина, но не «провал»)
    L = _lum(a)
    bp = float(np.percentile(L, 0.5))
    if bp > 0.004:
        a = np.clip((a - bp) / (1 - bp) * (1 - 0.004) + 0.004, 0, 1)
    s = _to_srgb(a)
    # мягкий контраст в sRGB: средние тона чуть разводятся, края (0 и 1) на месте
    k = 0.10
    s = s + k * (s - 0.5) * (1 - np.square(2 * s - 1))
    # чуть спокойнее насыщенность общего каста (−4 %): мебель остаётся своего цвета
    lum = _lum(s)[..., None]
    s = lum + (s - lum) * 0.96
    return Image.fromarray((np.clip(s, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB')


def resize_sharp(im, size):
    """Уменьшение/увеличение с резкостью «как у проявленного фото»: увеличенные кадры из видео — мягче и без блоков."""
    up = size[0] > im.width
    if up:
        im = im.filter(ImageFilter.GaussianBlur(0.5))   # блоки сжатия видео не превращаем в «зерно»
    out = im.resize(size, Image.LANCZOS) if size != im.size else im.copy()
    if up:
        return out.filter(ImageFilter.UnsharpMask(radius=1.6, percent=38, threshold=3))
    return out.filter(ImageFilter.UnsharpMask(radius=1.0, percent=55, threshold=2))
