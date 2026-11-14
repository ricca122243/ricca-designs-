#!/usr/bin/env python3
"""Собирает конструктор КП RICCA в папку tools/kp-builder/_site (её и выкладываем на Netlify, сайт ricca-kp).

Что берётся с сайта, чтобы новое на сайте само попадало в КП:
  • модели диванов, кроватей и пуфов — ricca/js/catalog-data.js (скрытые не берём), фото — ricca/img/catalog;
  • доп. фото кроватей (второй ракурс, крупный план, другие ткани) — extra-photos.json;
  • логотипы «Нам доверяют» — список из ricca/index.html, файлы ricca/img/clients/c;
  • монограмма RD — из ricca/index.html.
Интерьеры кроватей с Pinterest в репозиторий не кладём (репозиторий публичный): interiors.json хранит ссылки,
сборка скачивает их в .cache/int и уменьшает до 2400 px.

Запуск: python3 tools/kp-builder/build.py   →   _site/index.html (+ img, int, logos, функция /api)
        python3 tools/kp-builder/build.py --artifact   — ещё и _site/artifact.html: тело страницы для Artifact в claude.ai
"""
import json, os, re, shutil, subprocess, sys, urllib.request
from io import BytesIO

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SITE = os.path.join(HERE, '_site')
CACHE = os.path.join(HERE, '.cache')
RICCA = os.path.join(ROOT, 'ricca')


def catalog():
    js = r"""
global.window = global; require(process.argv[1]);
const vis = window.RICCA_CATALOG.filter((m) => ['sofas', 'beds', 'poufs'].includes(m.category));
console.log(JSON.stringify(vis.map((m) => ({ id: m.id, cat: m.category, name: m.short || m.name, type: m.type, subtitle: m.subtitle || '',
  description: m.description || '', options: m.options || [],
  photos: m.photos.map((p) => ({ src: p.src, w: p.w, h: p.h, alt: p.alt || '', box: p.studio && Array.isArray(p.box) ? p.box : null })) }))));
"""
    out = subprocess.run(['node', '-e', js, os.path.join(RICCA, 'js', 'catalog-data.js')], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def main():
    from PIL import Image
    os.makedirs(os.path.join(SITE, 'img'), exist_ok=True)
    models = catalog()
    extra = json.load(open(os.path.join(HERE, 'extra-photos.json'), encoding='utf-8'))
    used = set()
    for m in models:
        photos = []
        for p in m['photos']:
            name = os.path.basename(p['src']); used.add(name)
            photos.append({'f': 'img/' + name, 'w': p['w'], 'h': p['h'], 'alt': p['alt'], **({'box': p['box']} if p.get('box') else {})})
        have = {os.path.basename(p['f']) for p in photos}
        for name in extra.get(m['id'], []):
            path = os.path.join(RICCA, 'img', 'catalog', name)
            if name in have or not os.path.exists(path):
                continue
            w, h = Image.open(path).size
            photos.append({'f': 'img/' + name, 'w': w, 'h': h, 'alt': ''}); have.add(name); used.add(name)
        m['photos'] = photos
    for name in used:
        dst = os.path.join(SITE, 'img', name)
        if not os.path.exists(dst):
            shutil.copyfile(os.path.join(RICCA, 'img', 'catalog', name), dst)

    # интерьеры с Pinterest: скачать по ссылкам (кэш), уменьшить
    ints = json.load(open(os.path.join(HERE, 'interiors.json'), encoding='utf-8'))
    os.makedirs(os.path.join(CACHE, 'int'), exist_ok=True); os.makedirs(os.path.join(SITE, 'int'), exist_ok=True)
    interiors = {}
    for mid, lst in ints.items():
        for x in lst:
            cached = os.path.join(CACHE, 'int', x['file'])
            if not os.path.exists(cached):
                try:
                    req = urllib.request.Request(x['src'], headers={'User-Agent': 'Mozilla/5.0'})
                    data = urllib.request.urlopen(req, timeout=40).read()
                    im = Image.open(BytesIO(data)).convert('RGB'); im.thumbnail((2400, 2400))
                    im.save(cached, quality=85, optimize=True)
                except Exception as e:  # ссылка умерла — модель просто без этого интерьера
                    print('интерьер не скачался:', x['file'], e); continue
            shutil.copyfile(cached, os.path.join(SITE, 'int', x['file']))
            w, h = Image.open(cached).size
            interiors.setdefault(mid, []).append({'f': 'int/' + x['file'], 'w': w, 'h': h, 'alt': '', 'pre': x['pre']})

    # логотипы «Нам доверяют» — как на сайте (порядок и масштаб --k)
    page = open(os.path.join(RICCA, 'index.html'), encoding='utf-8').read()
    os.makedirs(os.path.join(SITE, 'logos'), exist_ok=True)
    logos = []
    for li in re.findall(r'<li(?: style="--k:([\d.]+)")?><img src="img/clients/c/([^"]+)"[^>]*alt="([^"]*)"', page):
        k, file, alt = li
        shutil.copyfile(os.path.join(RICCA, 'img', 'clients', 'c', file), os.path.join(SITE, 'logos', file))
        logos.append({'f': 'logos/' + file, 'name': alt, 'k': float(k or 1)})

    mono = re.search(r'<symbol id="rd-mono"[^>]*><path fill="currentColor" d="([^"]+)"', page).group(1)
    src = open(os.path.join(HERE, 'src', 'index.src.html'), encoding='utf-8').read()
    body = (src.replace('/*CATALOG*/', json.dumps(models, ensure_ascii=False))
               .replace('/*INTERIORS*/', json.dumps(interiors, ensure_ascii=False))
               .replace('/*LOGOS*/', json.dumps(logos, ensure_ascii=False))
               .replace('/*MONO*/', mono))
    head = ('<!doctype html><html lang="ru" translate="no"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<meta name="robots" content="noindex,nofollow"><meta name="google" content="notranslate">'
            '<link rel="icon" href="favicon.svg" type="image/svg+xml">'
            '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>')
    open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8').write(head + body + '</body></html>')
    if '--artifact' in sys.argv:
        open(os.path.join(SITE, 'artifact.html'), 'w', encoding='utf-8').write(body)

    shutil.copyfile(os.path.join(RICCA, 'img', 'logo', 'favicon.svg'), os.path.join(SITE, 'favicon.svg'))
    open(os.path.join(SITE, 'robots.txt'), 'w').write('User-agent: *\nDisallow: /\n')
    os.makedirs(os.path.join(SITE, 'netlify', 'functions'), exist_ok=True)
    shutil.copyfile(os.path.join(HERE, 'src', 'functions', 'kp.mjs'), os.path.join(SITE, 'netlify', 'functions', 'kp.mjs'))
    json.dump({'name': 'ricca-kp', 'private': True, 'type': 'module', 'dependencies': {'@netlify/blobs': '11.1.9'}},
              open(os.path.join(SITE, 'package.json'), 'w'), indent=2)
    open(os.path.join(SITE, 'netlify.toml'), 'w', encoding='utf-8').write('''# Конструктор КП RICCA DESIGNS — готовая папка; функция /api — общее хранилище (Netlify Blobs).
[build]
  publish = "."
  command = "echo 'сборка не нужна'"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[headers]]
  for = "/*"
  [headers.values]
    X-Robots-Tag = "noindex, nofollow"
    Referrer-Policy = "strict-origin-when-cross-origin"
    X-Content-Type-Options = "nosniff"

[[headers]]
  for = "/img/*"
  [headers.values]
    Cache-Control = "public, max-age=604800"
''')
    print('готово:', SITE, '| моделей', len(models), '| фото', len(used), '| интерьеров', sum(len(v) for v in interiors.values()), '| логотипов', len(logos))


if __name__ == '__main__':
    main()
