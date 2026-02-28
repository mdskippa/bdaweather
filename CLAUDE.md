# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project
BDA Weather – a real-time weather website for Bermuda. No build step; open `index.html` directly in a browser.

## Architecture

```
index.html          Entry point, all HTML sections
css/styles.css      Full stylesheet using the provided CSS custom properties
js/config.js        Bermuda coordinates (32.3078°N, 64.7505°W), API endpoints, NOAA station IDs
js/weatherCodes.js  WMO weather code → icon/gradient/label mapping; utility functions
                    (degToCardinal, getBeaufort, uvLabel, getStormCategory, haversineKm)
js/api.js           All fetch functions: fetchWeather(), fetchMarine(), fetchTides(),
                    fetchStorms(), fetchBuoy(), and fetchAllData() aggregate
js/charts.js        Chart.js 4 renderers: renderTideChart(), renderHourlyChart(), renderWindChart()
js/map.js           Leaflet map init and storm/buoy marker rendering
js/app.js           Main IIFE (window.App): render pipeline, unit toggle (°C/°F), clock, auto-refresh
```

Script load order in index.html: config → weatherCodes → api → charts → map → app.

## Data Sources (all free, no API keys)
- **Open-Meteo** – weather + marine (direct CORS, no proxy)
- **NOAA CO-OPS** – tides at station 2695540 (St. Georges, Bermuda) via allorigins.win CORS proxy
- **NOAA NHC** – active Atlantic storms via allorigins.win CORS proxy
- **NDBC buoy 41049** – South Bermuda ocean obs, text-format parsed via allorigins.win

## Key Patterns
- All global helpers (degToCardinal, etc.) live in `weatherCodes.js` and are accessed directly by other files.
- `window.App.refresh()` and `window.App.setUnit()` are the public API called from HTML onclick handlers.
- Charts are tracked in `CHART_REGISTRY` in `charts.js`; call `destroyChart(id)` before re-rendering.
- Tide hi/lo points are rendered as a second dataset overlay (no annotation plugin needed).
- All temperature display goes through `fmtTemp(c)` in app.js which respects `_unit`.
