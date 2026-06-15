(() => {
  const body = document.body;
  const hero = document.querySelector('.hero');
  const menu = document.querySelector('.menu');
  const openBtn = document.querySelector('.menu-button');
  const closeBtn = document.querySelector('.menu__close');
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
    // close menu on navigation
    setMenuOpen(false);
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
        setMenuOpen(false);
      }
    });
  }

  /* ---- menu ---- */

  function isMenuOpen() {
    return body.classList.contains('is-menu-open');
  }

  function setMenuOpen(open) {
    body.classList.toggle('is-menu-open', open);
    if (openBtn) openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (menu) menu.toggleAttribute('hidden', !open);
  }

  if (menu && openBtn) {
    setMenuOpen(false);

    openBtn.addEventListener('click', () => setMenuOpen(!isMenuOpen()));

    if (closeBtn) closeBtn.addEventListener('click', () => setMenuOpen(false));

    window.addEventListener('click', (e) => {
      if (!isMenuOpen()) return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (menu.contains(target) || openBtn.contains(target)) return;
      setMenuOpen(false);
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    });
  }

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

  const scenes = [
    { until: 5,   label: '' },
    { until: 12,  label: 'Custom Models' },
    { until: 26,  label: 'Custom Landscapes' },
    { until: 34,  label: 'Custom Transitions' },
    { until: 43,  label: 'Elements' },
    { until: 46,  label: 'Explosions' },
    { until: 61,  label: 'Camera Movements' },
    { until: 63,  label: 'Realism' },
    { until: 65,  label: 'Unreal' },
    { until: 72,  label: 'Product Shots' },
    { until: 92,  label: 'Food Shots' },
    { until: 101, label: 'Cars' },
    { until: 106, label: 'Make-up' },
    { until: 109, label: 'Colors' },
    { until: 115, label: 'VFX Misc' },
    { until: 120, label: 'Hero Shots' },
  ];

  /* ---- video scene labels (mobile) ---- */

  const topRight = document.querySelector('.video-overlay--top-right');

  if (video && topRight) {
    video.addEventListener('timeupdate', () => {
      const t = video.currentTime;
      const scene = scenes.find(s => t <= s.until) || scenes[scenes.length - 1];
      topRight.textContent = scene.label;
    });
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
})();
