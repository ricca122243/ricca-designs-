#!/usr/bin/env python3
"""Положить фото владельца в «Наши работы»: ricca/content/works-owner/<id>-<N>.jpg — исходник для works-photos.py.

  python3 tools/media-v3/works-owner-add.py <id> <фото1> [<фото2> …]     → <id>-1.jpg, <id>-2.jpg, … (по порядку)

Байты картинки не трогаются (без пересжатия): из JPEG убираются только служебные блоки — EXIF (камера, дата, место съёмки),
XMP, IPTC и комментарии; цветовой профиль остаётся. Поворот по EXIF, если он есть, применяется (тогда — пересохранение q95).
Дальше: запись работы в tools/media-v3/works-selection.json ("src": "owner") и python3 tools/media-v3/works-photos.py."""
import os
import re
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OWN = os.path.join(ROOT, 'ricca', 'content', 'works-owner')
DROP = {0xE1, 0xED, 0xFE}   # APP1 (EXIF / XMP), APP13 (IPTC / Photoshop), COM


def strip_jpeg(data):
    """JPEG без служебных блоков: идём по сегментам до начала скана (SOS), остальное — как есть."""
    if data[:2] != b'\xff\xd8':
        raise ValueError('не JPEG')
    out, i = bytearray(b'\xff\xd8'), 2
    while i < len(data):
        if data[i] != 0xFF:
            raise ValueError('битый JPEG')
        m = data[i + 1]
        if m == 0xD9:
            out += data[i:i + 2]; break
        if m == 0xDA or (0xD0 <= m <= 0xD7) or m == 0x01:
            out += data[i:]; break            # скан и всё после него
        ln = int.from_bytes(data[i + 2:i + 4], 'big')
        if m not in DROP:
            out += data[i:i + 2 + ln]
        i += 2 + ln
    return bytes(out)


def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    wid, files = sys.argv[1], sys.argv[2:]
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{2,40}', wid):
        sys.exit('id: латиница, цифры и дефис, например ricca-2521')
    os.makedirs(OWN, exist_ok=True)
    for n, f in enumerate(files, 1):
        dst = os.path.join(OWN, f'{wid}-{n}.jpg')
        im = Image.open(f)
        if im.format != 'JPEG' or im.getexif().get(0x0112, 1) != 1:
            from PIL import ImageOps
            ImageOps.exif_transpose(im).convert('RGB').save(dst, 'JPEG', quality=95, icc_profile=im.info.get('icc_profile'))
        else:
            open(dst, 'wb').write(strip_jpeg(open(f, 'rb').read()))
        with Image.open(dst) as chk:
            chk.load()
            assert not chk.getexif() and 'xmp' not in chk.info, dst
            print(os.path.relpath(dst, ROOT), chk.size)


if __name__ == '__main__':
    main()
