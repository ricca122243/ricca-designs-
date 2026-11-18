/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
   RICCA DESIGNS — ТЕКСТЫ НОВЫХ БЛОКОВ ГЛАВНОЙ СТРАНИЦЫ (русская и английская версии)

   Как заполнять:
   • Всё, что в [КВАДРАТНЫХ СКОБКАХ], — место для вашего текста или фото. Скобки убирайте целиком:
       было  n: '[ЛЕТ РАБОТЫ]'   →   стало  n: '9'
   • Пока в блоке осталась хоть одна [скобка] или нет фото, блок на сайте НЕ показывается — посетитель не увидит
     незаполненного места. Заполнили — блок появился сам. Исключения (работают сразу): квиз, таблица тканей, «Влезет ли».
   • В списках (работы, отзывы) незаполненная карточка просто не выводится; блок появляется, когда готовых карточек
     столько, сколько указано в minItems.
   • Фото: формат .webp, кладите в папку ricca/img/blocks/ и пишите путь от папки ricca, например 'img/blocks/case-1-a.webp'.
     Размер в комментарии у поля. Ширина и высота фото нужны, чтобы страница не прыгала при загрузке.
   • Тексты пишем коротко и по-человечески, как говорит мастер. Не используем: «инновационный», «непревзойдённое качество»,
     «индивидуальный подход», «широкий ассортимент».
   • Кавычки внутри текста — «ёлочки». Апостроф в английском тексте — ’ (или экранируйте: \').
   • Английская версия — в разделе en ниже, поля те же.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
window.RICCA_CONTENT = {

  /* номер WhatsApp для всех новых кнопок (без «+» и пробелов) */
  wa: '77079550808',

  /* «Влезет ли?» — правила расчёта (все числа в сантиметрах). Менять можно здесь, вёрстку трогать не нужно */
  fit: {
    minInput: 100,        // меньше этого — просим ввести размеры
    gapBetween: 10,       // «Между стенами»: длина дивана = ширина − 10
    gapOpen: 30,          // «У открытой стены»: длина дивана = ширина − 30
    aisle: 70,            // глубина дивана = глубина комнаты − 70 (проход)…
    depthMin: 80,         // …но не меньше 80
    depthMax: 110,        // …и не больше 110
    seatWidth: 65,        // мест = (длина − 40) / 65, вниз, минимум 1
    armsTotal: 40,
    cornerRoomDepth: 250, // угловой можно, если глубина комнаты ≥ 250…
    cornerWallWidth: 240, // …и ширина ≥ 240
    cornerSideGap: 90,    // вторая сторона углового = глубина комнаты − 90
    shallowRoomDepth: 180,// глубина комнаты < 180 → «прямой, неглубокий»
    smallWallWidth: 160,  // ширина < 160 → «кресло, пуф или небольшой диван»
    aisleTight: 70,       // проход меньше 70 — «тесновато»
    aisleWide: 100        // проход от 100 — «свободно, поместится столик»
  },

  /* ═════════════════════════════════════════ РУССКАЯ ВЕРСИЯ ═════════════════════════════════════════ */
  ru: {

    /* ── Цифры доверия: одна строка из 4 чисел под обложкой ── */
    trust: {
      items: [
        { n: '[ЛЕТ РАБОТЫ]', t: 'лет шьём мебель' },     // n — только число, например '9'
        { n: '[ИЗДЕЛИЙ]', t: 'изделий сшили' },          // n — число, можно с «+»: '1200+'
        { n: '200+', t: 'коллекций тканей' },
        { n: '5 лет', t: 'гарантия' }
      ]
    },

    /* ── Квиз «Подобрать диван» (работает сразу) ── */
    quiz: {
      eye: 'Подбор',
      title: 'Подобрать диван',
      lead: 'Три вопроса — и мастер пришлёт подборку моделей и тканей в WhatsApp.',
      step: 'Шаг {n} из {total}',
      steps: [
        { q: 'Где будет стоять?', multi: false, options: ['Гостиная', 'Спальня', 'Кабинет', 'Бизнес'] },
        { q: 'Кто пользуется?', hint: 'Можно несколько', multi: true, options: ['Дети', 'Животные', 'Гости', 'Только мы'] },
        { q: 'Какой стиль?', multi: false, options: ['Современный', 'Неоклассика', 'Минимализм', 'Другой'] }
      ],
      back: 'Назад',
      next: 'Дальше',
      doneTitle: 'Готово',
      doneText: 'Отправьте ответы — подберём модели и ткани под вашу комнату.',
      send: 'Получить подборку в WhatsApp',
      again: 'Пройти заново',
      labels: ['Где', 'Кто', 'Стиль'],                 // подписи ответов в сообщении
      wa: 'Здравствуйте! Подберите диван: {answers}'
    },

    /* ── Работы: «задача → решение». Только реальные работы ателье, без AI-визуализаций.
         Фото — в интерьере: обложка 1200 × 900 (4 : 3), в галерее 3–5 фото до 1800 px по длинной стороне ── */
    cases: {
      eye: 'Работы',
      title: 'Задача и решение',
      lead: 'Что просили клиенты и что мы сделали.',
      minItems: 3,                                     // блок появится, когда будет столько готовых карточек
      want: 'Хочу похожий',
      wa: 'Здравствуйте! Хочу похожий: {title}',
      open: 'Смотреть фото',
      items: [
        /* пример заполнения:
        { title: 'Угловой диван в гостиную', type: 'Угловой диван',
          story: 'Ниша 3,4 м, двое детей и собака. Угловой диван в моющемся велюре, модули переставляются.',
          photos: [ { src: 'img/blocks/case-1-a.webp', w: 1200, h: 900 }, { src: 'img/blocks/case-1-b.webp', w: 1200, h: 900 } ] }, */
        { title: '[НАЗВАНИЕ РАБОТЫ]', type: '[ТИП ИЗДЕЛИЯ]', story: '[ЗАДАЧА → РЕШЕНИЕ, 1–2 СТРОКИ]', photos: [{ src: '[ФОТО]', w: 1200, h: 900 }] },
        { title: '[НАЗВАНИЕ РАБОТЫ]', type: '[ТИП ИЗДЕЛИЯ]', story: '[ЗАДАЧА → РЕШЕНИЕ, 1–2 СТРОКИ]', photos: [{ src: '[ФОТО]', w: 1200, h: 900 }] },
        { title: '[НАЗВАНИЕ РАБОТЫ]', type: '[ТИП ИЗДЕЛИЯ]', story: '[ЗАДАЧА → РЕШЕНИЕ, 1–2 СТРОКИ]', photos: [{ src: '[ФОТО]', w: 1200, h: 900 }] },
        { title: '[НАЗВАНИЕ РАБОТЫ]', type: '[ТИП ИЗДЕЛИЯ]', story: '[ЗАДАЧА → РЕШЕНИЕ, 1–2 СТРОКИ]', photos: [{ src: '[ФОТО]', w: 1200, h: 900 }] },
        { title: '[НАЗВАНИЕ РАБОТЫ]', type: '[ТИП ИЗДЕЛИЯ]', story: '[ЗАДАЧА → РЕШЕНИЕ, 1–2 СТРОКИ]', photos: [{ src: '[ФОТО]', w: 1200, h: 900 }] },
        { title: '[НАЗВАНИЕ РАБОТЫ]', type: '[ТИП ИЗДЕЛИЯ]', story: '[ЗАДАЧА → РЕШЕНИЕ, 1–2 СТРОКИ]', photos: [{ src: '[ФОТО]', w: 1200, h: 900 }] }
      ]
    },

    /* ── Почему RICCA: 6 карточек. icon — один из: ruler, cube, swatch, needle, shield, drawing ── */
    why: {
      eye: 'Почему мы',
      title: 'Почему выбирают нас',
      items: [
        { icon: 'ruler', t: 'Размер до сантиметра', p: 'Шьём под вашу нишу, а не подбираем из готового.' },
        { icon: 'cube', t: 'Видите до заказа', p: 'Соберите диван в 3D и поставьте у себя дома через AR.', href: 'configurator.html' },
        { icon: 'swatch', t: '200+ коллекций и 5000 цветов', p: 'Все образцы вживую в шоуруме на Навои.' },
        { icon: 'needle', t: 'Оборудование SCM и Dürkopp Adler', p: 'Ровные швы и точный раскрой.' },
        { icon: 'shield', t: 'Гарантия 5 лет', p: 'На [ЧТО ИМЕННО — ЗАПОЛНЮ].' },   // например: «каркас, механизмы и швы»
        { icon: 'drawing', t: 'Для дизайнеров', p: 'Чертёж любой модели в SVG для вашего проекта.' }
      ],
      cta: 'Обсудить заказ',
      wa: 'Здравствуйте! Хочу обсудить мебель на заказ'
    },

    /* ── Что внутри: слева схема конструкции (готова), справа 4 строки ── */
    inside: {
      eye: 'Конструкция',
      title: 'Что внутри',
      image: { src: 'img/blocks/inside-scheme.webp', w: 1400, h: 1050, alt: 'Схема конструкции дивана: каркас, пружины, наполнитель и обивка' },
      caption: 'схема конструкции',
      rows: [
        { k: 'Каркас', v: '[МАТЕРИАЛ]', b: 'не скрипит и не расшатывается' },          // например: «массив сосны + берёзовая фанера 18 мм»
        { k: 'Наполнитель', v: '[ППУ, ПЛОТНОСТЬ]', b: 'держит форму годами' },         // например: «ППУ HR 35 кг/м³»
        { k: 'Основание', v: '[ПРУЖИНЫ/РЕМНИ]', b: 'ровная посадка по всей длине' },   // например: «пружины „змейка“»
        { k: 'Ткани', v: '[БРЕНДЫ/СТРАНЫ]', b: '200+ коллекций, образцы в шоуруме' }  // например: «Турция, Италия, Бельгия»
      ]
    },

    /* ── Какую ткань выбрать (работает сразу). Оценка: ok — подходит, warn — с оговоркой, no — не советуем ── */
    fabrics: {
      eye: 'Ткани',
      title: 'Какую ткань выбрать',
      lead: 'Коротко о трёх самых частых тканях. Остальные покажем и дадим потрогать в шоуруме.',
      cols: ['Дети', 'Животные', 'Солнце', 'Уход'],
      legend: { ok: 'подходит', warn: 'с оговоркой', no: 'не советуем' },
      rows: [
        { name: 'Велюр', note: 'короткий плотный ворс', cells: [
          ['ok', 'пятна выводятся влажной чисткой'], ['warn', 'когти не цепляют, но шерсть заметна'],
          ['warn', 'на прямом солнце со временем выгорает'], ['ok', 'пылесос и влажная салфетка'] ] },
        { name: 'Букле', note: 'петельная фактура', cells: [
          ['warn', 'пятна в петлях заметнее'], ['no', 'когти цепляют петли'],
          ['ok', 'хорошо держит цвет'], ['warn', 'пылесос с мягкой насадкой, химчистка'] ] },
        { name: 'Шенилл', note: 'мягкий, плотного плетения', cells: [
          ['ok', 'плотная и износостойкая'], ['warn', 'когти могут вытянуть нить'],
          ['ok', 'выгорает меньше велюра'], ['ok', 'пылесос и влажная чистка'] ] }
      ],
      all: 'Все ткани',
      href: '#catalog/fabrics'
    },

    /* ── Влезет ли? (работает сразу; числа расчёта — выше, в fit) ── */
    fit: {
      eye: 'Размер',
      title: 'Влезет ли?',
      lead: 'Введите размеры — подскажем, какой диван встанет.',
      width: 'Ширина стены или ниши, см',
      depth: 'Свободная глубина комнаты перед диваном, см',
      depthHint: 'от стены до шкафа, стола или противоположной стены',
      modes: { between: 'Между стенами', open: 'У открытой стены' },
      empty: 'Введите размеры в сантиметрах',
      len: 'Длина дивана', shape: 'Форма', seats: 'Мест', depthR: 'Глубина',
      upTo: 'до {n} см',
      shapes: { both: 'прямой или угловой', shallow: 'прямой, неглубокий', small: 'кресло, пуф или небольшой диван', straight: 'прямой' },
      corner: 'Вторая сторона углового — до {n} см',
      aisleOk: 'Останется {n} см на проход — удобно ходить, не задевая колени.',
      aisleTight: 'На проход останется {n} см — тесновато. Посмотрите неглубокий диван или кресло.',
      aisleWide: 'Останется {n} см — свободный проход и место для журнального столика.',
      btn3d: 'Собрать в 3D с этими размерами',
      btnWa: 'Уточнить у мастера',
      wa: 'Здравствуйте! Стена {w} см, глубина комнаты {d} см. Подскажите, какой диван подойдёт',
      note: 'Это ориентир. Точный размер подберём по вашему плану или фото.'
    },

    /* ── Без риска: 4 пункта. icon — один из: drawing, swatch, camera, check ── */
    norisk: {
      eye: 'Без риска',
      title: 'Заказать вслепую не придётся',
      items: [
        { icon: 'drawing', t: 'Чертёж и подбор ткани — бесплатно, до предоплаты' },
        { icon: 'swatch', t: 'Образцы тканей привезём домой' },
        { icon: 'camera', t: 'Фото с производства на каждом этапе' },
        { icon: 'check', t: '[ГАРАНТИЯ СОВПАДЕНИЯ С ЧЕРТЕЖОМ — ЗАПОЛНЮ]' }   // например: «Сошьём точно по чертежу — или переделаем за свой счёт»
      ],
      btn: 'Пришлите фото комнаты — за день подберём модель и 3 ткани',
      wa: 'Здравствуйте! Отправляю фото комнаты'
    },

    /* ── Основатель. Фото — вертикальное 1200 × 1500 (4 : 5) ── */
    founder: {
      eye: 'Основатель',
      photo: { src: '[ФОТО]', w: 1200, h: 1500, alt: 'Шахрух, основатель RICCA DESIGNS' },
      text: [
        '[ТЕКСТ, СТРОКА 1 — например, с чего началось ателье]',
        '[ТЕКСТ, СТРОКА 2 — как работаете]',
        '[ТЕКСТ, СТРОКА 3 — что важно для вас в мебели]'
      ],
      sign: 'Шахрух, основатель RICCA DESIGNS'
    },

    /* ── Отзывы — только настоящие, из 2ГИС, переносите вручную. stars — число 1–5. Фото — необязательно (оставьте '') ── */
    reviews: {
      eye: 'Отзывы',
      title: 'Что говорят клиенты',
      rating: '[ОЦЕНКА]',                // например: '4,9'
      count: '[N]',                      // число отзывов, например: '87'
      countLabel: 'отзывов в 2ГИС',
      link: '[ССЫЛКА НА ВКЛАДКУ ОТЗЫВОВ]', // например: 'https://2gis.kz/almaty/firm/…/tab/reviews'
      all: 'Все отзывы в 2ГИС',
      minItems: 3,
      items: [
        { name: '[ИМЯ]', date: '[ДАТА]', stars: '[ОЦЕНКА 1–5]', text: '[ТЕКСТ ОТЗЫВА]', photo: '' },
        { name: '[ИМЯ]', date: '[ДАТА]', stars: '[ОЦЕНКА 1–5]', text: '[ТЕКСТ ОТЗЫВА]', photo: '' },
        { name: '[ИМЯ]', date: '[ДАТА]', stars: '[ОЦЕНКА 1–5]', text: '[ТЕКСТ ОТЗЫВА]', photo: '' },
        { name: '[ИМЯ]', date: '[ДАТА]', stars: '[ОЦЕНКА 1–5]', text: '[ТЕКСТ ОТЗЫВА]', photo: '' }
      ]
    },

    /* ── Для бизнеса: кейс под текстом. Фото — 2–3 штуки, 1200 × 900 ── */
    bizCase: {
      label: 'Кейс',
      object: '[ОБЪЕКТ]',                // например: «Ресторан на Абая, 120 мест»
      rows: [
        { k: 'Что сделали', v: '[ТЕКСТ]' },
        { k: 'Сроки', v: '[СРОКИ]' }
      ],
      photos: [
        { src: '[ФОТО]', w: 1200, h: 900, alt: '[ОПИСАНИЕ ФОТО]' },
        { src: '[ФОТО]', w: 1200, h: 900, alt: '[ОПИСАНИЕ ФОТО]' }
      ]
    },

    /* ── Ателье: видео 15–20 секунд под текстом. Файл .mp4 (H.264, без звука, до 8 МБ), постер .webp того же размера ── */
    atelierVideo: {
      src: '[ВИДЕО]',                    // например: 'video/atelier-clip.mp4'
      poster: '[ПОСТЕР]',                // например: 'video/atelier-clip.webp'
      w: 1280, h: 720,
      label: 'Видео: работа в ателье'
    }
  },

  /* ═════════════════════════════════════════ ENGLISH VERSION ═════════════════════════════════════════ */
  en: {
    trust: {
      items: [
        { n: '[ЛЕТ РАБОТЫ]', t: 'years making furniture' },
        { n: '[ИЗДЕЛИЙ]', t: 'pieces made' },
        { n: '200+', t: 'fabric collections' },
        { n: '5 years', t: 'warranty' }
      ]
    },
    quiz: {
      eye: 'Selection',
      title: 'Find your sofa',
      lead: 'Three questions — and the master sends you a selection of models and fabrics on WhatsApp.',
      step: 'Step {n} of {total}',
      steps: [
        { q: 'Where will it stand?', multi: false, options: ['Living room', 'Bedroom', 'Study', 'Business'] },
        { q: 'Who will use it?', hint: 'Choose any', multi: true, options: ['Children', 'Pets', 'Guests', 'Just us'] },
        { q: 'Which style?', multi: false, options: ['Contemporary', 'Neoclassical', 'Minimalism', 'Other'] }
      ],
      back: 'Back',
      next: 'Next',
      doneTitle: 'Done',
      doneText: 'Send your answers — we’ll pick models and fabrics for your room.',
      send: 'Get a selection on WhatsApp',
      again: 'Start again',
      labels: ['Where', 'Who', 'Style'],
      wa: 'Hello! Please pick a sofa for me: {answers}'
    },
    cases: {
      eye: 'Works',
      title: 'The brief and the result',
      lead: 'What clients asked for and what we made.',
      minItems: 3,
      want: 'I want a similar one',
      wa: 'Hello! I want a similar one: {title}',
      open: 'View photos',
      items: [
        { title: '[НАЗВАНИЕ РАБОТЫ]', type: '[ТИП ИЗДЕЛИЯ]', story: '[ЗАДАЧА → РЕШЕНИЕ, 1–2 СТРОКИ]', photos: [{ src: '[ФОТО]', w: 1200, h: 900 }] },
        { title: '[НАЗВАНИЕ РАБОТЫ]', type: '[ТИП ИЗДЕЛИЯ]', story: '[ЗАДАЧА → РЕШЕНИЕ, 1–2 СТРОКИ]', photos: [{ src: '[ФОТО]', w: 1200, h: 900 }] },
        { title: '[НАЗВАНИЕ РАБОТЫ]', type: '[ТИП ИЗДЕЛИЯ]', story: '[ЗАДАЧА → РЕШЕНИЕ, 1–2 СТРОКИ]', photos: [{ src: '[ФОТО]', w: 1200, h: 900 }] },
        { title: '[НАЗВАНИЕ РАБОТЫ]', type: '[ТИП ИЗДЕЛИЯ]', story: '[ЗАДАЧА → РЕШЕНИЕ, 1–2 СТРОКИ]', photos: [{ src: '[ФОТО]', w: 1200, h: 900 }] },
        { title: '[НАЗВАНИЕ РАБОТЫ]', type: '[ТИП ИЗДЕЛИЯ]', story: '[ЗАДАЧА → РЕШЕНИЕ, 1–2 СТРОКИ]', photos: [{ src: '[ФОТО]', w: 1200, h: 900 }] },
        { title: '[НАЗВАНИЕ РАБОТЫ]', type: '[ТИП ИЗДЕЛИЯ]', story: '[ЗАДАЧА → РЕШЕНИЕ, 1–2 СТРОКИ]', photos: [{ src: '[ФОТО]', w: 1200, h: 900 }] }
      ]
    },
    why: {
      eye: 'Why us',
      title: 'Why people choose us',
      items: [
        { icon: 'ruler', t: 'Sized to the centimetre', p: 'We make it for your alcove instead of picking something ready-made.' },
        { icon: 'cube', t: 'See it before you order', p: 'Build your sofa in 3D and place it in your room with AR.', href: 'configurator.html' },
        { icon: 'swatch', t: '200+ collections, 5,000 colours', p: 'Every sample is in the showroom on Navoi.' },
        { icon: 'needle', t: 'SCM and Dürkopp Adler equipment', p: 'Straight seams and precise cutting.' },
        { icon: 'shield', t: '5-year warranty', p: 'On [ЧТО ИМЕННО — ЗАПОЛНЮ].' },
        { icon: 'drawing', t: 'For designers', p: 'A drawing of any model in SVG for your project.' }
      ],
      cta: 'Discuss an order',
      wa: 'Hello! I’d like to discuss custom furniture'
    },
    inside: {
      eye: 'Construction',
      title: 'What’s inside',
      image: { src: 'img/blocks/inside-scheme.webp', w: 1400, h: 1050, alt: 'Sofa construction: frame, springs, filling and upholstery' },
      caption: 'construction scheme',
      rows: [
        { k: 'Frame', v: '[МАТЕРИАЛ]', b: 'doesn’t creak or loosen' },
        { k: 'Filling', v: '[ППУ, ПЛОТНОСТЬ]', b: 'keeps its shape for years' },
        { k: 'Base', v: '[ПРУЖИНЫ/РЕМНИ]', b: 'even seating along the whole length' },
        { k: 'Fabrics', v: '[БРЕНДЫ/СТРАНЫ]', b: '200+ collections, samples in the showroom' }
      ]
    },
    fabrics: {
      eye: 'Fabrics',
      title: 'Which fabric to choose',
      lead: 'A short guide to the three most common fabrics. We’ll show you the rest in the showroom.',
      cols: ['Children', 'Pets', 'Sunlight', 'Care'],
      legend: { ok: 'suitable', warn: 'with a caveat', no: 'not advised' },
      rows: [
        { name: 'Velour', note: 'short dense pile', cells: [
          ['ok', 'stains come out with damp cleaning'], ['warn', 'claws don’t catch, but hair shows'],
          ['warn', 'fades over time in direct sun'], ['ok', 'vacuum and a damp cloth'] ] },
        { name: 'Bouclé', note: 'looped texture', cells: [
          ['warn', 'stains show more in the loops'], ['no', 'claws catch the loops'],
          ['ok', 'holds its colour well'], ['warn', 'soft-brush vacuum, dry cleaning'] ] },
        { name: 'Chenille', note: 'soft, tightly woven', cells: [
          ['ok', 'dense and hard-wearing'], ['warn', 'claws can pull a thread'],
          ['ok', 'fades less than velour'], ['ok', 'vacuum and damp cleaning'] ] }
      ],
      all: 'All fabrics',
      href: '#catalog/fabrics'
    },
    fit: {
      eye: 'Size',
      title: 'Will it fit?',
      lead: 'Enter your sizes — we’ll tell you which sofa will fit.',
      width: 'Wall or alcove width, cm',
      depth: 'Free room depth in front of the sofa, cm',
      depthHint: 'from the wall to a cabinet, table or the opposite wall',
      modes: { between: 'Between walls', open: 'Open-ended wall' },
      empty: 'Enter the sizes in centimetres',
      len: 'Sofa length', shape: 'Shape', seats: 'Seats', depthR: 'Depth',
      upTo: 'up to {n} cm',
      shapes: { both: 'straight or corner', shallow: 'straight, shallow', small: 'armchair, pouf or a small sofa', straight: 'straight' },
      corner: 'Corner sofa second side — up to {n} cm',
      aisleOk: '{n} cm left for the walkway — easy to pass without knocking your knees.',
      aisleTight: 'Only {n} cm left for the walkway — a bit tight. Look at a shallow sofa or an armchair.',
      aisleWide: '{n} cm left — a free walkway and room for a coffee table.',
      btn3d: 'Build in 3D with these sizes',
      btnWa: 'Ask the master',
      wa: 'Hello! My wall is {w} cm, room depth {d} cm. Which sofa would fit?',
      note: 'This is a guide. We’ll set the exact size from your plan or photo.'
    },
    norisk: {
      eye: 'No risk',
      title: 'You won’t be ordering blind',
      items: [
        { icon: 'drawing', t: 'Drawing and fabric selection — free, before any prepayment' },
        { icon: 'swatch', t: 'We bring fabric samples to your home' },
        { icon: 'camera', t: 'Photos from production at every stage' },
        { icon: 'check', t: '[ГАРАНТИЯ СОВПАДЕНИЯ С ЧЕРТЕЖОМ — ЗАПОЛНЮ]' }
      ],
      btn: 'Send a photo of your room — within a day we’ll pick a model and 3 fabrics',
      wa: 'Hello! Sending a photo of my room'
    },
    founder: {
      eye: 'Founder',
      photo: { src: '[ФОТО]', w: 1200, h: 1500, alt: 'Shakhrukh, founder of RICCA DESIGNS' },
      text: [
        '[ТЕКСТ, СТРОКА 1 — например, с чего началось ателье]',
        '[ТЕКСТ, СТРОКА 2 — как работаете]',
        '[ТЕКСТ, СТРОКА 3 — что важно для вас в мебели]'
      ],
      sign: 'Shakhrukh, founder of RICCA DESIGNS'
    },
    reviews: {
      eye: 'Reviews',
      title: 'What clients say',
      rating: '[ОЦЕНКА]',
      count: '[N]',
      countLabel: 'reviews on 2GIS',
      link: '[ССЫЛКА НА ВКЛАДКУ ОТЗЫВОВ]',
      all: 'All reviews on 2GIS',
      minItems: 3,
      items: [
        { name: '[ИМЯ]', date: '[ДАТА]', stars: '[ОЦЕНКА 1–5]', text: '[ТЕКСТ ОТЗЫВА]', photo: '' },
        { name: '[ИМЯ]', date: '[ДАТА]', stars: '[ОЦЕНКА 1–5]', text: '[ТЕКСТ ОТЗЫВА]', photo: '' },
        { name: '[ИМЯ]', date: '[ДАТА]', stars: '[ОЦЕНКА 1–5]', text: '[ТЕКСТ ОТЗЫВА]', photo: '' },
        { name: '[ИМЯ]', date: '[ДАТА]', stars: '[ОЦЕНКА 1–5]', text: '[ТЕКСТ ОТЗЫВА]', photo: '' }
      ]
    },
    bizCase: {
      label: 'Case study',
      object: '[ОБЪЕКТ]',
      rows: [
        { k: 'What we did', v: '[ТЕКСТ]' },
        { k: 'Timeline', v: '[СРОКИ]' }
      ],
      photos: [
        { src: '[ФОТО]', w: 1200, h: 900, alt: '[ОПИСАНИЕ ФОТО]' },
        { src: '[ФОТО]', w: 1200, h: 900, alt: '[ОПИСАНИЕ ФОТО]' }
      ]
    },
    atelierVideo: {
      src: '[ВИДЕО]',
      poster: '[ПОСТЕР]',
      w: 1280, h: 720,
      label: 'Video: work in the atelier'
    }
  }
};
