/* RICCA DESIGNS — язык и защита. Общий для главной (/, /en) и конструктора (/configurator.html, /en/configurator).
   • Переключатель «RU | EN» в шапке ([data-lng]) и прежние ссылки EN/RU (.hdr__lang, .menu__lang) ведут на ту же секцию
     в другой версии: /#catalog → /en#catalog; в конструкторе сохраняется собранный вариант (#cfg=…).
   • Выбор запоминается (localStorage «ricca:lang», в try/catch): при следующем заходе с другого сайта или из закладки —
     сразу нужная версия. Переходы внутри сайта не перенаправляются.
   • Фото и видео: без контекстного меню «Сохранить» и перетаскивания (CSS дополняет: -webkit-touch-callout, user-drag). */
(() => {
  'use strict';
  const KEY = 'ricca:lang';
  const isCfg = /configurator/.test(location.pathname) || !!document.querySelector('main.cfg');
  /* конструктор — одна страница на два адреса: язык по адресу (/en/configurator или ?lang=en) */
  const page = (document.documentElement.lang === 'en' || (isCfg && (/^\/en(\/|$)/.test(location.pathname) || /[?&]lang=en\b/.test(location.search)))) ? 'en' : 'ru';
  document.querySelectorAll('[data-lng]').forEach((a) => { if (a.dataset.lng === page) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const set = (v) => { try { localStorage.setItem(KEY, v); } catch (e) { /* приватный режим — без памяти */ } };

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

  /* память выбора: зашли извне на «чужой» язык — переводим на свой */
  const saved = get();
  let internal = false;
  try { internal = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) { internal = false; }
  if ((saved === 'ru' || saved === 'en') && saved !== page && !internal && !/[?&]lang=/.test(location.search)) {
    location.replace(target(saved, false));
    return;
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-lng], a.hdr__lang, a.menu__lang');
    if (!a) return;
    const l = a.dataset.lng || (a.getAttribute('hreflang') === 'en' ? 'en' : 'ru');
    set(l);
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
