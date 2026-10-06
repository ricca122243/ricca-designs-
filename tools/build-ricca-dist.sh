#!/usr/bin/env bash
# Сборка готовой папки сайта RICCA DESIGNS для хостинга: dist/RICCA-site + dist/RICCA-site.zip
# Запуск из корня репозитория: bash tools/build-ricca-dist.sh
# Берёт только то, что нужно сайту: index.html, css/, js/, шрифты и медиа, на которые есть ссылки.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=ricca
OUT=dist/RICCA-site
rm -rf "$OUT" dist/RICCA-site.zip && mkdir -p "$OUT"

cp "$SRC/index.html" "$OUT/"
cp -r "$SRC/css" "$SRC/js" "$OUT/"

# Медиа и шрифты: копируем только файлы, на которые ссылаются html/css/js (включая srcset и data-атрибуты)
refs=$(grep -ohE '(img|video|fonts)/[A-Za-z0-9_./@-]+\.(webp|png|svg|jpg|woff2|mp4|webm|css)' \
         "$SRC/index.html" "$SRC/css/"*.css "$SRC/js/"*.js | sed 's#^\.\./##' | sort -u)
for ref in $refs; do
  [ -f "$SRC/$ref" ] || { echo "нет файла: $ref"; exit 1; }
  mkdir -p "$OUT/$(dirname "$ref")"
  cp "$SRC/$ref" "$OUT/$ref"
done
# Ролики производства подставляются скриптом по имени шага: берём всю папку video
mkdir -p "$OUT/video" && cp "$SRC"/video/*.mp4 "$SRC"/video/*.webm "$SRC"/video/*.webp "$OUT/video/" 2>/dev/null || true
# Постеры шагов — тоже по имени
mkdir -p "$OUT/img/process" && cp "$SRC"/img/process/*.webp "$OUT/img/process/"

# Служебные файлы хостинга — те же, что у ELUNA
cp tools/dist-extra/robots.txt tools/dist-extra/.htaccess tools/dist-extra/_headers "$OUT/" 2>/dev/null || true

# Проверка: все локальные ссылки существуют
missing=0
for ref in $(grep -ohE '(img|video|fonts|css|js)/[A-Za-z0-9_./@-]+\.(webp|png|svg|jpg|woff2|mp4|webm|css|js)' "$OUT"/index.html "$OUT"/css/*.css | sed 's#^\.\./##' | sort -u); do
  [ -f "$OUT/$ref" ] || { echo "нет файла: $ref"; missing=1; }
done
[ "$missing" -eq 0 ] || exit 1

(cd dist && zip -qr -X RICCA-site.zip RICCA-site)
echo "Готово: $OUT ($(du -sh "$OUT" | cut -f1)), dist/RICCA-site.zip ($(du -h dist/RICCA-site.zip | cut -f1))"
