// BDA Weather – API module
// All fetch functions return normalised data objects

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function proxied(url) {
  return CONFIG.apis.corsProxy + encodeURIComponent(url);
}

// ─── Open-Meteo weather ───────────────────────────────────────────────────────
async function fetchWeather() {
  const p = CONFIG.openMeteoParams;
  const url = new URL(CONFIG.apis.openMeteo);
  url.searchParams.set('latitude',  CONFIG.location.lat);
  url.searchParams.set('longitude', CONFIG.location.lon);
  url.searchParams.set('timezone',  CONFIG.location.timezone);
  url.searchParams.set('current',   p.current.join(','));
  url.searchParams.set('hourly',    p.hourly.join(','));
  url.searchParams.set('daily',     p.daily.join(','));
  url.searchParams.set('forecast_days', 7);
  url.searchParams.set('wind_speed_unit', 'kmh');
  url.searchParams.set('temperature_unit', 'celsius');
  url.searchParams.set('precipitation_unit', 'mm');
  return fetchJSON(url.toString());
}

// ─── Open-Meteo marine ────────────────────────────────────────────────────────
async function fetchMarine() {
  const p = CONFIG.openMeteoMarineParams;
  const url = new URL(CONFIG.apis.openMeteoMarine);
  url.searchParams.set('latitude',  CONFIG.location.lat);
  url.searchParams.set('longitude', CONFIG.location.lon);
  url.searchParams.set('timezone',  CONFIG.location.timezone);
  url.searchParams.set('current',   p.current.join(','));
  url.searchParams.set('hourly',    p.hourly.join(','));
  url.searchParams.set('daily',     p.daily.join(','));
  url.searchParams.set('forecast_days', 7);
  return fetchJSON(url.toString());
}

// ─── NOAA Tides ───────────────────────────────────────────────────────────────
async function fetchTides() {
  const today  = fmtDate(new Date());
  const d2     = fmtDate(addDays(new Date(), 2));

  // hi/lo tide predictions (most compact)
  const hiloUrl = buildTidesUrl(today, d2, 'predictions', 'hilo');
  // Hourly curve for chart
  const hourlyUrl = buildTidesUrl(today, d2, 'predictions', 'h');

  const [hiloRes, hourlyRes] = await Promise.allSettled([
    fetchJSON(proxied(hiloUrl)),
    fetchJSON(proxied(hourlyUrl)),
  ]);

  return {
    hiLo:   hiloRes.status   === 'fulfilled' ? (hiloRes.value.predictions   || []) : [],
    hourly: hourlyRes.status === 'fulfilled' ? (hourlyRes.value.predictions || []) : [],
  };
}

function buildTidesUrl(begin, end, product, interval) {
  const url = new URL(CONFIG.apis.noaaTides);
  url.searchParams.set('station',   CONFIG.noaa.tideStation);
  url.searchParams.set('begin_date', begin);
  url.searchParams.set('end_date',   end);
  url.searchParams.set('product',    product);
  url.searchParams.set('datum',      'MLLW');
  url.searchParams.set('time_zone',  'lst_ldt');
  url.searchParams.set('interval',   interval);
  url.searchParams.set('units',      'metric');
  url.searchParams.set('application','web_services');
  url.searchParams.set('format',     'json');
  return url.toString();
}

function fmtDate(d) {
  return [
    d.getFullYear(),
    String(d.getMonth()+1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0'),
  ].join('');
}

function addDays(d, n) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

// ─── NOAA NHC Active Storms ───────────────────────────────────────────────────
async function fetchStorms() {
  try {
    const data = await fetchJSON(proxied(CONFIG.apis.nhcStorms));
    return data.activeStorms || [];
  } catch {
    return [];
  }
}

// ─── NDBC Buoy (text parse) ───────────────────────────────────────────────────
async function fetchBuoy() {
  try {
    const url = CONFIG.apis.ndbc + CONFIG.noaa.buoyId + '.txt';
    const txt  = await fetchText(proxied(url));
    return parseBuoyText(txt);
  } catch {
    return null;
  }
}

function parseBuoyText(txt) {
  const lines = txt.trim().split('\n');
  // Line 0: header row, Line 1: units row, Line 2: most recent obs
  if (lines.length < 3) return null;

  const headers = lines[0].replace(/^#/, '').trim().split(/\s+/);
  const values  = lines[2].trim().split(/\s+/);

  const row = {};
  headers.forEach((h, i) => { row[h] = values[i]; });

  const mm = v => v === 'MM' ? null : parseFloat(v);
  return {
    waveHeight:  mm(row['WVHT']),   // m
    domPeriod:   mm(row['DPD']),    // s
    avgPeriod:   mm(row['APD']),    // s
    waveDir:     mm(row['MWD']),    // deg
    waterTemp:   mm(row['WTMP']),   // °C
    windSpeed:   row['WSPD'] ? mm(row['WSPD']) * 3.6 : null, // m/s → km/h
    windDir:     mm(row['WDIR']),
    pressure:    mm(row['PRES']),
    lat:  parseFloat(row['LAT']  || '27.5'),
    lon:  parseFloat(row['LON']  || '-62.3'),
    buoyId: CONFIG.noaa.buoyId,
  };
}

// ─── Aggregate all API calls ──────────────────────────────────────────────────
async function fetchAllData() {
  const [weather, marine, tides, storms, buoy] = await Promise.allSettled([
    fetchWeather(),
    fetchMarine(),
    fetchTides(),
    fetchStorms(),
    fetchBuoy(),
  ]);

  return {
    weather: weather.status === 'fulfilled' ? weather.value : null,
    marine:  marine.status  === 'fulfilled' ? marine.value  : null,
    tides:   tides.status   === 'fulfilled' ? tides.value   : { hiLo: [], hourly: [] },
    storms:  storms.status  === 'fulfilled' ? storms.value  : [],
    buoy:    buoy.status    === 'fulfilled' ? buoy.value    : null,
  };
}
