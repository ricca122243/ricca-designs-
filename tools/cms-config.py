#!/usr/bin/env python3
"""Админка сайта (Decap CMS, ricca.design/admin): пишет ricca/admin/config.yml.
Список «К какой модели» берётся из ricca/js/models-data.js — запускайте после models-data.py, чтобы новые модели каталога
появились в списке. Запуск из корня: python3 tools/cms-config.py
BRANCH — ветка репозитория, из которой Netlify собирает сайт (туда же админка сохраняет правки)."""
import json, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
REPO = 'ricca122243/ricca-designs-'
BRANCH = os.environ.get('CMS_BRANCH', 'claude/kind-sagan-5p5f4a')
src = open(os.path.join(ROOT, 'ricca', 'js', 'models-data.js'), encoding='utf-8').read()
models = json.loads(src[src.index('['):src.rindex(']') + 1])
CATS = [('sofas', 'Диваны'), ('beds', 'Кровати'), ('armchairs', 'Кресла'), ('poufs', 'Пуфы и банкетки')]
q = lambda s: json.dumps(s, ensure_ascii=False)   # строка YAML в кавычках (JSON — подмножество YAML)
opts = [{'label': 'Новая модель', 'value': 'new'}] + sorted(({'label': m['title'], 'value': m['id']} for m in models), key=lambda o: o['label'])

y = f"""# Админка RICCA DESIGNS (Decap CMS). ФАЙЛ СОБИРАЕТ tools/cms-config.py — руками не править.
backend:
  name: github
  repo: {REPO}
  branch: {q(BRANCH)}
  commit_messages:
    update: "Админка: {{{{collection}}}} — {{{{slug}}}}"
    uploadMedia: "Админка: загружено {{{{path}}}}"
    deleteMedia: "Админка: удалено {{{{path}}}}"
local_backend: true
locale: ru
site_url: https://ricca.design
display_url: https://ricca.design
media_folder: ricca/img/uploads
public_folder: /img/uploads
collections:
  - name: site
    label: Сайт
    editor: {{ preview: false }}
    files:
      - name: clients
        label: Нам доверяют
        file: ricca/data/clients.json
        description: Логотипы клиентов на главной. Порядок — перетаскиванием.
        fields:
          - label: Логотипы
            name: clients
            widget: list
            summary: "{{{{fields.name}}}}"
            add_to_top: false
            fields:
              - {{ label: Название, name: name, widget: string, hint: "Как называется компания — видно читателям экрана и поисковикам" }}
              - {{ label: Логотип, name: logo, widget: image, hint: "PNG или SVG с прозрачным фоном, в фирменных цветах" }}
              - {{ label: Размер, name: size, widget: number, value_type: float, default: 1, min: 0.6, max: 2.2, step: 0.05, hint: "1 — обычный. Узкий высокий знак — 1.5–1.8" }}
      - name: models
        label: Фото и новые модели
        file: ricca/data/models-extra.json
        description: Добавьте фото к модели каталога или новую модель. Только настоящие фото, без цен и чужих логотипов.
        fields:
          - label: Записи
            name: models
            widget: list
            summary: "{{{{fields.title}}}} {{{{fields.target}}}}"
            fields:
              - label: К какой модели
                name: target
                widget: select
                default: new
                options:
"""
for o in opts: y += f"                  - {{ label: {q(o['label'])}, value: {q(o['value'])} }}\n"
y += """              - label: Категория (для новой модели)
                name: cat
                widget: select
                required: false
                options:
"""
for v, l in CATS: y += f"                  - {{ label: {q(l)}, value: {q(v)} }}\n"
y += """              - { label: Название (для новой модели), name: title, widget: string, required: false, hint: "Например: Диван Velta" }
              - { label: Подпись (для новой модели), name: sub, widget: string, required: false, hint: "Одна деталь: форма или ткань. Например: Угловой · на ножках" }
              - label: Фото
                name: photos
                widget: list
                summary: "{{fields.src}}"
                fields:
                  - { label: Фото, name: src, widget: image, hint: "Фото с телефона подойдёт — сайт сам уменьшит его" }
                  - { label: Крупный план, name: detail, widget: boolean, default: false, hint: "Включите для фото детали: ткань, шов, ножка" }
              - { label: Показывать на сайте, name: on, widget: boolean, default: true }
"""
open(os.path.join(ROOT, 'ricca', 'admin', 'config.yml'), 'w', encoding='utf-8').write(y)
print('ricca/admin/config.yml:', len(opts) - 1, 'моделей в списке, ветка', BRANCH)
