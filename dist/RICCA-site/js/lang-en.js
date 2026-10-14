/* RICCA DESIGNS — английская страница (/en, файл en.html). Подключается ПОСЛЕ файлов данных и ДО js/cart.js и js/site.js.
   1) window.RICCA_T — словарь «русская строка интерфейса → английская»: tr('…') и tr`… ${x} …` в site.js / cart.js
      (ключ шаблона — его части через {}, в переводе {0}, {1}… — подстановки; формы множественного числа: ед. ч. и род. п. мн. ч.).
   2) Данные (названия работ и моделей, категории, ткани) переводятся прямо в объектах — site.js читает уже английские.
   Русская страница этот файл не подключает: там tr() возвращает текст как есть. */
(() => {
  'use strict';
  const NB = ' ';
  window.RICCA_LANG = 'en';
  window.RICCA_T = {
    // готовые тексты WhatsApp (CONFIG.msg)
    'Здравствуйте! Хочу узнать о мебели RICCA на заказ.': "Hello! I'd like to know more about RICCA custom furniture.",
    'Здравствуйте! У меня вопрос по мебели RICCA.': 'Hello! I have a question about RICCA furniture.',
    'Здравствуйте! Хочу записаться на визит в шоурум RICCA на Навои, 208/2.': "Hello! I'd like to book a visit to the RICCA showroom at 208/2 Navoi St.",
    'Здравствуйте! Интересует диван на заказ. Пришлите, пожалуйста, подборку и расскажите, что нужно для расчёта.': "Hello! I'm interested in a custom sofa. Please send me a selection and tell me what you need for a quote.",
    'Здравствуйте! Интересует кровать на заказ. Размер матраса: 1600 × 2000 / 1800 × 2000 / свой. Пришлите, пожалуйста, подборку.': "Hello! I'm interested in a custom bed. Mattress size: 1600 × 2000 / 1800 × 2000 / custom. Please send me a selection.",
    'Здравствуйте! Интересует кресло. Пришлите, пожалуйста, подборку.': "Hello! I'm interested in an armchair. Please send me a selection.",
    'Здравствуйте! Помогите подобрать ткань.': 'Hello! Please help me choose a fabric.',
    'Здравствуйте! Хочу заказать мебель по фото.': "Hello! I'd like to order furniture from a photo.",
    'Здравствуйте! Хочу обсудить мягкую мебель для своей комнаты: гостиная / спальня / кабинет / другое. Размеры и фото пришлю следующим сообщением.': "Hello! I'd like to discuss upholstered furniture for my room: living room / bedroom / study / other. I'll send the dimensions and photos in my next message.",
    'Здравствуйте! Хочу обсудить проект для бизнеса: отель / ресторан / апарт-комплекс / жилой проект / офис.': "Hello! I'd like to discuss a business project: hotel / restaurant / apartment complex / residential project / office.",
    'Здравствуйте! У меня вопрос к мастеру RICCA.': 'Hello! I have a question for the RICCA master.',
    'Здравствуйте! Я из ___. Хочу заказать мебель с доставкой.': "Hello! I'm from ___. I'd like to order furniture with delivery.",
    'Здравствуйте! Я дизайнер / архитектор, хочу обсудить мебель по проекту. Чертежи, визуализации и спецификации пришлю следующим сообщением.': "Hello! I'm a designer / architect and I'd like to discuss furniture for a project. I'll send drawings, renderings and specifications in my next message.",
    // «Узнать цену» и заявка из окна изделия
    '{} шт.': '{0} pcs', 'ткань {}': 'fabric {0}', 'размер {}': 'size {0}',
    'Здравствуйте! Интересует {}{}.{} Подскажите, пожалуйста, цену и что нужно для расчёта.{}': "Hello! I'm interested in {0}{1}.{2} Could you tell me the price and what you need for a quote?{3}",
    // виды мебели (KINDS)
    'Шьём диваны': 'We make sofas', 'диван': 'a sofa', 'Диван': 'Sofa',
    'Шьём кровати': 'We make beds', 'кровать': 'a bed', 'Кровать': 'Bed',
    'Шьём кресла': 'We make armchairs', 'кресло': 'an armchair', 'Кресло': 'Armchair', ['Кресла и' + NB + 'пуфы']: 'Armchairs and' + NB + 'poufs',
    'Прямые': 'Straight', ['Угловые и' + NB + 'П-образные']: 'Corner and' + NB + 'U-shaped', 'Модульные': 'Modular', 'Раскладные': 'Sofa beds',
    ['С' + NB + 'подъёмным механизмом']: 'With a' + NB + 'lift-up mechanism', 'Без механизма': 'Without a mechanism',
    ['На' + NB + 'ножках или на' + NB + 'цоколе']: 'On' + NB + 'legs or on' + NB + 'a plinth', 'Под размер вашего матраса': 'Sized to your mattress',
    ['Кресла для' + NB + 'отдыха']: 'Lounge armchairs', ['Округлые, на' + NB + 'ножках или на' + NB + 'цоколе']: 'Rounded, on' + NB + 'legs or on' + NB + 'a plinth',
    ['Пуфы и' + NB + 'банкетки']: 'Poufs and' + NB + 'benches',
    // экран категории, работы
    '<span class="sr-only"> (откроется в&nbsp;WhatsApp)</span>': '<span class="sr-only"> (opens in&nbsp;WhatsApp)</span>',
    'Включить': 'Play', 'Остановить': 'Stop',
    'Шьём: {}': 'We make: {0}', 'Каталог': 'Catalogue', 'Модели: {}': 'Models: {0}', 'На&nbsp;заказ': 'Made to&nbsp;order',
    '{} на заказ — любой формы и размера, по вашему фото, эскизу или дизайн-проекту.': '{0} to order — any shape and size, from your photo, sketch or design project.',
    'Что шьём': 'What we make', 'Собрать в&nbsp;3D': 'Build in&nbsp;3D',
    'Здравствуйте! Хочу заказать {} по фото.': "Hello! I'd like to order {0} from a photo.",
    'Отправить фото в&nbsp;WhatsApp': 'Send a photo via&nbsp;WhatsApp', 'В&nbsp;корзину&nbsp;— заявка': 'Add to&nbsp;cart&nbsp;— request',
    'Цену рассчитаем и&nbsp;ответим в&nbsp;WhatsApp.': "We'll quote the price and&nbsp;reply on&nbsp;WhatsApp.",
    'Наши работы': 'Our works', 'Реальные изделия ателье — сшиты по проектам клиентов.': "Real pieces by the atelier — made for our clients' projects.",
    'Работы ателье': 'Atelier works', 'Заявка в&nbsp;корзине&nbsp;— открыть': 'Request in&nbsp;cart&nbsp;— open',
    '{} по вашему проекту': '{0} to your project', 'По фото, эскизу или дизайн-проекту': 'From a photo, sketch or design project',
    'В корзине уже {} позиций — отправьте заявку, затем добавьте ещё': 'The cart already has {0} lines — send the request, then add more',
    'В корзине: {}': 'In the cart: {0}',
    // ткани
    'Ткань {}, цвет {}{}{}': 'Fabric {0}, colour {1}{2}{3}', 'Здравствуйте! Интересует ткань {}, цвет {}.{}': "Hello! I'm interested in the fabric {0}, colour {1}.{2}",
    'Цвет {}': 'Colour {0}', 'Ткани': 'Fabrics', 'Популярные коллекции. Выберите цвет — фото сменится.': 'Popular collections. Pick a colour — the photo will change.',
    'Предыдущий цвет': 'Previous colour', 'Следующий цвет': 'Next colour', 'Цвет ткани {}': 'Colour of fabric {0}', 'Хочу эту ткань': 'I want this fabric',
    'В&nbsp;корзину&nbsp;— образец': 'Add to&nbsp;cart&nbsp;— sample', 'Примерить на&nbsp;мебели в&nbsp;3D': 'Try it on&nbsp;furniture in&nbsp;3D',
    'Больше 50 коллекций и 1000 цветов — вживую в шоуруме на Навои, 208/2.': 'More than 50 collections and 1,000 colours — in person at the showroom, 208/2 Navoi St.',
    'Подобрать ткань в&nbsp;шоуруме': 'Choose a fabric in&nbsp;the showroom', 'Помогите подобрать ткань': 'Help me choose a fabric',
    'Образец в&nbsp;корзине': 'Sample in&nbsp;cart', 'Образец {}, {} в корзине — открыть корзину': 'Sample {0}, {1} is in the cart — open the cart',
    'В корзину — образец ткани {}, {}': 'Add to cart — fabric sample {0}, {1}', 'Хочу эту ткань: {}, {} — написать в WhatsApp': 'I want this fabric: {0}, {1} — message on WhatsApp',
    'Примерить ткань {}, {} на мебели в 3D': 'Try fabric {0}, {1} on furniture in 3D', '{}: {}, {} из {}': '{0}: {1}, {2} of {3}',
    'Ткань {}, {}': 'Fabric {0}, {1}', 'Образец в корзине: {}, {}': 'Sample in cart: {0}, {1}',
    '{}. Образцы&nbsp;— в&nbsp;шоуруме': '{0}. Samples&nbsp;— in&nbsp;the showroom', 'Подобрать ткань в&nbsp;WhatsApp': 'Choose a fabric on&nbsp;WhatsApp',
    // окно изделия
    'Свой размер': 'Custom size', ['{}' + NB + 'шт.']: '{0}' + NB + 'pcs', 'Выберите цвет&nbsp;— или оставьте выбор нам': 'Pick a colour&nbsp;— or leave it to us',
    'В&nbsp;корзине: {}&nbsp;шт.': 'In&nbsp;cart: {0}&nbsp;pcs', 'Открыть корзину': 'Open cart',
    ['Добавлено: {} — {}' + NB + 'шт.']: 'Added: {0} — {1}' + NB + 'pcs', ['{}: теперь {}' + NB + 'шт. в корзине']: '{0}: now {1}' + NB + 'pcs in the cart',
    'Фото {} из {}': 'Photo {0} of {1}', 'ширина × глубина × высота': 'width × depth × height', '{} мм': '{0} mm',
    'Узнать цену в WhatsApp: {}': 'Get a price on WhatsApp: {0}', 'Добавить в корзину: {}': 'Add to cart: {0}',
    'Размеры': 'Dimensions', 'Механизм': 'Mechanism', 'Гарантия': 'Warranty', 'Доставка': 'Delivery', 'Ткань и&nbsp;кожа': 'Fabric and&nbsp;leather', 'Наполнение': 'Filling', 'Срок': 'Lead time',
    // окно работы
    'такую': 'one like this', 'такие': 'ones like these', 'такой': 'one like this',
    'Здравствуйте! Хочу {} же: {}{}. Подскажите, пожалуйста, цену и что нужно для расчёта.{}': "Hello! I'd like {0}: {1}{2}. Could you tell me the price and what you need for a quote?{3}",
    'В&nbsp;корзине': 'In&nbsp;cart', 'В&nbsp;корзину': 'Add to&nbsp;cart', '{} в корзине — открыть корзину': '{0} is in the cart — open the cart', 'В корзину: {}': 'Add to cart: {0}',
    '{} — фото {} из {}': '{0} — photo {1} of {2}', 'Хочу {}': 'I want {0}', 'Хочу {}: {} — написать в WhatsApp': 'I want {0}: {1} — message on WhatsApp',
    // корзина
    'Ткань: {}': 'Fabric: {0}', 'цвет не выбран': 'colour not chosen', 'Ткань: подберём вместе': "Fabric: we'll choose together", 'Размер: {}': 'Size: {0}',
    'Комментарий': 'Comment', 'Размер, механизм, пожелания': 'Size, mechanism, wishes', 'Количество: {}': 'Quantity: {0}', 'Меньше: {}': 'Less: {0}', 'Больше: {}': 'More: {0}',
    'Убрать из корзины: {}': 'Remove from cart: {0}', 'Комментарий к позиции: {}': 'Comment on the line: {0}',
    'Все {} {} открыты в WhatsApp.': 'All {0} {1} have been opened in WhatsApp.', 'Отправлено: {} из {}. Нажмите ещё раз — следующая часть.': 'Sent: {0} of {1}. Press again for the next part.',
    'Заявка длинная — она уйдёт {} сообщениями. Отправьте их по очереди этой кнопкой.': 'The request is long — it will go as {0} messages. Send them one by one with this button.',
    'Открыть WhatsApp ещё раз': 'Open WhatsApp again', 'Отправить<span class="cart__send-tail"> заявку</span> в&nbsp;WhatsApp': 'Send<span class="cart__send-tail"> the request</span> via&nbsp;WhatsApp',
    'Открыть часть {} из&nbsp;{} ещё раз': 'Open part {0} of&nbsp;{1} again', 'Отправить часть {} из&nbsp;{}': 'Send part {0} of&nbsp;{1}',
    'Корзина: {}': 'Cart: {0}', 'Корзина, пусто': 'Cart, empty', 'Корзина очищена': 'Cart cleared', 'Вернуть': 'Undo', 'Корзина возвращена': 'Cart restored',
    // текст заявки (cart.js)
    'ткань — подобрать вместе': 'fabric — to choose together', ' — интересует': ' — interested', ' — {} шт.': ' — {0} pcs',
    '\n(ссылку на конфигурацию пришлю отдельно)': "\n(I'll send the configuration link separately)",
    'Имя: {}': 'Name: {0}', 'Город: {}': 'City: {0}', 'Комментарий: {}': 'Comment: {0}', '{} {} мебели': '{0} {1} of furniture', ' и ': ' and ', 'Итого: {}.': 'Total: {0}.',
    'Здравствуйте! Заявка с сайта RICCA DESIGNS:': 'Hello! Request from the RICCA DESIGNS website:', 'Рассчитайте, пожалуйста, стоимость.': 'Please quote the cost.',
    ' (часть 1 из §):': ' (part 1 of §):', 'Продолжение заявки с сайта RICCA DESIGNS (часть {} из §):\n': 'Continuation of the request from the RICCA DESIGNS website (part {0} of §):\n',
    'в следующих сообщениях (части {}–{})': 'in the next messages (parts {0}–{1})', 'в следующем сообщении': 'in the next message',
    '\n\nЕщё {} {} — {}.': '\n\n{0} more {1} — {2}.', '\n\nОкончание — {}.': '\n\nThe ending — {0}.',
    // множественное число: plural3 берёт ед. ч. (1) и род. п. мн. ч. (остальное)
    'коллекция': 'collection', 'коллекций': 'collections', 'образец': 'sample', 'образцов': 'samples', 'модель': 'model', 'моделей': 'models',
    'цвет': 'colour', 'цветов': 'colours', 'предмет': 'item', 'предметов': 'items', 'часть': 'part', 'частей': 'parts',
    'ткань': 'fabric', 'тканей': 'fabrics', 'позиция': 'line', 'позиций': 'lines',
  };

  /* ---------- Данные: названия работ, моделей, категорий и тканей ---------- */
  const WORK_TITLES = {
    'Банкетка': 'Bench', 'Двухцветная кровать и пуф': 'Two-tone bed and pouf', 'Диван Comfort mini': 'Comfort mini sofa', 'Диван KRAFT': 'KRAFT sofa',
    'Диван Klint': 'Klint sofa', 'Диван Soho': 'Soho sofa', 'Диван VIVALDI': 'VIVALDI sofa', 'Диван Денвер': 'Denver sofa', 'Компактный угловой диван': 'Compact corner sofa',
    'Кресло': 'Armchair', 'Кровать': 'Bed', 'Кровать Duo': 'Duo bed', 'Кровать LOFT': 'LOFT bed', 'Кровать Modena': 'Modena bed', 'Кровать NUBO': 'NUBO bed',
    'Кровать с двойным изголовьем': 'Bed with a double headboard', 'Кровать с мягким изголовьем': 'Bed with an upholstered headboard',
    'Кровать с округлым изголовьем': 'Bed with a rounded headboard', 'Кровать с панельным изголовьем': 'Bed with a panelled headboard', 'Минималистичная кровать': 'Minimalist bed',
    'Модульный диван': 'Modular sofa', 'Модульный диван ARCO': 'ARCO modular sofa', 'Модульный диван Bubble': 'Bubble modular sofa', 'Округлое кресло': 'Rounded armchair',
    'П-образный модульный диван': 'U-shaped modular sofa', 'Пара кресел': 'A pair of armchairs', 'Парящая кровать': 'Floating bed', 'Пуф на трёх ножках': 'Three-legged pouf',
    'Угловой диван': 'Corner sofa', 'Угловой диван на ножках': 'Corner sofa on legs', 'Угловой диван с пуфом': 'Corner sofa with a pouf', 'Угловой модульный диван': 'Corner modular sofa',
  };
  // подписи работ: «букле, молочный», «букле и замша, молочный и рыжий» — по словам
  const WORDS = {
    'букле': 'bouclé', 'велюр': 'velour', 'шенилл': 'chenille', 'рогожка': 'hopsack', 'замша': 'suede', 'айвори': 'ivory', 'бежевый': 'beige', 'белый': 'white',
    'графитовый': 'graphite', 'молочный': 'milk white', 'кант': 'piping', 'горчичный': 'mustard', 'зелёный': 'green', 'изумрудный': 'emerald', 'мокко': 'mocha',
    'пудровый': 'powder pink', 'светло-серый': 'light grey', 'серо-бежевый': 'greige', 'светлый серо-бежевый': 'light greige', 'светло-бежевый': 'light beige',
    'слоновая кость': 'ivory', 'терракотовый': 'terracotta', 'рыжий': 'rust', 'округлый': 'rounded', 'раскладной': 'sofa bed', 'угловой': 'corner',
  };
  const MODEL_SUBS = {
    'Высокое мягкое изголовье': 'Tall upholstered headboard', 'Двух- и трёхместный, есть с шезлонгом': 'Two- and three-seater, chaise option',
    'Двухсекционный или с шезлонгом · раскладной': 'Two-section or with a chaise · sofa bed', 'Модульный · прямой или угловой': 'Modular · straight or corner',
    'На круглых опорах или с механизмом': 'On round legs or with a mechanism', 'На массивных ножках': 'On solid legs', 'На низком цоколе': 'On a low plinth',
    'На ножках · белое букле': 'On legs · white bouclé', 'На опорах или на цоколе с механизмом': 'On legs or on a plinth with a mechanism', 'На тонких ножках': 'On slim legs',
    'На тонких ножках или с механизмом': 'On slim legs or with a mechanism', 'Округлое': 'Rounded', 'Округлое · песочная и меланжевая ткань': 'Rounded · sand and mélange fabric',
    'Округлое, на основании-диске': 'Rounded, on a disc base', 'Округлый · пыльно-розовый шенилл': 'Rounded · dusty pink chenille', 'Подлокотники-валики': 'Bolster armrests',
    'Прямой': 'Straight', 'Прямой · два размера': 'Straight · two sizes', 'Прямой · раскладной': 'Straight · sofa bed', 'С подъёмным механизмом': 'With a lift-up mechanism',
    'С подъёмным механизмом или без': 'With or without a lift-up mechanism', 'С шезлонгом или прямой': 'With a chaise or straight',
    // новые модели 14 октября
    'Модульный · низкий, с шезлонгом': 'Modular · low, with a chaise', 'Угловой · на чёрных ножках': 'Corner · on black legs',
    'Модульный · с шезлонгом, букле': 'Modular · with a chaise, bouclé', 'Округлый · из трёх секций': 'Rounded · three sections',
    'Прямой · на металлической базе': 'Straight · on a metal base', 'Прямой · раскладной, с подголовниками': 'Straight · sofa bed, with headrests',
    'Угловой · раскладной': 'Corner · sofa bed', 'С поясничной подушкой · на металлической базе': 'With a lumbar cushion · on a metal base',
    'На тонких ножках · велюр': 'On slim legs · velour', 'С высокой спинкой · меланжевое букле': 'With a tall back · mélange bouclé',
    'Округлое · на основании-диске, букле': 'Rounded · on a disc base, bouclé', 'Мягкое основание · низкое изголовье': 'Upholstered base · low headboard',
    'Угловой · на конусных ножках': 'Corner · on tapered legs', 'Мягкое основание · присборенная обивка': 'Upholstered base · gathered upholstery',
    'Тонкое изголовье с кантом · на металлических ножках': 'Slim piped headboard · on metal legs', 'Обволакивающее изголовье · цоколь': 'Wraparound headboard · plinth',
    'Скруглённое изголовье · кожа': 'Rounded headboard · leather', 'Букле · на высоких металлических ножках': 'Bouclé · on tall metal legs',
    'Модульный · угловой, со столиком': 'Modular · corner, with a side table', 'Кушетка · модуль без спинки': 'Daybed · backless module',
    'Модульный · скруглённые секции': 'Modular · rounded sections',
    'Модульный · шерпа': 'Modular · sherpa', 'Скруглённый край · на конусных ножках': 'Rounded end · on tapered legs',
    'Угловой · округлая секция и кушетка': 'Corner · rounded section and daybed', 'Широкое · букле, на металлических ножках': 'Wide · bouclé, on metal legs',
    'Модульный · с валиками, дугой или прямой': 'Modular · with bolsters, curved or straight', 'Прямой · двухместный, на чёрных ножках': 'Straight · two-seater, on black legs',
    'С кантом · на тонких металлических ножках': 'Piped · on slim metal legs',
    'Прямой · трёхместный, кожаный корпус': 'Straight · three-seater, leather body',
  };
  const CAT_LABELS = { 'Диваны': 'Sofas', 'Кровати': 'Beds', 'Кресла': 'Armchairs', 'Стулья': 'Chairs', 'Столы': 'Tables', 'Наши работы': 'Our works', 'Ткани': 'Fabrics', 'Матрасы ELUNA': 'ELUNA mattresses' };
  const CAT_DESCS = {
    'Прямые, угловые, модульные, раскладные': 'Straight, corner, modular, sofa beds', 'С подъёмным механизмом и без': 'With or without a lift-up mechanism',
    'Для отдыха: округлые, на цоколе': 'Lounge: rounded, on a plinth', 'Реальные изделия ателье': 'Real pieces by the atelier', 'Велюр, букле, шенилл': 'Velour, bouclé, chenille',
    'Ортопедические, на своём сайте': 'Orthopaedic, on their own website',
  };
  const FAB_TYPES = { 'Велюр': 'Velour', 'Букле': 'Bouclé', 'Шенилл': 'Chenille', 'Замша': 'Suede', 'САМБИЯ': 'SAMBIA' };
  const FAB_KINDS = {
    'букле': 'bouclé', 'велюр': 'velour', 'велюр в рубчик': 'ribbed velour', 'искусственная замша': 'faux suede', 'микровелюр': 'microvelour',
    'микровелюр с муаром': 'microvelour with moiré', 'шенилл': 'chenille',
  };
  const COLOURS = { 'Серый меланж': 'Grey mélange', 'Графит': 'Graphite', 'Тёмно-зелёный': 'Dark green', 'Молочный': 'Milk white', 'Серо-бежевый': 'Greige',
    'Медный меланж': 'Copper mélange', 'Чёрно-бежевая полоса': 'Black and beige stripe', 'Светло-серый меланж': 'Light grey mélange', 'Тёмно-синий': 'Navy',
    'Серо-голубой меланж': 'Grey-blue mélange', 'Льняной': 'Linen', 'Дымчатый с розовой нитью': 'Smoky with pink thread', 'Песочный с белой нитью': 'Sand with white thread',
    'Серый твид': 'Grey tweed', 'Белый с чёрными пятнами': 'White with black spots', 'Чёрно-белый узор': 'Black and white pattern', 'Оливковый с розовым': 'Olive with pink',
    'Чёрный с белыми пятнами': 'Black with white spots', 'Пыльная роза': 'Dusty rose', 'Морская волна': 'Teal', 'Чёрный': 'Black' };   // цвета коллекции RICCA
  const sub = (s) => String(s || '').split(', ').map((p) => p.split(' и ').map((w) => WORDS[w] || w).join(' and ')).join(', ');
  const modelTitle = (t) => {
    const m = /^(Диван|Кресло|Кровать) (.+)$/.exec(t || '');
    if (!m) return WORK_TITLES[t] || t;
    const kind = { 'Диван': 'sofa', 'Кресло': 'armchair', 'Кровать': 'bed' }[m[1]];
    const no = /^№\s*(\d+)$/.exec(m[2]);
    return no ? `${kind.replace(/^./, (c) => c.toUpperCase())} No. ${no[1]}` : `${m[2]} ${kind}`;
  };
  const FACTS = { 'для вакуумной упаковки': 'suitable for vacuum packing', 'чистка: мыльный раствор': 'cleaning: soapy water', 'чистка: сухая': 'cleaning: dry only',
    'водоотталкивающая пропитка': 'water-repellent finish', 'легко чистится': 'easy to clean', 'антикоготь': 'claw-resistant', 'не выгорает': 'fade-resistant' };
  const fact = (f) => FACTS[String(f)] || String(f).replace(/^(\d[\d ]*) циклов$/, '$1 cycles').replace(/г\/м\.п\./, 'g/lm').replace(/г\/м²/, 'g/m²')
    .replace(/^ширина (\d+) см$/, 'width $1 cm').replace(/^плотность /, 'density ').replace(/^состав: /, 'composition: ');

  (window.RICCA_WORKS || []).forEach((w) => { if (!w) return; w.title = WORK_TITLES[w.title] || w.title; w.sub = sub(w.sub); });
  (window.RICCA_MODELS || []).forEach((w) => { if (!w) return; w.title = modelTitle(w.title); w.sub = MODEL_SUBS[w.sub] || sub(w.sub); });
  Object.values(window.RICCA_CATALOG_CATEGORIES || {}).forEach((c) => { if (!c) return; c.label = CAT_LABELS[c.label] || c.label; if (c.desc) c.desc = CAT_DESCS[c.desc] || c.desc; });
  (((window.RICCA_FABRIC_LIBRARY || {}).types) || []).forEach((t) => {
    if (!t) return;
    t.title = FAB_TYPES[t.title] || t.title;
    (t.collections || []).forEach((c) => {
      c.title = FAB_TYPES[c.title] || c.title;
      if (c.kind) c.kind = c.kind.split(': ').map((k) => FAB_KINDS[k] || k).join(': ');
      if (c.totalNote) c.totalNote = 'More than 50 collections and 1,000 colours — in the showroom';
      if (Array.isArray(c.facts)) c.facts = c.facts.map(fact);
      (c.colours || []).forEach((k) => { k.name = COLOURS[k.name] || k.name; });
    });
  });
  document.documentElement.lang = 'en';
})();
