/* ==========================================================================
   ELUNA — сцена, свет, скролл
   ========================================================================== */
(() => {
  'use strict';

  gsap.registerPlugin(ScrollTrigger);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const body = document.body;

  /* ------------------------------------------------------------------------
     Слои матраса (сверху вниз)
     ------------------------------------------------------------------------ */
  const LAYERS = [
    { key: 'cover',   cm: 1.5, num: '01', name: 'Стёганый чехол',        text: 'Органический хлопок с терморегулирующей нитью. Первый слой, который вы чувствуете — и единственный, который видите.', density: '320 г/м²', role: 'Микроклимат' },
    { key: 'latex',   cm: 3,   num: '02', name: 'Натуральный латекс',     text: 'Сок гевеи, вспененный по Dunlop. Перфорация в семи зонах пропускает воздух и мягко принимает плечи и бёдра.', density: '65 кг/м³', role: 'Комфорт' },
    { key: 'gel',     cm: 4,   num: '03', name: 'Memory-пена с гелем',    text: 'Запоминает контур тела за 4–6 секунд. Гелевые микрокапсулы отводят тепло к перфорированному латексу выше.', density: '50 кг/м³', role: 'Контур тела' },
    { key: 'coir',    cm: 3,   num: '04', name: 'Кокосовая койра',        text: 'Волокно, пропитанное латексом. Ортопедическая опора без ощущения доски — держит спину ровно, пока латекс держит плечи.', density: '110 кг/м³', role: 'Опора' },
    { key: 'hr',      cm: 4,   num: '05', name: 'Пена HR',                text: 'Высокоэластичная пена распределяет нагрузку между койрой и пружинами, чтобы ни одна точка не продавливалась первой.', density: '40 кг/м³', role: 'Распределение' },
    { key: 'springs', cm: 12,  num: '06', name: 'Независимые пружины',    text: '1 200 пружин в индивидуальных карманах, семь зон жёсткости. Каждая работает сама по себе — партнёр не почувствует, как вы повернулись.', density: '500 шт/м²', role: 'Независимость' },
    { key: 'base',    cm: 2.5, num: '07', name: 'Армированное основание', text: 'Плотная пена с усиленным периметром. Матрас не «сползает» к краям и держит форму все пятнадцать лет гарантии.', density: '35 кг/м³', role: 'Геометрия' },
  ];

  /* ------------------------------------------------------------------------
     Звёздное поле — одно на всю страницу, редкое и тихое
     ------------------------------------------------------------------------ */
  (function stars() {
    const canvas = document.getElementById('stars');
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, pts = [];

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / 9000);
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() < 0.08 ? 1.1 + Math.random() * 0.7 : 0.35 + Math.random() * 0.6,
        a: 0.25 + Math.random() * 0.55,
        ph: Math.random() * Math.PI * 2,
        tw: 0.3 + Math.random() * 0.9,
        cool: Math.random() < 0.35,
      }));
      draw(performance.now());
    }
    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        const k = 0.6 + 0.4 * Math.sin(now * 0.0006 * p.tw + p.ph);
        ctx.beginPath();
        ctx.fillStyle = p.cool ? `rgba(196,208,255,${p.a * k})` : `rgba(255,243,226,${p.a * k})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    let last = 0;
    function frame(now) {
      if (!document.hidden && now - last > 80) { draw(now); last = now; }
      requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    if (!reduceMotion) requestAnimationFrame(frame);
  })();

  /* ------------------------------------------------------------------------
     Состояние сцены. Интро (время) и скролл пишут в разные объекты,
     render() их сводит — так они никогда не спорят между собой.
     ------------------------------------------------------------------------ */
  const S = {              // скролл
    lx: 66, ly: 44, lr: 1, soft: 60,
    heroS: 1, heroY: 0, heroExp: 1,
    cutO: 0, cutExp: 1, cutS: 1.04, cutX: 0, cutY: 0, scan: 0,
    dark: 0, brand: 0, eclipse: 1,
    wmS: 1, wmY: 0, wmO: 1,
  };
  const I = {              // интро
    dark: 1, lr: 0, exp: 0, soft: 85, eclipse: 0, wmO: 1,
  };

  const stageEl = document.getElementById('stage');
  const wordmark = document.getElementById('wordmark');
  const exposure = document.getElementById('exposure');
  const eclipse = document.getElementById('eclipse');
  const productHero = document.getElementById('productHero');
  const productCut = document.getElementById('productCut');

  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

  let activeLayer = -1;
  const layerItems = Array.from(document.querySelectorAll('#layerList li'));
  const layerActiveEl = document.getElementById('layerActive');

  function setActiveLayer(i) {
    if (i === activeLayer) return;
    activeLayer = i;
    layerItems.forEach((li, k) => {
      li.classList.toggle('is-active', k === i);
      li.classList.toggle('is-done', k < i);
    });
    if (i >= 0) {
      layerActiveEl.querySelector('.num').textContent = LAYERS[i].num;
      layerActiveEl.querySelector('.name').textContent = layerItems[i].querySelector('.name').textContent;
    }
  }

  function render() {
    const vh = window.innerHeight;
    const diag = Math.hypot(window.innerWidth, vh);

    // свет на фото: радиус в px от диагонали, экспозиция — произведение интро и скролла
    root.style.setProperty('--lx', `${S.lx}%`);
    root.style.setProperty('--ly', `${S.ly}%`);
    root.style.setProperty('--lr', `${Math.max(0, I.lr * S.lr) * diag}px`);
    root.style.setProperty('--soft', `${Math.min(I.soft, S.soft)}%`);
    root.style.setProperty('--brand-o', `${S.brand}`);
    root.style.setProperty('--scan', `${S.scan}%`);
    exposure.style.opacity = Math.max(I.dark, S.dark);
    eclipse.style.opacity = I.eclipse * S.eclipse;

    productHero.style.setProperty('--exp', `${I.exp * S.heroExp}`);
    productHero.style.transform = `translate3d(0, ${S.heroY * vh / 100}px, 0) scale(${S.heroS})`;
    productHero.style.opacity = S.heroExp > 0.01 ? 1 : 0;

    productCut.style.opacity = S.cutO;
    productCut.style.setProperty('--exp', `${S.cutExp}`);
    productCut.style.transform = `translate3d(${S.cutX * window.innerWidth / 100}px, ${S.cutY * vh / 100}px, 0) scale(${S.cutS})`;

    // активный слой — по положению сканирующего луча
    if (S.cutO > 0.5 && S.scan > 2) {
      setActiveLayer(Math.min(LAYERS.length - 1, Math.floor((S.scan / 100) * 1.04 * LAYERS.length)));
    } else {
      setActiveLayer(-1);
    }

    wordmark.style.transform = `translate(-50%, calc(-50% + ${S.wmY}vh)) scale(${S.wmS})`;
    wordmark.style.opacity = S.wmO * I.wmO;
  }
  window.addEventListener('resize', render);

  /* ------------------------------------------------------------------------
     Интро: темнота → пятно света → силуэт → фактура → имя
     ------------------------------------------------------------------------ */
  const letters = wordmark.querySelectorAll('span');
  const heroLines = document.querySelectorAll('#copyHero .line > span');
  const heroEyebrow = document.querySelector('#copyHero .eyebrow');
  const heroSub = document.querySelector('#copyHero .hero-sub');
  const cue = document.getElementById('cue');

  const intro = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.inOut' },
    onUpdate: render,
    onComplete: () => body.classList.remove('is-intro'),
  });

  intro
    // 0–1 с: темнота; затем проступает кольцо затмения и первое пятно света
    .to(I, { dark: 0.6, duration: 1.4 }, 0.8)
    .to(I, { eclipse: 0.7, duration: 2.2 }, 1.0)
    .to(I, { lr: 0.16, exp: 0.38, duration: 1.8, ease: 'power1.inOut' }, 1.2)
    // 2.6–4.6 с: силуэт — пятно растёт, экспозиция поднимается
    .to(I, { dark: 0.2, duration: 1.6 }, 2.4)
    .to(I, { lr: 0.42, exp: 0.72, soft: 70, duration: 2.0, ease: 'power1.inOut' }, 2.6)
    // 4.4–6.4 с: свет заливает весь продукт
    .to(I, { dark: 0, lr: 1.0, exp: 1, soft: 60, duration: 2.2, ease: 'power2.out' }, 4.4)
    .to(I, { eclipse: 1, duration: 1.6 }, 4.8)
    // 5.4 с+: имя и текст
    .to(letters, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.6, stagger: 0.09, ease: 'power3.out' }, 5.4)
    .to(heroEyebrow, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 6.1)
    .to(heroLines, { y: 0, duration: 1.3, stagger: 0.12, ease: 'power3.out' }, 6.2)
    .to(heroSub, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }, 6.7)
    .to(cue, { opacity: 1, duration: 1.2 }, 7.1);

  if (reduceMotion) {
    intro.progress(1);
    body.classList.remove('is-intro');
    render();
  } else {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const start = () => intro.play();
    const heroImg = productHero.querySelector('img');
    // не начинаем раскрытие, пока фото не загрузилось — иначе свет осветит пустоту
    if (heroImg.complete) start(); else { heroImg.addEventListener('load', start, { once: true }); heroImg.addEventListener('error', start, { once: true }); }
    // первый жест пользователя — ускоряем интро, не ломая его
    const hurry = () => {
      if (intro.progress() < 1) intro.timeScale(3.2);
      body.classList.add('is-scrolling');
      window.removeEventListener('wheel', hurry);
      window.removeEventListener('touchstart', hurry);
      window.removeEventListener('keydown', hurry);
    };
    window.addEventListener('wheel', hurry, { passive: true });
    window.addEventListener('touchstart', hurry, { passive: true });
    window.addEventListener('keydown', hurry);
  }

  /* ------------------------------------------------------------------------
     Скролл-сцена
     ------------------------------------------------------------------------ */
  const copyHero = document.getElementById('copyHero');
  const copyLayers = document.getElementById('copyLayers');
  const copyOutro = document.getElementById('copyOutro');

  const mm = gsap.matchMedia();

  function buildStage(isDesktop) {
    const D = isDesktop;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: render,
      scrollTrigger: {
        trigger: stageEl,
        start: 'top top',
        end: '+=560%',
        pin: true,
        scrub: 1.1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    tl
      /* 0–18: hero → свет смещается к центру, камера медленно наезжает, имя растворяется в nav */
      .to(S, { lx: 50, ly: 50, heroS: 1.06, heroY: -3, duration: 18 }, 0)
      .to(S, { wmS: 0.7, wmY: -18, wmO: 0, duration: 15, ease: 'power1.in' }, 0)
      .to(S, { brand: 1, duration: 8 }, 9)
      .to(S, { eclipse: 0.35, duration: 18 }, 0)
      .to(copyHero, { opacity: 0, y: -40, duration: 9 }, 2)
      .to(cue, { opacity: 0, duration: 5 }, 0)

      /* 18–30: фото уходит в темноту, вместо него проявляется разрез */
      .to(S, { heroExp: 0, heroS: 1.12, heroY: -8, duration: 11, ease: 'power1.in' }, 18)
      .to(S, { cutO: 1, cutS: 1.0, cutX: D ? 9 : 0, duration: 10 }, 22)
      .to(S, { eclipse: 0, duration: 8 }, 20)
      .to(copyLayers, { opacity: 1, duration: 8 }, 24)

      /* 30–78: луч сканирует разрез сверху вниз — слой за слоем */
      .to(S, { scan: 100, duration: 48 }, 30)
      .to(S, { cutY: D ? 2 : 0, duration: 48 }, 30)

      /* 78–90: финальное утверждение */
      .to(copyLayers, { opacity: 0, duration: 6 }, 78)
      .to(S, { cutExp: 0.45, cutS: 0.9, cutX: D ? 22 : 0, cutY: D ? 12 : -14, duration: 12 }, 78)
      .to(copyOutro, { opacity: 1, duration: 8 }, 83)

      /* 90–100: сцена гаснет — переход в манифест на том же тёмном */
      .to(S, { dark: 0.94, cutY: D ? 6 : -20, duration: 10, ease: 'power1.in' }, 90)
      .to(copyOutro, { opacity: 0, y: -30, duration: 8, ease: 'power1.in' }, 92);

    return tl;
  }

  mm.add('(min-width: 900px)', () => { buildStage(true); return () => {}; });
  mm.add('(max-width: 899px)', () => { buildStage(false); return () => {}; });

  /* ------------------------------------------------------------------------
     Появление по скроллу для остальных секций
     ------------------------------------------------------------------------ */
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.4, stagger: 0.1, ease: 'power3.out', overwrite: true }),
  });
  document.querySelectorAll('.manifesto__text').forEach((block) => {
    gsap.to(block.querySelectorAll('.reveal-line > span'), {
      y: 0, duration: 1.6, stagger: 0.14, ease: 'power3.out',
      scrollTrigger: { trigger: block, start: 'top 80%' },
    });
  });

  // плавный скролл по якорям (учитывает pin)
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      body.classList.remove('is-intro');
      intro.progress(1);
      const y = id === 'top' ? 0 : target.getBoundingClientRect().top + window.scrollY - 40;
      window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ------------------------------------------------------------------------
     Конструкция: интерактивный разрез
     ------------------------------------------------------------------------ */
  (function construction() {
    const cutaway = document.getElementById('cutaway');
    const detail = document.getElementById('layerDetail');
    if (!cutaway || !detail) return;

    const FIRMNESS = {
      soft:   { cm: { latex: 4, coir: 1.5, gel: 5 }, springs: '1 200 шт · 7 зон, мягкая проволока 1,8 мм' },
      medium: { cm: { latex: 3, coir: 3,   gel: 4 }, springs: '1 200 шт · 7 зон, проволока 2,0 мм' },
      firm:   { cm: { latex: 2, coir: 5,   gel: 3 }, springs: '1 200 шт · 7 зон, усиленная проволока 2,2 мм' },
    };
    let firmness = 'medium';
    let active = 0;

    const buttons = LAYERS.map((l, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `cut-layer cut-layer--${l.key}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.style.setProperty('--cm', l.cm);
      b.innerHTML = `<span class="cut-layer__fill"></span><span class="cut-layer__label"><span class="num">${l.num}</span><span class="name">${l.name}</span></span>`;
      b.addEventListener('click', () => select(i));
      b.addEventListener('mouseenter', () => select(i, true));
      cutaway.appendChild(b);
      return b;
    });
    buttons[0].classList.add('is-active');

    const fmtCm = (v) => String(v).replace('.', ',') + ' см';
    const currentCm = (i) => {
      const o = FIRMNESS[firmness].cm[LAYERS[i].key];
      return o != null ? o : LAYERS[i].cm;
    };

    function select(i, hover) {
      active = i;
      buttons.forEach((b, k) => {
        b.classList.toggle('is-active', k === i);
        b.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
      const l = LAYERS[i];
      gsap.killTweensOf(detail);
      gsap.fromTo(detail, { opacity: 0.35, x: 10 }, { opacity: 1, x: 0, duration: hover ? 0.5 : 0.7, ease: 'power3.out' });
      detail.querySelector('.layer-detail__num').textContent = l.num;
      detail.querySelector('.layer-detail__name').textContent = l.name;
      detail.querySelector('.layer-detail__text').textContent = l.key === 'springs' ? `${l.text} ${FIRMNESS[firmness].springs}.` : l.text;
      detail.querySelector('[data-k="thickness"]').textContent = fmtCm(currentCm(i));
      detail.querySelector('[data-k="density"]').textContent = l.density;
      detail.querySelector('[data-k="role"]').textContent = l.role;
    }

    document.querySelectorAll('[data-firmness]').forEach((btn) => {
      btn.addEventListener('click', () => {
        firmness = btn.dataset.firmness;
        document.querySelectorAll('[data-firmness]').forEach((b) => b.setAttribute('aria-checked', b === btn ? 'true' : 'false'));
        buttons.forEach((b, i) => gsap.to(b, { '--cm': currentCm(i), duration: 0.9, ease: 'power3.inOut' }));
        select(active);
      });
    });

    select(0);
  })();

  /* ------------------------------------------------------------------------
     Размеры
     ------------------------------------------------------------------------ */
  (function sizes() {
    const options = document.querySelectorAll('#sizeOptions button');
    const mat = document.getElementById('sizePreviewMat');
    const wEl = document.getElementById('sizePreviewW');
    const hEl = document.getElementById('sizePreviewH');
    const priceEl = document.getElementById('sizePrice');
    const monthlyEl = document.getElementById('sizeMonthly');
    const labelEl = document.getElementById('sizeLabel');
    const ctaLabel = document.getElementById('sizeCtaLabel');
    if (!options.length) return;

    const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
    const price = { v: 649000 };

    options.forEach((btn) => {
      btn.addEventListener('click', () => {
        options.forEach((b) => b.setAttribute('aria-checked', b === btn ? 'true' : 'false'));
        const w = +btn.dataset.w, h = +btn.dataset.h, p = +btn.dataset.price;
        const pct = (cm) => (cm / 200) * 70;   // 200 см = 70 % комнаты
        gsap.to(mat, { width: `${pct(w)}%`, height: `${pct(h)}%`, duration: 1.1, ease: 'power3.inOut' });
        wEl.textContent = w; hEl.textContent = h;
        labelEl.textContent = `${w} × ${h}`;
        ctaLabel.textContent = `${w} × ${h}`;
        gsap.to(price, {
          v: p, duration: 0.9, ease: 'power2.out',
          onUpdate: () => {
            priceEl.textContent = fmt(price.v);
            monthlyEl.textContent = fmt(price.v / 12);
          },
        });
      });
    });
  })();

  // пересчёт ScrollTrigger после загрузки шрифтов и картинок
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
  render();
})();
