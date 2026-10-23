# Стиль ELUNA для сайта RICCA DESIGNS — дизайн-система и механики

Спецификация для сборщика. Источник — наш сайт ELUNA в корне репозитория (`index.html`, `css/styles.css`,
`css/fonts.css`, `js/main.js`, `js/moon.js`), который заказчик 7 октября выбрал образцом («вот такой стиль пойдёт»).
Всё ниже снято с кода, не придумано. Где для RICCA нужно отступить от ELUNA (контраст «чуть белее», меню на телефоне,
без луны и без блокировки скролла) — сказано явно и помечено **RICCA**.

Что уже подготовлено (этой же задачей):

| Что | Где лежит | Вес |
|---|---|---|
| Шрифты Unbounded 300/500 + Inter 300–600 (woff2) | `ricca/fonts/eluna/` | 143 КБ (4 файла) |
| Готовый `@font-face` + токены `--display/--sans` | `ricca/css/fonts-eluna.css` (пути относительно `ricca/css/`) | 3 КБ |
| GSAP 3.15.0 + ScrollTrigger 3.15.0 (Standard License) | `ricca/vendor/gsap.min.js`, `ricca/vendor/ScrollTrigger.min.js` | 73 + 45 КБ |
| 24 кадра разлёта 1920×1080 (MEDIUM) | `ricca/img/eluna/seq/f01…f24.webp` | 1,75 МБ (61–93 КБ/кадр) |
| 24 кадра разлёта 1280×720 (LOW / телефон) | `ricca/img/eluna/seq720/f01…f24.webp` | 1,33 МБ (46–69 КБ/кадр) |
| Луна (HD-фото с альфой, круглая) | `ricca/img/eluna/moon-hd-1280.webp` 1280² | 218 КБ |
| Знак ELUNA (для ссылки «Сайт ELUNA») | `ricca/img/eluna/eluna-mark.png` 351×345, альфа | 13 КБ |
| Рендер матраса в разрезе (уже был) | `ricca/img/eluna/mattress-layers.webp` 1200×800 | 95 КБ |
| Карта Казахстана с орбиты + граница + города | `ricca/img/eluna/kz/` (см. раздел 4.11) | 199 КБ |

Кадры 2560×1440 (`img/seq2560`, 4,5 МБ) намеренно не копировались: на RICCA разрез идёт не на весь экран, 1920 достаточно.

---

## 1. Палитра

### 1.1 Токены ELUNA (как есть, `css/styles.css` строки 9–38)

```css
:root {
  --bg: #06070c;        /* страница: почти чёрный с холодным синим подтоном */
  --bg-2: #090a10;      /* секции (используется как rgba(9,10,16,.9) — звёзды просвечивают) */
  --bg-3: #10121a;      /* карточки (rgba(16,18,26,.55)) */
  --ink: #f1ede6;       /* основной текст: тёплый молочный, не чистый белый */
  --ink-2: rgba(241,237,230,.66);  /* вторичный текст, лиды */
  --ink-3: rgba(241,237,230,.54);  /* подписи, капс-лейблы (≥4.5:1 на --bg) */
  --ink-4: rgba(241,237,230,.16);  /* плейсхолдеры, самые слабые линии */
  --line: rgba(241,237,230,.10);   /* все границы 1px */
  --gold: #c8a86b;      /* акцент ELUNA: точки, подчёркивания, цены Prime, бейдж */
  --warm: 255, 243, 226;  /* rgb-тройка: тёплый свет (используется как rgba(var(--warm), a)) */
  --cool: 196, 208, 255;  /* rgb-тройка: холодный лунный свет (блики, Balance) */
}
```

Поверхности, зашитые числами: диалог `#0e1017`; карточка Prime и бейдж `#12141c`; липкая плашка `rgba(18,20,28,.97)`;
подложка диалога `rgba(6,7,12,.82)`; затемнение сцены — чистый `#000` (`.seq-dim`).
Выделение текста: `::selection { background: var(--gold); color: var(--bg) }`. Фокус: `2px solid var(--gold)`, offset 4px.

Измеренный контраст (WCAG) на `#06070c`: `--ink` 17,3 : 1 · `--ink-2` 7,6 : 1 · `--ink-3` 5,3 : 1 · `--gold` 8,9 : 1.
То есть у ELUNA даже третий уровень текста проходит AA для мелкого текста, но визуально он «серый» — это и есть то, что
заказчик просит сделать «чуть белее».

### 1.2 **RICCA**: «чуть белее», чёрный остаётся ведущим

Правило: основа такая же тёмная, но текст — чистый белый, а не молочный; вторичные уровни на 10–12 пунктов прозрачности
плотнее, чем у ELUNA; линии заметнее. Никаких коричневых и ореховых тонов. Золото ELUNA разрешено **только внутри
блока ELUNA** (цены, бейдж «Выбор Eluna», точки-разделители в его eyebrow) — это акцент бренда матрасов, не RICCA.
Акцент RICCA — белый.

```css
:root {
  /* тёмная основа — чуть нейтральнее ELUNA, синий подтон едва слышен */
  --bg: #07080c;
  --bg-2: #0b0c11;
  --bg-3: #12141b;
  --surface: rgba(18,20,27,.72);       /* карточки на тёмном */
  /* текст — белый; контраст на --bg измерен */
  --ink: #ffffff;                       /* 20,0 : 1 — заголовки, цены, кнопки */
  --ink-body: #f4f3f0;                  /* ≈18,4 : 1 — длинный текст: чуть мягче чистого белого, чтобы не «звенел» */
  --ink-2: rgba(255,255,255,.78);       /* 12,1 : 1 (ELUNA: 7,6) — лиды, вторичный текст */
  --ink-3: rgba(255,255,255,.64);       /* 8,2 : 1 (ELUNA: 5,3) — подписи, капс-лейблы */
  --ink-4: rgba(255,255,255,.24);       /* плейсхолдеры, слабые деления */
  --line: rgba(255,255,255,.14);        /* границы (ELUNA .10) */
  --line-strong: rgba(255,255,255,.26); /* активная рамка, hover */
  /* акцент ELUNA — только в блоке ELUNA */
  --gold: #c8a86b;                      /* 8,8 : 1 на --bg; на карточке #12141c — тоже проходит */
  --warm: 255, 243, 226;
  --cool: 196, 208, 255;
  /* светлая секция (1–2 на страницу, как белые блоки характеристик у Apple) */
  --paper: #f5f5f7;                     /* Apple-серый белый; альтернатива тёплее — #f5f3ee */
  --paper-ink: #0b0b0d;                 /* 18,1 : 1 */
  --paper-ink-2: rgba(11,11,13,.66);    /* 6,2 : 1 */
  --paper-ink-3: rgba(11,11,13,.56);    /* ≈4,6 : 1 — минимум для мелкого текста */
  --paper-line: rgba(11,11,13,.12);
}
```

Как применять:
- `body { background: var(--bg); color: var(--ink-body); }`, заголовки `color: var(--ink)`.
- Подсветка карточки при hover/выборе: у ELUNA `border-color: rgba(241,237,230,.22)` → у RICCA `var(--line-strong)`.
- Светлая секция — отдельный класс `.section--paper` с переопределением токенов внутри:
  `.section--paper { --ink: var(--paper-ink); --ink-2: var(--paper-ink-2); --ink-3: var(--paper-ink-3); --line: var(--paper-line); background: var(--paper); color: var(--ink); }`
  — тогда все компоненты (spec-rows, eyebrow, кнопки-ghost) переезжают на светлое без правок.
  Кнопка `button--primary` на светлом инвертируется: фон `var(--paper-ink)`, текст `var(--paper)`.
- Переход тёмное → светлое делать резкой кромкой (как Apple), без градиентов: `border-top: 1px solid var(--line)` не нужен.
- Проверка: ни один текст ≤ 14px не ниже 7 : 1 на тёмном и 4,6 : 1 на светлом; `--ink-4` только для декоративного.

---

## 2. Типографика

### 2.1 Семейства (`css/fonts.css`)

| Роль | Семейство | Начертания | Файлы |
|---|---|---|---|
| Заголовки, крупные цифры, цены, имена моделей | **Unbounded** (OFL) | 300 и 500 — **только эти два** | `Unbounded-300-normal.woff2`, `Unbounded-500-normal.woff2` (лат + кир в одном файле) |
| Текст, лиды, подписи, капс-лейблы, кнопки | **Inter** (OFL) | вариативный 300–600 | `Inter-300-600-normal-cyrillic.woff2` + `…-latin.woff2` (разбит по `unicode-range`) |
| Логотип ELUNA | Michroma | 400, только латиница | `Michroma-Regular.ttf` — **RICCA не нужен**: у RICCA своя монограмма RD |

**Ловушка веса.** На ELUNA `.section-title { font-weight: 400 }`, но файла 400 нет: по правилу подбора для 400 браузер
сначала берёт 500. Поэтому заголовки секций рисуются **Unbounded 500**, а hero-заголовок, манифест, названия карточек,
цены и утверждения — **Unbounded 300**. Это два голоса: 500 — «заголовок секции», 300 — «всё остальное дисплейное».
В CSS RICCA писать 300 или 500 явно.

Базовый текст: `body { font: 300 16px/1.6 var(--sans); -webkit-font-smoothing: antialiased; }`. Полужирный в тексте — 500
(`b`, `.perks b`, `.silence__points b`), 600 не используется.

### 2.2 Шкала (десктоп → телефон ≤ 899px)

| Элемент (класс ELUNA) | Семейство / вес | Размер | Интерлиньяж / трекинг |
|---|---|---|---|
| Заголовок секции `.section-title` | Unbounded 400→**500** | `clamp(30px, 3.6vw, 52px)` → `clamp(28px, 8vw, 40px)` + `text-wrap: balance` | 1.1 / −0.015em |
| Узкий вариант `.section-head--tight .section-title` | 500 | `clamp(28px, 3vw, 44px)` | 1.1 |
| Hero-заголовок `.hero-title` | Unbounded 300 | `clamp(26px, 2.4vw, 38px)` → `clamp(26px, 7.2vw, 38px)` | 1.14 |
| Манифест `.concept__text` | 300 | `clamp(22px, 2.3vw, 36px)` → `clamp(22px, 6.4vw, 30px)` | 1.2 |
| Утверждение сцены `.statement` | 300 | `clamp(28px, 3.6vw, 56px)` → `clamp(26px, 7vw, 40px)` | 1.16 |
| CTA-заголовок `.cta__title` | 300 | `clamp(30px, 3.6vw, 52px)` | 1.08 / −0.015em |
| Заголовок доставки `.delivery__title` | 300 | `clamp(26px, 2.6vw, 40px)` | 1.15 / −0.015em |
| Факт `.fact__value` | 300 | `clamp(32px, 2.8vw, 44px)` → 30px; `small` = .42em `--ink-2` | 1 |
| Название карточки `.mcard__title` | 300 | `clamp(20px, 1.6vw, 26px)`; Prime `clamp(22px, 1.9vw, 30px)`; `min-height: 2.4em` на десктопе | 1.2 |
| Цена карточки `.mcard__sum` | 300 | `clamp(22px, 1.7vw, 28px)`; Prime `clamp(26px, 2.1vw, 34px)` | 1.1; тень `0 0 22px rgba(var(--warm),.3)` |
| Старая цена `.price-old` | 300 | `.55em` от суммы, `line-through`, цвет `--ink-2`, линия золотая 1px | — |
| Цена в конфигураторе `.size-summary__price` | 400→500 | `clamp(26px, 2.4vw, 34px)` | 1 |
| Заголовок диалога `.mdl__title` / цена `.mdl__price` | 300 | `clamp(24px, 2.6vw, 36px)` / `clamp(24px, 2.4vw, 32px)` | 1.15 / 1.1 |
| Имя слоя в таблице `.tlayers .name` | 300 | `clamp(15px, 1.2vw, 18px)` | 1.3 |
| Значение в таблице `.tlayers .spec b`, `.size-table b` | 300 | 15px | — |
| Лид `.hero-sub`, `.delivery__lead`, `.cta__text`, `.motion__lead` | Inter 300 | 15px → 14px | 1.7 (телефон 1.6), `--ink-2`, `max-width` 400–480px |
| Текст карточки `.mcard__list` | Inter 300 | 14px | 1.55 |
| Мелкий текст `.tlayers .text`, `.material p`, `.review` | Inter 300 | 13.5px | 1.6–1.65 |
| Мета `.mcard__meta`, `.mdl__note`, `.trust__label` | Inter 300 | 12.5px | 1.6, `--ink-3` |

### 2.3 Капс-лейблы (всё Inter 500, uppercase)

| Класс | Размер | Трекинг | Цвет |
|---|---|---|---|
| `.eyebrow` (надзаголовок секции: «Линейка · Четыре модели») | 11px | .16em | `--ink-3`; между словами точка `.dot` 3×3px `--gold`, `gap: 14px` |
| `.nav`, `.nav__links` | 11px | .14em | `--ink-2`, hover `--ink` |
| `.button` | 12px | .14em | — |
| `.tab` | 12px | .14em | `--ink-3` → `--ink` при выборе |
| `.more` («Подробнее →») | 12px | .12em | `--ink-3`; стрелка — повёрнутый квадрат 6px |
| `.section-note` («Все цены — за размер 1600 × 2000 мм») | 12px | .08em | `--ink-3` |
| `.badge` («Выбор Eluna») | 10.5px | .16em | `--gold` |
| `.tier` (метка уровня) | 9px | .3em | `--ink-3` |
| `.cue__label`, `.motion__label` | 11px | .16em | `--ink-3` |
| `.mcard__kicker` («Eluna Prime · 280–300 мм») | 11px | .16em | `--ink-3`, имя — `--ink` |

**RICCA**: те же размеры и трекинги, цвет `--ink-3` берётся новый (.64), точка `.dot` — белая вне блока ELUNA.

### 2.4 Приёмы

- Вторая строка заголовка приглушена через `<em>`: `.section-title em { color: var(--ink-3) }` — «Семь слоёв. **Одно ощущение.**».
  В манифесте и CTA `em` — золотой (`.concept__text em`, `.cta__title em`, `.statement em`). **RICCA**: вне блока ELUNA
  `em` — только приглушение `--ink-3`, не золото.
- `em { font-style: normal }` глобально — em никогда не курсив.
- Числа: `font-variant-numeric: tabular-nums` в таблицах размеров и в `.size-vis`. Деньги форматирует `fmtMoney()`
  (`js/main.js:1396`): `toLocaleString('ru-RU')` и замена NBSP на **обычный пробел** — на ELUNA перенос внутри «125 000» не
  случается только потому, что контейнеры `nowrap`. **RICCA**: заменять на узкий неразрывный U+202F (` `), чтобы «280 000 ₸»
  никогда не ломалось.
- Знак тенге `₸` (U+20B8) не входит в `unicode-range` подмножеств Inter → в Inter он отрисуется запасным шрифтом.
  Цены ставить в Unbounded (как ELUNA) или оборачивать `₸` в `span` с `font-family: var(--display)`.
- Все размеры на сайте — в миллиметрах, «1600 × 2000 мм» с × (U+00D7) и пробелами.
- `html { scroll-behavior: auto }` — плавный скролл делает JS (учёт пина), не CSS.

---

## 3. Сетка, отступы, формы

```css
--gutter: clamp(20px, 6vw, 96px);     /* поле страницы */
--container: 1360px;
.container { width: min(100% - 2 * var(--gutter), var(--container)); margin-inline: auto; }
```

| Параметр | Десктоп | Телефон ≤ 899px |
|---|---|---|
| Вертикальный отступ секции | `clamp(72px, 10vh, 120px)` | `clamp(56px, 12vw, 80px)` |
| `.section-head` → контент | `clamp(56px, 8vw, 120px)`; `--tight`: `clamp(28px, 4vw, 48px)` | 28px |
| Ширина `.section-head` | 760px; `--tight` 920px | — |
| Карточки моделей `.mrail__cards` | `grid: repeat(4, minmax(0,1fr)); gap: 16px`; ≤ 1100px — 2 колонки | лента `flex`, карточка `flex: 0 0 min(76vw, 320px)`, `gap: 12px`, вылет на поля `margin: 0 calc(-1 * var(--gutter))` |
| Концепция `.concept__grid` | `7fr / 5fr`, `gap: clamp(32px, 5vw, 80px)`, `align-items: end` | 1 колонка, gap 32px |
| Факты `.concept__facts` | `1fr 1fr`, `gap: 28px 20px`, `border-top: 1px --line`, `padding-top: 28px` | то же, gap 24px 16px |
| Таблица слоёв `.tlayers li` | `40px minmax(0,1.1fr) minmax(0,1.6fr) auto`, `gap: 16px 24px`, `padding: 16px 0` | `30px 1fr auto`, описание скрыто |
| Доставка `.order__grid` | `.6fr / 1.4fr`, карта вылезает в правое поле `width: calc(100% + var(--gutter) * .8)` | 1 колонка, порядок через `order` |
| CTA `.cta` | `1fr / 1fr`, `border-top`, `padding-top: clamp(40px, 5vh, 56px)` | 1 колонка |
| Преимущества `.perks` | 8 колонок, иконки 24px | 4 колонки, тултипы скрыты |

Брейкпоинты: **1100px** (сетки 4 → 2), **899px** (телефон: меню скрыто, лента карточек, липкая плашка, диалог на весь экран),
**599px** (факты и материалы в одну колонку). JS делит мир на `(max-width: 899px)` = `isMobile()`.

Формы: радиусы **2px** у кнопок, бейджей, полей; **3px** у карточек; **4px** у диалога; **999px** только у радио-пилюль
`.cfg__models button` и у кнопки паузы `.seq-play`. Границы всегда `1px solid var(--line)`. Тени — только цветные и
мягкие (`0 40px 90px -60px rgba(var(--cool), .55)`), никаких серых drop-shadow.

Движение (CSS): `--ease-out: cubic-bezier(.16, 1, .3, 1)`, `--ease-in-out: cubic-bezier(.65, 0, .35, 1)`.
Длительности: hover 0.4–0.5 с, появление 1.2–1.4 с, вкладка 0.7 с.

z-index: звёзды 0 → сцена 1 → секции 2 → nav 80 → липкая плашка 85 → зерно 90 → skip-link 100.
`.grain` — фиксированный SVG-шум `feTurbulence baseFrequency .9`, `opacity: .028`, 300×300, на телефоне выключен.

---

## 4. Компоненты (класс → CSS → JS)

### 4.1 Навигация `.nav` (`styles.css` 147–164; mobile 830–831)

Фиксированная, `padding: 26px var(--gutter)` (телефон 20px), `justify-content: space-between`: бренд слева
(знак `.mark` 1.1em + имя), ссылки по центру `gap: 36px` цвет `--ink-2`, справа `.nav__cta` — рамка `1px --line`,
`padding: 12px 20px`, hover `rgba(255,255,255,.04)`. Подчёркивание ссылки — золотая линия 1px растёт слева
(`::after { right: 100% → 0 }`, .5s ease-out). Фона у шапки нет — она лежит на звёздах и на сцене.
На ELUNA шапка спрятана во время интро (`body.is-intro .nav { opacity: 0 }`) и имя бренда проявляется по скроллу
(`--brand-o`).

**RICCA**: на телефоне ELUNA просто прячет ссылки (`.nav__links { display: none }`) — меню нет вовсе, у неё 5 якорей.
У RICCA разделов больше (каталог, ателье, ELUNA, бизнес, шоурум, контакты) → нужна кнопка меню и полноэкранная панель
на тёмном (`dialog` или `nav[aria-expanded]`), в том же 11px/.14em капсе. Фон шапки при скролле: `rgba(7,8,12,.85)`
без `backdrop-filter` (ELUNA его сознательно не использует на полноэкранных слоях — телефон).

### 4.2 Кнопки `.button` (117–133)

```css
.button { display: inline-flex; align-items: center; justify-content: center; gap: 12px; position: relative; overflow: hidden;
  padding: 18px 34px; border-radius: 2px; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; font-weight: 500;
  transition: background-color .5s var(--ease-out), color .5s var(--ease-out), transform .5s var(--ease-out), box-shadow .5s var(--ease-out), border-color .5s var(--ease-out); }
.button--primary { background: var(--ink); color: var(--bg); }
.button--primary:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 18px 40px -18px rgba(200,168,107,.6); }
.button--primary::after { /* блик от общего источника света */ content: ""; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(120% 90% at var(--lx, 50%) -30%, rgba(var(--cool), .28), transparent 60%); opacity: var(--li, .6); }
.button--ghost { border: 1px solid var(--line); color: var(--ink-2); }
.button--ghost:hover { border-color: rgba(var(--cool), .55); color: var(--ink); transform: translateY(-1px); }
.mcard .button { padding: 14px 22px; }          /* внутри карточек компактнее */
.button--wa svg { width: 18px; height: 18px; }   /* WhatsApp — иконка слева, кнопка на всю ширину формы */
```

**RICCA**: тень hover у primary — белая `rgba(255,255,255,.35)`, не золотая (кроме блока ELUNA). Высота на телефоне ≥ 48px.

### 4.3 Карточка модели `.mcard` (460–563; телефон 882–892)

Разметка (из `index.html` 310–326, Prime):

```html
<article class="mcard mcard--prime is-on" data-model="prime" tabindex="0" aria-labelledby="card-prime-title">
  <span class="badge">Выбор Eluna</span>
  <p class="mcard__kicker"><span class="mcard__name">Eluna Prime</span><span class="dot"></span><span>280–300 мм</span></p>
  <span class="mcard__tier" data-tier="prime"></span>            <!-- JS: метка уровня + шкала света .lm -->
  <h3 class="mcard__title" id="card-prime-title">Для тех, кто выбирает <em>раз и надолго.</em></h3>
  <p class="mcard__meta">Самый натуральный матрас линейки</p>
  <ul class="mcard__list"><li>…</li><li>…</li><li>…</li></ul>  <!-- 3 пункта, тире-буллет 8px золотой -->
  <div class="mcard__price mcard__price--prime"><span class="mcard__sum" data-price="prime">— ₸</span></div>
  <div class="mcard__actions">
    <button type="button" class="button button--primary" data-pick="prime">Выбрать Prime</button>
    <button type="button" class="more" data-open="mdl-prime">Подробнее</button>
  </div>
</article>
```

Коробка: `padding: clamp(22px, 2.2vw, 32px)`, `border: 1px --line`, радиус 3px, фон `rgba(16,18,26,.55)`, `display: flex;
flex-direction: column`; блок цены прижат вниз `margin-top: auto; padding-top: 22px; border-top: 1px --line`.
Состояния: `.is-on` — `translateY(-6px) scale(1.015)`, рамка `.22`, тень `0 40px 90px -60px rgba(var(--cool), .55·--li)`;
`.is-dim` — `opacity: .62`; `.is-center` — только телефон (центральная карточка ленты).

Цена — JS `priceHTML()` (`main.js:1398–1403`) подставляет в `[data-price]`:

```html
<!-- без скидки -->      125 000 ₸
<!-- со скидкой (Prime) --><s class="price-old">350 000 ₸</s><span class="price-new">280 000 ₸</span><span class="save">−20 %</span>
<!-- компактно, [data-compact] (липкая плашка) --><s class="price-old">350 000</s> → 280 000 ₸
```

`.price-new` — `--gold` с свечением `0 0 24px rgba(200,168,107,.55)`; `.price-old` занимает всю строку
(`flex-basis: 100%`); `.save` — пилюля 11px/.14em, рамка `rgba(200,168,107,.5)`, фон `.08`.
`.badge` — абсолютно `top: -13px; left: padding`, 7px 11px, фон `#12141c`, рамка золотая `.45`.

Иерархия света по уровням (решение ELUNA, повторить в блоке ELUNA на RICCA):
- **Air** — база: белая цена без свечения.
- **Balance** — серебро: `inset 0 1px 0 rgba(214,222,240,.5)` сверху, холодная линия над ценой, цена `#eef2fb` с холодным свечением.
- **Prime** — элита: `inset 0 2px 0 var(--gold)` сверху, фон `#12141c`, медленный проход света `primeSheen 7s` (только `is-on`), золотое пятно за ценой, бейдж.
- **Royal** — ультра: рамка-аврора `conic-gradient` через `@property --ra` и маску (`royalRing 9s`), цена градиентом по тексту (`royalShine 6s`), 7 «пылинок» `.royal-dust i`.
  На телефоне аврора/блик/проход **выключены** (`animation: none !important`, 859–861) — перерисовывают карточку каждый кадр.

Метка уровня `.tier[data-lvl]` + шкала `.lm` (4 палочки 3px, высоты 6/8/10/12, включённые — золотые) собираются из
`TIERS` (`main.js:1389–1394, 1411–1415`): Air «Базовая» 1 · Balance «Pro» 2 · Prime «Выгода −20 %» 3 · Royal «Флагман · индивидуально» 4.

Поведение рельса (`lineup()` 1407–1483): hover/focus/click выбирает карточку → `select(i)`: классы `is-on/is-dim`,
свет рельса `Light.aim('rail', x, .5, .5 + lvl·.12)`, цвет прожектора `--lc` (Prime — `--warm`, Royal — `190,170,230`,
остальные — `--cool`). Телефон: лента со `scroll-snap-type: x mandatory`, `markCenter()` по `scroll` (rAF) делает
центральную карточку выбранной, `centerCard(cards[2])` при старте ставит Prime в центр.

### 4.4 Строки характеристик `.tlayers` (382–395) — основа «таблицы характеристик» для каталога RICCA

```html
<ol class="tlayers">
  <li><span class="num">01</span>
      <span class="name">Стёганый чехол<span class="role">Микроклимат</span></span>
      <span class="text">Органический хлопок с терморегулирующей нитью…</span>
      <span class="spec"><b>15 мм</b>320 г/м²</span></li>
</ol>
```

`border-top` у списка и `border-bottom` у каждой строки `1px --line`; номер 11px/.14em золотой; имя Unbounded 300
+ роль капсом 11px; текст 13.5px `--ink-2`; значение справа `white-space: nowrap`, жирное — Unbounded 300 15px `--ink`.
Hover — строка светлеет (`color .5s`). На телефоне описание прячется, остаются номер · имя · значение.
**RICCA**: это и есть «spec grid» для карточек каталога (что входит / варианты / сроки / гарантия): номер → белая
точка или без номера, колонки `minmax(0,1fr) auto` для пар «параметр — значение».

### 4.5 Факты `.fact` (359–362), счётчик `countUp()` (1693–1706)

Значение Unbounded 300 `clamp(32px, 2.8vw, 44px)`, под ним подпись 13px `--ink-3` `max-width: 220px`. `[data-count]`
считает от 0 до значения 1.8 с `power3.out` при появлении на 60 % (IntersectionObserver), формат `ru-RU`.
**RICCA**: только для цифр из брифа (3 года гарантии, 10:00–20:00 — не считать; счётчик — для «7 слоёв», «300 мм», «1 200 пружин» в блоке ELUNA).

### 4.6 Вкладки `.tabs` / `.tab` / `.panel` (367–379; JS `tabs()` 1027–1046)

`role="tablist"`, кнопки `role="tab" aria-controls aria-selected`, панели `role="tabpanel" hidden`. Полоса
`border-bottom: 1px --line`, `overflow-x: auto` без скроллбара; активная — золотая линия `scaleX(0 → 1)` .6s.
Панель входит `panelIn .7s` (opacity + 10px). Клавиатура ← →. После переключения — `ScrollTrigger.refresh()` (высота страницы
изменилась — иначе пины уедут). **RICCA**: вкладки каталога «Диваны / Кровати / Кресла / Столы и консоли / Матрасы ELUNA /
Коллекции 2026» — та же механика, подчёркивание белое.

### 4.7 Диалог «Подробнее» `.mdl` (594–619; JS `openDialog()` 1491–1501)

`<dialog class="mdl">` шириной `min(92vw, 760px)`, `max-height: 88vh`, фон `#0e1017`, рамка `.14`, радиус 4px,
тень `0 60px 120px -40px rgba(0,0,0,.8)`, `::backdrop rgba(6,7,12,.82)`. Внутри: липкий крестик 44px
(`<form method="dialog">`), шапка `.mdl__head` (eyebrow, заголовок, цена, note), аккордеон из
`<details class="acc"><summary>…</summary><div class="acc__body">…</div></details>` (summary 12px/.14em капс,
шеврон 7px поворачивается), подвал `.mdl__actions` с кнопкой WhatsApp. На телефоне — `100vw × 100dvh`, без рамки и радиуса.
Открытие: `showModal()` + `gsap.fromTo(dlg, {opacity:0, y:14}, {duration:.4, ease:'power3.out', clearProps:'transform'})`;
клик по подложке закрывает (`e.target === dlg`); фокус возвращается открывшей кнопке. Якорь на элемент внутри диалога
открывает диалог (1736–1737).
**RICCA**: это каркас карточки товара каталога — «Что входит / Варианты / Сроки / Гарантия и доставка / Как заказать».

### 4.8 Липкая плашка `.sticky-cta` (578–590; JS 1505–1516)

Только телефон (`display: none` → `flex` при ≤ 899px). Фон `rgba(18,20,28,.97)`, верхняя граница золотая `.35`,
`padding-bottom: calc(12px + env(safe-area-inset-bottom))`, выезжает `translateY(100% → 0)` .5s, когда секция
`#models` пересекает экран хотя бы на 5 %; `aria-hidden` и `tabindex` переключаются. Слева текст 12px (модель · размер —
цена), справа кнопка 10px 16px инвертированная.
**RICCA**: правило из прошлых сборок (galleria-final/n3-nera) — плашка не показывается над hero и над контактами,
прячется, когда открыт диалог/лайтбокс; одна кнопка — WhatsApp с готовым текстом.

### 4.9 Конфигуратор размера `.configure` (653–700; JS `orderFlow()` 1526–1654)

Шаг 2 ELUNA: радио-пилюли моделей `.cfg__models` (999px, Unbounded 15px, выбранная — золотая рамка и `.1` фон),
три варианта размера `.size-options` (`1600 × 2000 / 1800 × 2000 / Свой размер`, `aria-checked`), для своего — два
ползунка `input[type=range]` (`accent-color: var(--gold)`) с числовыми полями, превью `.size-vis` (квадрат, матрас
`.size-vis__mat` меняет ширину/высоту GSAP .8s, подписи мм по осям), итог `.size-summary` с ценой.
Логика цены (1534–1543): база за 1600 × 2000 = 3,2 м²; **+40 000 ₸ за каждый м² сверх** (1800 × 2000 = +16 000 ₸),
округление до 1 000 ₸, старая цена Prime — та же скидка в процентах; свой размер: ширина 1400–2200, длина 1900–2200,
шаг 10, изготовление 21 день. Состояние в `localStorage` (`eluna-order-v1`) и рисуется сразу везде: конфигуратор,
«Ваш выбор» у карты, итог, липкая плашка, все `[data-wa]`.
**RICCA**: в блок ELUNA брать упрощённо — модель + 1600/1800/свой, цена пересчитывается тем же `priceOf()`; состояние
можно не хранить. Для мебели на заказ конфигуратор **не делать** (цен нет) — вместо него «радиогруппа образцов → WhatsApp»
из n3-nera.

### 4.10 Карта доставки `.map` (724–760; JS `delivery()` 1056–1334)

Снимок NASA `kz-map-2080.webp` (телефон `kz-map-1280.webp`) в `aspect-ratio: 2080 / 1174`, тонирован CSS-фильтром в ночной
сине-серебряный (`grayscale(1) sepia(.45) hue-rotate(185deg) saturate(1.6) brightness(.8) contrast(1.14)`), края растворены
радиальной маской. Поверх — SVG-контур страны (`.map__line`, 1 px, `rgba(205,220,255,.55)`, `vector-effect:
non-scaling-stroke`) и 18 кнопок-городов `.city` на `--x/--y` в процентах (тёплая точка 8px с ореолом, мерцание
`cityTw 3.4s`; выбранный — золотой, сонар `citySonar 2.8s`, подпись 11px капсом). Холст `.map__fx` рисует волну от
Алматы при появлении (2,9 с), прорисовку границы, пунктирные маршруты, бегущие огни, «рассвет» раз в 12 с, золотую дугу к
выбранному городу. Кадры — только пока карта на экране (IO), десктоп ≤ 60 к/с, телефон/MEDIUM 30, LOW и reduced-motion —
статичная картинка. Клик по городу → `CustomEvent('eluna:city')`, текст срока из `DELIVERY` (`default: 'от 7 дней'`,
Алматы — «мы здесь · доставка по городу»).
Файлы для RICCA: `ricca/img/eluna/kz/kz-map-2080.webp`, `kz-map-1280.webp`, `kz-border.svg` (готовый `<svg viewBox="0 0 2080 1174">`
с путём, вставлять inline), `kz-cities.json` (18 городов с `--x/--y`), `kz-meta.json` (исходные метаданные ELUNA).
**RICCA**: карта уместна в разделе «Доставка по Казахстану» (факт брифа); сроки для мебели **не называть** — в `DELIVERY`
нейтральная строка «срок уточняется при заказе» + `<!-- TODO заказчик: сроки доставки мебели по городам -->`.
Достаточно статичного варианта (`is-in is-done`, без холста): снимок + контур + города; анимацию включать только если
останется бюджет кадра.

### 4.11 Футер `.footer` (798–803, 791–794)

`padding: 24px 0 28px`, `border-top: 1px --line`, фон `rgba(6,7,12,.8)`; строка `flex; justify-content: space-between;
flex-wrap: wrap; gap: 24px`, 12px `--ink-3` трекинг .04em. Бренд 14px/.2em + `small` 10px/.3em; блок студии
`.footer__studio` с левой линией; ссылки `gap: 12px 28px`. **RICCA**: сюда — адрес, график, оба телефона, Instagram, 2ГИС,
ссылка «Сайт ELUNA» со знаком `eluna-mark.png` (1.1em, `vertical-align: -0.18em`).

### 4.12 Преимущества `.perks` (565–575)

Ряд из 8 (телефон 4) пунктов: SVG-иконка 24px `stroke: var(--gold); stroke-width: 1.5`, подпись 12px, по hover/focus —
тултип `small` 200px на `#12141c`. **RICCA**: «Гарантия 3 года · Доставка по РК · Станки SCM и Dürkopp Adler · Своё ателье ·
Палитра тканей и кож · Под проект» — иконки белые.

### 4.13 Появление по скроллу `.reveal` (807–813; JS `reveals()` 1709–1725)

`opacity: 0; transform: translateY(28px)` → `.is-in` 1.3s `--ease-out`. IO `rootMargin: 0 0 -10% 0`, появившиеся в одном кадре
сортируются по `top` и получают `transition-delay: i × .09s` (не более 5). Страховка: через 1200 мс всё, что в окне, показывается.
Телефон: без сдвига, 1s. Строки манифеста `.reveal-line > span` выезжают из `overflow: hidden` (`translateY(105%)`, 1.4s,
задержки .12/.24/.36s). Reduced motion — всё видно сразу.

---

## 5. Движение (GSAP 3.15 + ScrollTrigger)

### 5.1 Общие правила ELUNA

- `gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true });` (`main.js:11–13`) — адресная строка телефона не пересчитывает пины посреди скролла.
- Один конвейер resize (`onResize`, 25–42): пересчёт только при смене ширины или скачке высоты > 120px; хуки в `resizeHooks[]`.
- `gsap.matchMedia()` делит сцену: `mm.add('(min-width: 900px)', () => buildStage(true))` / `(max-width: 899px)` (872–873) — при переходе через 900px GSAP сам откатывает старую сцену.
- Состояние анимаций — простые объекты (`S`, `I`, `P`, 295–305), а не DOM; единственный `render()` (536–572) пишет стили
  через `sv/svar/svo` (315–318) **только при изменении значения**. `svo` при opacity ≤ .004 ставит `visibility: hidden`,
  чтобы композитор не считал слой.
- `will-change` только на том, что реально движется (`.exposure`, `.shade`, `.copy`, `.seq-labels`, `.seq-dim`); полноэкранные
  слои — без `backdrop-filter`/`mix-blend-mode`; на телефоне никаких анимаций, перерисовывающих большие области.
- `document.fonts.ready.then(() => { measureLabels(); ScrollTrigger.refresh(); })` и `window.load → ScrollTrigger.refresh()` (1743–1744):
  шрифты со `swap` меняют высоты после первого расчёта пинов.
- `content-visibility: auto; contain-intrinsic-size: auto 700px` на поздних секциях (343) — ускоряет первый рендер, но
  высоты «плывут» → ещё одна причина `refresh()` после загрузки.

### 5.2 Прикреплённая сцена `buildStage()` (835–871)

```js
const tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: render,
  scrollTrigger: { trigger: stageEl, start: 'top top', end: D ? '+=120%' : '+=100%',
    pin: true, scrub: D ? 0.5 : 0.35, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: (self) => { setPhase(self.progress); layersCtl(self.progress); if (self.progress > 0.78) revealConcept(); } } });
```

Длительности внутри таймлайна — условные «проценты» (0–100):

| Отрезок | Что происходит |
|---|---|
| 0–8 | имя уходит в nav (`wmS .5, wmY −40, wmO 0`), луна уходит вправо-вверх и гаснет (`moonX 16, moonY −12, moonO 0`, 0–9), подсказка «Листайте» гаснет (0–4), имя в nav проявляется (4–9) |
| 4–12 | собранный матрас проявляется (`cutO 0 → 1`, десктоп сдвиг `cutX 4`) — **сцена припаркована до 66 %**, расслойка идёт по времени (см. 5.3) |
| 66–84 | выход: стопка уходит вглубь и тает (`outExp .35, outS .82, outY −6`), тень слева `.shade` до .9/.7 (68–78), утверждение `.copy--outro` появляется (72–80) |
| 84–100 | сцена темнеет до 55 % (`dark .55`), стопка растворяется (`outExp 0, outY −14`), утверждение уходит вверх (82–90), тень гаснет (88–100) |

Фазы текста (`setPhase`, 823–833) переключаются по порогам прогресса, а не в scrub-таймлайне: `< .05` hero · `< .09` пусто ·
`< .66` «Семь слоёв» · дальше финал; уходящий текст гаснет .2 с, входящий появляется через .22 с за .35 с — двух текстов на
экране не бывает (на телефоне весь переход ≈ 100 px скролла).
Следующая секция заходит на хвост пина: `.concept { margin-top: -34vh }` (телефон −14vh) при `z-index: 2` над сценой;
её тексты показываются при `progress > .78` — чёрной паузы между сценой и контентом нет.

### 5.3 Расслойка по времени `playLayers()` (694–722) и тур (735–817)

Запуск при `progress ≥ .10`, сброс при `< .04` (`layersCtl`, 805–817). Таймлайн: `spread 0 → 1` за 1.6 с `power3.out`
и `cutS 1 → .92`; выноски по одной `0.9 + 0.16·i`; с 2.8 с камера подходит к слою 0 (`cutS 1.32` десктоп / 1.3 телефон,
`cutY = focusY(i)`, прожектор `spot .45` десктоп / 0 телефон) за .9 с, затем к каждому следующему `0.6 с хода + 0.25 с паузы`,
в конце отходит к `.92`. Долистал до `> .68` — `timeScale(3)`. После сценария — бесконечный тур `startTour()` (слои 0…6,
общий вид, пауза 1.9/2.4 с), клик по подписи или слою — `goLayer(i)` (камера 0.9 с, стоит 8 с), кнопка ❚❚/▶ `.seq-play`.
При `progress > .7` тур стоп и общий вид (`camTo(-1)`).

### 5.4 **RICCA**: подача «как у Apple» — раскрытие скрабом

Бриф: «матрас раскрывается слой за слоем **по скроллу**». У ELUNA раскрытие автоматическое после входа; для продуктовой
страницы в духе Apple правильнее привязать `spread` к прогрессу пина — пользователь «листает» слои сам, назад — собирает.
Рекомендуемый каркас (всё остальное — `render()`, `drawSeq()`, выноски — копируется из ELUNA без изменений):

```js
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });
const mm = gsap.matchMedia();
mm.add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)' }, (ctx) => {
  const D = ctx.conditions.desk;
  const tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: render, scrollTrigger: {
    trigger: '#eluna-stage', start: 'top top', end: D ? '+=160%' : '+=130%',
    pin: true, scrub: D ? 0.6 : 0.4, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: (self) => setLabels(self.progress) } });
  tl.to(S, { cutO: 1, duration: 8 }, 0)                               /* 0–8: собранный матрас проявляется */
    .to(S, { spread: 1, cutS: 0.92, duration: 60, ease: 'power1.inOut' }, 10)   /* 10–70: слои расходятся скрабом */
    .to(S, { outExp: .35, outS: .82, outY: -6, duration: 18, ease: 'power1.inOut' }, 76)  /* 76–94: уход */
    .to(S, { dark: .55, outExp: 0, outY: -14, duration: 10, ease: 'power1.in' }, 90);
  return () => {};
});
/* выноска i включается, когда раскрытие прошло её слой: порог (i + 1) / 7 от отрезка 10–70 */
function setLabels(p) { const s = Math.min(1, Math.max(0, (p - 0.10) / 0.60));
  seqLabelEls.forEach((el, i) => el.classList.toggle('is-in', s >= (i + 1) / 7 - 0.02)); }
```

Если хочется и «камеру по слоям» — после `spread = 1` оставить тур ELUNA (5.3) по клику на подпись, без автозапуска.
Крупные тезисы Apple-стиля («Семь слоёв. Одно ощущение.» / «300 мм» / «1 200 пружин») — обычные `.reveal` **после** пина,
не внутри: внутри пина живут только `.copy` с фазами.

### 5.5 Длительности и easing (сводка)

| Что | Значение |
|---|---|
| Скраб пина | десктоп .5–.6 с, телефон .35–.4 с |
| Появление блока `.reveal` | 1.3 с `--ease-out`, лесенка .09 с |
| Строки заголовка `.reveal-line` | 1.4 с, задержки .12 с |
| Счётчик цифр | 1.8 с `power3.out` |
| Диалог | .4 с `power3.out`, сдвиг 14px |
| Вкладка `.panel` | .7 с |
| Hover кнопок/карточек | .4–.7 с `--ease-out` |
| Свет `Light` | x/y .9 с `power3.out`, сила .7 с `power2.out` |
| Расслойка (по времени) | 1.6 с `power3.out`; камера .9/.6 с `power2.inOut` |
| Интро ELUNA | ≈ 6.3 с, `body.is-intro` **блокирует скролл** до конца или первого жеста (`hurry`, ×3.2) |

### 5.6 Reduced motion — что делает ELUNA (повторить)

`const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches` (15):
- тир сразу `low` → кадры 1280×720, без мерцания звёзд и метеоров, без дрейфа неба (`driftLoop` выходит);
- интро `progress(1)`, расслойка мгновенно `spread = 1`, все выноски `is-in`, тур не запускается, кнопка паузы скрыта;
- CSS (942–953): все `transition/animation` → .01мс, `.reveal` видим, карта статична, сонар города статичный;
- `scrollIntoView({ behavior: 'auto' })`, смена текстов фаз без задержек, счётчики не считают;
- пин **остаётся** (скраб — не «анимация», это позиция), но содержимое внутри не движется само.

**RICCA**: то же; дополнительно — видео производства не автоплеится, остаётся постер (правило из MANIFEST).

### 5.7 Что из ELUNA **не брать** на RICCA

- Интро с блокировкой скролла (`body.is-intro { overflow: hidden }`, `history.scrollRestoration = 'manual'`, `scrollTo(0,0)`, 654–657):
  гость из Instagram должен листать сразу. Допустимо короткое (≤ 1 с) проявление первого экрана без блокировки.
- Луна WebGL (`js/moon.js`, `initMoonGL`, 324–349) и `moon-hd.webp` 2048². Если луна нужна как декор блока ELUNA — только
  `moon-hd-1280.webp` картинкой, `loading="lazy"`, с CSS-терминатором (`.moon-big::after`, 202–207) или без него.
- Параллакс от указателя `P` (876–884), подсветка букв `glowLetters()` (1657–1690) — по желанию; это 1 500+ span'ов на страницу.
- «Сон вдвоём» (`motion()`, 902–1025) и осциллограммы «Тишина» — контент ELUNA, на RICCA достаточно ссылки «Сайт ELUNA».

---

## 6. Плеер кадров (разрез как последовательность) — `main.js` 356–459

### 6.1 Данные

```js
const SEQ = TIER === 'high'
  ? { count: 24, w: 2560, h: 1440, base: 'img/seq2560/', pad: 2, fallback: 'img/seq/' }
  : TIER === 'medium' ? { count: 24, w: 1920, h: 1080, base: 'img/seq/', pad: 2 }
                      : { count: 24, w: 1280, h: 720,  base: 'img/seq720/', pad: 2 };
function frameSrc(i) { return `${SEQ.base}f${String(i + 1).padStart(SEQ.pad, '0')}.webp`; }   // f01…f24
```

**RICCA**: путей два — `img/eluna/seq/` (1920) и `img/eluna/seq720/` (1280); `high` → 1920 (2560 нет).
Кадр f01 — собранный матрас, f24 — полностью разложенная стопка; все кадры одной геометрии (слои разъезжаются
по вертикали, камера не двигается), чёрный фон.

### 6.2 Уровень качества `detectTier()` (55–73) — упростить

ELUNA: `?gl=off` или reduced-motion → `low`; нет WebGL → `low`; очки: память ≥ 8 → +2 (≥ 4 → +1), ядра ≥ 8 → +2 (≥ 4 → +1),
ширина ≥ 1200 → +1, dpr ≥ 3 → −1, `saveData` → −2; `≥ 4 high`, `≥ 2 medium`, иначе `low`. Через 300 мс после старта
`probeFrames()` (626–639) меряет p90 времени кадра: `> 34 мс` → уровень ниже.
**RICCA** (без WebGL): `low` при reduced-motion / `saveData` / `deviceMemory < 4`; телефон (≤ 899px) → всегда `seq720`;
иначе `seq` 1920. `probeFrames` оставить — дешёвая страховка.

### 6.3 Загрузка `loadSeq()` (368–387)

Порядок: кадр 0, последний, средний, затем все по порядку; **4 параллельных цепочки** (`if (k < 4) next()`);
`img.decoding = 'async'` и `img.decode()` до того, как кадр считается загруженным — первый `drawImage` не бьёт по кадру
скролла; при ошибке 2560 → тот же кадр из 1920. Пока кадр не пришёл — `nearestFrame(i)` (388–394) берёт ближайший
загруженный. Старт: по концу интро или первому жесту. **RICCA**: стартовать по `IntersectionObserver` на секцию ELUNA с
`rootMargin: '150% 0px'` (за полтора экрана), и не раньше `window.load` — чтобы не конкурировать с hero.

### 6.4 Геометрия и размер холста `seqGeometry()` / `sizeSeq()` (395–415)

```js
function dprSeq() { return Math.min(1.5, window.devicePixelRatio || 1); }
function seqGeometry() {
  const d = dprSeq(), cw = Math.round(innerWidth * d), ch = Math.round(innerHeight * d), mob = isMobile();
  const k = mob ? (cw / SEQ.w) * 0.82 : Math.min(cw / SEQ.w, ch / SEQ.h) * 0.7;   // десктоп: 70 % вписанного; телефон: 82 % ширины
  const dw = SEQ.w * k, dh = SEQ.h * k;
  return { cw, ch, dw, dh, dx: mob ? -dw * 0.12 : (cw - dw) * 0.5, dy: (ch - dh) * (mob ? 0.5 : 0.56) };
}
function sizeSeq() {   // canvas размером с КАДР, не с экран (в 2–3 раза меньше пикселей)
  const d = dprSeq(), g = seqGeometry();
  seqCanvas.width = Math.round(g.dw); seqCanvas.height = Math.round(g.dh);      // device px
  seqCanvas.style.left = `${g.dx / d}px`; seqCanvas.style.top = `${g.dy / d}px`; // CSS px
  seqCanvas.style.width = `${g.dw / d}px`; seqCanvas.style.height = `${g.dh / d}px`;
  placeSeqLabels(g.dx / d, g.dy / d, g.dw / d, g.dh / d); seqDirty = true; if (S.cutO > 0.001) drawSeq();
}
```

На телефоне кадр сдвинут влево на 12 % своей ширины — справа остаётся место выноскам. Масштаб камеры (`cutS`) и сдвиги
(`cutX/cutY`, `outY/outS`) — это `transform` **родителя** `#productCut` (`translate3d(...) scale(...)`, 556), холст не
перерисовывается при наезде. Виньетка краёв запечена в сам холст (см. 6.5), не CSS-маска — иначе телефон перерисовывает
маскированный слой каждый кадр.

### 6.5 Отрисовка `drawSeq()` (438–459)

```js
const f = spread * (SEQ.count - 1), i0 = Math.floor(f), t = f - i0;
const a = nearestFrame(i0), b = frames[Math.min(SEQ.count - 1, i0 + 1)];
ctx.clearRect(0, 0, cw, ch);
if (a) ctx.drawImage(a, 0, 0, cw, ch);
if (b && b !== a && t > 0.02) { ctx.globalAlpha = t; ctx.drawImage(b, 0, 0, cw, ch); ctx.globalAlpha = 1; }   // кроссфейд соседних кадров
ctx.globalCompositeOperation = 'lighten'; ctx.fillStyle = '#06070c'; ctx.fillRect(0, 0, cw, ch);           // чёрный фон кадра → цвет страницы
ctx.globalCompositeOperation = 'destination-in'; ctx.fillStyle = seqVignette(cw, ch); ctx.fillRect(0, 0, cw, ch); // виньетка
ctx.globalCompositeOperation = 'source-over';
```

Перерисовка только при `seqDirty` (`markSeq()`, 416–422: кадр сдвинулся > 0.015, или размер, или число загруженных).
`seqVignette()` (424–437) — кэшированный `createPattern` эллипса: радиусы `.62w/.64h` (телефон `.56`), стопы
`0 → 1`, `.40 → 1`, `.70 → .5`, `1 → 0` (телефон `.30/.64`).
**Важно для RICCA**: цвет в `lighten` должен быть **ровно** цветом фона секции (`#07080c`, если взяты токены из 1.2),
иначе виден прямоугольник кадра. Если разрез кладётся на светлую секцию — `lighten` не поможет (фон кадра чёрный):
разрез живёт только на тёмном.

### 6.6 Выноски `#seqLabels` (464–508; CSS 314–337, телефон 862–868)

Якоря на правой грани слоёв в процентах кадра f24: `Y = [6.5, 17.6, 24.6, 30.8, 40.6, 55.5, 71.0]`,
`X = [84, 84, 84, 84, 84, 81.3, 78.1]`. Контейнер **не** трансформируется вместе с разрезом: `labelAnchor()` (480–485)
пересчитывает точку через `cutS·outS` вокруг центра экрана и сдвиги — линии следуют за слоями при наезде, текст остаётся
на экране. Каждая выноска — `span.seq-label` с `--i`, двумя точками и текстом; линия: наклонный отрезок 40° длиной
`--run` (32px / телефон 14px) → вертикаль `--drop + i·--step` (лесенка) → текст 15px (телефон 12px, короткие имена через
`data-short`). Появление по классу `is-in` (CSS-переходы: линия .35 с → вертикаль через .28 с → текст через .5 с).
`--shift` сдвигает текст влево, если не влезает (ширины кэшируются в `measureLabels()`, не меряются в кадре);
`--vis 0`, если слой ушёл за экран; `.is-focus` приглушает неактивные до .45. На телефоне позиции пересчитываются через кадр.

### 6.7 Слои для выносок — `LAYERS` (78–86), совпадают с рендером

| № | Слой | Толщина | Плотность | Роль |
|---|---|---|---|---|
| 01 | Стёганый чехол | 15 мм | 320 г/м² | Микроклимат |
| 02 | Натуральный латекс | 30 мм | 65 кг/м³ | Комфорт |
| 03 | Memory-пена с гелем | 40 мм | 50 кг/м³ | Контур тела |
| 04 | Кокосовая койра | 30 мм | 110 кг/м³ | Опора |
| 05 | Пена HR | 40 мм | 40 кг/м³ | Распределение |
| 06 | Независимые пружины | 120 мм | 500 шт/м² | Независимость |
| 07 | Армированное основание | 25 мм | 35 кг/м³ | Геометрия |

Итого 300 мм, 1 200 пружин на 1600 × 2000. Это **слои рендера** (так подписывает их сайт ELUNA). Составы конкретных
моделей другие — `MODELS` (раздел 10); не смешивать: разлёт подписывать `LAYERS`, карточки моделей — `MODELS`.

---

## 7. Звёздное небо `stars()` — `main.js` 116–289, CSS 90–92

Разметка: один `<canvas class="stars" id="stars">` в HTML; JS добавляет ещё два: `stars--near` и `stars--twinkle`.
Все три `position: fixed; inset: 0; z-index: 0; pointer-events: none`.

- **Дальний слой** (`paintLayer(fctx, 'far')`): пылевая полоса (`band = w·H / 1400` точек 1×1, альфа .04–.16, телефон /2400)
  + слабые звёзды. **Ближний**: яркие звёзды (`m > .5`) с радиальным ореолом `r·9` и крестами-бликами у самых ярких (`m > .9`).
  Плотность: `w·H / density`, `density = high 3200 · medium 5000 · low 8000`, на телефоне ×1.56 (реже).
  Палитра `tint()`: 25 % холодных `196,208,255`, 45 % белых `245,243,238`, 22 % тёплых `255,236,205`, 8 % оранжевых `255,208,160`.
- **Узор рисуется один раз** в tile `w × H` (H = h·1.18) и кладётся **дважды** → холст шириной 2w. Дрейф — только `transform`:
  `translate3d(wrap(off, w) − w, offY − parallax, 0)`, скорости `far −3.4 px/с`, `near −10 px/с`, качание по y синусом
  (`h·.004` / `h·.014`), параллакс скролла `min(H − h, scrollY·.035)` (near ×1.3). Ни одной перерисовки в дрейфе.
  Луна (`--skyx/--skyy` на `:root`) покачивается в такт дальнему слою.
- **Мерцание** — отдельный холст `w × h`, `≈ w/32` точек (телефон `w/56`), перерисовка по `setInterval` 110 мс (high) /
  160 / 240 (телефон); **метеор** каждые 5–12 с, полёт 900 мс в коротком rAF; на `low` метеоров нет.
- `dpr ≤ 1.5`; перерисовка только при смене ширины (`resizeHooks`), дрейф и мерцание спят, когда сцена вне экрана
  (`stars.setVisible(false)` из IO на `#stage`, 578–588) или вкладка скрыта; reduced-motion — статично.

**RICCA**: небо фиксировано за всей страницей, поэтому секции ELUNA лежат на нём с полупрозрачными фонами
`rgba(9,10,16,.85–.9)` — звёзды чуть просвечивают везде. Если на RICCA небо нужно только в блоке ELUNA — сделать холсты
`position: absolute` внутри блока (`overflow: hidden`) и `setVisible` по IO этого блока; дрейф тогда тоже только там.
Светлые секции небо перекрывают полностью (непрозрачный `--paper`).

---

## 8. Контроллер света `Light` — `main.js` 93–109

```js
const Light = (() => {
  const st = { x: 0.12, y: 0.18, i: 1 }; const subs = new Set(); let owner = 'hero';
  const emit = () => subs.forEach((f) => f(st));
  const tx = gsap.quickTo(st, 'x', { duration: .9, ease: 'power3.out', onUpdate: emit });
  const ty = gsap.quickTo(st, 'y', { duration: .9, ease: 'power3.out', onUpdate: emit });
  const ti = gsap.quickTo(st, 'i', { duration: .7, ease: 'power2.out', onUpdate: emit });
  return { get: () => st, owner: () => owner, claim(who) { owner = who; },
    aim(who, x, y, i) { if (who !== owner) return; if (x != null) tx(x); if (y != null) ty(y); if (i != null) ti(i); },
    set(who, x, y, i) { if (who !== owner) return; /* мгновенно */ … emit(); },
    on(fn) { subs.add(fn); fn(st); return () => subs.delete(fn); } };
})();
```

Один источник света на странице в долях (0–1): **владелец** — тот, кто сейчас на экране (`claim('hero')` в IO сцены,
`claim('rail')` в IO линейки); источники: луна + указатель (сцена), выбранная карточка (`select(i)` → центр карточки по x,
сила `.5 + lvl·.12`). Потребители подписываются `Light.on(L => …)` и пишут CSS-переменные на **владельцев, не на :root**:
`#mrail { --lx: …%; --li: … }` (1445–1449) → прожектор рельса `.mrail__light` (453–458) и блик `.button--primary::after`.
На телефоне подписчик рельса ничего не пишет (большой градиент перерисовывается при каждом изменении) — свет статичен,
начальные значения в разметке `style="--lx: 62%; --li: .9"`.
**RICCA**: взять как есть для блока ELUNA (карточки + кнопка). Для мебельного каталога свет не нужен.

---

## 9. Что копировать из `js/main.js` (строки) и что выкинуть

| Строки | Что | Для RICCA |
|---|---|---|
| 8–19 | каркас IIFE, `registerPlugin`, `ScrollTrigger.config`, `reduceMotion`, `params` | копировать |
| 25–42 | конвейер resize, `isMobile()` (899px), `resizeHooks` | копировать |
| 48–73 | `probeGL`, `detectTier` | упростить (6.2) |
| 78–86 | `LAYERS` | копировать (подписи разлёта) |
| 93–109 | `Light` | копировать для блока ELUNA |
| 116–289 | `stars()` | копировать; решить — фиксированное небо или внутри блока |
| 295–305, 315–318 | `S`, `I`, `P`, `sv/svar/svo` | `S` и хелперы — копировать; `I` (интро) и `P` (указатель) — нет |
| 324–349 | луна WebGL | **нет** |
| 356–459 | `SEQ`, `loadSeq`, `nearestFrame`, `dprSeq`, `seqGeometry`, `sizeSeq`, `markSeq`, `seqVignette`, `drawSeq` | копировать, поправить пути и цвет `lighten` |
| 464–529 | выноски, `labelAnchor`, `measureLabels`, `placeLabels`, `layerScreenY/focusY/spotY`, `setActiveLayer` | копировать |
| 536–572 | `render()` | копировать, вырезать строки про луну (541–550) и wordmark/cue (569–571) |
| 574–589 | `sizeSeq()` при старте, IO сцены (`stageOff`, свет, звёзды) | копировать |
| 594–671 | интро, `probeFrames`, `hurry` | только `probeFrames` (626–639) |
| 684–687 | `revealConcept` | копировать (показ следующей секции на хвосте пина) |
| 694–730 | `playLayers/resetLayers` | заменить скраб-вариантом (5.4) или оставить как «автопоказ» |
| 735–817 | тур, `goLayer`, `layersCtl` | по желанию (клик по слою) |
| 823–873 | `setPhase`, `buildStage`, `matchMedia` | копировать, переписать проценты под 5.4 |
| 876–884 | параллакс указателя | нет |
| 889–897 | таблица слоёв из `LAYERS` | копировать (шаблон строки `.tlayers`) |
| 902–1025 | «Сон вдвоём» | нет |
| 1027–1046 | `tabs()` | копировать (каталог) |
| 1056–1334 | `delivery()` | копировать статичную часть (города, выбор); холст — опционально |
| 1341–1405 | `PRICES`, `OLD_PRICES`, `WHATSAPP`, `MODELS`, `TIERS`, `fmtMoney`, `priceHTML`, `waLink`, `esc` | копировать; `fmtMoney` → U+202F |
| 1407–1517 | `lineup()` — цены, метки, разрезы `.xs`, рельс, лента, диалоги, липкая плашка | копировать |
| 1526–1654 | `orderFlow()` | упрощённо (4.9) или только `priceOf()` + `message()` |
| 1657–1690 | `glowLetters()` | по желанию |
| 1693–1725 | `countUp()`, `reveals()` | копировать |
| 1728–1741 | плавный якорь (учёт пина, открытие диалога по якорю) | копировать, объединить с `scrollYFor()` из n3-nera (offset шапки) |
| 1743–1747 | `fonts.ready → refresh`, `load → refresh`, поздний viewport | копировать |

Из прошлых сборок RICCA (`ricca/_directions/n3-nera/script.js`, `galleria-final/js/site.js`): `CONFIG` с номерами и текстами
WhatsApp и перезапись `[data-wa]/[data-tel]`, фильм по главам (декодируется один ролик), лайтбокс не крупнее родного размера,
образцы → WhatsApp, правила мобильной плашки, якоря с offset шапки. **Конфликт**: ELUNA тоже перезаписывает `[data-wa]`
(`orderFlow().render`, 1608) текстом заказа и номером `WHATSAPP = '77079550808'` (отдел заказов), а RICCA CONFIG шлёт на
`77084802047`. Решение: на сайте RICCA за `[data-wa]` отвечает один скрипт (CONFIG RICCA); кнопки блока ELUNA получают
`data-wa="eluna"` с текстом модели/размера, номер — отдела заказов, как на ELUNA
(`<!-- TODO заказчик: куда идут заказы матрасов — 707 955-08-08 или 708 480-20-47 -->`).

---

## 10. Данные ELUNA для блока-презентации (факты с сайта ELUNA, разрешены брифом)

```js
const PRICES = { air: 125000, balance: 220000, prime: 280000, royal: 1250000 };   // ₸ за 1600 × 2000 мм
const OLD_PRICES = { prime: 350000 };   // → бейдж «−20 %» и зачёркнутая цена
const WHATSAPP = '77079550808';
```

| Модель | Высота | Уровень | Карточка (3 пункта) | Жёсткость (из диалога) |
|---|---|---|---|---|
| Eluna Air | 220 мм | Базовая | Армированные пружины · Натуральный кокос 10 мм · Двусторонний: зима / лето | Мягкая / средняя |
| Eluna Balance | 230–250 мм | Pro | Усиленный боковой каркас · Два слоя кокоса 10 и 20 мм · Армированные пружины | Средняя |
| Eluna Prime | 280–300 мм | Выбор Eluna · −20 % | Чехол из 100 % хлопка ручной работы · Натуральный латекс 20 мм — микромассажный эффект · Натуральный кокос 20 мм — отвечает за жёсткость | Средняя / выше средней |
| Eluna Royal | под ваш размер | Флагман · индивидуально | Нестандартный размер и начинка под проект · Срок изготовления 21 день · Гарантия 5 лет · срок службы 15+ лет | Индивидуально |

Составы (`MODELS`, 1345–1387), сверху вниз, для разрезов `.xs`:
- **Air**: вискозный трикотаж 6 · ортопена 20 · термовойлок 6 · армированные пружины 140 · термовойлок 6 · натуральный кокос 10 · вискозный трикотаж 6 (мм).
- **Balance**: плотный вискозный трикотаж 6 · ортопена 20 · термовойлок 6 · кокос 20 · армированные пружины 140 (усиленный боковой каркас) · термовойлок 6 · кокос 10 · ортопена 15 · трикотаж 6.
- **Prime**: чехол из 100 % хлопка 10 (ручная работа) · натуральный латекс 20 · термовойлок 6 · кокос 20 · армированные пружины 160 · кокос 20 · термовойлок 6 · латекс 20 · хлопок 10.
- **Royal**: состав и толщины подбираются под заказ.

Общее для всех моделей (`.perks`): армированные пружины · натуральный кокос · еврокаркас плотности 22 · термовойлок (без пыли внутри)
· двусторонний зима/лето · гарантия 5 лет, срок службы 15+ · Silent Motion · не скрипит · ортопедическая поддержка.
Доверие (`.trust`): 100 ночей пробного сна · 5 лет гарантии · ручная сборка одним мастером · доставка от 7 дней по Казахстану,
в Алматы — привезут и установят сами. Размеры: 1600 × 2000, 1800 × 2000 (+16 000 ₸), свой размер (±40 000 ₸/м², 21 день).

Внимание: гарантия ELUNA — **5 лет**, гарантия RICCA на мебель — **3 года** (бриф). На сайте RICCA писать обе, каждая у
своего продукта, не смешивать.

---

## 11. Подводные камни

1. **Холст разреза.** `canvas.width/height` — device-px размера кадра, `style.*` — CSS-px; оба ставить в `sizeSeq()`, иначе
   размытие или искажение. `dpr ≤ 1.5`. Пересчёт — в `resizeHooks` только при смене ширины. Цвет `lighten` = фон секции.
   Виньетка кэшируется по `w/h` — при смене размера пересоздаётся сама. Если пин «мигает» на iOS — проверьте, что `.seq`
   не получил `will-change` и что у `#productCut` только `transform/opacity`.
2. **Пин на телефоне.** Обязательны `ScrollTrigger.config({ ignoreMobileResize: true })`, `anticipatePin: 1`,
   высота сцены `100vh` + `100svh` (170), `touch-action: pan-y` на сцене (834). Пинуемый элемент — **не** внутри `.container`,
   не внутри родителя с `transform`, `overflow: hidden/clip` или `content-visibility`. Следующая секция с отрицательным
   `margin-top` должна быть `position: relative; z-index` выше сцены. После загрузки шрифтов и `load` — `ScrollTrigger.refresh()`.
   На ≤ 899px скраб `.35–.4`, pin-дистанция `+=100…130%` — длиннее утомляет большим пальцем.
3. **Шрифты.** Запросы `font-weight: 400/600/700` у Unbounded подменяются (400 → 500); писать 300/500. Четыре `preload`
   с `crossorigin` (без него шрифт скачается дважды). `font-display: swap` → после подмены шрифта измерять ширины выносок
   заново (`document.fonts.ready`). `₸` вне `unicode-range` Inter — ставить в Unbounded. Michroma не нужен.
4. **Цены.** `fmtMoney` даёт обычные пробелы — заменить на U+202F; `toLocaleString('ru-RU')` даёт NBSP U+00A0 как группу
   тысяч. `priceHTML` ставит старую цену первой — порядок в разметке важен для `.price-old { flex-basis: 100% }`.
5. **Звёзды и фон.** Небо фиксировано; секции должны быть полупрозрачными, иначе оно пропадает ниже hero. На телефоне
   `.grain` выключен, `nebula` без `scale`. Дрейф спит вне экрана — не забыть `setVisible` при собственном IO.
6. **Два скрипта на `[data-wa]`** — см. раздел 9; один владелец ссылок.
7. **Интро ELUNA блокирует скролл** — не переносить (5.7). `scrollRestoration = 'manual'` + `scrollTo(0,0)` тоже убрать:
   гость из Instagram может прийти по якорю `#eluna`.
8. **`content-visibility: auto`** на секциях с пином внутри ломает пин — ставить только на секции **после** всех сцен.
9. **Вес.** Кадры 1920 — 1,75 МБ, 720 — 1,33 МБ: грузить лениво, по уровню/ширине, никогда оба набора. GSAP + ScrollTrigger
   117 КБ — `defer`, после своих стилей. Луна 218 КБ — только если реально нужна.
10. **Диалоги.** `showModal()` требует, чтобы `<dialog>` не был внутри `overflow: hidden` родителя с `position` (на телефоне
    он на весь экран — `100dvh`). Фокус возвращать открывшей кнопке; `Esc` работает нативно.
11. **Карта.** Контур — `vector-effect: non-scaling-stroke`, иначе линия утолщается на телефоне. Города в процентах
    от 2080 × 1174 — при другом `aspect-ratio` разъедутся.
12. **Светлые секции.** Переопределять токены внутри `.section--paper`, не красить компоненты поштучно; кнопка primary
    инвертируется; разрез/звёзды/луна на светлом не живут.

---

## 12. Чеклист сборщика

- [ ] `css/fonts-eluna.css` подключён первым, 4 preload с `crossorigin`; `--display/--sans` в `:root`.
- [ ] Токены из 1.2; золото только в блоке ELUNA; 1–2 светлые секции через `.section--paper`.
- [ ] Блок ELUNA: пин + скраб-раскрытие (5.4), выноски `LAYERS`, тезисы `.reveal` после пина, 4 карточки с `PRICES/OLD_PRICES/TIERS`,
      диалоги «Подробнее» с `MODELS`, перки, упрощённый размер (1600/1800/свой), ссылка «Сайт ELUNA» → https://ricca-designs.netlify.app.
- [ ] Кадры: `img/eluna/seq720` на телефоне, `seq` на десктопе; старт загрузки по IO за 150 %; `lighten` = фон.
- [ ] Меню на телефоне (у ELUNА его нет), липкая плашка по правилам RICCA, один владелец `[data-wa]`.
- [ ] Reduced motion проверен; скриншоты 1440 и 390×664, без горизонтальной прокрутки, нет JS-ошибок.
- [ ] Гарантии: мебель 3 года / ELUNA 5 лет — у своих продуктов; сроки доставки мебели — TODO заказчику.
