/* Страница модели (tools/model-pages.mjs): счётчик фото в карусели и форма «Написать нам» → сообщение в WhatsApp. Без JS всё видно и форма открывает WhatsApp с названием модели */
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
})();
