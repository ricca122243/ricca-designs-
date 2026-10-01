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
     Слои матраса (сверху вниз). Толщина в сантиметрах → px (×3.6)
     ------------------------------------------------------------------------ */
  const PX_PER_CM = 3.6;
  const LAYERS = [
    { key: 'cover',   cm: 1.5,  num: '01', name: 'Стёганый чехол',          text: 'Органический хлопок с терморегулирующей нитью. Первый слой, который вы чувствуете — и единственный, который видите.', density: '320 г/м²', role: 'Микроклимат' },
    { key: 'latex',   cm: 3,    num: '02', name: 'Натуральный латекс',       text: 'Сок гевеи, вспененный по Dunlop. Перфорация в семи зонах пропускает воздух и мягко принимает плечи и бёдра.', density: '65 кг/м³', role: 'Комфорт' },
    { key: 'gel',     cm: 4,    num: '03', name: 'Memory-пена с гелем',      text: 'Запоминает контур тела за 4–6 секунд. Гелевые микрокапсулы отводят тепло к перфорированному латексу выше.', density: '50 кг/м³', role: 'Контур тела' },
    { key: 'coir',    cm: 3,    num: '04', name: 'Кокосовая койра',          text: 'Волокно, пропитанное латексом. Ортопедическая опора без ощущения доски — держит спину ровно, пока латекс держит плечи.', density: '110 кг/м³', role: 'Опора' },
    { key: 'hr',      cm: 4,    num: '05', name: 'Пена HR',                  text: 'Высокоэластичная пена распределяет нагрузку между койрой и пружинами, чтобы ни одна точка не продавливалась первой.', density: '40 кг/м³', role: 'Распределение' },
    { key: 'springs', cm: 12,   num: '06', name: 'Независимые пружины',      text: '1 200 пружин в индивидуальных карманах, семь зон жёсткости. Каждая работает сама по себе — партнёр не почувствует, как вы повернулись.', density: '500 шт/м²', role: 'Независимость' },
    { key: 'base',    cm: 2.5,  num: '07', name: 'Армированное основание',   text: 'Плотная пена с усиленным периметром. Матрас не «сползает» к краям и держит форму все пятнадцать лет гарантии.', density: '35 кг/м³', role: 'Геометрия' },
  ];
  const H_TOTAL = LAYERS.reduce((s, l) => s + l.cm * PX_PER_CM, 0);

  /* ------------------------------------------------------------------------
     Собираем 3D-объект
     ------------------------------------------------------------------------ */
  const mattress = document.getElementById('mattress');
  const slabs = [];
  {
    const frag = document.createDocumentFragment();
    LAYERS.forEach((l, i) => {
      const slab = document.createElement('div');
      slab.className = `slab l-${l.key}`;
      slab.style.setProperty('--h', `${l.cm * PX_PER_CM}px`);
      ['top', 'front', 'back', 'left', 'right'].forEach((f) => {
        const face = document.createElement('div');
        face.className = `face f-${f}${f === 'top' && i === 0 ? ' has-sweep' : ''}`;
        if (f !== 'top') {
          const skin = document.createElement('span');
          skin.className = 'skin';
          face.appendChild(skin);
        }
        slab.appendChild(face);
      });
      frag.appendChild(slab);
      slabs.push(slab);
    });
    mattress.appendChild(frag);
  }

  // базовые z-координаты центров слоёв (без раздвижения)
  const baseZ = [];
  {
    let z = H_TOTAL / 2;
    LAYERS.forEach((l) => {
      const h = l.cm * PX_PER_CM;
      baseZ.push(z - h / 2);
      z -= h;
    });
  }

  /* ------------------------------------------------------------------------
     Состояние сцены. Интро (время) и скролл пишут в разные объекты,
     render() их сводит — так они никогда не спорят между собой.
     ------------------------------------------------------------------------ */
  const S = {              // скролл
    lx: 78, ly: 30, lr: 520, shade: 0.9,
    rx: 76, rz: -7, sc: 1, tx: 9, ty: 0,
    explode: 0, dark: 0, beam: 1, brand: 0,
    wmS: 1, wmY: 0, wmO: 1,
  };
  const I = {              // интро
    dark: 1, beam: 0, shadeAdd: 0.1, lrMul: 0.35, sweep: -60, wmO: 1,
  };

  const world = document.getElementById('world');
  const wordmark = document.getElementById('wordmark');
  const exposure = document.getElementById('exposure');
  const stageEl = document.getElementById('stage');
  const beamEl = stageEl.querySelector('.beam');

  const EXPLODE_GAP = 46;
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

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
    const vw = window.innerWidth, vh = window.innerHeight;

    // свет
    root.style.setProperty('--lx', `${S.lx}%`);
    root.style.setProperty('--ly', `${S.ly}%`);
    root.style.setProperty('--lr', `${S.lr * I.lrMul}px`);
    root.style.setProperty('--shade', `${Math.min(1, S.shade + I.shadeAdd)}`);
    root.style.setProperty('--sweep', `${I.sweep}%`);
    root.style.setProperty('--beam-x', `${(S.lx - 50) * vw * 0.006}px`);
    root.style.setProperty('--beam-o', `${I.beam * S.beam}`);
    root.style.setProperty('--skin', `${1 - smooth(S.explode / 0.22)}`);
    root.style.setProperty('--brand-o', `${S.brand}`);
    exposure.style.opacity = Math.max(I.dark, S.dark);

    // объект
    const scale = S.sc * stageScale;
    world.style.transform =
      `translate3d(${S.tx * vw / 100}px, ${S.ty * vh / 100}px, 0) scale(${scale}) rotateX(${S.rx}deg) rotateZ(${S.rz}deg)`;

    // раздвижение слоёв: границы раскрываются сверху вниз
    const gaps = [];
    let total = 0;
    for (let j = 0; j < LAYERS.length - 1; j++) {
      const p = smooth((S.explode - j * 0.11) / 0.42);
      gaps.push(EXPLODE_GAP * p);
      total += gaps[j];
    }
    let below = total;
    for (let i = 0; i < LAYERS.length; i++) {
      slabs[i].style.setProperty('--z', `${baseZ[i] + below - total / 2}px`);
      if (i < gaps.length) below -= gaps[i];
    }
    if (S.explode > 0.02) {
      setActiveLayer(Math.min(LAYERS.length - 1, Math.floor(S.explode * 1.08 * LAYERS.length)));
    } else {
      setActiveLayer(-1);
    }

    // wordmark
    wordmark.style.transform = `translate(-50%, calc(-50% + ${S.wmY}vh)) scale(${S.wmS})`;
    wordmark.style.opacity = S.wmO * I.wmO;
  }

  /* ------------------------------------------------------------------------
     Масштаб сцены под вьюпорт
     ------------------------------------------------------------------------ */
  let stageScale = 1;
  function fitStage() {
    const vw = window.innerWidth, vh = window.innerHeight;
    stageScale = Math.min(1, vw / 1180, vh / 820);
    if (vw < 900) stageScale = Math.min(0.9, vw / 820);
    render();
  }
  fitStage();
  window.addEventListener('resize', fitStage);

  /* ------------------------------------------------------------------------
     Пыль в луче света
     ------------------------------------------------------------------------ */
  (function dust() {
    const canvas = document.getElementById('dust');
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, particles = [];

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / 14000);
      particles = Array.from({ length: n }, () => spawn(true));
    }
    function spawn(anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -10,
        r: 0.6 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 0.12,
        vy: 0.08 + Math.random() * 0.22,
        ph: Math.random() * Math.PI * 2,
        tw: 0.4 + Math.random() * 1.2,
      };
    }
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(50, now - last); last = now;
      const beam = I.beam * S.beam;
      ctx.clearRect(0, 0, w, h);
      if (beam > 0.01 && !document.hidden) {
        // ось луча: сверху от точки света, слегка наклонена
        const bx = w * (0.5 + (S.lx - 50) * 0.006) ;
        for (const p of particles) {
          p.x += p.vx * dt * 0.06 + Math.sin(now * 0.0004 + p.ph) * 0.05;
          p.y += p.vy * dt * 0.06;
          p.ph += dt * 0.001 * p.tw;
          if (p.y > h + 10 || p.x < -10 || p.x > w + 10) Object.assign(p, spawn(false));
          const axis = bx + (p.y / h) * (-w * 0.28);     // наклон ≈ -16°
          const halfWidth = 60 + (p.y / h) * w * 0.42;
          const d = Math.abs(p.x - axis) / halfWidth;
          if (d > 1) continue;
          const a = (1 - d * d) * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(p.ph))) * beam * (1 - p.y / h * 0.6);
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 243, 226, ${a * 0.7})`;
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    if (!reduceMotion) requestAnimationFrame(frame);
  })();

  /* ------------------------------------------------------------------------
     Интро: темнота → свет → силуэт → фактура → имя
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
    // 0–1.1 с: почти полная темнота, едва заметный луч
    .to(I, { beam: 0.35, duration: 1.6 }, 0.9)
    .to(I, { dark: 0.78, duration: 1.6 }, 1.0)
    // 2.2–4.2 с: проступает силуэт
    .to(I, { dark: 0.36, lrMul: 0.62, duration: 2.0, ease: 'power1.inOut' }, 2.2)
    .to(I, { beam: 0.7, duration: 2.2 }, 2.4)
    // 3.8–6 с: свет раскрывает фактуру, блик проходит по ткани
    .to(I, { dark: 0, shadeAdd: 0, lrMul: 1, duration: 2.4, ease: 'power2.out' }, 3.8)
    .to(I, { sweep: 180, duration: 2.6, ease: 'power1.inOut' }, 4.0)
    .to(I, { beam: 1, duration: 1.6 }, 4.6)
    // 5.4 с+: имя и текст
    .to(letters, {
      opacity: 1, filter: 'blur(0px)', y: 0,
      duration: 1.6, stagger: 0.09, ease: 'power3.out',
    }, 5.3)
    .to(heroEyebrow, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 6.0)
    .to(heroLines, { y: 0, duration: 1.3, stagger: 0.12, ease: 'power3.out' }, 6.1)
    .to(heroSub, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }, 6.6)
    .to(cue, { opacity: 1, duration: 1.2 }, 7.0);

  if (reduceMotion) {
    intro.progress(1);
    body.classList.remove('is-intro');
    render();
  } else {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    intro.play();
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
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: render,
      scrollTrigger: {
        trigger: stageEl,
        start: 'top top',
        end: '+=620%',
        pin: true,
        scrub: 1.1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    const D = isDesktop;
    gsap.set(S, { tx: D ? 9 : 0, rz: D ? -7 : -4 });
    render();

    tl
      /* 0–18: hero → свет уходит к центру, камера поднимается, имя растворяется и переходит в nav */
      .to(S, { lx: 44, ly: 36, rx: 63, rz: -9, sc: 0.92, tx: D ? 4 : 0, ty: 2, lr: 640, shade: 0.84, duration: 18 }, 0)
      .to(S, { wmS: 0.62, wmY: -26, wmO: 0, duration: 15, ease: 'power1.in' }, 0)
      .to(S, { brand: 1, duration: 8 }, 9)
      .to(copyHero, { opacity: 0, y: -40, duration: 9 }, 2)
      .to(cue, { opacity: 0, duration: 5 }, 0)

      /* 18–30: разворот в три четверти, объект уходит вправо, появляется заголовок анатомии */
      .to(S, { rx: 58, rz: -26, sc: D ? 0.8 : 0.74, tx: D ? 15 : 0, ty: D ? 0 : 6, lx: 56, ly: 40, lr: 980, shade: 0.66, duration: 12 }, 18)
      .to(copyLayers, { opacity: 1, duration: 8 }, 22)

      /* 30–78: раскрытие слоёв */
      .to(S, { explode: 1, duration: 48, ease: 'none' }, 30)
      .to(S, { rz: -32, rx: 56, lx: 46, ly: 44, shade: 0.5, duration: 48 }, 30)

      /* 78–90: сборка, объект уменьшается, финальное утверждение */
      .to(S, { explode: 0, duration: 10, ease: 'power2.inOut' }, 78)
      .to(S, { sc: D ? 0.6 : 0.5, tx: D ? 22 : 0, ty: D ? 10 : -12, rz: -14, rx: 60, lx: 50, ly: 34, lr: 700, shade: 0.7, duration: 12 }, 78)
      .to(copyLayers, { opacity: 0, duration: 6 }, 78)
      .to(copyOutro, { opacity: 1, duration: 8 }, 84)

      /* 90–100: сцена гаснет, продукт уходит вверх — переход в манифест на том же чёрном */
      .to(S, { dark: 0.92, ty: D ? -4 : -22, sc: D ? 0.52 : 0.44, beam: 0, duration: 10, ease: 'power1.in' }, 90)
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
      soft:   { label: 'Мягче',           cm: { latex: 4,   coir: 1.5, gel: 5 }, springs: '1 200 шт · 7 зон, мягкая проволока 1,8 мм' },
      medium: { label: 'Сбалансированная', cm: { latex: 3,   coir: 3,   gel: 4 }, springs: '1 200 шт · 7 зон, проволока 2,0 мм' },
      firm:   { label: 'Жёстче',          cm: { latex: 2,   coir: 5,   gel: 3 }, springs: '1 200 шт · 7 зон, усиленная проволока 2,2 мм' },
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

    function currentCm(i) {
      const l = LAYERS[i];
      const o = FIRMNESS[firmness].cm[l.key];
      return o != null ? o : l.cm;
    }

    function select(i, hover) {
      active = i;
      buttons.forEach((b, k) => {
        b.classList.toggle('is-active', k === i);
        b.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
      const l = LAYERS[i];
      const els = {
        num: detail.querySelector('.layer-detail__num'),
        name: detail.querySelector('.layer-detail__name'),
        text: detail.querySelector('.layer-detail__text'),
        thickness: detail.querySelector('[data-k="thickness"]'),
        density: detail.querySelector('[data-k="density"]'),
        role: detail.querySelector('[data-k="role"]'),
      };
      gsap.killTweensOf(detail);
      gsap.fromTo(detail, { opacity: 0.35, x: 10 }, { opacity: 1, x: 0, duration: hover ? 0.5 : 0.7, ease: 'power3.out' });
      els.num.textContent = l.num;
      els.name.textContent = l.name;
      els.text.textContent = l.key === 'springs' ? `${l.text} ${FIRMNESS[firmness].springs}.` : l.text;
      els.thickness.textContent = fmtCm(currentCm(i));
      els.density.textContent = l.density;
      els.role.textContent = l.role;
    }

    document.querySelectorAll('[data-firmness]').forEach((btn) => {
      btn.addEventListener('click', () => {
        firmness = btn.dataset.firmness;
        document.querySelectorAll('[data-firmness]').forEach((b) => b.setAttribute('aria-checked', b === btn ? 'true' : 'false'));
        buttons.forEach((b, i) => {
          gsap.to(b, { '--cm': currentCm(i), duration: 0.9, ease: 'power3.inOut' });
        });
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

  // пересчёт ScrollTrigger после загрузки шрифтов (меняется высота секций)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
