// Данные Barber Shop 86 (Алматы). Собраны с 2ГИС и barbershop86almaty.tilda.ws, октябрь 2026.
// Уровни и филиалы мастеров владельцу стоит уточнить: в открытых источниках этого нет.
window.BARBER = {
  name: 'BARBER SHOP 86',
  short: 'BARBER 86',
  city: 'Алматы',
  rating: '4.9',
  ratingCount: '637',
  hours: { open: 10, close: 21 },
  slotMinutes: 30,
  daysAhead: 14,
  instagram: 'https://www.instagram.com/barbershop86almaty/',
  promo: 'Скидка 15% студентам · химзавивка с маской и воском в подарок до 31.12.26',

  branches: [
    { id: 'abaya164', name: 'Абая 164 к3', note: 'ЖК Terra Cotta', phone: '+7 747 288 88 61', whatsapp: '77472888861', map: 'https://2gis.kz/almaty/geo/70000001079913783' },
    { id: 'moskva',   name: '8-й мкр, 41/6',  note: 'ЖК «Москва», у метро Москва', phone: '+7 747 188 88 62', whatsapp: '77471888862', map: 'https://2gis.kz/almaty/firm/70000001037450736' },
    { id: 'riviera', name: 'Сатпаева 90/21', note: 'ТРЦ Riviera Park, 1 этаж', phone: '+7 708 088 00 86', whatsapp: '77080880086', map: 'https://2gis.kz/almaty/firm/70000001095731871' },
  ],

  // price — ведущий барбер, senior — старший барбер (если есть)
  services: [
    { id: 'cut',     name: 'Мужская стрижка',                 price: 7000,  senior: 9000,  min: 45, cat: 'hair' },
    { id: 'student', name: 'Стрижка подросткам и студентам',   price: 6000,  senior: 7000,  min: 45, cat: 'hair' },
    { id: 'kid',     name: 'Детская стрижка (до 13 лет)',     price: 5500,  senior: 6500,  min: 40, cat: 'hair' },
    { id: 'scissor', name: 'Стрижка ножницами (удлинённая)',  price: 10000, senior: 13000, min: 60, cat: 'hair' },
    { id: 'buzz',    name: 'Бритьё головы под ноль',          price: 4000,  senior: 5000,  min: 25, cat: 'hair' },
    { id: 'combo',   name: 'Комплекс: стрижка + борода',      price: 10000, senior: 13000, min: 75, cat: 'combo' },
    { id: 'father',  name: 'Отец + сын',                      price: 11500, senior: 14500, min: 90, cat: 'combo' },
    { id: 'shave',   name: 'Королевское бритьё',              price: 5000,  senior: 7000,  min: 40, cat: 'beard' },
    { id: 'styling', name: 'Укладка',                         price: 3000,  min: 20, cat: 'extra' },
    { id: 'wax',     name: 'Воск: лицо, уши, нос',            price: 2000,  min: 15, cat: 'extra' },
    { id: 'brows',   name: 'Корректировка бровей',            price: 2000,  min: 15, cat: 'extra' },
    { id: 'mask',    name: 'Сложная маска для лица',          price: 6000,  min: 30, cat: 'extra' },
    { id: 'tint',    name: 'Тонировка волос',                 price: 9000,  min: 45, cat: 'color' },
    { id: 'tintb',   name: 'Тонировка бороды',                price: 8000,  min: 30, cat: 'color' },
    { id: 'bleach',  name: 'Осветление + покраска',           price: 25000, min: 120, cat: 'color' },
    { id: 'perm',    name: 'Химическая и био завивка',        price: 25000, min: 150, cat: 'color' },
  ],

  // level: 'lead' (ведущий) | 'senior' (старший). Имена из отзывов 2ГИС и сайта салона.
  barbers: [
    { id: 'any',       name: 'Любой мастер', role: 'Ближайшее свободное время', level: 'lead' },
    { id: 'gibrat',    name: 'Гибрат',     role: 'Барбер · завивка',    level: 'lead', tag: 'Чаще всех хвалят в отзывах' },
    { id: 'dimash',    name: 'Димаш',      role: 'Брутальный барбер',   level: 'lead' },
    { id: 'bakbergen', name: 'Бакберген',  role: 'Барбер',              level: 'lead' },
    { id: 'almas',     name: 'Алмас',      role: 'Барбер',              level: 'lead' },
    { id: 'arman',     name: 'Арман',      role: 'Барбер',              level: 'lead' },
    { id: 'erasyl',    name: 'Ерасыл',     role: 'Барбер · классика',   level: 'lead' },
    { id: 'kyran',     name: 'Кыран',      role: 'Барбер · завивка',    level: 'lead' },
    { id: 'damir',     name: 'Дамир',      role: 'Барбер',              level: 'lead' },
    { id: 'erkebulan', name: 'Еркебулан',  role: 'Hair-стилист · завивка', level: 'lead' },
    { id: 'ernur',     name: 'Ернур',      role: 'Барбер · классика',   level: 'lead' },
    { id: 'abylai',    name: 'Абылай',     role: 'Барбер · fade, crop', level: 'lead' },
    { id: 'amir',      name: 'Амир',       role: 'Барбер',              level: 'lead' },
    { id: 'beka',      name: 'Бека',       role: 'Барбер · завивка',    level: 'lead' },
    { id: 'shapagat',  name: 'Шапағат',    role: 'Креативный барбер',   level: 'lead' },
    { id: 'kairat',    name: 'Кайрат',     role: 'Барбер · перфекционист', level: 'lead' },
  ],

  gallery: ['img/gal1.webp','img/gal2.webp','img/gal3.webp','img/gal4.webp','img/gal5.webp','img/gal6.webp','img/gal7.webp','img/gal8.webp'],

  // Каталог причёсок. length: short | medium | long | beard | perm. Можно добавить img: 'img/....webp'.
  styles: [
    { id: 'fade-low',   name: 'Low fade',        length: 'short',  tags: ['fade'],         service: 'cut',     desc: 'Плавный переход у самой линии роста. Аккуратно и спокойно.', hue: 20 },
    { id: 'fade-mid',   name: 'Mid fade',        length: 'short',  tags: ['fade'],         service: 'cut',     desc: 'Переход на уровне висков. Самая популярная стрижка.', hue: 35 },
    { id: 'fade-skin',  name: 'Skin fade',       length: 'short',  tags: ['fade','bold'],  service: 'cut',     desc: 'В ноль у висков и затылка. Контраст и чёткость.', hue: 0 },
    { id: 'crop',       name: 'French crop',     length: 'short',  tags: ['texture'],      service: 'cut',     desc: 'Короткая текстурная чёлка, низкие бока. Не требует укладки.', hue: 50 },
    { id: 'buzz',       name: 'Buzz cut',        length: 'short',  tags: ['bold'],         service: 'buzz',    desc: 'Одна длина машинкой. Минимум ухода.', hue: 200 },
    { id: 'crew',       name: 'Crew cut',        length: 'short',  tags: ['classic'],      service: 'cut',     desc: 'Армейская классика с чуть удлинённым верхом.', hue: 190 },
    { id: 'undercut',   name: 'Undercut',        length: 'medium', tags: ['bold'],         service: 'cut',     desc: 'Резкий контраст: длинный верх, короткие бока без перехода.', hue: 280 },
    { id: 'pomp',       name: 'Pompadour',       length: 'medium', tags: ['classic'],      service: 'cut',     desc: 'Объём наверх и назад. Для тех, кто любит укладку.', hue: 300 },
    { id: 'quiff',      name: 'Quiff',           length: 'medium', tags: ['classic','texture'], service: 'cut', desc: 'Чёлка наверх, естественная текстура, мягкие бока.', hue: 320 },
    { id: 'sidepart',   name: 'Side part',       length: 'medium', tags: ['classic'],      service: 'cut',     desc: 'Боковой пробор, гладкая укладка. Офис и вечер.', hue: 220 },
    { id: 'textured',   name: 'Textured top',    length: 'medium', tags: ['texture'],      service: 'cut',     desc: 'Рваная текстура сверху, fade по бокам.', hue: 160 },
    { id: 'curly',      name: 'Curly fade',      length: 'medium', tags: ['texture','fade'], service: 'cut',   desc: 'Для кудрявых: объём сверху, чистый переход.', hue: 120 },
    { id: 'flow',       name: 'Flow',            length: 'long',   tags: ['classic'],      service: 'scissor', desc: 'Удлинённая стрижка ножницами, слоями. Естественно и свободно.', hue: 240 },
    { id: 'manbun',     name: 'Длинные + бока',  length: 'long',   tags: ['bold'],         service: 'scissor', desc: 'Длина наверху, подбритые бока. Собирается в хвост.', hue: 260 },
    { id: 'perm',       name: 'Химзавивка',      length: 'perm',   tags: ['texture','bold'], service: 'perm',  desc: 'Стойкие кудри с естественным объёмом. Маска и воск в подарок.', hue: 90 },
    { id: 'bioperm',    name: 'Био-завивка',     length: 'perm',   tags: ['texture'],      service: 'perm',    desc: 'Мягкие волны без жёсткой химии. Для короткой и средней длины.', hue: 100 },
    { id: 'beard-full', name: 'Полная борода',   length: 'beard',  tags: ['beard'],        service: 'combo',   desc: 'Форма, линия шеи и щёк, уход маслом. В комплексе со стрижкой.', hue: 30 },
    { id: 'beard-short',name: 'Короткая борода', length: 'beard',  tags: ['beard'],        service: 'combo',   desc: 'Щетина 3–6 мм с чёткими контурами.', hue: 15 },
    { id: 'shave',      name: 'Гладкое бритьё',  length: 'beard',  tags: ['beard','classic'], service: 'shave', desc: 'Королевское бритьё опасной бритвой с горячим полотенцем.', hue: 45 },
  ],

  reviews: [
    { name: 'Marat',    text: 'Стригусь у Димаша не первый раз, всегда отлично!', rating: 5 },
    { name: 'kkanwxx',  text: 'Мастер Гибрат стрижет отлично, всё четко и хорошо объясняет.', rating: 5 },
    { name: 'Дядя',     text: 'Уже давно стригусь в этом барбершопе, всем рекомендую, очень крутое место.', rating: 5 },
    { name: 'Yeldos',   text: 'Отличный барбершоп! Атмосфера уютная.', rating: 5 },
    { name: 'Амир',     text: 'Мастер Алмаз и Жазира прекрасно делают свою работу.', rating: 5 },
    { name: 'Жамиля',   text: 'Спасибо всему персоналу! Очень вежливые и мастера своего дела.', rating: 5 },
  ],
};
