//
// Open‑Meteo API helper: geocoding + forecast fetch
//
// PUBLIC_INTERFACE
// getOpenMeteoBases
// Returns base URLs for Open‑Meteo forecast and geocoding using environment variables:
// - REACT_APP_OPEN_METEO_BASE (default: https://api.open-meteo.com)
// - REACT_APP_OPEN_METEO_GEOCODE_BASE (default: https://geocoding-api.open-meteo.com)
// Note: These are non-secret and safe to expose in frontend.
//
export function getOpenMeteoBases() {
  const forecastBase =
    (process.env.REACT_APP_OPEN_METEO_BASE || 'https://api.open-meteo.com').replace(/\/+$/, '');
  const geocodeBase =
    (process.env.REACT_APP_OPEN_METEO_GEOCODE_BASE || 'https://geocoding-api.open-meteo.com').replace(/\/+$/, '');
  return { forecastBase, geocodeBase };
}

/**
 * PUBLIC_INTERFACE
 * fetchJson
 * Generic JSON fetch with safe error handling.
 * @param {string} url - Full URL
 * @param {RequestInit} options - fetch options
 * @returns {Promise<any>} Parsed JSON
 * @throws Error with user-safe message
 */
export async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  const data = text ? tryJson(text) : null;
  if (!res.ok) {
    const msg = (data && (data.reason || data.message || data.error)) || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/**
 * PUBLIC_INTERFACE
 * geocodeLocation
 * Uses Open‑Meteo geocoding API to resolve a textual query (city, country)
 * to latitude/longitude.
 *
 * @param {string} query - e.g., "London, UK"
 * @returns {Promise<{ latitude: number, longitude: number, name?: string, country?: string }|null>}
 */
export async function geocodeLocation(query) {
  const { geocodeBase } = getOpenMeteoBases();
  const q = encodeURIComponent(query.trim());
  const url = `${geocodeBase}/v1/search?name=${q}&count=1&language=en&format=json`;
  const data = await fetchJson(url);
  const first = data?.results?.[0];
  if (!first) return null;
  return {
    latitude: Number(first.latitude),
    longitude: Number(first.longitude),
    name: first.name,
    country: first.country,
  };
}

/**
 * PUBLIC_INTERFACE
 * getForecast
 * Fetches forecast from Open‑Meteo by lat/lon. Requests current weather and hourly temps/precip.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<any>} Open‑Meteo response object
 */
export async function getForecast(latitude, longitude) {
  const { forecastBase } = getOpenMeteoBases();
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current_weather: 'true',
    hourly: 'temperature_2m,precipitation',
    timezone: 'auto',
  });
  const url = `${forecastBase}/v1/forecast?${params.toString()}`;
  return fetchJson(url);
}

/**
 * PUBLIC_INTERFACE
 * fetchWeatherByQuery
 * Accepts either:
 * - "city, country" or "city" -> geocodes and fetches forecast
 * - "lat,lon" string (e.g., "37.7749,-122.4194") -> parses and fetches forecast
 *
 * Returns a normalized object:
 * {
 *   source: 'open-meteo',
 *   location: 'City, Country' or 'lat,lon',
 *   current: { tempC: number, windKph: number, humidity: number|null, summary: string },
 *   hourly: { time: string[], temperature_2m: number[], precipitation: number[] },
 *   raw: <original open-meteo payload>
 * }
 *
 * @param {string} query
 * @returns {Promise<object>}
 */
export async function fetchWeatherByQuery(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) throw new Error('Please provide a location.');

  let lat = null;
  let lon = null;
  let locLabel = '';

  // Try to parse "lat,lon"
  const coordMatch = trimmed.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
  if (coordMatch) {
    lat = Number(coordMatch[1]);
    lon = Number(coordMatch[3]);
    locLabel = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  } else {
    // Geocode textual query
    const geo = await geocodeLocation(trimmed);
    if (!geo) throw new Error('Location not found. Try a different query.');
    lat = geo.latitude;
    lon = geo.longitude;
    locLabel = [geo.name, geo.country].filter(Boolean).join(', ');
  }

  const data = await getForecast(lat, lon);

  // Map Open‑Meteo fields
  const current = data?.current_weather || {};
  const hourly = data?.hourly || {};

  // Open‑Meteo does not provide humidity in current_weather; keep null safely.
  const normalized = {
    source: 'open-meteo',
    location: locLabel || '—',
    current: {
      tempC: isNum(current.temperature) ? Number(current.temperature) : null,
      windKph: isNum(current.windspeed) ? Number(current.windspeed) : null,
      humidity: null,
      summary: typeof current.weathercode !== 'undefined'
        ? describeWeatherCode(current.weathercode)
        : '',
      feelsLikeC: null, // Not provided directly; could be computed if desired
    },
    hourly: {
      time: Array.isArray(hourly.time) ? hourly.time : [],
      temperature_2m: Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m : [],
      precipitation: Array.isArray(hourly.precipitation) ? hourly.precipitation : [],
    },
    raw: data,
  };

  return normalized;
}

function tryJson(t) {
  try { return JSON.parse(t); } catch { return null; }
}

function isNum(n) {
  return n !== null && n !== undefined && !Number.isNaN(Number(n));
}

// Basic mapping of Open‑Meteo WMO weather codes to human text
function describeWeatherCode(code) {
  const map = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Freezing drizzle (light)',
    57: 'Freezing drizzle (dense)',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Freezing rain (light)',
    67: 'Freezing rain (heavy)',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return map[Number(code)] || '—';
}
