#!/usr/bin/env python3
# Собирает ricca/en.html из ricca/index.html: та же разметка, тексты и атрибуты — на английском.
# Запуск из корня репозитория: python3 tools/gen-en.py (после любой правки index.html). Новые тексты новых блоков — в js/content-data.js (en).
import re, json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ricca')) + '/'
s = open(ROOT + 'index.html', encoding='utf-8').read()

TEXT = {
    'RICCA HoReCa&nbsp;— отели, рестораны,': 'RICCA HoReCa&nbsp;— hotels, restaurants,',
 # тексты узлов (русская строка → английская); порядок — как на странице. Неиспользуемые ключи убраны на Дне 3 вместе с разделами (новости, квиз, «Любой стиль», таблица тканей, «Влезет ли», колонки подвала)
 'Собрать в&nbsp;3D': 'Build in&nbsp;3D', 'Состав': 'What it’s made of', 'Перейти к&nbsp;содержанию': 'Skip to&nbsp;content', 'Каталог': 'Catalogue',
 'Работы': 'Works', 'Ателье': 'Atelier', 'Для бизнеса': 'For business', 'Шоурум': 'Showroom',
 'RICCA DESIGNS&nbsp;· Алматы': 'RICCA DESIGNS&nbsp;· Almaty', 'Мягкая мебель': 'Upholstered furniture', 'на&nbsp;заказ': 'made to&nbsp;order',
 'Мягкая мебель на&nbsp;заказ': 'Custom upholstered furniture',
 'Диваны, кровати и&nbsp;кресла — по&nbsp;вашему фото, эскизу или проекту. Своё ателье.': 'Sofas, beds and&nbsp;armchairs — from&nbsp;your photo, sketch or project. Our own atelier.',
 'Диван Rasma · букле': 'Rasma sofa · bouclé', 'в&nbsp;любом размере и&nbsp;ткани': 'in&nbsp;any size and&nbsp;fabric', 'Диваны': 'Sofas',
 'Кровати': 'Beds', 'Кресла': 'Armchairs', 'Пуфы и&nbsp;банкетки': 'Poufs and&nbsp;benches', 'Любой размер': 'Any size', 'Любая ткань': 'Any fabric',
 'Своё ателье в&nbsp;Алматы': 'Our own atelier in&nbsp;Almaty', 'Матрасы ELUNA': 'ELUNA mattresses',
 '— сайт ELUNA, откроется в&nbsp;новой вкладке': '— ELUNA website, opens in&nbsp;a new tab',
 'Прямые, угловые, модульные, раскладные': 'Straight, corner, modular, sofa beds',
 'С подъёмным механизмом и&nbsp;без': 'With or&nbsp;without a lift-up mechanism',
 'Для отдыха, пуфы и&nbsp;банкетки': 'Lounge chairs, poufs and&nbsp;benches', 'Ткани': 'Fabrics', 'Велюр, букле, шенилл': 'Velour, bouclé, chenille',
 'Ортопедические, на&nbsp;своём сайте': 'Orthopaedic, on&nbsp;their own website', 'Наши работы': 'Our works', 'Все работы': 'All works',
 'Отправить фото в&nbsp;WhatsApp': 'Send a photo via&nbsp;WhatsApp', 'Как заказать': 'How to order',
 'Обсудить в&nbsp;WhatsApp': 'Discuss on&nbsp;WhatsApp', 'Работаем по&nbsp;всему миру': 'We work worldwide',
 '(откроется в&nbsp;WhatsApp)': '(opens in&nbsp;WhatsApp)', 'Алматы': 'Almaty',
 'Делаем мебель сами&nbsp;— в&nbsp;своём ателье в&nbsp;Алматы.': 'We make the furniture ourselves&nbsp;— in&nbsp;our own atelier in&nbsp;Almaty.',
 'апарт-комплексы': 'apartment complexes', 'Обсудить проект': 'Discuss a project', 'Вопросы': 'Questions',
 'Можно изменить размер?': 'Can the size be changed?', 'Доставка и&nbsp;гарантия?': 'Delivery and&nbsp;warranty?',
 '(2ГИС, откроется в&nbsp;новой вкладке)': '(2GIS, opens in&nbsp;a new tab)', 'Пн–Вс': 'Mon–Sun', 'Маршрут в&nbsp;2ГИС': 'Route in&nbsp;2GIS',
 '(откроется в&nbsp;новой вкладке)': '(opens in&nbsp;a new tab)', 'Контакты': 'Contacts',
 'ул.&nbsp;Алишера Навои,&nbsp;208/2': '208/2&nbsp;Alisher Navoi&nbsp;St.',
 '— сайт матрасов, откроется в&nbsp;новой вкладке': '— mattress website, opens in&nbsp;a new tab', 'Корзина': 'Cart',
 'Написать в&nbsp;WhatsApp': 'Message on&nbsp;WhatsApp', 'Размер и&nbsp;ткань&nbsp;— под заказ.': 'Size and&nbsp;fabric&nbsp;— to order.',
 'Количество': 'Quantity', '1&nbsp;шт.': '1&nbsp;pc', 'Ткань': 'Fabric', 'Подберём вместе': "We'll choose together", 'Размер': 'Size',
 'Пожелания': 'Wishes', 'Добавить в&nbsp;корзину': 'Add to&nbsp;cart', 'Узнать цену': 'Get a price', 'в&nbsp;WhatsApp': 'on&nbsp;WhatsApp',
 'Подробнее': 'Details', 'Хочу такой': 'I want this', 'В&nbsp;корзину': 'Add to&nbsp;cart',
 'Собрать похожий в&nbsp;3D': 'Build a similar one in&nbsp;3D', 'Смотреть в&nbsp;Instagram': 'View on&nbsp;Instagram',
 'Пока пусто. Складывайте мебель и&nbsp;ткани&nbsp;— и&nbsp;отправьте заявку одним сообщением в&nbsp;WhatsApp.': 'Empty for now. Add furniture and&nbsp;fabrics&nbsp;— and&nbsp;send one request via&nbsp;WhatsApp.',
 'Смотреть каталог': 'View the catalogue', 'Для заявки&nbsp;— по&nbsp;желанию': 'For the request&nbsp;— optional', 'Имя': 'Name', 'Город': 'City',
 'Комментарий к&nbsp;заказу': 'Order comment',
 'Цены рассчитаем и&nbsp;ответим в&nbsp;WhatsApp.': "We'll quote prices and&nbsp;reply on&nbsp;WhatsApp.",
 'Заявка открыта в&nbsp;WhatsApp. Очистить корзину?': 'Request opened in&nbsp;WhatsApp. Clear the cart?', 'Очистить': 'Clear', 'Оставить': 'Keep',
 'Открыть': 'Open', 'Диваны, кровати, кресла&nbsp;— любой размер и&nbsp;ткань.': 'Sofas, beds, armchairs&nbsp;— any size and&nbsp;fabric.',
 'Готовые изделия&nbsp;— фото из&nbsp;Instagram @ricca.designs.': 'Finished pieces&nbsp;— photos from&nbsp;Instagram @ricca.designs.',
 'Соберите свою мебель в&nbsp;3D': 'Build your own furniture in&nbsp;3D',
 'Размер, ткань и&nbsp;чертёж&nbsp;— за&nbsp;минуту.': 'Size, fabric and&nbsp;a drawing&nbsp;— in&nbsp;a minute.',
 'Открыть конструктор': 'Open the configurator', 'Пришлите фото или&nbsp;эскиз': 'Send a photo or&nbsp;a sketch',
 'Согласуем размер и&nbsp;ткань': 'We agree the size and&nbsp;fabric', 'Сошьём и&nbsp;доставим': 'We make and&nbsp;deliver',
 'Каркас, раскрой, пошив, обивка, сборка&nbsp;— полный цикл.': 'Frame, cutting, sewing, upholstery, assembly&nbsp;— the full cycle.',
 'Отели, рестораны,': 'Hotels, restaurants,', 'и&nbsp;офисы.': 'and&nbsp;offices.',
 'Изготовим по&nbsp;вашему проекту, размерам и&nbsp;спецификации.': 'Made to&nbsp;your project, dimensions and&nbsp;specification.',
 'Шьём в&nbsp;Алматы&nbsp;— доставим в&nbsp;любую страну.': 'Made in&nbsp;Almaty&nbsp;— delivered to&nbsp;any country.',
 'Да. Адаптируем модель под вашу комнату&nbsp;— пришлите размеры в&nbsp;WhatsApp.': 'Yes. We adapt the model to&nbsp;your room&nbsp;— send the dimensions on&nbsp;WhatsApp.',
 'Сделаете по&nbsp;моему эскизу или фото?': 'Can you make it from&nbsp;my sketch or photo?',
 'Да. Шьём любую модель по&nbsp;фото, эскизу или дизайн-проекту.': 'Yes. We make any model from&nbsp;a photo, sketch or design project.',
 'Сколько стоит и&nbsp;какие сроки?': 'How much does it cost, and&nbsp;how long?',
 'Зависит от&nbsp;модели, размера и&nbsp;ткани. Рассчитаем в&nbsp;WhatsApp; сроки назовём после утверждения проекта.': 'It depends on&nbsp;the model, size and&nbsp;fabric. We quote on&nbsp;WhatsApp; lead times are set once the project is approved.',
 'Доставляем по&nbsp;Казахстану и&nbsp;в&nbsp;другие страны. Гарантия&nbsp;— 5&nbsp;лет.': 'We deliver across&nbsp;Kazakhstan and&nbsp;to&nbsp;other countries. Warranty&nbsp;— 5&nbsp;years.',
 'ЖК&nbsp;«Шахристан», Алматы': 'Shakhristan residential complex, Almaty',
 '© 2026 RICCA&nbsp;DESIGNS · Алматы · Все права защищены.': '© 2026 RICCA&nbsp;DESIGNS · Almaty · All rights reserved.',
    'Все права защищены. Фото, тексты, 3D-модели и&nbsp;дизайн сайта&nbsp;— собственность RICCA&nbsp;DESIGNS; копирование и&nbsp;использование без письменного разрешения запрещены.': 'All rights reserved. Photos, texts, 3D models and&nbsp;the website design are the property of&nbsp;RICCA&nbsp;DESIGNS; copying or use without written permission is prohibited.',
    'Смотреть': 'View',
    'Гарантия': 'Warranty',
    '5&nbsp;лет': '5&nbsp;years',
    'Доставка': 'Delivery',
    'Пришлите фото': 'Send a photo',
    'Собрать онлайн в&nbsp;3D': 'Build online in&nbsp;3D',
    'Заявка': 'Request',
    'Каркас': 'Frame',
    'Сборка': 'Assembly',
    'Написать мастеру': 'Message the master',
    'Приходите в&nbsp;шоурум': 'Visit the showroom',
    'Посмотрите мебель и&nbsp;образцы тканей вживую. Визит удобно согласовать в&nbsp;WhatsApp.': 'See the furniture and&nbsp;fabric samples in&nbsp;person. Arrange a visit on&nbsp;WhatsApp.',
    'г.&nbsp;Алматы, ул.&nbsp;Алишера Навои,&nbsp;208/2': 'Almaty, 208/2&nbsp;Alisher Navoi&nbsp;St.',
    'ЖК&nbsp;«Шахристан»': 'Shakhristan residential complex',
    'Записаться на&nbsp;визит': 'Book a visit',
    'Отзывы в&nbsp;2ГИС': 'Reviews on&nbsp;2GIS',
    'Дизайнерские кровати': 'Designer beds',
    'Кресла для&nbsp;отдыха': 'Lounge armchairs',
    'Ортопедические матрасы': 'Orthopaedic mattresses',
    'Покупателям': 'For customers',
    'Шоурум в&nbsp;Алматы': 'Showroom in&nbsp;Almaty',
    'Доставка по&nbsp;РК': 'Delivery across&nbsp;Kazakhstan',
    'Гарантия 5&nbsp;лет': '5-year warranty',
    'Отзывы 2ГИС': 'Reviews on 2GIS',
    'Об ателье': 'About the atelier',
    'О&nbsp;производстве': 'About production',
    'Оборудование SCM&nbsp;&amp;&nbsp;Dürkopp': 'SCM&nbsp;&amp;&nbsp;Dürkopp equipment',
    'Палитра тканей и&nbsp;кож': 'Fabric and&nbsp;leather palette',
    'Основной / WhatsApp': 'Main / WhatsApp',
    'Адрес шоурума': 'Showroom address',
    'График': 'Hours',
    'Пн–Вс&nbsp;10:00–20:00': 'Mon–Sun&nbsp;10:00–20:00',
    'Задать вопрос': 'Ask a question',
    '© 2026 RICCA&nbsp;DESIGNS · Алматы': '© 2026 RICCA&nbsp;DESIGNS · Almaty',
    # телефон, 10 ноября: первый экран (DESIGN.md 4.4), нижнее меню, «Популярные модели», строки окна модели, переключатель сетки
    'Ателье&nbsp;· Алматы': 'Atelier&nbsp;· Almaty',
    'Меню': 'Menu',
    'Популярные модели': 'Popular models',
    'В&nbsp;деталях': 'In&nbsp;detail',
    'Мягкая мебель на&nbsp;заказ&nbsp;— под&nbsp;ваш размер и&nbsp;ткань': 'Upholstered furniture made to&nbsp;order&nbsp;— your size, your fabric',
    'Матрасы': 'Mattresses', '3D-конструктор': '3D&nbsp;builder',
    'Весь каталог': 'Full catalogue',
    'По&nbsp;две в&nbsp;ряд': 'Two per row',
    'Любой&nbsp;— под заказ': 'Any&nbsp;— made to order',
    'Выбрать': 'Choose',
    'Собрать похожий': 'Build a similar one',
}
ATTR = {
    'Модульный диван Денвер в рогожке цвета мокко — работа ателье': 'Denver modular sofa in mocha hopsack — the atelier\'s work',
 # атрибуты (aria-label, alt, title, placeholder, content)
 'Язык сайта': 'Site language', '© 2026 RICCA DESIGNS. Все права защищены.': '© 2026 RICCA DESIGNS. All rights reserved.',
 'RICCA DESIGNS — ателье мягкой мебели в Алматы: диваны, кровати и кресла на заказ по вашему фото, эскизу или проекту. Любой размер и ткань, своё производство, шоурум на Навои, 208/2. Гарантия 5 лет, доставка по Казахстану и за рубеж.': 'RICCA DESIGNS — an upholstered furniture atelier in Almaty, Kazakhstan: sofas, beds and armchairs made to order from your photo, sketch or project. Any size and fabric, our own production, showroom at 208/2 Navoi St. 5-year warranty, delivery across Kazakhstan and worldwide.',
 'Алматы': 'Almaty', 'Мягкая мебель на заказ в Алматы — RICCA DESIGNS': 'Custom upholstered furniture in Almaty — RICCA DESIGNS',
 'Диваны, кровати и кресла на заказ — любой размер и ткань. Своё ателье, шоурум на Навои, 208/2. Гарантия 5 лет.': 'Sofas, beds and armchairs made to order — any size and fabric. Our own atelier, showroom at 208/2 Navoi St. 5-year warranty.',
 'Монограмма RD, RICCA DESIGNS — мебель на заказ, Алматы': 'RD monogram, RICCA DESIGNS — custom furniture, Almaty',
 'RICCA DESIGNS — наверх': 'RICCA DESIGNS — to the top', 'Разделы': 'Sections', 'Корзина, пусто': 'Cart, empty', 'Меню': 'Menu',
 'Диван Rasma — открыть модель': 'Rasma sofa — open the model', 'Диван Rasma в светлом букле': 'Rasma sofa in light bouclé',
 'Постер ELUNA «Мы убирали всё лишнее — пока не осталась тишина»: матрас на звёздном небе': 'ELUNA poster “We removed everything unnecessary — until only silence remained”: a mattress under the starry sky',
 'Работы ателье': 'Atelier works',
 'Видео: как мы делаем мебель — каркас, раскрой, пошив, обивка и сборка': 'Video: how we make furniture — frame, cutting, sewing, upholstery and assembly',
 'Остановить видео ателье': 'Stop the atelier video',
 'Instagram @ricca.designs (откроется в новой вкладке)': 'Instagram @ricca.designs (opens in a new tab)',
 'Шоурум в 2ГИС (откроется в новой вкладке)': 'Showroom on 2GIS (opens in a new tab)', 'Написать в WhatsApp': 'Message on WhatsApp',
 'Закрыть меню': 'Close menu', 'Закрыть': 'Close', 'Тип': 'Type', 'Предыдущее фото': 'Previous photo', 'Следующее фото': 'Next photo',
 'Фото изделия': 'Product photo', 'Характеристики': 'Specifications', 'Заказ': 'Order', 'Меньше': 'Less', 'Больше': 'More',
 'Цвет ткани': 'Fabric colour', 'Если знаете: 260 × 95 см': 'If known: 260 × 95 cm', 'Механизм, опоры, посадка': 'Mechanism, legs, seating',
 'Варианты': 'Options', 'Подробности': 'Details', 'Закрыть корзину': 'Close cart', 'Позиции в корзине': 'Cart lines',
 'Например, Алматы': 'e.g. London', 'Сроки, адрес доставки, удобное время для связи': 'Lead time, delivery address, best time to contact',
 'Угловой модульный диван в светло-сером шенилле — работа ателье': 'Corner modular sofa in light-grey chenille — made by the atelier',
 'Пара кресел в изумрудном велюре в интерьере — работа ателье': 'A pair of armchairs in emerald velour in an interior — made by the atelier',
 'Кровать с округлым изголовьем — работа ателье': 'Bed with a rounded headboard — made by the atelier',
 'Банкетка в молочном букле — работа ателье': 'Bench in milky bouclé — made by the atelier',
 # телефон, 10 ноября
 'Быстрые действия': 'Quick actions', 'Популярные модели': 'Popular models', 'Модели в деталях': 'Models in detail', 'Пошив: ткань под лапкой швейной машины': 'Sewing: fabric under the machine foot', 'Раскрой ткани ножницами': 'Cutting fabric with shears', 'Обивка: мастер крепит ткань': 'Upholstery: fixing the fabric', 'Работы по видам': 'Works by type', 'Каталог': 'Catalogue',
 'Позвонить: +7 (707) 955-08-08': 'Call: +7 (707) 955-08-08',
}

# --- фрагменты разметки, где в английском другой порядок слов: ↗ у ELUNA «приклеена» к последнему слову названия (.tile__nw),
#     а последнее слово в EN другое («ELUNA mattresses»). Заменяем до перевода узлов — иначе «Матрасы» останется непереведённым
FRAG = [
 ('<span class="tile__name">Матрасы <span class="tile__nw">ELUNA<svg', '<span class="tile__name">ELUNA <span class="tile__nw">mattresses<svg'),
]
for a, b in FRAG:
    assert s.count(a) == 1, f'нет в index.html: {a[:70]}'
    s = s.replace(a, b)

# --- тексты: только внутри <body>, узел за узлом (пробелы по краям сохраняем)
head, body = s[:s.index('<body')], s[s.index('<body'):]
missed = []
def tx(m):
    raw = m.group(1); t = re.sub(r'\s+', ' ', raw).strip()
    if not re.search('[А-Яа-яЁё]', t): return m.group(0)
    if t in TEXT:
        lead = raw[:len(raw) - len(raw.lstrip())]; tail = raw[len(raw.rstrip()):]
        return '>' + lead + TEXT[t] + tail + '<'
    missed.append(t); return m.group(0)
body = re.sub(r'>([^<>]*[А-Яа-яЁё][^<>]*)<', tx, body)
def ax(m):
    v = m.group(2)
    if v in ATTR: return f'{m.group(1)}="{ATTR[v]}"'
    missed.append('ATTR ' + v); return m.group(0)
page = head + body
page = re.sub(r'(aria-label|alt|title|placeholder|content|aria-description)="([^"]*[А-Яа-яЁё][^"]*)"', ax, page)
# убираем HTML-комментарии (в них русские заметки разработки)
page = re.sub(r'<!--.*?-->\n?', '', page, flags=re.S)

# --- шапка документа
reps = [
 ('<html lang="ru" class="no-js">', '<html lang="en" class="no-js">'),
 ('<title>Мягкая мебель на заказ в Алматы — диваны, кровати, кресла · RICCA DESIGNS</title>', '<title>Custom upholstered furniture in Almaty — sofas, beds, armchairs · RICCA DESIGNS</title>'),
 ('<link rel="canonical" href="https://ricca.design/">', '<link rel="canonical" href="https://ricca.design/en">'),
 ('<meta property="og:locale" content="ru_RU">', '<meta property="og:locale" content="en_US">\n<meta property="og:locale:alternate" content="ru_RU">'),
 ('<meta property="og:url" content="https://ricca.design/">', '<meta property="og:url" content="https://ricca.design/en">'),
 ('<link rel="manifest" href="/manifest.webmanifest">', '<link rel="manifest" href="/en.webmanifest">'),
 ('<script src="js/cart.js" defer></script>', '<script src="js/lang-en.js" defer></script>\n<script src="js/cart.js" defer></script>'),
 ('<a class="hdr__lang" href="/en" hreflang="en" lang="en" aria-label="English version">EN</a>', '<a class="hdr__lang" href="/" hreflang="ru" lang="ru" aria-label="Русская версия">RU</a>'),
 ('<a class="menu__lang" href="/en" hreflang="en" lang="en">English</a>', '<a class="menu__lang" href="/" hreflang="ru" lang="ru">Русский</a>'),
 ('<a href="/" hreflang="ru" lang="ru" aria-current="true" data-lng="ru">RU</a><span aria-hidden="true">|</span><a href="/en" hreflang="en" lang="en" data-lng="en">EN</a>', '<a href="/" hreflang="ru" lang="ru" data-lng="ru">RU</a><span aria-hidden="true">|</span><a href="/en" hreflang="en" lang="en" aria-current="true" data-lng="en">EN</a>'),
]
for a, b in reps:
    assert page.count(a) == 1, f'нет в index.html: {a[:70]}'
    page = page.replace(a, b)
# ссылки на конструктор — в английский конструктор (/en/configurator — тот же файл, язык по адресу)
page = page.replace('href="configurator.html"', 'href="/en/configurator"')
# JSON-LD — по-английски
m = re.search(r'(<script type="application/ld\+json">\n)(.*?)(\n</script>)', page, re.S)
d = json.loads(m.group(2))
d['@id'] = 'https://ricca.design/#ricca'; d['url'] = 'https://ricca.design/en'
d['alternateName'] = ['RICCA DESIGNS furniture atelier', 'Custom upholstered furniture Almaty', 'Made-to-measure sofas and beds in Almaty', 'Ricca Designs — custom upholstered furniture in Almaty']
d['slogan'] = 'Custom upholstered furniture in Almaty — any size, any fabric, our own atelier'
d['knowsAbout'] = ['custom sofas', 'corner sofas', 'modular sofas', 'sofa beds', 'upholstered beds', 'beds with lift-up storage', 'custom armchairs and poufs', 'made-to-measure furniture', 'furniture from a photo or sketch', 'hotel and restaurant furniture', 'upholstery fabrics: velour, bouclé, chenille']
d['keywords'] = 'custom furniture Almaty, custom sofa Almaty, made-to-measure sofa, upholstered bed Kazakhstan, furniture atelier Almaty'
d['foundingLocation'] = {'@type': 'Place', 'name': 'Almaty, Kazakhstan'}
d['description'] = 'Upholstered furniture atelier in Almaty, Kazakhstan: sofas, beds and armchairs made to order from your photo, sketch or project. Any size and fabric, own production, 5-year warranty, worldwide delivery.'
d['address'].update({'streetAddress': '208/2 Alisher Navoi St. (Shakhristan RC)', 'addressLocality': 'Almaty', 'addressRegion': 'Almaty'})
d['hasOfferCatalog'] = {'@type': 'OfferCatalog', 'name': 'Custom upholstered furniture', 'itemListElement': [
  {'@type': 'Offer', 'itemOffered': {'@type': 'Product', 'name': 'Custom sofas', 'description': 'Straight, corner, modular and sofa beds — any size and fabric'}},
  {'@type': 'Offer', 'itemOffered': {'@type': 'Product', 'name': 'Custom beds', 'description': 'Upholstered beds with or without a lift-up mechanism, any headboard'}},
  {'@type': 'Offer', 'itemOffered': {'@type': 'Product', 'name': 'Armchairs, poufs and benches', 'description': 'Lounge armchairs, poufs and benches in any fabric'}},
  {'@type': 'Offer', 'itemOffered': {'@type': 'Product', 'name': 'ELUNA mattresses', 'url': 'https://ricca-designs.netlify.app'}}]}
d['areaServed'] = [{'@type': 'City', 'name': 'Almaty'}, {'@type': 'Country', 'name': 'Kazakhstan'}, 'Worldwide']
for c in d.get('contactPoint', []): c['availableLanguage'] = ['ru', 'en']
d['inLanguage'] = 'en'
page = page[:m.start(2)] + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + page[m.end(2):]
open(ROOT + 'en.html', 'w', encoding='utf-8').write(page)
left = sorted(set(re.findall(r'>([^<>]*[А-Яа-яЁё][^<>]*)<', page[page.index('<body'):])))
print('en.html записан;', 'непереведённых фрагментов:', len(missed)); [print('  ', x[:120]) for x in missed[:40]]
print('кириллица в тексте body (кроме lang=ru):', [x.strip()[:60] for x in left if 'Русск' not in x][:20])
