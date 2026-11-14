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
 'Кровати': 'Beds', 'Нам доверяют': 'Trusted by', 'Комплектация объектов': 'Fit-out of venues', 'Под ключ — от&nbsp;идеи до&nbsp;монтажа.': 'Turnkey — from idea to&nbsp;installation.', 'Под ваш проект': 'Made for your project', 'Адаптируем модели под объект.': 'We adapt our models to the venue.', '25–45 рабочих дней': '25–45 working days', 'Срок производства, личный менеджер.': 'Production time, with a personal manager.', 'Кресла': 'Armchairs', 'Пуфы и&nbsp;банкетки': 'Poufs and&nbsp;benches', 'Любой размер': 'Any size', 'Любая ткань': 'Any fabric',
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
 'Смотреть в&nbsp;Instagram': 'View on&nbsp;Instagram',
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
    # окно «Ателье подробно» (11 ноября)
    'Своё производство в&nbsp;Алматы&nbsp;— от&nbsp;чертежа до&nbsp;сборки.': 'Our own production in&nbsp;Almaty&nbsp;— from drawing to&nbsp;assembly.',
    'Мебель делаем сами&nbsp;— в&nbsp;своём ателье в&nbsp;Алматы, от&nbsp;чертежа до&nbsp;сборки.': 'We make the furniture ourselves&nbsp;— in&nbsp;our own atelier in&nbsp;Almaty, from drawing to&nbsp;assembly.',
    'Фанера и&nbsp;массив дерева. Детали вырезает станок с&nbsp;ЧПУ SCM&nbsp;— точно по&nbsp;чертежу.': 'Plywood and&nbsp;solid wood. Parts are cut on&nbsp;an&nbsp;SCM CNC machine&nbsp;— exactly to&nbsp;the drawing.',
    'В&nbsp;основании&nbsp;— пружины «змейка» или ремни, сверху&nbsp;— упругий пенополиуретан. Мягче или плотнее&nbsp;— решаете вы.': 'Zigzag springs or&nbsp;webbing in&nbsp;the base, resilient foam on&nbsp;top. Softer or&nbsp;firmer&nbsp;— you decide.',
    'Ткань выбираете в&nbsp;шоуруме, кроим её по&nbsp;лекалам модели.': 'You choose the&nbsp;fabric in&nbsp;the showroom; we cut it&nbsp;to&nbsp;the model’s patterns.',
    'Шьём на&nbsp;промышленных машинах Dürkopp&nbsp;Adler.': 'Sewn on&nbsp;industrial Dürkopp&nbsp;Adler machines.',
    'Ткань без складок, швы по&nbsp;линии. Собираем, проверяем, упаковываем.': 'Fabric without creases, seams in&nbsp;line. We assemble, check and&nbsp;pack.',
    'Размеры по&nbsp;чертежу': 'Dimensions to&nbsp;the drawing',
    'Ровные швы': 'Straight seams',
    'Ткань без складок': 'Fabric without creases',
    'Плавные механизмы': 'Smooth mechanisms',
    'Доставка по&nbsp;Казахстану и&nbsp;за&nbsp;рубеж': 'Delivery across Kazakhstan and&nbsp;abroad',
    'На&nbsp;связи в&nbsp;WhatsApp': 'In&nbsp;touch on&nbsp;WhatsApp',
    'Гарантия&nbsp;— 5&nbsp;лет': 'Warranty&nbsp;— 5&nbsp;years',
    'Каждое изделие начинается с&nbsp;чертежа под вашу комнату. Размеры, посадку и&nbsp;ткань согласуем до&nbsp;начала работы и&nbsp;показываем модель в&nbsp;3D&nbsp;— в&nbsp;работу оно идёт только после вашего «да».': 'Every piece starts with a&nbsp;drawing for your room. We agree the&nbsp;dimensions, the&nbsp;seat and&nbsp;the fabric before work begins and&nbsp;show the&nbsp;model in&nbsp;3D&nbsp;— it&nbsp;goes into production only after your “yes”.',
    'В&nbsp;ателье работает итальянское и&nbsp;немецкое оборудование: станок с&nbsp;ЧПУ SCM для дерева и&nbsp;швейные машины Dürkopp&nbsp;Adler.': 'The&nbsp;atelier runs Italian and&nbsp;German equipment: an&nbsp;SCM CNC machine for wood and&nbsp;Dürkopp&nbsp;Adler sewing machines.',
    'Станок задаёт точность. Форму, посадку и&nbsp;характер изделию дают руки мастера': 'The&nbsp;machine sets the&nbsp;precision. Shape, seat and&nbsp;character come from the&nbsp;craftsman’s hands',
    '01&nbsp;· Каркас': '01&nbsp;· Frame',
    'Основа, которая держит форму': 'The&nbsp;base that holds the&nbsp;shape',
    'В&nbsp;основе каркаса&nbsp;— фанера и&nbsp;массив дерева. Детали вырезает станок с&nbsp;ЧПУ SCM: радиусы и&nbsp;пазы получаются точно по&nbsp;чертежу, детали сходятся без подгонки.': 'The&nbsp;frame is&nbsp;built from plywood and&nbsp;solid wood. The&nbsp;parts are cut on&nbsp;an&nbsp;SCM CNC machine: curves and&nbsp;joints come out exactly to&nbsp;the drawing and&nbsp;fit without adjustment.',
    'Каркас собираем вручную и&nbsp;сверяем с&nbsp;чертежом: углы, диагонали, жёсткость. После сборки шлифуем кромки&nbsp;— ткань ложится ровно и&nbsp;не&nbsp;протирается на&nbsp;углах.': 'We assemble the&nbsp;frame by&nbsp;hand and&nbsp;check it&nbsp;against the&nbsp;drawing: angles, diagonals, rigidity. After assembly we sand the&nbsp;edges&nbsp;— the&nbsp;fabric lies flat and&nbsp;does not wear through at&nbsp;the corners.',
    '02&nbsp;· Посадка': '02&nbsp;· Seat',
    'Мягкость подбираем под вас': 'Softness matched to&nbsp;you',
    'В&nbsp;основании сиденья&nbsp;— пружины «змейка» или мебельные ремни. Они принимают нагрузку на&nbsp;себя и&nbsp;не&nbsp;дают сиденью провисать.': 'The&nbsp;seat base uses zigzag springs or&nbsp;furniture webbing. They take the&nbsp;load and&nbsp;keep the&nbsp;seat from sagging.',
    'Сверху&nbsp;— пенополиуретан высокой упругости и&nbsp;мягкий верхний слой, который сглаживает форму. Подушки спинки наполняем холлофайбером: они мягкие и&nbsp;легко взбиваются. Плотность подбираем под желаемую посадку&nbsp;— мягче или плотнее.': 'On&nbsp;top&nbsp;— high-resilience foam and&nbsp;a&nbsp;soft upper layer that smooths the&nbsp;shape. Back cushions are filled with hollow fibre: soft and&nbsp;easy to&nbsp;plump up. The&nbsp;density is&nbsp;matched to&nbsp;the seat you want&nbsp;— softer or&nbsp;firmer.',
    '03&nbsp;· Ткань, раскрой, пошив': '03&nbsp;· Fabric, cutting, sewing',
    'Крой по&nbsp;лекалам, строчка к&nbsp;строчке': 'Cut to&nbsp;pattern, stitch to&nbsp;stitch',
    'Ткань или кожу выбираете в&nbsp;шоуруме из&nbsp;палитры образцов&nbsp;— их&nbsp;можно потрогать и&nbsp;сравнить рядом. Затем размечаем и&nbsp;кроим её по&nbsp;лекалам модели: следим за&nbsp;направлением ворса и&nbsp;рисунком, чтобы на&nbsp;готовом изделии всё сошлось на&nbsp;швах.': 'You choose the&nbsp;fabric or&nbsp;leather in&nbsp;the showroom from a&nbsp;palette of&nbsp;samples&nbsp;— you can touch them and&nbsp;compare side by&nbsp;side. Then we mark and&nbsp;cut it&nbsp;to&nbsp;the model’s patterns, watching the&nbsp;pile direction and&nbsp;the print so&nbsp;that everything meets at&nbsp;the seams.',
    'Чехлы шьём на&nbsp;промышленных машинах Dürkopp&nbsp;Adler. Они дают ровную строчку на&nbsp;плотных мебельных тканях и&nbsp;коже.': 'Covers are sewn on&nbsp;industrial Dürkopp&nbsp;Adler machines. They give an&nbsp;even stitch on&nbsp;dense upholstery fabrics and&nbsp;leather.',
    '04&nbsp;· Обивка и&nbsp;сборка': '04&nbsp;· Upholstery and&nbsp;assembly',
    'Коротко': 'In&nbsp;short',
    'Подробнее об&nbsp;ателье': 'More about the&nbsp;atelier',
    'Главная': 'Home',
    'Ателье RICCA DESIGNS': 'The RICCA DESIGNS atelier',
    'Мебель делаем сами&nbsp;— в&nbsp;своём ателье в&nbsp;Алматы. Проект, каркас, раскрой, пошив, обивка и&nbsp;сборка проходят в&nbsp;одних руках, поэтому за&nbsp;результат отвечаем мы, а&nbsp;не&nbsp;подрядчик.': 'We make the furniture ourselves&nbsp;— in&nbsp;our own atelier in&nbsp;Almaty. Design, frame, cutting, sewing, upholstery and&nbsp;assembly stay in&nbsp;one pair of&nbsp;hands, so&nbsp;we answer for&nbsp;the result, not a&nbsp;subcontractor.',
    '5&nbsp;лет': '5&nbsp;years',
    'гарантия на&nbsp;мебель': 'warranty on&nbsp;furniture',
    '25–45': '25–45',
    'рабочих дней на&nbsp;изготовление': 'working days to&nbsp;make',
    'Любой': 'Any',
    'размер&nbsp;— под вашу комнату': 'size&nbsp;— to&nbsp;fit your room',
    '01&nbsp;· Проект': '01&nbsp;· Design',
    'Сначала&nbsp;— чертёж': 'First, the&nbsp;drawing',
    'Начинаем с&nbsp;размеров комнаты и&nbsp;ваших пожеланий. Собираем модель в&nbsp;3D и&nbsp;согласуем чертёж: габариты, посадку, ткань. В&nbsp;работу изделие идёт только после вашего «да».': 'We start with the&nbsp;size of&nbsp;your room and&nbsp;your wishes. We build the&nbsp;model in&nbsp;3D and&nbsp;agree the&nbsp;drawing: dimensions, seat, fabric. The&nbsp;piece goes into production only after your “yes”.',
    '02&nbsp;· Каркас': '02&nbsp;· Frame',
    'Станок с&nbsp;ЧПУ SCM, Италия': 'SCM CNC machine, Italy',
    'Детали каркаса вырезает станок с&nbsp;числовым управлением SCM. Радиусы и&nbsp;пазы получаются точно по&nbsp;чертежу, детали сходятся без подгонки&nbsp;— каркас выходит ровным и&nbsp;жёстким.': 'Frame parts are cut on&nbsp;an&nbsp;SCM CNC machine. Curves and&nbsp;joints come out exactly to&nbsp;the drawing and&nbsp;the parts fit without adjustment&nbsp;— the&nbsp;frame is&nbsp;straight and&nbsp;rigid.',
    '03&nbsp;· Раскрой': '03&nbsp;· Cutting',
    'Крой по&nbsp;лекалам модели': 'Cut to&nbsp;the model’s patterns',
    'Ткань размечаем и&nbsp;кроим по&nbsp;лекалам. Следим за&nbsp;направлением ворса и&nbsp;рисунком, чтобы на&nbsp;готовом изделии всё сошлось на&nbsp;швах.': 'We mark and&nbsp;cut the&nbsp;fabric to&nbsp;patterns. We watch the&nbsp;direction of&nbsp;the pile and&nbsp;the print so&nbsp;that everything meets at&nbsp;the seams on&nbsp;the finished piece.',
    '04&nbsp;· Пошив': '04&nbsp;· Sewing',
    'Машины Dürkopp&nbsp;Adler, Германия': 'Dürkopp&nbsp;Adler machines, Germany',
    'Чехлы шьём на&nbsp;промышленных машинах Dürkopp Adler. Они дают ровную строчку на&nbsp;плотных мебельных тканях и&nbsp;коже&nbsp;— строчка к&nbsp;строчке.': 'Covers are sewn on&nbsp;industrial Dürkopp Adler machines. They give an&nbsp;even stitch on&nbsp;dense upholstery fabrics and&nbsp;leather&nbsp;— stitch to&nbsp;stitch.',
    '05&nbsp;· Обивка и&nbsp;сборка': '05&nbsp;· Upholstery and&nbsp;assembly',
    'Обтяжка&nbsp;— вручную': 'Upholstered by&nbsp;hand',
    'Мастер обтягивает изделие руками: ткань без складок, швы по&nbsp;линии, подушки симметричны. Затем собираем, осматриваем и&nbsp;упаковываем к&nbsp;доставке.': 'The&nbsp;craftsman upholsters the&nbsp;piece by&nbsp;hand: fabric without creases, seams in&nbsp;line, cushions symmetrical. Then we assemble, inspect and&nbsp;pack it&nbsp;for delivery.',
    'Качество': 'Quality',
    'Что проверяем перед отправкой': 'What we check before dispatch',
    'Размеры&nbsp;— по&nbsp;согласованному чертежу': 'Dimensions&nbsp;— to&nbsp;the agreed drawing',
    'Швы ровные, рисунок ткани сходится': 'Seams are straight, the&nbsp;fabric pattern matches',
    'Ткань натянута без складок и&nbsp;перекосов': 'Fabric is&nbsp;stretched without creases or&nbsp;skew',
    'Изделие стоит ровно, механизмы работают плавно': 'The&nbsp;piece stands level, mechanisms move smoothly',
    'Материалы': 'Materials',
    'Ткань и&nbsp;посадку выбираете вы': 'You choose the&nbsp;fabric and&nbsp;the seat',
    'Ткани и&nbsp;кожу подбираем в&nbsp;шоуруме из&nbsp;палитры образцов&nbsp;— их&nbsp;можно потрогать и&nbsp;сравнить рядом. Наполнение подбираем под желаемую посадку: мягче или плотнее.': 'We choose fabrics and&nbsp;leather in&nbsp;the showroom from a&nbsp;palette of&nbsp;samples&nbsp;— you can touch them and&nbsp;compare side by&nbsp;side. The&nbsp;filling is&nbsp;matched to&nbsp;the seat you want: softer or&nbsp;firmer.',
    'Гарантия и&nbsp;доставка': 'Warranty and&nbsp;delivery',
    'Отвечаем за&nbsp;изделие и&nbsp;после покупки': 'We stand behind the&nbsp;piece after purchase',
    'Гарантия на&nbsp;мебель&nbsp;— 5&nbsp;лет': 'Furniture warranty&nbsp;— 5&nbsp;years',
    'Срок изготовления&nbsp;— от&nbsp;25 до&nbsp;45&nbsp;рабочих дней': 'Production time&nbsp;— 25 to&nbsp;45 working days',
    'Доставка&nbsp;— по&nbsp;Казахстану и&nbsp;за&nbsp;рубеж': 'Delivery&nbsp;— across Kazakhstan and&nbsp;abroad',
    'На&nbsp;связи в&nbsp;WhatsApp до&nbsp;и&nbsp;после заказа': 'In&nbsp;touch on&nbsp;WhatsApp before and&nbsp;after the&nbsp;order',
    'Записаться в&nbsp;шоурум': 'Book a&nbsp;showroom visit',
    'Собрать в&nbsp;3D': 'Build in&nbsp;3D',
    'Делаем мебель сами&nbsp;— в&nbsp;своём ателье в&nbsp;Алматы: каркас, раскрой, пошив, обивка и&nbsp;сборка. Оборудование&nbsp;— SCM и&nbsp;Dürkopp.': 'We make the furniture ourselves&nbsp;— in&nbsp;our own atelier in&nbsp;Almaty: frame, cutting, sewing, upholstery and&nbsp;assembly. Equipment&nbsp;— SCM and&nbsp;Dürkopp.',
    'Приехать в&nbsp;шоурум': 'Visit the&nbsp;showroom',
    'Мягкая мебель на&nbsp;заказ&nbsp;— под&nbsp;ваш размер и&nbsp;ткань': 'Upholstered furniture made to&nbsp;order&nbsp;— your size, your fabric',
    'Матрасы': 'Mattresses', '3D-конструктор': '3D&nbsp;builder',
    # 12 ноября: меню, окно модели, рекомендации
    'Кресла и&nbsp;пуфы': 'Armchairs and&nbsp;poufs', 'Шоурум и&nbsp;контакты': 'Showroom &amp; contacts', '3D-модель': '3D model', 'Чертёж': 'Drawing',
    'Рекомендуем к&nbsp;этой модели': 'You may also like',
    'Весь каталог': 'Full catalogue',
    'По&nbsp;две в&nbsp;ряд': 'Two per row',
    'Любой&nbsp;— под заказ': 'Any&nbsp;— made to order',
    'Выбрать': 'Choose',
}
ATTR = {
 'Восемь озёр': 'Vosem Ozer (Eight Lakes) resort', 'Макао': 'Macao', 'Клиенты ателье': 'Clients of the atelier', 'Мастер ателье за работой в цехе': 'An atelier craftsman at work in the workshop', 'Каркасы кресел из гнутой фанеры в цехе': 'Bent plywood armchair frames in the workshop', 'Заготовки из гнутой фанеры на стеллаже ателье': 'Bent plywood blanks on an atelier shelf',
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
 'Популярные модели': 'Popular models', 'Модели в деталях': 'Models in detail', 'Станок с ЧПУ вырезает детали каркаса из листа фанеры': 'A CNC machine cuts frame parts from a plywood sheet', 'Разметка ткани мелом на раскройном столе': 'Marking fabric with chalk on the cutting table', 'Промышленная швейная машина: руки ведут ткань под иглой': 'An industrial sewing machine: hands guide the fabric under the needle', 'Мастер обтягивает подлокотник дивана тканью': 'A craftsman upholsters the armrest of a sofa', 'Об ателье подробно': 'About the atelier in detail', 'Ателье: диван в работе на подиуме, стол с инструментом и рулоны ткани': 'The atelier: a sofa in progress on a platform, a tool table and fabric rolls', 'Публикация RICCA HoReCa': 'RICCA HoReCa post', 'RICCA DESIGNS × HoReCa — мастерская ателье': 'RICCA DESIGNS × HoReCa — the atelier workshop', 'Комплектация объектов коммерческой недвижимости': 'Furnishing commercial property', 'Для кого: архитекторы, девелоперы, застройщики, управляющие компании, отели, рестораны': 'Who it is for: architects, developers, builders, management companies, hotels, restaurants', 'Сроки производства — от 25 до 45 рабочих дней': 'Production time — 25 to 45 working days', 'Наши проекты: частные дома, гостиницы, рестораны, апарт-комплексы': 'Our projects: private houses, hotels, restaurants, apartment complexes', 'Пошив: ткань под лапкой швейной машины': 'Sewing: fabric under the machine foot', 'Раскрой ткани ножницами': 'Cutting fabric with shears', 'Обивка: мастер крепит ткань': 'Upholstery: fixing the fabric', 'Работы по видам': 'Works by type', 'Каталог': 'Catalogue',
 'Позвонить: +7 (707) 955-08-08': 'Call: +7 (707) 955-08-08',
 # 12 ноября: меню рядом с корзиной, 3D-модель и чертёж в окне модели
 'Модель в конструкторе': 'Model in the builder',
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
 ('<html lang="ru" class="no-js" translate="no">', '<html lang="en" class="no-js" translate="no">'),
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
page = page.replace('img/cfg/cover-800.webp', 'img/cfg/cover-en-800.webp').replace('img/cfg/cover.webp', 'img/cfg/cover-en.webp')   # обложка конструктора — с английскими подписями
open(ROOT + 'en.html', 'w', encoding='utf-8').write(page)
left = sorted(set(re.findall(r'>([^<>]*[А-Яа-яЁё][^<>]*)<', page[page.index('<body'):])))
print('en.html записан;', 'непереведённых фрагментов:', len(missed)); [print('  ', x[:120]) for x in missed[:40]]
print('кириллица в тексте body (кроме lang=ru):', [x.strip()[:60] for x in left if 'Русск' not in x][:20])
