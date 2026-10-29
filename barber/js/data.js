// Данные барбершопа. Замените на реальные (например, из карточки 2ГИС).
window.BARBER = {
  name: 'RICCA BARBER',
  city: 'Алматы',
  address: 'ул. Абая 150, Алматы',
  phone: '+7 777 000 00 00',
  whatsapp: '77770000000',          // номер для WhatsApp без «+»
  telegram: '',                     // username без «@», если заявки нужны в Telegram
  hours: { open: 10, close: 21 },   // часы работы
  slotMinutes: 30,
  daysAhead: 14,
  mapUrl: 'https://2gis.kz/almaty',
  instagram: 'https://instagram.com/',

  services: [
    { id: 'cut',      name: 'Мужская стрижка',        price: 6000,  min: 45, cat: 'hair' },
    { id: 'cut-kid',  name: 'Детская стрижка',        price: 4500,  min: 40, cat: 'hair' },
    { id: 'beard',    name: 'Оформление бороды',      price: 4000,  min: 30, cat: 'beard' },
    { id: 'combo',    name: 'Стрижка + борода',       price: 9000,  min: 75, cat: 'combo' },
    { id: 'shave',    name: 'Королевское бритьё',     price: 5000,  min: 40, cat: 'beard' },
    { id: 'machine',  name: 'Стрижка машинкой',       price: 3500,  min: 25, cat: 'hair' },
    { id: 'camo',     name: 'Камуфляж седины',        price: 5000,  min: 30, cat: 'extra' },
    { id: 'wax',      name: 'Воск (нос, уши, брови)', price: 2000,  min: 15, cat: 'extra' },
  ],

  barbers: [
    { id: 'any',   name: 'Любой мастер', role: 'Ближайшее свободное время', exp: '', rating: '' },
    { id: 'arman', name: 'Арман',  role: 'Топ-барбер',   exp: '8 лет',  rating: '5.0', days: [1,2,3,4,5,6] },
    { id: 'dias',  name: 'Диас',   role: 'Барбер',       exp: '5 лет',  rating: '4.9', days: [2,3,4,5,6,0] },
    { id: 'timur', name: 'Тимур',  role: 'Барбер',       exp: '3 года', rating: '4.8', days: [1,3,4,5,6,0] },
  ],

  // Каталог причёсок. length: short | medium | long; tags для фильтра.
  styles: [
    { id: 'fade-low',   name: 'Low fade',       length: 'short',  tags: ['fade'],        service: 'cut',   desc: 'Плавный переход у самой линии роста. Аккуратно и спокойно.', hue: 20 },
    { id: 'fade-mid',   name: 'Mid fade',       length: 'short',  tags: ['fade'],        service: 'cut',   desc: 'Переход на уровне висков. Самая популярная стрижка.', hue: 35 },
    { id: 'fade-skin',  name: 'Skin fade',      length: 'short',  tags: ['fade','bold'], service: 'cut',   desc: 'В ноль у висков и затылка. Контраст и чёткость.', hue: 0 },
    { id: 'crop',       name: 'French crop',    length: 'short',  tags: ['texture'],     service: 'cut',   desc: 'Короткая текстурная чёлка, низкие бока. Не требует укладки.', hue: 50 },
    { id: 'buzz',       name: 'Buzz cut',       length: 'short',  tags: ['bold'],        service: 'machine', desc: 'Одна длина машинкой. Минимум ухода.', hue: 200 },
    { id: 'crew',       name: 'Crew cut',       length: 'short',  tags: ['classic'],     service: 'cut',   desc: 'Армейская классика с чуть удлинённым верхом.', hue: 190 },
    { id: 'undercut',   name: 'Undercut',       length: 'medium', tags: ['bold'],        service: 'cut',   desc: 'Резкий контраст: длинный верх, короткие бока без перехода.', hue: 280 },
    { id: 'pomp',       name: 'Pompadour',      length: 'medium', tags: ['classic'],     service: 'cut',   desc: 'Объём наверх и назад. Для тех, кто любит укладку.', hue: 300 },
    { id: 'quiff',      name: 'Quiff',          length: 'medium', tags: ['classic','texture'], service: 'cut', desc: 'Чёлка наверх, естественная текстура, мягкие бока.', hue: 320 },
    { id: 'sidepart',   name: 'Side part',      length: 'medium', tags: ['classic'],     service: 'cut',   desc: 'Боковой пробор, гладкая укладка. Офис и вечер.', hue: 220 },
    { id: 'textured',   name: 'Textured top',   length: 'medium', tags: ['texture'],     service: 'cut',   desc: 'Рваная текстура сверху, fade по бокам.', hue: 160 },
    { id: 'curly',      name: 'Curly fade',     length: 'medium', tags: ['texture','fade'], service: 'cut', desc: 'Для кудрявых: объём сверху, чистый переход.', hue: 120 },
    { id: 'manbun',     name: 'Длинные + бока', length: 'long',   tags: ['bold'],        service: 'cut',   desc: 'Длина наверху, подбритые бока. Собирается в хвост.', hue: 260 },
    { id: 'flow',       name: 'Flow',           length: 'long',   tags: ['classic'],     service: 'cut',   desc: 'Удлинённая стрижка назад, слоями. Естественно и свободно.', hue: 240 },
    { id: 'beard-full', name: 'Полная борода',  length: 'beard',  tags: ['beard'],       service: 'beard', desc: 'Форма, линия шеи и щёк, уход маслом.', hue: 30 },
    { id: 'beard-short',name: 'Короткая борода',length: 'beard',  tags: ['beard'],       service: 'beard', desc: 'Щетина 3–6 мм с чёткими контурами.', hue: 15 },
    { id: 'goatee',     name: 'Эспаньолка',     length: 'beard',  tags: ['beard'],       service: 'beard', desc: 'Борода на подбородке и усы, щёки гладкие.', hue: 45 },
  ],

  reviews: [
    { name: 'Ерлан',  text: 'Записался через сайт за минуту, пришёл, подстригли без ожидания. Mid fade идеальный.', rating: 5 },
    { name: 'Алексей',text: 'Арман лучший. Борода наконец-то выглядит так, как хотел.', rating: 5 },
    { name: 'Нурлан', text: 'Удобно, что можно выбрать причёску по фото и сразу записаться.', rating: 5 },
  ],
};
