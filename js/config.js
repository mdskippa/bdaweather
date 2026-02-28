// BDA Weather – Configuration
const CONFIG = {
  location: {
    name: 'Bermuda',
    lat: 32.3078,
    lon: -64.7505,
    timezone: 'America/Halifax', // AST UTC-4
    country: 'BM',
  },

  noaa: {
    tideStation: '2695540',       // Bermuda, St. Georges Island
    buoyId: '41049',              // South Bermuda buoy (~300 NM SSE)
    buoyId2: '41425',             // SW Bermuda buoy
  },

  apis: {
    openMeteo: 'https://api.open-meteo.com/v1/forecast',
    openMeteoMarine: 'https://marine-api.open-meteo.com/v1/marine',
    noaaTides: 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter',
    nhcStorms: 'https://www.nhc.noaa.gov/CurrentStorms.json',
    ndbc: 'https://www.ndbc.noaa.gov/data/realtime2/',
    corsProxy: 'https://api.allorigins.win/raw?url=',
  },

  refreshInterval: 10 * 60 * 1000, // 10 minutes in ms

  openMeteoParams: {
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'visibility',
      'uv_index',
      'is_day',
    ],
    hourly: [
      'temperature_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'visibility',
      'uv_index',
    ],
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'weather_code',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant',
      'sunrise',
      'sunset',
      'uv_index_max',
    ],
  },

  openMeteoMarineParams: {
    current: [
      'wave_height',
      'wave_direction',
      'wave_period',
      'wind_wave_height',
      'swell_wave_height',
      'swell_wave_direction',
      'swell_wave_period',
      'sea_surface_temperature',
      'ocean_current_velocity',
      'ocean_current_direction',
    ],
    hourly: [
      'wave_height',
      'wave_direction',
      'wave_period',
      'swell_wave_height',
      'swell_wave_direction',
      'sea_surface_temperature',
    ],
    daily: [
      'wave_height_max',
      'wave_period_max',
    ],
  },
};
