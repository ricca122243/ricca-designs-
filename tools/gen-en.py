#!/usr/bin/env python3
# Собирает ricca/en.html из ricca/index.html: та же разметка, тексты и атрибуты — на английском.
# Запуск из корня репозитория: python3 tools/gen-en.py (после любой правки index.html). Новые тексты новых блоков — в js/content-data.js (en).
import re, json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ricca')) + '/'
s = open(ROOT + 'index.html', encoding='utf-8').read()

TEXT = {
 'Собрать в&nbsp;3D': 'Build in&nbsp;3D',
 'Чертёж любой модели из&nbsp;': 'A drawing of&nbsp;any model from the&nbsp;', '3D-конструктора': '3D configurator', '&nbsp;— в&nbsp;SVG для&nbsp;вашего&nbsp;проекта': '&nbsp;— in&nbsp;SVG for&nbsp;your&nbsp;project',   # «3D-конструктора» — в .nowrap (не рвать по дефису)
 'Все права защищены. Фото, тексты, 3D-модели и&nbsp;дизайн сайта&nbsp;— собственность RICCA&nbsp;DESIGNS; копирование и&nbsp;использование без письменного разрешения запрещены.': 'All rights reserved. Photos, texts, 3D models and&nbsp;the website design are the property of&nbsp;RICCA&nbsp;DESIGNS; copying or use without written permission is prohibited.',
 'Состав': 'What it’s made of',
 'Перейти к&nbsp;содержанию': 'Skip to&nbsp;content', 'Каталог': 'Catalogue', 'Работы': 'Works', 'Ателье': 'Atelier', 'Для бизнеса': 'For business', 'Шоурум': 'Showroom',
 'RICCA DESIGNS&nbsp;· Алматы': 'RICCA DESIGNS&nbsp;· Almaty', 'Мягкая мебель': 'Upholstered furniture', 'на&nbsp;заказ': 'made to&nbsp;order',
 'Диваны, кровати и&nbsp;кресла — по&nbsp;вашему фото, эскизу или проекту. Своё ателье.': 'Sofas, beds and&nbsp;armchairs — from&nbsp;your photo, sketch or project. Our own atelier.',
 'Диван Rasma · букле': 'Rasma sofa · bouclé', 'в&nbsp;любом размере и&nbsp;ткани': 'in&nbsp;any size and&nbsp;fabric',
 'Диваны': 'Sofas', 'Кровати': 'Beds', 'Кресла': 'Armchairs', 'Пуфы и&nbsp;банкетки': 'Poufs and&nbsp;benches', 'Любой размер': 'Any size', 'Любая ткань': 'Any fabric',
 'Своё ателье в&nbsp;Алматы': 'Our own atelier in&nbsp;Almaty', 'Матрасы ELUNA': 'ELUNA mattresses',
 'RICCA&nbsp;DESIGNS шьёт диваны, кровати и&nbsp;кресла в&nbsp;любом стиле&nbsp;— по&nbsp;вашему фото, эскизу или&nbsp;проекту.': 'RICCA&nbsp;DESIGNS makes sofas, beds and&nbsp;armchairs in&nbsp;any style&nbsp;— from&nbsp;your photo, sketch or&nbsp;project.',
 'Для дома и&nbsp;для бизнеса.': 'For homes and&nbsp;for business.', 'Новости': 'News', 'Новинка': 'New', 'Матрасы&nbsp;ELUNA': 'ELUNA&nbsp;mattresses',
 'Модели и&nbsp;цены&nbsp;— на&nbsp;новом сайте.': 'Models and&nbsp;prices&nbsp;— on&nbsp;the new website.', 'Смотреть': 'View',
 '— сайт ELUNA, откроется в&nbsp;новой вкладке': '— ELUNA website, opens in&nbsp;a new tab', 'Производство': 'Production', 'своё ателье в&nbsp;Алматы': 'our own atelier in&nbsp;Almaty',
 'Гарантия': 'Warranty', '5&nbsp;лет': '5&nbsp;years', 'Доставка': 'Delivery', 'по&nbsp;Казахстану и&nbsp;за&nbsp;рубеж': 'across&nbsp;Kazakhstan and&nbsp;worldwide', 'каждый день,': 'every day,',
 'Шьём на&nbsp;заказ&nbsp;— по&nbsp;вашему фото, эскизу или&nbsp;проекту.': 'Made to&nbsp;order&nbsp;— from&nbsp;your photo, sketch or&nbsp;project.',
 'Прямые, угловые, модульные, раскладные': 'Straight, corner, modular, sofa beds', 'С подъёмным механизмом и&nbsp;без': 'With or&nbsp;without a lift-up mechanism',
 'Для отдыха, пуфы и&nbsp;банкетки': 'Lounge chairs, poufs and&nbsp;benches', 'Ткани': 'Fabrics', 'Велюр, букле, шенилл': 'Velour, bouclé, chenille',
 'Ортопедические, на&nbsp;своём сайте': 'Orthopaedic, on&nbsp;their own website', 'Складывайте мебель и&nbsp;ткани в&nbsp;корзину': 'Add furniture and&nbsp;fabrics to the cart',
 '&nbsp;— и&nbsp;отправьте заявку в&nbsp;WhatsApp одним сообщением.': '&nbsp;— and&nbsp;send one request via&nbsp;WhatsApp.', 'Ткани и&nbsp;цвета': 'Fabrics and&nbsp;colours',
 'Наши работы': 'Our works', 'Все работы': 'All works', 'Любой стиль.': 'Any style.', 'Любая модель.': 'Any model.',
 'Сошьём любую модель в&nbsp;любом стиле&nbsp;— в&nbsp;нужном размере и&nbsp;ткани.': 'We make any model in&nbsp;any style&nbsp;— in&nbsp;the size and&nbsp;fabric you need.',
 'Стили': 'Styles', 'Современный': 'Contemporary', 'Неоклассика': 'Neoclassical', 'Французская классика': 'French classic', 'Ар-деко': 'Art Deco', 'Минимализм': 'Minimalism',
 'Скандинавский': 'Scandinavian', 'Джапанди': 'Japandi', 'Лофт': 'Loft', 'Модерн&nbsp;60-х': '60s&nbsp;modern', 'и&nbsp;любой другой&nbsp;— по&nbsp;вашему фото или&nbsp;проекту': 'and&nbsp;any other&nbsp;— from&nbsp;your photo or&nbsp;project',
 'Пришлите фото': 'Send a photo', 'Подберём размер и&nbsp;ткань': 'We pick the size and&nbsp;fabric', 'Сошьём в&nbsp;ателье': 'We make it in&nbsp;our atelier',
 'Отправить фото в&nbsp;WhatsApp': 'Send a photo via&nbsp;WhatsApp', 'Собрать онлайн в&nbsp;3D': 'Build online in&nbsp;3D', 'Как заказать': 'How to order', 'Заявка': 'Request',
 'Напишите в&nbsp;WhatsApp или приходите в&nbsp;шоурум на&nbsp;Навои.': 'Write on&nbsp;WhatsApp or visit the showroom on&nbsp;Navoi.', 'Модель': 'Model',
 'По&nbsp;вашему фото, эскизу или проекту. Согласуем размер, обивку и&nbsp;механизм&nbsp;— где он&nbsp;есть.': 'From&nbsp;your photo, sketch or project. We agree the size, upholstery and&nbsp;mechanism&nbsp;— where there is&nbsp;one.',
 'В&nbsp;нашем ателье, после утверждения проекта.': 'In&nbsp;our atelier, once the project is approved.',
 'Привозим по&nbsp;Казахстану; в&nbsp;другие страны&nbsp;— рассчитаем под ваш адрес.': 'We deliver across&nbsp;Kazakhstan; to&nbsp;other countries&nbsp;— quoted for your address.',
 'Обсудить в&nbsp;WhatsApp': 'Discuss on&nbsp;WhatsApp', 'Работаем по&nbsp;всему миру': 'We work worldwide',
 'Шьём в&nbsp;Алматы&nbsp;— принимаем заказы из&nbsp;любой страны. Доставку и&nbsp;сроки рассчитаем под&nbsp;ваш адрес.': 'We make in&nbsp;Almaty&nbsp;— and&nbsp;take orders from&nbsp;any country. Delivery and&nbsp;lead times are quoted for&nbsp;your address.',
 'Заказать из&nbsp;другой страны': 'Order from&nbsp;another country', '(откроется в&nbsp;WhatsApp)': '(opens in&nbsp;WhatsApp)', 'Алматы': 'Almaty',
 'Делаем мебель сами&nbsp;— в&nbsp;своём ателье в&nbsp;Алматы.': 'We make the furniture ourselves&nbsp;— in&nbsp;our own atelier in&nbsp;Almaty.', 'Полный цикл': 'Full cycle',
 'Каркас': 'Frame', 'Раскрой': 'Cutting', 'Пошив': 'Sewing', 'Обивка': 'Upholstery', 'Сборка': 'Assembly',
 'Любую модель&nbsp;— по&nbsp;фото, эскизу или проекту&nbsp;— в&nbsp;нужном размере. Ткани и&nbsp;кожи&nbsp;— образцы в&nbsp;шоуруме. Гарантия 5&nbsp;лет, доставка по&nbsp;Казахстану и&nbsp;за&nbsp;рубеж.': 'Any model&nbsp;— from&nbsp;a photo, sketch or project&nbsp;— in&nbsp;the size you need. Fabrics and&nbsp;leathers&nbsp;— samples in&nbsp;the showroom. 5-year warranty, delivery across&nbsp;Kazakhstan and&nbsp;worldwide.',
 'станки, Италия': 'machinery, Italy', 'швейное оборудование, Германия': 'sewing equipment, Germany', 'Написать мастеру': 'Message the master',
 'Комплектуем отели, рестораны,': 'We furnish hotels, restaurants,', 'апарт-комплексы': 'apartment complexes', ', жилые проекты и&nbsp;офисы.': ', residential projects and&nbsp;offices.',
 'Индивидуальные изделия': 'Bespoke pieces', 'Адаптация моделей под проект': 'Models adapted to&nbsp;the project', 'Сопровождение от&nbsp;идеи до&nbsp;монтажа': 'Support from&nbsp;idea to&nbsp;installation',
 'Доставка по&nbsp;Казахстану и&nbsp;за&nbsp;рубеж': 'Delivery across&nbsp;Kazakhstan and&nbsp;worldwide', 'Обсудить проект': 'Discuss a project',
 'Дизайнерам и&nbsp;архитекторам': 'For designers and&nbsp;architects', 'Работаем по&nbsp;вашим чертежам, визуализациям и&nbsp;спецификациям.': 'We work from&nbsp;your drawings, renderings and&nbsp;specifications.',
 'Подберём ткани и&nbsp;кожи под проект': 'Fabrics and&nbsp;leathers matched to&nbsp;the project', 'Изготовим по&nbsp;размерам проекта': "Made to&nbsp;the project's dimensions",
 'Образцы&nbsp;— в&nbsp;шоуруме на&nbsp;Навои': 'Samples&nbsp;— in&nbsp;the showroom on&nbsp;Navoi', 'Написать по&nbsp;проекту': 'Write about a project', 'Вопросы': 'Questions',
 'Можно изменить размер?': 'Can the size be changed?', 'Да, адаптируем модели под проект. Пришлите размеры комнаты в&nbsp;WhatsApp.': 'Yes, we adapt models to&nbsp;the project. Send the room dimensions on&nbsp;WhatsApp.',
 'Сделаете по&nbsp;моему эскизу?': 'Can you make it from&nbsp;my sketch?', 'Да, делаем индивидуальные изделия. Пришлите эскиз или фото.': 'Yes, we make bespoke pieces. Send a sketch or a photo.',
 'Какие есть механизмы?': 'What mechanisms are there?', 'Раскладной&nbsp;— для диванов, подъёмный&nbsp;— для кроватей. Подберём под вашу модель.': 'Fold-out&nbsp;— for sofas, lift-up&nbsp;— for beds. We match one to&nbsp;your model.',
 'Сколько стоит?': 'How much does it cost?', 'Зависит от&nbsp;модели, размера и&nbsp;обивки. Рассчитаем в&nbsp;WhatsApp: отправьте фото или заявку из&nbsp;корзины.': 'It depends on&nbsp;the model, size and&nbsp;upholstery. We quote on&nbsp;WhatsApp: send a photo or a request from&nbsp;the cart.',
 'Какие сроки?': 'What are the lead times?', 'Называем после утверждения проекта и&nbsp;выбора ткани.': 'We name them once the project is approved and&nbsp;the fabric is chosen.',
 'Доставка и&nbsp;гарантия?': 'Delivery and&nbsp;warranty?', 'Доставляем по&nbsp;Казахстану, в&nbsp;другие страны&nbsp;— сроки и&nbsp;стоимость рассчитаем под ваш адрес. Гарантия&nbsp;— 5&nbsp;лет.': 'We deliver across&nbsp;Kazakhstan; for other countries&nbsp;— lead times and&nbsp;cost are quoted for your address. Warranty&nbsp;— 5&nbsp;years.',
 'Приходите в&nbsp;шоурум': 'Visit the showroom', 'Посмотрите мебель и&nbsp;образцы тканей вживую. Визит удобно согласовать в&nbsp;WhatsApp.': 'See the furniture and&nbsp;fabric samples in&nbsp;person. Arrange a visit on&nbsp;WhatsApp.',
 'г.&nbsp;Алматы, ул.&nbsp;Алишера Навои,&nbsp;208/2': 'Almaty, 208/2&nbsp;Alisher Navoi&nbsp;St.', 'ЖК&nbsp;«Шахристан»': 'Shakhristan residential complex',
 '(2ГИС, откроется в&nbsp;новой вкладке)': '(2GIS, opens in&nbsp;a new tab)', 'Пн–Вс': 'Mon–Sun', '· отдел заказов': '· orders department', 'Записаться на&nbsp;визит': 'Book a visit',
 'Маршрут в&nbsp;2ГИС': 'Route in&nbsp;2GIS', '(откроется в&nbsp;новой вкладке)': '(opens in&nbsp;a new tab)', 'Отзывы в&nbsp;2ГИС': 'Reviews on&nbsp;2GIS',
 'Дизайнерские кровати': 'Designer beds', 'Кресла для&nbsp;отдыха': 'Lounge armchairs', 'Ортопедические матрасы': 'Orthopaedic mattresses', 'Покупателям': 'For customers',
 'Шоурум в&nbsp;Алматы': 'Showroom in&nbsp;Almaty', 'Доставка по&nbsp;РК': 'Delivery across&nbsp;Kazakhstan', 'Гарантия 5&nbsp;лет': '5-year warranty', 'Отзывы 2ГИС': 'Reviews on 2GIS',
 'Об ателье': 'About the atelier', 'О&nbsp;производстве': 'About production', 'Оборудование SCM&nbsp;&amp;&nbsp;Dürkopp': 'SCM&nbsp;&amp;&nbsp;Dürkopp equipment', 'Палитра тканей и&nbsp;кож': 'Fabric and&nbsp;leather palette',
 'Контакты': 'Contacts', 'Основной / WhatsApp': 'Main / WhatsApp', 'Отдел заказов': 'Orders department', 'Адрес шоурума': 'Showroom address', 'ул.&nbsp;Алишера Навои,&nbsp;208/2': '208/2&nbsp;Alisher Navoi&nbsp;St.',
 'График': 'Hours', 'Пн–Вс&nbsp;10:00–20:00': 'Mon–Sun&nbsp;10:00–20:00', 'Задать вопрос': 'Ask a question', '© 2026 RICCA&nbsp;DESIGNS · Алматы': '© 2026 RICCA&nbsp;DESIGNS · Almaty',
 '— сайт матрасов, откроется в&nbsp;новой вкладке': '— mattress website, opens in&nbsp;a new tab', 'Корзина': 'Cart', 'Написать в&nbsp;WhatsApp': 'Message on&nbsp;WhatsApp',
 'Размер и&nbsp;ткань&nbsp;— под заказ.': 'Size and&nbsp;fabric&nbsp;— to order.', 'Количество': 'Quantity', '1&nbsp;шт.': '1&nbsp;pc', 'Ткань': 'Fabric', 'Подберём вместе': "We'll choose together",
 'Размер': 'Size', 'Пожелания': 'Wishes', 'Добавить в&nbsp;корзину': 'Add to&nbsp;cart', 'Узнать цену': 'Get a price', 'в&nbsp;WhatsApp': 'on&nbsp;WhatsApp', 'Подробнее': 'Details',
 'Хочу такой': 'I want this', 'В&nbsp;корзину': 'Add to&nbsp;cart', 'Собрать похожий в&nbsp;3D': 'Build a similar one in&nbsp;3D', 'Смотреть в&nbsp;Instagram': 'View on&nbsp;Instagram',
 'Пока пусто. Складывайте мебель и&nbsp;ткани&nbsp;— и&nbsp;отправьте заявку одним сообщением в&nbsp;WhatsApp.': 'Empty for now. Add furniture and&nbsp;fabrics&nbsp;— and&nbsp;send one request via&nbsp;WhatsApp.',
 'Смотреть каталог': 'View the catalogue', 'Для заявки&nbsp;— по&nbsp;желанию': 'For the request&nbsp;— optional', 'Имя': 'Name', 'Город': 'City', 'Комментарий к&nbsp;заказу': 'Order comment',
 'Цены рассчитаем и&nbsp;ответим в&nbsp;WhatsApp.': "We'll quote prices and&nbsp;reply on&nbsp;WhatsApp.", 'Заявка открыта в&nbsp;WhatsApp. Очистить корзину?': 'Request opened in&nbsp;WhatsApp. Clear the cart?',
 'Очистить': 'Clear', 'Оставить': 'Keep', 'Открыть': 'Open',
}
ATTR = {
 'Язык сайта': 'Site language', '© 2026 RICCA DESIGNS. Все права защищены.': '© 2026 RICCA DESIGNS. All rights reserved.',
 'RICCA DESIGNS — ателье мягкой мебели в Алматы: диваны, кровати и кресла на заказ по вашему фото, эскизу или проекту. Любой размер и ткань, своё производство, шоурум на Навои, 208/2. Гарантия 5 лет, доставка по Казахстану и за рубеж.':
   'RICCA DESIGNS — an upholstered furniture atelier in Almaty, Kazakhstan: sofas, beds and armchairs made to order from your photo, sketch or project. Any size and fabric, our own production, showroom at 208/2 Navoi St. 5-year warranty, delivery across Kazakhstan and worldwide.',
 'Алматы': 'Almaty', 'Мягкая мебель на заказ в Алматы — RICCA DESIGNS': 'Custom upholstered furniture in Almaty — RICCA DESIGNS',
 'Диваны, кровати и кресла на заказ — любой размер и ткань. Своё ателье, шоурум на Навои, 208/2. Гарантия 5 лет.': 'Sofas, beds and armchairs made to order — any size and fabric. Our own atelier, showroom at 208/2 Navoi St. 5-year warranty.',
 'Монограмма RD, RICCA DESIGNS — мебель на заказ, Алматы': 'RD monogram, RICCA DESIGNS — custom furniture, Almaty', 'RICCA DESIGNS — наверх': 'RICCA DESIGNS — to the top', 'Разделы': 'Sections',
 'Корзина, пусто': 'Cart, empty', 'Меню': 'Menu', 'Диван Rasma — открыть модель': 'Rasma sofa — open the model', 'Диван Rasma в светлом букле': 'Rasma sofa in light bouclé',
 'Листать работы назад': 'Previous works', 'Листать работы вперёд': 'Next works', 'Работы ателье': 'Atelier works',
 'Видео: как мы делаем мебель — каркас, раскрой, пошив, обивка и сборка': 'Video: how we make furniture — frame, cutting, sewing, upholstery and assembly', 'Остановить видео ателье': 'Stop the atelier video',
 'Instagram @ricca.designs (откроется в новой вкладке)': 'Instagram @ricca.designs (opens in a new tab)', 'Шоурум в 2ГИС (откроется в новой вкладке)': 'Showroom on 2GIS (opens in a new tab)',
 'Написать в WhatsApp': 'Message on WhatsApp', 'Закрыть меню': 'Close menu', 'Закрыть': 'Close', 'Тип': 'Type', 'Предыдущее фото': 'Previous photo', 'Следующее фото': 'Next photo',
 'Фото изделия': 'Product photo', 'Характеристики': 'Specifications', 'Заказ': 'Order', 'Меньше': 'Less', 'Больше': 'More', 'Цвет ткани': 'Fabric colour', 'Если знаете: 260 × 95 см': 'If known: 260 × 95 cm',
 'Механизм, опоры, посадка': 'Mechanism, legs, seating', 'Варианты': 'Options', 'Подробности': 'Details', 'Закрыть корзину': 'Close cart', 'Позиции в корзине': 'Cart lines',
 'Например, Алматы': 'e.g. London', 'Сроки, адрес доставки, удобное время для связи': 'Lead time, delivery address, best time to contact',
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
 ('№&nbsp;01', 'No.&nbsp;01'),
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
