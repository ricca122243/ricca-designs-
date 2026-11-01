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
cat = js_to_json(block('RICCA_CATALOG')); names = js_to_json(block('RICCA_MODEL_NAMES'))
CFG = {'sofas': 'sofa', 'beds': 'bed', 'armchairs': 'armchair'}
out = []
for it in cat:
    if it['category'] not in CFG: continue
    ph = sorted(it['photos'], key=lambda p: 0 if p.get('studio') else 1)
    photos = []
    for p in ph:
        f = os.path.join(ROOT, p['src']); f6 = os.path.join(ROOT, p.get('src600', p['src']))
        if not os.path.exists(f): continue
        w, h = Image.open(f).size; w6, h6 = Image.open(f6).size if os.path.exists(f6) else (w, h)
        ph_ = {'src': p['src'], 'src800': p.get('src600', p['src']), 'w': w, 'h': h, 'w800': w6, 'h800': h6, 'studio': bool(p.get('studio'))}
        if ph_['studio']: ph_['box'] = box_of(f)   # доля изделия в кадре — карточка подгоняет масштаб (js/site.js fitZoom)
        photos.append(ph_)
    if not photos: continue
    cfg = it.get('cfg') or ('corner' if 'corner' in it.get('tags', []) and it['category'] == 'sofas' else CFG[it['category']])   # cfg модели — готовый рецепт для 3D
    name = names.get(it['id'], '')
    out.append({'id': 'm-' + it['id'], 'cat': it['category'], 'title': f"{it.get('type', '')} {name}".strip() if name else f"{it.get('type', '')} № {it['id'].split('-')[-1]}",
                'sub': it.get('subtitle', ''), 'cfg': cfg, 'photos': photos, 'ig': '', 'model': True})
with open(os.path.join(ROOT, 'js', 'models-data.js'), 'w', encoding='utf-8') as fh:
    fh.write('/* RICCA DESIGNS — модели каталога (фото на белом фоне) в формате работ. ФАЙЛ СОБИРАЕТСЯ СКРИПТОМ tools/media-v3/models-data.py\n   из js/catalog-data.js (там названия, подписи, фото) — руками не править. */\nwindow.RICCA_MODELS = [\n')
    fh.write(',\n'.join('  ' + json.dumps(w, ensure_ascii=False, separators=(', ', ': ')) for w in out)); fh.write('\n];\n')
print(len(out), {c: sum(1 for w in out if w['cat'] == c) for c in CFG})
for w_ in WARN: print('ВНИМАНИЕ:', w_, file=sys.stderr)
