/*
 * ФОТО — ТОЛЬКО ОФИЦИАЛЬНЫЕ, С САЙТОВ ПОСТАВЩИКОВ (img/fabrics/official/<коллекция>/; собирает tools/media-v3/build-fabrics-data.py).
 * Крупные планы и фото «в изделии» поставщика сюда не выводятся (на части — названия поставщика, люди, чужие интерьеры).
 * Код цвета (code) — как у поставщика.
 *
 * RICCA DESIGNS — ткани для раздела «Ткани» (только самые ходовые коллекции). Тот же файл читает конструктор 3D.
 *
 * Как показывается на сайте (js/site.js, экран «Ткани»): у каждой коллекции ОДНО большое квадратное фото выбранного цвета
 * (src900; если его нет — src450) и круглые кнопки цветов (заливка — hex). Номер цвета N — его место в списке colours
 * (первый = 1): на нём держатся ссылки #fabric-<id>-<N>, строки корзины и конструктор (configurator.html#f=<id>:<N>).
 *
 * Как устроено:
 *   types        — типы ткани (Велюр, Букле, Шенилл, Замша, Экокожа), в том порядке, в каком они идут на сайте.
 *   collections  — коллекции внутри типа. У каждой:
 *     id       — короткое латинское имя (без пробелов), title — название коллекции,
 *     kind     — одна строка о материале («микровелюр», «букле»…),
 *     facts    — 2–3 коротких факта (до 8 слов), ТОЛЬКО то, что напечатано на карточке образца,
 *     texture  — простое фото ткани без надписей (сейчас — первый цвет коллекции) или null; на экране «Ткани» не показывается,
 *     colours  — цвета: name (простое русское название, без повторов в коллекции), finish — поверхность (только у экокожи),
 *                src900 — ГЛАВНОЕ фото, квадрат 900 × 900 (большое фото коллекции),
 *                src450 — квадрат 450 × 450 (запасное большое фото; образец в конструкторе),
 *                src240 — квадрат 240 × 240 (миниатюра в корзине и в конструкторе),
 *                strip — полоса (если есть; сайтом не используется),
 *                hex — цвет кнопки и подложки, пока грузится фото.
 *                code — (необязательно) код цвета поставщика, например «12» или «Milk 02»: виден рядом с названием цвета,
 *                       идёт в текст WhatsApp и в корзину. Название поставщика сюда не пишем.
 *
 * Как заменить фото (например, на качественные снимки поставщика) — без правки кода:
 *   1. Сделайте из снимка квадрат (обрезка по центру, ткань без рамок и подписей) и сохраните три размера .webp:
 *      1400 × 1400 (качество 90 — максимум, не уменьшать), 450 × 450 и 240 × 240 — например, img/fabrics/official/<коллекция>/<код>-1200.webp, …-600.webp, …-160.webp (их делает tools/media-v3/official-fabrics.py).
 *      Можно положить файлы поверх старых с теми же именами — тогда этот файл менять не нужно вовсе.
 *   2. Если имена новые — у нужного цвета поменяйте src900, src450 и src240 (больше ничего).
 *   3. Если цвет на новом фото заметно другой — поправьте hex (средний цвет фото, например «#d8d2c6»).
 *   4. Не меняйте порядок цветов и не вставляйте цвет в середину: N в старых ссылках и в корзинах покупателей укажет
 *      на другой цвет. Новый цвет — в конец списка коллекции.
 *   5. Обновите страницу и пролистайте цвета кнопками — каждое фото должно открыться.
 *
 * Как добавить коллекцию:
 *   1. Положите квадратные образцы в img/fabrics/<тип>/<коллекция>/: 01-molochnyy.webp (900×900),
 *      01-molochnyy-450.webp (450×450) и 01-molochnyy-240.webp (240×240).
 *   2. Скопируйте блок любой коллекции ниже (от «{» до «}»), вставьте в нужный тип и поменяйте
 *      id, title, kind, facts, texture и список colours (пути к файлам, названия и hex цветов).
 *   3. Цвета — в порядке карточки поставщика (или светлые → тёмные → цветные). Кнопки переносятся в несколько рядов, так что
 *      полный список коллекции помещается. По умолчанию показывается первый цвет, у которого есть src900.
 *   4. Названия поставщиков и фабрики на сайт не пишем; рекламные слова с карточки — тоже не пишем,
 *      только цифры и проверяемые факты (циклы, плотность, уход).
 *   5. Сохраните файл и обновите страницу — проверьте, что все фото открываются.
 * Убрать коллекцию — удалите её блок целиком (вместе с запятой). Убрать цвет из середины — лучше не надо (см. п. 4 выше).
 */
window.RICCA_FABRIC_LIBRARY = {
  "types": [
    {
      "id": "velur",
      "title": "Велюр",
      "collections": [
        {
          "id": "ricca-velour",
          "title": "RICCA VELOUR",
          "kind": "велюр",
          "facts": [],
          "texture": "img/fabrics/ricca-velour/01-1200.webp",
          "colours": [
            {
              "name": "Пыльная роза",
              "src900": "img/fabrics/ricca-velour/01-1200.webp",
              "src450": "img/fabrics/ricca-velour/01-600.webp",
              "src240": "img/fabrics/ricca-velour/01-160.webp",
              "hex": "#996160"
            },
            {
              "name": "Морская волна",
              "src900": "img/fabrics/ricca-velour/02-1200.webp",
              "src450": "img/fabrics/ricca-velour/02-600.webp",
              "src240": "img/fabrics/ricca-velour/02-160.webp",
              "hex": "#597781"
            },
            {"name": "Чёрный", "src900": "img/fabrics/ricca-velour/03-1200.webp", "src450": "img/fabrics/ricca-velour/03-600.webp", "src240": "img/fabrics/ricca-velour/03-160.webp", "hex": "#212322"}
          ]
        },
        {
          "id": "alba",
          "title": "ALBA",
          "kind": "микровелюр",
          "facts": [
            "90 000 циклов",
            "480 г/м.п.",
            "ширина 140 см"
          ],
          "texture": "img/fabrics/official/alba/01-1200.webp",
          "colours": [
            {
              "name": "№ 01",
              "src900": "img/fabrics/official/alba/01-1200.webp",
              "src450": "img/fabrics/official/alba/01-600.webp",
              "src240": "img/fabrics/official/alba/01-160.webp",
              "hex": "#b9b2a6"
            },
            {
              "name": "№ 02",
              "src900": "img/fabrics/official/alba/02-1200.webp",
              "src450": "img/fabrics/official/alba/02-600.webp",
              "src240": "img/fabrics/official/alba/02-160.webp",
              "hex": "#ada291"
            },
            {
              "name": "№ 03",
              "src900": "img/fabrics/official/alba/03-1200.webp",
              "src450": "img/fabrics/official/alba/03-600.webp",
              "src240": "img/fabrics/official/alba/03-160.webp",
              "hex": "#a9a49c"
            },
            {
              "name": "№ 04",
              "src900": "img/fabrics/official/alba/04-1200.webp",
              "src450": "img/fabrics/official/alba/04-600.webp",
              "src240": "img/fabrics/official/alba/04-160.webp",
              "hex": "#868687"
            },
            {
              "name": "№ 05",
              "src900": "img/fabrics/official/alba/05-1200.webp",
              "src450": "img/fabrics/official/alba/05-600.webp",
              "src240": "img/fabrics/official/alba/05-160.webp",
              "hex": "#6b6c6e"
            },
            {
              "name": "№ 06",
              "src900": "img/fabrics/official/alba/06-1200.webp",
              "src450": "img/fabrics/official/alba/06-600.webp",
              "src240": "img/fabrics/official/alba/06-160.webp",
              "hex": "#3f3f3f"
            },
            {
              "name": "№ 07",
              "src900": "img/fabrics/official/alba/07-1200.webp",
              "src450": "img/fabrics/official/alba/07-600.webp",
              "src240": "img/fabrics/official/alba/07-160.webp",
              "hex": "#493c33"
            },
            {
              "name": "№ 08",
              "src900": "img/fabrics/official/alba/08-1200.webp",
              "src450": "img/fabrics/official/alba/08-600.webp",
              "src240": "img/fabrics/official/alba/08-160.webp",
              "hex": "#413a36"
            },
            {
              "name": "№ 09",
              "src900": "img/fabrics/official/alba/09-1200.webp",
              "src450": "img/fabrics/official/alba/09-600.webp",
              "src240": "img/fabrics/official/alba/09-160.webp",
              "hex": "#9b792e"
            },
            {
              "name": "№ 10",
              "src900": "img/fabrics/official/alba/10-1200.webp",
              "src450": "img/fabrics/official/alba/10-600.webp",
              "src240": "img/fabrics/official/alba/10-160.webp",
              "hex": "#284949"
            },
            {
              "name": "№ 11",
              "src900": "img/fabrics/official/alba/11-1200.webp",
              "src450": "img/fabrics/official/alba/11-600.webp",
              "src240": "img/fabrics/official/alba/11-160.webp",
              "hex": "#27454b"
            },
            {
              "name": "№ 12",
              "src900": "img/fabrics/official/alba/12-1200.webp",
              "src450": "img/fabrics/official/alba/12-600.webp",
              "src240": "img/fabrics/official/alba/12-160.webp",
              "hex": "#dad4c7"
            },
            {
              "name": "№ 13",
              "src900": "img/fabrics/official/alba/13-1200.webp",
              "src450": "img/fabrics/official/alba/13-600.webp",
              "src240": "img/fabrics/official/alba/13-160.webp",
              "hex": "#d0c8b6"
            },
            {
              "name": "№ 14",
              "src900": "img/fabrics/official/alba/14-1200.webp",
              "src450": "img/fabrics/official/alba/14-600.webp",
              "src240": "img/fabrics/official/alba/14-160.webp",
              "hex": "#d4bfa5"
            },
            {
              "name": "№ 15",
              "src900": "img/fabrics/official/alba/15-1200.webp",
              "src450": "img/fabrics/official/alba/15-600.webp",
              "src240": "img/fabrics/official/alba/15-160.webp",
              "hex": "#c0af98"
            },
            {
              "name": "№ 16",
              "src900": "img/fabrics/official/alba/16-1200.webp",
              "src450": "img/fabrics/official/alba/16-600.webp",
              "src240": "img/fabrics/official/alba/16-160.webp",
              "hex": "#8b8671"
            },
            {
              "name": "№ 17",
              "src900": "img/fabrics/official/alba/17-1200.webp",
              "src450": "img/fabrics/official/alba/17-600.webp",
              "src240": "img/fabrics/official/alba/17-160.webp",
              "hex": "#474c3d"
            },
            {
              "name": "№ 18",
              "src900": "img/fabrics/official/alba/18-1200.webp",
              "src450": "img/fabrics/official/alba/18-600.webp",
              "src240": "img/fabrics/official/alba/18-160.webp",
              "hex": "#855237"
            },
            {
              "name": "№ 19",
              "src900": "img/fabrics/official/alba/19-1200.webp",
              "src450": "img/fabrics/official/alba/19-600.webp",
              "src240": "img/fabrics/official/alba/19-160.webp",
              "hex": "#693831"
            },
            {
              "name": "№ 20",
              "src900": "img/fabrics/official/alba/20-1200.webp",
              "src450": "img/fabrics/official/alba/20-600.webp",
              "src240": "img/fabrics/official/alba/20-160.webp",
              "hex": "#76282d"
            },
            {
              "name": "№ 21",
              "src900": "img/fabrics/official/alba/21-1200.webp",
              "src450": "img/fabrics/official/alba/21-600.webp",
              "src240": "img/fabrics/official/alba/21-160.webp",
              "hex": "#a27572"
            },
            {
              "name": "№ 22",
              "src900": "img/fabrics/official/alba/22-1200.webp",
              "src450": "img/fabrics/official/alba/22-600.webp",
              "src240": "img/fabrics/official/alba/22-160.webp",
              "hex": "#6f5c53"
            }
          ]
        },
        {
          "id": "torrens-plain",
          "title": "TORRENS PLAIN",
          "kind": "микровелюр",
          "facts": [
            "190 000 циклов",
            "ширина 140 см"
          ],
          "texture": "img/fabrics/official/torrens-plain/01-1200.webp",
          "colours": [
            {
              "name": "№ 01",
              "src900": "img/fabrics/official/torrens-plain/01-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/01-600.webp",
              "src240": "img/fabrics/official/torrens-plain/01-160.webp",
              "hex": "#dfdbd1"
            },
            {
              "name": "№ 02",
              "src900": "img/fabrics/official/torrens-plain/02-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/02-600.webp",
              "src240": "img/fabrics/official/torrens-plain/02-160.webp",
              "hex": "#bfb9af"
            },
            {
              "name": "№ 03",
              "src900": "img/fabrics/official/torrens-plain/03-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/03-600.webp",
              "src240": "img/fabrics/official/torrens-plain/03-160.webp",
              "hex": "#b7afa2"
            },
            {
              "name": "№ 04",
              "src900": "img/fabrics/official/torrens-plain/04-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/04-600.webp",
              "src240": "img/fabrics/official/torrens-plain/04-160.webp",
              "hex": "#93887c"
            },
            {
              "name": "№ 05",
              "src900": "img/fabrics/official/torrens-plain/05-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/05-600.webp",
              "src240": "img/fabrics/official/torrens-plain/05-160.webp",
              "hex": "#7b6e60"
            },
            {
              "name": "№ 06",
              "src900": "img/fabrics/official/torrens-plain/06-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/06-600.webp",
              "src240": "img/fabrics/official/torrens-plain/06-160.webp",
              "hex": "#654743"
            },
            {
              "name": "№ 07",
              "src900": "img/fabrics/official/torrens-plain/07-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/07-600.webp",
              "src240": "img/fabrics/official/torrens-plain/07-160.webp",
              "hex": "#5a5948"
            },
            {
              "name": "№ 08",
              "src900": "img/fabrics/official/torrens-plain/08-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/08-600.webp",
              "src240": "img/fabrics/official/torrens-plain/08-160.webp",
              "hex": "#868888"
            },
            {
              "name": "№ 09",
              "src900": "img/fabrics/official/torrens-plain/09-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/09-600.webp",
              "src240": "img/fabrics/official/torrens-plain/09-160.webp",
              "hex": "#afaba4"
            },
            {
              "name": "№ 10",
              "src900": "img/fabrics/official/torrens-plain/10-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/10-600.webp",
              "src240": "img/fabrics/official/torrens-plain/10-160.webp",
              "hex": "#aea7a1"
            },
            {
              "name": "№ 11",
              "src900": "img/fabrics/official/torrens-plain/11-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/11-600.webp",
              "src240": "img/fabrics/official/torrens-plain/11-160.webp",
              "hex": "#656360"
            },
            {
              "name": "№ 12",
              "src900": "img/fabrics/official/torrens-plain/12-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/12-600.webp",
              "src240": "img/fabrics/official/torrens-plain/12-160.webp",
              "hex": "#625b58"
            },
            {
              "name": "№ 13",
              "src900": "img/fabrics/official/torrens-plain/13-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/13-600.webp",
              "src240": "img/fabrics/official/torrens-plain/13-160.webp",
              "hex": "#474b50"
            },
            {
              "name": "№ 14",
              "src900": "img/fabrics/official/torrens-plain/14-1200.webp",
              "src450": "img/fabrics/official/torrens-plain/14-600.webp",
              "src240": "img/fabrics/official/torrens-plain/14-160.webp",
              "hex": "#7b8f9d"
            }
          ]
        },
        {
          "id": "torrens",
          "title": "TORRENS",
          "kind": "микровелюр с муаром",
          "facts": [
            "190 000 циклов",
            "ширина 140 см"
          ],
          "texture": "img/fabrics/official/torrens/01-1200.webp",
          "colours": [
            {
              "name": "№ 01",
              "src900": "img/fabrics/official/torrens/01-1200.webp",
              "src450": "img/fabrics/official/torrens/01-600.webp",
              "src240": "img/fabrics/official/torrens/01-160.webp",
              "hex": "#e0ddd6"
            },
            {
              "name": "№ 02",
              "src900": "img/fabrics/official/torrens/02-1200.webp",
              "src450": "img/fabrics/official/torrens/02-600.webp",
              "src240": "img/fabrics/official/torrens/02-160.webp",
              "hex": "#c6c0b5"
            },
            {
              "name": "№ 03",
              "src900": "img/fabrics/official/torrens/03-1200.webp",
              "src450": "img/fabrics/official/torrens/03-600.webp",
              "src240": "img/fabrics/official/torrens/03-160.webp",
              "hex": "#ada598"
            },
            {
              "name": "№ 04",
              "src900": "img/fabrics/official/torrens/04-1200.webp",
              "src450": "img/fabrics/official/torrens/04-600.webp",
              "src240": "img/fabrics/official/torrens/04-160.webp",
              "hex": "#8e8377"
            },
            {
              "name": "№ 05",
              "src900": "img/fabrics/official/torrens/05-1200.webp",
              "src450": "img/fabrics/official/torrens/05-600.webp",
              "src240": "img/fabrics/official/torrens/05-160.webp",
              "hex": "#847668"
            },
            {
              "name": "№ 06",
              "src900": "img/fabrics/official/torrens/06-1200.webp",
              "src450": "img/fabrics/official/torrens/06-600.webp",
              "src240": "img/fabrics/official/torrens/06-160.webp",
              "hex": "#6d4e4b"
            },
            {
              "name": "№ 07",
              "src900": "img/fabrics/official/torrens/07-1200.webp",
              "src450": "img/fabrics/official/torrens/07-600.webp",
              "src240": "img/fabrics/official/torrens/07-160.webp",
              "hex": "#5b5c4d"
            },
            {
              "name": "№ 08",
              "src900": "img/fabrics/official/torrens/08-1200.webp",
              "src450": "img/fabrics/official/torrens/08-600.webp",
              "src240": "img/fabrics/official/torrens/08-160.webp",
              "hex": "#8a8e90"
            },
            {
              "name": "№ 09",
              "src900": "img/fabrics/official/torrens/09-1200.webp",
              "src450": "img/fabrics/official/torrens/09-600.webp",
              "src240": "img/fabrics/official/torrens/09-160.webp",
              "hex": "#b3aea7"
            },
            {
              "name": "№ 10",
              "src900": "img/fabrics/official/torrens/10-1200.webp",
              "src450": "img/fabrics/official/torrens/10-600.webp",
              "src240": "img/fabrics/official/torrens/10-160.webp",
              "hex": "#b1aaa2"
            },
            {
              "name": "№ 11",
              "src900": "img/fabrics/official/torrens/11-1200.webp",
              "src450": "img/fabrics/official/torrens/11-600.webp",
              "src240": "img/fabrics/official/torrens/11-160.webp",
              "hex": "#696865"
            },
            {
              "name": "№ 12",
              "src900": "img/fabrics/official/torrens/12-1200.webp",
              "src450": "img/fabrics/official/torrens/12-600.webp",
              "src240": "img/fabrics/official/torrens/12-160.webp",
              "hex": "#67615e"
            },
            {
              "name": "№ 13",
              "src900": "img/fabrics/official/torrens/13-1200.webp",
              "src450": "img/fabrics/official/torrens/13-600.webp",
              "src240": "img/fabrics/official/torrens/13-160.webp",
              "hex": "#41474c"
            },
            {
              "name": "№ 14",
              "src900": "img/fabrics/official/torrens/14-1200.webp",
              "src450": "img/fabrics/official/torrens/14-600.webp",
              "src240": "img/fabrics/official/torrens/14-160.webp",
              "hex": "#798e9c"
            }
          ]
        },
        {
          "id": "eclipse",
          "title": "ECLIPSE",
          "kind": "велюр",
          "facts": [
            "75 000 циклов",
            "440 г/м²",
            "ширина 142 см"
          ],
          "texture": "img/fabrics/official/eclipse/100-1200.webp",
          "colours": [
            {
              "name": "№ 100",
              "src900": "img/fabrics/official/eclipse/100-1200.webp",
              "src450": "img/fabrics/official/eclipse/100-600.webp",
              "src240": "img/fabrics/official/eclipse/100-160.webp",
              "hex": "#dddbd6"
            },
            {
              "name": "№ 150",
              "src900": "img/fabrics/official/eclipse/150-1200.webp",
              "src450": "img/fabrics/official/eclipse/150-600.webp",
              "src240": "img/fabrics/official/eclipse/150-160.webp",
              "hex": "#d1c1a9"
            },
            {
              "name": "№ 290",
              "src900": "img/fabrics/official/eclipse/290-1200.webp",
              "src450": "img/fabrics/official/eclipse/290-600.webp",
              "src240": "img/fabrics/official/eclipse/290-160.webp",
              "hex": "#9d8f83"
            },
            {
              "name": "№ 520",
              "src900": "img/fabrics/official/eclipse/520-1200.webp",
              "src450": "img/fabrics/official/eclipse/520-600.webp",
              "src240": "img/fabrics/official/eclipse/520-160.webp",
              "hex": "#cc964a"
            },
            {
              "name": "№ 690",
              "src900": "img/fabrics/official/eclipse/690-1200.webp",
              "src450": "img/fabrics/official/eclipse/690-600.webp",
              "src240": "img/fabrics/official/eclipse/690-160.webp",
              "hex": "#bacdc5"
            },
            {
              "name": "№ 694",
              "src900": "img/fabrics/official/eclipse/694-1200.webp",
              "src450": "img/fabrics/official/eclipse/694-600.webp",
              "src240": "img/fabrics/official/eclipse/694-160.webp",
              "hex": "#697b63"
            },
            {
              "name": "№ 795",
              "src900": "img/fabrics/official/eclipse/795-1200.webp",
              "src450": "img/fabrics/official/eclipse/795-600.webp",
              "src240": "img/fabrics/official/eclipse/795-160.webp",
              "hex": "#426179"
            },
            {
              "name": "№ 924",
              "src900": "img/fabrics/official/eclipse/924-1200.webp",
              "src450": "img/fabrics/official/eclipse/924-600.webp",
              "src240": "img/fabrics/official/eclipse/924-160.webp",
              "hex": "#a1988d"
            },
            {
              "name": "№ 986",
              "src900": "img/fabrics/official/eclipse/986-1200.webp",
              "src450": "img/fabrics/official/eclipse/986-600.webp",
              "src240": "img/fabrics/official/eclipse/986-160.webp",
              "hex": "#696869"
            },
            {
              "name": "№ 990",
              "src900": "img/fabrics/official/eclipse/990-1200.webp",
              "src450": "img/fabrics/official/eclipse/990-600.webp",
              "src240": "img/fabrics/official/eclipse/990-160.webp",
              "hex": "#c0bfc0"
            },
            {
              "name": "№ 993",
              "src900": "img/fabrics/official/eclipse/993-1200.webp",
              "src450": "img/fabrics/official/eclipse/993-600.webp",
              "src240": "img/fabrics/official/eclipse/993-160.webp",
              "hex": "#939390"
            }
          ]
        },
        {
          "id": "beauty",
          "title": "BEAUTY",
          "kind": "велюр в рубчик",
          "facts": [
            "100 000 циклов",
            "320 г/м²",
            "для вакуумной упаковки"
          ],
          "texture": "img/fabrics/official/beauty/012-1200.webp",
          "colours": [
            {
              "name": "№ 012",
              "src900": "img/fabrics/official/beauty/012-1200.webp",
              "src450": "img/fabrics/official/beauty/012-600.webp",
              "src240": "img/fabrics/official/beauty/012-160.webp",
              "hex": "#a1a09f"
            },
            {
              "name": "№ 007",
              "src900": "img/fabrics/official/beauty/007-1200.webp",
              "src450": "img/fabrics/official/beauty/007-600.webp",
              "src240": "img/fabrics/official/beauty/007-160.webp",
              "hex": "#c5bfb5"
            },
            {
              "name": "№ 003",
              "src900": "img/fabrics/official/beauty/003-1200.webp",
              "src450": "img/fabrics/official/beauty/003-600.webp",
              "src240": "img/fabrics/official/beauty/003-160.webp",
              "hex": "#ccbfae"
            },
            {
              "name": "№ 013",
              "src900": "img/fabrics/official/beauty/013-1200.webp",
              "src450": "img/fabrics/official/beauty/013-600.webp",
              "src240": "img/fabrics/official/beauty/013-160.webp",
              "hex": "#a09287"
            },
            {
              "name": "№ 014",
              "src900": "img/fabrics/official/beauty/014-1200.webp",
              "src450": "img/fabrics/official/beauty/014-600.webp",
              "src240": "img/fabrics/official/beauty/014-160.webp",
              "hex": "#736051"
            },
            {
              "name": "№ 006",
              "src900": "img/fabrics/official/beauty/006-1200.webp",
              "src450": "img/fabrics/official/beauty/006-600.webp",
              "src240": "img/fabrics/official/beauty/006-160.webp",
              "hex": "#a39787"
            },
            {
              "name": "№ 016",
              "src900": "img/fabrics/official/beauty/016-1200.webp",
              "src450": "img/fabrics/official/beauty/016-600.webp",
              "src240": "img/fabrics/official/beauty/016-160.webp",
              "hex": "#60321b"
            },
            {
              "name": "№ 015",
              "src900": "img/fabrics/official/beauty/015-1200.webp",
              "src450": "img/fabrics/official/beauty/015-600.webp",
              "src240": "img/fabrics/official/beauty/015-160.webp",
              "hex": "#273852"
            },
            {
              "name": "№ 004",
              "src900": "img/fabrics/official/beauty/004-1200.webp",
              "src450": "img/fabrics/official/beauty/004-600.webp",
              "src240": "img/fabrics/official/beauty/004-160.webp",
              "hex": "#a0a0a2"
            },
            {
              "name": "№ 008",
              "src900": "img/fabrics/official/beauty/008-1200.webp",
              "src450": "img/fabrics/official/beauty/008-600.webp",
              "src240": "img/fabrics/official/beauty/008-160.webp",
              "hex": "#888883"
            },
            {
              "name": "№ 017",
              "src900": "img/fabrics/official/beauty/017-1200.webp",
              "src450": "img/fabrics/official/beauty/017-600.webp",
              "src240": "img/fabrics/official/beauty/017-160.webp",
              "hex": "#6a6e62"
            },
            {
              "name": "№ 002",
              "src900": "img/fabrics/official/beauty/002-1200.webp",
              "src450": "img/fabrics/official/beauty/002-600.webp",
              "src240": "img/fabrics/official/beauty/002-160.webp",
              "hex": "#223b35"
            },
            {
              "name": "№ 009",
              "src900": "img/fabrics/official/beauty/009-1200.webp",
              "src450": "img/fabrics/official/beauty/009-600.webp",
              "src240": "img/fabrics/official/beauty/009-160.webp",
              "hex": "#726f6a"
            },
            {
              "name": "№ 005",
              "src900": "img/fabrics/official/beauty/005-1200.webp",
              "src450": "img/fabrics/official/beauty/005-600.webp",
              "src240": "img/fabrics/official/beauty/005-160.webp",
              "hex": "#625c5a"
            },
            {
              "name": "№ 010",
              "src900": "img/fabrics/official/beauty/010-1200.webp",
              "src450": "img/fabrics/official/beauty/010-600.webp",
              "src240": "img/fabrics/official/beauty/010-160.webp",
              "hex": "#2a2c30"
            },
            {
              "name": "№ 018",
              "src900": "img/fabrics/official/beauty/018-1200.webp",
              "src450": "img/fabrics/official/beauty/018-600.webp",
              "src240": "img/fabrics/official/beauty/018-160.webp",
              "hex": "#1a1d20"
            }
          ]
        }
      ]
    },
    {
      "id": "bukle",
      "title": "Букле",
      "collections": [
        {
          "id": "ricca",
          "title": "RICCA",
          "kind": "букле",
          "facts": [],
          "texture": "img/fabrics/ricca/01-1200.webp",
          "colours": [
            {
              "name": "Серый меланж",
              "src900": "img/fabrics/ricca/01-1200.webp",
              "src450": "img/fabrics/ricca/01-600.webp",
              "src240": "img/fabrics/ricca/01-160.webp",
              "hex": "#8d8b84"
            },
            {
              "name": "Графит",
              "src900": "img/fabrics/ricca/02-1200.webp",
              "src450": "img/fabrics/ricca/02-600.webp",
              "src240": "img/fabrics/ricca/02-160.webp",
              "hex": "#212121"
            },
            {
              "name": "Тёмно-зелёный",
              "src900": "img/fabrics/ricca/03-1200.webp",
              "src450": "img/fabrics/ricca/03-600.webp",
              "src240": "img/fabrics/ricca/03-160.webp",
              "hex": "#36382b"
            },
            {"name": "Молочный", "src900": "img/fabrics/ricca/04-1200.webp", "src450": "img/fabrics/ricca/04-600.webp", "src240": "img/fabrics/ricca/04-160.webp", "hex": "#d8d3c8"},
            {"name": "Серо-бежевый", "src900": "img/fabrics/ricca/05-1200.webp", "src450": "img/fabrics/ricca/05-600.webp", "src240": "img/fabrics/ricca/05-160.webp", "hex": "#8e8a85"},
            {"name": "Медный меланж", "src900": "img/fabrics/ricca/06-1200.webp", "src450": "img/fabrics/ricca/06-600.webp", "src240": "img/fabrics/ricca/06-160.webp", "hex": "#473529"},
            {"name": "Чёрно-бежевая полоса", "src900": "img/fabrics/ricca/07-1200.webp", "src450": "img/fabrics/ricca/07-600.webp", "src240": "img/fabrics/ricca/07-160.webp", "hex": "#6b6054"},
            {"name": "Светло-серый меланж", "src900": "img/fabrics/ricca/08-1200.webp", "src450": "img/fabrics/ricca/08-600.webp", "src240": "img/fabrics/ricca/08-160.webp", "hex": "#a7a39f"},
            {"name": "Тёмно-синий", "src900": "img/fabrics/ricca/09-1200.webp", "src450": "img/fabrics/ricca/09-600.webp", "src240": "img/fabrics/ricca/09-160.webp", "hex": "#1d222a"},
            {"name": "Серо-голубой меланж", "src900": "img/fabrics/ricca/10-1200.webp", "src450": "img/fabrics/ricca/10-600.webp", "src240": "img/fabrics/ricca/10-160.webp", "hex": "#7a7c81"},
            {"name": "Льняной", "src900": "img/fabrics/ricca/11-1200.webp", "src450": "img/fabrics/ricca/11-600.webp", "src240": "img/fabrics/ricca/11-160.webp", "hex": "#aaaeac"},
            {"name": "Дымчатый с розовой нитью", "src900": "img/fabrics/ricca/12-1200.webp", "src450": "img/fabrics/ricca/12-600.webp", "src240": "img/fabrics/ricca/12-160.webp", "hex": "#7c7c7e"},
            {"name": "Песочный с белой нитью", "src900": "img/fabrics/ricca/13-1200.webp", "src450": "img/fabrics/ricca/13-600.webp", "src240": "img/fabrics/ricca/13-160.webp", "hex": "#918c82"},
            {"name": "Серый твид", "src900": "img/fabrics/ricca/14-1200.webp", "src450": "img/fabrics/ricca/14-600.webp", "src240": "img/fabrics/ricca/14-160.webp", "hex": "#797a7e"},
            {"name": "Белый с чёрными пятнами", "src900": "img/fabrics/ricca/15-1200.webp", "src450": "img/fabrics/ricca/15-600.webp", "src240": "img/fabrics/ricca/15-160.webp", "hex": "#a1a2a1"},
            {"name": "Чёрно-белый узор", "src900": "img/fabrics/ricca/16-1200.webp", "src450": "img/fabrics/ricca/16-600.webp", "src240": "img/fabrics/ricca/16-160.webp", "hex": "#61625f"},
            {"name": "Оливковый с розовым", "src900": "img/fabrics/ricca/17-1200.webp", "src450": "img/fabrics/ricca/17-600.webp", "src240": "img/fabrics/ricca/17-160.webp", "hex": "#88816f"},
            {"name": "Чёрный с белыми пятнами", "src900": "img/fabrics/ricca/18-1200.webp", "src450": "img/fabrics/ricca/18-600.webp", "src240": "img/fabrics/ricca/18-160.webp", "hex": "#555453"}
          ]
        },
        {
          "id": "coco",
          "title": "COCO",
          "kind": "букле",
          "facts": [
            "65 000 циклов",
            "480 г/м²",
            "ширина 142 см"
          ],
          "texture": "img/fabrics/official/coco/000-1200.webp",
          "colours": [
            {
              "name": "№ 000",
              "src900": "img/fabrics/official/coco/000-1200.webp",
              "src450": "img/fabrics/official/coco/000-600.webp",
              "src240": "img/fabrics/official/coco/000-160.webp",
              "hex": "#f5f1ea"
            },
            {
              "name": "№ 110",
              "src900": "img/fabrics/official/coco/110-1200.webp",
              "src450": "img/fabrics/official/coco/110-600.webp",
              "src240": "img/fabrics/official/coco/110-160.webp",
              "hex": "#efe6d4"
            },
            {
              "name": "№ 238",
              "src900": "img/fabrics/official/coco/238-1200.webp",
              "src450": "img/fabrics/official/coco/238-600.webp",
              "src240": "img/fabrics/official/coco/238-160.webp",
              "hex": "#6a5959"
            },
            {
              "name": "№ 260",
              "src900": "img/fabrics/official/coco/260-1200.webp",
              "src450": "img/fabrics/official/coco/260-600.webp",
              "src240": "img/fabrics/official/coco/260-160.webp",
              "hex": "#baa188"
            },
            {
              "name": "№ 380",
              "src900": "img/fabrics/official/coco/380-1200.webp",
              "src450": "img/fabrics/official/coco/380-600.webp",
              "src240": "img/fabrics/official/coco/380-160.webp",
              "hex": "#773341"
            },
            {
              "name": "№ 422",
              "src900": "img/fabrics/official/coco/422-1200.webp",
              "src450": "img/fabrics/official/coco/422-600.webp",
              "src240": "img/fabrics/official/coco/422-160.webp",
              "hex": "#d5793f"
            },
            {
              "name": "№ 523",
              "src900": "img/fabrics/official/coco/523-1200.webp",
              "src450": "img/fabrics/official/coco/523-600.webp",
              "src240": "img/fabrics/official/coco/523-160.webp",
              "hex": "#b37833"
            },
            {
              "name": "№ 540",
              "src900": "img/fabrics/official/coco/540-1200.webp",
              "src450": "img/fabrics/official/coco/540-600.webp",
              "src240": "img/fabrics/official/coco/540-160.webp",
              "hex": "#dfaa56"
            },
            {
              "name": "№ 610",
              "src900": "img/fabrics/official/coco/610-1200.webp",
              "src450": "img/fabrics/official/coco/610-600.webp",
              "src240": "img/fabrics/official/coco/610-160.webp",
              "hex": "#d3c17c"
            },
            {
              "name": "№ 694",
              "src900": "img/fabrics/official/coco/694-1200.webp",
              "src450": "img/fabrics/official/coco/694-600.webp",
              "src240": "img/fabrics/official/coco/694-160.webp",
              "hex": "#96ada2"
            },
            {
              "name": "№ 698",
              "src900": "img/fabrics/official/coco/698-1200.webp",
              "src450": "img/fabrics/official/coco/698-600.webp",
              "src240": "img/fabrics/official/coco/698-160.webp",
              "hex": "#45544c"
            },
            {
              "name": "№ 761",
              "src900": "img/fabrics/official/coco/761-1200.webp",
              "src450": "img/fabrics/official/coco/761-600.webp",
              "src240": "img/fabrics/official/coco/761-160.webp",
              "hex": "#416a7a"
            },
            {
              "name": "№ 785",
              "src900": "img/fabrics/official/coco/785-1200.webp",
              "src450": "img/fabrics/official/coco/785-600.webp",
              "src240": "img/fabrics/official/coco/785-160.webp",
              "hex": "#3e506d"
            },
            {
              "name": "№ 904",
              "src900": "img/fabrics/official/coco/904-1200.webp",
              "src450": "img/fabrics/official/coco/904-600.webp",
              "src240": "img/fabrics/official/coco/904-160.webp",
              "hex": "#a59e9c"
            },
            {
              "name": "№ 992",
              "src900": "img/fabrics/official/coco/992-1200.webp",
              "src450": "img/fabrics/official/coco/992-600.webp",
              "src240": "img/fabrics/official/coco/992-160.webp",
              "hex": "#c4bfbb"
            },
            {
              "name": "№ 999",
              "src900": "img/fabrics/official/coco/999-1200.webp",
              "src450": "img/fabrics/official/coco/999-600.webp",
              "src240": "img/fabrics/official/coco/999-160.webp",
              "hex": "#717275"
            }
          ]
        },
        {
          "id": "noble",
          "title": "NOBLE",
          "kind": "букле",
          "facts": [
            "65 000 циклов",
            "630 г/м²",
            "ширина 140 см"
          ],
          "texture": "img/fabrics/official/noble/000-1200.webp",
          "colours": [
            {
              "name": "№ 000",
              "src900": "img/fabrics/official/noble/000-1200.webp",
              "src450": "img/fabrics/official/noble/000-600.webp",
              "src240": "img/fabrics/official/noble/000-160.webp",
              "hex": "#d9d5ca"
            },
            {
              "name": "№ 010",
              "src900": "img/fabrics/official/noble/010-1200.webp",
              "src450": "img/fabrics/official/noble/010-600.webp",
              "src240": "img/fabrics/official/noble/010-160.webp",
              "hex": "#d6d1c4"
            },
            {
              "name": "№ 110",
              "src900": "img/fabrics/official/noble/110-1200.webp",
              "src450": "img/fabrics/official/noble/110-600.webp",
              "src240": "img/fabrics/official/noble/110-160.webp",
              "hex": "#c6b59e"
            },
            {
              "name": "№ 161",
              "src900": "img/fabrics/official/noble/161-1200.webp",
              "src450": "img/fabrics/official/noble/161-600.webp",
              "src240": "img/fabrics/official/noble/161-160.webp",
              "hex": "#a8987f"
            },
            {
              "name": "№ 229",
              "src900": "img/fabrics/official/noble/229-1200.webp",
              "src450": "img/fabrics/official/noble/229-600.webp",
              "src240": "img/fabrics/official/noble/229-160.webp",
              "hex": "#303535"
            },
            {
              "name": "№ 230",
              "src900": "img/fabrics/official/noble/230-1200.webp",
              "src450": "img/fabrics/official/noble/230-600.webp",
              "src240": "img/fabrics/official/noble/230-160.webp",
              "hex": "#7e7370"
            },
            {
              "name": "№ 250",
              "src900": "img/fabrics/official/noble/250-1200.webp",
              "src450": "img/fabrics/official/noble/250-600.webp",
              "src240": "img/fabrics/official/noble/250-160.webp",
              "hex": "#7f4f26"
            },
            {
              "name": "№ 260",
              "src900": "img/fabrics/official/noble/260-1200.webp",
              "src450": "img/fabrics/official/noble/260-600.webp",
              "src240": "img/fabrics/official/noble/260-160.webp",
              "hex": "#a79382"
            },
            {
              "name": "№ 420",
              "src900": "img/fabrics/official/noble/420-1200.webp",
              "src450": "img/fabrics/official/noble/420-600.webp",
              "src240": "img/fabrics/official/noble/420-160.webp",
              "hex": "#b0937c"
            },
            {
              "name": "№ 551",
              "src900": "img/fabrics/official/noble/551-1200.webp",
              "src450": "img/fabrics/official/noble/551-600.webp",
              "src240": "img/fabrics/official/noble/551-160.webp",
              "hex": "#a67f32"
            },
            {
              "name": "№ 610",
              "src900": "img/fabrics/official/noble/610-1200.webp",
              "src450": "img/fabrics/official/noble/610-600.webp",
              "src240": "img/fabrics/official/noble/610-160.webp",
              "hex": "#a59a63"
            },
            {
              "name": "№ 624",
              "src900": "img/fabrics/official/noble/624-1200.webp",
              "src450": "img/fabrics/official/noble/624-600.webp",
              "src240": "img/fabrics/official/noble/624-160.webp",
              "hex": "#5d6540"
            },
            {
              "name": "№ 669",
              "src900": "img/fabrics/official/noble/669-1200.webp",
              "src450": "img/fabrics/official/noble/669-600.webp",
              "src240": "img/fabrics/official/noble/669-160.webp",
              "hex": "#213627"
            },
            {
              "name": "№ 754",
              "src900": "img/fabrics/official/noble/754-1200.webp",
              "src450": "img/fabrics/official/noble/754-600.webp",
              "src240": "img/fabrics/official/noble/754-160.webp",
              "hex": "#435e63"
            },
            {
              "name": "№ 758",
              "src900": "img/fabrics/official/noble/758-1200.webp",
              "src450": "img/fabrics/official/noble/758-600.webp",
              "src240": "img/fabrics/official/noble/758-160.webp",
              "hex": "#203949"
            },
            {
              "name": "№ 786",
              "src900": "img/fabrics/official/noble/786-1200.webp",
              "src450": "img/fabrics/official/noble/786-600.webp",
              "src240": "img/fabrics/official/noble/786-160.webp",
              "hex": "#233151"
            },
            {
              "name": "№ 793",
              "src900": "img/fabrics/official/noble/793-1200.webp",
              "src450": "img/fabrics/official/noble/793-600.webp",
              "src240": "img/fabrics/official/noble/793-160.webp",
              "hex": "#708281"
            },
            {
              "name": "№ 870",
              "src900": "img/fabrics/official/noble/870-1200.webp",
              "src450": "img/fabrics/official/noble/870-600.webp",
              "src240": "img/fabrics/official/noble/870-160.webp",
              "hex": "#78616f"
            },
            {
              "name": "№ 981",
              "src900": "img/fabrics/official/noble/981-1200.webp",
              "src450": "img/fabrics/official/noble/981-600.webp",
              "src240": "img/fabrics/official/noble/981-160.webp",
              "hex": "#635f65"
            },
            {
              "name": "№ 996",
              "src900": "img/fabrics/official/noble/996-1200.webp",
              "src450": "img/fabrics/official/noble/996-600.webp",
              "src240": "img/fabrics/official/noble/996-160.webp",
              "hex": "#6c7171"
            }
          ]
        },
        {
          "id": "pique",
          "title": "PIQUE",
          "kind": "букле",
          "facts": [
            "50 000 циклов",
            "500 г/м²"
          ],
          "texture": "img/fabrics/official/pique/001-1200.webp",
          "colours": [
            {
              "name": "№ 001",
              "src900": "img/fabrics/official/pique/001-1200.webp",
              "src450": "img/fabrics/official/pique/001-600.webp",
              "src240": "img/fabrics/official/pique/001-160.webp",
              "hex": "#adaca3"
            },
            {
              "name": "№ 002",
              "src900": "img/fabrics/official/pique/002-1200.webp",
              "src450": "img/fabrics/official/pique/002-600.webp",
              "src240": "img/fabrics/official/pique/002-160.webp",
              "hex": "#a4a094"
            },
            {
              "name": "№ 003",
              "src900": "img/fabrics/official/pique/003-1200.webp",
              "src450": "img/fabrics/official/pique/003-600.webp",
              "src240": "img/fabrics/official/pique/003-160.webp",
              "hex": "#9e9283"
            },
            {
              "name": "№ 004",
              "src900": "img/fabrics/official/pique/004-1200.webp",
              "src450": "img/fabrics/official/pique/004-600.webp",
              "src240": "img/fabrics/official/pique/004-160.webp",
              "hex": "#8e8c83"
            },
            {
              "name": "№ 005",
              "src900": "img/fabrics/official/pique/005-1200.webp",
              "src450": "img/fabrics/official/pique/005-600.webp",
              "src240": "img/fabrics/official/pique/005-160.webp",
              "hex": "#5c584f"
            },
            {
              "name": "№ 006",
              "src900": "img/fabrics/official/pique/006-1200.webp",
              "src450": "img/fabrics/official/pique/006-600.webp",
              "src240": "img/fabrics/official/pique/006-160.webp",
              "hex": "#75695d"
            },
            {
              "name": "№ 007",
              "src900": "img/fabrics/official/pique/007-1200.webp",
              "src450": "img/fabrics/official/pique/007-600.webp",
              "src240": "img/fabrics/official/pique/007-160.webp",
              "hex": "#7b796a"
            },
            {
              "name": "№ 008",
              "src900": "img/fabrics/official/pique/008-1200.webp",
              "src450": "img/fabrics/official/pique/008-600.webp",
              "src240": "img/fabrics/official/pique/008-160.webp",
              "hex": "#43554f"
            },
            {
              "name": "№ 009",
              "src900": "img/fabrics/official/pique/009-1200.webp",
              "src450": "img/fabrics/official/pique/009-600.webp",
              "src240": "img/fabrics/official/pique/009-160.webp",
              "hex": "#364957"
            },
            {
              "name": "№ 010",
              "src900": "img/fabrics/official/pique/010-1200.webp",
              "src450": "img/fabrics/official/pique/010-600.webp",
              "src240": "img/fabrics/official/pique/010-160.webp",
              "hex": "#9e9c91"
            },
            {
              "name": "№ 011",
              "src900": "img/fabrics/official/pique/011-1200.webp",
              "src450": "img/fabrics/official/pique/011-600.webp",
              "src240": "img/fabrics/official/pique/011-160.webp",
              "hex": "#979594"
            },
            {
              "name": "№ 012",
              "src900": "img/fabrics/official/pique/012-1200.webp",
              "src450": "img/fabrics/official/pique/012-600.webp",
              "src240": "img/fabrics/official/pique/012-160.webp",
              "hex": "#6e6d69"
            },
            {
              "name": "№ 013",
              "src900": "img/fabrics/official/pique/013-1200.webp",
              "src450": "img/fabrics/official/pique/013-600.webp",
              "src240": "img/fabrics/official/pique/013-160.webp",
              "hex": "#5c5e5e"
            },
            {
              "name": "№ 014",
              "src900": "img/fabrics/official/pique/014-1200.webp",
              "src450": "img/fabrics/official/pique/014-600.webp",
              "src240": "img/fabrics/official/pique/014-160.webp",
              "hex": "#474b4b"
            }
          ]
        }
      ]
    },
    {
      "id": "shenill",
      "title": "Шенилл",
      "collections": [
        {
          "id": "lucky",
          "title": "LUCKY",
          "kind": "шенилл",
          "facts": [
            "100 000 циклов",
            "420 г/м²"
          ],
          "texture": "img/fabrics/official/lucky/002-1200.webp",
          "colours": [
            {
              "name": "№ 002",
              "src900": "img/fabrics/official/lucky/002-1200.webp",
              "src450": "img/fabrics/official/lucky/002-600.webp",
              "src240": "img/fabrics/official/lucky/002-160.webp",
              "hex": "#cec8c0"
            },
            {
              "name": "№ 003",
              "src900": "img/fabrics/official/lucky/003-1200.webp",
              "src450": "img/fabrics/official/lucky/003-600.webp",
              "src240": "img/fabrics/official/lucky/003-160.webp",
              "hex": "#988f89"
            },
            {
              "name": "№ 021",
              "src900": "img/fabrics/official/lucky/021-1200.webp",
              "src450": "img/fabrics/official/lucky/021-600.webp",
              "src240": "img/fabrics/official/lucky/021-160.webp",
              "hex": "#a79588"
            },
            {
              "name": "№ 023",
              "src900": "img/fabrics/official/lucky/023-1200.webp",
              "src450": "img/fabrics/official/lucky/023-600.webp",
              "src240": "img/fabrics/official/lucky/023-160.webp",
              "hex": "#a89181"
            },
            {
              "name": "№ 022",
              "src900": "img/fabrics/official/lucky/022-1200.webp",
              "src450": "img/fabrics/official/lucky/022-600.webp",
              "src240": "img/fabrics/official/lucky/022-160.webp",
              "hex": "#8a7667"
            },
            {
              "name": "№ 004",
              "src900": "img/fabrics/official/lucky/004-1200.webp",
              "src450": "img/fabrics/official/lucky/004-600.webp",
              "src240": "img/fabrics/official/lucky/004-160.webp",
              "hex": "#928780"
            },
            {
              "name": "№ 005",
              "src900": "img/fabrics/official/lucky/005-1200.webp",
              "src450": "img/fabrics/official/lucky/005-600.webp",
              "src240": "img/fabrics/official/lucky/005-160.webp",
              "hex": "#453a34"
            },
            {
              "name": "№ 006",
              "src900": "img/fabrics/official/lucky/006-1200.webp",
              "src450": "img/fabrics/official/lucky/006-600.webp",
              "src240": "img/fabrics/official/lucky/006-160.webp",
              "hex": "#363232"
            },
            {
              "name": "№ 007",
              "src900": "img/fabrics/official/lucky/007-1200.webp",
              "src450": "img/fabrics/official/lucky/007-600.webp",
              "src240": "img/fabrics/official/lucky/007-160.webp",
              "hex": "#92958a"
            },
            {
              "name": "№ 009",
              "src900": "img/fabrics/official/lucky/009-1200.webp",
              "src450": "img/fabrics/official/lucky/009-600.webp",
              "src240": "img/fabrics/official/lucky/009-160.webp",
              "hex": "#252b25"
            },
            {
              "name": "№ 008",
              "src900": "img/fabrics/official/lucky/008-1200.webp",
              "src450": "img/fabrics/official/lucky/008-600.webp",
              "src240": "img/fabrics/official/lucky/008-160.webp",
              "hex": "#3b382c"
            },
            {
              "name": "№ 010",
              "src900": "img/fabrics/official/lucky/010-1200.webp",
              "src450": "img/fabrics/official/lucky/010-600.webp",
              "src240": "img/fabrics/official/lucky/010-160.webp",
              "hex": "#8b5830"
            },
            {
              "name": "№ 011",
              "src900": "img/fabrics/official/lucky/011-1200.webp",
              "src450": "img/fabrics/official/lucky/011-600.webp",
              "src240": "img/fabrics/official/lucky/011-160.webp",
              "hex": "#64393b"
            },
            {
              "name": "№ 012",
              "src900": "img/fabrics/official/lucky/012-1200.webp",
              "src450": "img/fabrics/official/lucky/012-600.webp",
              "src240": "img/fabrics/official/lucky/012-160.webp",
              "hex": "#184a56"
            },
            {
              "name": "№ 013",
              "src900": "img/fabrics/official/lucky/013-1200.webp",
              "src450": "img/fabrics/official/lucky/013-600.webp",
              "src240": "img/fabrics/official/lucky/013-160.webp",
              "hex": "#3f4145"
            },
            {
              "name": "№ 014",
              "src900": "img/fabrics/official/lucky/014-1200.webp",
              "src450": "img/fabrics/official/lucky/014-600.webp",
              "src240": "img/fabrics/official/lucky/014-160.webp",
              "hex": "#484a4d"
            },
            {
              "name": "№ 015",
              "src900": "img/fabrics/official/lucky/015-1200.webp",
              "src450": "img/fabrics/official/lucky/015-600.webp",
              "src240": "img/fabrics/official/lucky/015-160.webp",
              "hex": "#394753"
            },
            {
              "name": "№ 020",
              "src900": "img/fabrics/official/lucky/020-1200.webp",
              "src450": "img/fabrics/official/lucky/020-600.webp",
              "src240": "img/fabrics/official/lucky/020-160.webp",
              "hex": "#ae918e"
            },
            {
              "name": "№ 016",
              "src900": "img/fabrics/official/lucky/016-1200.webp",
              "src450": "img/fabrics/official/lucky/016-600.webp",
              "src240": "img/fabrics/official/lucky/016-160.webp",
              "hex": "#7a7e84"
            },
            {
              "name": "№ 017",
              "src900": "img/fabrics/official/lucky/017-1200.webp",
              "src450": "img/fabrics/official/lucky/017-600.webp",
              "src240": "img/fabrics/official/lucky/017-160.webp",
              "hex": "#575c5f"
            },
            {
              "name": "№ 018",
              "src900": "img/fabrics/official/lucky/018-1200.webp",
              "src450": "img/fabrics/official/lucky/018-600.webp",
              "src240": "img/fabrics/official/lucky/018-160.webp",
              "hex": "#303132"
            },
            {
              "name": "№ 019",
              "src900": "img/fabrics/official/lucky/019-1200.webp",
              "src450": "img/fabrics/official/lucky/019-600.webp",
              "src240": "img/fabrics/official/lucky/019-160.webp",
              "hex": "#2a2e30"
            }
          ]
        },
        {
          "id": "molly",
          "title": "MOLLY",
          "kind": "шенилл",
          "facts": [
            "80 000 циклов",
            "430 г/м²"
          ],
          "texture": "img/fabrics/official/molly/FL100-1200.webp",
          "colours": [
            {
              "name": "№ FL 100",
              "src900": "img/fabrics/official/molly/FL100-1200.webp",
              "src450": "img/fabrics/official/molly/FL100-600.webp",
              "src240": "img/fabrics/official/molly/FL100-160.webp",
              "hex": "#9b887a"
            },
            {
              "name": "№ 006",
              "src900": "img/fabrics/official/molly/006-1200.webp",
              "src450": "img/fabrics/official/molly/006-600.webp",
              "src240": "img/fabrics/official/molly/006-160.webp",
              "hex": "#aeaaa3"
            },
            {
              "name": "№ 004",
              "src900": "img/fabrics/official/molly/004-1200.webp",
              "src450": "img/fabrics/official/molly/004-600.webp",
              "src240": "img/fabrics/official/molly/004-160.webp",
              "hex": "#a89d92"
            },
            {
              "name": "№ 003",
              "src900": "img/fabrics/official/molly/003-1200.webp",
              "src450": "img/fabrics/official/molly/003-600.webp",
              "src240": "img/fabrics/official/molly/003-160.webp",
              "hex": "#bbaea4"
            },
            {
              "name": "№ 002",
              "src900": "img/fabrics/official/molly/002-1200.webp",
              "src450": "img/fabrics/official/molly/002-600.webp",
              "src240": "img/fabrics/official/molly/002-160.webp",
              "hex": "#766151"
            },
            {
              "name": "№ 001",
              "src900": "img/fabrics/official/molly/001-1200.webp",
              "src450": "img/fabrics/official/molly/001-600.webp",
              "src240": "img/fabrics/official/molly/001-160.webp",
              "hex": "#594b43"
            },
            {
              "name": "№ 013",
              "src900": "img/fabrics/official/molly/013-1200.webp",
              "src450": "img/fabrics/official/molly/013-600.webp",
              "src240": "img/fabrics/official/molly/013-160.webp",
              "hex": "#4f2a1a"
            },
            {
              "name": "№ FL 200",
              "src900": "img/fabrics/official/molly/FL200-1200.webp",
              "src450": "img/fabrics/official/molly/FL200-600.webp",
              "src240": "img/fabrics/official/molly/FL200-160.webp",
              "hex": "#8d837f"
            },
            {
              "name": "№ 012",
              "src900": "img/fabrics/official/molly/012-1200.webp",
              "src450": "img/fabrics/official/molly/012-600.webp",
              "src240": "img/fabrics/official/molly/012-160.webp",
              "hex": "#813223"
            },
            {
              "name": "№ 010",
              "src900": "img/fabrics/official/molly/010-1200.webp",
              "src450": "img/fabrics/official/molly/010-600.webp",
              "src240": "img/fabrics/official/molly/010-160.webp",
              "hex": "#926560"
            },
            {
              "name": "№ 015",
              "src900": "img/fabrics/official/molly/015-1200.webp",
              "src450": "img/fabrics/official/molly/015-600.webp",
              "src240": "img/fabrics/official/molly/015-160.webp",
              "hex": "#b07c32"
            },
            {
              "name": "№ 018",
              "src900": "img/fabrics/official/molly/018-1200.webp",
              "src450": "img/fabrics/official/molly/018-600.webp",
              "src240": "img/fabrics/official/molly/018-160.webp",
              "hex": "#242e3b"
            },
            {
              "name": "№ 016",
              "src900": "img/fabrics/official/molly/016-1200.webp",
              "src450": "img/fabrics/official/molly/016-600.webp",
              "src240": "img/fabrics/official/molly/016-160.webp",
              "hex": "#393328"
            },
            {
              "name": "№ 017",
              "src900": "img/fabrics/official/molly/017-1200.webp",
              "src450": "img/fabrics/official/molly/017-600.webp",
              "src240": "img/fabrics/official/molly/017-160.webp",
              "hex": "#273732"
            },
            {
              "name": "№ FL 300",
              "src900": "img/fabrics/official/molly/FL300-1200.webp",
              "src450": "img/fabrics/official/molly/FL300-600.webp",
              "src240": "img/fabrics/official/molly/FL300-160.webp",
              "hex": "#7e7e79"
            },
            {
              "name": "№ 023",
              "src900": "img/fabrics/official/molly/023-1200.webp",
              "src450": "img/fabrics/official/molly/023-600.webp",
              "src240": "img/fabrics/official/molly/023-160.webp",
              "hex": "#a7a39e"
            },
            {
              "name": "№ 027",
              "src900": "img/fabrics/official/molly/027-1200.webp",
              "src450": "img/fabrics/official/molly/027-600.webp",
              "src240": "img/fabrics/official/molly/027-160.webp",
              "hex": "#9b9a99"
            },
            {
              "name": "№ 024",
              "src900": "img/fabrics/official/molly/024-1200.webp",
              "src450": "img/fabrics/official/molly/024-600.webp",
              "src240": "img/fabrics/official/molly/024-160.webp",
              "hex": "#938985"
            },
            {
              "name": "№ 028",
              "src900": "img/fabrics/official/molly/028-1200.webp",
              "src450": "img/fabrics/official/molly/028-600.webp",
              "src240": "img/fabrics/official/molly/028-160.webp",
              "hex": "#8f8681"
            },
            {
              "name": "№ 022",
              "src900": "img/fabrics/official/molly/022-1200.webp",
              "src450": "img/fabrics/official/molly/022-600.webp",
              "src240": "img/fabrics/official/molly/022-160.webp",
              "hex": "#75706e"
            },
            {
              "name": "№ 021",
              "src900": "img/fabrics/official/molly/021-1200.webp",
              "src450": "img/fabrics/official/molly/021-600.webp",
              "src240": "img/fabrics/official/molly/021-160.webp",
              "hex": "#56514d"
            },
            {
              "name": "№ 030",
              "src900": "img/fabrics/official/molly/030-1200.webp",
              "src450": "img/fabrics/official/molly/030-600.webp",
              "src240": "img/fabrics/official/molly/030-160.webp",
              "hex": "#4f4a48"
            },
            {
              "name": "№ FL 400",
              "src900": "img/fabrics/official/molly/FL400-1200.webp",
              "src450": "img/fabrics/official/molly/FL400-600.webp",
              "src240": "img/fabrics/official/molly/FL400-160.webp",
              "hex": "#827a76"
            }
          ]
        },
        {
          "id": "sambia",
          "title": "САМБИЯ",
          "kind": "шенилл",
          "facts": [
            "70 000 циклов",
            "ширина 140 см",
            "чистка: мыльный раствор"
          ],
          "texture": "img/fabrics/official/sambia/01-1200.webp",
          "colours": [
            {
              "name": "№ 01",
              "src900": "img/fabrics/official/sambia/01-1200.webp",
              "src450": "img/fabrics/official/sambia/01-600.webp",
              "src240": "img/fabrics/official/sambia/01-160.webp",
              "hex": "#d9dfdf"
            },
            {
              "name": "№ 02",
              "src900": "img/fabrics/official/sambia/02-1200.webp",
              "src450": "img/fabrics/official/sambia/02-600.webp",
              "src240": "img/fabrics/official/sambia/02-160.webp",
              "hex": "#a3a9ae"
            },
            {
              "name": "№ 03",
              "src900": "img/fabrics/official/sambia/03-1200.webp",
              "src450": "img/fabrics/official/sambia/03-600.webp",
              "src240": "img/fabrics/official/sambia/03-160.webp",
              "hex": "#7a848a"
            },
            {
              "name": "№ 04",
              "src900": "img/fabrics/official/sambia/04-1200.webp",
              "src450": "img/fabrics/official/sambia/04-600.webp",
              "src240": "img/fabrics/official/sambia/04-160.webp",
              "hex": "#666c6d"
            },
            {
              "name": "№ 05",
              "src900": "img/fabrics/official/sambia/05-1200.webp",
              "src450": "img/fabrics/official/sambia/05-600.webp",
              "src240": "img/fabrics/official/sambia/05-160.webp",
              "hex": "#393e3f"
            },
            {
              "name": "№ 06",
              "src900": "img/fabrics/official/sambia/06-1200.webp",
              "src450": "img/fabrics/official/sambia/06-600.webp",
              "src240": "img/fabrics/official/sambia/06-160.webp",
              "hex": "#444442"
            },
            {
              "name": "№ 07",
              "src900": "img/fabrics/official/sambia/07-1200.webp",
              "src450": "img/fabrics/official/sambia/07-600.webp",
              "src240": "img/fabrics/official/sambia/07-160.webp",
              "hex": "#dbdfd9"
            },
            {
              "name": "№ 08",
              "src900": "img/fabrics/official/sambia/08-1200.webp",
              "src450": "img/fabrics/official/sambia/08-600.webp",
              "src240": "img/fabrics/official/sambia/08-160.webp",
              "hex": "#c5c5c0"
            },
            {
              "name": "№ 09",
              "src900": "img/fabrics/official/sambia/09-1200.webp",
              "src450": "img/fabrics/official/sambia/09-600.webp",
              "src240": "img/fabrics/official/sambia/09-160.webp",
              "hex": "#84817d"
            },
            {
              "name": "№ 10",
              "src900": "img/fabrics/official/sambia/10-1200.webp",
              "src450": "img/fabrics/official/sambia/10-600.webp",
              "src240": "img/fabrics/official/sambia/10-160.webp",
              "hex": "#915939"
            },
            {
              "name": "№ 11",
              "src900": "img/fabrics/official/sambia/11-1200.webp",
              "src450": "img/fabrics/official/sambia/11-600.webp",
              "src240": "img/fabrics/official/sambia/11-160.webp",
              "hex": "#512d24"
            },
            {
              "name": "№ 12",
              "src900": "img/fabrics/official/sambia/12-1200.webp",
              "src450": "img/fabrics/official/sambia/12-600.webp",
              "src240": "img/fabrics/official/sambia/12-160.webp",
              "hex": "#323c2c"
            }
          ]
        }
      ]
    },
    {
      "id": "zamsha",
      "title": "Замша",
      "collections": [
        {
          "id": "timeless",
          "title": "TIMELESS",
          "kind": "искусственная замша",
          "facts": [
            "40 000 циклов",
            "330 г/м²",
            "ширина 142 см"
          ],
          "texture": "img/fabrics/official/timeless/01-1200.webp",
          "colours": [
            {
              "name": "№ 01",
              "src900": "img/fabrics/official/timeless/01-1200.webp",
              "src450": "img/fabrics/official/timeless/01-600.webp",
              "src240": "img/fabrics/official/timeless/01-160.webp",
              "hex": "#ecefec"
            },
            {
              "name": "№ 04",
              "src900": "img/fabrics/official/timeless/04-1200.webp",
              "src450": "img/fabrics/official/timeless/04-600.webp",
              "src240": "img/fabrics/official/timeless/04-160.webp",
              "hex": "#a4a197"
            },
            {
              "name": "№ 05",
              "src900": "img/fabrics/official/timeless/05-1200.webp",
              "src450": "img/fabrics/official/timeless/05-600.webp",
              "src240": "img/fabrics/official/timeless/05-160.webp",
              "hex": "#a89a88"
            },
            {
              "name": "№ 06",
              "src900": "img/fabrics/official/timeless/06-1200.webp",
              "src450": "img/fabrics/official/timeless/06-600.webp",
              "src240": "img/fabrics/official/timeless/06-160.webp",
              "hex": "#cca982"
            },
            {
              "name": "№ 08",
              "src900": "img/fabrics/official/timeless/08-1200.webp",
              "src450": "img/fabrics/official/timeless/08-600.webp",
              "src240": "img/fabrics/official/timeless/08-160.webp",
              "hex": "#67564b"
            },
            {
              "name": "№ 09",
              "src900": "img/fabrics/official/timeless/09-1200.webp",
              "src450": "img/fabrics/official/timeless/09-600.webp",
              "src240": "img/fabrics/official/timeless/09-160.webp",
              "hex": "#938779"
            },
            {
              "name": "№ 101",
              "src900": "img/fabrics/official/timeless/101-1200.webp",
              "src450": "img/fabrics/official/timeless/101-600.webp",
              "src240": "img/fabrics/official/timeless/101-160.webp",
              "hex": "#6c828e"
            },
            {
              "name": "№ 20",
              "src900": "img/fabrics/official/timeless/20-1200.webp",
              "src450": "img/fabrics/official/timeless/20-600.webp",
              "src240": "img/fabrics/official/timeless/20-160.webp",
              "hex": "#d79d7c"
            },
            {
              "name": "№ 21",
              "src900": "img/fabrics/official/timeless/21-1200.webp",
              "src450": "img/fabrics/official/timeless/21-600.webp",
              "src240": "img/fabrics/official/timeless/21-160.webp",
              "hex": "#b6958d"
            },
            {
              "name": "№ 221",
              "src900": "img/fabrics/official/timeless/221-1200.webp",
              "src450": "img/fabrics/official/timeless/221-600.webp",
              "src240": "img/fabrics/official/timeless/221-160.webp",
              "hex": "#553f37"
            },
            {
              "name": "№ 27",
              "src900": "img/fabrics/official/timeless/27-1200.webp",
              "src450": "img/fabrics/official/timeless/27-600.webp",
              "src240": "img/fabrics/official/timeless/27-160.webp",
              "hex": "#1f4f94"
            },
            {
              "name": "№ 28",
              "src900": "img/fabrics/official/timeless/28-1200.webp",
              "src450": "img/fabrics/official/timeless/28-600.webp",
              "src240": "img/fabrics/official/timeless/28-160.webp",
              "hex": "#b6c3cc"
            },
            {
              "name": "№ 30",
              "src900": "img/fabrics/official/timeless/30-1200.webp",
              "src450": "img/fabrics/official/timeless/30-600.webp",
              "src240": "img/fabrics/official/timeless/30-160.webp",
              "hex": "#394550"
            },
            {
              "name": "№ 32",
              "src900": "img/fabrics/official/timeless/32-1200.webp",
              "src450": "img/fabrics/official/timeless/32-600.webp",
              "src240": "img/fabrics/official/timeless/32-160.webp",
              "hex": "#e2d2cb"
            },
            {
              "name": "№ 33",
              "src900": "img/fabrics/official/timeless/33-1200.webp",
              "src450": "img/fabrics/official/timeless/33-600.webp",
              "src240": "img/fabrics/official/timeless/33-160.webp",
              "hex": "#cbdbd0"
            },
            {
              "name": "№ 34",
              "src900": "img/fabrics/official/timeless/34-1200.webp",
              "src450": "img/fabrics/official/timeless/34-600.webp",
              "src240": "img/fabrics/official/timeless/34-160.webp",
              "hex": "#a5e1e6"
            },
            {
              "name": "№ 35",
              "src900": "img/fabrics/official/timeless/35-1200.webp",
              "src450": "img/fabrics/official/timeless/35-600.webp",
              "src240": "img/fabrics/official/timeless/35-160.webp",
              "hex": "#db5249"
            },
            {
              "name": "№ 37",
              "src900": "img/fabrics/official/timeless/37-1200.webp",
              "src450": "img/fabrics/official/timeless/37-600.webp",
              "src240": "img/fabrics/official/timeless/37-160.webp",
              "hex": "#d2bda2"
            },
            {
              "name": "№ 38",
              "src900": "img/fabrics/official/timeless/38-1200.webp",
              "src450": "img/fabrics/official/timeless/38-600.webp",
              "src240": "img/fabrics/official/timeless/38-160.webp",
              "hex": "#dcd7ca"
            },
            {
              "name": "№ 39",
              "src900": "img/fabrics/official/timeless/39-1200.webp",
              "src450": "img/fabrics/official/timeless/39-600.webp",
              "src240": "img/fabrics/official/timeless/39-160.webp",
              "hex": "#e0d8c4"
            },
            {
              "name": "№ 40",
              "src900": "img/fabrics/official/timeless/40-1200.webp",
              "src450": "img/fabrics/official/timeless/40-600.webp",
              "src240": "img/fabrics/official/timeless/40-160.webp",
              "hex": "#84b1be"
            },
            {
              "name": "№ 517",
              "src900": "img/fabrics/official/timeless/517-1200.webp",
              "src450": "img/fabrics/official/timeless/517-600.webp",
              "src240": "img/fabrics/official/timeless/517-160.webp",
              "hex": "#657480"
            },
            {
              "name": "№ 518",
              "src900": "img/fabrics/official/timeless/518-1200.webp",
              "src450": "img/fabrics/official/timeless/518-600.webp",
              "src240": "img/fabrics/official/timeless/518-160.webp",
              "hex": "#64737c"
            },
            {
              "name": "№ 522",
              "src900": "img/fabrics/official/timeless/522-1200.webp",
              "src450": "img/fabrics/official/timeless/522-600.webp",
              "src240": "img/fabrics/official/timeless/522-160.webp",
              "hex": "#bdc0c5"
            },
            {
              "name": "№ 523",
              "src900": "img/fabrics/official/timeless/523-1200.webp",
              "src450": "img/fabrics/official/timeless/523-600.webp",
              "src240": "img/fabrics/official/timeless/523-160.webp",
              "hex": "#c8cbcc"
            },
            {
              "name": "№ 524",
              "src900": "img/fabrics/official/timeless/524-1200.webp",
              "src450": "img/fabrics/official/timeless/524-600.webp",
              "src240": "img/fabrics/official/timeless/524-160.webp",
              "hex": "#abb1b4"
            },
            {
              "name": "№ 608",
              "src900": "img/fabrics/official/timeless/608-1200.webp",
              "src450": "img/fabrics/official/timeless/608-600.webp",
              "src240": "img/fabrics/official/timeless/608-160.webp",
              "hex": "#b29caf"
            },
            {
              "name": "№ 633",
              "src900": "img/fabrics/official/timeless/633-1200.webp",
              "src450": "img/fabrics/official/timeless/633-600.webp",
              "src240": "img/fabrics/official/timeless/633-160.webp",
              "hex": "#ac8d94"
            }
          ]
        }
      ]
    },
    {
      "id": "ekokozha",
      "title": "Экокожа",
      "collections": [
        {
          "id": "ricca-leather",
          "title": "RICCA LEATHER",
          "kind": "экокожа: зернистая, гладкая, винтаж",
          "facts": [
            "150 000 циклов",
            "хлопок 30 %, полиуретан 70 %",
            "морозостойкость −20 °C"
          ],
          "texture": "img/fabrics/ricca-leather/01-1200.webp",
          "colours": [
            {
              "name": "Красная",
              "src900": "img/fabrics/ricca-leather/01-1200.webp",
              "src450": "img/fabrics/ricca-leather/01-600.webp",
              "src240": "img/fabrics/ricca-leather/01-160.webp",
              "hex": "#c24439"
            },
            {
              "name": "Сливочная",
              "src900": "img/fabrics/ricca-leather/02-1200.webp",
              "src450": "img/fabrics/ricca-leather/02-600.webp",
              "src240": "img/fabrics/ricca-leather/02-160.webp",
              "hex": "#c8b692"
            },
            {
              "name": "Мокко",
              "src900": "img/fabrics/ricca-leather/03-1200.webp",
              "src450": "img/fabrics/ricca-leather/03-600.webp",
              "src240": "img/fabrics/ricca-leather/03-160.webp",
              "hex": "#7e624f"
            },
            {
              "name": "Бордо",
              "src900": "img/fabrics/ricca-leather/04-1200.webp",
              "src450": "img/fabrics/ricca-leather/04-600.webp",
              "src240": "img/fabrics/ricca-leather/04-160.webp",
              "hex": "#a2847c"
            },
            {
              "name": "Коралловая",
              "src900": "img/fabrics/ricca-leather/05-1200.webp",
              "src450": "img/fabrics/ricca-leather/05-600.webp",
              "src240": "img/fabrics/ricca-leather/05-160.webp",
              "hex": "#c06b64"
            },
            {
              "name": "Оранжевая",
              "src900": "img/fabrics/ricca-leather/06-1200.webp",
              "src450": "img/fabrics/ricca-leather/06-600.webp",
              "src240": "img/fabrics/ricca-leather/06-160.webp",
              "hex": "#bb4628"
            },
            {
              "name": "Белая",
              "src900": "img/fabrics/ricca-leather/07-1200.webp",
              "src450": "img/fabrics/ricca-leather/07-600.webp",
              "src240": "img/fabrics/ricca-leather/07-160.webp",
              "hex": "#d0d1c9"
            },
            {
              "name": "Бежевая, гладкая",
              "src900": "img/fabrics/ricca-leather/08-1200.webp",
              "src450": "img/fabrics/ricca-leather/08-600.webp",
              "src240": "img/fabrics/ricca-leather/08-160.webp",
              "hex": "#b3a796"
            },
            {
              "name": "Слоновая кость, гладкая",
              "src900": "img/fabrics/ricca-leather/09-1200.webp",
              "src450": "img/fabrics/ricca-leather/09-600.webp",
              "src240": "img/fabrics/ricca-leather/09-160.webp",
              "hex": "#ccc7b8"
            },
            {
              "name": "Графит, винтаж",
              "src900": "img/fabrics/ricca-leather/10-1200.webp",
              "src450": "img/fabrics/ricca-leather/10-600.webp",
              "src240": "img/fabrics/ricca-leather/10-160.webp",
              "hex": "#988b83"
            },
            {
              "name": "Крем, винтаж",
              "src900": "img/fabrics/ricca-leather/11-1200.webp",
              "src450": "img/fabrics/ricca-leather/11-600.webp",
              "src240": "img/fabrics/ricca-leather/11-160.webp",
              "hex": "#d0ccbf"
            }
          ]
        }
      ]
    }
  ],
  "totalNote": "Больше 50 коллекций и 1000 цветов — в шоуруме"
};
