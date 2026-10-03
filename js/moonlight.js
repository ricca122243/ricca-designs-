/* ==========================================================================
   ELUNA — Moonlight: лунный свет как реальный источник в сцене (WebGL)
   Фото матраса остаётся текстурой (albedo), рельеф стёжки — из карты
   нормалей, посчитанной по этому же фото. Шейдер добавляет к запечённому
   свету фотографии точечный холодный источник (луна), ограниченный блик,
   rim-свет и тёплую подсветку с противоположной стороны; экспозиция и
   раскрытие света из темноты тоже считаются здесь, а не слоями CSS.
   Без собственного цикла: один кадр на каждое изменение состояния.
   ========================================================================== */
(function () {
  'use strict';

  const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform sampler2D uNrm;
uniform vec2  uRes;        // размер canvas, px
uniform vec4  uCover;      // (scaleX, scaleY, posX, posY) — object-fit: cover + object-position
uniform vec3  uLight;      // позиция источника в координатах экрана (0..1, y вниз) + высота
uniform vec3  uLightColor;
uniform vec3  uFillColor;
uniform float uIntensity;
uniform float uExposure;
uniform vec2  uRevealC;
uniform float uReveal;     // масштаб раскрытия (как --ls у CSS-слоя)
uniform float uSpec;
uniform float uRim;
uniform float uNrmOn;
uniform vec3  uBg;

void main() {
  vec2 tuv = uCover.zw + (vUv - uCover.zw) * uCover.xy;
  vec3 albedo = texture2D(uTex, tuv).rgb;
  vec4 nr = texture2D(uNrm, tuv);
  vec3 n = normalize(mix(vec3(0.0, 0.0, 1.0), nr.xyz * 2.0 - 1.0, uNrmOn));
  float rough = mix(0.7, nr.a, uNrmOn);

  // изотропное пространство экрана (в долях высоты)
  float asp = uRes.x / uRes.y;
  vec2 p  = vec2(vUv.x * asp, vUv.y);
  vec2 lp = vec2(uLight.x * asp, uLight.y);
  vec3 L = vec3(lp - p, uLight.z);
  float dist = length(L);
  L /= dist;
  float atten = 1.0 / (1.0 + 1.6 * dist * dist);

  vec3 V = vec3(0.0, 0.0, 1.0);
  float ndl = clamp(dot(n, L), 0.0, 1.0);
  vec3 H = normalize(L + V);
  float ndh = clamp(dot(n, H), 0.0, 1.0);
  float shin = mix(80.0, 8.0, rough);
  float spec = pow(ndh, shin) * (1.0 - rough) * atten;
  spec = min(spec, 0.22) * uSpec;                  // ткань остаётся тканью
  float rim = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0) * 0.08 * uRim;
  vec3 fillDir = normalize(vec3(-(lp - p), 0.7));
  float fill = clamp(dot(n, fillDir), 0.0, 1.0) * 0.05;

  // фото уже несёт лунный свет — это база; добавляем умеренную перезасветку рельефа
  float lum = dot(albedo, vec3(0.2126, 0.7152, 0.0722));
  vec3 lit = albedo * (0.86 + 0.40 * ndl * atten * uIntensity);
  lit = mix(lit, lit * uLightColor, 0.28 * ndl * atten * uIntensity);
  lit += spec * uLightColor * uIntensity * (0.35 + 0.65 * lum);
  lit += rim * uLightColor + fill * uFillColor * lum;

  // экспозиция: кривая недодержки вместо чёрной плашки
  float e = clamp(uExposure, 0.0, 1.0);
  lit = pow(max(lit, 0.0), vec3(1.0 + 0.45 * (1.0 - e))) * e;

  // раскрытие света из темноты — диск в координатах экрана (в vmax)
  float vmax = max(uRes.x, uRes.y);
  float d = length((vUv - uRevealC) * uRes) / vmax;
  float r0 = 0.85 * uReveal, r1 = 1.33 * uReveal;
  float mask = 1.0 - smoothstep(r0, r1, d);

  // края кадра растворяются в космосе
  vec2 ed = abs(vUv - 0.5) * 2.0;
  float edge = (1.0 - smoothstep(0.5, 1.0, ed.y)) * (1.0 - smoothstep(0.44, 1.0, ed.x));
  edge = mix(0.0, 1.0, edge);
  gl_FragColor = vec4(mix(uBg, lit, mask * edge), 1.0);
}`;

  function compile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('Moonlight shader: ' + log);
    }
    return sh;
  }

  function isPow2(v) { return (v & (v - 1)) === 0; }

  function create(opts) {
    const canvas = opts.canvas, img = opts.img;
    if (!canvas || !img) return null;
    const attrs = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: !opts.force };
    let gl = canvas.getContext('webgl2', attrs);
    const isGL2 = !!gl;
    if (!gl) gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
    if (!gl) return null;

    const state = {
      lightX: 0.12, lightY: 0.18, lightZ: 0.38, intensity: 1,
      exposure: 0, reveal: 0.02, revealX: 0.12, revealY: 0.18,
      spec: 1, rim: 1,
      lightColor: [0.74, 0.81, 1.0], fillColor: [1.0, 0.93, 0.84], bg: [6 / 255, 7 / 255, 12 / 255],
    };
    let scale = opts.scale || 1, tier = opts.tier || 'high';
    const cover = { posX: 0.5, posY: 0.56, ...(opts.cover || {}) };
    const texAspect = opts.texAspect || (img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.79);
    let prog, loc = {}, texAlbedo, texNormal, nrmLoaded = false, lost = false, dead = false, raf = 0, dirty = true, lossCount = 0, lossTimer = 0;
    let readyResolve; const ready = new Promise((r) => { readyResolve = r; });

    function build() {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('Moonlight link: ' + gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      ['uTex', 'uNrm', 'uRes', 'uCover', 'uLight', 'uLightColor', 'uFillColor', 'uIntensity', 'uExposure', 'uRevealC', 'uReveal', 'uSpec', 'uRim', 'uNrmOn', 'uBg']
        .forEach((n) => { loc[n] = gl.getUniformLocation(prog, n); });
      gl.uniform1i(loc.uTex, 0);
      gl.uniform1i(loc.uNrm, 1);

      // albedo — уже декодированное фото
      texAlbedo = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texAlbedo);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      } catch (e) { return false; }
      const mip = isGL2 || (isPow2(img.naturalWidth) && isPow2(img.naturalHeight));
      if (mip) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
      else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

      // нормали: пока не загрузились — плоская нормаль 1×1
      texNormal = gl.createTexture();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texNormal);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 255, 180]));
      nrmLoaded = false;
      return true;
    }

    function loadNormal(src) {
      if (!src) return;
      const n = new Image();
      n.decoding = 'async';
      n.onload = () => {
        if (dead || lost) return;
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texNormal);
        try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, n); } catch (e) { return; }
        const mip = isGL2 || (isPow2(n.naturalWidth) && isPow2(n.naturalHeight));
        if (mip) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
        nrmLoaded = true;
        requestRender();
      };
      n.onerror = () => { nrmLoaded = false; };
      n.src = src;
    }

    function resize(w, h) {
      if (dead) return;
      const bw = Math.max(1, Math.round(w * scale)), bh = Math.max(1, Math.round(h * scale));
      if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
      dirty = true;
      requestRender();
    }

    function draw() {
      raf = 0;
      if (dead || lost || !prog) return;
      dirty = false;
      const w = canvas.width, h = canvas.height;
      gl.viewport(0, 0, w, h);
      // object-fit: cover
      const ca = w / h;
      let sx = 1, sy = 1;
      if (ca > texAspect) sy = texAspect / ca; else sx = ca / texAspect;
      gl.uniform2f(loc.uRes, w, h);
      gl.uniform4f(loc.uCover, sx, sy, cover.posX, cover.posY);
      gl.uniform3f(loc.uLight, state.lightX, state.lightY, state.lightZ);
      gl.uniform3fv(loc.uLightColor, state.lightColor);
      gl.uniform3fv(loc.uFillColor, state.fillColor);
      gl.uniform1f(loc.uIntensity, state.intensity);
      gl.uniform1f(loc.uExposure, state.exposure);
      gl.uniform2f(loc.uRevealC, state.revealX, state.revealY);
      gl.uniform1f(loc.uReveal, state.reveal);
      gl.uniform1f(loc.uSpec, state.spec);
      gl.uniform1f(loc.uRim, state.rim);
      gl.uniform1f(loc.uNrmOn, nrmLoaded ? 1 : 0);
      gl.uniform3fv(loc.uBg, state.bg);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function requestRender() {
      if (dead || raf) return;
      dirty = true;
      raf = requestAnimationFrame(draw);
    }

    function set(partial) {
      if (!partial) return;
      let changed = false;
      for (const k in partial) {
        if (state[k] !== partial[k]) { state[k] = partial[k]; changed = true; }
      }
      if (changed) requestRender();
    }

    function setTier(t) {
      tier = t;
      const spec = t === 'high' ? 1 : t === 'medium' ? 0.8 : 0.6;
      set({ spec, rim: t === 'high' ? 1 : 0 });
    }

    function destroy() {
      if (dead) return;
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      try { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) { /* ignore */ }
    }

    function readCenter() {
      draw();
      const px = new Uint8Array(4);
      gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return [px[0], px[1], px[2]];
    }

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      lost = true; lossCount++;
      if (lossCount > 1) { destroy(); if (opts.onFallback) opts.onFallback(); return; }
      lossTimer = setTimeout(() => { if (lost && !dead) { destroy(); if (opts.onFallback) opts.onFallback(); } }, 2500);
    });
    canvas.addEventListener('webglcontextrestored', () => {
      clearTimeout(lossTimer);
      if (dead) return;
      lost = false;
      try { if (build()) { loadNormal(opts.normalSrc); requestRender(); } else throw new Error('texture'); }
      catch (e) { destroy(); if (opts.onFallback) opts.onFallback(); }
    });

    try {
      if (!build()) return null;
    } catch (e) {
      return null;
    }
    loadNormal(opts.normalSrc);
    readyResolve();

    return { ready, set, requestRender, resize, setTier, destroy, readCenter, get tier() { return tier; }, get state() { return state; }, setScale(s) { scale = s; } };
  }

  window.Moonlight = { create };
})();
