/* RICCA DESIGNS — английский конструктор (ricca.design/en/configurator). Та же страница configurator.html: этот файл
   включается только на адресе /en/… (или ?lang=en) и переводит интерфейс на лету — надписи страницы, подсказки, тосты,
   итог, чертёж и текст для WhatsApp. На русской странице ничего не делает.
   Как устроено: FR — фразы «по-русски → по-английски»; длинные фразы берутся раньше коротких, поэтому шаблоны вида
   «Ширина модуля увеличена до 120 см — …» переводятся кусками (число остаётся). RE — несколько правил, где меняется
   порядок слов («Диван Svira» → «Svira sofa»). Новая надпись в конструкторе → добавьте её сюда. */
(() => {
  'use strict';
  const EN = /^\/en(\/|$)/.test(location.pathname) || /[?&]lang=en\b/.test(location.search);
  window.RICCA_CFG_LANG = EN ? 'en' : 'ru';
  if (!EN) return;
  document.documentElement.lang = 'en';
  { const mf = document.querySelector('link[rel="manifest"]'); if (mf) mf.setAttribute('href', '/en.webmanifest'); }   // «приложение» на английском

  const FR = {
    /* страница */
    'Соберите свою мебель — RICCA DESIGNS': 'Build your furniture — RICCA DESIGNS',
    'Конструктор RICCA DESIGNS: выберите тип, форму, любой размер и ткань — посмотрите вариант в 3D и отправьте в WhatsApp на расчёт. Ателье мягкой мебели в Алматы.':
      'RICCA DESIGNS configurator: choose the type, shape, any size and fabric — see it in 3D and send it to WhatsApp for a quote. Upholstered furniture atelier in Almaty.',
    'Перейти к параметрам': 'Skip to options', 'RICCA DESIGNS — на главную': 'RICCA DESIGNS — home', 'Разделы': 'Sections',
    'Написать в WhatsApp': 'Message us on WhatsApp', 'Каталог': 'Catalogue', 'Конструктор': 'Configurator', 'Соберите свою мебель': 'Build your furniture',
    'Любая форма и любой размер — соберите вариант, а мы сошьём его в ателье в Алматы.': 'Any shape and any size — build your piece, and we’ll make it in our atelier in Almaty.',
    'Режим': 'Mode', 'Модель': 'Model', 'Моя комната': 'My room', 'Фото комнаты': 'Room photo',
    'Трёхмерная модель — тяните, чтобы повернуть': '3D model — drag to rotate',
    'Сфотографируйте комнату — и ваш вариант встанет в неё': 'Take a photo of your room — and your piece will stand in it',
    'В кадре должен быть виден пол, куда встанет мебель': 'The floor where the furniture will stand should be in the frame',
    'Сфотографировать': 'Take a photo', 'Выбрать фото': 'Choose a photo',
    'Удобнее с телефона: откройте этот вариант по коду,': 'Easier on a phone: open this piece with a code,', 'показать код': 'show the code',
    'Вид': 'View', 'Спереди': 'Front', 'Сбоку': 'Side', 'Сверху': 'Top', 'Размеры': 'Dimensions', 'Сохранить фото': 'Save photo',
    'Фотореалистичный кадр': 'Photorealistic shot', 'Сбросить вид': 'Reset view', 'Отменить': 'Cancel', 'Сохранить': 'Save',
    'Тип мебели': 'Furniture type', 'Тип': 'Type', 'Смотреть модели в каталоге': 'See models in the catalogue', 'Форма': 'Shape', 'Размер': 'Size',
    'Нужен другой размер?': 'Need a different size?', 'Напишите — сошьём': 'Message us — we’ll make it',
    'Ткань': 'Fabric', 'Тип ткани': 'Fabric type', 'Коллекция': 'Collection', 'Цвет': 'Colour',
    'Цвет на экране может немного отличаться — образцы покажем в шоуруме.': 'On-screen colour may differ slightly — we’ll show you samples in the showroom.',
    'Больше 200 коллекций и 5000 цветов — в шоуруме.': 'More than 200 collections and 5,000 colours — in the showroom.',
    'Итог': 'Summary', 'Пожелание': 'Note', 'Количество': 'Quantity',
    'Например: мягче посадка, подушки на молнии': 'For example: softer seat, zip-off cushions',
    'Меньше': 'Less', 'Больше': 'More',
    'Отправить в WhatsApp на расчёт': 'Send to WhatsApp for a quote', 'Чертёж': 'Drawing', 'Посмотреть у себя дома': 'See it in your home',
    'Добавить в комнату': 'Add to the room', 'Рассчитаем стоимость в WhatsApp.': 'We’ll quote the price on WhatsApp.',
    'Это схема для подбора формы, размера и ткани; детали согласуем с мастером.': 'This is a guide for choosing the shape, size and fabric; we’ll agree the details with the master.',
    'Это примерка для подбора формы, размера и ткани; детали согласуем с мастером.': 'This is a preview for choosing the shape, size and fabric; we’ll agree the details with the master.',
    'Сбросить': 'Reset', 'Комната': 'Room', 'Высота потолка': 'Ceiling height', 'Стиль комнаты': 'Room style', 'Стены': 'Walls', 'Пол': 'Floor',
    'Ткани к вашей комнате': 'Fabrics for your room', 'Подсказка': 'Tip',
    'Это подсказка по тону и теплу, решать вам. Любую ткань из библиотеки можно выбрать в «Изменить» у предмета, образцы покажем в шоуруме.':
      'This is a tip on tone and warmth — the choice is yours. You can pick any fabric from the library under “Edit” on an item; we’ll show you samples in the showroom.',
    'Быстро добавить': 'Quick add', 'Добавить': 'Add', 'Мой вариант': 'My piece', 'мой вариант': 'my piece', 'В комнате': 'In the room',
    'Пока пусто — добавьте мебель. Двигайте её пальцем или мышью.': 'Empty for now — add furniture. Move it with your finger or mouse.',
    'Камера': 'Camera', 'Облёт': 'Orbit', 'Взгляд из комнаты': 'View from the room', 'Сетка': 'Grid', 'Отправить план в WhatsApp': 'Send the plan to WhatsApp',
    'Снимите комнату с того места, откуда на неё обычно смотрят: телефон на уровне груди, в кадре — пол и стена. Фото остаётся у вас на телефоне и никуда не отправляется.':
      'Take the photo from where you usually look at the room: phone at chest height, floor and wall in the frame. The photo stays on your phone and isn’t sent anywhere.',
    'Мебель': 'Furniture', 'Форма и размер': 'Shape and size', 'Другая ткань': 'Another fabric', 'Положение': 'Position',
    'Повернуть влево': 'Rotate left', 'Повернуть вправо': 'Rotate right', 'Ближе': 'Closer', 'Дальше': 'Further', 'Высота съёмки': 'Camera height',
    'Наклон телефона': 'Phone tilt',
    'Если мебель будто висит в воздухе или тонет в полу — подвиньте эти два ползунка. На фото мебель можно тянуть пальцем по полу, двумя пальцами — поворачивать и приближать.':
      'If the furniture seems to float or sink into the floor, adjust these two sliders. In the photo you can drag the furniture along the floor with one finger, and rotate or zoom with two.',
    'Поставить по центру': 'Centre it', 'Отправить фото в WhatsApp': 'Send the photo to WhatsApp', 'Вживую через камеру (AR)': 'Live through the camera (AR)',
    'RICCA DESIGNS · Алматы, ул. Алишера Навои, 208/2 ·': 'RICCA DESIGNS · Almaty, 208/2 Alisher Navoi St. ·',
    'У себя дома': 'In your home', 'В WhatsApp': 'To WhatsApp', 'Готовим чертёж…': 'Preparing the drawing…', 'Крупно': 'Close-up',
    'Скачать чертёж': 'Download drawing', 'Отправить чертёж': 'Send drawing', 'Файл для дизайнера (SVG)': 'File for designers (SVG)',
    'Схема для согласования. Размеры в см. Детали согласуем с мастером.': 'Drawing for approval. Dimensions in cm. We’ll agree the details with the master.',
    'Освободите участок пола, нужен свет': 'Clear a patch of floor; you need light', 'Наведите телефон на пол и медленно поведите им': 'Point your phone at the floor and move it slowly',
    'Мебель встанет в реальном размере (на Android — коснитесь пола)': 'The furniture will appear at real size (on Android, tap the floor)',
    'Двигайте пальцем, поворачивайте двумя пальцами': 'Move with one finger, rotate with two', 'Готовим модель…': 'Preparing the model…',
    'Скопировать ссылку': 'Copy link', 'Откройте на телефоне': 'Open on your phone',
    'Наведите камеру телефона на код — вариант откроется на телефоне, там нажмите «У себя дома».': 'Point your phone camera at the code — the piece will open on your phone; tap “In your home” there.',
    'Закрыть': 'Close', 'Чертёж варианта: виды спереди, сбоку и сверху с размерами в сантиметрах': 'Drawing of the piece: front, side and top views with dimensions in centimetres',
    'Открыть чертёж во весь экран': 'Open the drawing full screen', 'QR-код ссылки на вариант': 'QR code with a link to the piece',
    'Модели каталога в точном 3D': 'Catalogue models in exact 3D',
    'Собрать из деталей и менять форму': 'Build from parts and change the shape',
    'Написать в WhatsApp с этим размером': 'Message us on WhatsApp with this size',
    'Общая ширина': 'Overall width', 'Габарит кровати': 'Bed footprint', 'Готовые размеры': 'Preset sizes',
    'Далее': 'Next',

    /* типы и варианты (params.js, app.js) */
    'диван угловой с шезлонгом': 'corner sofa with a chaise', 'диван прямой': 'straight sofa', 'диван угловой': 'corner sofa', 'диван п-образный': 'U-shaped sofa',
    'модульный диван': 'modular sofa', 'кресло округлое': 'round armchair', 'пуф круглый': 'round pouf', 'пуф квадратный': 'square pouf',
    'Язык сайта': 'Site language',
    'Диван угловой с шезлонгом': 'Corner sofa with a chaise', 'Диван прямой': 'Straight sofa', 'Диван угловой': 'Corner sofa', 'Диван П-образный': 'U-shaped sofa',
    'Модульный диван': 'Modular sofa', 'Кресло округлое': 'Round armchair', 'Пуф / банкетка': 'Pouf / bench', 'Пуф круглый': 'Round pouf', 'Пуф квадратный': 'Square pouf',
    'Диван': 'Sofa', 'Кровать': 'Bed', 'Кресло': 'Armchair', 'Пуф': 'Pouf', 'Банкетка': 'Bench', 'Изделие': 'Piece',
    'без подлокотников': 'no armrests', 'Без подлокотников': 'No armrests', 'Полукресло': 'Slim arms',
    'тонкие': 'slim', 'широкие': 'wide', 'округлые': 'rounded', 'цельная спинка': 'one-piece back', 'съёмные подушки': 'loose cushions',
    'одна подушка': 'one cushion', 'по секциям': 'in sections', 'скрытые': 'hidden', 'металл': 'metal', 'дерево': 'wood', 'цоколь': 'plinth',
    'диск-опора': 'disc base', 'чёрный': 'black', 'золотистый': 'gold', 'светлое дерево': 'light wood', 'орех': 'walnut', 'тёмное дерево': 'dark wood',
    'с кантом': 'with piping', 'без канта': 'no piping', 'угол слева': 'corner on the left', 'угол справа': 'corner on the right', 'Г-образный': 'L-shaped',
    'с шезлонгом': 'with a chaise', 'классическое': 'classic', 'округлое': 'rounded', 'квадратный': 'square', 'круглый': 'round', 'банкетка': 'bench',
    'без шезлонга': 'no chaise', 'шезлонг слева': 'chaise on the left', 'шезлонг справа': 'chaise on the right', 'гладкое': 'plain',
    'вертикальная простёжка': 'vertical channel tufting', 'каретная стяжка': 'button tufting', 'с «ушками»': 'with wings', 'ножки': 'legs',
    'четыре ножки': 'four legs', 'опора': 'base', 'без механизма': 'no mechanism', 'подъёмный механизм — обсудим': 'lift-up mechanism — let’s discuss',
    'подъёмный механизм': 'lift-up mechanism', 'гладкий': 'plain', 'шезлонг': 'chaise',
    'Низкая спинка': 'Low back', 'Высокая спинка': 'High back', 'низкая': 'low', 'высокая': 'high',
    'Слева': 'Left', 'Справа': 'Right', 'слева': 'on the left', 'справа': 'on the right', 'Нет': 'None', 'Без': 'None', 'Авто': 'Auto',
    'Без механизма': 'No mechanism', 'Подъёмный': 'Lift-up', 'Без канта': 'No piping', 'С кантом': 'With piping',
    'Подлокотники': 'Armrests', 'Подлокотник': 'Armrest', 'Спинка': 'Back', 'Подушки спинки': 'Back cushions', 'Сиденье': 'Seat', 'Секций': 'Sections',
    'Ножки': 'Legs', 'Отделка ножек': 'Leg finish', 'Кант': 'Piping', 'Угол': 'Corner', 'Модулей': 'Modules', 'Шезлонг': 'Chaise', 'Изголовье': 'Headboard',
    'Основание': 'Base', 'Подъёмный механизм': 'Lift-up mechanism', 'Верх': 'Top', 'Высота цоколя': 'Plinth height', 'Высота ножек': 'Leg height',
    'Ширина': 'Width', 'Глубина': 'Depth', 'Высота': 'Height', 'Высота сиденья': 'Seat height', 'Глубина сиденья': 'Seat depth',
    'Ширина подлокотника': 'Armrest width', 'Высота подлокотника': 'Armrest height', 'Длина вдоль спинки': 'Length along the back',
    'Длина шезлонга': 'Chaise length', 'Вторая сторона': 'Second side', 'Ширина шезлонга': 'Chaise width', 'Боковые стороны': 'Sides',
    'Ширина модуля': 'Module width', 'Глубина шезлонга': 'Chaise depth', 'Ширина матраса': 'Mattress width', 'Длина матраса': 'Mattress length',
    'Высота изголовья': 'Headboard height', 'Выступ изголовья с каждой стороны': 'Headboard overhang on each side', 'Выступ изголовья': 'Headboard overhang',
    'Боковина': 'Side rail', 'Высота царги': 'Rail height', 'Толщина оболочки': 'Shell thickness', 'Высота оболочки спереди': 'Shell height at the front',
    'Диаметр': 'Diameter', 'Сторона': 'Side', 'Длина': 'Length', 'Длина второй стороны': 'Second side length', 'Длина сторон': 'Side length',
    'Секция': 'Section', 'Угловой модуль': 'Corner module', 'Проём': 'Opening', 'Модуль': 'Module', 'Ширина (изголовье)': 'Width (headboard)', 'Выступ': 'Overhang',
    'Матрас': 'Mattress', 'Царга': 'Rail', 'Верх матраса': 'Mattress top', 'Ушки': 'Wings', 'матрас показан для масштаба': 'mattress shown for scale',
    'Цоколь': 'Plinth', '3 × 100 + шезлонг': '3 × 100 + chaise', 'Банкетка 140': 'Bench 140',
    'тип': 'type', 'форма': 'shape', 'размер': 'size', 'ткань': 'fabric', 'итог': 'summary',
    'цветов': 'colours', 'цвета': 'colours', 'цвет': 'colour',
    'Модули': 'Modules', 'Посадка': 'Seat', 'есть': 'yes', 'нет': 'no', 'обсудим': 'let’s discuss', 'подберём вместе': 'we’ll choose together',
    'Ткань подберём вместе': 'We’ll choose the fabric together', 'ткань подберём вместе': 'fabric to be chosen together',
    'точная 3D-модель, как на фото': 'exact 3D model, as in the photo', 'округлая оболочка': 'rounded shell', 'толщина': 'thickness',
    'высота спереди': 'front height', 'высота изголовья': 'headboard height', 'высота': 'height', 'ширина': 'width', 'глубина': 'depth', 'длина': 'length',
    'выступ': 'overhang', 'боковина': 'side rail', 'отделка': 'finish', 'винтаж': 'vintage',
    'по секциям: ': 'in sections: ', ' + угол + ': ' + corner + ',

    /* сообщения конструктора */
    'Эта ткань сейчас не в библиотеке конструктора — выберите похожую; образцы покажем в шоуруме': 'This fabric isn’t in the configurator library right now — pick a similar one; we’ll show you samples in the showroom',
    'Ателье шьёт только мягкую мебель — показываем диван': 'The atelier makes upholstered furniture only — showing a sofa',
    'Теперь модель собрана из деталей — меняйте форму': 'The model is now built from parts — change the shape',
    'Точная модель не загрузилась — показана собранная из деталей': 'The exact model didn’t load — showing one built from parts',
    ': точная модель, как на фото. Меняйте размеры, ткань и ножки': ': the exact model, as in the photo. Change the size, fabric and legs',
    'Собрано по мотивам: ': 'Built after: ', '. Меняйте что угодно': '. Change anything you like',
    ' — точная модель, как на фото. Размеры, ткань и ножки меняются; форма — нет.': ' is the exact model, as in the photo. The size, fabric and legs can change; the shape can’t.',
    ': готовые': ': presets', ': меньше на 1 см': ': 1 cm less', ': больше на 1 см': ': 1 cm more',
    'Как на фото: ': 'As in the photo: ',
    'Трёхмерный вид недоступен на этом устройстве. Параметры, ткань и отправка в WhatsApp работают.': '3D view isn’t available on this device. Options, fabric and sending to WhatsApp still work.',
    ': показать крупно на сиденье': ': show close-up on the seat',
    'Фото сохранено — прикрепите его в чате': 'Photo saved — attach it in the chat', 'Фото сохранено': 'Photo saved',
    'Не получилось сохранить фото': 'Couldn’t save the photo', 'Кадр готов': 'Shot ready', 'Не получилось — сохраните обычное фото': 'Didn’t work — save a regular photo',
    'Чертёж пока не получилось подготовить. Отправьте вариант в WhatsApp — мастер пришлёт схему.': 'Couldn’t prepare the drawing yet. Send the piece to WhatsApp — the master will send you a drawing.',
    'Чертёж RICCA': 'RICCA drawing',
    'Instagram открывает сайт во встроенном браузере — камера здесь не запустится. Нажмите ⋯ вверху справа → «Открыть в браузере».':
      'Instagram opens the site in its built-in browser — the camera won’t start here. Tap ⋯ at the top right → “Open in browser”.',
    'Открыть камеру': 'Open camera',
    'Этот телефон не может показать мебель через камеру в браузере — откройте страницу в Safari на iPhone или в Chrome на Android. Или посмотрите вариант в шоуруме.':
      'This phone can’t show furniture through the camera in the browser — open the page in Safari on iPhone or Chrome on Android. Or see it in the showroom.',
    'Планировщик комнаты не загрузился. Обновите страницу.': 'The room planner didn’t load. Please refresh the page.',
    'Ваш вариант уже в комнате. Двигайте его пальцем или мышью': 'Your piece is already in the room. Move it with your finger or mouse',
    'В этом браузере 3D не работает — попробуйте другой браузер.': '3D doesn’t work in this browser — try another one.',
    'Режим «Фото комнаты» не загрузился. Обновите страницу.': '“Room photo” mode didn’t load. Please refresh the page.',
    'Готовим фото…': 'Preparing the photo…', 'Не удалось открыть фото. Попробуйте другое.': 'Couldn’t open the photo. Try another one.',
    'Не получилось сделать снимок': 'Couldn’t take the shot', 'Ссылка скопирована': 'Link copied', 'Скопируйте адрес из строки браузера': 'Copy the address from the browser bar',
    'На модели: ': 'On the model: ',
    'Тяните мебель по полу · двумя пальцами — поворот и ближе/дальше': 'Drag the furniture along the floor · two fingers to rotate and move closer/further',
    'Тяните мебель мышью по полу · колесо — ближе/дальше': 'Drag the furniture along the floor with the mouse · wheel to move closer/further',
    /* проверка размеров (validate.js) */
    'Такой размер не подходит для одного изделия — напишите нам, обсудим.': 'This size doesn’t work for a single piece — message us and we’ll discuss it.',
    'Нестандартный размер — уточним с мастером': 'Non-standard size — we’ll confirm with the master',
    ': нестандартный размер — уточним с мастером': ': non-standard size — we’ll confirm with the master',
    'Большое количество — уточним с мастером': 'Large quantity — we’ll confirm with the master',
    ' — для видимых цоколей': ' — too low for a visible plinth', ' — для видимых ножек': ' — too low for visible legs',
    'Округлое кресло — только с подлокотниками: оболочка обнимает сиденье': 'The round armchair comes with armrests only: the shell wraps around the seat',
    'Ширина модуля увеличена до ': 'Module width increased to ', ' — сиденья вместе не меньше 120 см': ' — seats together need at least 120 cm',
    'Глубина шезлонга увеличена до ': 'Chaise depth increased to ', ' — на 40 см больше глубины дивана': ' — 40 cm more than the sofa depth',
    'Глубина сиденья уменьшена до ': 'Seat depth reduced to ', ', чтобы поместилась спинка': ' so the back fits',
    'Глубина сиденья увеличена до ': 'Seat depth increased to ', ' — спинка не толще 45 см': ' — the back is no thicker than 45 cm',
    'Цоколь уменьшен до ': 'Plinth lowered to ', 'Ножки уменьшены до ': 'Legs shortened to ', ', чтобы сиденье осталось на высоте ': ' to keep the seat at ',
    'Высота сиденья увеличена до ': 'Seat height increased to ', ' — под подушкой нужна рама': ' — the cushion needs a frame underneath',
    'Высота увеличена до ': 'Height increased to ', ' — спинка выше сиденья хотя бы на 25 см': ' — the back must be at least 25 cm above the seat',
    'Высота подлокотника поднята до ': 'Armrest height raised to ', ' — выше сиденья на 10 см': ' — 10 cm above the seat',
    'Высота подлокотника уменьшена до ': 'Armrest height lowered to ', ' — не выше спинки': ' — no higher than the back',
    'Длина дивана увеличена до ': 'Sofa length increased to ', ' — иначе не поместится сиденье у угла': ' — otherwise the corner seat won’t fit',
    'Вторая сторона увеличена до ': 'Second side increased to ', ' — иначе не поместится сиденье': ' — otherwise the seat won’t fit',
    'Длина шезлонга увеличена до ': 'Chaise length increased to ', ' — на 45 см больше глубины дивана': ' — 45 cm more than the sofa depth',
    'Ширина шезлонга увеличена до ': 'Chaise width increased to ', ' — сиденье шезлонга не уже 50 см': ' — the chaise seat is at least 50 cm wide',
    'Для шезлонга такой ширины диван слишком короткий — увеличьте длину или напишите нам.': 'The sofa is too short for a chaise this wide — increase the length or message us.',
    'Ширина шезлонга уменьшена до ': 'Chaise width reduced to ', ' — иначе не поместится основное сиденье': ' — otherwise the main seat won’t fit',
    'Ширина увеличена до ': 'Width increased to ', ' — между сторонами нужно не меньше 60 см': ' — at least 60 cm is needed between the sides',
    'Длина сторон увеличена до ': 'Side length increased to ',
    'Подлокотники сужены до ': 'Armrests narrowed to ', ' — сиденье не уже ': ' — the seat is at least ',
    'При ширине ': 'At a width of ', ' не помещаются подлокотники и сиденье — нужно не меньше ': ' the armrests and seat don’t fit — the minimum is ',
    ' не помещаются сиденье — нужно не меньше ': ' the seat doesn’t fit — the minimum is ',
    ' — подушка внутри оболочки': ' — the cushion sits inside the shell',
    'Секций сиденья: ': 'Seat sections: ', ' — каждая не уже 45 см': ' — each at least 45 cm wide',
    'Выступ изголовья увеличен до ': 'Headboard overhang increased to ', ' — для «ушек» нужно не меньше 8 см': ' — wings need at least 8 cm',
    ' — царга выше на 15 см': ' — the rail is 15 cm higher', 'Высота царги увеличена до ': 'Rail height increased to ', ' — под ней ': ' — below it: ',
    'Высота изголовья увеличена до ': 'Headboard height increased to ', ' — выше матраса на 30 см': ' — 30 cm above the mattress',
    'Глубина банкетки уменьшена до ': 'Bench depth reduced to ', ' — не больше половины длины': ' — no more than half the length',
    ' — мягкая часть не тоньше 15 см': ' — the upholstered part is at least 15 cm thick',
    /* комната (room.js, roomstyle.js) */
    'Молочный': 'Milk white', 'Тёплый серый': 'Warm grey', 'Графит': 'Graphite', 'Оливковый': 'Olive', 'Терракотовый': 'Terracotta',
    'Светлый дуб': 'Light oak', 'Тёмный дуб': 'Dark oak', 'Бетон': 'Concrete', 'Мрамор': 'Marble', 'Ковёр': 'Carpet',
    'тон в тон · фактура': 'tone on tone · texture', 'темнее стены': 'darker than the wall', 'светлее стены': 'lighter than the wall', 'тёплый': 'warm',
    'холодный': 'cool', 'нейтральный': 'neutral', 'приглушённый': 'muted',
    'Светлая стена — ткань на тон-два темнее': 'Light wall — fabric a shade or two darker', 'Тёмная стена — светлая ткань': 'Dark wall — light fabric',
    'Стена средней светлоты — ткань светлее или глубже': 'Mid-tone wall — fabric lighter or deeper',
    'тёплый пол — тёплые и нейтральные оттенки': 'warm floor — warm and neutral shades', 'холодный пол — холодные и нейтральные оттенки': 'cool floor — cool and neutral shades',
    'Выбранный предмет': 'Selected item', 'Повернуть на 15° против часовой': 'Rotate 15° anticlockwise', 'Повернуть на 15° по часовой': 'Rotate 15° clockwise',
    'Повернуть на 90°': 'Rotate 90°', 'Дублировать': 'Duplicate', 'Изменить': 'Edit', 'Удалить': 'Delete', 'Вернуть': 'Undo',
    'Обновлено: ': 'Updated: ', 'Добавлено: ': 'Added: ', 'Копия добавлена': 'Copy added', 'Удалено: ': 'Deleted: ', 'Вернули: ': 'Restored: ',
    'Высота потолка — от 240 до 400 см': 'Ceiling height — from 240 to 400 cm', 'Размер комнаты — от 2 до 12 м': 'Room size — from 2 to 12 m',
    'План комнаты RICCA': 'RICCA room plan', 'Трёхмерный вид недоступен — список и отправка плана работают.': '3D view isn’t available — the list and sending the plan still work.',
    'Ткани одного предмета сейчас нет в библиотеке — показали спокойную, подберём вместе': 'One item’s fabric isn’t in the library right now — we’ve shown a calm one; we’ll choose together',
    'Тканей нескольких предметов сейчас нет в библиотеке — показали спокойные, подберём вместе': 'Several items’ fabrics aren’t in the library right now — we’ve shown calm ones; we’ll choose together',
    'Коснитесь ткани — ляжет на: ': 'Tap a fabric to apply it to: ', 'Добавьте мебель — и примерьте на ней ткань': 'Add furniture — and try fabrics on it',
    /* WhatsApp */
    'Здравствуйте! Пишу из конструктора RICCA.': 'Hello! I’m writing from the RICCA configurator.',
    'Здравствуйте! Вариант из конструктора RICCA — рассчитайте, пожалуйста, стоимость.': 'Hello! Here is my piece from the RICCA configurator — could you give me a quote, please?',
    'Вариант: ': 'Link: ', 'Чертёж прикреплю картинкой.': 'I’ll attach the drawing as an image.', 'Сейчас: ': 'Now: ',
    'Здравствуйте! Нужен другой размер — ': 'Hello! I need a different size — ', 'Нужно: ': 'Needed: ',
    'Здравствуйте! План комнаты из конструктора RICCA: ': 'Hello! My room plan from the RICCA configurator: ', ', потолок ': ', ceiling ',
    'Стены — ': 'Walls — ', ', пол — ': ', floor — ', 'Мебель пока не расставлена.': 'No furniture placed yet.',
    ' (типовой вариант — уточним)': ' (standard version — to be confirmed)', 'План: ': 'Plan: ', 'Рассчитайте, пожалуйста, стоимость.': 'Could you give me a quote, please?',
    ' Примерка в моей комнате — фото во вложении.': ' Preview in my room — photo attached.', 'Примерка в моей комнате — фото во вложении.': 'Preview in my room — photo attached.',
    /* чертёж (drawing.js) */
    'спинка': 'back', 'сид.': 'seat', 'подл.': 'arm', 'царга': 'rail', 'матрас': 'mattress', 'изг.': 'hb', 'ушки': 'wings', 'бок.': 'side',
    'угол': 'corner', 'проём': 'opening', 'шезл.': 'chaise', 'Примечания:': 'Notes:', 'Чертёж ': 'Drawing ',
    'Вид спереди': 'Front view', 'Вид слева': 'Left view', 'Вид сверху': 'Top view', 'М 1:': 'Scale 1:',
    'ВИД 3/4 · ДЛЯ НАГЛЯДНОСТИ': '3/4 VIEW · FOR ILLUSTRATION', 'СПЕЦИФИКАЦИЯ': 'SPECIFICATION', 'для наглядности': 'for illustration', 'Спецификация': 'Specification', 'Схема для согласования. Размеры в см': 'Drawing for approval. Dimensions in cm',
    'Дата': 'Date', 'Масштаб': 'Scale', 'Лист': 'Sheet', 'RICCA DESIGNS — ателье мягкой мебели, Алматы': 'RICCA DESIGNS — upholstered furniture atelier, Almaty',
    'ул. Алишера Навои, 208/2 · шоурум': '208/2 Alisher Navoi St. · showroom', 'WhatsApp · номер схемы ': 'WhatsApp · please quote drawing No. ',
    ' указывайте в переписке': ' in your messages', ' · размеры в сантиметрах': ' · dimensions in centimetres',
    /* ткани — на случай, если название пришло не из переведённой библиотеки */
    'велюр в рубчик': 'ribbed velour', 'микровелюр': 'microvelour', 'велюр': 'velour', 'букле': 'bouclé', 'шенилл': 'chenille', 'искусственная замша': 'faux suede',
    'замша': 'suede', 'экокожа': 'faux leather', 'рогожка': 'hopsack',
    /* единицы */
    'см': 'cm', 'м': 'm', '№': 'No.',
  };

  /* перестановки слов */
  const KIND = { 'Диван': 'sofa', 'Кресло': 'armchair', 'Кровать': 'bed', 'Пуф': 'pouf' };
  const RE = [
    [/(Диван|Кресло|Кровать|Пуф)[\s ]+№[\s ]*(\d+)/g, (m, k, n) => `${KIND[k][0].toUpperCase()}${KIND[k].slice(1)} No. ${n}`],
    [/(Диван|Кресло|Кровать|Пуф)[\s ]+([A-Z][A-Za-z0-9-]*(?:[\s ][A-Z][A-Za-z0-9-]*)?)/g, (m, k, n) => `${n} ${KIND[k]}`],
  ];
  const QUOTES = [/«([^»]*)»/g, (m, s) => `“${s}”`];   // после перевода фраз: «с «ушками»» сначала должно найтись целиком

  /* варианты регистра первой буквы: «Ширина» ↔ «ширина» */
  const keepCase = /^(WhatsApp|RICCA|Instagram|Safari|Chrome|Android|iPhone|AR|SVG|QR|No\.|[A-Z]{2})/;
  const dict = new Map();
  for (const [k, v] of Object.entries(FR)) {
    if (!v) continue;
    dict.set(norm(k), v);
    const c = k.charAt(0), lc = c.toLowerCase(), uc = c.toUpperCase();
    if (/[А-ЯЁа-яё]/.test(c) && k.split(' ').length <= 4 && !keepCase.test(v)) {
      const alt = (c === lc ? uc : lc) + k.slice(1), altV = (c === lc ? v.charAt(0).toUpperCase() : v.charAt(0).toLowerCase()) + v.slice(1);
      if (!(alt in FR)) dict.set(norm(alt), altV);
    }
  }
  function norm(s) { return String(s).replace(/[\s ]+/g, ' '); }
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = [...dict.keys()].sort((a, b) => b.length - a.length);
  const CY = 'А-Яа-яЁё';
  const big = new RegExp(keys.map((k) => {
    let p = esc(k).replace(/ /g, '[\\s\\u00a0]+');
    if (new RegExp(`^[${CY}]`).test(k)) p = `(?<![${CY}])` + p;
    if (new RegExp(`[${CY}.]$`).test(k)) p += `(?![${CY}])`;
    return p;
  }).join('|'), 'g');
  const hasCy = (s) => /[А-Яа-яЁё]/.test(s);

  function tr(s) {
    if (!s || !hasCy(s)) return s;
    const lead = s.match(/^[\s ]*/)[0], trail = s.match(/[\s ]*$/)[0];
    const core = s.slice(lead.length, s.length - trail.length);
    const whole = dict.get(norm(core));
    if (whole) return lead + whole + trail;
    let out = core;
    for (const [re, fn] of RE) out = out.replace(re, fn);
    out = out.replace(big, (m) => dict.get(norm(m)) || m).replace(QUOTES[0], QUOTES[1]);
    return lead + out + trail;
  }
  /* сообщение WhatsApp / подпись «Поделиться»: по строкам; «Пожелание: …» — текст клиента не трогаем */
  function msg(text) {
    return String(text || '').split('\n').map((l) => {
      const m = /^(\s*)Пожелание: (.*)$/.exec(l);
      return m ? `${m[1]}Note: ${m[2]}` : tr(l);
    }).join('\n');
  }
  /* чертёж (SVG-строка): только содержимое <text>/<title>/<desc> */
  function svg(s) {
    /* подписи чертежа бывают набраны ПРОПИСНЫМИ: переводим «Вид спереди» и снова делаем прописными */
    const up = (b) => { if (!hasCy(b) || b !== b.toUpperCase() || dict.has(norm(b.trim()))) return tr(b); const l = b.toLowerCase(); return tr(l.charAt(0).toUpperCase() + l.slice(1)).toUpperCase(); };
    return String(s || '').replace(/(<(text|tspan|title|desc)\b[^>]*>)([^<]*)/g, (m, open, tag, body) => open + (body.includes('Пожелание') ? body : up(body)))
      .replace(/(aria-label=")([^"]*)/g, (m, a, v) => a + tr(v));
  }
  window.RICCA_CFG_TR = { tr, msg, svg };

  /* ---------- страница: текст, подписи, адреса WhatsApp — сразу и при каждом изменении ---------- */
  const ATTRS = ['aria-label', 'title', 'placeholder', 'alt', 'content', 'aria-valuetext', 'data-tip'];
  const skip = (el) => el && el.closest && el.closest('script, style, textarea, input, [data-no-tr], [contenteditable="true"]');
  function doText(n) { if (!skip(n.parentElement)) { const v = tr(n.data); if (v !== n.data) n.data = v; } }
  function doAttrs(el) {
    if (skip(el) && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v && hasCy(v)) { const n = tr(v); if (n !== v) el.setAttribute(a, n); } }   // только если перевод что-то изменил — иначе бесконечный цикл наблюдателя
    if (el.tagName === 'A') {
      const h = el.getAttribute('href') || '';
      /* ссылки на главную — на английскую главную (/en, /en#catalog) */
      if (/^index\.html/.test(h)) { const i = h.indexOf('#'); el.setAttribute('href', '/en' + (i >= 0 ? h.slice(i) : '')); return; }
      if (/^https:\/\/wa\.me\//.test(h) && /[?&]text=/.test(h)) {
        try {
          const u = new URL(h), t = u.searchParams.get('text') || '';
          if (hasCy(t)) { const n = msg(t); const nh = `${u.origin}${u.pathname}?text=${encodeURIComponent(n)}`; if (n !== t && nh !== h) el.setAttribute('href', nh); }
        } catch (e) { /* адрес оставляем как есть */ }
      }
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    if (root.nodeType === 1) doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let n; while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function title() { if (hasCy(document.title)) { const n = tr(document.title); if (n !== document.title) document.title = n; } }
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else m.addedNodes.forEach(walk);
    }
    title();
  });
  function start() {
    walk(document.documentElement); title();
    mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS, 'href'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();

  /* открытие WhatsApp из скрипта (window.open) — тоже по-английски */
  const open0 = window.open;
  window.open = function (url, ...rest) {
    try { if (typeof url === 'string' && /^https:\/\/wa\.me\//.test(url)) { const u = new URL(url); const t = u.searchParams.get('text'); if (t) url = `${u.origin}${u.pathname}?text=${encodeURIComponent(msg(t))}`; } } catch (e) { /* как есть */ }
    return open0.call(window, url, ...rest);
  };
  /* «Поделиться» (телефон): заголовок и текст */
  if (navigator.share) {
    const share0 = navigator.share.bind(navigator);
    try { navigator.share = (d) => share0(d ? { ...d, title: d.title ? tr(d.title) : d.title, text: d.text ? msg(d.text) : d.text } : d); } catch (e) { /* без перевода */ }
  }
})();
