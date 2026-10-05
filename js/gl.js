/* ============================================================
   NIKE COLLAGE SHOWCASE — hand-written WebGL layers
   (fullscreen quads only, no 3D objects)

   #gl-bg : scroll-driven background. Dark palette at the top of
            the page, torn-paper WIPE to a light paper palette as
            you scroll down. Adds halftone print dots, film grain,
            collage color patches, cut strips and velocity smear.

   #gl-fx : transparent overlay — grain / dust / scratches
            (blended in CSS with mix-blend-mode:overlay)
   ============================================================ */
(function () {
  'use strict';

  // shared scroll state — written by js/main.js
  var S = (window.NIKE_SHOWTIME = window.NIKE_SHOWTIME || {
    scroll: 0,   // 0..1 page progress (smoothed)
    wipe: 0,     // 0..1 dark->light wipe
    vel: 0,      // smoothed scroll velocity (-1..1-ish)
    theme: 0     // 0 dark / 1 light
  });

  var VERT = [
    'attribute vec2 aPos;',
    'void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }'
  ].join('\n');

  /* ---------------------------------------------------------- */
  /*  BACKGROUND SHADER                                          */
  /* ---------------------------------------------------------- */
  var FRAG_BG = [
    'precision highp float;',
    'uniform vec2 uRes;',
    'uniform float uTime, uScroll, uWipe, uVel;',

    'float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));',
    '  float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  for(int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; }',
    '  return v;',
    '}',

    // rotated halftone cell distance
    'float halftone(vec2 uv, float scale, float ang){',
    '  float s = sin(ang), c = cos(ang);',
    '  vec2 p = mat2(c, -s, s, c) * uv * scale;',
    '  return length(fract(p) - 0.5);',
    '}',

    // ---- DARK palette : ink black, light shaft, faint volt / hot glows
    'vec3 darkPalette(vec2 uv){',
    '  vec3 col = mix(vec3(0.030, 0.030, 0.033), vec3(0.062, 0.062, 0.068), clamp(uv.y * 0.8 + 0.1, 0.0, 1.0));',
    '  float shaft = smoothstep(0.75, 0.0, abs(uv.x - uv.y * 0.42 - 0.30));',
    '  col += vec3(0.10, 0.10, 0.11) * shaft * 0.35;',
    '  float g1 = exp(-3.2 * length((uv - vec2(0.16, 0.86)) * vec2(1.0, 1.3)));',
    '  float g2 = exp(-3.6 * length((uv - vec2(0.86, 0.22)) * vec2(1.0, 1.1)));',
    '  col += vec3(0.45, 0.62, 0.10) * g1 * 0.14;',
    '  col += vec3(0.85, 0.20, 0.10) * g2 * 0.10;',
    '  return col;',
    '}',

    // ---- LIGHT palette : warm paper, fibers, collage patches
    'vec3 lightPalette(vec2 uv){',
    '  vec3 col = vec3(0.957, 0.945, 0.914);',
    '  float fiber = fbm(uv * vec2(5.0, 160.0)) * 0.5 + fbm(uv * 34.0) * 0.5;',
    '  col -= (fiber - 0.5) * 0.075;',
    '  float p1 = smoothstep(0.52, 0.0, length((uv - vec2(0.84, 0.76)) * vec2(1.15, 1.0)));',
    '  float p2 = smoothstep(0.46, 0.0, length((uv - vec2(0.12, 0.24)) * vec2(1.0, 1.15)));',
    '  float p3 = smoothstep(0.40, 0.0, length((uv - vec2(0.55, 0.03)) * vec2(1.0, 1.4)));',
    '  col = mix(col, vec3(0.895, 0.940, 0.610), p1 * 0.36);',
    '  col = mix(col, vec3(1.000, 0.660, 0.560), p2 * 0.30);',
    '  col = mix(col, vec3(0.640, 0.720, 1.000), p3 * 0.20);',
    '  return col;',
    '}',

    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float aspect = uRes.x / uRes.y;',
    '  vec2 suv = uv;',
    '  suv.x = (uv.x - 0.5) * aspect + 0.5;',

    // scroll velocity : horizontal smear bands
    '  vec2 duv = suv;',
    '  duv.x += uVel * 0.055 * sin(suv.y * 26.0 + uTime * 0.6);',
    '  duv.y += uVel * 0.012;',

    // ---- torn-paper wipe edge (light rises from the bottom)
    '  float edge = mix(-0.18, 1.20, uWipe);',
    '  float tear = edge',
    '    + 0.055 * (noise(vec2(uv.x * 6.5, 11.3)) - 0.5) * 2.0',
    '    + 0.018 * sin(uv.x * 47.0 + 2.1)',
    '    + 0.008 * sin(uv.x * 173.0);',
    '  float m = smoothstep(tear + 0.004, tear - 0.004, uv.y);', // 1 = light

    '  vec3 col = mix(darkPalette(duv), lightPalette(duv), m);',

    // ---- collage cut strips : slightly tinted horizontal bands
    '  float band = floor(suv.y * 7.0 + 0.6 * fbm(suv * 2.2));',
    '  float bt = hash21(vec2(band, 3.0));',
    '  col *= 1.0 + (bt - 0.5) * 0.055;',

    // ---- halftone print dots (grow as the page lightens)
    '  float hAng = 0.35 + uScroll * 0.8;',
    '  float scale = mix(90.0, 52.0, m);',
    '  float cell = halftone(suv, scale, hAng);',
    '  float dotR = mix(0.10, 0.24, m) + 0.05 * fbm(suv * 3.0 + uScroll);',
    '  float dot = smoothstep(dotR, dotR - 0.10, cell);',
    '  float dotVis = mix(0.16, 0.10, m);',
    '  col = mix(col, col * (1.0 - 0.85 * dotVis) + vec3(dotVis * 0.25) * dot, dot);',

    // ---- paper seam along the torn edge
    '  float seam = smoothstep(0.014, 0.0, abs(uv.y - tear));',
    '  col = mix(col, vec3(0.98, 0.97, 0.93), seam * 0.85 * step(0.001, uWipe) * step(uWipe, 0.999));',
    '  col += vec3(1.0, 0.35, 0.15) * seam * 0.10 * step(0.001, uWipe) * step(uWipe, 0.999);',

    // ---- vignette (stronger while dark)
    '  vec2 vc = uv - 0.5;',
    '  float vig = smoothstep(0.95, 0.30, length(vc * vec2(1.15, 1.0)));',
    '  col *= mix(1.0 - (1.0 - vig) * 0.55, 1.0 - (1.0 - vig) * 0.18, m);',

    // ---- velocity flash + film grain
    '  col *= 1.0 + abs(uVel) * 0.16;',
    '  float g = hash21(gl_FragCoord.xy + fract(uTime) * 431.0);',
    '  col += (g - 0.5) * 0.055;',

    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  /* ---------------------------------------------------------- */
  /*  FX OVERLAY SHADER (grain / dust / scratches)               */
  /* ---------------------------------------------------------- */
  var FRAG_FX = [
    'precision mediump float;',
    'uniform vec2 uRes;',
    'uniform float uTime, uScroll, uVel;',

    'float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',

    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  float g = hash21(uv * uRes * 0.5 + fract(uTime) * 97.0);',
    '  float grain = smoothstep(0.25, 0.95, g);',

    // occasional vertical scratches
    '  float colId = floor(uv.x * 160.0);',
    '  float slot = floor(uTime * 3.0);',
    '  float isScratch = step(0.994, hash21(vec2(colId, slot)));',
    '  float wobble = 0.5 + 0.5 * sin(uv.y * 40.0 + hash21(vec2(colId, 7.0)) * 6.28 + uTime * 2.0);',
    '  float scratch = isScratch * smoothstep(0.85, 1.0, wobble);',

    // dust specks
    '  float dust = step(0.9975, hash21(floor(uv * uRes / 3.0) + slot));',

    // dust drifts upward while scrolling
    '  float drift = fract(uv.y + uTime * 0.02 + uScroll * 0.5);',
    '  float mote = step(0.9985, hash21(floor(vec2(uv.x * 220.0, drift * 220.0))));',

    '  float a = grain * 0.30 + scratch * 0.35 + dust * 0.5 + mote * 0.35;',
    '  a *= 0.65 + abs(uVel) * 1.2;',
    '  a = clamp(a, 0.0, 0.85);',
    '  float shade = 0.5 + (g - 0.5) * 0.9;',
    '  gl_FragColor = vec4(vec3(shade), a);',
    '}'
  ].join('\n');

  /* ---------------------------------------------------------- */
  /*  GL BOOTSTRAP                                               */
  /* ---------------------------------------------------------- */
  function createGL(canvas, opts) {
    var attrs = { alpha: !!opts.alpha, antialias: false, depth: false, stencil: false,
                  premultipliedAlpha: true, powerPreference: 'high-performance' };
    var gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
    if (!gl) return null;

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error('shader:', gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }
    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, opts.frag);
    if (!vs || !fs) return null;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('link:', gl.getProgramInfoLog(prog));
      return null;
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    return {
      gl: gl,
      prog: prog,
      u: {
        res: gl.getUniformLocation(prog, 'uRes'),
        time: gl.getUniformLocation(prog, 'uTime'),
        scroll: gl.getUniformLocation(prog, 'uScroll'),
        wipe: gl.getUniformLocation(prog, 'uWipe'),
        vel: gl.getUniformLocation(prog, 'uVel')
      }
    };
  }

  function fit(canvas, gl, dprCap) {
    var dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    var w = Math.max(1, Math.round(window.innerWidth * dpr));
    var h = Math.max(1, Math.round(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    return [w, h];
  }

  var bgCanvas = document.getElementById('gl-bg');
  var fxCtx = document.getElementById('gl-fx');

  if (!bgCanvas || !fxCtx) return;

  // debug: ?nogl=1 disables WebGL (isolate rendering issues in headless captures)
  if (new URLSearchParams(location.search).has('nogl')) {
    document.body.classList.add('no-gl');
    if (bgCanvas) bgCanvas.style.display = 'none';
    if (fxCtx) fxCtx.style.display = 'none';
    return;
  }

  var bg = createGL(bgCanvas, { frag: FRAG_BG, alpha: false });
  var fx = createGL(fxCtx, { frag: FRAG_FX, alpha: true });

  if (!bg && !fx) {
    document.body.classList.add('no-gl');
    console.warn('[GL] WebGL unavailable — CSS fallback background active.');
    return;
  }

  var running = true;
  document.addEventListener('visibilitychange', function () { running = !document.hidden; });

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var t0 = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) return;
    var t = (now - t0) / 1000;
    if (reduced) t = 1.0;

    if (bg) {
      var res = fit(bgCanvas, bg.gl, 1.5);
      bg.gl.uniform2f(bg.u.res, res[0], res[1]);
      bg.gl.uniform1f(bg.u.time, t);
      bg.gl.uniform1f(bg.u.scroll, S.scroll);
      bg.gl.uniform1f(bg.u.wipe, S.wipe);
      bg.gl.uniform1f(bg.u.vel, S.vel);
      bg.gl.drawArrays(bg.gl.TRIANGLES, 0, 3);
    }
    if (fx) {
      var res2 = fit(fxCtx, fx.gl, 0.6);   // grain at low res — cheaper & chunkier
      fx.gl.uniform2f(fx.u.res, res2[0], res2[1]);
      fx.gl.uniform1f(fx.u.time, t);
      fx.gl.uniform1f(fx.u.scroll, S.scroll);
      fx.gl.uniform1f(fx.u.vel, S.vel);
      fx.gl.clearColor(0, 0, 0, 0);
      fx.gl.clear(fx.gl.COLOR_BUFFER_BIT);
      fx.gl.drawArrays(fx.gl.TRIANGLES, 0, 3);
    }
  }
  requestAnimationFrame(frame);

  window.NIKE_GL_OK = !!(bg || fx);
})();
