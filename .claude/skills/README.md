# Скиллы Claude для Ricca Designs

Скиллы из этой папки Claude Code подключает автоматически в любой сессии на этом репозитории.

| Скилл | Для чего |
|---|---|
| `frontend-design` | Главный скилл для UX/UI: выбор визуального направления, типографики, сетки, без шаблонного «AI-вида». Сайты, лендинги, секции. |
| `theme-factory` | 10 готовых тем (цвета + шрифты) и генерация новых — для лендингов, презентаций, документов. |
| `canvas-design` | Статичный визуал в PNG/PDF: постеры, обложки, баннеры. Внутри набор шрифтов. |
| `web-artifacts-builder` | Сложные интерактивные прототипы на React + Tailwind + shadcn/ui, собранные в один HTML. |
| `doc-coauthoring` | Совместное написание ТЗ, брифов, предложений клиентам. |
| `deep-research` | Исследование рынка и конкурентов с итоговым отчётом. |

Не перенесены (уже есть в Claude по умолчанию или работают только в claude.ai): `docx`, `pdf`, `pptx`, `xlsx`, `skill-creator`, `file-reading`, `pdf-reading`, `setup-writing-style`.

## UI/UX Pro Max

Источник: [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (коммит `477bcb2`, лицензия MIT).

| Скилл | Для чего |
|---|---|
| `ui-ux-pro-max` | База знаний по UI/UX: 79 стилей, 192 палитры, 74 шрифтовые пары, 119 UX-правил. Подбирает дизайн-систему под нишу, например `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "premium furniture" --design-system -p "Ricca"`. |
| `design` | Логотипы, фирменный стиль (CIP), иконки, баннеры, картинки для соцсетей. Генерация логотипов требует API-ключ (Gemini и др.). |
| `design-system` | Дизайн-токены (primitive → semantic → component), CSS-переменные, спецификации компонентов. |
| `brand` | Голос бренда, визуальная идентичность, гайдлайны. |
| `ui-styling` | shadcn/ui + Tailwind, тёмная тема, адаптивная вёрстка. |
| `banner-design` | Баннеры для соцсетей, рекламы, хиро-блоков сайта. |
| `slides` | HTML-презентации с графиками Chart.js. |

Пути `${CLAUDE_PLUGIN_ROOT}/.claude/skills/...` в `ui-ux-pro-max/SKILL.md` заменены на `.claude/skills/...`, чтобы скрипты запускались из корня репозитория.
