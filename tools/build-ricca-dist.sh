#!/usr/bin/env bash
# Сборка готовой папки сайта RICCA DESIGNS для хостинга: dist/RICCA-site + dist/RICCA-site.zip
# Запуск из корня репозитория: bash tools/build-ricca-dist.sh
# Берёт только то, что нужно сайту: index.html, css/, js/, vendor/ (GSAP), шрифты и медиа, на которые есть ссылки,
# плюс папки с кадрами сцены ELUNA и роликами, которые скрипт подставляет по номеру.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=ricca
OUT=dist/RICCA-site
rm -rf "$OUT" dist/RICCA-site.zip && mkdir -p "$OUT"

cp "$SRC/index.html" "$OUT/"
cp -r "$SRC/css" "$SRC/js" "$SRC/vendor" "$OUT/"

# Медиа и шрифты: копируем только файлы, на которые ссылаются html/css/js (включая srcset и data-атрибуты)
# HTML берём без комментариев: в них лежат отключённые блоки (например, редакционный кадр, которого ещё нет)
html_nocomments=$(sed -e 's/<!--.*-->//g' -e '/<!--/,/-->/d' "$SRC/index.html")
refs=$( (printf '%s' "$html_nocomments"; cat "$SRC/css/"*.css "$SRC/js/"*.js) \
         | grep -ohE '(img|video|fonts)/[A-Za-z0-9_./@-]+\.(webp|png|svg|jpg|woff2|mp4|webm|css)' | sed 's#^\.\./##' | sort -u)
for ref in $refs; do
  [ -f "$SRC/$ref" ] || { echo "нет файла: $ref"; exit 1; }
  mkdir -p "$OUT/$(dirname "$ref")"
  cp "$SRC/$ref" "$OUT/$ref"
done
# Ролики производства подставляются скриптом по имени шага: берём всю папку video
mkdir -p "$OUT/video" && cp "$SRC"/video/*.mp4 "$SRC"/video/*.webm "$SRC"/video/*.webp "$OUT/video/" 2>/dev/null || true
# Постеры шагов — тоже по имени
mkdir -p "$OUT/img/process" && cp "$SRC"/img/process/*.webp "$OUT/img/process/"
# Кадры сцены ELUNA (24 кадра × 2 размера) подставляются скриптом по номеру кадра — берём папки целиком
for d in img/eluna/seq img/eluna/seq720; do
  [ -d "$SRC/$d" ] || { echo "нет папки: $d"; exit 1; }
  mkdir -p "$OUT/$d" && cp "$SRC/$d"/*.webp "$OUT/$d/"
done
# Фактуры тканей для блока «Материалы» — по имени ткани из скрипта
mkdir -p "$OUT/img/nera" && cp "$SRC"/img/nera/tex-*.webp "$OUT/img/nera/" 2>/dev/null || true

# Служебные файлы хостинга — те же, что у ELUNA
cp tools/dist-extra/robots.txt tools/dist-extra/.htaccess tools/dist-extra/_headers "$OUT/" 2>/dev/null || true

# Проверка: все локальные ссылки существуют
missing=0
for ref in $( (sed -e 's/<!--.*-->//g' -e '/<!--/,/-->/d' "$OUT"/index.html; cat "$OUT"/css/*.css) | grep -ohE '(img|video|fonts|css|js|vendor)/[A-Za-z0-9_./@-]+\.(webp|png|svg|jpg|woff2|mp4|webm|css|js)' | sed 's#^\.\./##' | sort -u); do
  [ -f "$OUT/$ref" ] || { echo "нет файла: $ref"; missing=1; }
done
[ "$missing" -eq 0 ] || exit 1

(cd dist && zip -qr -X RICCA-site.zip RICCA-site)
echo "Готово: $OUT ($(du -sh "$OUT" | cut -f1)), dist/RICCA-site.zip ($(du -h dist/RICCA-site.zip | cut -f1))"
