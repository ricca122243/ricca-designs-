#!/usr/bin/env python3
"""ELUNA — сборка сайта в ОДИН .html: CSS, JS, шрифты и картинки внутри файла.

Использование: python3 build_single.py <папка_сайта> <выходной.html>

• стили (fonts.css, styles.css, polish-*.css) → один <style>, url(...) → data:
• скрипты (gsap, core, moon, hero, strata, main) → inline в конце <body>, в том же порядке
• картинки в HTML/CSS/JS → data: (srcset схлопывается до одного файла)
• privacy.html / legal.html → встроенные окна <dialog> (ссылки ведут на #privacy / #legal)
"""
import base64, mimetypes, os, re, sys

SRC, OUT = sys.argv[1], sys.argv[2]
MIME = {'.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2', '.ttf': 'font/ttf'}
_cache = {}


def data_uri(rel):
    rel = rel.split('?')[0]
    path = os.path.normpath(os.path.join(SRC, rel))
    if path not in _cache:
        ext = os.path.splitext(path)[1].lower()
        with open(path, 'rb') as f:
            _cache[path] = f'data:{MIME.get(ext) or mimetypes.guess_type(path)[0]};base64,' + base64.b64encode(f.read()).decode()
    return _cache[path]


def read(rel):
    with open(os.path.join(SRC, rel), encoding='utf-8') as f:
        return f.read()


def inline_css_urls(css):
    def rep(m):
        u = m.group(2)
        if u.startswith(('data:', 'http', '#', '%23')):
            return m.group(0)
        u2 = u[3:] if u.startswith('../') else u
        return f'url({data_uri(u2)})'
    return re.sub(r'url\((["\']?)([^)"\']+)\1\)', rep, css)


html = read('index.html')

# ---- стили
css_files = re.findall(r'<link rel="stylesheet" href="([^"]+)">', html)
css = '\n'.join(inline_css_urls(read(h.split('?')[0])) for h in css_files)
html = re.sub(r'\s*<link rel="stylesheet" href="[^"]+">', '', html)
html = re.sub(r'\s*<link rel="preload"[^>]*>', '', html)
html = html.replace('</head>', f'  <style>\n{css}\n  </style>\n</head>', 1)

# ---- иконка
html = re.sub(r'<link rel="icon" type="image/png" href="([^"]+)">', lambda m: f'<link rel="icon" type="image/png" href="{data_uri(m.group(1))}">', html)

# ---- картинки: srcset → один (самый подходящий) файл, src → data:
def pick_src(m):
    tag = m.group(0)
    ss = re.search(r'\ssrcset="([^"]+)"', tag)
    if ss and 'strata__closed' in tag:
        # собранный матрас: все размеры внутри файла — браузер берёт подходящий, боковины без ряби
        cands = [c.strip().split() for c in ss.group(1).split(',')]
        inl = ', '.join(f'{data_uri(u)} {d}' for u, d in cands)
        tag = re.sub(r'\ssrc="[^"]+"', f' src="{cands[0][0]}"', tag)   # запасной src — самый лёгкий
        return tag.replace(ss.group(0), f' srcset="{inl}"')
    if ss:
        cands = [c.strip().split()[0] for c in ss.group(1).split(',')]
        # для луны хватает 1280: шар рисует WebGL, фото — только постер
        best = next((c for c in cands if '1280' in c), cands[-1])
        tag = tag.replace(ss.group(0), '')
        tag = re.sub(r'\ssizes="[^"]*"', '', tag)
        tag = re.sub(r'\ssrc="[^"]+"', f' src="{best}"', tag)
    return tag
html = re.sub(r'<img\b[^>]*>', pick_src, html)
html = re.sub(r'<source\b[^>]*>', '', html)  # <picture>: остаётся только <img>
html = re.sub(r'(<img\b[^>]*?\ssrc=")((?:img|\./img)/[^"]+)(")', lambda m: m.group(1) + data_uri(m.group(2)) + m.group(3), html)
html = html.replace(' loading="lazy"', '')

# ---- privacy / legal → окна
def doc_dialog(fname, did, title):
    page = read(fname)
    body = re.search(r'<main class="legal">(.*?)</main>', page, re.S).group(1)
    body = re.sub(r'\s*<a class="legal__back"[^>]*>.*?</a>', '', body, flags=re.S)
    body = body.replace('href="privacy.html"', 'href="#privacy"').replace('href="legal.html"', 'href="#legal"')
    return (f'''  <dialog class="mdl mdl--doc" id="dlg-{did}" aria-labelledby="{did}-title">
    <form method="dialog" class="mdl__close"><button type="submit" aria-label="Закрыть">×</button></form>
    <div class="legal" id="{did}">{body.replace('<h1>', f'<h1 id="{did}-title">', 1)}</div>
  </dialog>
''')
legal_css = re.search(r'<style>(.*?)</style>', read('privacy.html'), re.S).group(1)
legal_css = legal_css.replace('html, body { overflow-x: clip; }', '').replace('body { background: var(--bg); }', '')
legal_css = legal_css.replace('.legal {', '.mdl--doc .legal {')
legal_css = legal_css.replace('max-width: 780px; margin: 0 auto; padding: clamp(40px, 8vh, 96px) var(--gutter) 80px;', 'padding: clamp(28px, 4vw, 44px) clamp(20px, 3vw, 36px) 40px;')
legal_css += '\n    .mdl--doc { overflow-x: hidden; }\n'
html = html.replace('</head>', f'  <style>{legal_css}</style>\n</head>', 1)
dialogs = doc_dialog('privacy.html', 'privacy', 'Политика конфиденциальности') + doc_dialog('legal.html', 'legal', 'Авторские права')
html = html.replace('  <!-- липкая плашка Prime', dialogs + '\n  <!-- липкая плашка Prime', 1)
html = re.sub(r'<a href="privacy\.html"[^>]*>', '<a href="#privacy">', html)
html = re.sub(r'<a href="legal\.html"[^>]*>', '<a href="#legal">', html)

# ---- скрипты: inline в конце body, порядок сохраняется
scripts = re.findall(r'<script defer src="([^"]+)"></script>', html)
html = re.sub(r'\s*<script defer src="[^"]+"></script>', '', html)
js_parts = []
for s in scripts:
    code = read(s.split('?')[0])
    # пути к картинкам в JS → data:  (карта 4096 не встраивается: хватает 2048)
    # карта 4096 в один файл не кладём: шар остаётся на 2048 (апгрейд — пустая операция)
    code = code.replace("moonGL && moonGL.upgrade('img/moon-map-4096.webp')", "0")
    code = re.sub(r"'(img/[^']+\.(?:webp|png|jpg))'", lambda m: "'" + data_uri(m.group(1)) + "'", code)
    code = code.replace('</script', '<\\/script')
    js_parts.append(f'<script>\n{code}\n</script>')
html = html.replace('</body>', '\n'.join(js_parts) + '\n</body>', 1)

# ---- остаточные относительные ссылки на ресурсы — ошибка сборки
left = re.findall(r'(?:src|href)="((?:img|css|js|fonts|vendor)/[^"]+)"', html)
if left:
    raise SystemExit(f'не встроены: {left[:10]}')

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print(OUT, f'{os.path.getsize(OUT) / 1024 / 1024:.2f} MB')
