/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
   RICCA DESIGNS — «СОСТАВ» МОДЕЛЕЙ (блок в окне «Подробнее» каждой модели каталога)

   Как это работает:
   • types — черновой состав по типу изделия (слои сверху вниз: от обивки к каркасу), русский и английский.
   • models — каждая модель каталога: тип, мягкость и высота посадки (1–5), свои слои поверх типа.
   • Пока у модели verified: false — блок «Состав» у неё НЕ показывается. Проверили состав с мастером, заполнили
     все [СКОБКИ] — ставьте verified: true. Если у проверенной модели в слоях остались [СКОБКИ], блок всё равно скрыт.
   • Свой слой у модели: в layers пишите { key: '…', name: '…', benefit: '…' } — слой с тем же key заменяется
     (например, пух в подушках: { key: 'back', name: 'Подушки спинки: пух и перо', benefit: 'мягкие, как облако' }),
     новый key — добавляется вниз. Убрать слой: { key: 'lift', hidden: true }.
   • softness — мягкость (1 — жёстко, 5 — очень мягко); seat_height — посадка (1 — низкая, 5 — высокая).
   • Новая модель в каталоге: python3 tools/composition-data.py --add — допишет её сюда с черновым составом.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
window.RICCA_COMPOSITION = {
  ui: {
    ru: { title: 'Состав', softness: 'Мягкость', seat: 'Посадка', low: 'низкая', high: 'высокая' },
    en: { title: 'What it’s made of', softness: 'Softness', seat: 'Seat height', low: 'low', high: 'high' }
  },
  types: {
    "sofa": {
      "ru": {
        "label": "Диван прямой / угловой",
        "layers": [
          {
            "key": "cover",
            "name": "Обивка: [ТКАНЬ ПО ВЫБОРУ]",
            "benefit": "образцы в шоуруме"
          },
          {
            "key": "back",
            "name": "Подушки спинки: холлофайбер в чехле",
            "benefit": "мягкие, взбиваются заново"
          },
          {
            "key": "seat",
            "name": "Сиденье: ППУ высокой упругости [ПЛОТНОСТЬ] + синтепон",
            "benefit": "держит форму годами"
          },
          {
            "key": "base",
            "name": "Основание: пружины «змейка» [ИЛИ НЕЗАВИСИМЫЙ БЛОК]",
            "benefit": "ровная посадка по всей длине"
          },
          {
            "key": "frame",
            "name": "Каркас: массив [ПОРОДА] + фанера [ТОЛЩИНА] мм",
            "benefit": "не скрипит и не расшатывается"
          },
          {
            "key": "legs",
            "name": "Ножки: [МАССИВ / МЕТАЛЛ]",
            "benefit": ""
          }
        ]
      },
      "en": {
        "label": "Straight / corner sofa",
        "layers": [
          {
            "key": "cover",
            "name": "Upholstery: [ТКАНЬ ПО ВЫБОРУ]",
            "benefit": "samples in the showroom"
          },
          {
            "key": "back",
            "name": "Back cushions: hollow fibre in a cover",
            "benefit": "soft, plump up again"
          },
          {
            "key": "seat",
            "name": "Seat: high-resilience foam [ПЛОТНОСТЬ] + wadding",
            "benefit": "keeps its shape for years"
          },
          {
            "key": "base",
            "name": "Base: zigzag springs [ИЛИ НЕЗАВИСИМЫЙ БЛОК]",
            "benefit": "even seating along the whole length"
          },
          {
            "key": "frame",
            "name": "Frame: solid [ПОРОДА] + [ТОЛЩИНА] mm plywood",
            "benefit": "doesn’t creak or loosen"
          },
          {
            "key": "legs",
            "name": "Legs: [МАССИВ / МЕТАЛЛ]",
            "benefit": ""
          }
        ]
      }
    },
    "bed": {
      "ru": {
        "label": "Кровать",
        "layers": [
          {
            "key": "cover",
            "name": "Обивка: [ТКАНЬ ПО ВЫБОРУ]",
            "benefit": "образцы в шоуруме"
          },
          {
            "key": "head",
            "name": "Изголовье: ППУ [ПЛОТНОСТЬ]",
            "benefit": "удобно опереться спиной"
          },
          {
            "key": "base",
            "name": "Основание: ортопедические ламели из берёзы",
            "benefit": "проветривают матрас"
          },
          {
            "key": "lift",
            "name": "Механизм: газлифт [ЕСЛИ ЕСТЬ]",
            "benefit": "поднимается одной рукой"
          },
          {
            "key": "frame",
            "name": "Каркас: массив [ПОРОДА] + фанера [ТОЛЩИНА] мм",
            "benefit": "не скрипит и не расшатывается"
          }
        ]
      },
      "en": {
        "label": "Bed",
        "layers": [
          {
            "key": "cover",
            "name": "Upholstery: [ТКАНЬ ПО ВЫБОРУ]",
            "benefit": "samples in the showroom"
          },
          {
            "key": "head",
            "name": "Headboard: foam [ПЛОТНОСТЬ]",
            "benefit": "comfortable to lean on"
          },
          {
            "key": "base",
            "name": "Base: orthopaedic birch slats",
            "benefit": "let the mattress breathe"
          },
          {
            "key": "lift",
            "name": "Mechanism: gas lift [ЕСЛИ ЕСТЬ]",
            "benefit": "lifts with one hand"
          },
          {
            "key": "frame",
            "name": "Frame: solid [ПОРОДА] + [ТОЛЩИНА] mm plywood",
            "benefit": "doesn’t creak or loosen"
          }
        ]
      }
    },
    "armchair": {
      "ru": {
        "label": "Кресло",
        "layers": [
          {
            "key": "cover",
            "name": "Обивка: [ТКАНЬ ПО ВЫБОРУ]",
            "benefit": "образцы в шоуруме"
          },
          {
            "key": "seat",
            "name": "Сиденье: ППУ высокой упругости [ПЛОТНОСТЬ]",
            "benefit": "не проседает"
          },
          {
            "key": "base",
            "name": "Основание: пружины «змейка» [ИЛИ РЕМНИ]",
            "benefit": "ровная упругая посадка"
          },
          {
            "key": "frame",
            "name": "Каркас: массив [ПОРОДА] + фанера",
            "benefit": "не скрипит и не расшатывается"
          }
        ]
      },
      "en": {
        "label": "Armchair",
        "layers": [
          {
            "key": "cover",
            "name": "Upholstery: [ТКАНЬ ПО ВЫБОРУ]",
            "benefit": "samples in the showroom"
          },
          {
            "key": "seat",
            "name": "Seat: high-resilience foam [ПЛОТНОСТЬ]",
            "benefit": "doesn’t sag"
          },
          {
            "key": "base",
            "name": "Base: zigzag springs [ИЛИ РЕМНИ]",
            "benefit": "even, springy seating"
          },
          {
            "key": "frame",
            "name": "Frame: solid [ПОРОДА] + plywood",
            "benefit": "doesn’t creak or loosen"
          }
        ]
      }
    },
    "pouf": {
      "ru": {
        "label": "Пуф / банкетка",
        "layers": [
          {
            "key": "cover",
            "name": "Обивка: [ТКАНЬ ПО ВЫБОРУ]",
            "benefit": "образцы в шоуруме"
          },
          {
            "key": "fill",
            "name": "Наполнение: ППУ [ПЛОТНОСТЬ]",
            "benefit": "держит форму"
          },
          {
            "key": "frame",
            "name": "Каркас: [МАТЕРИАЛ]",
            "benefit": "не скрипит и не расшатывается"
          }
        ]
      },
      "en": {
        "label": "Pouf / bench",
        "layers": [
          {
            "key": "cover",
            "name": "Upholstery: [ТКАНЬ ПО ВЫБОРУ]",
            "benefit": "samples in the showroom"
          },
          {
            "key": "fill",
            "name": "Filling: foam [ПЛОТНОСТЬ]",
            "benefit": "keeps its shape"
          },
          {
            "key": "frame",
            "name": "Frame: [МАТЕРИАЛ]",
            "benefit": "doesn’t creak or loosen"
          }
        ]
      }
    },
    "modular": {
      "ru": {
        "label": "Диван модульный",
        "layers": [
          {
            "key": "cover",
            "name": "Обивка: [ТКАНЬ ПО ВЫБОРУ]",
            "benefit": "образцы в шоуруме"
          },
          {
            "key": "back",
            "name": "Подушки спинки: холлофайбер в чехле",
            "benefit": "мягкие, взбиваются заново"
          },
          {
            "key": "seat",
            "name": "Сиденье: ППУ высокой упругости [ПЛОТНОСТЬ] + синтепон",
            "benefit": "держит форму годами"
          },
          {
            "key": "base",
            "name": "Основание: пружины «змейка» [ИЛИ НЕЗАВИСИМЫЙ БЛОК]",
            "benefit": "ровная посадка по всей длине"
          },
          {
            "key": "frame",
            "name": "Каркас: массив [ПОРОДА] + фанера [ТОЛЩИНА] мм",
            "benefit": "не скрипит и не расшатывается"
          },
          {
            "key": "modules",
            "name": "Модули",
            "benefit": "каждый модуль на своём каркасе — переставляются и соединяются стяжками"
          },
          {
            "key": "legs",
            "name": "Ножки: [МАССИВ / МЕТАЛЛ]",
            "benefit": ""
          }
        ]
      },
      "en": {
        "label": "Modular sofa",
        "layers": [
          {
            "key": "cover",
            "name": "Upholstery: [ТКАНЬ ПО ВЫБОРУ]",
            "benefit": "samples in the showroom"
          },
          {
            "key": "back",
            "name": "Back cushions: hollow fibre in a cover",
            "benefit": "soft, plump up again"
          },
          {
            "key": "seat",
            "name": "Seat: high-resilience foam [ПЛОТНОСТЬ] + wadding",
            "benefit": "keeps its shape for years"
          },
          {
            "key": "base",
            "name": "Base: zigzag springs [ИЛИ НЕЗАВИСИМЫЙ БЛОК]",
            "benefit": "even seating along the whole length"
          },
          {
            "key": "frame",
            "name": "Frame: solid [ПОРОДА] + [ТОЛЩИНА] mm plywood",
            "benefit": "doesn’t creak or loosen"
          },
          {
            "key": "modules",
            "name": "Modules",
            "benefit": "each module on its own frame — rearranged and joined with connectors"
          },
          {
            "key": "legs",
            "name": "Legs: [МАССИВ / МЕТАЛЛ]",
            "benefit": ""
          }
        ]
      }
    },
    "foldout": {
      "ru": {
        "label": "Диван раскладной",
        "layers": [
          {
            "key": "cover",
            "name": "Обивка: [ТКАНЬ ПО ВЫБОРУ]",
            "benefit": "образцы в шоуруме"
          },
          {
            "key": "back",
            "name": "Подушки спинки: холлофайбер в чехле",
            "benefit": "мягкие, взбиваются заново"
          },
          {
            "key": "seat",
            "name": "Сиденье: ППУ высокой упругости [ПЛОТНОСТЬ] + синтепон",
            "benefit": "держит форму годами"
          },
          {
            "key": "base",
            "name": "Основание: пружины «змейка» [ИЛИ НЕЗАВИСИМЫЙ БЛОК]",
            "benefit": "ровная посадка по всей длине"
          },
          {
            "key": "mech",
            "name": "Механизм: [ТИП]",
            "benefit": "раскладывается одним движением"
          },
          {
            "key": "sleep",
            "name": "Спальное место: [ППУ / ПРУЖИННЫЙ БЛОК]",
            "benefit": "ровное, без стыков"
          },
          {
            "key": "frame",
            "name": "Каркас: массив [ПОРОДА] + фанера [ТОЛЩИНА] мм",
            "benefit": "не скрипит и не расшатывается"
          },
          {
            "key": "legs",
            "name": "Ножки: [МАССИВ / МЕТАЛЛ]",
            "benefit": ""
          }
        ]
      },
      "en": {
        "label": "Sofa bed",
        "layers": [
          {
            "key": "cover",
            "name": "Upholstery: [ТКАНЬ ПО ВЫБОРУ]",
            "benefit": "samples in the showroom"
          },
          {
            "key": "back",
            "name": "Back cushions: hollow fibre in a cover",
            "benefit": "soft, plump up again"
          },
          {
            "key": "seat",
            "name": "Seat: high-resilience foam [ПЛОТНОСТЬ] + wadding",
            "benefit": "keeps its shape for years"
          },
          {
            "key": "base",
            "name": "Base: zigzag springs [ИЛИ НЕЗАВИСИМЫЙ БЛОК]",
            "benefit": "even seating along the whole length"
          },
          {
            "key": "mech",
            "name": "Mechanism: [ТИП]",
            "benefit": "unfolds in one movement"
          },
          {
            "key": "sleep",
            "name": "Sleeping surface: [ППУ / ПРУЖИННЫЙ БЛОК]",
            "benefit": "flat, without joints"
          },
          {
            "key": "frame",
            "name": "Frame: solid [ПОРОДА] + [ТОЛЩИНА] mm plywood",
            "benefit": "doesn’t creak or loosen"
          },
          {
            "key": "legs",
            "name": "Legs: [МАССИВ / МЕТАЛЛ]",
            "benefit": ""
          }
        ]
      }
    }
  },
  models: [
    { model_id: "sofa-01", type: "modular", verified: false, softness: 4, seat_height: 2, layers: {} },   // Svira
    { model_id: "sofa-02", type: "sofa", verified: false, softness: 3, seat_height: 3, layers: {} },   // Talna
    { model_id: "sofa-03", type: "foldout", verified: false, softness: 3, seat_height: 3, layers: {} },   // Desva
    { model_id: "sofa-16", type: "foldout", verified: false, softness: 3, seat_height: 3, layers: {} },   // Zerla
    { model_id: "sofa-17", type: "foldout", verified: false, softness: 3, seat_height: 3, layers: {} },   // Semra
    { model_id: "sofa-18", type: "foldout", verified: false, softness: 3, seat_height: 3, layers: {} },   // Nemva
    { model_id: "sofa-19", type: "foldout", verified: false, softness: 3, seat_height: 3, layers: {} },   // Rasma
    { model_id: "sofa-20", type: "sofa", verified: false, softness: 3, seat_height: 3, layers: {} },   // Inza
    { model_id: "sofa-21", type: "sofa", verified: false, softness: 3, seat_height: 3, layers: {} },   // Livsa
    { model_id: "sofa-22", type: "sofa", verified: false, softness: 3, seat_height: 3, layers: {} },   // Venra
    { model_id: "sofa-23", type: "sofa", verified: false, softness: 3, seat_height: 3, layers: {} },   // Rulva
    { model_id: "bed-01", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Zenal
    { model_id: "bed-02", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Irmel
    { model_id: "bed-03", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Zovel
    { model_id: "bed-04", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Olsal
    { model_id: "bed-05", type: "bed", verified: false, softness: 3, seat_height: 3, layers: { ru: [{"key": "lift", "hidden": true}], en: [{"key": "lift", "hidden": true}] } },   // Ivel
    { model_id: "bed-09", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Usnel
    { model_id: "bed-10", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Nisel
    { model_id: "bed-11", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Ozrel
    { model_id: "bed-12", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Avsel
    { model_id: "bed-13", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Tumel
    { model_id: "bed-14", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Unsal
    { model_id: "bed-15", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Remal
    { model_id: "bed-16", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Isval
    { model_id: "bed-17", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Anvel
    { model_id: "bed-18", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Mival
    { model_id: "bed-19", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Tirel
    { model_id: "bed-20", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Razel
    { model_id: "bed-21", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Varel
    { model_id: "bed-22", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Godal
    { model_id: "bed-23", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Zural
    { model_id: "armchair-01", type: "armchair", verified: false, softness: 3, seat_height: 3, layers: {} },   // Velso
    { model_id: "armchair-07", type: "armchair", verified: false, softness: 3, seat_height: 3, layers: {} },   // Runvo
    { model_id: "armchair-08", type: "armchair", verified: false, softness: 3, seat_height: 3, layers: {} },   // Lirso
    { model_id: "armchair-09", type: "armchair", verified: false, softness: 3, seat_height: 3, layers: {} },   // Zirvo
    { model_id: "armchair-10", type: "armchair", verified: false, softness: 3, seat_height: 3, layers: {} },   // Nimso
    { model_id: "armchair-11", type: "armchair", verified: false, softness: 3, seat_height: 3, layers: {} },   // Novro
    { model_id: "sofa-24", type: "modular", verified: false, softness: 4, seat_height: 2, layers: {} },   // Lanva
    { model_id: "sofa-25", type: "sofa", verified: false, softness: 3, seat_height: 3, layers: { ru: [{"key": "legs", "name": "Ножки: металл [ОТДЕЛКА]"}], en: [{"key": "legs", "name": "Legs: metal [ОТДЕЛКА]"}] } },   // Torsa
    { model_id: "sofa-26", type: "modular", verified: false, softness: 4, seat_height: 2, layers: {} },   // Molva
    { model_id: "sofa-27", type: "modular", verified: false, softness: 4, seat_height: 2, layers: {} },   // Orsa
    { model_id: "sofa-28", type: "sofa", verified: false, softness: 3, seat_height: 3, layers: { ru: [{"key": "legs", "name": "Ножки: металл [ОТДЕЛКА]"}], en: [{"key": "legs", "name": "Legs: metal [ОТДЕЛКА]"}] } },   // Kalva
    { model_id: "sofa-29", type: "foldout", verified: false, softness: 3, seat_height: 3, layers: {} },   // Delva
    { model_id: "sofa-30", type: "foldout", verified: false, softness: 3, seat_height: 3, layers: {} },   // Serva
    { model_id: "armchair-12", type: "armchair", verified: false, softness: 3, seat_height: 3, layers: { ru: [{"key": "legs", "name": "Ножки: металл [ОТДЕЛКА]"}], en: [{"key": "legs", "name": "Legs: metal [ОТДЕЛКА]"}] } },   // Kalvo
    { model_id: "armchair-13", type: "armchair", verified: false, softness: 3, seat_height: 3, layers: {} },   // Nervo
    { model_id: "armchair-14", type: "armchair", verified: false, softness: 3, seat_height: 3, layers: { ru: [{"key": "legs", "name": "Ножки: металл [ОТДЕЛКА]"}], en: [{"key": "legs", "name": "Legs: metal [ОТДЕЛКА]"}] } },   // Tovro
    { model_id: "bed-24", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Ormel
    { model_id: "armchair-15", type: "armchair", verified: false, softness: 3, seat_height: 3, layers: {} },   // Ovro
    { model_id: "sofa-31", type: "sofa", verified: false, softness: 3, seat_height: 3, layers: {} },   // Solva
    { model_id: "bed-25", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Dorel
    { model_id: "bed-26", type: "bed", verified: false, softness: 3, seat_height: 3, layers: { ru: [{"key": "lift", "hidden": true}], en: [{"key": "lift", "hidden": true}] } },   // Linel
    { model_id: "bed-27", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Novel
    { model_id: "bed-28", type: "bed", verified: false, softness: 3, seat_height: 3, layers: {} },   // Grafel
    { model_id: "bed-29", type: "bed", verified: false, softness: 3, seat_height: 3, layers: { ru: [{"key": "lift", "hidden": true}], en: [{"key": "lift", "hidden": true}] } },   // Bukel
    { model_id: "sofa-32", type: "modular", verified: false, softness: 4, seat_height: 2, layers: {} },   // Kubva
    { model_id: "sofa-33", type: "modular", verified: false, softness: 4, seat_height: 2, layers: {} },   // Grava
    { model_id: "sofa-34", type: "modular", verified: false, softness: 4, seat_height: 2, layers: {} },   // Plava
    { model_id: "sofa-35", type: "modular", verified: false, softness: 4, seat_height: 2, layers: {} },   // Mirva
    { model_id: "sofa-36", type: "modular", verified: false, softness: 4, seat_height: 2, layers: {} },   // Tedva
    { model_id: "sofa-37", type: "sofa", verified: false, softness: 3, seat_height: 3, layers: {} },   // Arva
    { model_id: "sofa-38", type: "modular", verified: false, softness: 4, seat_height: 2, layers: { ru: [{"key": "legs", "name": "Ножки: металл [ОТДЕЛКА]"}], en: [{"key": "legs", "name": "Legs: metal [ОТДЕЛКА]"}] } },   // Belva
    { model_id: "armchair-16", type: "armchair", verified: false, softness: 3, seat_height: 3, layers: { ru: [{"key": "legs", "name": "Ножки: металл [ОТДЕЛКА]"}], en: [{"key": "legs", "name": "Legs: metal [ОТДЕЛКА]"}] } },   // Nocto
    { model_id: "sofa-39", type: "modular", verified: false, softness: 4, seat_height: 2, layers: {} },   // Dalma
    { model_id: "sofa-40", type: "sofa", verified: false, softness: 3, seat_height: 3, layers: { ru: [{"key": "legs", "name": "Ножки: металл [ОТДЕЛКА]"}], en: [{"key": "legs", "name": "Legs: metal [ОТДЕЛКА]"}] } },   // Zivra
    { model_id: "armchair-17", type: "armchair", verified: false, softness: 3, seat_height: 3, layers: { ru: [{"key": "legs", "name": "Ножки: металл [ОТДЕЛКА]"}], en: [{"key": "legs", "name": "Legs: metal [ОТДЕЛКА]"}] } },   // Lesvo
    { model_id: "sofa-41", type: "sofa", verified: false, softness: 3, seat_height: 3, layers: {} },   // Tarva
  ]
};
