#!/usr/bin/env python3
"""Модели каталога (фото на белом фоне из js/catalog-data.js → RICCA_CATALOG) в формате работ (js/works-data.js), чтобы экран
категории и окно просмотра были одни и те же: ricca/js/models-data.js → window.RICCA_MODELS. Только диваны, кровати, кресла;
студийные фото (на светлом фоне) — первыми. Размеры файлов читаются с диска. Запуск из корня: python3 tools/media-v3/models-data.py
Нужны numpy, pillow, scipy. Предупреждает о пятнах на фоне и изделии не по центру кадра (исправляет studio-recenter.py)."""
import json, os, re, sys
sys.dont_write_bytecode = True   # общий модуль studio_box.py — без папки __pycache__ в репозитории
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'ricca'))
src = open(os.path.join(ROOT, 'js', 'catalog-data.js'), encoding='utf-8').read()
def block(name):
    m = re.search(r'window\.' + name + r' = (\[|\{)', src); i = m.end() - 1; depth = 0
    for j in range(i, len(src)):
        depth += src[j] in '[{'; depth -= src[j] in ']}'
        if depth == 0: return src[i:j + 1]
def js_to_json(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S); t = re.sub(r'//[^\n]*', '', t)
    t = re.sub(r'([{,]\s*)([A-Za-z_]\w*)\s*:', r'\1"\2":', t); t = re.sub(r"'((?:[^'\\]|\\.)*)'", lambda m: json.dumps(m.group(1)), t)
    t = re.sub(r',(\s*[}\]])', r'\1', t); return json.loads(t)
WARN = []
def box_of(f):
    """[ширина, высота] изделия долей кадра: всё, что отличается от цвета углов (фона) больше чем на 25, кроме мелких пятен вдали
    от изделия (tools/media-v3/studio_box.py) — пылинка на фоне иначе раздувает рамку и сетка не увеличивает модель.
    Пятна и изделие не по центру — в предупреждения: сетка и окно модели увеличивают кадр от центра и срезали бы изделие."""
    import numpy as np
    from studio_box import product_box, off_center, CENTER
    a = np.asarray(Image.open(f).convert('RGB')); H, W = a.shape[:2]; rel = os.path.relpath(f, ROOT)
    bb, specks = product_box(a)
    if bb is None: return [1, 1]
    if specks: WARN.append(f'{rel}: пятна на фоне {", ".join(f"({x}, {y})" for x, y, _ in specks)} px — заретушировать (python3 tools/media-v3/studio-recenter.py)')
    oc = off_center(bb, W, H)
    if oc: WARN.append(f'{rel}: изделие не по центру — центр ({oc[0]:.2f}, {oc[1]:.2f}), норма ({CENTER[0]}, {CENTER[1]}) — перекадрировать (python3 tools/media-v3/studio-recenter.py)')
    return [round(np.float64(bb[2] - bb[0]) / W, 3), round(np.float64(bb[3] - bb[1]) / H, 3)]   # округление numpy, как раньше: box не «дрожит» на 0.001
def bbox_of(f):
    """[x0, y0, x1, y1] — границы изделия долями кадра (та же рамка, что у box_of): окно изделия показывает изделие крупно,
    подрезая только фон кадра (js/site.js layout())."""
    import numpy as np
    from studio_box import product_box
    a = np.asarray(Image.open(f).convert('RGB')); H, W = a.shape[:2]
    bb, _ = product_box(a)
    if bb is None: return None
    return [round(float(bb[0]) / W, 3), round(float(bb[1]) / H, 3), round(float(bb[2]) / W, 3), round(float(bb[3]) / H, 3)]
cat = js_to_json(block('RICCA_CATALOG')); names = js_to_json(block('RICCA_MODEL_NAMES'))
CFG = {'sofas': 'sofa', 'beds': 'bed', 'armchairs': 'armchair', 'poufs': 'pouf'}
out = []
for it in cat:
    if it['category'] not in CFG or it.get('hidden'): continue   # hidden: true — модель снята с витрины (слабые фото или не в стиле)
    ph = sorted(it['photos'], key=lambda p: 0 if (p.get('studio') or p.get('scene')) else 1)   # кадр-сцена остаётся на своём месте (обычно вторым), прочие непредметные — в конец
    photos = []
    for p in ph:
        f = os.path.join(ROOT, p['src']); f6 = os.path.join(ROOT, p.get('src600', p['src']))
        if not os.path.exists(f): continue
        w, h = Image.open(f).size; w6, h6 = Image.open(f6).size if os.path.exists(f6) else (w, h)
        ph_ = {'src': p['src'], 'src800': p.get('src600', p['src']), 'w': w, 'h': h, 'w800': w6, 'h800': h6, 'studio': bool(p.get('studio'))}
        if ph_['studio']: ph_['box'] = box_of(f)   # доля изделия в кадре — карточка подгоняет масштаб (js/site.js fitZoom)
        if ph_['studio']:
            bb = bbox_of(f)
            if bb: ph_['bbox'] = bb   # границы изделия — окно изделия кадрирует по ним (js/site.js layout())
        if p.get('scene'): ph_['scene'] = True   # кадр-сцена (изделие в интерьере ателье) — для карточек «Популярные модели»
        # крупный план: подпись «деталь», вырезка zoom-crops.py или изделие упирается в два края кадра
        bb_ = ph_.get('bbox')
        if 'деталь' in p.get('alt', '') or p.get('zoom') or (bb_ and (bb_[0] <= 0.01) + (bb_[2] >= 0.99) + (bb_[1] <= 0.01) + (bb_[3] >= 0.99) >= 2):
            ph_['detail'] = True
        photos.append(ph_)
    # 15 ноября, владелец: «две фото приближенно, три фото других разных видов» — в окне модели до трёх видов, затем два крупных плана
    photos = [q for q in photos if not q.get('detail')][:3] + [q for q in photos if q.get('detail')][:2]
    if not photos: continue
    cfg = it.get('cfg') or ('corner' if 'corner' in it.get('tags', []) and it['category'] == 'sofas' else CFG[it['category']])   # cfg модели — готовый рецепт для 3D
    name = names.get(it['id'], '')
    out.append({'id': 'm-' + it['id'], 'cat': it['category'], 'title': f"{it.get('type', '')} {name}".strip() if name else f"{it.get('type', '')} № {it['id'].split('-')[-1]}",
                'sub': it.get('subtitle', ''), 'cfg': cfg, 'photos': photos, 'ig': '', 'model': True, **({'fab': it['fab']} if it.get('fab') else {}), **({'no3d': True} if it.get('no3d') else {})})   # fab — ткань цвета с фото для 3D

# ── порядок на витрине и рекомендации — считаются сами (12 ноября: «премиальные вперёд, банальные вниз, всё автоматизировать»)
import numpy as np
def sharpness(path):
    """резкость главного кадра: сколько мелких деталей теряется при уменьшении вдвое (изделие приведено к ширине 940 px, как на телефоне)"""
    from studio_box import product_box
    im = Image.open(path).convert('RGB'); bb, _ = product_box(np.asarray(im))
    if bb is not None and bb[2] - bb[0] > 40 and bb[3] - bb[1] > 40: im = im.crop(tuple(int(v) for v in bb))
    g = im.convert('L'); g = g.resize((940, max(8, round(940 * g.height / g.width))), Image.LANCZOS); a = np.asarray(g).astype(float)
    d = g.resize((470, max(4, g.height // 2)), Image.LANCZOS).resize(g.size, Image.BICUBIC)
    return float(np.abs(a - np.asarray(d).astype(float)).mean())
UP = {'sofa-23', 'sofa-17', 'sofa-01', 'sofa-22', 'sofa-28', 'sofa-39', 'sofa-37', 'sofa-33', 'sofa-31', 'sofa-02', 'bed-27', 'bed-09', 'bed-35', 'armchair-23', 'armchair-07'}   # узнаваемые, «лицо» ателье
DOWN = {'sofa-20'}                                                                                                                                                # простые формы — ниже
PAIRS = {'sofa-23': ['armchair-23'], 'armchair-23': ['sofa-23'], 'sofa-47': ['armchair-22'], 'armchair-22': ['sofa-47'], 'sofa-48': ['bench-02'], 'bed-14': ['bench-03']}   # одна линия: диван и кресло
def score(w):
    ph = w['photos']; q = sharpness(os.path.join(ROOT, ph[0]['src'])); mid = w['id'][2:]
    return (0 if q < 1.3 else 1 if q < 2.5 else 2) * 3 + min(len(ph), 8) * 0.6 + (2 if any(p.get('scene') for p in ph) else 0) + (4 if mid in UP else 0) - (3 if mid in DOWN else 0)
for w in out: w['_s'] = round(score(w), 2)
order = {c: i for i, c in enumerate(CFG)}
out.sort(key=lambda w: (order[w['cat']], -w['_s']))            # сортировка устойчивая: при равном счёте — прежний порядок
pick = {'sofa': [w['id'] for w in out if w['cat'] == 'sofas'], 'bed': [w['id'] for w in out if w['cat'] == 'beds'],
        'armchair': [w['id'] for w in out if w['cat'] == 'armchairs'], 'small': [w['id'] for w in out if w['cat'] == 'poufs']}
PLAN = {'sofas': ('armchair', 'small', 'sofa'), 'beds': ('small', 'armchair', 'bed'), 'armchairs': ('sofa', 'small', 'armchair'), 'poufs': ('sofa', 'armchair', 'small')}
ids = {w['id'] for w in out}
for i, w in enumerate(out):
    rel = ['m-' + x for x in PAIRS.get(w['id'][2:], []) if 'm-' + x in ids]
    for k, kind in enumerate(PLAN[w['cat']]):
        pool = [x for x in pick[kind] if x != w['id'] and x not in rel][:8]     # из лучших восьми — по кругу, чтобы у соседних моделей советы различались
        if pool and len(rel) < 3: rel.append(pool[(i + k * 3) % len(pool)])
    w['rel'] = rel[:3]; del w['_s']
with open(os.path.join(ROOT, 'js', 'models-data.js'), 'w', encoding='utf-8') as fh:
    fh.write('/* RICCA DESIGNS — модели каталога (фото на белом фоне) в формате работ. ФАЙЛ СОБИРАЕТСЯ СКРИПТОМ tools/media-v3/models-data.py\n   из js/catalog-data.js (там названия, подписи, фото) — руками не править. */\nwindow.RICCA_MODELS = [\n')
    fh.write(',\n'.join('  ' + json.dumps(w, ensure_ascii=False, separators=(', ', ': ')) for w in out)); fh.write('\n];\n')
print(len(out), {c: sum(1 for w in out if w['cat'] == c) for c in CFG})
for w_ in WARN: print('ВНИМАНИЕ:', w_, file=sys.stderr)
