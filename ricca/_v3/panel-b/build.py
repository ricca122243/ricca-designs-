#!/usr/bin/env python3
"""Idempotent build step for ricca/_v3/panel-b/index.html:
1) injects the RD monogram path once (RD_PATH_PLACEHOLDER);
2) turns href="wa:KEY" into prefilled wa.me links;
3) applies NBSP typography rules to text nodes only (not attributes, script, style, code).
"""
import re, sys
from urllib.parse import quote

HTML = '/home/user/ricca-designs-/ricca/_v3/panel-b/index.html'
SVG = '/home/user/ricca-designs-/ricca/img/logo/rd-monogram.svg'
WA = '77084802047'
MSG = {
  'general': 'Здравствуйте! Хочу узнать о мебели RICCA на заказ.',
  'question': 'Здравствуйте! У меня вопрос по мебели RICCA.',
  'showroom': 'Здравствуйте! Хочу записаться на визит в шоурум RICCA на Навои, 208/2.',
  'sofas': 'Здравствуйте! Интересует диван на заказ. Пришлите, пожалуйста, подборку и расскажите, что нужно для расчёта.',
  'beds': 'Здравствуйте! Интересует кровать на заказ. Пришлите, пожалуйста, подборку.',
  'armchairs': 'Здравствуйте! Интересует кресло для отдыха. Пришлите, пожалуйста, подборку.',
  'tables': 'Здравствуйте! Хочу подобрать стол или консоль к мягкой мебели. Пришлите, пожалуйста, варианты.',
  'c2026': 'Здравствуйте! Что из коллекции 2026 сейчас стоит в шоуруме?',
  'eluna': 'Здравствуйте! Интересуют матрасы ELUNA.',
  'eluna.air': 'Здравствуйте! Хочу заказать матрас ELUNA. Модель: Eluna Air. Размер: 1600 × 2000 мм. Цена: 125 000 ₸.',
  'eluna.balance': 'Здравствуйте! Хочу заказать матрас ELUNA. Модель: Eluna Balance. Размер: 1600 × 2000 мм. Цена: 220 000 ₸.',
  'eluna.prime': 'Здравствуйте! Хочу заказать матрас ELUNA. Модель: Eluna Prime. Размер: 1600 × 2000 мм. Цена: 280 000 ₸ (без скидки 350 000 ₸, −20 %).',
  'eluna.royal': 'Здравствуйте! Хочу обсудить матрас Eluna Royal под свой размер и проект.',
  'projects': 'Здравствуйте! Хочу обсудить мебель для своей комнаты: {гостиная / спальня / столовая / кабинет / другое}. Размеры и фото пришлю следующим сообщением.',
  'project.living': 'Здравствуйте! Хочу так же: гостиная — угловой диван в букле, два кресла в шенилле, консоль и низкий стол. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
  'project.bedroom': 'Здравствуйте! Хочу так же: спальня — кровать с мягким изголовьем в велюре, матрас Eluna Prime 1800 × 2000, банкетка. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
  'project.dining': 'Здравствуйте! Хочу так же: столовая — мягкие стулья, банкетка, консоль. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
  'project.study': 'Здравствуйте! Хочу так же: кабинет — кресло в коже, двухместный диван в рогожке, консоль. Расскажите, пожалуйста, с чего начать и от чего зависит цена.',
  'project.lobby': 'Здравствуйте! Хочу так же: лобби отеля — модульные диваны, группы кресел, низкие столы. Объект: {название / город}. Расскажите, пожалуйста, как вы работаете с объектами.',
  'project.restaurant': 'Здравствуйте! Хочу так же: ресторан — диваны-банкетки в коже, кресла, столы по размеру зала. Объект: {название / город}. Расскажите, пожалуйста, как вы работаете с объектами.',
  'master': 'Здравствуйте! У меня вопрос к мастеру RICCA.',
}

NB = ' '
SP = ' '  # plain space only (NOT \s — it would match NBSP and break idempotency)

def typo(s):
    s = re.sub(r'(\d)' + SP + r'(?=\d{3}\b)', r'\1' + NB, s)
    s = re.sub(r'(\d)' + SP + r'(₸|мм|см|м²|%|лет|года|год|дней|день|дня|ночей|ночи|ночь|шт|ч|мин)\b', r'\1' + NB + r'\2', s)
    s = re.sub(SP + r'—' + SP, NB + '— ', s)
    s = re.sub(r'(^|[' + SP + r'(«„])(в|во|на|и|с|со|к|ко|о|об|у|за|по|до|от|из|не|но|а|ли|же|бы|г\.|ул\.|ЖК)' + SP, lambda m: m.group(1) + m.group(2) + NB, s, flags=re.I)
    s = s.replace('RICCA DESIGNS', 'RICCA' + NB + 'DESIGNS')
    s = re.sub(r'Eluna' + SP + r'(Air|Balance|Prime|Royal)', r'Eluna' + NB + r'\1', s)
    s = re.sub(r'\+7' + SP + r'\((\d{3})\)' + SP + r'(\d{3})-(\d{2})-(\d{2})', r'+7' + NB + r'(\1)' + NB + r'\2-\3-\4', s)
    s = re.sub(r'(\d{3,4})' + SP + r'×' + SP + r'(\d{3,4})', r'\1' + NB + '×' + NB + r'\2', s)
    s = re.sub(r'(\d{1,2}:\d{2})' + SP + r'до' + SP, r'\1' + NB + 'до' + NB, s)
    s = s.replace('208/2', '208/2')  # no-op, kept for clarity
    return s

src = open(HTML, encoding='utf-8').read()
orig = src

# 1) monogram
if 'RD_PATH_PLACEHOLDER' in src:
    svg = open(SVG, encoding='utf-8').read()
    d = re.search(r'<path[^>]*\sd="([^"]+)"', svg).group(1)
    src = src.replace('RD_PATH_PLACEHOLDER', d)

# 2) wa links
def wa_sub(m):
    key = m.group(1)
    if key not in MSG:
        sys.exit(f'unknown wa key: {key}')
    return 'href="https://wa.me/%s?text=%s"' % (WA, quote(MSG[key], safe=''))
src = re.sub(r'href="wa:([a-z0-9.]+)"', wa_sub, src)

# 3) typography on text nodes
out = []
pos = 0
skip_depth = 0
tag_re = re.compile(r'<[^>]+>', re.S)
for m in tag_re.finditer(src):
    text = src[pos:m.start()]
    if text and skip_depth == 0:
        out.append(typo(text))
    else:
        out.append(text)
    tag = m.group(0)
    out.append(tag)
    low = tag.lower()
    if re.match(r'<(script|style|code|pre)\b', low):
        skip_depth += 1
    elif re.match(r'</(script|style|code|pre)\b', low):
        skip_depth = max(0, skip_depth - 1)
    pos = m.end()
out.append(src[pos:])
src = ''.join(out)

if src != orig:
    open(HTML, 'w', encoding='utf-8').write(src)
    print('written', len(src), 'bytes; nbsp count', src.count(NB))
else:
    print('no change; nbsp count', src.count(NB))
