/* ============================================================
   NIKE COLLAGE SHOWCASE — scroll engine
   drives: WebGL state, theme wipe, reveals, parallax,
   horizontal strip, manifesto words, HUD, cursor
   ============================================================ */
(function () {
  'use strict';

  var S = window.NIKE_SHOWTIME || (window.NIKE_SHOWTIME = { scroll: 0, wipe: 0, vel: 0, theme: 0 });
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------------------------- LOADER */
  (function loader() {
    var bar = $('.loader-bar i');
    var pct = $('.loader-pct');
    var p = 0, done = false;
    var start = performance.now();
    var q = new URLSearchParams(location.search);

    var tick = setInterval(function () {
      var elapsed = performance.now() - start;
      var target = Math.min(96, (elapsed / 1400) * 100);
      p = Math.max(p, target + Math.random() * 3);
      p = Math.min(p, 96);
      if (bar) bar.style.width = p.toFixed(1) + '%';
      if (pct) pct.textContent = (p < 10 ? '0' : '') + Math.floor(p);
    }, 90);

    function finish() {
      if (done) return; done = true;
      clearInterval(tick);
      if (bar) bar.style.width = '100%';
      if (pct) pct.textContent = '100';
      setTimeout(function () {
        document.body.classList.remove('is-loading');
        document.body.classList.add('loaded');
        kickReveals();
      }, 350);
    }
    if (document.readyState === 'complete') setTimeout(finish, 900);
    else window.addEventListener('load', function () { setTimeout(finish, 500); });
    setTimeout(finish, 3200); // hard safety

    // debug helpers: ?nointro=1 skips the intro, ?y=1234 jumps to a scroll offset
    // ?shot=1 = screenshot mode (implies nointro, kills transitions/animations)
    if (q.has('shot')) {
      document.documentElement.classList.add('shot-mode');
    }
    if (q.has('nointro') || q.has('shot')) { clearInterval(tick); finish(); }
    if (q.has('y')) {
      window.addEventListener('load', function () {
        setTimeout(function () {
          window.scrollTo({ top: parseInt(q.get('y'), 10) || 0, behavior: 'instant' });
        }, 250);
      });
    }
  })();

  /* -------------------------------------------------- REVEALS */
  var revealObs = null;
  function kickReveals() {
    var targets = $$('.reveal, .reveal-group');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    targets.forEach(function (el) { revealObs.observe(el); });
  }
  kickReveals();

  /* -------------------------------------------------- MANIFESTO WORDS */
  var manifesto = $('#manifesto-text');
  var words = [];
  if (manifesto) {
    var raw = manifesto.textContent.replace(/\s+/g, ' ').trim().split(' ');
    var hot = { SELL: 1, CARTS: 1, CHECKOUT: 1 };
    manifesto.innerHTML = raw.map(function (w) {
      var key = w.replace(/[^A-Z']/g, '');
      return '<span class="w' + (hot[key] ? ' hot' : '') + '">' + w + '</span>';
    }).join(' ');
    words = $$('.w', manifesto);
  }

  /* -------------------------------------------------- SECTION HUD */
  var sections = $$('[data-hud]');
  var hudNum = $('#hud-num'), hudLabel = $('#hud-label');

  function updateHUD() {
    var mid = window.innerHeight * 0.5, best = null, bestD = Infinity;
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) { best = sections[i]; break; }
      var d = Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
      if (d < bestD) { bestD = d; best = sections[i]; }
    }
    if (best) {
      var n = best.getAttribute('data-hud');
      if (hudNum && hudNum.textContent !== n) hudNum.textContent = n;
      var l = best.getAttribute('data-hud-label');
      if (hudLabel && hudLabel.textContent !== l) hudLabel.textContent = l;
    }
  }

  /* -------------------------------------------------- THEME CHIP */
  var chip = $('#theme-chip b');

  /* -------------------------------------------------- ELEMENTS */
  var parallaxEls = $$('[data-speed]');
  var strip = $('#strip-track');
  var stripSec = $('#motion');
  var shiftSec = $('#shift');
  var shiftMeter = $('#shift-meter');
  var progressBar = $('#progress-bar');

  var stripDist = 0;
  function measure() {
    if (strip) stripDist = Math.max(0, strip.scrollWidth - window.innerWidth);
  }
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);

  /* -------------------------------------------------- FRAME LOOP */
  var smoothScroll = 0, prevSmooth = 0, themeLight = false;
  var ticking = true;

  function frame() {
    requestAnimationFrame(frame);

    var vh = window.innerHeight;
    var max = Math.max(1, document.documentElement.scrollHeight - vh);
    var raw = clamp(window.scrollY / max, 0, 1);

    // smoothed page progress + velocity
    smoothScroll = lerp(smoothScroll, raw, reduced ? 1 : 0.09);
    var v = (smoothScroll - prevSmooth);
    prevSmooth = smoothScroll;
    S.vel = lerp(S.vel, clamp(v * 9, -1, 1), 0.18);
    S.scroll = smoothScroll;

    // wipe progress through THE SHIFT section
    var wipe = 0;
    if (shiftSec) {
      var r = shiftSec.getBoundingClientRect();
      var span = Math.max(1, r.height - vh);
      wipe = clamp(-r.top / span, 0, 1);
      // ease the wipe a touch so it holds at both ends
      wipe = clamp((wipe - 0.08) / 0.84, 0, 1);
      wipe = wipe * wipe * (3 - 2 * wipe);
    }
    S.wipe = wipe;
    S.theme = wipe > 0.5 ? 1 : 0;
    if (shiftMeter) shiftMeter.style.width = (wipe * 100).toFixed(1) + '%';

    // body theme class
    if (wipe > 0.52 && !themeLight) {
      themeLight = true;
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-light');
      if (chip) chip.textContent = 'LIGHT';
    } else if (wipe <= 0.52 && themeLight) {
      themeLight = false;
      document.body.classList.remove('theme-light');
      document.body.classList.add('theme-dark');
      if (chip) chip.textContent = 'DARK';
    }

    // progress bar
    if (progressBar) progressBar.style.transform = 'scaleX(' + smoothScroll.toFixed(4) + ')';

    // parallax (read rects first, then write — no layout thrash)
    if (!reduced) {
      var i, rect;
      for (i = 0; i < parallaxEls.length; i++) {
        rect = parallaxEls[i].getBoundingClientRect();
        parallaxEls[i]._vis = rect.bottom > -80 && rect.top < vh + 80;
        parallaxEls[i]._y = ((rect.top + rect.height / 2) - vh / 2) *
                             parseFloat(parallaxEls[i].getAttribute('data-speed'));
      }
      for (i = 0; i < parallaxEls.length; i++) {
        if (parallaxEls[i]._vis) {
          parallaxEls[i].style.translate = '0 ' + parallaxEls[i]._y.toFixed(1) + 'px';
        }
      }
    }

    // horizontal MOTION strip
    if (strip && stripSec) {
      var sr = stripSec.getBoundingClientRect();
      var sp = clamp(-sr.top / Math.max(1, sr.height - vh), 0, 1);
      strip.style.transform = 'translate3d(' + (-sp * stripDist).toFixed(1) + 'px,0,0)';
    }

    // manifesto word reveal
    if (manifesto && words.length) {
      var mr = manifesto.getBoundingClientRect();
      if (mr.bottom > -100 && mr.top < vh + 100) {
        var wp = clamp((vh * 0.82 - mr.top) / (mr.height + vh * 0.25), 0, 1);
        var count = Math.round(wp * words.length * 1.12);
        for (var w = 0; w < words.length; w++) {
          var on = w < count;
          if (on !== words[w]._on) {
            words[w]._on = on;
            words[w].classList.toggle('on', on);
          }
        }
      }
    }

    updateHUD();
  }
  requestAnimationFrame(frame);

  /* -------------------------------------------------- CURSOR */
  var cursor = $('.cursor');
  if (cursor && window.matchMedia('(hover:hover)').matches) {
    var dot = $('.cursor-dot', cursor), ring = $('.cursor-ring', cursor);
    var mx = -100, my = -100, rx = -100, ry = -100;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
    });
    (function cursorLoop() {
      rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
      ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px) translate(-50%,-50%)';
      ring.style.left = '0'; ring.style.top = '0';
      requestAnimationFrame(cursorLoop);
    })();

    document.addEventListener('mouseover', function (e) {
      if (e.target.closest('a,button,[data-cursor],.cut')) cursor.classList.add('is-hover');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest('a,button,[data-cursor],.cut')) cursor.classList.remove('is-hover');
    });
    document.addEventListener('mousedown', function () { cursor.classList.add('is-down'); });
    document.addEventListener('mouseup', function () { cursor.classList.remove('is-down'); });
  }

  /* -------------------------------------------------- SAFETY: no-JS/GL */
  if (document.body.classList.contains('no-gl')) {
    document.documentElement.style.background = '#0a0a0a';
  }

  console.log('%c NIKE COLLAGE SHOWCASE ', 'background:#d8ff34;color:#0a0a0a;font-weight:bold;padding:4px 8px',
    '| scroll-driven WebGL — showcase only, not for sale.');
})();
