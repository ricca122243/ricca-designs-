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
    # Обложки проектов необязательны: скрипт сайта проверяет каждую и прячет отсутствующую целиком
    case "$ref" in img/projects/*) echo "предупреждение: обложки пока нет, на сайте скрыта: $ref"; continue;; esac
    echo "нет файла: $ref"; exit 1
  fi
  mkdir -p "$OUT/$(dirname "$ref")"
  cp "$SRC/$ref" "$OUT/$ref"
done
# Ролики производства подставляются скриптом по имени шага: берём всю папку video
mkdir -p "$OUT/video" && cp "$SRC"/video/*.mp4 "$SRC"/video/*.webm "$SRC"/video/*.webp "$OUT/video/" 2>/dev/null || true
# Постеры шагов — тоже по имени
mkdir -p "$OUT/img/process" && cp "$SRC"/img/process/*.webp "$OUT/img/process/"
# Кадры прежней сцены ELUNA (24 кадра × 2 размера) скрипт подставлял по номеру — берём папки, только если на них есть ссылка
if site_code | grep 'img/eluna/seq' >/dev/null; then
  for d in img/eluna/seq img/eluna/seq720; do
    [ -d "$SRC/$d" ] || { echo "нет папки: $d"; exit 1; }
    mkdir -p "$OUT/$d" && cp "$SRC/$d"/*.webp "$OUT/$d/"
  done
else
  echo "кадры сцены ELUNA (img/eluna/seq*) сайтом не используются — в архив не идут"
fi
# Фактуры тканей для блока «Материалы» — по имени ткани из скрипта
mkdir -p "$OUT/img/nera" && cp "$SRC"/img/nera/tex-*.webp "$OUT/img/nera/" 2>/dev/null || true

# Служебные файлы хостинга — те же, что у ELUNA
cp tools/dist-extra/robots.txt tools/dist-extra/.htaccess tools/dist-extra/_headers "$OUT/" 2>/dev/null || true

# Проверка: все локальные ссылки существуют
missing=0
for ref in $( (sed -e 's/<!--.*-->//g' -e '/<!--/,/-->/d' "$OUT"/index.html; cat "$OUT"/css/*.css) | grep -ohE '(img|video|fonts|css|js|vendor)/[A-Za-z0-9_./@-]+\.(webp|png|svg|jpg|woff2|mp4|webm|css|js)' | sed 's#^\.\./##' | sort -u); do
  [ -f "$OUT/$ref" ] || case "$ref" in img/projects/*) ;; *) echo "нет файла: $ref"; missing=1;; esac
done
[ "$missing" -eq 0 ] || exit 1

(cd dist && zip -qr -X RICCA-site.zip RICCA-site)
echo "Готово: $OUT ($(du -sh "$OUT" | cut -f1)), dist/RICCA-site.zip ($(du -h dist/RICCA-site.zip | cut -f1))"
