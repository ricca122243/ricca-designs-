/* ==========================================================================
   ELUNA — MoonGL: луна как шар с картой поверхности (WebGL, один квадрат)
   Для каждого пикселя считается пересечение луча со сферой, нормаль,
   долгота/широта → выборка из равнопромежуточной карты (NASA LRO).
   Освещение — направленный источник: диффуз с мягким терминатором,
   пепельный свет, потемнение к лимбу. Вращение — сдвиг долготы, тень
   остаётся на месте относительно света. Цикл кадра живёт здесь и спит,
   когда сцена вне экрана или вкладка скрыта.
   ========================================================================== */
(function () {
  'use strict';

  const VERT = `
attribute vec2 aPos;
varying vec2 vP;
void main() { vP = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `
precision highp float;
varying vec2 vP;
uniform sampler2D uTex;
uniform float uPx;      // размер пикселя в единицах квадрата
uniform float uRot;     // долгота поворота, рад
uniform vec2  uTilt;    // наклон оси: x — вокруг X (вперёд/назад), y — вокруг Z (влево/вправо), рад
uniform vec3  uLight;   // направление на источник (нормированное), z к зрителю
uniform float uExp;     // экспозиция 0..1
const float PI = 3.14159265;
const float R = 0.985;

mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0,  0.0, c, -s,  0.0, s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, s,  0.0, 1.0, 0.0,  -s, 0.0, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, -s, 0.0,  s, c, 0.0,  0.0, 0.0, 1.0); }

void main() {
  float d = length(vP);
  float edge = 1.0 - smoothstep(R - uPx * 1.5, R + uPx * 0.5, d);
  if (edge <= 0.0) { gl_FragColor = vec4(0.0); return; }
  float dd = min(d, R - 1e-4);
  vec3 n = vec3(vP.x, vP.y, sqrt(max(0.0, R * R - dd * dd)) ) / R;   // нормаль в системе зрителя

  // поворот в систему шара: наклон вида → наклон оси → вращение по долготе
  vec3 m = rotY(uRot) * rotX(uTilt.x) * rotZ(uTilt.y) * n;
  float lon = atan(m.x, m.z);
  float lat = asin(clamp(m.y, -1.0, 1.0));
  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
  vec3 albedo = texture2D(uTex, uv).rgb;

  // чуть холоднее и спокойнее: десатурация и мягкая кривая
  float lum = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
  albedo = mix(vec3(lum), albedo, 0.25) * vec3(0.96, 0.98, 1.04);
  albedo = pow(albedo, vec3(0.88));
  albedo = (albedo - 0.5) * 1.08 + 0.5;

  // освещение: мягкий терминатор, пепельный свет, лимб
  float ndl = dot(n, normalize(uLight));
  float day = smoothstep(-0.06, 0.16, ndl);
  float limb = 0.82 + 0.18 * n.z;
  vec3 col = albedo * (day * 1.0 * limb + 0.035 * (1.0 - day));
  col *= uExp;
  gl_FragColor = vec4(col * edge, edge);   // premultiplied alpha
}`;

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(sh); gl.deleteShader(sh); throw new Error('MoonGL: ' + log); }
    return sh;
  }

  function create(opts) {
    const canvas = opts.canvas;
    if (!canvas) return null;
    const attrs = { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: !opts.force };
    const gl = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs);
    if (!gl) return null;

    const state = { rot: 0, tiltX: 0.12, tiltY: -0.08, light: [-0.55, 0.3, 0.78], exp: 1 };
    let prog, loc = {}, tex, ready = false, dead = false, raf = 0, asleep = false, draws = 0, dirty = true, lastT = 0, lastDraw = 0;
    let minStep = opts.tier === 'high' ? 0 : 33;   // 60 или 30 кадров/с
    let spin = 0;                                   // рад/с — непрерывное вращение, 0 пока идёт интро

    try {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT), fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('MoonGL link: ' + gl.getProgramInfoLog(prog));
    } catch (e) { return null; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    ['uTex', 'uPx', 'uRot', 'uTilt', 'uLight', 'uExp'].forEach((n) => { loc[n] = gl.getUniformLocation(prog, n); });
    gl.uniform1i(loc.uTex, 0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    // карта поверхности грузится асинхронно; до неё ничего не рисуем
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (dead) return;
      tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);         // долгота замыкается (ширина — степень двойки)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // без мип-карт: при диаметре 300–1000 px карта сэмплируется ≈ 1:1, а на шве долготы мипы давали тёмный пунктир
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      ready = true; dirty = true;
      if (opts.onReady) opts.onReady();
      loop();
    };
    img.onerror = () => { if (opts.onFallback) opts.onFallback(); };
    img.src = opts.src;

    function draw(now) {
      const w = canvas.width, h = canvas.height;
      gl.viewport(0, 0, w, h);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(loc.uPx, 2 / Math.min(w, h));
      gl.uniform1f(loc.uRot, state.rot);
      gl.uniform2f(loc.uTilt, state.tiltX, state.tiltY);
      gl.uniform3f(loc.uLight, state.light[0], state.light[1], state.light[2]);
      gl.uniform1f(loc.uExp, state.exp);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      draws++; dirty = false; lastDraw = now;
    }

    function frame(now) {
      raf = 0;
      if (dead || asleep || !ready || document.hidden) { lastT = 0; return; }
      const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0; lastT = now;
      if (spin) { state.rot += spin * dt; dirty = true; }
      if (dirty && now - lastDraw >= minStep) draw(now);
      if (spin || dirty) raf = requestAnimationFrame(frame);
    }
    function loop() { if (!raf && !dead && !asleep && ready) raf = requestAnimationFrame(frame); }

    return {
      get ready() { return ready; },
      get draws() { return draws; },
      get state() { return state; },
      set(p) { let ch = false; for (const k in p) { if (state[k] !== p[k]) { state[k] = p[k]; ch = true; } } if (ch) { dirty = true; loop(); } },
      setSpin(v) { spin = v; loop(); },
      setTier(t) { minStep = t === 'high' ? 0 : 33; },
      resize(w, h) { const bw = Math.max(2, Math.round(w)), bh = Math.max(2, Math.round(h)); if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; } dirty = true; loop(); },
      sleep() { asleep = true; if (raf) { cancelAnimationFrame(raf); raf = 0; } lastT = 0; },
      wake() { if (!asleep) return; asleep = false; dirty = true; loop(); },
      destroy() { dead = true; if (raf) cancelAnimationFrame(raf); try { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) { /* ignore */ } },
    };
  }

  window.MoonGL = { create };
})();
