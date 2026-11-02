(() => {
  /* ---- strip /index.html from the URL (clean URLs) ---- */
  if (window.location.pathname.endsWith('/index.html')) {
    const clean = window.location.pathname.replace(/\/index\.html$/, '/') + window.location.search + window.location.hash;
    window.location.replace(clean);
    return;
  }

  const body = document.body;
  const hero = document.querySelector('.hero');
  const views = document.querySelectorAll('.view[data-page]');
  const headerIcons = document.querySelectorAll('.header__icon');

  /* ---- router ---- */

  const PAGES = ['home', 'about', 'contact'];

  function getRoute() {
    const hash = window.location.hash;
    if (hash.startsWith('#/')) {
      const page = hash.slice(2);
      if (PAGES.includes(page)) return page;
    }
    return 'home';
  }

  function navigate(page) {
    // show/hide views
    views.forEach(v => {
      v.hidden = v.dataset.page !== page;
    });

    // reset scroll position when opening about/contact
    if (page === 'about' || page === 'contact') {
      const view = document.querySelector(`.view[data-page="${page}"]`);
      if (view) view.scrollTop = 0;
    }

    // highlight the matching header icon
    headerIcons.forEach(icon => {
      const href = icon.getAttribute('href');
      const target = href ? href.slice(2) : '';
      icon.classList.toggle('is-active', target === page);
    });

    // body class for css hooks
    body.className = `page page-${page}`;

    // hero overlay: home gets the cinematic gradient, inner pages get flat
    hero.classList.toggle('hero--flat', page !== 'home');

    // update page title
    const titles = { home: 'STUDIOMORPHIK', about: 'About — STUDIOMORPHIK', contact: 'Contact — STUDIOMORPHIK' };
    document.title = titles[page] || titles.home;
  }

  function onHashChange() {
    navigate(getRoute());
  }

  window.addEventListener('hashchange', onHashChange);

  // initial load
  navigate(getRoute());

  // brand link: if already home, prevent hash change so video doesn't restart
  const brand = document.querySelector('.brand');
  if (brand) {
    brand.addEventListener('click', (e) => {
      if (getRoute() === 'home') {
        e.preventDefault();
      }
    });
  }

  /* ---- header icon toggles ---- */

  headerIcons.forEach(icon => {
    icon.addEventListener('click', (e) => {
      const href = icon.getAttribute('href');
      if (!href || !href.startsWith('#/')) return;
      const target = href.slice(2);
      // if already on that page, go back home
      if (getRoute() === target) {
        e.preventDefault();
        navigate('home');
        window.location.hash = '#/';
      } else {
        // let hash change happen, then blur so focus ring doesn't stick
        setTimeout(() => icon.blur(), 0);
      }
    });
  });

  /* ---- the two reels ---- */

  // The main showreel and the Motion reel play side by side the whole time, each with the music inside its own file
  // (same length, the music at the same seconds). The switch only changes which one you see and hear. `video` is always
  // the reel on screen: the sound button, the timeline and the scene map follow it.
  const mainVideo = document.querySelector('.hero__media:not(.hero__media--motion)');
  const motionVideo = document.querySelector('.hero__media--motion');
  let video = mainVideo;
  let activeReel = 'main';

  // the Motion reel's files and its scene list
  const MOTION_FILES = { desktop: 'reel/motion_reel_1080.mp4', mobile: 'reel/motion_reel_mobile.mp4' };
  const MOTION_SCENES = 'reel/scenes.json';

  // same breakpoint as the main reel's source picker in index.html
  const reelMQ = window.matchMedia('(max-width: 880px)');
  const motionVersion = () => (reelMQ.matches ? 'mobile' : 'desktop');

  // a scene jump (timeline or scene map); the reel engine below makes it move both reels
  let jumpTo = (t) => {
    video.currentTime = t;
    if (video.paused) video.play().catch(() => {});
  };

  /* ---- scene data (shared) ---- */

  // mood-led names; each label's start (= previous `until`) lands on that content
  const MAIN_SCENES = [
    { until: 8,   label: 'Voltage' },     // 0  electric neon dancers
    { until: 14,  label: 'Elixir' },      // 8  green perfume bottle
    { until: 18,  label: 'Solitude' },    // 14 lone man on a quiet street
    { until: 32,  label: 'Allure' },      // 18 makeup at the vanity
    { until: 41,  label: 'Underground' }, // 32 neon nocturnal city
    { until: 56,  label: 'Desire' },      // 41 sleek headphones
    { until: 60,  label: 'Genesis' },     // 56 primordial water droplets
    { until: 74,  label: 'Inferno' },     // 60 forest fire
    { until: 82,  label: 'Mirage' },      // 74 car on the salt-flat mirror
    { until: 93,  label: 'Indulgence' },  // 82 honey pour
    { until: 103, label: 'Chrome' },      // 93 glossy supercar
    { until: 128, label: 'Nightfall' },   // 103 night street market
    { until: 135, label: 'Couture' },     // 128 studded couture look
    { until: 145, label: 'Nostalgia' },   // 135 vintage Cairo market
    { until: 151, label: 'Ritual' },      // 145 spotlit finale
  ];

  // the active reel's scenes; the timeline and the scene map are rebuilt from this on every flick
  let scenes = MAIN_SCENES;
  const sceneDataOf = (list) => {
    const out = [];
    let prevUntil = 0;
    for (const s of list) {
      if (s.label) out.push({ start: prevUntil, end: s.until, label: s.label });
      prevUntil = s.until;
    }
    return out;
  };
  const totalOf = (list) => (list.length ? list[list.length - 1].until : 1);

  /* ---- scene timeline ---- */

  const timeline = document.querySelector('.timeline');
  const markersEl = document.querySelector('.timeline__markers');
  const progressEl = document.querySelector('.timeline__progress');
  const tooltip = document.querySelector('.timeline__tooltip');

  let rebuildTimeline = () => {};

  if (video && timeline && markersEl) {
    let totalDuration = totalOf(scenes);
    let sceneData = sceneDataOf(scenes);

    rebuildTimeline = () => {
      totalDuration = totalOf(scenes);
      sceneData = sceneDataOf(scenes);
      markersEl.innerHTML = '';
      if (tooltip) tooltip.setAttribute('hidden', '');

      sceneData.forEach((scene, i) => {
        const marker = document.createElement('button');
        marker.type = 'button';
        marker.className = 'timeline__marker';
        marker.setAttribute('aria-label', `Jump to ${scene.label}`);
        marker.style.left = `${(scene.start / totalDuration) * 100}%`;
        marker.dataset.time = scene.start;
        marker.dataset.label = scene.label;
        marker.dataset.index = i;

        marker.addEventListener('click', () => {
          jumpTo(scene.start);
        });

        // hover: show tooltip
        marker.addEventListener('mouseenter', () => {
          const rect = marker.getBoundingClientRect();
          const trackRect = timeline.getBoundingClientRect();
          tooltip.textContent = scene.label;
          tooltip.style.left = `${rect.left - trackRect.left + rect.width / 2}px`;
          tooltip.removeAttribute('hidden');
        });

        marker.addEventListener('mouseleave', () => {
          tooltip.setAttribute('hidden', '');
        });

        // touch support
        marker.addEventListener('touchstart', () => {
          const rect = marker.getBoundingClientRect();
          const trackRect = timeline.getBoundingClientRect();
          tooltip.textContent = scene.label;
          tooltip.style.left = `${rect.left - trackRect.left + rect.width / 2}px`;
          tooltip.removeAttribute('hidden');
        }, { passive: true });

        marker.addEventListener('touchend', () => {
          setTimeout(() => tooltip.setAttribute('hidden', ''), 1200);
        });

        markersEl.appendChild(marker);
      });
      paintTimeline();
    };

    // update progress bar + active marker (only for the reel on screen)
    const paintTimeline = () => {
      const t = video.currentTime;
      const pct = Math.min((t / totalDuration) * 100, 100);
      if (progressEl) progressEl.style.width = `${pct}%`;

      const activeIdx = sceneData.findIndex(s => t >= s.start && t < s.end);
      markersEl.querySelectorAll('.timeline__marker').forEach((m, i) => {
        m.classList.toggle('is-active', i === activeIdx);
      });
    };
    [mainVideo, motionVideo].forEach(v => v && v.addEventListener('timeupdate', (e) => {
      if (e.target === video) paintTimeline();
    }));

    // click on empty area of track: jump to that position
    const track = document.querySelector('.timeline__track');
    if (track) {
      track.addEventListener('click', (e) => {
        // ignore clicks on markers (handled above)
        if (e.target.closest('.timeline__marker')) return;
        const rect = track.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        jumpTo(pct * totalDuration);
      });
    }

    rebuildTimeline();
  }

  /* ---- scene-map shapes (a fresh random layout on every open) ---- */

  // each open arranges the scene nodes along a new random shape, and the toggle
  // button previews exactly the shape the next tap will reveal.
  const sceneCount = () => scenes.filter(s => s.label).length;

  const _r = (a, b) => a + Math.random() * (b - a);
  const _clampPt = (p) => ({
    x: Math.max(9, Math.min(89, p.x)),
    y: Math.max(15, Math.min(85, p.y)),
  });
  // t along the shape for point i of n (a one-scene reel still gets a valid point)
  const _t = (i, n) => (n > 1 ? i / (n - 1) : 0.5);

  const shapeGenerators = [
    // wave
    (n) => { const humps = 2 + Math.floor(Math.random() * 2), ph = _r(0, Math.PI * 2), amp = _r(20, 30);
      return Array.from({ length: n }, (_, i) => { const t = _t(i, n);
        return _clampPt({ x: 11 + 78 * t, y: 50 + amp * Math.sin(ph + t * Math.PI * humps) }); }); },
    // zigzag
    (n) => { const hi = _r(24, 32), lo = _r(68, 76);
      return Array.from({ length: n }, (_, i) => { const t = _t(i, n);
        return _clampPt({ x: 11 + 78 * t, y: (i % 2 ? lo : hi) + _r(-3, 3) }); }); },
    // spiral
    (n) => { const turns = _r(1.6, 2.4), dir = Math.random() < 0.5 ? 1 : -1, ph = _r(0, Math.PI * 2);
      return Array.from({ length: n }, (_, i) => { const t = _t(i, n), a = ph + dir * t * Math.PI * 2 * turns, r = 5 + t * 36;
        return _clampPt({ x: 50 + r * Math.cos(a) * 1.35, y: 50 + r * Math.sin(a) }); }); },
    // arc / orbit
    (n) => { const ph = _r(0, Math.PI * 2), dir = Math.random() < 0.5 ? 1 : -1, span = _r(1.4, 2) * Math.PI;
      return Array.from({ length: n }, (_, i) => { const t = _t(i, n), a = ph + dir * t * span;
        return _clampPt({ x: 50 + 38 * Math.cos(a), y: 50 + 31 * Math.sin(a) }); }); },
    // staircase / diagonal
    (n) => { const dir = Math.random() < 0.5 ? 1 : -1;
      return Array.from({ length: n }, (_, i) => { const t = _t(i, n), y = dir > 0 ? 80 - 58 * t : 22 + 58 * t;
        return _clampPt({ x: 11 + 78 * t, y: y + _r(-2.5, 2.5) }); }); },
    // bounce (decaying)
    (n) => { const ph = _r(0, Math.PI), k = _r(2.5, 3.5);
      return Array.from({ length: n }, (_, i) => { const t = _t(i, n), d = Math.abs(Math.cos(ph + t * Math.PI * k)) * (1 - 0.45 * t);
        return _clampPt({ x: 11 + 78 * t, y: 80 - 58 * d }); }); },
    // wandering scatter
    (n) => Array.from({ length: n }, (_, i) => { const t = _t(i, n);
        return _clampPt({ x: 11 + 78 * t + _r(-5, 5), y: _r(18, 82) }); }),
  ];

  // A reel with many scenes (the Motion reel has one per concept group) gets its own layouts: the nodes snake
  // through a loose grid sized to the screen, words under the dots, so forty names never pile on each other.
  // The main reel (15 scenes) keeps the shapes above exactly as before.
  const DENSE_FROM = 21;
  const isDense = () => sceneCount() >= DENSE_FROM;
  const mapBox = () => {
    const el = document.querySelector('.scene-map');
    const r = el ? el.getBoundingClientRect() : null;
    return { w: (r && r.width) || window.innerWidth, h: (r && r.height) || window.innerHeight };
  };
  const gridDims = (n) => {
    const { w, h } = mapBox();
    let cols = Math.max(2, Math.round(Math.sqrt(n * (w / h) * 0.8)));
    cols = Math.min(cols, Math.max(2, Math.floor((w * 0.78) / 120) + 1));   // about 120 px per column for the words
    return { cols, rows: Math.ceil(n / cols) };
  };
  const _f = (i, n) => (n > 1 ? i / (n - 1) : 0.5);
  const denseGenerators = [
    // snake along the rows
    (n) => { const { cols, rows } = gridDims(n), amp = Math.min(3, 26 / rows), ph = _r(0, Math.PI * 2);
      return Array.from({ length: n }, (_, i) => { const row = Math.floor(i / cols), k = i % cols, c = row % 2 ? cols - 1 - k : k;
        return _clampPt({ x: 11 + 78 * _f(c, cols) + _r(-1.2, 1.2), y: 18 + 62 * _f(row, rows) + amp * Math.sin(ph + c * 1.4) }); }); },
    // snake down and up the columns
    (n) => { const { cols } = gridDims(n), per = Math.ceil(n / cols), amp = _r(1, 2.5), ph = _r(0, Math.PI * 2);
      return Array.from({ length: n }, (_, i) => { const col = Math.floor(i / per), k = i % per, r = col % 2 ? per - 1 - k : k;
        return _clampPt({ x: 11 + 78 * _f(col, cols) + amp * Math.sin(ph + r * 0.9), y: 18 + 62 * _f(r, per) + _r(-0.8, 0.8) }); }); },
    // rows that lean, alternately up and down, like a folded ribbon
    (n) => { const { cols, rows } = gridDims(n), lean = Math.min(5, 30 / rows) * (Math.random() < 0.5 ? 1 : -1);
      return Array.from({ length: n }, (_, i) => { const row = Math.floor(i / cols), k = i % cols, c = row % 2 ? cols - 1 - k : k, t = _f(c, cols);
        return _clampPt({ x: 11 + 78 * t + _r(-1, 1), y: 18 + 62 * _f(row, rows) + lean * (t - 0.5) * (row % 2 ? -1 : 1) }); }); },
  ];

  let _lastGen = -1;
  let _lastDense = -1;
  const makeShapePoints = () => {
    if (isDense()) {
      let g; do { g = Math.floor(Math.random() * denseGenerators.length); } while (g === _lastDense);
      _lastDense = g;
      return denseGenerators[g](sceneCount());
    }
    let g; do { g = Math.floor(Math.random() * shapeGenerators.length); } while (g === _lastGen);
    _lastGen = g;
    return shapeGenerators[g](sceneCount());
  };

  // a mini SVG of the exact shape, drawn into the toggle button as a preview
  const shapeIcon = (pts) => {
    const sx = (p) => (2 + p.x / 100 * 20).toFixed(1);
    const sy = (p) => (2 + p.y / 100 * 20).toFixed(1);
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p)} ${sy(p)}`).join(' ');
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  };

  // shared between the toggle button and the map itself
  let reshapeSceneMap = null;   // assigned by the scene-map block
  let setToggleIcon = null;     // assigned by the toggle block
  let pendingShape = null;      // the points the next open will use
  let rebuildSceneMap = () => {};

  /* ---- scene map toggle (the circle) ---- */

  // shared timer: auto-hide the map a few seconds after a scene is chosen
  let mapAutoClose = null;

  const mapToggle = document.querySelector('.map-toggle');

  if (mapToggle) {
    const iconWrap = mapToggle.querySelector('.map-toggle__icon');
    setToggleIcon = (pts) => { if (iconWrap) iconWrap.innerHTML = shapeIcon(pts); };

    // the button blob also re-shapes on each press, for fun
    const radii = ['50%', '30% 70% 70% 30% / 30% 30% 70% 70%', '16px',
                   '60% 40% 30% 70% / 60% 30% 70% 40%', '50% 50% 50% 50% / 60% 60% 40% 40%', '40%'];

    mapToggle.addEventListener('click', () => {
      const open = body.classList.toggle('is-map-open');
      // any manual toggle cancels a pending auto-hide
      clearTimeout(mapAutoClose);
      // once discovered, retire the pulse + hint for this session
      body.classList.add('map-seen');

      if (open) {
        // reveal the shape the button was previewing, then prime the next one
        if (reshapeSceneMap && pendingShape) reshapeSceneMap(pendingShape);
        pendingShape = makeShapePoints();
        setToggleIcon(pendingShape);
        mapToggle.style.borderRadius = radii[Math.floor(Math.random() * radii.length)];
      }

      mapToggle.setAttribute('aria-pressed', open ? 'true' : 'false');
      mapToggle.setAttribute('aria-label', open ? 'Hide scene map' : 'Show scene map');
    });
  }

  /* ---- scene map (scattered constellation of scene words) ---- */

  const sceneMap = document.querySelector('.scene-map');

  if (video && sceneMap) {
    let totalDuration = totalOf(scenes);
    let sceneData = sceneDataOf(scenes);

    const routePaths = sceneMap.querySelectorAll('.scene-map__route');
    const progressPath = sceneMap.querySelector('.scene-map__route--progress');

    // route geometry, rebuilt every time the map takes a new shape
    let verts = [], cum = [0], nodeLen = [0];

    // after a scene is chosen, fade the whole map away a few seconds later
    const mapToggleBtn = document.querySelector('.map-toggle');
    const scheduleMapAutoClose = () => {
      clearTimeout(mapAutoClose);
      mapAutoClose = setTimeout(() => {
        body.classList.remove('is-map-open');
        if (mapToggleBtn) {
          mapToggleBtn.setAttribute('aria-pressed', 'false');
          mapToggleBtn.setAttribute('aria-label', 'Show scene map');
        }
      }, 3000);
    };

    // the nodes of the active reel; their positions are assigned by applyShape
    let nodes = [];
    const makeNodes = () => {
      nodes.forEach(n => n.remove());
      nodes = sceneData.map((scene) => {
        const node = document.createElement('button');
        node.type = 'button';
        node.className = 'scene-map__node';
        node.setAttribute('aria-label', `Jump to ${scene.label}`);

        const dot = document.createElement('span');
        dot.className = 'scene-map__dot';

        const label = document.createElement('span');
        label.className = 'scene-map__label';
        label.textContent = scene.label;

        node.appendChild(dot);
        node.appendChild(label);

        node.addEventListener('click', () => {
          jumpTo(scene.start);
          scheduleMapAutoClose();
        });

        sceneMap.appendChild(node);
        return node;
      });
    };

    // lay the route + nodes out along a set of points, and rebuild the
    // progress-line geometry to match
    const applyShape = (points) => {
      if (points.length !== nodes.length) points = makeShapePoints();
      const d = points.length ? 'M ' + points.map((v, i) => `${i === 0 ? '' : 'L '}${v.x} ${v.y}`).join(' ') : '';
      routePaths.forEach(path => path.setAttribute('d', d));

      verts = points.slice();
      cum = [0];
      for (let i = 1; i < verts.length; i++) {
        cum.push(cum[i - 1] + Math.hypot(verts[i].x - verts[i - 1].x, verts[i].y - verts[i - 1].y));
      }
      nodeLen = cum.slice(); // node i sits on vertex i

      const dense = isDense();
      sceneMap.classList.toggle('scene-map--dense', dense);
      nodes.forEach((node, i) => {
        node.style.left = `${points[i].x}%`;
        node.style.top = `${points[i].y}%`;
        node.classList.toggle('scene-map__node--left', !dense && points[i].x >= 60);
      });
      settleLabels();
    };
    reshapeSceneMap = applyShape;

    // many scenes: a word that would touch another word stays quiet (its dot stays, the word shows on hover,
    // focus, or while that scene plays)
    const settleLabels = () => {
      nodes.forEach(n => n.classList.remove('is-quiet'));
      if (!sceneMap.classList.contains('scene-map--dense')) return;
      const kept = [];
      const pad = 3;
      nodes.forEach((n) => {
        const r = n.querySelector('.scene-map__label').getBoundingClientRect();
        const hit = kept.some(k => r.left < k.right + pad && k.left < r.right + pad && r.top < k.bottom + pad && k.top < r.bottom + pad);
        if (hit) n.classList.add('is-quiet'); else kept.push(r);
      });
    };
    let settleTimer = null;
    window.addEventListener('resize', () => { clearTimeout(settleTimer); settleTimer = setTimeout(settleLabels, 150); });

    // a new reel on screen: new nodes, a new shape, and the toggle previews the next one
    rebuildSceneMap = () => {
      totalDuration = totalOf(scenes);
      sceneData = sceneDataOf(scenes);
      makeNodes();
      applyShape(makeShapePoints());
      pendingShape = makeShapePoints();
      if (setToggleIcon) setToggleIcon(pendingShape);
      if (body.classList.contains('is-map-open') && sceneMap.animate) {
        sceneMap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 520, easing: 'ease-out' });
      }
    };

    // first nodes, first shape + the button's preview of it
    makeNodes();
    pendingShape = makeShapePoints();
    applyShape(pendingShape);
    if (setToggleIcon) setToggleIcon(pendingShape);

    const clamp01 = (v) => Math.min(Math.max(v, 0), 1);

    // build the watched portion of the route, ending exactly at length `len`
    const buildWatched = (len) => {
      let dd = `M ${verts[0].x} ${verts[0].y}`;
      let i = 1;
      for (; i < verts.length && cum[i] <= len; i++) {
        dd += ` L ${verts[i].x} ${verts[i].y}`;
      }
      if (i < verts.length) {
        const span = cum[i] - cum[i - 1];
        const tt = span > 0 ? (len - cum[i - 1]) / span : 0;
        const hx = verts[i - 1].x + (verts[i].x - verts[i - 1].x) * tt;
        const hy = verts[i - 1].y + (verts[i].y - verts[i - 1].y) * tt;
        dd += ` L ${hx} ${hy}`;
      }
      return dd;
    };

    // grow the glowing line every frame so it paints in smoothly as you watch
    const render = () => {
      requestAnimationFrame(render);
      if (!sceneData.length || !verts.length) return;
      const t = video.currentTime;
      let activeIdx = sceneData.findIndex(s => t >= s.start && t < s.end);
      if (activeIdx === -1) activeIdx = t >= totalDuration ? sceneData.length - 1 : 0;

      // visited = already played, active = playing now, the rest = upcoming
      nodes.forEach((n, i) => {
        n.classList.toggle('is-active', i === activeIdx);
        n.classList.toggle('is-visited', i < activeIdx);
      });

      // how far through the current scene, so how far the line has drawn
      const cur = sceneData[activeIdx];
      const within = cur.end > cur.start ? clamp01((t - cur.start) / (cur.end - cur.start)) : 0;
      const nextLen = nodeLen[activeIdx + 1] != null ? nodeLen[activeIdx + 1] : nodeLen[activeIdx];
      const drawnLen = nodeLen[activeIdx] + (nextLen - nodeLen[activeIdx]) * within;

      progressPath.setAttribute('d', buildWatched(drawnLen));
    };
    requestAnimationFrame(render);
  }

  /* ---- the reel switch: two reels in step, one on screen ---- */

  const playEl = (el) => { const p = el && el.play(); if (p && p.catch) p.catch(() => {}); };
  const hiddenReel = () => (video === mainVideo ? motionVideo : mainVideo);
  const durOf = (el) => (el && isFinite(el.duration) && el.duration) || totalOf(MAIN_SCENES);
  let motionScenes = { desktop: [], mobile: [] };
  // Nothing of the Motion reel is fetched until the first flick (or, on a computer, until the pointer comes near the
  // switch, which fetches only its header). From the first flick on, both reels play side by side.
  let motionReady = false;     // the Motion file has data
  let motionFailed = false;    // it could not load: the switch goes away and the main reel plays as before
  let motionVersionLoaded = null;
  let priming = false;         // first flick: the Motion reel waits, ready, for the main reel to reach its second
  let motionEngaged = false;   // set by the first flick; before it the Motion reel never plays

  /* sound: one small Web Audio graph, built on the first unmute (a user gesture), with a gain per reel under one
     master gain. A flick blends the two sounds over 120 ms; iOS ignores media volume, so every fade goes through gains.
     The main reel comes from another address (studiomorphik-media), so its element asks for it with CORS, or the
     browser would hand Web Audio silence. */
  const BLEND = 0.12;
  const volBtn = document.querySelector('.vol-btn');
  let muted = true;
  let graph = null;            // null = not built yet, false = no Web Audio here
  const gainOf = (el) => (graph && graph.gains.get(el)) || null;
  const ramp = (g, to, secs) => {
    if (!g) return;
    const p = g.gain, now = graph.ctx.currentTime, v = p.value;
    // anchor the fade at this moment and value, or the ramp starts from the last event and collapses into a cut
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now); else p.cancelScheduledValues(now);
    p.setValueAtTime(v, now);
    if (secs > 0) p.linearRampToValueAtTime(to, now + secs);
    else p.setValueAtTime(to, now);
  };
  const ensureGraph = () => {
    if (graph !== null) return graph;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !motionVideo) { graph = false; return graph; }
    try {
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      const gains = new Map();
      graph = { ctx, master, gains };
      [mainVideo, motionVideo].forEach(el => {
        const g = ctx.createGain();
        g.gain.value = el === video ? 1 : 0;
        ctx.createMediaElementSource(el).connect(g);
        g.connect(master);
        gains.set(el, g);
        el.muted = false;
      });
      if (ctx.resume) ctx.resume().catch(() => {});
    } catch (err) {
      graph = false;
    }
    return graph;
  };
  const applyMute = () => {
    if (graph) {
      ramp(graph.master, muted ? 0 : 1, 0.12);
    } else {
      // no Web Audio: only the reel on screen may sound
      video.muted = muted;
      const hid = hiddenReel();
      if (hid) hid.muted = true;
    }
    if (!volBtn) return;
    volBtn.classList.toggle('vol-btn--muted', muted);
    volBtn.setAttribute('aria-label', muted ? 'Unmute video' : 'Mute video');
    volBtn.setAttribute('title', muted ? 'Unmute' : 'Mute');
  };
  if (volBtn && video) {
    volBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      muted = !muted;
      if (!muted) ensureGraph();     // inside the click: browsers allow sound to start here
      applyMute();
    });
  }

  /* keep the hidden reel in step with the one on screen. Only the hidden one is ever corrected: a small speed nudge
     (up to 3%, 6% past 30 ms, it is silent and unseen), a seek only past 0.25 s. The one on screen is never touched,
     and its picture and music come from one file, so they cannot slide apart. */
  const twinLag = new Map();      // how far ahead to aim a seek of the hidden reel, learnt as it goes
  const rejoin = new Map();       // hidden reel waiting at REJOIN_AT for the visible one to come round after a loop
  const REJOIN_AT = 0.4;
  let startLag = 0.03;            // how long a paused, ready reel takes to start moving; learnt at each loop
  const twinOffset = () => {
    const vis = video, hid = hiddenReel();
    const dur = durOf(vis);
    let d = hid.currentTime - vis.currentTime;
    if (d > dur / 2) d -= dur;
    if (d < -dur / 2) d += dur;
    return d;
  };
  const lockstep = () => {
    if (!motionReady || priming || !motionEngaged) return;
    const vis = video, hid = hiddenReel();
    if (!hid || !hid.currentSrc || vis.paused || vis.seeking) return;
    const dur = durOf(vis);
    const lag = twinLag.has(hid) ? twinLag.get(hid) : 0.08;
    // the loop: only the reel on screen loops by itself. The hidden one stops at its end, waits ready at 0.4 s
    // (seeked while paused, so the two never seek at the same moment) and starts again when the visible one gets there.
    const rj = rejoin.get(hid);
    if (!rj && (hid.ended || (hid.paused && isFinite(hid.duration) && hid.currentTime >= hid.duration - 0.05))) {
      rejoin.set(hid, { timer: null });
      hid.playbackRate = 1;
      hid.currentTime = REJOIN_AT;
      return;
    }
    if (rj) {
      if (rj.timer || hid.seeking || hid.readyState < 2 || vis.readyState < 3) return;
      const t = vis.currentTime;
      if (t > dur / 2) return;                       // the visible one has not looped yet
      if (t > REJOIN_AT - startLag - 0.01) {         // missed the moment: plain rejoin
        rejoin.delete(hid);
        hid.currentTime = (t + lag) % dur;
        playEl(hid);
        return;
      }
      rj.timer = setTimeout(() => {
        rejoin.delete(hid);
        playEl(hid);
        setTimeout(() => {
          if (hiddenReel() === hid && !hid.paused) startLag = Math.max(0, Math.min(0.3, startLag - twinOffset() * 0.8));
        }, 400);
      }, Math.max(0, (REJOIN_AT - startLag - t) * 1000));
      return;
    }
    if (hid.paused && !hid.seeking) { playEl(hid); return; }
    if (hid.seeking || hid.readyState < 3 || vis.readyState < 3) return;
    const d = twinOffset();
    if (Math.abs(d) > 0.25) {
      hid.playbackRate = 1;
      hid.currentTime = (vis.currentTime + lag) % dur;
      hid.addEventListener('seeked', () => {
        setTimeout(() => { if (hiddenReel() === hid) twinLag.set(hid, Math.max(0, Math.min(0.5, lag - twinOffset() * 0.8))); }, 300);
      }, { once: true });
    } else if (Math.abs(d) > 0.008) {
      // up to 3% for a few ms; more when it is further off (after a scene jump), it is silent and unseen
      const cap = Math.abs(d) > 0.08 ? 0.12 : Math.abs(d) > 0.03 ? 0.06 : 0.03;
      hid.playbackRate = 1 - Math.max(-cap, Math.min(cap, d * 1.2));
    } else if (hid.playbackRate !== 1) {
      hid.playbackRate = 1;
    }
  };
  if (motionVideo) setInterval(lockstep, 100);

  // a reel that should be running but has not moved for 1.5 s (a stuck load after a loop or a seek): first a small
  // seek where it is, then, if that does not help, a reload at the right second
  const watch = new Map();
  const unstick = () => {
    [mainVideo, motionVideo].forEach(el => {
      if (!el || !el.currentSrc || el.paused || el.ended || (el === motionVideo && (!motionReady || priming || !motionEngaged))) { watch.delete(el); return; }
      const w = watch.get(el) || { t: el.currentTime, since: performance.now(), step: 0 };
      if (Math.abs(el.currentTime - w.t) > 0.05) { watch.set(el, { t: el.currentTime, since: performance.now(), step: 0 }); return; }
      const still = performance.now() - w.since;
      if (still > 1500 && w.step === 0) {
        el.currentTime = el.currentTime + 0.01;
        w.step = 1;
      } else if (still > 4000 && w.step === 1) {
        const ref = el !== video ? video.currentTime : el.currentTime;
        el.load();
        el.addEventListener('loadedmetadata', () => { el.currentTime = ref; playEl(el); }, { once: true });
        w.step = 2;
        w.since = performance.now();
      } else if (still > 9000 && w.step === 2) {
        w.step = 0;
        w.since = performance.now();
      }
      watch.set(el, w);
    });
  };
  if (motionVideo) setInterval(unstick, 500);

  // scene jumps: both reels go to the same second; the hidden one is fine-tuned by the lockstep
  const jumpLag = new Map();       // the hidden reel lands this much late after a scene jump; learnt per reel
  jumpTo = (t) => {
    const hid = motionReady && motionEngaged && !priming ? hiddenReel() : null;
    video.currentTime = t;
    if (hid && hid.currentSrc) {
      const lag = jumpLag.has(hid) ? jumpLag.get(hid) : 0.1;
      hid.playbackRate = 1;
      hid.currentTime = (t + lag) % durOf(hid);
      setTimeout(() => {
        if (hiddenReel() === hid && !hid.seeking && !video.seeking) jumpLag.set(hid, Math.max(0, Math.min(0.5, lag - twinOffset() * 0.8)));
      }, 900);
    }
    [video, hid].forEach(el => { if (el && el.paused) playEl(el); });
  };

  // switch views register here so the knob follows every change (click, drag, key)
  const switchViews = [];
  const showSwitch = (name) => switchViews.forEach(f => f(name));
  const mount = document.querySelector('.reel-switch-mount');
  const loadingCue = (on) => { if (mount) mount.classList.toggle('is-loading', on); };

  // the swap itself: both keep playing; only what you see and hear changes. The one coming on screen runs at normal
  // speed and loops by itself; one that was waiting at its end (or far off) starts from the second the other one shows.
  const swapTo = (name) => {
    const from = video;
    const to = name === 'motion' ? motionVideo : mainVideo;
    activeReel = name;
    video = to;
    const rjTo = rejoin.get(to);
    if (rjTo) { clearTimeout(rjTo.timer); rejoin.delete(to); }
    to.playbackRate = 1;
    to.loop = true;
    from.loop = false;
    if (to.ended || Math.abs(twinOffset()) > 0.25) to.currentTime = from.currentTime;
    playEl(to);
    if (graph) {
      const audible = !muted;
      ramp(gainOf(to), 1, audible ? BLEND : 0);
      ramp(gainOf(from), 0, audible ? BLEND : 0);
    } else {
      to.muted = muted;
      from.muted = true;
    }
    hero.dataset.reel = name;
    scenes = name === 'motion' ? motionScenes[motionVersion()] : MAIN_SCENES;
    rebuildTimeline();
    rebuildSceneMap();
    showSwitch(activeReel);
  };

  // the first flick: the rail says motion at once (with a soft pulse on its cap), the main reel stays on screen and
  // in the ear until the Motion reel runs at the same second, then they swap
  let pendingMotion = false;
  let pendingSince = 0;
  let pendingTimer = null;
  let primeTimer = null;
  let firstLead = 0.6;          // how far ahead of the main reel the Motion reel is parked; grows if that was too short
  let metaAskedAt = 0;          // when the Motion file was asked for, to judge the connection from its header's arrival
  const cancelPending = () => {
    pendingMotion = false;
    clearInterval(pendingTimer);
    clearTimeout(primeTimer);
    priming = false;            // from here on the twin model keeps the Motion reel in step behind the main one
    loadingCue(false);
  };
  // park the Motion reel (paused) a moment ahead of the main reel, and start it exactly when the main reel gets there
  const primeMotion = (lead) => {
    if (!pendingMotion) return;
    priming = true;
    const m = motionVideo;
    const dur = durOf(mainVideo);
    const target = (mainVideo.currentTime + lead) % dur;
    m.pause();
    m.playbackRate = 1;
    m.currentTime = target;
    const check = () => {
      if (!pendingMotion) return;
      if (m.seeking || m.readyState < 3) { primeTimer = setTimeout(check, 30); return; }
      let wait = target - startLag - mainVideo.currentTime;
      if (wait < -dur / 2) wait += dur;
      if (wait < 0.02) { firstLead = Math.min(4, lead * 1.6); primeMotion(firstLead); return; }   // too late: aim further
      primeTimer = setTimeout(() => { priming = false; playEl(m); }, wait * 1000);
    };
    primeTimer = setTimeout(check, 30);
  };
  const loadMotionFile = (preload) => {
    const v = motionVersion();
    if (!motionVideo || motionVersionLoaded === v) return false;
    motionVersionLoaded = v;
    motionVideo.preload = preload;
    motionVideo.loop = false;
    motionVideo.src = MOTION_FILES[v];
    motionVideo.load();
    metaAskedAt = performance.now();
    motionVideo.addEventListener('loadedmetadata', () => {
      // a quick header means a quick connection: park the reel closer, so the first flick is quicker
      const ms = performance.now() - metaAskedAt;
      firstLead = Math.max(0.3, Math.min(1.5, ms / 1000 * 3 + 0.2));
    }, { once: true });
    return true;
  };
  const finishFirst = () => {
    if (!pendingMotion) return;
    const m = motionVideo;
    if (priming || !motionReady || m.paused || m.seeking || m.readyState < 3) return;
    const d = Math.abs(twinOffset());
    const waited = performance.now() - pendingSince;
    if (d < 0.04 || (waited > 5000 && d < 0.25)) {
      cancelPending();
      swapTo('motion');
    }
  };
  const motionInStep = () => motionReady && motionEngaged && !priming && !motionVideo.paused && !motionVideo.seeking && Math.abs(twinOffset()) < 0.25;

  const setReel = (name) => {
    if (!motionVideo || motionFailed || (name !== 'main' && name !== 'motion')) return;
    if (name === 'main' && pendingMotion) { cancelPending(); showSwitch('main'); return; }
    if (name === activeReel) { showSwitch(activeReel); return; }
    if (name === 'motion' && !motionInStep()) {
      if (pendingMotion) return;
      pendingMotion = true;
      motionEngaged = true;
      pendingSince = performance.now();
      showSwitch('motion');
      loadingCue(true);
      motionVideo.preload = 'auto';
      if (loadMotionFile('auto') || motionVideo.readyState < 1) {
        motionVideo.addEventListener('loadedmetadata', () => primeMotion(firstLead), { once: true });
      } else {
        primeMotion(firstLead);
      }
      pendingTimer = setInterval(finishFirst, 30);
      return;
    }
    swapTo(name);
  };

  if (mainVideo && motionVideo) {
    mainVideo.loop = true;
    fetch(MOTION_SCENES).then(r => (r.ok ? r.json() : null)).then(json => {
      const ok = (s) => Array.isArray(s) && s.every(x => typeof x.until === 'number');
      if (json && ok(json.desktop) && ok(json.mobile)) motionScenes = { desktop: json.desktop, mobile: json.mobile };
    }).catch(() => {});
    // the switch shows once the main reel plays
    mainVideo.addEventListener('playing', () => { if (!motionFailed) hero.dataset.switch = 'on'; }, { once: true });
    motionVideo.addEventListener('loadeddata', () => { motionReady = true; });
    // the Motion file fails: the switch goes away and the main reel plays as before
    motionVideo.addEventListener('error', () => {
      if (!motionVideo.getAttribute('src')) return;
      cancelPending();
      if (activeReel === 'motion') swapTo('main');
      showSwitch('main');
      motionFailed = true;
      motionReady = false;
      delete hero.dataset.switch;
    });
    // on a computer, the pointer coming near the switch fetches the Motion file's header, so the first flick is quicker
    const near = (e) => {
      if (e.pointerType !== 'mouse' || !mount || motionVersionLoaded) return;
      const r = mount.getBoundingClientRect();
      if (!r.width) return;
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      if (Math.hypot(dx, dy) < 120) {
        loadMotionFile('metadata');
        window.removeEventListener('pointermove', near);
      }
    };
    window.addEventListener('pointermove', near, { passive: true });
    // crossing the breakpoint: the main reel reloads itself (index.html); the Motion reel, once started, takes the other file
    reelMQ.addEventListener('change', () => {
      if (motionVersionLoaded && motionVersionLoaded !== motionVersion()) {
        const wasPlaying = !motionVideo.paused;
        cancelPending();
        loadMotionFile('auto');
        motionVideo.addEventListener('loadedmetadata', () => {
          motionVideo.currentTime = mainVideo.currentTime;
          if (wasPlaying || activeReel === 'motion') playEl(motionVideo);
        }, { once: true });
      }
      if (activeReel === 'motion') {
        scenes = motionScenes[motionVersion()];
        rebuildTimeline();
        rebuildSceneMap();
      }
    });
  }

  /* ---- the switch: a small rail with a fader cap, and the name of the reel that is on beside it ---- */

  if (mount && motionVideo) {
    mount.innerHTML =
      '<button class="reel-switch" type="button" role="switch" aria-checked="false" aria-label="Motion reel">' +
      '<span class="rs-rail"><span class="rs-rail__lit"></span><span class="rs-rail__tick rs-rail__tick--a"></span>' +
      '<span class="rs-rail__tick rs-rail__tick--b"></span><span class="rs-knob rs-rail__cap"></span></span></button>' +
      '<span class="reel-switch__say" aria-hidden="true">reel</span>';
    const btn = mount.querySelector('.reel-switch');
    const say = mount.querySelector('.reel-switch__say');

    switchViews.push((name) => {
      const on = name === 'motion';
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
      say.textContent = on ? 'motion' : 'reel';
    });

    const flip = (name) => {
      mount.classList.add('reel-seen');
      setReel(name);
    };

    // drag: the cap follows the finger along the rail, and lets go to the nearer end
    let drag = null;
    let suppressClick = false;
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, moved: false, from: activeReel === 'motion' ? 1 : 0, p: null };
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    btn.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 5) return;
      drag.moved = true;
      const p = Math.min(1, Math.max(0, drag.from + dx / (btn.getBoundingClientRect().width * 0.52)));
      drag.p = p;
      btn.classList.add('is-dragging');
      btn.style.setProperty('--p', p.toFixed(3));
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      btn.classList.remove('is-dragging');
      btn.style.removeProperty('--p');
      if (!d.moved) return;          // a plain tap: the click handler flips it
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      if (e.type === 'pointercancel') return;
      flip(d.p >= 0.5 ? 'motion' : 'main');
    };
    btn.addEventListener('pointerup', endDrag);
    btn.addEventListener('pointercancel', endDrag);

    // click covers mouse, touch taps, and Space / Enter on the focused switch
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (suppressClick) { suppressClick = false; return; }
      flip(activeReel === 'motion' ? 'main' : 'motion');
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); flip('motion'); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); flip('main'); }
    });
  }

  // a small read-only handle for checking the reels from the console
  window.SMReel = {
    get active() { return activeReel; },
    get ready() { return motionReady; },
    get pending() { return pendingMotion; },
    get offset() { return motionReady && motionEngaged && !priming && hiddenReel().currentSrc ? twinOffset() : null; },
    get scenes() { return scenes.slice(); },
    gains() {
      const g = (el) => { const n = gainOf(el); return n ? +n.gain.value.toFixed(3) : null; };
      return { master: graph ? +graph.master.gain.value.toFixed(3) : null, main: g(mainVideo), motion: g(motionVideo) };
    },
    main: mainVideo,
    motion: motionVideo,
    set: setReel,
  };

  /* ---- copy email to clipboard ---- */

  const copyBtn = document.querySelector('.contact__copy');
  const copiedLabel = document.querySelector('.contact__copied');

  if (copyBtn) {
    let copyTimer;

    copyBtn.addEventListener('click', async () => {
      clearTimeout(copyTimer);

      try {
        await navigator.clipboard.writeText('hello@studiomorphik.com');
      } catch {
        // fallback for older browsers / non-HTTPS
        const ta = document.createElement('textarea');
        ta.value = 'hello@studiomorphik.com';
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      copyBtn.classList.add('is-copied');
      if (copiedLabel) copiedLabel.textContent = 'copied!';

      copyTimer = setTimeout(() => {
        copyBtn.classList.remove('is-copied');
        if (copiedLabel) copiedLabel.textContent = '';
      }, 2200);
    });
  }

})();
