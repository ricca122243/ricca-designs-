/* RICCA DESIGNS — язык и защита. Общий для главной (/, /en) и конструктора (/configurator.html, /en/configurator).
   • Переключатель «RU | EN» в шапке ([data-lng]) и прежние ссылки EN/RU (.hdr__lang, .menu__lang) ведут на ту же секцию
     в другой версии: /#catalog → /en#catalog; в конструкторе сохраняется собранный вариант (#cfg=…).
   • Выбор языка НЕ запоминается: «/» всегда русская, «/en» — английская (с 12 ноября, см. ниже).
   • Фото и видео: без контекстного меню «Сохранить» и перетаскивания (CSS дополняет: -webkit-touch-callout, user-drag). */
(() => {
  'use strict';
  const KEY = 'ricca:lang';
  const isCfg = /configurator/.test(location.pathname) || !!document.querySelector('main.cfg');
  /* конструктор — одна страница на два адреса: язык по адресу (/en/configurator или ?lang=en) */
  const page = (document.documentElement.lang === 'en' || (isCfg && (/^\/en(\/|$)/.test(location.pathname) || /[?&]lang=en\b/.test(location.search)))) ? 'en' : 'ru';
  document.querySelectorAll('[data-lng]').forEach((a) => { if (a.dataset.lng === page) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });

  /* адрес той же страницы на другом языке */
  function target(l, here = true) {
    if (isCfg) {
      const q = location.search.replace(/([?&])lang=\w+&?/, '$1').replace(/[?&]$/, '');
      return (l === 'en' ? '/en/configurator' : '/configurator.html') + q + location.hash;
    }
    let h = location.hash;
    if (here && (!h || h.length < 2)) {
      /* без якоря — раздел, который сейчас на экране (только при нажатии на переключатель) */
      const mid = window.innerHeight * 0.35;
      let cur = '';
      document.querySelectorAll('main > section[id]').forEach((s) => { if (!s.hidden && s.getBoundingClientRect().top <= mid) cur = s.id; });
      if (cur && cur !== 'top') h = `#${cur}`;
    }
    return (l === 'en' ? '/en' : '/') + (h && h.length > 1 ? h : '');
  }

  /* 12 ноября: сайт всегда открывается на том языке, на который пришли по адресу: «/» — по-русски, «/en» — по-английски.
     Раньше выбор EN запоминался, и при следующем заходе главная сама уводила на английскую версию (жалоба владельца:
     «заходишь на сайт — сначала английский»). Память выбора убрана, прежняя запись стирается. */
  try { localStorage.removeItem(KEY); } catch (e) { /* приватный режим */ }

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-lng], a.hdr__lang, a.menu__lang');
    if (!a) return;
    const l = a.dataset.lng || (a.getAttribute('hreflang') === 'en' ? 'en' : 'ru');
    e.preventDefault();
    if (l !== page) location.href = target(l);
  });

  /* «приложение»: сайт можно добавить на главный экран; фоновый помощник /sw.js ускоряет повторные заходы и показывает
     страницу «Нет интернета» без связи. Регистрируем после загрузки страницы, чтобы не мешать первому показу */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* без помощника сайт работает как обычно */ }); });
  }

  /* защита фото и видео от «Сохранить как…» и перетаскивания (3D-окно конструктора не трогаем) */
  const guard = (e) => { const t = e.target; if (t && t.closest && t.closest('img, picture, video')) e.preventDefault(); };
  document.addEventListener('contextmenu', guard);
  document.addEventListener('dragstart', guard);
  try { console.info('© RICCA DESIGNS, Алматы. Фото, тексты, 3D-модели и дизайн сайта защищены авторским правом. Копирование без письменного разрешения запрещено.'); } catch (e) { /* без консоли */ }
})();
