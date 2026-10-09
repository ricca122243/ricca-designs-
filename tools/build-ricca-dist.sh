#!/usr/bin/env bash
# Сборка готовой папки сайта RICCA DESIGNS для хостинга: dist/RICCA-site + dist/RICCA-site.zip
# Запуск из корня репозитория: bash tools/build-ricca-dist.sh
# Берёт только то, что нужно сайту: index.html, подключённые стили, js/, шрифты и медиа, на которые есть ссылки, и ролики,
# которые скрипт подставляет по имени. vendor/ (GSAP) и кадры прежней сцены ELUNA (img/eluna/seq*) — только если сайт
# на них ещё ссылается: после 9 октября главы ELUNA нет, и ~3,5 МБ кадров и GSAP в архив не идут.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=ricca
OUT=dist/RICCA-site
rm -rf "$OUT" dist/RICCA-site.zip && mkdir -p "$OUT"

cp "$SRC/index.html" "$OUT/"
# Стили — только подключённые из index.html (в css/ лежат и старые файлы, например fonts-eluna.css прежней главы ELUNA)
css_links=$(grep -ohE 'href="css/[A-Za-z0-9_.-]+\.css"' "$SRC/index.html" | sed -e 's/^href="//' -e 's/"$//' | sort -u)
[ -n "$css_links" ] || { echo "в index.html нет ссылок на css/"; exit 1; }
mkdir -p "$OUT/css" "$OUT/js"
for f in $css_links; do cp "$SRC/$f" "$OUT/$f"; done
cp "$SRC"/js/*.js "$OUT/js/"
# Код сайта без HTML-комментариев: по нему решаем, нужны ли необязательные папки
site_code() { sed -e 's/<!--.*-->//g' -e '/<!--/,/-->/d' "$SRC/index.html"; cat "$OUT"/css/*.css "$OUT"/js/*.js; }
# GSAP + ScrollTrigger — только если на vendor/ ещё есть ссылка
if site_code | grep -E 'vendor/[A-Za-z0-9_.-]+\.js' >/dev/null; then   # без -q: при pipefail ранний выход grep обрывал бы cat (SIGPIPE)
  cp -r "$SRC/vendor" "$OUT/"
else
  echo "vendor/ (GSAP) сайтом не используется — в архив не идёт"
fi

# Медиа и шрифты: копируем только файлы, на которые ссылаются html/css/js (включая srcset и data-атрибуты)
# HTML берём без комментариев: в них лежат отключённые блоки (например, редакционный кадр, которого ещё нет)
html_nocomments=$(sed -e 's/<!--.*-->//g' -e '/<!--/,/-->/d' "$SRC/index.html")
refs=$( (printf '%s' "$html_nocomments"; cat "$OUT/css/"*.css "$OUT/js/"*.js) \
         | grep -ohE '(img|video|fonts)/[A-Za-z0-9_./@-]+\.(webp|png|svg|jpg|woff2|mp4|webm|css)' | sed 's#^\.\./##' | sort -u)
for ref in $refs; do
  if [ ! -f "$SRC/$ref" ]; then
    echo "нет файла: $ref"; exit 1
  fi
  mkdir -p "$OUT/$(dirname "$ref")"
  cp "$SRC/$ref" "$OUT/$ref"
done
# Фото каталога: карточки, галереи и окно «Подробнее» собирает js/site.js из js/catalog-data.js — пути строятся в JS,
# поэтому копируем всю папку img/catalog целиком, со всеми подпапками (img/catalog/sofas/… для новых фото заказчика).
# MANIFEST*.md и README.md там же — внутренние заметки: в архив не идут
mkdir -p "$OUT/img/catalog" && cp -r "$SRC/img/catalog/." "$OUT/img/catalog/" && find "$OUT/img/catalog" -name '*.md' -delete
[ -f "$OUT/js/catalog-data.js" ] || { echo "нет js/catalog-data.js — каталог будет пустым"; exit 1; }
# Ролики (вход hero-*, ELUNA eluna-loop*, ателье production*) js/site.js подставляет по имени: берём папку video целиком.
# Ролики шагов производства (step-NN-*) и их постеры (img/process) — только если сайт на них ещё ссылается: после 10 октября
# ленты шагов нет, и ~3,2 МБ в архив не идут
uses_steps=0
if site_code | grep -E 'step-[0-9]|img/process' >/dev/null; then uses_steps=1; fi
mkdir -p "$OUT/video"
for f in "$SRC"/video/*.mp4 "$SRC"/video/*.webm "$SRC"/video/*.webp; do
  [ -f "$f" ] || continue
  case "$(basename "$f")" in step-[0-9]*) [ "$uses_steps" -eq 1 ] || continue ;; esac
  cp "$f" "$OUT/video/"
done
for need in hero-desktop hero-mobile eluna-loop; do
  ls "$OUT/video/$need".* >/dev/null 2>&1 || { echo "нет ролика: video/$need.*"; exit 1; }
done
if [ "$uses_steps" -eq 1 ]; then
  mkdir -p "$OUT/img/process" && cp "$SRC"/img/process/*.webp "$OUT/img/process/"
else
  echo "ролики шагов (video/step-*) и img/process сайтом не используются — в архив не идут"
fi
# Кадры прежней сцены ELUNA (24 кадра × 2 размера) скрипт подставлял по номеру — берём папки, только если на них есть ссылка
if site_code | grep 'img/eluna/seq' >/dev/null; then
  for d in img/eluna/seq img/eluna/seq720; do
    [ -d "$SRC/$d" ] || { echo "нет папки: $d"; exit 1; }
    mkdir -p "$OUT/$d" && cp "$SRC/$d"/*.webp "$OUT/$d/"
  done
else
  echo "кадры сцены ELUNA (img/eluna/seq*) сайтом не используются — в архив не идут"
fi
# Образцы тканей «Материалов» (img/catalog/tex-*.webp) копируются вместе с img/catalog выше; старые img/nera/tex-* сайтом не используются

# Служебные файлы хостинга — те же, что у ELUNA
cp tools/dist-extra/robots.txt tools/dist-extra/.htaccess tools/dist-extra/_headers "$OUT/" 2>/dev/null || true

# Проверка: все локальные ссылки существуют
missing=0
for ref in $( (sed -e 's/<!--.*-->//g' -e '/<!--/,/-->/d' "$OUT"/index.html; cat "$OUT"/css/*.css) | grep -ohE '(img|video|fonts|css|js|vendor)/[A-Za-z0-9_./@-]+\.(webp|png|svg|jpg|woff2|mp4|webm|css|js)' | sed 's#^\.\./##' | sort -u); do
  [ -f "$OUT/$ref" ] || { echo "нет файла: $ref"; missing=1; }
done
[ "$missing" -eq 0 ] || exit 1
# Внутренние заметки (*.md: MANIFEST каталога и т. п.) в архив не попадают
md_files=$(find "$OUT" -name '*.md')
[ -z "$md_files" ] || { echo "в сборку попали внутренние .md: $md_files"; exit 1; }

(cd dist && zip -qr -X RICCA-site.zip RICCA-site)
echo "Готово: $OUT ($(du -sh "$OUT" | cut -f1)), dist/RICCA-site.zip ($(du -h dist/RICCA-site.zip | cut -f1))"
