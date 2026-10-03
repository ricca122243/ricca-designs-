#!/usr/bin/env bash
# Сборка готовой папки сайта для хостинга: dist/ELUNA-site + dist/ELUNA-site.zip
# Запуск из корня репозитория: bash tools/build-dist.sh
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=dist/ELUNA-site
rm -rf dist && mkdir -p "$OUT"

cp index.html privacy.html legal.html "$OUT/"
cp -r css js vendor fonts "$OUT/"
mkdir -p "$OUT/img/kz"
cp img/mark.png img/coir.webp img/cotton.webp img/gel.webp img/latex.webp \
   img/moon-hd.webp img/moon-hd-1280.webp \
   img/moon-map-1024.webp img/moon-map-2048.webp img/moon-map-4096.webp "$OUT/img/"
cp img/kz/kz-map-2080.webp img/kz/kz-map-1280.webp "$OUT/img/kz/"
cp -r img/seq img/seq2560 img/seq720 "$OUT/img/"
# служебные файлы хостинга и инструкция
cp tools/dist-extra/robots.txt tools/dist-extra/.htaccess tools/dist-extra/_headers tools/dist-extra/404.html "tools/dist-extra/ЗАПУСК.html" "$OUT/"

# проверка: все локальные ссылки на файлы существуют
missing=0
for ref in $(grep -ohE '(img|css|js|fonts|vendor)/[A-Za-z0-9_./-]+\.(webp|png|css|js|woff2|ttf)' "$OUT"/*.html "$OUT"/css/*.css | sort -u); do
  [ -f "$OUT/$ref" ] || { echo "нет файла: $ref"; missing=1; }
done
for d in seq seq2560 seq720; do [ "$(ls "$OUT/img/$d" | wc -l)" -eq 24 ] || { echo "в img/$d не 24 кадра"; missing=1; }; done
[ "$missing" -eq 0 ] || exit 1

(cd dist && zip -qr -X ELUNA-site.zip ELUNA-site)
echo "Готово: $OUT ($(du -sh "$OUT" | cut -f1)), dist/ELUNA-site.zip ($(du -h dist/ELUNA-site.zip | cut -f1))"
