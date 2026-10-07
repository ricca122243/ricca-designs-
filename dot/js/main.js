/* DOT therapy — все настройки сайта в одном месте. Поменяйте значения ниже — остальное подставится само. */

const CONFIG = {
  name: 'DOT therapy',
  masterName: 'Имя мастера',          // ← имя мастера
  experience: '5+',                    // ← лет практики
  city: 'Алматы',
  whatsapp: '77000000000',             // ← номер в формате 7XXXXXXXXXX, без «+» и пробелов
  phoneDisplay: '+7 700 000 00 00',    // ← как показывать телефон на сайте
  instagram: 'instagram',              // ← ник в Instagram без «@»
  address: 'Алматы, точный адрес — после записи',
  hours: 'Пн–Сб, 10:00–20:00, по записи',
};

/* Услуги. Цена — число в тенге или null («по запросу»). hero: true — флагман, выделяется тёмной карточкой. */
const SERVICES = [
  {
    title: 'Спина и шея',
    duration: '60 мин',
    desc: 'Точечная работа с зоной, где напряжение собирается чаще всего: лопатки, шея, плечи, поясница.',
    who: 'работа за столом, тяжёлая голова к вечеру, первый визит',
    price: 15000,
  },
  {
    title: 'DOT-терапия всего тела',
    duration: '90 мин',
    desc: 'Полная проработка: спина, шея, руки, ноги, стопы. Глубоко там, где нужно, и мягко там, где тело просит.',
    who: 'хроническая усталость, «тело не своё», хочется перезагрузки',
    price: 22000,
    hero: true,
    badge: 'Выбор клиенток',
  },
  {
    title: 'Лимфодренаж',
    duration: '60 мин',
    desc: 'Лёгкие ритмичные движения по току лимфы. Без боли и давления — уходит тяжесть и отёчность.',
    who: 'отёки, тяжесть в ногах, восстановление после родов',
    price: 15000,
  },
  {
    title: 'Расслабляющий с маслами',
    duration: '60 мин',
    desc: 'Тёплое масло, медленный ритм, никакой глубокой проработки. Сеанс, чтобы выдохнуть.',
    who: 'стресс, плохой сон, подарок себе',
    price: 14000,
  },
  {
    title: 'Мама после родов',
    duration: '75 мин',
    desc: 'Мягкая работа с поясницей, плечами и шеей, лимфодренаж ног. Только после разрешения врача.',
    who: 'от 6–8 недель после родов',
    price: 18000,
  },
  {
    title: 'Курс 5 сеансов',
    duration: '5 × 90 мин',
    desc: 'Пять сеансов всего тела раз в 5–7 дней. Тело «запоминает» новое состояние, эффект держится дольше.',
    who: 'когда одного сеанса мало',
    price: 95000,
    oldPrice: 110000,
    course: true,
  },
];

/* Отзывы. Оставьте пустым — секция не покажется. Пример: { text: 'Текст отзыва', name: 'Айгерим', meta: 'спина и шея' } */
const REVIEWS = [];

/* ================================================================ */

const fmt = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₸';
const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
const igLink = () => `https://instagram.com/${CONFIG.instagram}`;

function fillConfig() {
  document.querySelectorAll('.js-city').forEach((el) => (el.textContent = CONFIG.city));
  document.querySelectorAll('.js-master-name').forEach((el) => (el.textContent = CONFIG.masterName));
  document.querySelectorAll('.js-exp').forEach((el) => (el.textContent = CONFIG.experience));
  document.querySelectorAll('.js-address').forEach((el) => (el.textContent = CONFIG.address));
  document.querySelectorAll('.js-hours').forEach((el) => (el.textContent = CONFIG.hours));
  document.querySelectorAll('.js-tel').forEach((el) => { el.textContent = CONFIG.phoneDisplay; el.href = 'tel:+' + CONFIG.whatsapp; });
  document.querySelectorAll('.js-ig').forEach((el) => (el.href = igLink()));
  document.querySelectorAll('.js-ig-handle').forEach((el) => (el.textContent = '@' + CONFIG.instagram));
  document.querySelectorAll('.js-wa').forEach((el) => {
    el.href = waLink(el.dataset.text || 'Здравствуйте! Хочу записаться на сеанс.');
    el.target = '_blank';
    el.rel = 'noopener';
  });
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
}

function renderServices() {
  const root = document.getElementById('cards');
  if (!root) return;
  root.innerHTML = SERVICES.map((s) => {
    const cls = ['card', s.hero && 'card--hero', s.course && 'card--course'].filter(Boolean).join(' ');
    const price = s.price == null ? 'по запросу' : fmt(s.price);
    const old = s.oldPrice ? `<s class="card__old">${fmt(s.oldPrice)}</s>` : '';
    const text = `Здравствуйте! Хочу записаться: ${s.title} (${s.duration}).`;
    return `
      <article class="${cls} reveal">
        ${s.badge ? `<span class="card__badge">${s.badge}</span>` : ''}
        <div class="card__top"><h3>${s.title}</h3><span class="card__dur">${s.duration}</span></div>
        <p class="card__desc">${s.desc}</p>
        <p class="card__for"><b>Для кого:</b> ${s.who}</p>
        <div class="card__price">${price}${old}</div>
        <a class="btn ${s.hero ? 'btn--primary' : 'btn--ghost'} btn--small" href="${waLink(text)}" target="_blank" rel="noopener">Записаться</a>
      </article>`;
  }).join('');
}

function renderReviews() {
  const sec = document.getElementById('reviews');
  const grid = document.getElementById('reviewsGrid');
  if (!sec || !grid || !REVIEWS.length) return;
  grid.innerHTML = REVIEWS.map((r) => `
    <article class="review reveal">
      <p>«${r.text}»</p>
      <footer>${r.name}${r.meta ? ' · ' + r.meta : ''}</footer>
    </article>`).join('');
  sec.hidden = false;
}

function nav() {
  const header = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => burger.click()));
}

function reveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((el) => io.observe(el));
}

function video() {
  const v = document.getElementById('video');
  if (!v) return;
  /* играет только пока на экране — бережём батарею */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); });
    }, { threshold: 0.25 }).observe(v);
  }
  /* если в ролике есть звук — покажется кнопка включить */
  const btn = document.getElementById('videoSound');
  v.addEventListener('loadedmetadata', () => {
    const hasAudio = v.mozHasAudio || Boolean(v.webkitAudioDecodedByteCount) || (v.audioTracks && v.audioTracks.length > 0);
    if (hasAudio && btn) {
      btn.hidden = false;
      btn.textContent = '🔇';
      btn.addEventListener('click', () => { v.muted = !v.muted; btn.textContent = v.muted ? '🔇' : '🔊'; });
    }
  });
}

function sticky() {
  const bar = document.getElementById('sticky');
  const hero = document.querySelector('.hero');
  const contact = document.getElementById('contact');
  if (!bar || !hero || !contact || !('IntersectionObserver' in window)) return;
  let pastHero = false, atContact = false;
  const update = () => bar.classList.toggle('is-on', pastHero && !atContact);
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; update(); }, { threshold: 0.15 }).observe(hero);
  new IntersectionObserver(([e]) => { atContact = e.isIntersecting; update(); }, { threshold: 0.2 }).observe(contact);
}

document.addEventListener('DOMContentLoaded', () => {
  fillConfig();
  renderServices();
  renderReviews();
  nav();
  video();
  sticky();
  reveal();
});
