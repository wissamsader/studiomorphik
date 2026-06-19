(() => {
  const body = document.body;
  const hero = document.querySelector('.hero');
  const views = document.querySelectorAll('.view[data-page]');

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

  const headerIcons = document.querySelectorAll('.header__icon');
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
      }
      // otherwise let the hash change happen naturally
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

  // on phones the 16:9 video is cropped hard to fill 9:16.
  // each entry shifts object-position so the subject stays in frame.
  // focus: 0 = far-left edge, 50 = centre, 100 = far-right edge.
  // ← lower number = pan left  |  higher number = pan right →
  const focusSegments = [
    // Allure – face at vanity (18–32s)
    { start: 18.2, end: 19.5, focus: 30 },
    { start: 20.3, end: 21.2, focus: 30 },
    { start: 27.7, end: 29.5, focus: 32 },
    // Desire – face (41–56s)
    { start: 44.7, end: 46.2, focus: 30 },
    { start: 51.4, end: 52.8, focus: 28 },
    // Inferno – subject + fire (60–74s)
    { start: 62.0, end: 63.3, focus: 35 },
    { start: 65.8, end: 67.7, focus: 50 },
    // Inferno → Mirage – subject
    { start: 72.8, end: 74.2, focus: 32 },
    // Mirage – girl face on RIGHT (74–82s)
    { start: 78.4, end: 81.0, focus: 75 },
    // Couture – one of the girls (128–135s)
    { start: 128.6, end: 131.0, focus: 28 },
    // Couture – one eye
    { start: 134.5, end: 135.2, focus: 35 },
    // Nostalgia – face (135–145s)
    { start: 138.3, end: 141.2, focus: 32 },
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

  /* ---- scene map toggle (the circle) ---- */

  // shared timer: auto-hide the map a few seconds after a scene is chosen
  let mapAutoClose = null;

  const mapToggle = document.querySelector('.map-toggle');

  if (mapToggle) {
    const iconWrap = mapToggle.querySelector('.map-toggle__icon');

    // svg glyph helpers
    const ICON = (inner) =>
      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
    const DOT = (x, y) => `<circle cx="${x}" cy="${y}" r="1.4" fill="currentColor" stroke="none"/>`;

    // the circle just re-skins on each press (decorative) — the line stays put
    const skins = [
      { shape: '50%', icon: ICON(`<path d="M5 7 L11 12 L9 18 L17 15 L19 6" opacity="0.55"/>${DOT(5,7)}${DOT(11,12)}${DOT(9,18)}${DOT(17,15)}${DOT(19,6)}`) },
      { shape: '30% 70% 70% 30% / 30% 30% 70% 70%', icon: ICON(`<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2.4"/>`) },
      { shape: '16px', icon: ICON(`<path d="M12 5 L12 19 M5 12 L19 12"/>`) },
      { shape: '60% 40% 30% 70% / 60% 30% 70% 40%', icon: ICON(`<path d="M4 13 Q8 7 12 13 T20 13"/>`) },
      { shape: '50% 50% 50% 50% / 60% 60% 40% 40%', icon: ICON(`<rect x="5" y="5" width="5.5" height="5.5"/><rect x="13.5" y="5" width="5.5" height="5.5"/><rect x="5" y="13.5" width="5.5" height="5.5"/><rect x="13.5" y="13.5" width="5.5" height="5.5"/>`) },
      { shape: '8px', icon: ICON(`<path d="M12 5 L19 18 L5 18 Z"/>`) },
    ];

    let idx = 0;

    mapToggle.addEventListener('click', () => {
      const open = body.classList.toggle('is-map-open');
      // any manual toggle cancels a pending auto-hide
      clearTimeout(mapAutoClose);
      // once discovered, retire the pulse + hint for this session
      body.classList.add('map-seen');

      // pick a random skin each press (never the same one twice in a row)
      let next = idx;
      while (next === idx) next = Math.floor(Math.random() * skins.length);
      idx = next;
      mapToggle.style.borderRadius = skins[idx].shape;
      if (iconWrap) iconWrap.innerHTML = skins[idx].icon;

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

    // scattered positions (% of viewport) — a wandering route across the screen
    const positions = [
      { x: 13, y: 30 },
      { x: 22, y: 58 },
      { x: 17, y: 78 },
      { x: 32, y: 44 },
      { x: 30, y: 23 },
      { x: 44, y: 35 },
      { x: 41, y: 64 },
      { x: 52, y: 80 },
      { x: 57, y: 50 },
      { x: 54, y: 25 },
      { x: 67, y: 38 },
      { x: 71, y: 66 },
      { x: 81, y: 48 },
      { x: 85, y: 74 },
      { x: 79, y: 27 },
      { x: 90, y: 58 },
    ];

    const pts = sceneData.map((_, i) => positions[i % positions.length]);

    // ---- route: a clean straight line threading through the scenes ----
    const verts = pts.slice();
    const d = 'M ' + verts.map((v, i) => `${i === 0 ? '' : 'L '}${v.x} ${v.y}`).join(' ');
    const routePaths = sceneMap.querySelectorAll('.scene-map__route');
    routePaths.forEach(path => path.setAttribute('d', d));
    const progressPath = sceneMap.querySelector('.scene-map__route--progress');

    // cumulative length at each node, used to grow the glowing line as it plays
    const cum = [0];
    for (let i = 1; i < verts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(verts[i].x - verts[i - 1].x, verts[i].y - verts[i - 1].y));
    }
    const nodeLen = cum.slice(); // node i sits on vertex i

    // after a scene is chosen, fade the whole map away 5s later
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

    // create the nodes
    const nodes = sceneData.map((scene, i) => {
      const p = pts[i];
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'scene-map__node' + (p.x >= 60 ? ' scene-map__node--left' : '');
      node.style.left = `${p.x}%`;
      node.style.top = `${p.y}%`;
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
