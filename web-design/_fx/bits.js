/* morphik bits v1 — vanilla ports of react-bits-style effects for the website business.
   Hard guards: prefers-reduced-motion => nothing runs; Lenis + pointer effects desktop-only;
   never animates the hero photo's opacity (LCP-safe: transform/overlay only). */
(function () {
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = matchMedia('(pointer: fine)').matches;
  var FX = window.FX = {};

  var css = [
    '.fxshine{background-image:linear-gradient(120deg,currentColor 40%,#fff 50%,currentColor 60%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:fxshine 3.2s linear infinite}',
    '@keyframes fxshine{0%{background-position:120% 0}100%{background-position:-120% 0}}',
    '.fxspot{position:relative;overflow:hidden}',
    '.fxspot::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .35s;background:radial-gradient(240px circle at var(--fxx,50%) var(--fxy,50%),var(--fxspot,rgba(255,255,255,.14)),transparent 65%)}',
    '.fxspot:hover::after{opacity:1}',
    '.fxgrain{position:fixed;inset:-60px;z-index:4;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'240\' height=\'240\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.86\' numOctaves=\'2\'/%3E%3C/filter%3E%3Crect width=\'240\' height=\'240\' filter=\'url(%23n)\'/%3E%3C/svg%3E")}',
    '@keyframes fxgrain{0%{transform:translate(0,0)}25%{transform:translate(-24px,14px)}50%{transform:translate(12px,-22px)}75%{transform:translate(-10px,-8px)}100%{transform:translate(0,0)}}',
    'html.fxlenis{scroll-behavior:auto}'
  ].join('');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  FX.ready = function (fn) {
    if (RM || !window.gsap) return;               /* reduced motion: leave the site's own reveals as-is */
    gsap.registerPlugin(ScrollTrigger);
    if (document.readyState === 'complete') fn(); else addEventListener('load', fn);
  };

  FX.lenis = function () {                        /* desktop glide only — touch stays native */
    if (!FINE || !window.Lenis) return null;
    document.documentElement.classList.add('fxlenis');
    var l = new Lenis({ lerp: 0.1 });
    l.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { l.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    return l;
  };

  FX.heroIntro = function (steps, opts) {         /* choreographed entrance; photo = transform only */
    opts = opts || {};
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (opts.photo) {
      var ph = document.querySelector(opts.photo);
      if (ph) tl.fromTo(ph, { scale: 1.08 }, { scale: 1, duration: 1.6, ease: 'power2.out' }, 0);
    }
    steps.forEach(function (sel, i) {
      var els = document.querySelectorAll(sel);
      if (!els.length) return;
      els.forEach(function (el) { el.classList.add('on'); });   /* neutralize the IO reveal on these */
      tl.from(els, { autoAlpha: 0, y: 26, duration: .9, stagger: .08 }, .12 + i * .14);
    });
    return tl;
  };

  FX.words = function (sel) {                     /* SplitText-style WORD reveal (word-level = Arabic-safe) */
    document.querySelectorAll(sel).forEach(function (el) {
      if (el.dataset.fxsplit) return;
      el.dataset.fxsplit = '1';
      el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) {
        return '<span style="display:inline-block;overflow:hidden;vertical-align:top"><span style="display:inline-block">' + w + '</span></span>';
      }).join(' ');
      gsap.from(el.querySelectorAll('span > span'), {
        yPercent: 110, duration: .85, ease: 'power4.out', stagger: .07, delay: .25
      });
    });
  };

  FX.parallax = function (sel, pct) {             /* scroll-scrubbed drift; scale covers the travel */
    document.querySelectorAll(sel).forEach(function (el) {
      gsap.fromTo(el, { yPercent: -pct, scale: 1 + pct / 45 }, {
        yPercent: pct, ease: 'none',
        scrollTrigger: { trigger: el.closest('header,section') || el, start: 'top top', end: 'bottom top', scrub: true }
      });
    });
  };

  FX.countUp = function (sel) {                   /* de-locale aware: 4,6 · 1.521 · 260 */
    document.querySelectorAll(sel).forEach(function (el) {
      var raw = el.textContent.trim();
      if (!/^[\d.,]+$/.test(raw)) return;
      var dm = raw.match(/^(\d+)([.,])(\d)$/);            /* 4,6 or 4.6 = one-decimal rating */
      var sep = dm ? dm[2] : null;
      var num = dm ? parseFloat(dm[1] + '.' + dm[3])
                   : parseInt(raw.replace(/[.,]/g, ''), 10);
      if (isNaN(num)) return;
      var o = { v: 0 };
      gsap.to(o, {
        v: num, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onUpdate: function () {
          el.textContent = sep ? o.v.toFixed(1).replace('.', sep)
                               : Math.round(o.v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        },
        onComplete: function () { el.textContent = raw; }
      });
    });
  };

  FX.shiny = function (sel) { document.querySelectorAll(sel).forEach(function (el) { el.classList.add('fxshine'); }); };

  FX.spotlight = function (sel, color) {          /* pointer-tracked card highlight (desktop) */
    if (!FINE) return;
    document.querySelectorAll(sel).forEach(function (el) {
      el.classList.add('fxspot');
      if (color) el.style.setProperty('--fxspot', color);
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--fxx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--fxy', (e.clientY - r.top) + 'px');
      });
    });
  };

  FX.tilt = function (sel, max) {                 /* TiltedCard (desktop) */
    if (!FINE) return; max = max || 5;
    document.querySelectorAll(sel).forEach(function (el) {
      el.style.transformStyle = 'preserve-3d'; el.style.willChange = 'transform';
      var set = gsap.quickTo(el, 'rotationY', { duration: .5, ease: 'power2.out' });
      var setX = gsap.quickTo(el, 'rotationX', { duration: .5, ease: 'power2.out' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        set(((e.clientX - r.left) / r.width - .5) * 2 * max);
        setX(-((e.clientY - r.top) / r.height - .5) * 2 * max);
      });
      el.addEventListener('pointerleave', function () { set(0); setX(0); });
    });
  };

  FX.grain = function (op) {                      /* editorial film grain (his taste); static if no motion */
    var d = document.createElement('div');
    d.className = 'fxgrain'; d.style.opacity = op || .05;
    if (!RM) d.style.animation = 'fxgrain .9s steps(4) infinite';
    document.body.appendChild(d);
  };

  FX.batch = function (sel, y) {                  /* stagger grids the site's IO reveals one-by-one */
    var els = document.querySelectorAll(sel); if (!els.length) return;
    els.forEach(function (el) { el.classList.add('on'); });
    ScrollTrigger.batch(els, {
      start: 'top 88%', once: true,
      onEnter: function (b) { gsap.from(b, { autoAlpha: 0, y: y || 34, duration: .8, ease: 'power3.out', stagger: .1 }); }
    });
  };
})();
