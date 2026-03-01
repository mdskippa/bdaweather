// BDA Weather – Main application

// ─── Bible verses (ESV) – nature / water / animals theme ─────────────────────
const VERSES = [
  '"He leads me beside still waters; he restores my soul." — Psalm 23:2–3',
  '"The voice of the LORD is over the waters; the God of glory thunders, the LORD, over many waters." — Psalm 29:3',
  '"The heavens declare the glory of God, and the sky above proclaims his handiwork." — Psalm 19:1',
  '"He sends out his command to the earth; his word runs swiftly." — Psalm 147:15',
  '"He covers the sky with clouds; he supplies the earth with rain and makes grass grow on the hills." — Psalm 147:8',
  '"The earth is the LORD\'s and the fullness thereof, the world and those who dwell therein, for he has founded it upon the seas." — Psalm 24:1–2',
  '"Ask the beasts, and they will teach you; the birds of the heavens, and they will tell you." — Job 12:7',
  '"Look at the birds of the air: they neither sow nor reap nor gather into barns, and yet your heavenly Father feeds them." — Matthew 6:26',
  '"They who wait for the LORD shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary." — Isaiah 40:31',
  '"Whoever drinks of the water that I will give him will never be thirsty again. The water that I will give him will become in him a spring of water welling up to eternal life." — John 4:14',
  '"If anyone thirsts, let him come to me and drink." — John 7:37',
  '"But let justice roll down like waters, and righteousness like an ever-flowing stream." — Amos 5:24',
  '"He who made the Pleiades and Orion… who calls for the waters of the sea and pours them out on the surface of the earth — the LORD is his name." — Amos 5:8',
  '"Praise him, sun and moon, praise him, all you shining stars! Praise him, you highest heavens, and you waters above the heavens!" — Psalm 148:3–4',
  '"You visit the earth and water it; you greatly enrich it; the river of God is full of water; you provide their grain." — Psalm 65:9',
  '"He makes springs pour water into the ravines; it flows between the mountains. They give water to all the beasts of the field." — Psalm 104:10–11',
  '"The LORD sits enthroned over the flood; the LORD sits enthroned as king forever." — Psalm 29:10',
  '"For everything there is a season, and a time for every matter under heaven." — Ecclesiastes 3:1',
  '"Where were you when I laid the foundation of the earth, when the morning stars sang together and all the sons of God shouted for joy?" — Job 38:4,7',
  '"The Spirit of God was hovering over the face of the waters." — Genesis 1:2',
];

window.App = (() => {
  let _unit = 'F';          // 'C' or 'F'
  let _data = null;         // last fetched data bundle
  let _refreshTimer = null;
  let _clockTimer   = null;
  let _verseTimer   = null;
  let _versePool    = [];   // shuffled pool for random non-repeat cycling

  // ─── Bootstrap ─────────────────────────────────────────────────────────────
  async function init() {
    setLoadingMsg('Fetching live conditions…');
    startVerses();
    startClock();
    initMap();
    initSectionNav();
    await refresh();
    scheduleAutoRefresh();
  }

  function scheduleAutoRefresh() {
    if (_refreshTimer) clearInterval(_refreshTimer);
    _refreshTimer = setInterval(refresh, CONFIG.refreshInterval);
  }

  // ─── Main refresh ───────────────────────────────────────────────────────────
  async function refresh() {
    setRefreshing(true);
    try {
      setLoadingMsg('Fetching weather…');
      _data = await fetchAllData();
      render(_data);
      const ts = new Date().toLocaleTimeString('en-BM', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Halifax' });
      document.getElementById('nav-updated').textContent = `Updated ${ts}`;
      document.getElementById('footer-updated').textContent = `Last updated: ${ts} AST`;
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
      hideOverlay();
    }
  }

  // ─── Master render ──────────────────────────────────────────────────────────
  function render(data) {
    if (!data) return;
    renderHero(data);
    renderTankRain(data);
    renderQuickStats(data);
    renderOcean(data);
    renderHourly(data);
    renderDaily(data);
    renderStorms(data);
    renderWindDetail(data);
  }

  // ─── Hero ───────────────────────────────────────────────────────────────────
  function renderHero(data) {
    const w  = data.weather;
    const m  = data.marine;
    if (!w) return;

    const cur = w.current;
    const day = w.daily;

    // Temperature
    const tempC = cur.temperature_2m;
    document.getElementById('hero-temp').textContent = fmtTemp(tempC);

    // Condition
    const wc = getWeatherCode(cur.weather_code);
    const hero = document.getElementById('hero');
    hero.className = wc.gradient; // sets background gradient
    const cond = document.getElementById('hero-condition');
    cond.querySelector('.icon').textContent  = wc.icon;
    cond.querySelector('.label').textContent = wc.label;

    // Meta row
    document.getElementById('hero-feels').textContent    = fmtTemp(cur.apparent_temperature);
    document.getElementById('hero-sea').textContent      = m?.current?.sea_surface_temperature != null ? fmtTemp(m.current.sea_surface_temperature) : '—';
    document.getElementById('hero-wind').textContent     = `${Math.round(cur.wind_speed_10m)} km/h ${degToCardinal(cur.wind_direction_10m)}`;
    document.getElementById('hero-humidity').textContent = `${cur.relative_humidity_2m}%`;

    // Sunrise/sunset
    if (day && day.sunrise) {
      const sr = new Date(day.sunrise[0]);
      const ss = new Date(day.sunset[0]);
      document.getElementById('hero-sunrise').textContent = fmtTime(sr);
      document.getElementById('hero-sunset').textContent  = fmtTime(ss);
    }
  }

  // ─── Tank Rain ─────────────────────────────────────────────────────────────
  const TANK_TIERS = [
    { min: 75,  icon: '⛈️',    label: 'Big Tank Refill',  desc: "Dat's real flat-out tank rain — tanks up to de' brim." },
    { min: 50,  icon: '🌧️🌧️', label: 'Proper Tank Rain', desc: "That's proper rain — tank fillin' good." },
    { min: 20,  icon: '🌦️',    label: 'Good Tank Rain',   desc: 'Pretty good rain — tank goin\u2019 up proper.' },
    { min: 10,  icon: '💧',     label: 'Minor Tank Boost', desc: "Some decent rain — tank'll creep up." },
    { min: 1,   icon: '🌧️',    label: 'Light Shower',     desc: "A li'l sprinkle — not much tank goin' up." },
    { min: 0,   icon: '☀️',     label: 'No Rain',          desc: "Tanks restin' today — no rain comin'." },
  ];

  function renderTankRain(data) {
    const w = data.weather;
    if (!w || !w.daily) return;
    const mm = w.daily.precipitation_sum[0] ?? 0;
    const inches = (mm / 25.4).toFixed(2);
    const tier = TANK_TIERS.find(t => mm >= t.min) || TANK_TIERS[TANK_TIERS.length - 1];

    document.getElementById('hero-tank').querySelector('.tank-icon').textContent   = tier.icon;
    document.getElementById('hero-tank').querySelector('.tank-label').textContent  = tier.label;
    document.getElementById('hero-tank').querySelector('.tank-desc').textContent   = tier.desc;
    document.getElementById('hero-tank').querySelector('.tank-amount').textContent = `${mm} mm / ${inches} in`;
  }

  // ─── Quick Stats ────────────────────────────────────────────────────────────
  function renderQuickStats(data) {
    const cur = data.weather?.current;
    if (!cur) return;

    // Wind
    document.getElementById('stat-wind').textContent     = `${Math.round(cur.wind_speed_10m)} km/h`;
    document.getElementById('stat-wind-dir').textContent = degToCardinal(cur.wind_direction_10m);
    document.getElementById('stat-gust').textContent     = `Gusts: ${Math.round(cur.wind_gusts_10m)} km/h`;
    // Compass needle – rotate to wind direction
    const needle = document.getElementById('compass-needle');
    if (needle) needle.style.transform = `rotate(${cur.wind_direction_10m}deg)`;

    // Humidity
    const dewC = calcDewPoint(cur.temperature_2m, cur.relative_humidity_2m);
    document.getElementById('stat-humidity').textContent = `${cur.relative_humidity_2m}%`;
    document.getElementById('stat-dewpoint').textContent = `Dew point: ${fmtTemp(dewC)}`;

    // Pressure
    document.getElementById('stat-pressure').textContent = `${Math.round(cur.surface_pressure)} hPa`;
    document.getElementById('stat-vis').textContent       = cur.visibility != null ? `Visibility: ${(cur.visibility / 1000).toFixed(1)} km` : 'Visibility: —';

    // UV
    const uv = cur.uv_index ?? 0;
    const uvInfo = uvLabel(uv);
    document.getElementById('stat-uv').textContent       = uv.toFixed(1);
    document.getElementById('stat-uv-label').textContent = uvInfo.label;
    const uvPct = Math.min(uv / 11, 1) * 100;
    const indicator = document.getElementById('uv-indicator');
    if (indicator) indicator.style.left = `${uvPct}%`;

    // Cloud / precip
    document.getElementById('stat-cloud').textContent  = `${cur.cloud_cover}%`;
    document.getElementById('stat-precip').textContent = `Precipitation: ${cur.precipitation} mm`;
  }

  // ─── Ocean & Tides ──────────────────────────────────────────────────────────
  function renderOcean(data) {
    const m = data.marine?.current;

    if (m) {
      document.getElementById('stat-wave').textContent       = m.wave_height != null ? `${m.wave_height.toFixed(1)} m` : '—';
      document.getElementById('stat-wave-period').textContent = m.wave_period != null ? `Period: ${m.wave_period.toFixed(0)} s` : '—';
      document.getElementById('stat-swell').textContent      = m.swell_wave_height != null ? `${m.swell_wave_height.toFixed(1)} m` : '—';
      document.getElementById('stat-swell-dir').textContent  = m.swell_wave_direction != null ? `Direction: ${degToCardinal(m.swell_wave_direction)} (${swellDirLabel(m.swell_wave_direction)})` : '—';
      document.getElementById('stat-sst').textContent        = m.sea_surface_temperature != null ? fmtTemp(m.sea_surface_temperature) : '—';
      const curVel = m.ocean_current_velocity;
      const curDir = m.ocean_current_direction;
      document.getElementById('stat-current').textContent     = curVel != null ? `${(curVel * 3.6).toFixed(1)} km/h` : '—';
      document.getElementById('stat-current-dir').textContent = curDir != null ? `Direction: ${degToCardinal(curDir)}` : '—';
    }

    // Tide tags
    const tideTags = document.getElementById('tide-times');
    const hiLo = data.tides?.hiLo || [];
    if (hiLo.length) {
      const future = hiLo.filter(t => new Date(t.t) >= new Date()).slice(0, 6);
      tideTags.innerHTML = future.map(t => {
        const d = new Date(t.t);
        const isH = t.type === 'H';
        return `<div class="tide-tag ${isH ? 'high' : 'low'}">
          <span class="tag-type">${isH ? '▲ HIGH' : '▽ LOW'}</span>
          <span class="tag-time">${fmtTime(d)}</span>
          <span class="tag-ht">${parseFloat(t.v).toFixed(2)} m</span>
        </div>`;
      }).join('');
    } else {
      tideTags.innerHTML = '<span style="font-size:.8rem;color:#a3a3a3">Tide data unavailable</span>';
    }

    // Charts
    renderTideChart(data.tides?.hourly || [], hiLo);
  }

  // ─── Hourly ─────────────────────────────────────────────────────────────────
  function renderHourly(data) {
    const hourly = data.weather?.hourly;
    if (!hourly) return;

    const container = document.getElementById('hourly-scroll');
    const now = new Date();

    // Find current hour index
    const startIdx = hourly.time.findIndex(t => new Date(t) >= now);
    const begin = Math.max(0, startIdx);
    const end   = begin + 24;

    container.innerHTML = hourly.time.slice(begin, end).map((t, i) => {
      const idx = begin + i;
      const d = new Date(t);
      const wc = getWeatherCode(hourly.weather_code[idx]);
      const tempC = hourly.temperature_2m[idx];
      const rain  = hourly.precipitation_probability[idx] ?? 0;
      const wind  = Math.round(hourly.wind_speed_10m[idx]);
      const isNow = i === 0;
      return `<div class="hour-card ${isNow ? 'now' : ''}" role="listitem">
        <span class="h-time">${isNow ? 'Now' : fmtTime(d)}</span>
        <span class="h-icon">${wc.icon}</span>
        <span class="h-temp">${fmtTemp(tempC)}</span>
        <span class="h-rain">💧 ${rain}%</span>
        <span class="h-wind">💨 ${wind}</span>
      </div>`;
    }).join('');

    renderHourlyChart(hourly, _unit);
  }

  // ─── Daily ──────────────────────────────────────────────────────────────────
  function renderDaily(data) {
    const daily = data.weather?.daily;
    if (!daily) return;

    const grid = document.getElementById('daily-grid');
    grid.innerHTML = daily.time.map((t, i) => {
      const d = new Date(t + 'T12:00:00');
      const wc = getWeatherCode(daily.weather_code[i]);
      const hi  = fmtTemp(daily.temperature_2m_max[i]);
      const lo  = fmtTemp(daily.temperature_2m_min[i]);
      const rain = daily.precipitation_probability_max[i] ?? 0;
      const wind = Math.round(daily.wind_speed_10m_max[i]);
      const isToday = i === 0;
      const dayLabel = isToday ? 'Today' : d.toLocaleDateString('en-BM', { weekday: 'short' });
      return `<div class="day-card" role="listitem">
        <span class="d-name">${dayLabel}</span>
        <span class="d-icon">${wc.icon}</span>
        <div class="d-temps">
          <span class="d-hi">${hi}</span>
          <span class="d-lo">${lo}</span>
        </div>
        <span class="d-rain">💧 ${rain}%</span>
        <span class="d-wind">💨 ${wind} km/h</span>
      </div>`;
    }).join('');
  }

  // ─── Storms ─────────────────────────────────────────────────────────────────
  function renderStorms(data) {
    updateStormMap(data.storms || [], data.buoy);
    renderBuoy(data.buoy);
  }

  function renderBuoy(buoy) {
    if (!buoy) return;
    const d = buoy;
    document.getElementById('buoy-wave').textContent   = d.waveHeight   != null ? `${d.waveHeight.toFixed(1)} m`   : '—';
    document.getElementById('buoy-period').textContent = d.domPeriod    != null ? `${d.domPeriod.toFixed(0)} s`    : '—';
    document.getElementById('buoy-temp').textContent   = d.waterTemp    != null ? `${d.waterTemp.toFixed(1)} °C`   : '—';
    document.getElementById('buoy-wind').textContent   = d.windSpeed    != null ? `${Math.round(d.windSpeed)} km/h` : '—';
  }

  // ─── Wind Detail ────────────────────────────────────────────────────────────
  function renderWindDetail(data) {
    const cur = data.weather?.current;
    if (!cur) return;

    const arrow = document.getElementById('wind-arrow');
    if (arrow) arrow.style.transform = `rotate(${cur.wind_direction_10m}deg)`;

    const bf = getBeaufort(cur.wind_speed_10m);
    const bfEl = document.getElementById('wind-beaufort');
    if (bfEl) bfEl.textContent = `Bft ${bf.num} – ${bf.label}`;

    renderWindChart(data.weather?.hourly);
  }

  // ─── Unit toggle ────────────────────────────────────────────────────────────
  function setUnit(u) {
    _unit = u;
    document.getElementById('btn-c').classList.toggle('active', u === 'C');
    document.getElementById('btn-f').classList.toggle('active', u === 'F');
    document.getElementById('btn-c').setAttribute('aria-pressed', u === 'C' ? 'true' : 'false');
    document.getElementById('btn-f').setAttribute('aria-pressed', u === 'F' ? 'true' : 'false');
    if (_data) {
      // Re-render temp-dependent elements
      renderHero(_data);
      renderQuickStats(_data);
      renderHourly(_data);
      renderDaily(_data);
      updateHourlyChartUnit(u, _data.weather?.hourly);
    }
  }

  // ─── Clock ──────────────────────────────────────────────────────────────────
  function startClock() {
    function tick() {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-BM', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'America/Halifax',
      });
      const timeStr = now.toLocaleTimeString('en-BM', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'America/Halifax',
      });
      const dateEl = document.getElementById('hero-date');
      const timeEl = document.getElementById('hero-time');
      if (dateEl) dateEl.textContent = dateStr;
      if (timeEl) timeEl.textContent = timeStr;
    }
    tick();
    _clockTimer = setInterval(tick, 1000);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function fmtTemp(c) {
    if (c == null) return '—';
    if (_unit === 'F') return `${Math.round(c * 9/5 + 32)}°F`;
    return `${Math.round(c)}°C`;
  }

  function fmtTime(d) {
    return d.toLocaleTimeString('en-BM', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Halifax' });
  }

  // Approximate dew point (Magnus formula)
  function calcDewPoint(tempC, rh) {
    const a = 17.27, b = 237.7;
    const gamma = (a * tempC) / (b + tempC) + Math.log(rh / 100);
    return (b * gamma) / (a - gamma);
  }

  function setRefreshing(on) {
    const btn = document.getElementById('btn-refresh');
    if (btn) btn.classList.toggle('loading', on);
  }

  function setLoadingMsg(msg) {
    const el = document.getElementById('loading-msg');
    if (el) el.textContent = msg;
  }

  function hideOverlay() {
    stopVerses();
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.add('hidden');
    setTimeout(() => { if (el) el.style.display = 'none'; }, 500);
  }

  // ─── Verse cycling ──────────────────────────────────────────────────────────
  function nextRandomVerse() {
    // Refill pool with a fresh Fisher-Yates shuffle when empty
    if (!_versePool.length) {
      _versePool = VERSES.map((_, i) => i);
      for (let i = _versePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [_versePool[i], _versePool[j]] = [_versePool[j], _versePool[i]];
      }
    }
    return VERSES[_versePool.pop()];
  }

  function startVerses() {
    const el = document.getElementById('loading-verse');
    if (!el) return;
    function show() {
      el.classList.remove('visible');
      setTimeout(() => {
        el.textContent = nextRandomVerse();
        el.classList.add('visible');
      }, 650);
    }
    show();
    // 8 s visible + 650 ms fade gap = 8650 ms total interval
    _verseTimer = setInterval(show, 8650);
  }

  function stopVerses() {
    if (_verseTimer) { clearInterval(_verseTimer); _verseTimer = null; }
    const el = document.getElementById('loading-verse');
    if (el) el.classList.remove('visible');
  }

  // ─── Section nav observer ────────────────────────────────────────────────────
  function initSectionNav() {
    const sectionIds = ['hero', 'ocean', 'hourly', 'daily', 'storms', 'wind'];
    const btns = document.querySelectorAll('.snav-btn');
    if (!btns.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          btns.forEach(b => b.classList.remove('active'));
          const active = document.querySelector(`.snav-btn[href="#${e.target.id}"]`);
          if (active) {
            active.classList.add('active');
            // Keep the active pill visible in the scrollable nav
            active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
  }

  // ─── Start ──────────────────────────────────────────────────────────────────
  // Scripts are at bottom of <body>, so DOM is already ready when this runs.
  // Use DOMContentLoaded only as a fallback for synchronous edge cases.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { refresh, setUnit };
})();
