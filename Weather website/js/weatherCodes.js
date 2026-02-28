// WMO Weather Code mappings → icon, description, gradient class
const WEATHER_CODES = {
  0:  { icon: '☀️',  label: 'Clear Sky',           gradient: 'grad-clear',    svg: 'sunny' },
  1:  { icon: '🌤️', label: 'Mainly Clear',         gradient: 'grad-clear',    svg: 'sunny' },
  2:  { icon: '⛅',  label: 'Partly Cloudy',        gradient: 'grad-cloudy',   svg: 'partly-cloudy' },
  3:  { icon: '☁️',  label: 'Overcast',             gradient: 'grad-cloudy',   svg: 'cloudy' },
  45: { icon: '🌫️', label: 'Foggy',                gradient: 'grad-fog',      svg: 'fog' },
  48: { icon: '🌫️', label: 'Depositing Rime Fog',  gradient: 'grad-fog',      svg: 'fog' },
  51: { icon: '🌦️', label: 'Light Drizzle',        gradient: 'grad-rain',     svg: 'drizzle' },
  53: { icon: '🌦️', label: 'Moderate Drizzle',     gradient: 'grad-rain',     svg: 'drizzle' },
  55: { icon: '🌧️', label: 'Dense Drizzle',        gradient: 'grad-rain',     svg: 'rain' },
  61: { icon: '🌧️', label: 'Slight Rain',          gradient: 'grad-rain',     svg: 'rain' },
  63: { icon: '🌧️', label: 'Moderate Rain',        gradient: 'grad-rain',     svg: 'rain' },
  65: { icon: '🌧️', label: 'Heavy Rain',           gradient: 'grad-storm',    svg: 'heavy-rain' },
  71: { icon: '🌨️', label: 'Slight Snow',          gradient: 'grad-snow',     svg: 'snow' },
  73: { icon: '🌨️', label: 'Moderate Snow',        gradient: 'grad-snow',     svg: 'snow' },
  75: { icon: '❄️',  label: 'Heavy Snow',           gradient: 'grad-snow',     svg: 'heavy-snow' },
  77: { icon: '🌨️', label: 'Snow Grains',          gradient: 'grad-snow',     svg: 'snow' },
  80: { icon: '🌦️', label: 'Slight Showers',       gradient: 'grad-rain',     svg: 'showers' },
  81: { icon: '🌦️', label: 'Moderate Showers',     gradient: 'grad-rain',     svg: 'showers' },
  82: { icon: '🌧️', label: 'Violent Showers',      gradient: 'grad-storm',    svg: 'heavy-rain' },
  85: { icon: '🌨️', label: 'Snow Showers',         gradient: 'grad-snow',     svg: 'snow' },
  86: { icon: '❄️',  label: 'Heavy Snow Showers',   gradient: 'grad-snow',     svg: 'heavy-snow' },
  95: { icon: '⛈️',  label: 'Thunderstorm',         gradient: 'grad-thunder',  svg: 'thunder' },
  96: { icon: '⛈️',  label: 'Thunderstorm w/ Hail', gradient: 'grad-thunder',  svg: 'thunder' },
  99: { icon: '⛈️',  label: 'Thunderstorm w/ Heavy Hail', gradient: 'grad-thunder', svg: 'thunder' },
};

function getWeatherCode(code) {
  return WEATHER_CODES[code] || { icon: '🌡️', label: 'Unknown', gradient: 'grad-clear', svg: 'sunny' };
}

// Beaufort scale
function getBeaufort(kmh) {
  if (kmh < 1)   return { num: 0, label: 'Calm' };
  if (kmh < 6)   return { num: 1, label: 'Light Air' };
  if (kmh < 12)  return { num: 2, label: 'Light Breeze' };
  if (kmh < 20)  return { num: 3, label: 'Gentle Breeze' };
  if (kmh < 29)  return { num: 4, label: 'Moderate Breeze' };
  if (kmh < 39)  return { num: 5, label: 'Fresh Breeze' };
  if (kmh < 50)  return { num: 6, label: 'Strong Breeze' };
  if (kmh < 62)  return { num: 7, label: 'Near Gale' };
  if (kmh < 75)  return { num: 8, label: 'Gale' };
  if (kmh < 89)  return { num: 9, label: 'Severe Gale' };
  if (kmh < 103) return { num: 10, label: 'Storm' };
  if (kmh < 118) return { num: 11, label: 'Violent Storm' };
  return { num: 12, label: 'Hurricane Force' };
}

// Cardinal wind direction from degrees
function degToCardinal(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Tropical storm category
function getStormCategory(windKph) {
  const kt = windKph / 1.852;
  if (kt < 34)  return { label: 'Low',  color: '#94a3b8', abbr: 'L'  };
  if (kt < 64)  return { label: 'Tropical Storm', color: '#60a5fa', abbr: 'TS' };
  if (kt < 83)  return { label: 'Category 1', color: '#fbbf24', abbr: 'C1' };
  if (kt < 96)  return { label: 'Category 2', color: '#fb923c', abbr: 'C2' };
  if (kt < 113) return { label: 'Category 3', color: '#ef4444', abbr: 'C3' };
  if (kt < 137) return { label: 'Category 4', color: '#dc2626', abbr: 'C4' };
  return { label: 'Category 5', color: '#7f1d1d', abbr: 'C5' };
}

// Haversine distance in km
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// UV index label
function uvLabel(uv) {
  if (uv <= 2) return { label: 'Low', color: '#4ade80' };
  if (uv <= 5) return { label: 'Moderate', color: '#facc15' };
  if (uv <= 7) return { label: 'High', color: '#fb923c' };
  if (uv <= 10) return { label: 'Very High', color: '#ef4444' };
  return { label: 'Extreme', color: '#7c3aed' };
}

// Swell direction label
function swellDirLabel(deg) {
  const dirs = {
    N:'northerly', NNE:'north-northeasterly', NE:'northeasterly', ENE:'east-northeasterly',
    E:'easterly', ESE:'east-southeasterly', SE:'southeasterly', SSE:'south-southeasterly',
    S:'southerly', SSW:'south-southwesterly', SW:'southwesterly', WSW:'west-southwesterly',
    W:'westerly', WNW:'west-northwesterly', NW:'northwesterly', NNW:'north-northwesterly',
  };
  return dirs[degToCardinal(deg)] || 'variable';
}
