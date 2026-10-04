#!/usr/bin/env python3
"""ELUNA — пакет для хостинга: ELUNA-hosting.zip
   ELUNA/README.txt, ELUNA/site/, ELUNA/site-upload.zip (содержимое site/ в корне),
   ELUNA/single-file/index.html, ELUNA/tools/build_single.py
Использование: python3 make_package.py <site> <single.html> <build_single.py> <readme.txt> <out.zip>"""
import io, os, sys, zipfile
SITE, SINGLE, BUILDER, README, OUT = sys.argv[1:6]
TS = (2026, 10, 4, 12, 0, 0)
JUNK = {'.DS_Store', 'Thumbs.db', '__pycache__'}

def add(z, arc, data):
    zi = zipfile.ZipInfo(arc, TS); zi.compress_type = zipfile.ZIP_DEFLATED; zi.external_attr = 0o100644 << 16
    z.writestr(zi, data, compresslevel=9)

def add_dir(z, arc):
    zi = zipfile.ZipInfo(arc.rstrip('/') + '/', TS); zi.external_attr = (0o40755 << 16) | 0x10
    z.writestr(zi, b'')

def walk(root):
    for d, dirs, files in os.walk(root):
        dirs[:] = sorted(x for x in dirs if x not in JUNK)
        rel = os.path.relpath(d, root)
        yield rel, None
        for f in sorted(files):
            if f in JUNK or f.endswith('.pyc'): continue
            yield rel, f

def read(p):
    with open(p, 'rb') as fh: return fh.read()

# site-upload.zip — файлы сайта прямо в корне архива (для «Извлечь» в панели хостинга)
buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w') as z:
    for rel, f in walk(SITE):
        if f is None:
            if rel != '.': add_dir(z, rel)
        else:
            add(z, os.path.normpath(os.path.join(rel, f)), read(os.path.join(SITE, rel, f)))
upload = buf.getvalue()

readme = read(README).decode('utf-8').replace('\r\n', '\n').replace('\n', '\r\n')
with zipfile.ZipFile(OUT, 'w') as z:
    add_dir(z, 'ELUNA')
    add(z, 'ELUNA/README.txt', '﻿'.encode() + readme.encode('utf-8'))
    for rel, f in walk(SITE):
        base = 'ELUNA/site' if rel == '.' else f'ELUNA/site/{rel}'
        if f is None: add_dir(z, base)
        else: add(z, f'{base}/{f}', read(os.path.join(SITE, rel, f)))
    add(z, 'ELUNA/site-upload.zip', upload)
    add_dir(z, 'ELUNA/single-file'); add(z, 'ELUNA/single-file/index.html', read(SINGLE))
    add_dir(z, 'ELUNA/tools'); add(z, 'ELUNA/tools/build_single.py', read(BUILDER))
print(OUT, f'{os.path.getsize(OUT) / 1024 / 1024:.2f} MB')
