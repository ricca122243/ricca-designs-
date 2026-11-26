#!/usr/bin/env python3
"""«Наши работы» — готовый каталог из реальных фото ателье: посты Instagram @ricca.designs и фото, которые прислал владелец.

Читает tools/media-v3/works-selection.json (что показываем, в каком порядке, подписи) и исходники:
  ricca/content/instagram/*.jpg (+ MANIFEST.json) — работы-посты (id = shortcode, в окне работы — ссылка на пост);
  ricca/content/works-owner/<id>-<N>.jpg          — работы с "src": "owner" (фото владельца, 26 ноября; в Instagram их нет —
                                                    ссылки на пост у них нет). Положить фото туда: tools/media-v3/works-owner-add.py.
У кадра можно задать "crop": {"<N>": [x0, y0, x1, y1]} (пиксели исходника — убрать значок, надпись, лишний край)
и "pos": {"<N>": "30% 50%"} — какую часть кадра держать в карточке 4 : 5 (object-position; по умолчанию центр).
Пишет:
  ricca/img/works/<shortcode>-<N>-1600.webp  — длинная сторона ≤ 1600 (меньше — как есть), q90
  ricca/img/works/<shortcode>-<N>-800.webp   — длинная сторона 800 (меньше — как есть), q86
  ricca/js/works-data.js                      — window.RICCA_WORKS (фото: src, src800, w, h — размер src, w800/h800 — размер src800),
                                                window.RICCA_WORKS_STRIP (лента главной: [id, индекс фото])
Фото проявляются под сайт (tools/media-v3/photo_grade.py): баланс белого по светлым нейтральным участкам, экспозиция, мягкий
контраст, резкость после уменьшения — как при проявке у фотографа; мебель, её цвет и форма не меняются, ничего не дорисовывается.
Метаданные (EXIF/GPS/XMP/ICC) не пишутся.
Повторный запуск безопасен: готовые файлы новее исходника не перекодируются (--force — перекодировать всё),
файлы img/works/*.webp, которых больше нет в выборке, удаляются.

Запуск из корня репозитория: python3 tools/media-v3/works-photos.py [--force]
"""
import glob
import json
import os
import sys

from PIL import Image, ImageCms, ImageOps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from photo_grade import grade, resize_sharp  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SEL = os.path.join(ROOT, 'tools', 'media-v3', 'works-selection.json')
SRC = os.path.join(ROOT, 'ricca', 'content', 'instagram')
OUT = os.path.join(ROOT, 'ricca', 'img', 'works')
OWN = os.path.join(ROOT, 'ricca', 'content', 'works-owner')
DATA = os.path.join(ROOT, 'ricca', 'js', 'works-data.js')
CATS = ('sofas', 'beds', 'armchairs')
CFG = ('sofa', 'corner', 'ushape', 'modular', 'bed', 'armchair', 'pouf')
# рендеры, сток и «возможно ИИ» из content/instagram/CLASSIFY.md — на сайт не идут ни при какой правке выборки
BANNED = {'DGoTpdtOtDM', 'DN3F4QUWH2t', 'C7SXc8-IHIi', 'C06wxe9o444', 'C8K8t80IVNq', 'C8K6aKxoCGl', 'C7oC_fCIjYu',
          'C7RwlDxI-td', 'C7RvX3AIn7W', 'C7M9YDkoRx8', 'C7HjpI7oXln', 'Dc3kV1OsxcA'}
SIZES = ((1600, 90), (800, 86))
FORCE = '--force' in sys.argv


def die(msg):
    print('ОШИБКА:', msg)
    sys.exit(1)


def to_srgb(im):
    """Пиксели — в sRGB (если у исходника есть цветовой профиль), сам профиль в файл не пишем."""
    icc = im.info.get('icc_profile')
    if icc:
        try:
            import io
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            im = ImageCms.profileToProfile(im, src, ImageCms.createProfile('sRGB'), outputMode='RGB')
        except Exception:  # noqa: BLE001 — битый профиль: оставляем пиксели как есть
            pass
    return im.convert('RGB')


def fit(w, h, long_side):
    """Размер под длинную сторону. Мелкие кадры (обложки видео, < 1000 px) для -1600 увеличиваем до 1200, не больше."""
    k = long_side / max(w, h)
    if k > 1:
        k = min(k, 1200 / max(w, h)) if max(w, h) < 1000 else 1.0
    return max(1, round(w * k)), max(1, round(h * k))


def main():
    sel = json.load(open(SEL, encoding='utf-8'))
    # исходников Instagram в git нет (content/instagram — только у того, кто их скачал): без них работы-посты берутся
    # из уже готовых файлов img/works как есть — перекодировать их нечем, но и терять нельзя
    mf = os.path.join(SRC, 'MANIFEST.json')
    manifest = json.load(open(mf, encoding='utf-8')) if os.path.isfile(mf) else []
    by_file = {m['file']: m for m in manifest}
    os.makedirs(OUT, exist_ok=True)
    works, keep, seen = [], set(), set()
    for w in sel['works']:
        sc, cat = w['id'], w['cat']
        if sc in BANNED:
            die(f'{sc}: рендер / сток из CLASSIFY.md — на сайт нельзя')
        if cat not in CATS:
            die(f'{sc}: неизвестная категория {cat}')
        if w.get('cfg') not in CFG:
            die(f'{sc}: неизвестный тип конструктора {w.get("cfg")}')
        if sc in seen:
            die(f'{sc}: повтор')
        seen.add(sc)
        nums = w['photos'][:6]
        if not nums:
            die(f'{sc}: нет фото')
        photos = []
        owner = w.get('src') == 'owner'
        for n in nums:
            if owner:
                src = os.path.join(OWN, f'{sc}-{n}.jpg')
                if not os.path.isfile(src):
                    die(f'{sc}-{n}: исходник не найден в content/works-owner')
            else:
                hits = glob.glob(os.path.join(SRC, f'*-{glob.escape(sc)}-{n}.jpg'))
                hits = [h for h in hits if by_file.get(os.path.basename(h), {}).get('shortcode') == sc]
                ready = all(os.path.isfile(os.path.join(OUT, f'{sc}-{n}-{s}.webp')) for s, _ in SIZES)
                if len(hits) != 1 and not ready:
                    die(f'{sc}-{n}: исходник не найден в content/instagram')
                src = hits[0] if len(hits) == 1 else None      # None — нет исходника, готовые файлы остаются как есть
            box = (w.get('crop') or {}).get(str(n))
            # у кадров с обрезкой и у фото владельца подписи и рамки живут в выборке — её правка тоже повод перекодировать
            newer = 0 if src is None else max(os.path.getmtime(src), os.path.getmtime(SEL) if (owner or box) else 0)
            im = None
            ph = {}
            for long_side, q in SIZES:
                name = f'{sc}-{n}-{long_side}.webp'
                dst = os.path.join(OUT, name)
                keep.add(name)
                if src is not None and (FORCE or not os.path.exists(dst) or os.path.getmtime(dst) < newer):
                    if im is None:
                        im = to_srgb(ImageOps.exif_transpose(Image.open(src)))
                        if box:
                            im = im.crop(tuple(int(v) for v in box))
                        im = grade(im)
                    size = fit(im.width, im.height, long_side)
                    out = resize_sharp(im, size)
                    # без exif / icc / xmp: Pillow пишет в WebP только то, что передано явно
                    out.save(dst, 'WEBP', quality=q, method=6)
                with Image.open(dst) as chk:
                    if chk.info.get('exif') or chk.info.get('icc_profile') or chk.info.get('xmp'):
                        die(f'{name}: в файле остались метаданные')
                    ph[long_side] = chk.size
            pos = (w.get('pos') or {}).get(str(n))
            photos.append({'src': f'img/works/{sc}-{n}-1600.webp', 'src800': f'img/works/{sc}-{n}-800.webp',
                           'w': ph[1600][0], 'h': ph[1600][1], 'w800': ph[800][0], 'h800': ph[800][1], **({'pos': pos} if pos else {})})
        works.append({'id': sc, 'cat': cat, 'title': w['title'], 'sub': w.get('sub', ''), 'cfg': w['cfg'],
                      'photos': photos, **({} if owner else {'ig': f'https://www.instagram.com/p/{sc}/'})})
    # лента на главной: [id, номер кадра] → [id, индекс фото в работе]
    strip = []
    by_id = {w['id']: w for w in sel['works']}
    for sc, n in sel.get('home', {}).get('strip', []):
        if sc not in by_id or n not in by_id[sc]['photos'][:6]:
            die(f'лента главной: {sc}-{n} нет в выборке')
        strip.append([sc, by_id[sc]['photos'].index(n)])
    for f in glob.glob(os.path.join(OUT, '*.webp')):
        if os.path.basename(f) not in keep:
            os.remove(f)
    counts = {c: sum(1 for w in works if w['cat'] == c) for c in CATS}
    with open(DATA, 'w', encoding='utf-8') as fh:
        fh.write('/* RICCA DESIGNS — «Наши работы»: реальные фото работ ателье — посты Instagram @ricca.designs и фото владельца (без ссылки на пост).\n'
                 '   ФАЙЛ СОБИРАЕТСЯ СКРИПТОМ — руками не править: выборка, порядок и подписи — tools/media-v3/works-selection.json,\n'
                 '   затем python3 tools/media-v3/works-photos.py. Фото из content/client-photos — не работы ателье, сюда не идут.\n'
                 f'   Работ: {len(works)} (диваны {counts["sofas"]}, кровати {counts["beds"]}, кресла и пуфы {counts["armchairs"]}). */\n')
        fh.write('window.RICCA_WORKS = [\n')
        fh.write(',\n'.join('  ' + json.dumps(w, ensure_ascii=False, separators=(', ', ': ')) for w in works))
        fh.write('\n];\n')
        fh.write('window.RICCA_WORKS_STRIP = ' + json.dumps(strip, ensure_ascii=False) + ';\n')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in keep)
    print(f'Готово: {len(works)} работ {counts}, {len(keep)} файлов, {total / 1e6:.1f} МБ → ricca/img/works, ricca/js/works-data.js')


if __name__ == '__main__':
    main()
