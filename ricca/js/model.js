/* Страницы модели, проекта и HoReCa (tools/model-pages.mjs, tools/project-pages.mjs, horeca.html).
   Без JS всё видно: фото листаются, раскрывашки открываются, форма открывает WhatsApp. Скрипт добавляет:
   — счётчик фото в карусели первого экрана;
   — форму «Написать нам» → сообщение в WhatsApp с названием модели и адресом страницы;
   — раскрывашку «Написать нам» по ссылке #write;
   — «живые» кнопки: касание ставит .is-tap на 450 мс, чтобы короткое нажатие на телефоне успело показать движение (css/model.css). */
(() => {
  const gal = document.querySelector('[data-gal]'), out = document.querySelector('[data-gal-i]');
  if (gal && out) gal.addEventListener('scroll', () => { out.textContent = Math.round(gal.scrollLeft / Math.max(1, gal.firstElementChild.offsetWidth)) + 1; }, { passive: true });

  const f = document.querySelector('[data-wa-form]');
  if (f) f.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (n) => (f.elements[n] && f.elements[n].value.trim()) || '';
    const t = [`Здравствуйте! Интересует ${f.dataset.model}.`, v('note') && `Пожелания: ${v('note')}`, v('name') && `Имя: ${v('name')}`, v('city') && `Город: ${v('city')}`, location.href.split('#')[0]].filter(Boolean).join('\n');
    window.open(`https://wa.me/77079550808?text=${encodeURIComponent(t)}`, '_blank', 'noopener');
  });

  const ask = document.querySelector('.mp-ask details');
  const openAsk = () => { if (ask) ask.open = true; };
  document.querySelectorAll('a[href="#write"]').forEach((a) => a.addEventListener('click', openAsk));
  if (location.hash === '#write') openAsk();

  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('.mp-btn, .mp-link a, .mp-dl a, .mp-acc summary');
    if (!b) return;
    b.classList.add('is-tap');
    clearTimeout(b._tap);
    b._tap = setTimeout(() => b.classList.remove('is-tap'), 450);
  }, { passive: true });
})();
