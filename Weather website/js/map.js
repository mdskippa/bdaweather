// BDA Weather – Leaflet storm tracking map

let _map = null;
let _stormLayers = [];
let _buoyMarker = null;

const BDA_COORDS = [CONFIG.location.lat, CONFIG.location.lon];

function initMap() {
  if (_map) return; // already initialised

  _map = L.map('storm-map', {
    center: [30, -60],
    zoom: 4,
    zoomControl: true,
    attributionControl: true,
  });

  // Dark tile layer that suits the dark section background
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }
  ).addTo(_map);

  // Country/city labels layer (lighter)
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
    { subdomains: 'abcd', maxZoom: 19, opacity: 0.6 }
  ).addTo(_map);

  // Bermuda marker
  const bdaIcon = L.divIcon({
    html: `<div style="
      width:14px;height:14px;
      background:#2dd4bf;border:2px solid #fff;
      border-radius:50%;box-shadow:0 0 0 4px rgba(45,212,191,.3);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    className: '',
  });

  L.marker(BDA_COORDS, { icon: bdaIcon })
    .bindTooltip('Bermuda', { permanent: true, direction: 'right', className: 'bda-tooltip', offset: [10, 0] })
    .addTo(_map);

  // Add custom tooltip style dynamically
  const style = document.createElement('style');
  style.textContent = `
    .bda-tooltip {
      background: rgba(0,0,0,.7) !important;
      border: 1px solid #2dd4bf !important;
      color: #2dd4bf !important;
      font-weight: 600 !important;
      font-size: 11px !important;
      border-radius: 6px !important;
      box-shadow: none !important;
      padding: 3px 8px !important;
      white-space: nowrap !important;
    }
    .bda-tooltip::before { display: none !important; }
  `;
  document.head.appendChild(style);
}

// ─── Update storms on the map ──────────────────────────────────────────────────
function updateStormMap(storms, buoyData) {
  if (!_map) initMap();

  // Clear previous storm layers
  _stormLayers.forEach(l => l.remove());
  _stormLayers = [];

  // Update buoy marker
  updateBuoyMarker(buoyData);

  // Render storms
  storms.forEach(storm => {
    renderStorm(storm);
  });

  // Update sidebar
  renderStormList(storms);
}

function renderStorm(storm) {
  try {
    const lat = parseFloat(storm.lat || storm.centerLat);
    const lon = parseFloat(storm.lon || storm.centerLon);
    if (isNaN(lat) || isNaN(lon)) return;

    const windKph = parseFloat(storm.maxWindMph || storm.windSpeed || 0) * 1.60934;
    const cat = getStormCategory(windKph);

    const stormIcon = L.divIcon({
      html: `<div style="
        width:32px;height:32px;
        background:${cat.color};
        border:2px solid rgba(255,255,255,.6);
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:700;color:#fff;
        box-shadow:0 0 12px ${cat.color}88;
        animation:pulse 2s infinite;
      ">${cat.abbr}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      className: '',
    });

    const distKm = Math.round(haversineKm(CONFIG.location.lat, CONFIG.location.lon, lat, lon));
    const distNm = Math.round(distKm * 0.539957);

    const popup = L.popup({ className: 'storm-popup' }).setContent(`
      <div style="font-family:Inter,sans-serif;min-width:180px">
        <div style="font-weight:700;font-size:14px;color:#0f766e;margin-bottom:4px">
          🌀 ${storm.name || 'Unnamed System'}
        </div>
        <div style="font-size:12px;color:#374151;line-height:1.7">
          <div><strong>Category:</strong> ${cat.label}</div>
          <div><strong>Winds:</strong> ${Math.round(windKph)} km/h</div>
          <div><strong>Position:</strong> ${lat.toFixed(1)}°N, ${Math.abs(lon).toFixed(1)}°W</div>
          <div style="margin-top:6px;color:#0f766e;font-weight:600">
            📍 ${distKm.toLocaleString()} km (${distNm} nm) from Bermuda
          </div>
        </div>
      </div>
    `);

    const marker = L.marker([lat, lon], { icon: stormIcon }).bindPopup(popup);
    marker.addTo(_map);
    _stormLayers.push(marker);

    // Dashed circle showing distance to Bermuda
    const ring = L.circle(BDA_COORDS, {
      radius: distKm * 1000,
      color: cat.color,
      weight: 1,
      dashArray: '6 6',
      fill: false,
      opacity: 0.35,
    }).addTo(_map);
    _stormLayers.push(ring);

  } catch (e) {
    console.warn('Storm render error:', e);
  }
}

function updateBuoyMarker(buoyData) {
  if (_buoyMarker) { _buoyMarker.remove(); _buoyMarker = null; }
  if (!buoyData) return;

  const buoyIcon = L.divIcon({
    html: `<div style="
      width:10px;height:10px;
      background:#fb923c;border:2px solid #fff;
      border-radius:50%;
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    className: '',
  });

  const waveStr = buoyData.waveHeight != null ? `${buoyData.waveHeight.toFixed(1)}m` : '—';
  const tempStr = buoyData.waterTemp != null ? `${buoyData.waterTemp.toFixed(1)}°C` : '—';

  _buoyMarker = L.marker([buoyData.lat, buoyData.lon], { icon: buoyIcon })
    .bindTooltip(
      `🛟 Buoy 41049<br>Wave: ${waveStr} | Water: ${tempStr}`,
      { direction: 'top', className: 'bda-tooltip' }
    )
    .addTo(_map);
}

// ─── Sidebar storm list ────────────────────────────────────────────────────────
function renderStormList(storms) {
  const container = document.getElementById('storm-list');
  if (!container) return;

  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const isHurricaneSeason = month >= 6 && month <= 11;

  if (!storms.length) {
    container.innerHTML = `
      <div class="no-storms">
        <div class="ns-icon">🌤️</div>
        <h3>No Active Tropical Systems</h3>
        <p>The Atlantic basin is currently quiet.<br>Conditions near Bermuda are calm.</p>
        <div class="season-badge ${isHurricaneSeason ? 'active' : 'inactive'}">
          ${isHurricaneSeason
            ? '⚠️ Hurricane Season Active (Jun–Nov)'
            : '✓ Outside Hurricane Season'}
        </div>
      </div>`;
    return;
  }

  container.innerHTML = storms.map(storm => {
    const windKph = parseFloat(storm.maxWindMph || storm.windSpeed || 0) * 1.60934;
    const cat = getStormCategory(windKph);
    const lat = parseFloat(storm.lat || storm.centerLat || 0);
    const lon = parseFloat(storm.lon || storm.centerLon || 0);
    const distKm = !isNaN(lat) ? Math.round(haversineKm(CONFIG.location.lat, CONFIG.location.lon, lat, lon)) : null;

    return `<div class="storm-item">
      <div class="storm-badge" style="background:${cat.color}">${cat.abbr}</div>
      <div class="storm-info">
        <h4>🌀 ${storm.name || 'Unnamed'}</h4>
        <p>${cat.label} · ${Math.round(windKph)} km/h winds</p>
        ${distKm != null ? `<div class="storm-dist">📍 ${distKm.toLocaleString()} km from Bermuda</div>` : ''}
      </div>
    </div>`;
  }).join('');
}
