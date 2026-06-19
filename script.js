(() => {
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

  /* ---- sound toggle / video ---- */

  const video = document.querySelector('.hero__media');
  const volBtn = document.querySelector('.vol-btn');

  if (volBtn && video) {
    volBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
      const muted = video.muted;
      volBtn.classList.toggle('vol-btn--muted', muted);
      volBtn.setAttribute('aria-label', muted ? 'Unmute video' : 'Mute video');
      volBtn.setAttribute('title', muted ? 'Unmute' : 'Mute');
    });
  }

  /* ---- scene data (shared) ---- */

  // mood-led names; each label's start (= previous `until`) lands on that content
  const scenes = [
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

  /* ---- mobile crop focus (portrait 9:16) ---- */

  // on phones the 16:9 video is cropped hard to fill a tall portrait frame,
  // so only ~30% of the width is visible. each entry shifts object-position
  // so the subject stays in frame for that exact shot.
  // focus: 0 = far-left edge, 50 = centre, 100 = far-right edge.
  // ← lower number = pan left  |  higher number = pan right →
  // (values set by inspecting the actual frame at each timecode)
  const focusSegments = [
    // makeup vanity — face is the MIRROR reflection, far right
    { start: 18.24, end: 19.64, focus: 90 },
    // woman lying on the bed — face at the far-left edge
    { start: 20.36, end: 21.24, focus: 0 },
    // two women underground — favour the left woman's face
    { start: 27.84, end: 29.64, focus: 13 },
    // man in the metro, train behind him — keep him centred (he drifts ~32→45%)
    { start: 29.64, end: 31.44, focus: 33 },
    // woman before the pyramids — on the right, drifts further right
    { start: 44.88, end: 46.28, focus: 73 },
    // (desert SUV at ~51.5–53s: left at the default centre — it's framed well
    //  there and an override snapped the walking-columns shot just before it)
    // torch + pyramid — subject and fire are far left
    { start: 62.00, end: 63.32, focus: 3 },
    // fire-breather — face and flame sit left of centre
    { start: 65.96, end: 67.80, focus: 17 },
    // woman by the sea — face at ~30%
    { start: 72.92, end: 74.28, focus: 20 },
    // split-screen — the girl's face FLIPS right → left → right; track her
    { start: 78.44, end: 79.60, focus: 82 },
    { start: 79.60, end: 80.50, focus: 12 },
    { start: 80.50, end: 81.04, focus: 82 },
    // two couture women — favour the left woman's face
    { start: 128.72, end: 131.00, focus: 16 },
    // extreme close-up — pan hard to keep ONLY one eye in frame
    { start: 134.56, end: 135.32, focus: 25 },
    // man playing the oud — seated left; centre him (his own shot only,
    // the wide bedroom shot before 139.8 stays at the default centre)
    { start: 139.76, end: 141.24, focus: 8 },
  ];

  if (video) {
    const mq = window.matchMedia('(max-width: 880px)');
    let lastFocus;

    const updateCrop = () => {
      if (!mq.matches) {
        video.style.objectPosition = '';
        lastFocus = undefined;
        return;
      }
      const t = video.currentTime;
      const seg = focusSegments.find(s => t >= s.start && t < s.end);
      const focus = seg ? seg.focus : 50;
      if (focus !== lastFocus) {
        video.style.objectPosition = `${focus}% 50%`;
        lastFocus = focus;
      }
    };

    video.addEventListener('timeupdate', updateCrop);
    mq.addEventListener('change', updateCrop);
    updateCrop();
  }

  /* ---- scene timeline ---- */

  const timeline = document.querySelector('.timeline');
  const markersEl = document.querySelector('.timeline__markers');
  const progressEl = document.querySelector('.timeline__progress');
  const tooltip = document.querySelector('.timeline__tooltip');

  if (video && timeline && markersEl) {
    const totalDuration = scenes[scenes.length - 1].until; // 120s

    // build scene data with start times (skip first empty-label scene)
    const sceneData = [];
    let prevUntil = 0;
    for (const s of scenes) {
      if (s.label) {
        sceneData.push({ start: prevUntil, end: s.until, label: s.label });
      }
      prevUntil = s.until;
    }

    // render markers
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
        video.currentTime = scene.start;
        // resume playback if paused
        if (video.paused) video.play().catch(() => {});
      });

      // hover → show tooltip
      marker.addEventListener('mouseenter', (e) => {
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
      marker.addEventListener('touchstart', (e) => {
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

    // update progress bar + active marker on timeupdate
    video.addEventListener('timeupdate', () => {
      const t = video.currentTime;
      const pct = Math.min((t / totalDuration) * 100, 100);
      if (progressEl) progressEl.style.width = `${pct}%`;

      // highlight active scene
      const activeIdx = sceneData.findIndex(s => t >= s.start && t < s.end);
      markersEl.querySelectorAll('.timeline__marker').forEach((m, i) => {
        m.classList.toggle('is-active', i === activeIdx);
      });
    });

    // click on empty area of track → jump to that position
    const track = document.querySelector('.timeline__track');
    if (track) {
      track.addEventListener('click', (e) => {
        // ignore clicks on markers (handled above)
        if (e.target.closest('.timeline__marker')) return;
        const rect = track.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        video.currentTime = pct * totalDuration;
        if (video.paused) video.play().catch(() => {});
      });
    }
  }

  /* ---- scene-map shapes (a fresh random layout on every open) ---- */

  // each open arranges the scene nodes along a new random shape, and the toggle
  // button previews exactly the shape the next tap will reveal.
  const SCENE_COUNT = scenes.filter(s => s.label).length;

  const _r = (a, b) => a + Math.random() * (b - a);
  const _clampPt = (p) => ({
    x: Math.max(9, Math.min(89, p.x)),
    y: Math.max(15, Math.min(85, p.y)),
  });

  const shapeGenerators = [
    // wave
    (n) => { const humps = 2 + Math.floor(Math.random() * 2), ph = _r(0, Math.PI * 2), amp = _r(20, 30);
      return Array.from({ length: n }, (_, i) => { const t = i / (n - 1);
        return _clampPt({ x: 11 + 78 * t, y: 50 + amp * Math.sin(ph + t * Math.PI * humps) }); }); },
    // zigzag
    (n) => { const hi = _r(24, 32), lo = _r(68, 76);
      return Array.from({ length: n }, (_, i) => { const t = i / (n - 1);
        return _clampPt({ x: 11 + 78 * t, y: (i % 2 ? lo : hi) + _r(-3, 3) }); }); },
    // spiral
    (n) => { const turns = _r(1.6, 2.4), dir = Math.random() < 0.5 ? 1 : -1, ph = _r(0, Math.PI * 2);
      return Array.from({ length: n }, (_, i) => { const t = i / (n - 1), a = ph + dir * t * Math.PI * 2 * turns, r = 5 + t * 36;
        return _clampPt({ x: 50 + r * Math.cos(a) * 1.35, y: 50 + r * Math.sin(a) }); }); },
    // arc / orbit
    (n) => { const ph = _r(0, Math.PI * 2), dir = Math.random() < 0.5 ? 1 : -1, span = _r(1.4, 2) * Math.PI;
      return Array.from({ length: n }, (_, i) => { const t = i / (n - 1), a = ph + dir * t * span;
        return _clampPt({ x: 50 + 38 * Math.cos(a), y: 50 + 31 * Math.sin(a) }); }); },
    // staircase / diagonal
    (n) => { const dir = Math.random() < 0.5 ? 1 : -1;
      return Array.from({ length: n }, (_, i) => { const t = i / (n - 1), y = dir > 0 ? 80 - 58 * t : 22 + 58 * t;
        return _clampPt({ x: 11 + 78 * t, y: y + _r(-2.5, 2.5) }); }); },
    // bounce (decaying)
    (n) => { const ph = _r(0, Math.PI), k = _r(2.5, 3.5);
      return Array.from({ length: n }, (_, i) => { const t = i / (n - 1), d = Math.abs(Math.cos(ph + t * Math.PI * k)) * (1 - 0.45 * t);
        return _clampPt({ x: 11 + 78 * t, y: 80 - 58 * d }); }); },
    // wandering scatter
    (n) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1);
        return _clampPt({ x: 11 + 78 * t + _r(-5, 5), y: _r(18, 82) }); }),
  ];

  let _lastGen = -1;
  const makeShapePoints = () => {
    let g; do { g = Math.floor(Math.random() * shapeGenerators.length); } while (g === _lastGen);
    _lastGen = g;
    return shapeGenerators[g](SCENE_COUNT);
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
    const totalDuration = scenes[scenes.length - 1].until;

    const sceneData = [];
    let prevUntil = 0;
    for (const s of scenes) {
      if (s.label) sceneData.push({ start: prevUntil, end: s.until, label: s.label });
      prevUntil = s.until;
    }

    const routePaths = sceneMap.querySelectorAll('.scene-map__route');
    const progressPath = sceneMap.querySelector('.scene-map__route--progress');

    // route geometry — rebuilt every time the map takes a new shape
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

    // create the nodes once — their positions are assigned by applyShape
    const nodes = sceneData.map((scene) => {
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
        video.currentTime = scene.start;
        if (video.paused) video.play().catch(() => {});
        scheduleMapAutoClose();
      });

      sceneMap.appendChild(node);
      return node;
    });

    // lay the route + nodes out along a set of points, and rebuild the
    // progress-line geometry to match
    const applyShape = (points) => {
      const d = 'M ' + points.map((v, i) => `${i === 0 ? '' : 'L '}${v.x} ${v.y}`).join(' ');
      routePaths.forEach(path => path.setAttribute('d', d));

      verts = points.slice();
      cum = [0];
      for (let i = 1; i < verts.length; i++) {
        cum.push(cum[i - 1] + Math.hypot(verts[i].x - verts[i - 1].x, verts[i].y - verts[i - 1].y));
      }
      nodeLen = cum.slice(); // node i sits on vertex i

      nodes.forEach((node, i) => {
        node.style.left = `${points[i].x}%`;
        node.style.top = `${points[i].y}%`;
        node.classList.toggle('scene-map__node--left', points[i].x >= 60);
      });
    };
    reshapeSceneMap = applyShape;

    // first shape + the button's preview of it
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
      const t = video.currentTime;
      let activeIdx = sceneData.findIndex(s => t >= s.start && t < s.end);
      if (activeIdx === -1) activeIdx = t >= totalDuration ? sceneData.length - 1 : 0;

      // visited = already played, active = playing now, the rest = upcoming
      nodes.forEach((n, i) => {
        n.classList.toggle('is-active', i === activeIdx);
        n.classList.toggle('is-visited', i < activeIdx);
      });

      // how far through the current scene → how far the line has drawn
      const cur = sceneData[activeIdx];
      const within = cur.end > cur.start ? clamp01((t - cur.start) / (cur.end - cur.start)) : 0;
      const nextLen = nodeLen[activeIdx + 1] != null ? nodeLen[activeIdx + 1] : nodeLen[activeIdx];
      const drawnLen = nodeLen[activeIdx] + (nextLen - nodeLen[activeIdx]) * within;

      progressPath.setAttribute('d', buildWatched(drawnLen));

      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }
})();
