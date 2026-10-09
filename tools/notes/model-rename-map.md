# Карта переименования моделей (правки заказчика 10 октября)

Внутренний файл, вне папки сайта, на сайт не выкладывается. Прежние id изделий (с названиями с листов фабрики) → новые id →
собственные названия RICCA. Названия вписаны в `window.RICCA_MODEL_NAMES` в ricca/js/catalog-data.js, чтение кириллицей
(для текста WhatsApp: «Диван Svira (Свира)») — в `window.RICCA_MODEL_READINGS`. Модель без названия RICCA показывается как
«№ NN» (номер из нового id). Файлы `img/catalog/p-<прежний id>*.webp` переименованы в `p-<новый id>*.webp`.
Старые ссылки вида #item-<прежний id> больше не открывают окно изделия.

Система названий: 4–5 латинских букв, окончание по категории — диваны -a, кровати -el/-al, кресла -o, стулья -i, столы -is
(хранение -en, категория снята). Чтение: a — а, e — е, i — и, o — о, u — у; l перед согласной и в конце — «ль», перед гласной — «л».

Статус: «на сайте» — название применено; «снято» — изделие снято с сайта 10 октября (название из карты, если есть, на сайте
не используется); «своё» — изделие не с листов фабрики, названия RICCA пока нет (на сайте «№ NN»).

| прежний id | новый id | название RICCA | чтение | статус |
|---|---|---|---|---|
| sofa-dimaro | sofa-01 | Svira | Свира | на сайте |
| sofa-sarnico | sofa-02 | Talna | Тальна | на сайте |
| sofa-monopoli | sofa-03 | Desva | Десва | на сайте |
| sofa-velvet-blue-chaise | sofa-04 | — | — | снято |
| sofa-curve-cream | sofa-05 | — | — | снято |
| sofa-boucle-chaise-white | sofa-06 | — | — | снято |
| sofa-modular-sky | sofa-07 | — | — | снято |
| sofa-wave-olive | sofa-08 | — | — | снято |
| sofa-straight-grey | sofa-09 | — | — | снято |
| sofa-corner-steel-chenille | sofa-10 | — | — | снято |
| sofa-wave-boucle | sofa-11 | — | — | снято |
| sofa-houndstooth | sofa-12 | — | — | снято |
| sofa-corner-olive-velvet | sofa-13 | — | — | снято |
| sofa-round-boucle | sofa-14 | — | — | снято |
| sofa-round-pink | sofa-15 | — | — | своё |
| sofa-lana | sofa-16 | Zerla | Зерла | на сайте |
| sofa-bormio | sofa-17 | Semra | Семра | на сайте |
| sofa-abruzzo | sofa-18 | Nemva | Немва | на сайте |
| sofa-trentino | sofa-19 | Rasma | Расма | на сайте |
| sofa-opera | sofa-20 | Inza | Инза | на сайте |
| sofa-bolzano | sofa-21 | Livsa | Ливса | на сайте |
| sofa-meolo | sofa-22 | Venra | Венра | на сайте |
| sofa-ameno | sofa-23 | Rulva | Рульва | на сайте |
| bed-barolo | bed-01 | Zenal | Зеналь | на сайте |
| bed-palinuro | bed-02 | Irmel | Ирмель | на сайте |
| bed-vittoria | bed-03 | Zovel | Зовель | на сайте |
| bed-malfa | bed-04 | Olsal | Ольсаль | на сайте |
| bed-manarola | bed-05 | Ivel | Ивель | на сайте |
| bed-dalmatian | bed-06 | — | — | снято |
| bed-taupe | bed-07 | — | — | снято |
| bed-rounded-boucle | bed-08 | — | — | снято |
| bed-bari | bed-09 | Usnel | Уснель | на сайте |
| bed-todi | bed-10 | Nisel | Нисель | на сайте |
| bed-fiuggi | bed-11 | Ozrel | Озрель | на сайте |
| bed-fasano | bed-12 | Ombel | Омбель | на сайте |
| bed-arezzo | bed-13 | Tumel | Тумель | на сайте |
| bed-rovigo | bed-14 | Unsal | Унсаль | на сайте |
| bed-maglie | bed-15 | Doval | Доваль | на сайте |
| bed-crone | bed-16 | Isval | Исваль | на сайте |
| bed-rome | bed-17 | Anvel | Анвель | на сайте |
| bed-sava | bed-18 | Mival | Миваль | на сайте |
| bed-parma | bed-19 | Tirel | Тирель | на сайте |
| bed-savona | bed-20 | Razel | Разель | на сайте |
| bed-bergamo | bed-21 | Varel | Варель | на сайте |
| bed-forli | bed-22 | Godal | Годаль | на сайте |
| bed-modena | bed-23 | Zural | Зураль | на сайте |
| armchair-fenis | armchair-01 | Velso | Вельсо | на сайте |
| armchair-round-cream | armchair-02 | — | — | снято |
| armchair-round-sky | armchair-03 | — | — | снято |
| armchair-boucle-legs | armchair-04 | — | — | своё |
| armchairs-round-pair | armchair-05 | — | — | своё |
| pouf-boucle | armchair-06 | — | — | снято |
| armchair-lucca | armchair-07 | Runvo | Рунво | на сайте |
| armchair-brescia | armchair-08 | Lirso | Лирсо | на сайте |
| armchair-leno | armchair-09 | Zirvo | Зирво | на сайте |
| armchair-atrani | armchair-10 | Nimso | Нимсо | на сайте |
| armchair-marsala | armchair-11 | Novro | Новро | на сайте |
| chair-teramo | chair-01 | Senvi | Сенви | на сайте |
| chair-palermo | chair-02 | Avli | Авли | на сайте |
| chair-agordo | chair-03 | Tanvi | Танви | на сайте |
| chair-ortona | chair-04 | Nelsi | Нельси | на сайте |
| chair-pineto | chair-05 | Kosvi | Косви | на сайте |
| chair-volla | chair-06 | Zanli | Занли | на сайте |
| chair-matera | chair-07 | Tilvi | Тильви | на сайте |
| chair-arre | chair-08 | Munsi | Мунси | на сайте |
| table-albino | table-01 | Gulis | Гулис | на сайте |
| table-sanluri | table-02 | Zemis | Земис | снято |
| table-meda | table-03 | Ruzis | Рузис | на сайте |
| table-cardito | table-04 | Tivis | Тивис | на сайте |
| storage-aquino | storage-01 | Zoren | Зорен | снято |
| storage-pesaro | storage-02 | Dolen | Долен | снято |
| storage-lodi | storage-03 | Ulmen | Ульмен | снято |
