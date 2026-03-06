// BDA Weather – Chart renderers (Chart.js 4)

// ─── Shared palette from CSS vars ────────────────────────────────────────────
const CHART_COLORS = {
  teal400:   '#2dd4bf',
  teal500:   '#14b8a6',
  teal50:    '#f0fdfa',
  neutral300:'#d4d4d4',
  neutral200:'#e5e5e5',
  blue400:   '#60a5fa',
  orange400: '#fb923c',
  red500:    '#ef4444',
  white:     '#ffffff',
};

const CHART_DEFAULTS = {
  animation: { duration: 600, easing: 'easeOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1a1a',
      titleColor: '#e5e5e5',
      bodyColor: '#a3a3a3',
      borderColor: '#333',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { color: CHART_COLORS.neutral200, drawBorder: false },
      ticks: { color: '#737373', font: { size: 11, family: 'Inter' } },
    },
    y: {
      grid: { color: CHART_COLORS.neutral200, drawBorder: false },
      ticks: { color: '#737373', font: { size: 11, family: 'Inter' } },
    },
  },
};

// Merge helper
function mergeDeep(target, source) {
  const out = Object.assign({}, target);
  Object.keys(source).forEach(k => {
    if (source[k] && typeof source[k] === 'object' && !Array.isArray(source[k])) {
      out[k] = mergeDeep(target[k] || {}, source[k]);
    } else {
      out[k] = source[k];
    }
  });
  return out;
}

// Registry so we can destroy/recreate on refresh
const CHART_REGISTRY = {};

function destroyChart(id) {
  if (CHART_REGISTRY[id]) { CHART_REGISTRY[id].destroy(); delete CHART_REGISTRY[id]; }
}

// ─── "Now" vertical line plugin ───────────────────────────────────────────────
const nowLinePlugin = {
  id: 'nowLine',
  afterDraw(chart) {
    const xScale = chart.scales.x;
    if (!xScale) return;

    // Current time in Atlantic timezone (HH:MM)
    const now = new Date();
    const nowLabel = now.toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Halifax', hour12: false
    });

    // Find the closest label index
    const labels = chart.data.labels;
    let bestIdx = -1;
    let bestDiff = Infinity;
    labels.forEach((lbl, i) => {
      const [lH, lM] = lbl.split(':').map(Number);
      const [nH, nM] = nowLabel.split(':').map(Number);
      const diff = Math.abs((lH * 60 + lM) - (nH * 60 + nM));
      if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
    });
    if (bestIdx === -1 || bestDiff > 60) return; // skip if no close match

    // Interpolate sub-index position for precision
    const [nH, nM] = nowLabel.split(':').map(Number);
    const nowMins = nH * 60 + nM;
    const [bH, bM] = labels[bestIdx].split(':').map(Number);
    const bestMins = bH * 60 + bM;
    let pixelX;
    if (bestMins === nowMins) {
      pixelX = xScale.getPixelForValue(bestIdx);
    } else if (bestMins < nowMins && bestIdx < labels.length - 1) {
      const [nextH, nextM] = labels[bestIdx + 1].split(':').map(Number);
      const nextMins = nextH * 60 + nextM;
      const frac = (nowMins - bestMins) / (nextMins - bestMins);
      pixelX = xScale.getPixelForValue(bestIdx) + frac * (xScale.getPixelForValue(bestIdx + 1) - xScale.getPixelForValue(bestIdx));
    } else if (bestMins > nowMins && bestIdx > 0) {
      const [prevH, prevM] = labels[bestIdx - 1].split(':').map(Number);
      const prevMins = prevH * 60 + prevM;
      const frac = (nowMins - prevMins) / (bestMins - prevMins);
      pixelX = xScale.getPixelForValue(bestIdx - 1) + frac * (xScale.getPixelForValue(bestIdx) - xScale.getPixelForValue(bestIdx - 1));
    } else {
      pixelX = xScale.getPixelForValue(bestIdx);
    }

    const { ctx: c, chartArea: { top, bottom } } = chart;
    c.save();
    c.beginPath();
    c.setLineDash([4, 3]);
    c.lineWidth = 1.5;
    c.strokeStyle = CHART_COLORS.red500;
    c.moveTo(pixelX, top);
    c.lineTo(pixelX, bottom);
    c.stroke();
    c.setLineDash([]);

    // "Now" label
    c.font = 'bold 10px Inter, sans-serif';
    c.fillStyle = CHART_COLORS.red500;
    c.textAlign = 'center';
    c.fillText('Now', pixelX, top - 4);
    c.restore();
  },
};

// ─── Tide Chart ───────────────────────────────────────────────────────────────
function renderTideChart(hourlyPredictions, hiLo) {
  destroyChart('tide');
  const ctx = document.getElementById('chart-tide');
  if (!ctx || !hourlyPredictions.length) return;

  const labels = hourlyPredictions.map(p => {
    const d = new Date(p.t);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const values = hourlyPredictions.map(p => parseFloat(p.v));

  // Build hi/lo marker overlay dataset – same x positions, null elsewhere
  const hiLoOverlay = new Array(values.length).fill(null);
  const hiLoColors = new Array(values.length).fill('transparent');
  const hiLoRadii = new Array(values.length).fill(0);

  hiLo.forEach(t => {
    const d = new Date(t.t);
    const lbl = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const idx = labels.indexOf(lbl);
    if (idx !== -1) {
      hiLoOverlay[idx] = values[idx];
      hiLoColors[idx] = t.type === 'H' ? CHART_COLORS.teal500 : '#94a3b8';
      hiLoRadii[idx] = 5;
    }
  });

  CHART_REGISTRY['tide'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Tide (m)',
          data: values,
          borderColor: CHART_COLORS.teal500,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          backgroundColor: (ctx2) => {
            const gradient = ctx2.chart.ctx.createLinearGradient(0, 0, 0, ctx2.chart.height);
            gradient.addColorStop(0, 'rgba(20,184,166,.25)');
            gradient.addColorStop(1, 'rgba(20,184,166,.02)');
            return gradient;
          },
          tension: 0.4,
        },
        {
          label: 'Hi/Lo',
          data: hiLoOverlay,
          borderColor: 'transparent',
          backgroundColor: hiLoColors,
          pointBackgroundColor: hiLoColors,
          pointRadius: hiLoRadii,
          pointHoverRadius: 7,
          showLine: false,
          tension: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: ctx2 => {
              if (ctx2.dataset.label === 'Hi/Lo' && ctx2.parsed.y !== null) {
                const hiloEntry = hiLo.find(t => {
                  const d = new Date(t.t);
                  const lbl = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                  return lbl === ctx2.label;
                });
                return hiloEntry ? ` ${hiloEntry.type === 'H' ? '▲ HIGH' : '▽ LOW'}: ${ctx2.parsed.y.toFixed(2)} m` : null;
              }
              return ctx2.dataset.label === 'Tide (m)' ? ` ${ctx2.parsed.y.toFixed(2)} m` : null;
            },
            filter: ctx2 => ctx2.parsed.y !== null,
          },
        },
      },
      scales: {
        x: {
          ...CHART_DEFAULTS.scales.x,
          ticks: { ...CHART_DEFAULTS.scales.x.ticks, maxTicksLimit: 12, maxRotation: 0 },
        },
        y: {
          ...CHART_DEFAULTS.scales.y,
          title: { display: true, text: 'Height (m)', color: '#a3a3a3', font: { size: 10 } },
        },
      },
    },
  });
}
// ─── Hourly Temperature + Precipitation Chart ────────────────────────────────
function renderHourlyChart(hourlyData, unit) {
  destroyChart('hourly');
  const ctx = document.getElementById('chart-hourly');
  if (!ctx || !hourlyData) return;

  const now = new Date();
  const hours = hourlyData.time.slice(0, 24);
  const temps = hourlyData.temperature_2m.slice(0, 24);
  const rain  = hourlyData.precipitation.slice(0, 24);

  const labels = hours.map(t => {
    const d = new Date(t);
    return `${String(d.getHours()).padStart(2,'0')}:00`;
  });

  const displayTemps = unit === 'F' ? temps.map(t => t * 9/5 + 32) : temps;

  CHART_REGISTRY['hourly'] = new Chart(ctx, {
    type: 'bar',
    plugins: [nowLinePlugin],
    data: {
      labels,
      datasets: [
        {
          type: 'line',
          label: `Temp (°${unit})`,
          data: displayTemps.map(t => Math.round(t * 10) / 10),
          borderColor: CHART_COLORS.teal500,
          borderWidth: 2,
          pointRadius: 2,
          pointBackgroundColor: CHART_COLORS.teal500,
          fill: false,
          tension: 0.4,
          yAxisID: 'yTemp',
          order: 1,
        },
        {
          type: 'bar',
          label: 'Precip (mm)',
          data: rain,
          backgroundColor: 'rgba(96,165,250,.45)',
          borderColor: 'rgba(96,165,250,.7)',
          borderWidth: 1,
          borderRadius: 3,
          yAxisID: 'yRain',
          order: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            font: { size: 11, family: 'Inter' },
            color: '#737373',
            boxWidth: 12,
            padding: 12,
          },
        },
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: ctx2 => {
              const ds = ctx2.dataset.label;
              return ` ${ds}: ${ctx2.parsed.y}`;
            },
          },
        },
      },
      scales: {
        x: {
          ...CHART_DEFAULTS.scales.x,
          ticks: { ...CHART_DEFAULTS.scales.x.ticks, maxTicksLimit: 12, maxRotation: 0 },
        },
        yTemp: {
          ...CHART_DEFAULTS.scales.y,
          position: 'left',
          title: { display: true, text: `°${unit}`, color: '#a3a3a3', font: { size: 10 } },
        },
        yRain: {
          ...CHART_DEFAULTS.scales.y,
          position: 'right',
          title: { display: true, text: 'mm', color: '#a3a3a3', font: { size: 10 } },
          grid: { display: false },
          beginAtZero: true,
          min: 0,
        },
      },
    },
  });
}

// ─── Wind Chart ───────────────────────────────────────────────────────────────
function renderWindChart(hourlyData) {
  destroyChart('wind');
  const ctx = document.getElementById('chart-wind');
  if (!ctx || !hourlyData) return;

  const hours  = hourlyData.time.slice(0, 24);
  const speeds = hourlyData.wind_speed_10m.slice(0, 24);
  const gusts  = hourlyData.wind_gusts_10m.slice(0, 24);

  const labels = hours.map(t => {
    const d = new Date(t);
    return `${String(d.getHours()).padStart(2,'0')}:00`;
  });

  CHART_REGISTRY['wind'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Gusts',
          data: gusts,
          borderColor: 'rgba(251,146,60,.5)',
          borderWidth: 1,
          borderDash: [4, 3],
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Wind Speed',
          data: speeds,
          borderColor: CHART_COLORS.teal500,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          backgroundColor: 'rgba(20,184,166,.12)',
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: {
          display: true, position: 'top', align: 'end',
          labels: { font: { size: 11, family: 'Inter' }, color: '#737373', boxWidth: 12, padding: 12 },
        },
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: { label: ctx2 => ` ${ctx2.dataset.label}: ${ctx2.parsed.y} km/h` },
        },
      },
      scales: {
        x: {
          ...CHART_DEFAULTS.scales.x,
          ticks: { ...CHART_DEFAULTS.scales.x.ticks, maxTicksLimit: 12, maxRotation: 0 },
        },
        y: {
          ...CHART_DEFAULTS.scales.y,
          title: { display: true, text: 'km/h', color: '#a3a3a3', font: { size: 10 } },
          beginAtZero: true,
          min: 0,
        },
      },
    },
  });
}

// ─── Update hourly chart unit without full re-render ─────────────────────────
function updateHourlyChartUnit(unit, hourlyData) {
  const chart = CHART_REGISTRY['hourly'];
  if (!chart || !hourlyData) return;
  const temps = hourlyData.temperature_2m.slice(0, 24);
  const displayTemps = unit === 'F' ? temps.map(t => Math.round((t * 9/5 + 32) * 10)/10) : temps.map(t => Math.round(t * 10)/10);
  chart.data.datasets[0].data = displayTemps;
  chart.data.datasets[0].label = `Temp (°${unit})`;
  chart.options.scales.yTemp.title.text = `°${unit}`;
  chart.update();
}
