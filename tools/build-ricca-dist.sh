#!/usr/bin/env bash
# Сборка готовой папки сайта RICCA DESIGNS для хостинга: dist/RICCA-site + dist/RICCA-site.zip
# Запуск из корня репозитория: bash tools/build-ricca-dist.sh   (DIST=/другая/папка — собрать не в dist/, например для проверки)
# Хостинг получает ТОЛЬКО dist/RICCA-site (или zip). Папку ricca/ целиком не публиковать: в ней внутренние BRIEF.md, content/,
# _directions/, _v3/, src/ — заметки и исходники, которых на сайте быть не должно.
# Берёт только то, что нужно сайту: index.html, подключённые стили, js/, шрифты и медиа, на которые есть ссылки, и ролики,
# которые скрипт подставляет по имени. vendor/ (GSAP) и кадры прежней сцены ELUNA (img/eluna/seq*) — только если сайт
# на них ещё ссылается: после 9 октября главы ELUNA нет, и ~3,5 МБ кадров и GSAP в архив не идут.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=ricca
DIST=${DIST:-dist}
OUT=$DIST/RICCA-site
rm -rf "$OUT" "$DIST/RICCA-site.zip" && mkdir -p "$OUT"

cp "$SRC/index.html" "$OUT/"
cp tools/hosting/*.txt "$OUT/"   # инструкция для заказчика: как залить на хостинг
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
# Конструктор «Соберите свою мебель» (configurator.html): страница, её стили, ES-модули js/cfg/, three.js, model-viewer (только для AR),
# QR-генератор и иконки img/cfg/. Ткани у него те же, что на сайте: js/fabrics-data.js (уже в js/) и образцы img/fabrics (по ссылкам ниже)
cfg_page=0
if [ -f "$SRC/configurator.html" ]; then
  cfg_page=1
  cp "$SRC/configurator.html" "$OUT/"
  for f in $(grep -ohE 'href="css/[A-Za-z0-9_.-]+\.css"' "$SRC/configurator.html" | sed -e 's/^href="//' -e 's/"$//' | sort -u); do cp "$SRC/$f" "$OUT/$f"; done
  mkdir -p "$OUT/js/cfg" && cp "$SRC"/js/cfg/*.js "$OUT/js/cfg/" && rm -f "$OUT"/js/cfg/_*.js   # _*.js — временные стенды проверок
  mkdir -p "$OUT/vendor"
  for v in three model-viewer qrcode; do
    [ -d "$SRC/vendor/$v" ] || { echo "нет папки: vendor/$v"; exit 1; }
    cp -r "$SRC/vendor/$v" "$OUT/vendor/"
  done
  mkdir -p "$OUT/img/cfg" && cp -r "$SRC/img/cfg/." "$OUT/img/cfg/"
fi

# Медиа и шрифты: копируем только файлы, на которые ссылаются html/css/js (включая srcset и data-атрибуты)
# HTML берём без комментариев: в них лежат отключённые блоки (например, редакционный кадр, которого ещё нет)
html_nocomments=$(sed -e 's/<!--.*-->//g' -e '/<!--/,/-->/d' "$SRC/index.html")
# js/catalog-data.js: модели фабрики сайт больше не показывает (отзыв клиента 13 октября) — их фото в архив не идут;
# из этого файла берём ссылки только списка RICCA_WORKS (подтверждённые фото работ; RICCA_WORKS_PENDING — нет)
js_code() { for f in "$OUT"/js/*.js; do
  if [ "$(basename "$f")" = catalog-data.js ]; then awk '/^window\.RICCA_WORKS =/{on=1} on{print} on&&/\];/{exit}' "$f"; else cat "$f"; fi
done; }
refs=$( (printf '%s' "$html_nocomments"; cat "$OUT/css/"*.css; js_code) \
         | grep -ohE '(img|video|fonts)/[A-Za-z0-9_./@-]+\.(webp|png|svg|jpg|woff2|mp4|webm|css)' | sed 's#^\.\./##' | sort -u)
# Крупные планы и фото «в изделии» поставщиков тканей (img/fabrics/official/<коллекция>/hero-*, inuse-*) — НЕ публикуем ни при какой
# ссылке: на части — название поставщика, обложки буклетов, люди и чужие/ИИ-интерьеры (BRIEF: названия поставщиков и чужие фото — нельзя)
no_supplier_extras() { grep -vE '^img/fabrics/official/[^/]+/(hero|inuse)-' || true; }
refs=$(printf '%s\n' $refs | no_supplier_extras)
for ref in $refs; do
  if [ ! -f "$SRC/$ref" ]; then
    echo "нет файла: $ref"; exit 1
  fi
  mkdir -p "$OUT/$(dirname "$ref")"
  cp "$SRC/$ref" "$OUT/$ref"
done
# Медиа и шрифты конструктора: ссылки из configurator.html и js/cfg/*.js (образцы тканей запасной библиотеки, шрифты чертежа, иконка)
if [ "$cfg_page" -eq 1 ]; then
  cfg_refs=$( (sed -e 's/<!--.*-->//g' -e '/<!--/,/-->/d' "$SRC/configurator.html"; cat "$OUT"/js/cfg/*.js) \
         | grep -ohE '(img|fonts)/[A-Za-z0-9_./@-]+\.(webp|png|svg|jpg|woff2)' | sort -u | no_supplier_extras)
  for ref in $cfg_refs; do
    [ -f "$SRC/$ref" ] || { echo "нет файла (конструктор): $ref"; exit 1; }
    mkdir -p "$OUT/$(dirname "$ref")"
    cp "$SRC/$ref" "$OUT/$ref"
  done
fi
# Ткани (js/fabrics-data.js): образцы скопированы по ссылкам выше. Малую фактуру texture-160.webp js/site.js строит из
# texture-600.webp заменой имени — в коде её пути нет, поэтому копируем её рядом с каждой texture-600 (иначе 404 на сайте)
for ref in $refs; do
  case "$ref" in
    img/fabrics/*/texture-600.webp)
      small="${ref%texture-600.webp}texture-160.webp"
      [ -f "$SRC/$small" ] || { echo "нет файла: $small"; exit 1; }
      cp "$SRC/$small" "$OUT/$small" ;;
  esac
done
# Фото каталога: сеток моделей и окна изделия больше нет (отзыв клиента 13 октября) — из img/catalog копируются только
# файлы, на которые есть ссылки выше (постер ELUNA на плитке; прежние ИИ-обложки и рендеры фабрики в архив не идут)
[ -f "$OUT/js/catalog-data.js" ] || { echo "нет js/catalog-data.js — каталог будет пустым"; exit 1; }
# Ролики (вход hero-*, ателье production*) js/site.js подставляет по имени: берём папку video целиком.
# Ролики шагов производства (step-NN-*) и их постеры (img/process) — только если сайт на них ещё ссылается: после 10 октября
# ленты шагов нет, и ~3,2 МБ в архив не идут. Петля прежней панели «Новинка» (eluna-loop*, eluna-poster*) — тоже только по
# ссылке: в v4 её нет (новость — карточка с луной), и ~2 МБ в архив не идут
uses_steps=0
if site_code | grep -E 'step-[0-9]|img/process' >/dev/null; then uses_steps=1; fi
uses_eluna_loop=0
if site_code | grep -E 'eluna-(loop|poster)' >/dev/null; then uses_eluna_loop=1; fi
# Прежний ролик входа из рендеров фабрики-партнёра (video/hero-*) снят 13 октября (вход — свой ролик ателье video/production*):
# в архив — только если сайт снова на него сошлётся
uses_hero_render=0
if site_code | grep -E 'video/hero-|hero-(desktop|mobile)' >/dev/null; then uses_hero_render=1; fi
mkdir -p "$OUT/video"
for f in "$SRC"/video/*.mp4 "$SRC"/video/*.webm "$SRC"/video/*.webp; do
  [ -f "$f" ] || continue
  case "$(basename "$f")" in
    step-[0-9]*) [ "$uses_steps" -eq 1 ] || continue ;;
    eluna-*) [ "$uses_eluna_loop" -eq 1 ] || continue ;;
    hero-*) [ "$uses_hero_render" -eq 1 ] || continue ;;
  esac
  cp "$f" "$OUT/video/"
done
[ "$uses_eluna_loop" -eq 1 ] || echo "петля ELUNA (video/eluna-loop*, eluna-poster*) сайтом не используется — в архив не идёт"
[ "$uses_hero_render" -eq 1 ] || echo "ролик входа из рендеров фабрики (video/hero-*) сайтом не используется — в архив не идёт"
for need in production production-phone; do
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
# robots.txt и карта сайта — свои, для домена ricca.design (заменяют общий robots.txt)
cp tools/ricca-extra/robots.txt tools/ricca-extra/sitemap.xml "$OUT/"
cp tools/ricca-extra/_headers "$OUT/"   # свои правила кэша вместо общих ELUNA (там стили хранились 7 дней)
# Файл подтверждения Google Search Console — не удалять, иначе подтверждение слетит
cp tools/ricca-extra/google731f803f39486a1a.html "$OUT/"

# Проверка: все локальные ссылки существуют
missing=0
for ref in $( (sed -e 's/<!--.*-->//g' -e '/<!--/,/-->/d' "$OUT"/index.html; cat "$OUT"/css/*.css) | grep -ohE '(img|video|fonts|css|js|vendor)/[A-Za-z0-9_./@-]+\.(webp|png|svg|jpg|woff2|mp4|webm|css|js)' | sed 's#^\.\./##' | sort -u); do
  [ -f "$OUT/$ref" ] || { echo "нет файла: $ref"; missing=1; }
done
if [ "$cfg_page" -eq 1 ]; then
  for ref in $(sed -e 's/<!--.*-->//g' -e '/<!--/,/-->/d' "$OUT"/configurator.html | grep -ohE '(img|fonts|css|js|vendor)/[A-Za-z0-9_./@-]+\.(webp|png|svg|jpg|woff2|css|js)' | sort -u); do
    [ -f "$OUT/$ref" ] || { echo "нет файла (конструктор): $ref"; missing=1; }
  done
fi
[ "$missing" -eq 0 ] || exit 1
# Внутренние заметки (*.md: MANIFEST каталога и т. п.) в архив не попадают
md_files=$(find "$OUT" -name '*.md')
[ -z "$md_files" ] || { echo "в сборку попали внутренние .md: $md_files"; exit 1; }
# Фото поставщиков с их названиями / людьми / чужими интерьерами в сборку попасть не должны
extras=$(find "$OUT/img/fabrics" -type f \( -name 'hero-*' -o -name 'inuse-*' \) 2>/dev/null || true)
[ -z "$extras" ] || { echo "в сборку попали фото поставщиков hero-/inuse-: $extras"; exit 1; }

# Метка версии ?v=… у стилей и скриптов: меняется вместе с их содержимым, поэтому браузер, сохранивший прежние
# файлы, после обновления сайта точно возьмёт новые (иначе — новая страница со старыми стилями)
ver=$(cat "$OUT"/css/*.css "$OUT"/js/*.js "$OUT"/js/cfg/*.js 2>/dev/null | md5sum | cut -c1-10)
for page in "$OUT"/index.html "$OUT"/configurator.html; do
  [ -f "$page" ] || continue
  sed -i -E "s#((href|src)=\"(css|js)/[A-Za-z0-9_./-]+\.(css|js))\"#\1?v=$ver\"#g" "$page"
done

(cd "$DIST" && zip -qr -X RICCA-site.zip RICCA-site)
echo "Готово: $OUT ($(du -sh "$OUT" | cut -f1)), $DIST/RICCA-site.zip ($(du -h "$DIST/RICCA-site.zip" | cut -f1)). Загружать только эту папку (или zip), не ricca/"
