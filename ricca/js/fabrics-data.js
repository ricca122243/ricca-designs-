/*
 * RICCA DESIGNS — ткани для раздела «Ткани» (только самые ходовые коллекции).
 *
 * Как устроено:
 *   types        — типы ткани (Велюр, Букле, Шенилл, Замша, Экокожа), в том порядке, в каком они идут на сайте.
 *   collections  — коллекции внутри типа. У каждой:
 *     id       — короткое латинское имя (без пробелов), title — название коллекции,
 *     kind     — одна строка о материале («микровелюр», «букле»…),
 *     facts    — 2–3 коротких факта (до 8 слов), ТОЛЬКО то, что напечатано на карточке образца,
 *     texture  — крупный план ткани (img/fabrics/<тип>/<коллекция>/texture-600.webp) или null,
 *     colours  — цвета: name (простое русское название, без повторов в коллекции),
 *                src450 — квадрат 450 px, src900 — квадрат 900 px (если есть), strip — полоса (если есть),
 *                hex — средний цвет образца (для подложки, пока грузится фото).
 *
 * Как добавить коллекцию:
 *   1. Положите квадратные образцы в img/fabrics/<тип>/<коллекция>/:
 *      01-molochnyy.webp (900×900) и 01-molochnyy-450.webp (450×450); по желанию texture-600.webp.
 *   2. Скопируйте блок любой коллекции ниже (от «{» до «}»), вставьте в нужный тип и поменяйте
 *      id, title, kind, facts, texture и список colours (пути к файлам и названия цветов).
 *   3. Не больше 24 цветов: сначала светлые → тёмные нейтральные, потом цветные.
 *   4. Названия поставщиков и фабрики на сайт не пишем; рекламные слова с карточки — тоже не пишем,
 *      только цифры и проверяемые факты (циклы, плотность, уход).
 *   5. Сохраните файл и обновите страницу — проверьте, что все фото открываются.
 * Убрать коллекцию или цвет — удалите его блок целиком (вместе с запятой).
 */
window.RICCA_FABRIC_LIBRARY = {
  "types": [
    {
      "id": "velur",
      "title": "Велюр",
      "collections": [
        {
          "id": "river",
          "title": "RIVER",
          "kind": "велюр",
          "facts": [
            "145 000 циклов по Мартиндейлу",
            "Можно с животными",
            "Легко чистить"
          ],
          "texture": "img/fabrics/velur/river/texture-600.webp",
          "colours": [
            {
              "name": "Молочный",
              "src450": "img/fabrics/velur/river/01-molochnyy-450.webp",
              "src900": "img/fabrics/velur/river/01-molochnyy.webp",
              "strip": "img/fabrics/velur/river/01-molochnyy-strip.webp",
              "hex": "#eae3e3"
            },
            {
              "name": "Бежевый",
              "src450": "img/fabrics/velur/river/02-bezhevyy-450.webp",
              "src900": "img/fabrics/velur/river/02-bezhevyy.webp",
              "strip": "img/fabrics/velur/river/02-bezhevyy-strip.webp",
              "hex": "#bead9f"
            },
            {
              "name": "Светло-серый",
              "src450": "img/fabrics/velur/river/11-svetlo-seryy-450.webp",
              "src900": "img/fabrics/velur/river/11-svetlo-seryy.webp",
              "strip": "img/fabrics/velur/river/11-svetlo-seryy-strip.webp",
              "hex": "#aeadb1"
            },
            {
              "name": "Серо-бежевый",
              "src450": "img/fabrics/velur/river/03-sero-bezhevyy-450.webp",
              "src900": "img/fabrics/velur/river/03-sero-bezhevyy.webp",
              "strip": "img/fabrics/velur/river/03-sero-bezhevyy-strip.webp",
              "hex": "#b8a79c"
            },
            {
              "name": "Серый",
              "src450": "img/fabrics/velur/river/12-seryy-450.webp",
              "src900": "img/fabrics/velur/river/12-seryy.webp",
              "strip": "img/fabrics/velur/river/12-seryy-strip.webp",
              "hex": "#7c7c7e"
            },
            {
              "name": "Тёмно-серый",
              "src450": "img/fabrics/velur/river/13-temno-seryy-450.webp",
              "src900": "img/fabrics/velur/river/13-temno-seryy.webp",
              "strip": "img/fabrics/velur/river/13-temno-seryy-strip.webp",
              "hex": "#454343"
            },
            {
              "name": "Шоколадный",
              "src450": "img/fabrics/velur/river/04-shokoladnyy-450.webp",
              "src900": "img/fabrics/velur/river/04-shokoladnyy.webp",
              "strip": "img/fabrics/velur/river/04-shokoladnyy-strip.webp",
              "hex": "#4a392f"
            },
            {
              "name": "Графит",
              "src450": "img/fabrics/velur/river/14-grafit-450.webp",
              "src900": "img/fabrics/velur/river/14-grafit.webp",
              "strip": "img/fabrics/velur/river/14-grafit-strip.webp",
              "hex": "#19191e"
            },
            {
              "name": "Горчичный",
              "src450": "img/fabrics/velur/river/07-gorchichnyy-450.webp",
              "strip": "img/fabrics/velur/river/07-gorchichnyy-strip.webp",
              "hex": "#ce8333"
            },
            {
              "name": "Оливково-горчичный",
              "src450": "img/fabrics/velur/river/08-olivkovo-gorchichnyy-450.webp",
              "src900": "img/fabrics/velur/river/08-olivkovo-gorchichnyy.webp",
              "strip": "img/fabrics/velur/river/08-olivkovo-gorchichnyy-strip.webp",
              "hex": "#8b6c2e"
            },
            {
              "name": "Тёмно-оливковый",
              "src450": "img/fabrics/velur/river/09-temno-olivkovyy-450.webp",
              "src900": "img/fabrics/velur/river/09-temno-olivkovyy.webp",
              "strip": "img/fabrics/velur/river/09-temno-olivkovyy-strip.webp",
              "hex": "#37351e"
            },
            {
              "name": "Терракотовый",
              "src450": "img/fabrics/velur/river/06-terrakotovyy-450.webp",
              "src900": "img/fabrics/velur/river/06-terrakotovyy.webp",
              "strip": "img/fabrics/velur/river/06-terrakotovyy-strip.webp",
              "hex": "#a15326"
            },
            {
              "name": "Пыльно-розовый",
              "src450": "img/fabrics/velur/river/05-pylno-rozovyy-450.webp",
              "src900": "img/fabrics/velur/river/05-pylno-rozovyy.webp",
              "strip": "img/fabrics/velur/river/05-pylno-rozovyy-strip.webp",
              "hex": "#ac7c6f"
            },
            {
              "name": "Тёмно-синий",
              "src450": "img/fabrics/velur/river/10-temno-siniy-450.webp",
              "src900": "img/fabrics/velur/river/10-temno-siniy.webp",
              "strip": "img/fabrics/velur/river/10-temno-siniy-strip.webp",
              "hex": "#172135"
            }
          ]
        },
        {
          "id": "torrens-plain",
          "title": "TORRENS PLAIN",
          "kind": "микровелюр",
          "facts": [
            "Износостойкость 190 000 циклов",
            "Для владельцев животных: меньше зацепов",
            "Стирка 30 °C, химчистка"
          ],
          "texture": "img/fabrics/velur/torrens-plain/texture-600.webp",
          "colours": [
            {
              "name": "Молочный",
              "src450": "img/fabrics/velur/torrens-plain/01-molochnyy-450.webp",
              "src900": "img/fabrics/velur/torrens-plain/01-molochnyy.webp",
              "strip": "img/fabrics/velur/torrens-plain/01-molochnyy-strip.webp",
              "hex": "#e9e5db"
            },
            {
              "name": "Светло-бежевый",
              "src450": "img/fabrics/velur/torrens-plain/02-svetlo-bezhevyy-450.webp",
              "src900": "img/fabrics/velur/torrens-plain/02-svetlo-bezhevyy.webp",
              "strip": "img/fabrics/velur/torrens-plain/02-svetlo-bezhevyy-strip.webp",
              "hex": "#dad0bd"
            },
            {
              "name": "Жемчужный",
              "src450": "img/fabrics/velur/torrens-plain/09-zhemchuzhnyy-450.webp",
              "src900": "img/fabrics/velur/torrens-plain/09-zhemchuzhnyy.webp",
              "strip": "img/fabrics/velur/torrens-plain/09-zhemchuzhnyy-strip.webp",
              "hex": "#d3cbbe"
            },
            {
              "name": "Льняной",
              "src450": "img/fabrics/velur/torrens-plain/10-lnyanoy-450.webp",
              "src900": "img/fabrics/velur/torrens-plain/10-lnyanoy.webp",
              "strip": "img/fabrics/velur/torrens-plain/10-lnyanoy-strip.webp",
              "hex": "#cbbfaf"
            },
            {
              "name": "Песочный",
              "src450": "img/fabrics/velur/torrens-plain/03-pesochnyy-450.webp",
              "src900": "img/fabrics/velur/torrens-plain/03-pesochnyy.webp",
              "strip": "img/fabrics/velur/torrens-plain/03-pesochnyy-strip.webp",
              "hex": "#cbbca3"
            },
            {
              "name": "Светло-серый",
              "src450": "img/fabrics/velur/torrens-plain/08-svetlo-seryy-450.webp",
              "src900": "img/fabrics/velur/torrens-plain/08-svetlo-seryy.webp",
              "strip": "img/fabrics/velur/torrens-plain/08-svetlo-seryy-strip.webp",
              "hex": "#aca8a2"
            },
            {
              "name": "Серо-бежевый",
              "src450": "img/fabrics/velur/torrens-plain/04-sero-bezhevyy-450.webp",
              "strip": "img/fabrics/velur/torrens-plain/04-sero-bezhevyy-strip.webp",
              "hex": "#a79886"
            },
            {
              "name": "Кофейный",
              "src450": "img/fabrics/velur/torrens-plain/05-kofeynyy-450.webp",
              "strip": "img/fabrics/velur/torrens-plain/05-kofeynyy-strip.webp",
              "hex": "#846d58"
            },
            {
              "name": "Серо-коричневый",
              "src450": "img/fabrics/velur/torrens-plain/12-sero-korichnevyy-450.webp",
              "src900": "img/fabrics/velur/torrens-plain/12-sero-korichnevyy.webp",
              "strip": "img/fabrics/velur/torrens-plain/12-sero-korichnevyy-strip.webp",
              "hex": "#675d59"
            },
            {
              "name": "Тёмно-серый",
              "src450": "img/fabrics/velur/torrens-plain/11-temno-seryy-450.webp",
              "src900": "img/fabrics/velur/torrens-plain/11-temno-seryy.webp",
              "strip": "img/fabrics/velur/torrens-plain/11-temno-seryy-strip.webp",
              "hex": "#615953"
            },
            {
              "name": "Графит",
              "src450": "img/fabrics/velur/torrens-plain/13-grafit-450.webp",
              "strip": "img/fabrics/velur/torrens-plain/13-grafit-strip.webp",
              "hex": "#494950"
            },
            {
              "name": "Оливковый",
              "src450": "img/fabrics/velur/torrens-plain/07-olivkovyy-450.webp",
              "strip": "img/fabrics/velur/torrens-plain/07-olivkovyy-strip.webp",
              "hex": "#665f4c"
            },
            {
              "name": "Кирпичный",
              "src450": "img/fabrics/velur/torrens-plain/06-kirpichnyy-450.webp",
              "strip": "img/fabrics/velur/torrens-plain/06-kirpichnyy-strip.webp",
              "hex": "#5f3934"
            },
            {
              "name": "Серо-голубой",
              "src450": "img/fabrics/velur/torrens-plain/14-sero-goluboy-450.webp",
              "strip": "img/fabrics/velur/torrens-plain/14-sero-goluboy-strip.webp",
              "hex": "#8e97a7"
            }
          ]
        },
        {
          "id": "kiton",
          "title": "KITON",
          "kind": "микровелюр",
          "facts": [
            "100 000 циклов по Мартиндейлу",
            "Можно с животными",
            "Легко чистить"
          ],
          "texture": "img/fabrics/velur/kiton/texture-600.webp",
          "colours": [
            {
              "name": "Молочный",
              "src450": "img/fabrics/velur/kiton/07-molochnyy-450.webp",
              "src900": "img/fabrics/velur/kiton/07-molochnyy.webp",
              "strip": "img/fabrics/velur/kiton/07-molochnyy-strip.webp",
              "hex": "#ebe5db"
            },
            {
              "name": "Кремовый",
              "src450": "img/fabrics/velur/kiton/08-kremovyy-450.webp",
              "src900": "img/fabrics/velur/kiton/08-kremovyy.webp",
              "strip": "img/fabrics/velur/kiton/08-kremovyy-strip.webp",
              "hex": "#eddac2"
            },
            {
              "name": "Слоновая кость",
              "src450": "img/fabrics/velur/kiton/19-slonovaya-kost-450.webp",
              "src900": "img/fabrics/velur/kiton/19-slonovaya-kost.webp",
              "strip": "img/fabrics/velur/kiton/19-slonovaya-kost-strip.webp",
              "hex": "#ddd5c3"
            },
            {
              "name": "Светло-серый",
              "src450": "img/fabrics/velur/kiton/03-svetlo-seryy-450.webp",
              "src900": "img/fabrics/velur/kiton/03-svetlo-seryy.webp",
              "strip": "img/fabrics/velur/kiton/03-svetlo-seryy-strip.webp",
              "hex": "#b2b4b7"
            },
            {
              "name": "Светло-бежевый",
              "src450": "img/fabrics/velur/kiton/23-svetlo-bezhevyy-450.webp",
              "src900": "img/fabrics/velur/kiton/23-svetlo-bezhevyy.webp",
              "strip": "img/fabrics/velur/kiton/23-svetlo-bezhevyy-strip.webp",
              "hex": "#caaf98"
            },
            {
              "name": "Серо-песочный",
              "src450": "img/fabrics/velur/kiton/20-sero-pesochnyy-450.webp",
              "src900": "img/fabrics/velur/kiton/20-sero-pesochnyy.webp",
              "strip": "img/fabrics/velur/kiton/20-sero-pesochnyy-strip.webp",
              "hex": "#b8ad97"
            },
            {
              "name": "Пепельный",
              "src450": "img/fabrics/velur/kiton/09-pepelnyy-450.webp",
              "src900": "img/fabrics/velur/kiton/09-pepelnyy.webp",
              "strip": "img/fabrics/velur/kiton/09-pepelnyy-strip.webp",
              "hex": "#b5a9a7"
            },
            {
              "name": "Бежевый",
              "src450": "img/fabrics/velur/kiton/22-bezhevyy-450.webp",
              "src900": "img/fabrics/velur/kiton/22-bezhevyy.webp",
              "strip": "img/fabrics/velur/kiton/22-bezhevyy-strip.webp",
              "hex": "#b69675"
            },
            {
              "name": "Капучино",
              "src450": "img/fabrics/velur/kiton/24-kapuchino-450.webp",
              "src900": "img/fabrics/velur/kiton/24-kapuchino.webp",
              "strip": "img/fabrics/velur/kiton/24-kapuchino-strip.webp",
              "hex": "#a58d77"
            },
            {
              "name": "Серо-коричневый",
              "src450": "img/fabrics/velur/kiton/10-sero-korichnevyy-450.webp",
              "src900": "img/fabrics/velur/kiton/10-sero-korichnevyy.webp",
              "strip": "img/fabrics/velur/kiton/10-sero-korichnevyy-strip.webp",
              "hex": "#8e837c"
            },
            {
              "name": "Серый",
              "src450": "img/fabrics/velur/kiton/11-seryy-450.webp",
              "src900": "img/fabrics/velur/kiton/11-seryy.webp",
              "strip": "img/fabrics/velur/kiton/11-seryy-strip.webp",
              "hex": "#5a5958"
            },
            {
              "name": "Тёмно-серо-коричневый",
              "src450": "img/fabrics/velur/kiton/12-temno-sero-korichnevyy-450.webp",
              "strip": "img/fabrics/velur/kiton/12-temno-sero-korichnevyy-strip.webp",
              "hex": "#4d4444"
            },
            {
              "name": "Мокко",
              "src450": "img/fabrics/velur/kiton/25-mokko-450.webp",
              "src900": "img/fabrics/velur/kiton/25-mokko.webp",
              "strip": "img/fabrics/velur/kiton/25-mokko-strip.webp",
              "hex": "#4b3e32"
            },
            {
              "name": "Графит",
              "src450": "img/fabrics/velur/kiton/13-grafit-450.webp",
              "strip": "img/fabrics/velur/kiton/13-grafit-strip.webp",
              "hex": "#2e2c2f"
            },
            {
              "name": "Шоколадный",
              "src450": "img/fabrics/velur/kiton/26-shokoladnyy-450.webp",
              "strip": "img/fabrics/velur/kiton/26-shokoladnyy-strip.webp",
              "hex": "#2c2118"
            },
            {
              "name": "Охра",
              "src450": "img/fabrics/velur/kiton/16-okhra-450.webp",
              "strip": "img/fabrics/velur/kiton/16-okhra-strip.webp",
              "hex": "#c77f31"
            },
            {
              "name": "Пыльная роза",
              "src450": "img/fabrics/velur/kiton/14-pylnaya-roza-450.webp",
              "strip": "img/fabrics/velur/kiton/14-pylnaya-roza-strip.webp",
              "hex": "#ca8377"
            },
            {
              "name": "Лавандовый",
              "src450": "img/fabrics/velur/kiton/15-lavandovyy-450.webp",
              "strip": "img/fabrics/velur/kiton/15-lavandovyy-strip.webp",
              "hex": "#786271"
            },
            {
              "name": "Изумрудный",
              "src450": "img/fabrics/velur/kiton/17-izumrudnyy-450.webp",
              "strip": "img/fabrics/velur/kiton/17-izumrudnyy-strip.webp",
              "hex": "#1d3c34"
            },
            {
              "name": "Тёмно-зелёный",
              "src450": "img/fabrics/velur/kiton/18-temno-zelenyy-450.webp",
              "strip": "img/fabrics/velur/kiton/18-temno-zelenyy-strip.webp",
              "hex": "#212723"
            },
            {
              "name": "Серо-голубой",
              "src450": "img/fabrics/velur/kiton/04-sero-goluboy-450.webp",
              "src900": "img/fabrics/velur/kiton/04-sero-goluboy.webp",
              "strip": "img/fabrics/velur/kiton/04-sero-goluboy-strip.webp",
              "hex": "#7f8490"
            },
            {
              "name": "Джинсовый",
              "src450": "img/fabrics/velur/kiton/05-dzhinsovyy-450.webp",
              "strip": "img/fabrics/velur/kiton/05-dzhinsovyy-strip.webp",
              "hex": "#586176"
            },
            {
              "name": "Петроль",
              "src450": "img/fabrics/velur/kiton/02-petrol-450.webp",
              "src900": "img/fabrics/velur/kiton/02-petrol.webp",
              "strip": "img/fabrics/velur/kiton/02-petrol-strip.webp",
              "hex": "#264b5b"
            },
            {
              "name": "Тёмно-синий",
              "src450": "img/fabrics/velur/kiton/06-temno-siniy-450.webp",
              "strip": "img/fabrics/velur/kiton/06-temno-siniy-strip.webp",
              "hex": "#0a1323"
            }
          ]
        },
        {
          "id": "alba",
          "title": "ALBA",
          "kind": "микровелюр",
          "facts": [
            "Износостойкость 90 000 циклов",
            "Для владельцев животных: меньше зацепов",
            "Защитное покрытие от загрязнений"
          ],
          "texture": null,
          "colours": [
            {
              "name": "Молочный",
              "src450": "img/fabrics/velur/alba/12-molochnyy-450.webp",
              "src900": "img/fabrics/velur/alba/12-molochnyy.webp",
              "strip": "img/fabrics/velur/alba/12-molochnyy-strip.webp",
              "hex": "#e1dacc"
            },
            {
              "name": "Сливочный",
              "src450": "img/fabrics/velur/alba/13-slivochnyy-450.webp",
              "src900": "img/fabrics/velur/alba/13-slivochnyy.webp",
              "strip": "img/fabrics/velur/alba/13-slivochnyy-strip.webp",
              "hex": "#d8cfb8"
            },
            {
              "name": "Светло-бежевый",
              "src450": "img/fabrics/velur/alba/01-svetlo-bezhevyy-450.webp",
              "src900": "img/fabrics/velur/alba/01-svetlo-bezhevyy.webp",
              "strip": "img/fabrics/velur/alba/01-svetlo-bezhevyy-strip.webp",
              "hex": "#c5bead"
            },
            {
              "name": "Ванильный",
              "src450": "img/fabrics/velur/alba/14-vanilnyy-450.webp",
              "src900": "img/fabrics/velur/alba/14-vanilnyy.webp",
              "strip": "img/fabrics/velur/alba/14-vanilnyy-strip.webp",
              "hex": "#c9b999"
            },
            {
              "name": "Серо-бежевый",
              "src450": "img/fabrics/velur/alba/03-sero-bezhevyy-450.webp",
              "src900": "img/fabrics/velur/alba/03-sero-bezhevyy.webp",
              "strip": "img/fabrics/velur/alba/03-sero-bezhevyy-strip.webp",
              "hex": "#bbb5aa"
            },
            {
              "name": "Песочный",
              "src450": "img/fabrics/velur/alba/15-pesochnyy-450.webp",
              "src900": "img/fabrics/velur/alba/15-pesochnyy.webp",
              "strip": "img/fabrics/velur/alba/15-pesochnyy-strip.webp",
              "hex": "#b8a98d"
            },
            {
              "name": "Бежевый",
              "src450": "img/fabrics/velur/alba/02-bezhevyy-450.webp",
              "src900": "img/fabrics/velur/alba/02-bezhevyy.webp",
              "strip": "img/fabrics/velur/alba/02-bezhevyy-strip.webp",
              "hex": "#b2a893"
            },
            {
              "name": "Светло-серый",
              "src450": "img/fabrics/velur/alba/04-svetlo-seryy-450.webp",
              "src900": "img/fabrics/velur/alba/04-svetlo-seryy.webp",
              "strip": "img/fabrics/velur/alba/04-svetlo-seryy-strip.webp",
              "hex": "#a19d95"
            },
            {
              "name": "Серый",
              "src450": "img/fabrics/velur/alba/05-seryy-450.webp",
              "src900": "img/fabrics/velur/alba/05-seryy.webp",
              "strip": "img/fabrics/velur/alba/05-seryy-strip.webp",
              "hex": "#777571"
            },
            {
              "name": "Капучино",
              "src450": "img/fabrics/velur/alba/22-kapuchino-450.webp",
              "src900": "img/fabrics/velur/alba/22-kapuchino.webp",
              "strip": "img/fabrics/velur/alba/22-kapuchino-strip.webp",
              "hex": "#755e4c"
            },
            {
              "name": "Графит",
              "src450": "img/fabrics/velur/alba/06-grafit-450.webp",
              "src900": "img/fabrics/velur/alba/06-grafit.webp",
              "strip": "img/fabrics/velur/alba/06-grafit-strip.webp",
              "hex": "#403a35"
            },
            {
              "name": "Коричневый",
              "src450": "img/fabrics/velur/alba/07-korichnevyy-450.webp",
              "src900": "img/fabrics/velur/alba/07-korichnevyy.webp",
              "strip": "img/fabrics/velur/alba/07-korichnevyy-strip.webp",
              "hex": "#413323"
            },
            {
              "name": "Тёмный шоколад",
              "src450": "img/fabrics/velur/alba/08-temnyy-shokolad-450.webp",
              "src900": "img/fabrics/velur/alba/08-temnyy-shokolad.webp",
              "strip": "img/fabrics/velur/alba/08-temnyy-shokolad-strip.webp",
              "hex": "#2a2016"
            },
            {
              "name": "Горчичный",
              "src450": "img/fabrics/velur/alba/09-gorchichnyy-450.webp",
              "src900": "img/fabrics/velur/alba/09-gorchichnyy.webp",
              "strip": "img/fabrics/velur/alba/09-gorchichnyy-strip.webp",
              "hex": "#9a7a35"
            },
            {
              "name": "Шалфей",
              "src450": "img/fabrics/velur/alba/16-shalfey-450.webp",
              "src900": "img/fabrics/velur/alba/16-shalfey.webp",
              "strip": "img/fabrics/velur/alba/16-shalfey-strip.webp",
              "hex": "#968f6f"
            },
            {
              "name": "Оливковый",
              "src450": "img/fabrics/velur/alba/17-olivkovyy-450.webp",
              "src900": "img/fabrics/velur/alba/17-olivkovyy.webp",
              "strip": "img/fabrics/velur/alba/17-olivkovyy-strip.webp",
              "hex": "#4b4d38"
            },
            {
              "name": "Карамель",
              "src450": "img/fabrics/velur/alba/18-karamel-450.webp",
              "src900": "img/fabrics/velur/alba/18-karamel.webp",
              "strip": "img/fabrics/velur/alba/18-karamel-strip.webp",
              "hex": "#7f4b25"
            },
            {
              "name": "Каштановый",
              "src450": "img/fabrics/velur/alba/19-kashtanovyy-450.webp",
              "src900": "img/fabrics/velur/alba/19-kashtanovyy.webp",
              "strip": "img/fabrics/velur/alba/19-kashtanovyy-strip.webp",
              "hex": "#4f2010"
            },
            {
              "name": "Красный",
              "src450": "img/fabrics/velur/alba/20-krasnyy-450.webp",
              "src900": "img/fabrics/velur/alba/20-krasnyy.webp",
              "strip": "img/fabrics/velur/alba/20-krasnyy-strip.webp",
              "hex": "#7c221b"
            },
            {
              "name": "Пудровый",
              "src450": "img/fabrics/velur/alba/21-pudrovyy-450.webp",
              "src900": "img/fabrics/velur/alba/21-pudrovyy.webp",
              "strip": "img/fabrics/velur/alba/21-pudrovyy-strip.webp",
              "hex": "#ac8172"
            },
            {
              "name": "Морская волна",
              "src450": "img/fabrics/velur/alba/10-morskaya-volna-450.webp",
              "src900": "img/fabrics/velur/alba/10-morskaya-volna.webp",
              "strip": "img/fabrics/velur/alba/10-morskaya-volna-strip.webp",
              "hex": "#2d3f41"
            },
            {
              "name": "Петроль",
              "src450": "img/fabrics/velur/alba/11-petrol-450.webp",
              "src900": "img/fabrics/velur/alba/11-petrol.webp",
              "strip": "img/fabrics/velur/alba/11-petrol-strip.webp",
              "hex": "#1f2b2f"
            }
          ]
        },
        {
          "id": "beauty",
          "title": "BEAUTY",
          "kind": "велюр в рубчик",
          "facts": [
            "Износостойкость 100 000 циклов",
            "Плотность 320 г/м²",
            "Подходит для вакуумной упаковки"
          ],
          "texture": "img/fabrics/velur/beauty/texture-600.webp",
          "colours": [
            {
              "name": "Молочный",
              "src450": "img/fabrics/velur/beauty/15-molochnyy-450.webp",
              "src900": "img/fabrics/velur/beauty/15-molochnyy.webp",
              "strip": "img/fabrics/velur/beauty/15-molochnyy-strip.webp",
              "hex": "#e3dac4"
            },
            {
              "name": "Ванильный",
              "src450": "img/fabrics/velur/beauty/14-vanilnyy-450.webp",
              "strip": "img/fabrics/velur/beauty/14-vanilnyy-strip.webp",
              "hex": "#e3cfac"
            },
            {
              "name": "Серебристый",
              "src450": "img/fabrics/velur/beauty/08-serebristyy-450.webp",
              "src900": "img/fabrics/velur/beauty/08-serebristyy.webp",
              "strip": "img/fabrics/velur/beauty/08-serebristyy-strip.webp",
              "hex": "#d0cdc9"
            },
            {
              "name": "Жемчужный",
              "src450": "img/fabrics/velur/beauty/16-zhemchuzhnyy-450.webp",
              "src900": "img/fabrics/velur/beauty/16-zhemchuzhnyy.webp",
              "strip": "img/fabrics/velur/beauty/16-zhemchuzhnyy-strip.webp",
              "hex": "#cbc4bb"
            },
            {
              "name": "Кремовый",
              "src450": "img/fabrics/velur/beauty/11-kremovyy-450.webp",
              "src900": "img/fabrics/velur/beauty/11-kremovyy.webp",
              "strip": "img/fabrics/velur/beauty/11-kremovyy-strip.webp",
              "hex": "#d0c3a3"
            },
            {
              "name": "Серо-бежевый",
              "src450": "img/fabrics/velur/beauty/13-sero-bezhevyy-450.webp",
              "src900": "img/fabrics/velur/beauty/13-sero-bezhevyy.webp",
              "strip": "img/fabrics/velur/beauty/13-sero-bezhevyy-strip.webp",
              "hex": "#baaa92"
            },
            {
              "name": "Светло-серый",
              "src450": "img/fabrics/velur/beauty/04-svetlo-seryy-450.webp",
              "src900": "img/fabrics/velur/beauty/04-svetlo-seryy.webp",
              "strip": "img/fabrics/velur/beauty/04-svetlo-seryy-strip.webp",
              "hex": "#949186"
            },
            {
              "name": "Серый",
              "src450": "img/fabrics/velur/beauty/03-seryy-450.webp",
              "src900": "img/fabrics/velur/beauty/03-seryy.webp",
              "strip": "img/fabrics/velur/beauty/03-seryy-strip.webp",
              "hex": "#89837b"
            },
            {
              "name": "Светлый серо-зелёный",
              "src450": "img/fabrics/velur/beauty/07-svetlyy-sero-zelenyy-450.webp",
              "src900": "img/fabrics/velur/beauty/07-svetlyy-sero-zelenyy.webp",
              "strip": "img/fabrics/velur/beauty/07-svetlyy-sero-zelenyy-strip.webp",
              "hex": "#b4b3a6"
            },
            {
              "name": "Серо-зелёный",
              "src450": "img/fabrics/velur/beauty/06-sero-zelenyy-450.webp",
              "src900": "img/fabrics/velur/beauty/06-sero-zelenyy.webp",
              "strip": "img/fabrics/velur/beauty/06-sero-zelenyy-strip.webp",
              "hex": "#888c7b"
            },
            {
              "name": "Тёмно-зелёный",
              "src450": "img/fabrics/velur/beauty/05-temno-zelenyy-450.webp",
              "src900": "img/fabrics/velur/beauty/05-temno-zelenyy.webp",
              "strip": "img/fabrics/velur/beauty/05-temno-zelenyy-strip.webp",
              "hex": "#26342c"
            },
            {
              "name": "Терракотовый",
              "src450": "img/fabrics/velur/beauty/10-terrakotovyy-450.webp",
              "strip": "img/fabrics/velur/beauty/10-terrakotovyy-strip.webp",
              "hex": "#743d23"
            },
            {
              "name": "Синий",
              "src450": "img/fabrics/velur/beauty/09-siniy-450.webp",
              "src900": "img/fabrics/velur/beauty/09-siniy.webp",
              "strip": "img/fabrics/velur/beauty/09-siniy-strip.webp",
              "hex": "#2f3957"
            }
          ]
        },
        {
          "id": "torrens",
          "title": "TORRENS",
          "kind": "микровелюр с муаром",
          "facts": [
            "Износостойкость 190 000 циклов",
            "Муар скрывает следы эксплуатации",
            "Для владельцев животных: меньше зацепов"
          ],
          "texture": null,
          "colours": [
            {
              "name": "Молочный",
              "src450": "img/fabrics/velur/torrens/01-molochnyy-450.webp",
              "src900": "img/fabrics/velur/torrens/01-molochnyy.webp",
              "strip": "img/fabrics/velur/torrens/01-molochnyy-strip.webp",
              "hex": "#e3e1d6"
            },
            {
              "name": "Льняной",
              "src450": "img/fabrics/velur/torrens/09-lnyanoy-450.webp",
              "src900": "img/fabrics/velur/torrens/09-lnyanoy.webp",
              "strip": "img/fabrics/velur/torrens/09-lnyanoy-strip.webp",
              "hex": "#d4ccc0"
            },
            {
              "name": "Кремовый",
              "src450": "img/fabrics/velur/torrens/02-kremovyy-450.webp",
              "src900": "img/fabrics/velur/torrens/02-kremovyy.webp",
              "strip": "img/fabrics/velur/torrens/02-kremovyy-strip.webp",
              "hex": "#d5cab9"
            },
            {
              "name": "Светло-серый",
              "src450": "img/fabrics/velur/torrens/08-svetlo-seryy-450.webp",
              "src900": "img/fabrics/velur/torrens/08-svetlo-seryy.webp",
              "strip": "img/fabrics/velur/torrens/08-svetlo-seryy-strip.webp",
              "hex": "#c4c0bc"
            },
            {
              "name": "Бежевый",
              "src450": "img/fabrics/velur/torrens/10-bezhevyy-450.webp",
              "src900": "img/fabrics/velur/torrens/10-bezhevyy.webp",
              "strip": "img/fabrics/velur/torrens/10-bezhevyy-strip.webp",
              "hex": "#cabfb0"
            },
            {
              "name": "Песочный",
              "src450": "img/fabrics/velur/torrens/03-pesochnyy-450.webp",
              "src900": "img/fabrics/velur/torrens/03-pesochnyy.webp",
              "strip": "img/fabrics/velur/torrens/03-pesochnyy-strip.webp",
              "hex": "#c1b69f"
            },
            {
              "name": "Серо-бежевый",
              "src450": "img/fabrics/velur/torrens/04-sero-bezhevyy-450.webp",
              "src900": "img/fabrics/velur/torrens/04-sero-bezhevyy.webp",
              "strip": "img/fabrics/velur/torrens/04-sero-bezhevyy-strip.webp",
              "hex": "#a79c8b"
            },
            {
              "name": "Мокко",
              "src450": "img/fabrics/velur/torrens/05-mokko-450.webp",
              "src900": "img/fabrics/velur/torrens/05-mokko.webp",
              "strip": "img/fabrics/velur/torrens/05-mokko-strip.webp",
              "hex": "#867460"
            },
            {
              "name": "Серый",
              "src450": "img/fabrics/velur/torrens/11-seryy-450.webp",
              "src900": "img/fabrics/velur/torrens/11-seryy.webp",
              "strip": "img/fabrics/velur/torrens/11-seryy-strip.webp",
              "hex": "#77726b"
            },
            {
              "name": "Серо-коричневый",
              "src450": "img/fabrics/velur/torrens/12-sero-korichnevyy-450.webp",
              "src900": "img/fabrics/velur/torrens/12-sero-korichnevyy.webp",
              "strip": "img/fabrics/velur/torrens/12-sero-korichnevyy-strip.webp",
              "hex": "#716962"
            },
            {
              "name": "Графит",
              "src450": "img/fabrics/velur/torrens/13-grafit-450.webp",
              "src900": "img/fabrics/velur/torrens/13-grafit.webp",
              "strip": "img/fabrics/velur/torrens/13-grafit-strip.webp",
              "hex": "#5a5a5b"
            },
            {
              "name": "Оливковый",
              "src450": "img/fabrics/velur/torrens/07-olivkovyy-450.webp",
              "src900": "img/fabrics/velur/torrens/07-olivkovyy.webp",
              "strip": "img/fabrics/velur/torrens/07-olivkovyy-strip.webp",
              "hex": "#656152"
            },
            {
              "name": "Марсала",
              "src450": "img/fabrics/velur/torrens/06-marsala-450.webp",
              "src900": "img/fabrics/velur/torrens/06-marsala.webp",
              "strip": "img/fabrics/velur/torrens/06-marsala-strip.webp",
              "hex": "#694c47"
            },
            {
              "name": "Серо-голубой",
              "src450": "img/fabrics/velur/torrens/14-sero-goluboy-450.webp",
              "src900": "img/fabrics/velur/torrens/14-sero-goluboy.webp",
              "strip": "img/fabrics/velur/torrens/14-sero-goluboy-strip.webp",
              "hex": "#97a0aa"
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
          "id": "coco",
          "title": "COCO",
          "kind": "букле",
          "facts": [
            "Износостойкость 65 000 циклов",
            "Плотность 480 г/м²",
            "Лёгкая чистка и уход"
          ],
          "texture": "img/fabrics/bukle/coco/texture-600.webp",
          "colours": [
            {
              "name": "Молочный",
              "src450": "img/fabrics/bukle/coco/01-molochnyy-450.webp",
              "src900": "img/fabrics/bukle/coco/01-molochnyy.webp",
              "strip": "img/fabrics/bukle/coco/01-molochnyy-strip.webp",
              "hex": "#ece8e3"
            },
            {
              "name": "Кремовый",
              "src450": "img/fabrics/bukle/coco/02-kremovyy-450.webp",
              "src900": "img/fabrics/bukle/coco/02-kremovyy.webp",
              "strip": "img/fabrics/bukle/coco/02-kremovyy-strip.webp",
              "hex": "#e7dfc5"
            },
            {
              "name": "Светло-серый",
              "src450": "img/fabrics/bukle/coco/09-svetlo-seryy-450.webp",
              "src900": "img/fabrics/bukle/coco/09-svetlo-seryy.webp",
              "strip": "img/fabrics/bukle/coco/09-svetlo-seryy-strip.webp",
              "hex": "#abaaa6"
            },
            {
              "name": "Серо-бежевый",
              "src450": "img/fabrics/bukle/coco/03-sero-bezhevyy-450.webp",
              "src900": "img/fabrics/bukle/coco/03-sero-bezhevyy.webp",
              "strip": "img/fabrics/bukle/coco/03-sero-bezhevyy-strip.webp",
              "hex": "#ad9979"
            },
            {
              "name": "Серый",
              "src450": "img/fabrics/bukle/coco/10-seryy-450.webp",
              "src900": "img/fabrics/bukle/coco/10-seryy.webp",
              "strip": "img/fabrics/bukle/coco/10-seryy-strip.webp",
              "hex": "#908e8c"
            },
            {
              "name": "Тёмно-серый",
              "src450": "img/fabrics/bukle/coco/11-temno-seryy-450.webp",
              "src900": "img/fabrics/bukle/coco/11-temno-seryy.webp",
              "strip": "img/fabrics/bukle/coco/11-temno-seryy-strip.webp",
              "hex": "#676a6f"
            },
            {
              "name": "Шоколадный",
              "src450": "img/fabrics/bukle/coco/12-shokoladnyy-450.webp",
              "src900": "img/fabrics/bukle/coco/12-shokoladnyy.webp",
              "strip": "img/fabrics/bukle/coco/12-shokoladnyy-strip.webp",
              "hex": "#3f3939"
            },
            {
              "name": "Горчичный",
              "src450": "img/fabrics/bukle/coco/04-gorchichnyy-450.webp",
              "src900": "img/fabrics/bukle/coco/04-gorchichnyy.webp",
              "strip": "img/fabrics/bukle/coco/04-gorchichnyy-strip.webp",
              "hex": "#cda043"
            },
            {
              "name": "Тёмно-горчичный",
              "src450": "img/fabrics/bukle/coco/05-temno-gorchichnyy-450.webp",
              "src900": "img/fabrics/bukle/coco/05-temno-gorchichnyy.webp",
              "strip": "img/fabrics/bukle/coco/05-temno-gorchichnyy-strip.webp",
              "hex": "#9c7733"
            },
            {
              "name": "Фисташковый",
              "src450": "img/fabrics/bukle/coco/07-fistashkovyy-450.webp",
              "src900": "img/fabrics/bukle/coco/07-fistashkovyy.webp",
              "strip": "img/fabrics/bukle/coco/07-fistashkovyy-strip.webp",
              "hex": "#c7bf7b"
            },
            {
              "name": "Терракотовый",
              "src450": "img/fabrics/bukle/coco/06-terrakotovyy-450.webp",
              "src900": "img/fabrics/bukle/coco/06-terrakotovyy.webp",
              "strip": "img/fabrics/bukle/coco/06-terrakotovyy-strip.webp",
              "hex": "#bb783c"
            },
            {
              "name": "Серо-зелёный",
              "src450": "img/fabrics/bukle/coco/08-sero-zelenyy-450.webp",
              "src900": "img/fabrics/bukle/coco/08-sero-zelenyy.webp",
              "strip": "img/fabrics/bukle/coco/08-sero-zelenyy-strip.webp",
              "hex": "#85978e"
            },
            {
              "name": "Тёмно-зелёный",
              "src450": "img/fabrics/bukle/coco/13-temno-zelenyy-450.webp",
              "src900": "img/fabrics/bukle/coco/13-temno-zelenyy.webp",
              "strip": "img/fabrics/bukle/coco/13-temno-zelenyy-strip.webp",
              "hex": "#2a312f"
            },
            {
              "name": "Петроль",
              "src450": "img/fabrics/bukle/coco/14-petrol-450.webp",
              "src900": "img/fabrics/bukle/coco/14-petrol.webp",
              "strip": "img/fabrics/bukle/coco/14-petrol-strip.webp",
              "hex": "#2e4861"
            },
            {
              "name": "Синий",
              "src450": "img/fabrics/bukle/coco/15-siniy-450.webp",
              "src900": "img/fabrics/bukle/coco/15-siniy.webp",
              "strip": "img/fabrics/bukle/coco/15-siniy-strip.webp",
              "hex": "#313e5c"
            },
            {
              "name": "Бордовый",
              "src450": "img/fabrics/bukle/coco/16-bordovyy-450.webp",
              "src900": "img/fabrics/bukle/coco/16-bordovyy.webp",
              "strip": "img/fabrics/bukle/coco/16-bordovyy-strip.webp",
              "hex": "#37151d"
            }
          ]
        },
        {
          "id": "pique",
          "title": "PIQUE",
          "kind": "букле",
          "facts": [
            "Износостойкость 50 000 циклов",
            "Плотность 500 г/м²",
            "Для любых форм мебели"
          ],
          "texture": "img/fabrics/bukle/pique/texture-600.webp",
          "colours": [
            {
              "name": "Молочный",
              "src450": "img/fabrics/bukle/pique/01-molochnyy-450.webp",
              "strip": "img/fabrics/bukle/pique/01-molochnyy-strip.webp",
              "hex": "#e2dbce"
            },
            {
              "name": "Кремовый",
              "src450": "img/fabrics/bukle/pique/02-kremovyy-450.webp",
              "strip": "img/fabrics/bukle/pique/02-kremovyy-strip.webp",
              "hex": "#e0d4bd"
            },
            {
              "name": "Светло-серо-бежевый",
              "src450": "img/fabrics/bukle/pique/10-svetlo-sero-bezhevyy-450.webp",
              "src900": "img/fabrics/bukle/pique/10-svetlo-sero-bezhevyy.webp",
              "strip": "img/fabrics/bukle/pique/10-svetlo-sero-bezhevyy-strip.webp",
              "hex": "#bdbaaa"
            },
            {
              "name": "Песочный",
              "src450": "img/fabrics/bukle/pique/03-pesochnyy-450.webp",
              "strip": "img/fabrics/bukle/pique/03-pesochnyy-strip.webp",
              "hex": "#b3a68e"
            },
            {
              "name": "Светло-серый",
              "src450": "img/fabrics/bukle/pique/04-svetlo-seryy-450.webp",
              "strip": "img/fabrics/bukle/pique/04-svetlo-seryy-strip.webp",
              "hex": "#a79d91"
            },
            {
              "name": "Серый",
              "src450": "img/fabrics/bukle/pique/11-seryy-450.webp",
              "src900": "img/fabrics/bukle/pique/11-seryy.webp",
              "strip": "img/fabrics/bukle/pique/11-seryy-strip.webp",
              "hex": "#94928a"
            },
            {
              "name": "Тёмно-бежевый",
              "src450": "img/fabrics/bukle/pique/06-temno-bezhevyy-450.webp",
              "src900": "img/fabrics/bukle/pique/06-temno-bezhevyy.webp",
              "strip": "img/fabrics/bukle/pique/06-temno-bezhevyy-strip.webp",
              "hex": "#9b8b74"
            },
            {
              "name": "Тёмно-серый",
              "src450": "img/fabrics/bukle/pique/12-temno-seryy-450.webp",
              "src900": "img/fabrics/bukle/pique/12-temno-seryy.webp",
              "strip": "img/fabrics/bukle/pique/12-temno-seryy-strip.webp",
              "hex": "#736f6a"
            },
            {
              "name": "Серо-коричневый",
              "src450": "img/fabrics/bukle/pique/05-sero-korichnevyy-450.webp",
              "src900": "img/fabrics/bukle/pique/05-sero-korichnevyy.webp",
              "strip": "img/fabrics/bukle/pique/05-sero-korichnevyy-strip.webp",
              "hex": "#6c6659"
            },
            {
              "name": "Графитовый",
              "src450": "img/fabrics/bukle/pique/13-grafitovyy-450.webp",
              "src900": "img/fabrics/bukle/pique/13-grafitovyy.webp",
              "strip": "img/fabrics/bukle/pique/13-grafitovyy-strip.webp",
              "hex": "#656663"
            },
            {
              "name": "Антрацит",
              "src450": "img/fabrics/bukle/pique/14-antratsit-450.webp",
              "src900": "img/fabrics/bukle/pique/14-antratsit.webp",
              "strip": "img/fabrics/bukle/pique/14-antratsit-strip.webp",
              "hex": "#464644"
            },
            {
              "name": "Шалфейный",
              "src450": "img/fabrics/bukle/pique/07-shalfeynyy-450.webp",
              "strip": "img/fabrics/bukle/pique/07-shalfeynyy-strip.webp",
              "hex": "#7b7a66"
            },
            {
              "name": "Бутылочно-зелёный",
              "src450": "img/fabrics/bukle/pique/08-butylochno-zelenyy-450.webp",
              "src900": "img/fabrics/bukle/pique/08-butylochno-zelenyy.webp",
              "strip": "img/fabrics/bukle/pique/08-butylochno-zelenyy-strip.webp",
              "hex": "#455250"
            },
            {
              "name": "Синий",
              "src450": "img/fabrics/bukle/pique/09-siniy-450.webp",
              "src900": "img/fabrics/bukle/pique/09-siniy.webp",
              "strip": "img/fabrics/bukle/pique/09-siniy-strip.webp",
              "hex": "#38455b"
            }
          ]
        },
        {
          "id": "historiya",
          "title": "HISTORIYA",
          "kind": "букле",
          "facts": [
            "Более 100 000 циклов по Мартиндейлу",
            "Плотность 540 г/м²",
            "Антивандальная"
          ],
          "texture": "img/fabrics/bukle/historiya/texture-600.webp",
          "colours": [
            {
              "name": "Кремовый",
              "src450": "img/fabrics/bukle/historiya/09-kremovyy-450.webp",
              "src900": "img/fabrics/bukle/historiya/09-kremovyy.webp",
              "strip": "img/fabrics/bukle/historiya/09-kremovyy-strip.webp",
              "hex": "#c0bcb1"
            },
            {
              "name": "Молочный",
              "src450": "img/fabrics/bukle/historiya/10-molochnyy-450.webp",
              "src900": "img/fabrics/bukle/historiya/10-molochnyy.webp",
              "strip": "img/fabrics/bukle/historiya/10-molochnyy-strip.webp",
              "hex": "#bcbab4"
            },
            {
              "name": "Серо-бежевый",
              "src450": "img/fabrics/bukle/historiya/08-sero-bezhevyy-450.webp",
              "src900": "img/fabrics/bukle/historiya/08-sero-bezhevyy.webp",
              "strip": "img/fabrics/bukle/historiya/08-sero-bezhevyy-strip.webp",
              "hex": "#aba598"
            },
            {
              "name": "Светло-серый",
              "src450": "img/fabrics/bukle/historiya/03-svetlo-seryy-450.webp",
              "src900": "img/fabrics/bukle/historiya/03-svetlo-seryy.webp",
              "strip": "img/fabrics/bukle/historiya/03-svetlo-seryy-strip.webp",
              "hex": "#979896"
            },
            {
              "name": "Тёмно-серый",
              "src450": "img/fabrics/bukle/historiya/02-temno-seryy-450.webp",
              "src900": "img/fabrics/bukle/historiya/02-temno-seryy.webp",
              "strip": "img/fabrics/bukle/historiya/02-temno-seryy-strip.webp",
              "hex": "#696a6b"
            },
            {
              "name": "Горчичный",
              "src450": "img/fabrics/bukle/historiya/06-gorchichnyy-450.webp",
              "src900": "img/fabrics/bukle/historiya/06-gorchichnyy.webp",
              "strip": "img/fabrics/bukle/historiya/06-gorchichnyy-strip.webp",
              "hex": "#8d7a59"
            },
            {
              "name": "Терракота",
              "src450": "img/fabrics/bukle/historiya/05-terrakota-450.webp",
              "src900": "img/fabrics/bukle/historiya/05-terrakota.webp",
              "strip": "img/fabrics/bukle/historiya/05-terrakota-strip.webp",
              "hex": "#61544d"
            },
            {
              "name": "Серо-зелёный",
              "src450": "img/fabrics/bukle/historiya/07-sero-zelenyy-450.webp",
              "src900": "img/fabrics/bukle/historiya/07-sero-zelenyy.webp",
              "strip": "img/fabrics/bukle/historiya/07-sero-zelenyy-strip.webp",
              "hex": "#858177"
            },
            {
              "name": "Серо-оливковый",
              "src450": "img/fabrics/bukle/historiya/04-sero-olivkovyy-450.webp",
              "src900": "img/fabrics/bukle/historiya/04-sero-olivkovyy.webp",
              "strip": "img/fabrics/bukle/historiya/04-sero-olivkovyy-strip.webp",
              "hex": "#696760"
            },
            {
              "name": "Тёмно-синий",
              "src450": "img/fabrics/bukle/historiya/01-temno-siniy-450.webp",
              "src900": "img/fabrics/bukle/historiya/01-temno-siniy.webp",
              "strip": "img/fabrics/bukle/historiya/01-temno-siniy-strip.webp",
              "hex": "#24272e"
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
            "Износостойкость 100 000 циклов",
            "Плотность 420 г/м²",
            "Для любых форм мебели"
          ],
          "texture": "img/fabrics/shenill/lucky/texture-600.webp",
          "colours": [
            {
              "name": "Молочный",
              "src450": "img/fabrics/shenill/lucky/01-molochnyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/01-molochnyy.webp",
              "strip": "img/fabrics/shenill/lucky/01-molochnyy-strip.webp",
              "hex": "#f7eed6"
            },
            {
              "name": "Кремовый",
              "src450": "img/fabrics/shenill/lucky/02-kremovyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/02-kremovyy.webp",
              "strip": "img/fabrics/shenill/lucky/02-kremovyy-strip.webp",
              "hex": "#d6c9b3"
            },
            {
              "name": "Светло-песочный",
              "src450": "img/fabrics/shenill/lucky/03-svetlo-pesochnyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/03-svetlo-pesochnyy.webp",
              "strip": "img/fabrics/shenill/lucky/03-svetlo-pesochnyy-strip.webp",
              "hex": "#c4b399"
            },
            {
              "name": "Песочный",
              "src450": "img/fabrics/shenill/lucky/04-pesochnyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/04-pesochnyy.webp",
              "strip": "img/fabrics/shenill/lucky/04-pesochnyy-strip.webp",
              "hex": "#b19c7e"
            },
            {
              "name": "Серо-бежевый",
              "src450": "img/fabrics/shenill/lucky/06-sero-bezhevyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/06-sero-bezhevyy.webp",
              "strip": "img/fabrics/shenill/lucky/06-sero-bezhevyy-strip.webp",
              "hex": "#968979"
            },
            {
              "name": "Тёмно-бежевый",
              "src450": "img/fabrics/shenill/lucky/05-temno-bezhevyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/05-temno-bezhevyy.webp",
              "strip": "img/fabrics/shenill/lucky/05-temno-bezhevyy-strip.webp",
              "hex": "#8e7c66"
            },
            {
              "name": "Серый",
              "src450": "img/fabrics/shenill/lucky/19-svetlo-seryy-450.webp",
              "src900": "img/fabrics/shenill/lucky/19-svetlo-seryy.webp",
              "strip": "img/fabrics/shenill/lucky/19-svetlo-seryy-strip.webp",
              "hex": "#787672"
            },
            {
              "name": "Стальной",
              "src450": "img/fabrics/shenill/lucky/15-stalnoy-450.webp",
              "src900": "img/fabrics/shenill/lucky/15-stalnoy.webp",
              "strip": "img/fabrics/shenill/lucky/15-stalnoy-strip.webp",
              "hex": "#494a4a"
            },
            {
              "name": "Коричневый",
              "src450": "img/fabrics/shenill/lucky/07-korichnevyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/07-korichnevyy.webp",
              "strip": "img/fabrics/shenill/lucky/07-korichnevyy-strip.webp",
              "hex": "#3a2c20"
            },
            {
              "name": "Графит",
              "src450": "img/fabrics/shenill/lucky/21-temno-seryy-450.webp",
              "src900": "img/fabrics/shenill/lucky/21-temno-seryy.webp",
              "strip": "img/fabrics/shenill/lucky/21-temno-seryy-strip.webp",
              "hex": "#272725"
            },
            {
              "name": "Тёмно-коричневый",
              "src450": "img/fabrics/shenill/lucky/08-temno-korichnevyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/08-temno-korichnevyy.webp",
              "strip": "img/fabrics/shenill/lucky/08-temno-korichnevyy-strip.webp",
              "hex": "#29231f"
            },
            {
              "name": "Пудровый",
              "src450": "img/fabrics/shenill/lucky/18-pudrovyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/18-pudrovyy.webp",
              "strip": "img/fabrics/shenill/lucky/18-pudrovyy-strip.webp",
              "hex": "#bc9d8f"
            },
            {
              "name": "Рыжий",
              "src450": "img/fabrics/shenill/lucky/12-ryzhiy-450.webp",
              "src900": "img/fabrics/shenill/lucky/12-ryzhiy.webp",
              "strip": "img/fabrics/shenill/lucky/12-ryzhiy-strip.webp",
              "hex": "#814e1e"
            },
            {
              "name": "Кирпичный",
              "src450": "img/fabrics/shenill/lucky/13-kirpichnyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/13-kirpichnyy.webp",
              "strip": "img/fabrics/shenill/lucky/13-kirpichnyy-strip.webp",
              "hex": "#53221d"
            },
            {
              "name": "Шалфейный",
              "src450": "img/fabrics/shenill/lucky/09-shalfeynyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/09-shalfeynyy.webp",
              "strip": "img/fabrics/shenill/lucky/09-shalfeynyy-strip.webp",
              "hex": "#9c9b86"
            },
            {
              "name": "Оливковый",
              "src450": "img/fabrics/shenill/lucky/11-olivkovyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/11-olivkovyy.webp",
              "strip": "img/fabrics/shenill/lucky/11-olivkovyy-strip.webp",
              "hex": "#323224"
            },
            {
              "name": "Тёмно-зелёный",
              "src450": "img/fabrics/shenill/lucky/10-temno-zelenyy-450.webp",
              "src900": "img/fabrics/shenill/lucky/10-temno-zelenyy.webp",
              "strip": "img/fabrics/shenill/lucky/10-temno-zelenyy-strip.webp",
              "hex": "#20241d"
            },
            {
              "name": "Морская волна",
              "src450": "img/fabrics/shenill/lucky/14-morskaya-volna-450.webp",
              "src900": "img/fabrics/shenill/lucky/14-morskaya-volna.webp",
              "strip": "img/fabrics/shenill/lucky/14-morskaya-volna-strip.webp",
              "hex": "#1c313c"
            },
            {
              "name": "Тёмно-синий",
              "src450": "img/fabrics/shenill/lucky/17-temno-siniy-450.webp",
              "src900": "img/fabrics/shenill/lucky/17-temno-siniy.webp",
              "strip": "img/fabrics/shenill/lucky/17-temno-siniy-strip.webp",
              "hex": "#252a31"
            }
          ]
        },
        {
          "id": "molly",
          "title": "MOLLY",
          "kind": "шенилл",
          "facts": [
            "Износостойкость 80 000 циклов",
            "Плотность 430 г/м²",
            "Дышащий материал"
          ],
          "texture": "img/fabrics/shenill/molly/texture-600.webp",
          "colours": [
            {
              "name": "Молочный",
              "src450": "img/fabrics/shenill/molly/02-molochnyy-450.webp",
              "src900": "img/fabrics/shenill/molly/02-molochnyy.webp",
              "strip": "img/fabrics/shenill/molly/02-molochnyy-strip.webp",
              "hex": "#ddd6bf"
            },
            {
              "name": "Кремовый",
              "src450": "img/fabrics/shenill/molly/03-kremovyy-450.webp",
              "src900": "img/fabrics/shenill/molly/03-kremovyy.webp",
              "strip": "img/fabrics/shenill/molly/03-kremovyy-strip.webp",
              "hex": "#cdbfa6"
            },
            {
              "name": "Светло-серый",
              "src450": "img/fabrics/shenill/molly/17-svetlo-seryy-450.webp",
              "src900": "img/fabrics/shenill/molly/17-svetlo-seryy.webp",
              "strip": "img/fabrics/shenill/molly/17-svetlo-seryy-strip.webp",
              "hex": "#c1bdb9"
            },
            {
              "name": "Песочный",
              "src450": "img/fabrics/shenill/molly/04-pesochnyy-450.webp",
              "src900": "img/fabrics/shenill/molly/04-pesochnyy.webp",
              "strip": "img/fabrics/shenill/molly/04-pesochnyy-strip.webp",
              "hex": "#b9ab96"
            },
            {
              "name": "Серо-бежевый",
              "src450": "img/fabrics/shenill/molly/18-sero-bezhevyy-450.webp",
              "src900": "img/fabrics/shenill/molly/18-sero-bezhevyy.webp",
              "strip": "img/fabrics/shenill/molly/18-sero-bezhevyy-strip.webp",
              "hex": "#b1aaa5"
            },
            {
              "name": "Серый",
              "src450": "img/fabrics/shenill/molly/16-seryy-450.webp",
              "src900": "img/fabrics/shenill/molly/16-seryy.webp",
              "strip": "img/fabrics/shenill/molly/16-seryy-strip.webp",
              "hex": "#9a9893"
            },
            {
              "name": "Хаки",
              "src450": "img/fabrics/shenill/molly/05-khaki-450.webp",
              "src900": "img/fabrics/shenill/molly/05-khaki.webp",
              "strip": "img/fabrics/shenill/molly/05-khaki-strip.webp",
              "hex": "#92836b"
            },
            {
              "name": "Тёмно-серый",
              "src450": "img/fabrics/shenill/molly/20-temno-seryy-450.webp",
              "src900": "img/fabrics/shenill/molly/20-temno-seryy.webp",
              "strip": "img/fabrics/shenill/molly/20-temno-seryy-strip.webp",
              "hex": "#736f6c"
            },
            {
              "name": "Серо-оливковый",
              "src450": "img/fabrics/shenill/molly/06-sero-olivkovyy-450.webp",
              "src900": "img/fabrics/shenill/molly/06-sero-olivkovyy.webp",
              "strip": "img/fabrics/shenill/molly/06-sero-olivkovyy-strip.webp",
              "hex": "#726759"
            },
            {
              "name": "Графит",
              "src450": "img/fabrics/shenill/molly/21-grafit-450.webp",
              "src900": "img/fabrics/shenill/molly/21-grafit.webp",
              "strip": "img/fabrics/shenill/molly/21-grafit-strip.webp",
              "hex": "#605c59"
            },
            {
              "name": "Горчичный",
              "src450": "img/fabrics/shenill/molly/11-gorchichnyy-450.webp",
              "strip": "img/fabrics/shenill/molly/11-gorchichnyy-strip.webp",
              "hex": "#c18d38"
            },
            {
              "name": "Рыже-коричневый",
              "src450": "img/fabrics/shenill/molly/07-ryzhe-korichnevyy-450.webp",
              "src900": "img/fabrics/shenill/molly/07-ryzhe-korichnevyy.webp",
              "strip": "img/fabrics/shenill/molly/07-ryzhe-korichnevyy-strip.webp",
              "hex": "#754932"
            },
            {
              "name": "Терракотовый",
              "src450": "img/fabrics/shenill/molly/09-terrakotovyy-450.webp",
              "src900": "img/fabrics/shenill/molly/09-terrakotovyy.webp",
              "strip": "img/fabrics/shenill/molly/09-terrakotovyy-strip.webp",
              "hex": "#89402e"
            },
            {
              "name": "Пыльно-розовый",
              "src450": "img/fabrics/shenill/molly/10-pylno-rozovyy-450.webp",
              "src900": "img/fabrics/shenill/molly/10-pylno-rozovyy.webp",
              "strip": "img/fabrics/shenill/molly/10-pylno-rozovyy-strip.webp",
              "hex": "#a9796d"
            },
            {
              "name": "Тёмно-оливковый",
              "src450": "img/fabrics/shenill/molly/13-temno-olivkovyy-450.webp",
              "src900": "img/fabrics/shenill/molly/13-temno-olivkovyy.webp",
              "strip": "img/fabrics/shenill/molly/13-temno-olivkovyy-strip.webp",
              "hex": "#383428"
            },
            {
              "name": "Тёмно-зелёный",
              "src450": "img/fabrics/shenill/molly/14-temno-zelenyy-450.webp",
              "src900": "img/fabrics/shenill/molly/14-temno-zelenyy.webp",
              "strip": "img/fabrics/shenill/molly/14-temno-zelenyy-strip.webp",
              "hex": "#36403d"
            },
            {
              "name": "Тёмно-синий",
              "src450": "img/fabrics/shenill/molly/12-temno-siniy-450.webp",
              "src900": "img/fabrics/shenill/molly/12-temno-siniy.webp",
              "strip": "img/fabrics/shenill/molly/12-temno-siniy-strip.webp",
              "hex": "#1e202f"
            }
          ]
        },
        {
          "id": "sambia",
          "title": "САМБИЯ",
          "kind": "шенилл",
          "facts": [
            "Износостойкость 70 000 циклов",
            "Вес 460 г/м.п.",
            "Простой уход: мыльный раствор"
          ],
          "texture": "img/fabrics/shenill/sambia/texture-600.webp",
          "colours": [
            {
              "name": "Слоновая кость",
              "src450": "img/fabrics/shenill/sambia/07-slonovaya-kost-450.webp",
              "src900": "img/fabrics/shenill/sambia/07-slonovaya-kost.webp",
              "strip": "img/fabrics/shenill/sambia/07-slonovaya-kost-strip.webp",
              "hex": "#f2eedf"
            },
            {
              "name": "Молочный",
              "src450": "img/fabrics/shenill/sambia/01-molochnyy-450.webp",
              "src900": "img/fabrics/shenill/sambia/01-molochnyy.webp",
              "strip": "img/fabrics/shenill/sambia/01-molochnyy-strip.webp",
              "hex": "#e3e1db"
            },
            {
              "name": "Кремовый",
              "src450": "img/fabrics/shenill/sambia/08-kremovyy-450.webp",
              "src900": "img/fabrics/shenill/sambia/08-kremovyy.webp",
              "strip": "img/fabrics/shenill/sambia/08-kremovyy-strip.webp",
              "hex": "#ddd4c3"
            },
            {
              "name": "Светло-серый",
              "src450": "img/fabrics/shenill/sambia/02-svetlo-seryy-450.webp",
              "src900": "img/fabrics/shenill/sambia/02-svetlo-seryy.webp",
              "strip": "img/fabrics/shenill/sambia/02-svetlo-seryy-strip.webp",
              "hex": "#c8c6c0"
            },
            {
              "name": "Серо-бежевый",
              "src450": "img/fabrics/shenill/sambia/09-sero-bezhevyy-450.webp",
              "src900": "img/fabrics/shenill/sambia/09-sero-bezhevyy.webp",
              "strip": "img/fabrics/shenill/sambia/09-sero-bezhevyy-strip.webp",
              "hex": "#9c9182"
            },
            {
              "name": "Серый",
              "src450": "img/fabrics/shenill/sambia/03-seryy-450.webp",
              "src900": "img/fabrics/shenill/sambia/03-seryy.webp",
              "strip": "img/fabrics/shenill/sambia/03-seryy-strip.webp",
              "hex": "#90918f"
            },
            {
              "name": "Тёплый серый",
              "src450": "img/fabrics/shenill/sambia/04-teplyy-seryy-450.webp",
              "src900": "img/fabrics/shenill/sambia/04-teplyy-seryy.webp",
              "strip": "img/fabrics/shenill/sambia/04-teplyy-seryy-strip.webp",
              "hex": "#87877f"
            },
            {
              "name": "Тёмно-серый",
              "src450": "img/fabrics/shenill/sambia/05-temno-seryy-450.webp",
              "src900": "img/fabrics/shenill/sambia/05-temno-seryy.webp",
              "strip": "img/fabrics/shenill/sambia/05-temno-seryy-strip.webp",
              "hex": "#454642"
            },
            {
              "name": "Графит",
              "src450": "img/fabrics/shenill/sambia/06-grafit-450.webp",
              "src900": "img/fabrics/shenill/sambia/06-grafit.webp",
              "strip": "img/fabrics/shenill/sambia/06-grafit-strip.webp",
              "hex": "#3d3a35"
            },
            {
              "name": "Карамель",
              "src450": "img/fabrics/shenill/sambia/10-karamel-450.webp",
              "src900": "img/fabrics/shenill/sambia/10-karamel.webp",
              "strip": "img/fabrics/shenill/sambia/10-karamel-strip.webp",
              "hex": "#b37d57"
            },
            {
              "name": "Кирпичный",
              "src450": "img/fabrics/shenill/sambia/11-kirpichnyy-450.webp",
              "src900": "img/fabrics/shenill/sambia/11-kirpichnyy.webp",
              "strip": "img/fabrics/shenill/sambia/11-kirpichnyy-strip.webp",
              "hex": "#663a2c"
            },
            {
              "name": "Оливковый",
              "src450": "img/fabrics/shenill/sambia/12-olivkovyy-450.webp",
              "src900": "img/fabrics/shenill/sambia/12-olivkovyy.webp",
              "strip": "img/fabrics/shenill/sambia/12-olivkovyy-strip.webp",
              "hex": "#434938"
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
            "40 000 циклов по Мартиндейлу",
            "Не мнётся и не деформируется",
            "Оттенок меняется по направлению ворса"
          ],
          "texture": null,
          "colours": [
            {
              "name": "Жемчужный",
              "src450": "img/fabrics/zamsha/timeless/001-zhemchuzhnyj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/001-zhemchuzhnyj.webp",
              "hex": "#c3bdb4"
            },
            {
              "name": "Бежевый",
              "src450": "img/fabrics/zamsha/timeless/039-bezhevyj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/039-bezhevyj.webp",
              "strip": "img/fabrics/zamsha/timeless/039-bezhevyj-strip.webp",
              "hex": "#bba98d"
            },
            {
              "name": "Льняной",
              "src450": "img/fabrics/zamsha/timeless/038-lnyanoj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/038-lnyanoj.webp",
              "strip": "img/fabrics/zamsha/timeless/038-lnyanoj-strip.webp",
              "hex": "#b1a18f"
            },
            {
              "name": "Светло-серый",
              "src450": "img/fabrics/zamsha/timeless/523-svetlo-seryj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/523-svetlo-seryj.webp",
              "strip": "img/fabrics/zamsha/timeless/523-svetlo-seryj-strip.webp",
              "hex": "#8c8a80"
            },
            {
              "name": "Серый",
              "src450": "img/fabrics/zamsha/timeless/522-seryj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/522-seryj.webp",
              "strip": "img/fabrics/zamsha/timeless/522-seryj-strip.webp",
              "hex": "#7e7b75"
            },
            {
              "name": "Серо-голубой",
              "src450": "img/fabrics/zamsha/timeless/028-sero-goluboj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/028-sero-goluboj.webp",
              "strip": "img/fabrics/zamsha/timeless/028-sero-goluboj-strip.webp",
              "hex": "#757877"
            },
            {
              "name": "Тауп",
              "src450": "img/fabrics/zamsha/timeless/004-taup-450.webp",
              "src900": "img/fabrics/zamsha/timeless/004-taup.webp",
              "strip": "img/fabrics/zamsha/timeless/004-taup-strip.webp",
              "hex": "#796e63"
            },
            {
              "name": "Хаки",
              "src450": "img/fabrics/zamsha/timeless/005-haki-450.webp",
              "src900": "img/fabrics/zamsha/timeless/005-haki.webp",
              "strip": "img/fabrics/zamsha/timeless/005-haki-strip.webp",
              "hex": "#786852"
            },
            {
              "name": "Тёмно-серый",
              "src450": "img/fabrics/zamsha/timeless/524-temno-seryj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/524-temno-seryj.webp",
              "strip": "img/fabrics/zamsha/timeless/524-temno-seryj-strip.webp",
              "hex": "#625d5b"
            },
            {
              "name": "Табачный",
              "src450": "img/fabrics/zamsha/timeless/009-tabachnyj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/009-tabachnyj.webp",
              "strip": "img/fabrics/zamsha/timeless/009-tabachnyj-strip.webp",
              "hex": "#695c4b"
            },
            {
              "name": "Мокрый асфальт",
              "src450": "img/fabrics/zamsha/timeless/101-mokryj-asfalt-450.webp",
              "src900": "img/fabrics/zamsha/timeless/101-mokryj-asfalt.webp",
              "strip": "img/fabrics/zamsha/timeless/101-mokryj-asfalt-strip.webp",
              "hex": "#43474c"
            },
            {
              "name": "Антрацит",
              "src450": "img/fabrics/zamsha/timeless/518-antracit-450.webp",
              "src900": "img/fabrics/zamsha/timeless/518-antracit.webp",
              "strip": "img/fabrics/zamsha/timeless/518-antracit-strip.webp",
              "hex": "#242625"
            },
            {
              "name": "Песочный",
              "src450": "img/fabrics/zamsha/timeless/037-peschanyj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/037-peschanyj.webp",
              "strip": "img/fabrics/zamsha/timeless/037-peschanyj-strip.webp",
              "hex": "#a88e6b"
            },
            {
              "name": "Карамельный",
              "src450": "img/fabrics/zamsha/timeless/006-karamelnyj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/006-karamelnyj.webp",
              "strip": "img/fabrics/zamsha/timeless/006-karamelnyj-strip.webp",
              "hex": "#7f6242"
            },
            {
              "name": "Корица",
              "src450": "img/fabrics/zamsha/timeless/020-korica-450.webp",
              "src900": "img/fabrics/zamsha/timeless/020-korica.webp",
              "strip": "img/fabrics/zamsha/timeless/020-korica-strip.webp",
              "hex": "#7c4f35"
            },
            {
              "name": "Какао",
              "src450": "img/fabrics/zamsha/timeless/021-kakao-450.webp",
              "src900": "img/fabrics/zamsha/timeless/021-kakao.webp",
              "strip": "img/fabrics/zamsha/timeless/021-kakao-strip.webp",
              "hex": "#816759"
            },
            {
              "name": "Мокко",
              "src450": "img/fabrics/zamsha/timeless/633-mokko-450.webp",
              "src900": "img/fabrics/zamsha/timeless/633-mokko.webp",
              "strip": "img/fabrics/zamsha/timeless/633-mokko-strip.webp",
              "hex": "#654f4c"
            },
            {
              "name": "Шоколадный",
              "src450": "img/fabrics/zamsha/timeless/008-shokoladnyj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/008-shokoladnyj.webp",
              "strip": "img/fabrics/zamsha/timeless/008-shokoladnyj-strip.webp",
              "hex": "#32261b"
            },
            {
              "name": "Пудровый",
              "src450": "img/fabrics/zamsha/timeless/032-pudrovyj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/032-pudrovyj.webp",
              "strip": "img/fabrics/zamsha/timeless/032-pudrovyj-strip.webp",
              "hex": "#b5a08f"
            },
            {
              "name": "Сливовый",
              "src450": "img/fabrics/zamsha/timeless/608-slivovyj-450.webp",
              "src900": "img/fabrics/zamsha/timeless/608-slivovyj.webp",
              "strip": "img/fabrics/zamsha/timeless/608-slivovyj-strip.webp",
              "hex": "#5e4c51"
            },
            {
              "name": "Терракота",
              "src450": "img/fabrics/zamsha/timeless/035-terrakota-450.webp",
              "src900": "img/fabrics/zamsha/timeless/035-terrakota.webp",
              "strip": "img/fabrics/zamsha/timeless/035-terrakota-strip.webp",
              "hex": "#963628"
            },
            {
              "name": "Шалфей",
              "src450": "img/fabrics/zamsha/timeless/033-shalfej-450.webp",
              "src900": "img/fabrics/zamsha/timeless/033-shalfej.webp",
              "strip": "img/fabrics/zamsha/timeless/033-shalfej-strip.webp",
              "hex": "#9a9e8c"
            },
            {
              "name": "Аквамарин",
              "src450": "img/fabrics/zamsha/timeless/034-akvamarin-450.webp",
              "src900": "img/fabrics/zamsha/timeless/034-akvamarin.webp",
              "strip": "img/fabrics/zamsha/timeless/034-akvamarin-strip.webp",
              "hex": "#85aaaf"
            },
            {
              "name": "Морская волна",
              "src450": "img/fabrics/zamsha/timeless/040-morskaya-volna-450.webp",
              "src900": "img/fabrics/zamsha/timeless/040-morskaya-volna.webp",
              "strip": "img/fabrics/zamsha/timeless/040-morskaya-volna-strip.webp",
              "hex": "#4e5b60"
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
          "id": "ekokozha-alba",
          "title": "ALBA",
          "kind": "экокожа: зернистая, гладкая, винтаж",
          "facts": [
            "150 000 циклов по Мартиндейлу",
            "Морозостойкость до −20 °C",
            "Уход: влажная мягкая ткань"
          ],
          "texture": null,
          "colours": [
            {
              "name": "Слоновая кость",
              "src450": "img/fabrics/ekokozha/gladkaya/slonovaya-kost-450.webp",
              "src900": "img/fabrics/ekokozha/gladkaya/slonovaya-kost.webp",
              "hex": "#c7c2b2",
              "finish": "гладкая"
            },
            {
              "name": "Кремовый",
              "src450": "img/fabrics/ekokozha/vintazh/krem-450.webp",
              "src900": "img/fabrics/ekokozha/vintazh/krem.webp",
              "hex": "#b9b5a5",
              "finish": "винтаж"
            },
            {
              "name": "Светло-бежевый",
              "src450": "img/fabrics/ekokozha/zernistaya/slivochnaya-2-450.webp",
              "src900": "img/fabrics/ekokozha/zernistaya/slivochnaya-2.webp",
              "hex": "#bcac92",
              "finish": "зернистая"
            },
            {
              "name": "Бежевый",
              "src450": "img/fabrics/ekokozha/gladkaya/bezhevaya-450.webp",
              "src900": "img/fabrics/ekokozha/gladkaya/bezhevaya.webp",
              "hex": "#b4a897",
              "finish": "гладкая"
            },
            {
              "name": "Мокко",
              "src450": "img/fabrics/ekokozha/zernistaya/mokko-450.webp",
              "src900": "img/fabrics/ekokozha/zernistaya/mokko.webp",
              "hex": "#856957",
              "finish": "зернистая"
            },
            {
              "name": "Графит",
              "src450": "img/fabrics/ekokozha/vintazh/grafit-450.webp",
              "src900": "img/fabrics/ekokozha/vintazh/grafit.webp",
              "hex": "#796c64",
              "finish": "винтаж"
            },
            {
              "name": "Оранжевый",
              "src450": "img/fabrics/ekokozha/zernistaya/alaya-450.webp",
              "src900": "img/fabrics/ekokozha/zernistaya/alaya.webp",
              "hex": "#b74426",
              "finish": "зернистая"
            },
            {
              "name": "Коралловый",
              "src450": "img/fabrics/ekokozha/zernistaya/korall-450.webp",
              "src900": "img/fabrics/ekokozha/zernistaya/korall.webp",
              "hex": "#b65d56",
              "finish": "зернистая"
            },
            {
              "name": "Красный",
              "src450": "img/fabrics/ekokozha/zernistaya/krasnaya-450.webp",
              "src900": "img/fabrics/ekokozha/zernistaya/krasnaya.webp",
              "hex": "#c7493c",
              "finish": "зернистая"
            }
          ]
        }
      ]
    }
  ],
  "totalNote": "Больше 50 коллекций и 1000 цветов — в шоуруме"
};
