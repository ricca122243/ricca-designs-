#!/usr/bin/env python3
"""Архив RICCA DESIGNS «на всякий случай»: фото сайта, разложенные по понятным папкам, и копия самого сайта.
  python3 tools/backup-archive.py <куда положить>            (папка создаётся: <куда>/RICCA-архив-ГГГГ-ММ-ДД)
  python3 tools/backup-archive.py <куда> --zip               (ещё и zip-файлы по разделам — удобно скачивать и хранить)
  python3 tools/backup-archive.py <куда> --zip --no-site     (без копии сайта: она весит около 450 МБ)

Владелец, 25 ноября: «разделить фотографии по папкам, чтобы было удобно, и на комп папку создать на всякий случай».
Сайт хранит фото под техническими именами (img/catalog/p-sofa-52-r.webp). Здесь они разложены по-человечески:
  1. Каталог / Диваны / Alvea / Alvea — 1.jpg            — фото моделей каталога (то, что показывает сайт), по видам мебели;
  2. Ткани / Велюр / ALBA / ALBA № 01.jpg                 — образцы тканей по типам и коллекциям (крупное фото цвета);
  3. Наши работы / Диваны / Диван Klint / 1.jpg           — реальные изделия ателье;
  4. Проекты / Офис / 01.jpg                              — съёмки объектов;
  5. Сайт / RICCA-site.zip                                — готовый сайт целиком (эту папку можно залить на любой хостинг).
Фото переводятся в JPG (открывается везде, годится для WhatsApp и Instagram); цвет и размер не меняются.
Скрытые из каталога модели лежат в «1. Каталог / _скрытые с сайта». Ничего на сайте скрипт не меняет."""
import datetime, json, os, re, shutil, subprocess, sys, zipfile
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SITE = os.path.join(ROOT, 'ricca')
JS = r"""
global.window = {};
for (const f of ['catalog-data.js', 'fabrics-data.js', 'works-data.js']) require(process.argv[1] + '/js/' + f);
const C = window.RICCA_CATALOG_ALL || window.RICCA_CATALOG;
process.stdout.write(JSON.stringify({
  names: window.RICCA_MODEL_NAMES, cats: window.RICCA_CATALOG_CATEGORIES,
  catalog: C.map((m) => ({ id: m.id, category: m.category, type: m.type, hidden: !!m.hidden, photos: m.photos.map((p) => p.src) })),
  fabrics: window.RICCA_FABRIC_LIBRARY.types.map((t) => ({ title: t.title, collections: t.collections.map((c) => ({ title: c.title, colours: c.colours.map((k) => ({ name: k.name, src: k.src900 || k.src450 })) })) })),
  works: (window.RICCA_WORKS || []).map((w) => ({ cat: w.cat, title: w.title, sub: w.sub, photos: (w.photos || []).map((p) => p.src) })),
}));
"""
BAD = re.compile(r'[\\/:*?"<>|]+')


def safe(s):
    return BAD.sub(' ', str(s)).strip().rstrip('.') or 'без названия'


def to_jpg(src, dst):
    if not os.path.isfile(src): return False
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.open(src)
    if im.mode in ('RGBA', 'LA', 'P'):                      # прозрачный фон → белый
        im = im.convert('RGBA'); bg = Image.new('RGB', im.size, (255, 255, 255)); bg.paste(im, mask=im.split()[-1]); im = bg
    im.convert('RGB').save(dst, 'JPEG', quality=90, optimize=True)
    return True


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args: print(__doc__); return
    out = os.path.join(os.path.abspath(args[0]), 'RICCA-архив-' + datetime.date.today().isoformat())
    if os.path.exists(out): shutil.rmtree(out)
    d = json.loads(subprocess.check_output(['node', '-e', JS, SITE]))
    label = {k: v.get('label', k) for k, v in d['cats'].items()}
    n = {'каталог': 0, 'ткани': 0, 'работы': 0, 'проекты': 0}

    # 1. Каталог
    for m in d['catalog']:
        name = d['names'].get(m['id']) or m['id']
        base = os.path.join(out, '1. Каталог', '_скрытые с сайта' if m['hidden'] else '', safe(label.get(m['category'], m['category'])), safe(name))
        for i, src in enumerate(m['photos'], 1):
            if to_jpg(os.path.join(SITE, src), os.path.join(base, f'{safe(name)} — {i}.jpg')): n['каталог'] += 1
    # 2. Ткани
    for t in d['fabrics']:
        for c in t['collections']:
            base = os.path.join(out, '2. Ткани', safe(t['title']), safe(c['title']))
            for k in c['colours']:
                if to_jpg(os.path.join(SITE, k['src']), os.path.join(base, f"{safe(c['title'])} {safe(k['name'])}.jpg")): n['ткани'] += 1
    # 3. Наши работы
    seen = {}
    for w in d['works']:
        title = safe(w['title'] or 'Изделие'); key = (w['cat'], title); seen[key] = seen.get(key, 0) + 1
        folder = title if seen[key] == 1 else f'{title} ({seen[key]})'
        base = os.path.join(out, '3. Наши работы', safe(label.get(w['cat'], w['cat'] or 'Разное')), folder)
        for i, src in enumerate(w['photos'], 1):
            if to_jpg(os.path.join(SITE, src), os.path.join(base, f'{i}.jpg')): n['работы'] += 1
    # 4. Проекты
    pj = json.load(open(os.path.join(ROOT, 'tools', 'projects-data.json'), encoding='utf-8'))
    for p in pj.get('projects', []):
        title = safe((p.get('home') or {}).get('title') or (p.get('page') or {}).get('title') or p.get('slug'))
        folder = os.path.join(SITE, p.get('dir', ''))
        for i, key in enumerate(sorted(p.get('photos', {})), 1):
            # самый крупный файл кадра: <prefix><ключ>[-<ширина>].webp
            cands = [f for f in os.listdir(folder) if re.fullmatch(re.escape(p.get('prefix', '') + key) + r'(-\d+)?\.(webp|jpe?g|png)', f)] if os.path.isdir(folder) else []
            if not cands: continue
            best = max(cands, key=lambda f: os.path.getsize(os.path.join(folder, f)))
            cap = safe((p['photos'][key] or {}).get('caption') or '')
            if to_jpg(os.path.join(folder, best), os.path.join(out, '4. Проекты', title, f'{i:02d}' + (f' — {cap}' if cap else '') + '.jpg')): n['проекты'] += 1
    # 5. Сайт целиком (--no-site — без него: копия сайта весит около 450 МБ)
    site = os.path.join(ROOT, 'dist', 'RICCA-site')
    if '--no-site' not in sys.argv:
        os.makedirs(os.path.join(out, '5. Сайт'), exist_ok=True)
        with zipfile.ZipFile(os.path.join(out, '5. Сайт', 'RICCA-site.zip'), 'w', zipfile.ZIP_STORED) as z:
            for r, _, fs in os.walk(site):
                for f in fs:
                    p = os.path.join(r, f); z.write(p, os.path.join('RICCA-site', os.path.relpath(p, site)))
    open(os.path.join(out, 'ПРОЧТИ.txt'), 'w', encoding='utf-8').write(f"""RICCA DESIGNS — архив от {datetime.date.today().strftime('%d.%m.%Y')}

Что здесь лежит
  1. Каталог      — фото моделей каталога по видам мебели; папка названа так же, как модель на сайте ({n['каталог']} фото).
                    «_скрытые с сайта» — модели, которые сейчас на сайте не показываются.
  2. Ткани        — образцы тканей: тип → коллекция → цвет ({n['ткани']} фото).
  3. Наши работы  — реальные изделия ателье ({n['работы']} фото).
  4. Проекты      — съёмки объектов ({n['проекты']} фото).
  5. Сайт         — RICCA-site.zip: готовый сайт целиком, каким он был в этот день.

Зачем это нужно
  Сайт живёт на хостинге Netlify, его исходники — на GitHub. Этот архив — третья, независимая копия у вас на компьютере.
  Если что-то случится с аккаунтами, сайт можно поднять заново: распаковать RICCA-site.zip и залить папку на любой хостинг.

Совет: держите архив в двух местах — на компьютере и на флешке или в облаке. Обновлять стоит после больших изменений на сайте.
""")
    print(out); print(n)
    if '--zip' in sys.argv:
        def pack(name, folders):
            zp = os.path.join(os.path.dirname(out), f'{os.path.basename(out)} — {name}.zip')
            with zipfile.ZipFile(zp, 'w', zipfile.ZIP_STORED) as z:
                z.write(os.path.join(out, 'ПРОЧТИ.txt'), 'ПРОЧТИ.txt')
                for p in folders:
                    for r, _, fs in os.walk(p):
                        for f in fs:
                            q = os.path.join(r, f); z.write(q, os.path.relpath(q, out))
            print(os.path.basename(zp), round(os.path.getsize(zp) / 1e6), 'МБ')
        j = lambda *a: os.path.join(out, *a)
        pack('1 Каталог', [j('1. Каталог')])
        for t in sorted(os.listdir(j('2. Ткани'))): pack(f'2 Ткани ({t})', [j('2. Ткани', t)])
        pack('3-4 Работы и проекты', [j('3. Наши работы'), j('4. Проекты')])
        # копия сайта — частями до 90 МБ (одним файлом ~450 МБ через чат не передать); все части распаковываются в одну папку
        if '--no-site' not in sys.argv:
            files = sorted((os.path.join(r, f) for r, _, fs in os.walk(site) for f in fs), key=lambda q: os.path.relpath(q, site))
            parts, cur, size = [], [], 0
            for q in files:
                sz = os.path.getsize(q)
                if cur and size + sz > 90e6: parts.append(cur); cur, size = [], 0
                cur.append(q); size += sz
            if cur: parts.append(cur)
            note = ('Копия сайта RICCA DESIGNS разрезана на части. Распакуйте ВСЕ части в одну и ту же папку —\n'
                    'получится папка RICCA-site: это готовый сайт целиком, его можно залить на любой хостинг.\n')
            for i, part in enumerate(parts, 1):
                zp = os.path.join(os.path.dirname(out), f'{os.path.basename(out)} — 5 Сайт целиком, часть {i} из {len(parts)}.zip')
                with zipfile.ZipFile(zp, 'w', zipfile.ZIP_STORED) as z:
                    z.writestr('КАК РАСПАКОВАТЬ.txt', note)
                    for q in part: z.write(q, os.path.join('RICCA-site', os.path.relpath(q, site)))
                print(os.path.basename(zp), round(os.path.getsize(zp) / 1e6), 'МБ')

if __name__ == '__main__':
    main()
