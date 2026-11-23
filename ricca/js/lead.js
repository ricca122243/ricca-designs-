/* RICCA DESIGNS — заявка за 10 секунд с любой страницы (23 ноября).
   Где: главная и /en (#lead), страницы моделей, проекта и HoReCa (#write), конструктор (шаг «Итог»).
   Разметка: <div data-lead [data-lead-interest="sofa|bed|other"] [data-lead-cfg]></div> — форму строит этот файл.
   Отправка: 1) POST /api/lead → Netlify Function → Telegram (netlify/functions/lead.mjs);
             2) та же заявка в Netlify Forms (форма «lead», резерв). Удалась хотя бы одна — показываем «Спасибо».
   Спам: поле-ловушка bot-field (скрыто, человек не заполняет), капчи нет.
   Перевод: строки через window.RICCA_T (js/lang-en.js), как в site.js. Русская страница словарь не подключает.
   Кнопка WhatsApp справа внизу: на главной её ставит js/site.js, на остальных страницах — этот файл (.lead-fab). */
(() => {
  'use strict';
  const EN = window.RICCA_LANG === 'en' || document.documentElement.lang === 'en';
  const T = window.RICCA_T || {};
  const tr = (s) => (EN && T[s]) || s;
  const WA = '77079550808';
  const waUrl = (t) => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const WA_ICO = '<svg class="lead-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z"/><path d="M9.3 8.6c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.5l-.5.6c-.1.1-.2.3 0 .5a6 6 0 0 0 2.8 2.6c.2.1.4.1.5 0l.7-.8c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.3 0 .3 0 .9-.3 1.3-.3.4-1.1.9-1.6.9-.6 0-1.6-.1-3.5-1.3a9 9 0 0 1-3.2-3.6c-.6-1-.6-1.8-.6-2.1 0-.5.3-1 .5-1.3Z"/></svg>';

  /* ---------- название страницы: для текста WhatsApp и для строки «Страница» в заявке ---------- */
  const pageName = () => {
    const el = document.querySelector('[data-page-name]');
    if (el) return tr(el.getAttribute('data-page-name'));
    const h = document.querySelector('h1');
    return (h && h.textContent.replace(/\s+/g, ' ').trim()) || document.title.split(' — ')[0];
  };
  const lower = (s) => (/^[А-ЯЁ][а-яё]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);   // «Диван Venra» → «…Интересует диван Venra.»
  const waHello = () => `${tr('Здравствуйте! Интересует')} ${lower(pageName())}.`;

  /* ---------- UTM-метки: запоминаем на время визита, чтобы они дошли со страницы входа до страницы с формой ---------- */
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const utm = (() => {
    const q = new URLSearchParams(location.search), now = {};
    UTM_KEYS.forEach((k) => { const v = q.get(k); if (v) now[k] = v.slice(0, 120); });
    try {
      if (Object.keys(now).length) { sessionStorage.setItem('ricca:utm', JSON.stringify(now)); return now; }
      return JSON.parse(sessionStorage.getItem('ricca:utm') || '{}') || {};
    } catch (e) { return now; }   // приватный режим — только метки этой страницы
  })();

  /* ---------- телефон: маска +7 (___) ___-__-__ ---------- */
  const digitsOf = (v) => {
    let d = String(v).replace(/^\s*\+7/, '').replace(/\D/g, '');   // «+7» маски в номер не входит
    if (d.length > 10 && /^[78]/.test(d)) d = d.slice(1);           // вставили номер целиком: 8 707… или 7 707…
    return d.slice(0, 10);
  };
  const fmtPhone = (d) => {
    let s = '+7';
    if (d.length) s += ` (${d.slice(0, 3)}`;
    if (d.length >= 3) s += `) ${d.slice(3, 6)}`;
    if (d.length >= 6) s += `-${d.slice(6, 8)}`;
    if (d.length >= 8) s += `-${d.slice(8, 10)}`;
    return s;
  };
  function maskPhone(inp) {
    let prev = '';
    inp.addEventListener('focus', () => { if (!inp.value) inp.value = '+7 ('; });
    inp.addEventListener('blur', () => { if (!digitsOf(inp.value)) inp.value = ''; });
    inp.addEventListener('input', (e) => {
      let d = digitsOf(inp.value);
      if (!prev.length && d === '8') d = '';   // первой набрали 8 (по привычке «8 707…») — это не цифра номера
      /* стёрли скобку или дефис — цифр столько же; убираем последнюю цифру, иначе маска вернёт знак и курсор «застрянет» */
      if (e.inputType === 'deleteContentBackward' && d.length === prev.length && d.length) d = d.slice(0, -1);
      prev = d; inp.value = d.length ? fmtPhone(d) : '+7 (';
    });
  }

  /* ---------- форма ---------- */
  const CFG_TEXT = () => {   // конструктор: текст выбранного варианта — тот же, что уходит в WhatsApp (кнопка #wa-send, её ведёт js/cfg/app.js)
    const a = document.querySelector('#wa-send');
    try { return (a && new URL(a.href).searchParams.get('text')) || ''; } catch (e) { return ''; }
  };
  let uid = 0;
  function mount(host) {
    const n = ++uid, preset = host.dataset.leadInterest || '';
    const opt = (v, label) => `<label class="lead__chip"><input type="radio" name="interest" value="${v}"${preset === v ? ' checked' : ''} required><span>${esc(tr(label))}</span></label>`;
    host.classList.add('lead');
    host.innerHTML = `
<form class="lead__form" name="lead" method="post" action="/" novalidate>
  <input type="hidden" name="form-name" value="lead">
  <p class="lead__hp" aria-hidden="true"><label>${esc(tr('Не заполняйте это поле'))} <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
  <div class="lead__row">
    <label class="lead__f" for="lead-name-${n}"><span>${esc(tr('Имя'))}</span><input id="lead-name-${n}" name="name" autocomplete="name" maxlength="80" required><em class="lead__msg" id="lead-name-e-${n}" hidden></em></label>
    <label class="lead__f" for="lead-phone-${n}"><span>${esc(tr('Телефон'))}</span><input id="lead-phone-${n}" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" maxlength="18" required><em class="lead__msg" id="lead-phone-e-${n}" hidden></em></label>
  </div>
  <fieldset class="lead__int"><legend>${esc(tr('Что интересует'))}</legend><div class="lead__chips">${opt('sofa', 'Диван')}${opt('bed', 'Кровать')}${opt('other', 'Другое')}</div><em class="lead__msg" data-int-e hidden></em></fieldset>
  <details class="lead__more"><summary>${esc(tr('Добавить комментарий'))}</summary><label class="lead__f" for="lead-note-${n}"><span>${esc(tr('Комментарий'))}</span><textarea id="lead-note-${n}" name="comment" rows="3" maxlength="600"></textarea></label></details>
  <p class="lead__err" role="alert" hidden></p>
  <div class="lead__send"><button class="lead__btn" type="submit">${esc(tr('Отправить заявку'))}</button>
  <p class="lead__fine">${esc(tr('Отправляя заявку, вы даёте согласие на обработку'))} <a href="/privacy.html">${esc(tr('персональных данных'))}</a>.</p></div>
</form>
<div class="lead__ok" tabindex="-1" hidden><p class="lead__ok-t">${esc(tr('Спасибо! Перезвоним в течение 15 минут в рабочее время.'))}</p><a class="lead__btn lead__btn--line" href="${esc(waUrl(waHello()))}" target="_blank" rel="noopener">${WA_ICO}${esc(tr('Написать в WhatsApp'))}</a></div>`;

    const form = host.querySelector('form'), ok = host.querySelector('.lead__ok'), err = host.querySelector('.lead__err'), btn = host.querySelector('button[type="submit"]');
    const f = form.elements; maskPhone(f.phone);
    const mark = (inp, box, text) => { inp.setAttribute('aria-invalid', text ? 'true' : 'false'); box.textContent = text || ''; box.hidden = !text; if (text) inp.setAttribute('aria-describedby', box.id); else inp.removeAttribute('aria-describedby'); };
    const check = () => {
      const eName = f.name.value.trim() ? '' : tr('Укажите имя');
      const ePhone = digitsOf(f.phone.value).length === 10 ? '' : tr('Введите номер полностью');
      const eInt = f.interest.value ? '' : tr('Выберите вариант');
      mark(f.name, host.querySelector(`#lead-name-e-${n}`), eName); mark(f.phone, host.querySelector(`#lead-phone-e-${n}`), ePhone);
      const ib = host.querySelector('[data-int-e]'); ib.textContent = eInt; ib.hidden = !eInt;
      const bad = eName ? f.name : ePhone ? f.phone : eInt ? form.querySelector('input[name="interest"]') : null;
      if (bad) bad.focus();
      return !bad;
    };
    /* исправили поле — подсказка об ошибке уходит сразу (имя, телефон — когда номер набран полностью, вариант — при выборе) */
    const clear = (e) => {
      const t = e.target;
      if (t.name === 'interest') { const ib = host.querySelector('[data-int-e]'); ib.hidden = true; return; }
      if (t.getAttribute('aria-invalid') !== 'true') return;
      if (t.name === 'phone' && digitsOf(t.value).length < 10) return;
      if (t.name === 'name' && !t.value.trim()) return;
      const box = t.id && host.querySelector(`#${t.id.replace(/-(\d+)$/, '-e-$1')}`);
      t.setAttribute('aria-invalid', 'false'); t.removeAttribute('aria-describedby'); if (box) box.hidden = true;
    };
    form.addEventListener('input', clear); form.addEventListener('change', clear);

    let busy = false;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (busy) return;
      err.hidden = true;
      if (!check()) return;
      const data = {
        name: f.name.value.trim(), phone: fmtPhone(digitsOf(f.phone.value)), interest: f.interest.value, comment: f.comment.value.trim(),
        page: location.href, title: pageName(), config: host.hasAttribute('data-lead-cfg') ? CFG_TEXT() : '', utm, lang: EN ? 'en' : 'ru', 'bot-field': f['bot-field'].value,
      };
      busy = true; btn.disabled = true; btn.textContent = tr('Отправляем…');
      const labels = { sofa: 'Диван', bed: 'Кровать', other: 'Другое' };
      const flat = new URLSearchParams({ 'form-name': 'lead', 'bot-field': data['bot-field'], name: data.name, phone: data.phone, interest: labels[data.interest], comment: data.comment, page: data.page, title: data.title, config: data.config, utm: UTM_KEYS.filter((k) => utm[k]).map((k) => `${k.slice(4)}=${utm[k]}`).join(', '), lang: data.lang });
      const sent = await Promise.allSettled([
        fetch('/api/lead', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) throw new Error('lead'); }),
        fetch('/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: flat.toString() }).then((r) => { if (!r.ok) throw new Error('forms'); }),
      ]);
      busy = false; btn.disabled = false; btn.textContent = tr('Отправить заявку');
      if (sent.some((s) => s.status === 'fulfilled')) {
        form.hidden = true; ok.hidden = false; ok.focus({ preventScroll: true });
        const r = ok.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight) ok.scrollIntoView({ block: 'center' });
        return;
      }
      /* не ушло никуда (нет сети, сервис недоступен): заявку не теряем — предлагаем WhatsApp с уже заполненным текстом */
      const text = [waHello(), `${tr('Имя')}: ${data.name}`, `${tr('Телефон')}: ${data.phone}`, data.comment].filter(Boolean).join('\n');
      err.innerHTML = `${esc(tr('Не удалось отправить.'))} <a href="${esc(waUrl(text))}" target="_blank" rel="noopener">${esc(tr('Напишите нам в WhatsApp'))}</a>${esc(tr(' — данные уже в сообщении.'))}`;
      err.hidden = false;
    });
  }
  document.querySelectorAll('[data-lead]').forEach(mount);

  /* ---------- кнопка WhatsApp справа внизу — на страницах, где её не ставит js/site.js ---------- */
  if (!document.querySelector('script[src*="js/site.js"]')) {
    const fab = document.createElement('a');
    fab.className = 'lead-fab'; fab.href = waUrl(waHello()); fab.target = '_blank'; fab.rel = 'noopener';
    fab.setAttribute('aria-label', tr('Написать в WhatsApp')); fab.innerHTML = WA_ICO;
    if (document.querySelector('#bar-wa')) fab.classList.add('lead-fab--cfg');   // конструктор: на телефоне внизу своя панель с «В WhatsApp»
    document.body.appendChild(fab);
    /* не закрываем собой форму: пока она на экране или открыта клавиатура — кнопка уходит */
    const hide = new Set();
    const sync = () => fab.classList.toggle('is-off', hide.size > 0);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { es.forEach((x) => (x.isIntersecting ? hide.add(x.target) : hide.delete(x.target))); sync(); }, { threshold: 0.15 });
      document.querySelectorAll('.lead').forEach((el) => io.observe(el));
    }
    document.addEventListener('focusin', (e) => { if (e.target.matches('input, textarea, select')) { hide.add('kbd'); sync(); } });
    document.addEventListener('focusout', () => { hide.delete('kbd'); sync(); });
  }
})();
