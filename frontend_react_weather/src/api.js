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
  // Ensure HTTPS and strip trailing slashes to avoid '//' in URLs
  const fallbackForecast = 'https://api.open-meteo.com';
  const fallbackGeocode = 'https://geocoding-api.open-meteo.com';
  const forecastBase = String(process.env.REACT_APP_OPEN_METEO_BASE || fallbackForecast)
    .replace(/^http:\/\//i, 'https://')
    .replace(/\/+$/, '');
  const geocodeBase = String(process.env.REACT_APP_OPEN_METEO_GEOCODE_BASE || fallbackGeocode)
    .replace(/^http:\/\//i, 'https://')
    .replace(/\/+$/, '');
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
  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      // Always use CORS-friendly defaults; Open-Meteo supports CORS over HTTPS
      mode: 'cors',
      ...options,
    });
  } catch (networkErr) {
    const err = new Error('Network error. Please check your internet connection and try again.');
    err.cause = networkErr;
    throw err;
  }

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
 * searchLocations
 * Search Open‑Meteo geocoding API for a list of matching locations.
 * @param {string} query - e.g., "London" or "London, UK"
 * @returns {Promise<Array<{id?: number, name: string, country?: string, latitude: number, longitude: number}>>}
 */
export async function searchLocations(query) {
  const q = sanitizeQuery(query);
  if (!q) return [];
  const { geocodeBase } = getOpenMeteoBases();
  // Open-Meteo geocoding expects: name, count, language, format
  const url = `${geocodeBase}/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`;
  const data = await fetchJson(url);
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map((r) => ({
    id: r.id,
    name: r.name,
    country: r.country,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
  }));
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
  const results = await searchLocations(query);
  return results[0] || null;
}

/**
 * PUBLIC_INTERFACE
 * getForecast
 * Fetches forecast from Open‑Meteo by lat/lon. Requests current weather,
 * hourly temp/precip/windspeed and daily aggregates (max/min temps, precip sum).
 *
 * @param {Object} args
 * @param {number} args.latitude
 * @param {number} args.longitude
 * @param {Object} [args.params] - Extra params to merge into request.
 * @returns {Promise<any>} Open‑Meteo response object
 */
export async function getForecast({ latitude, longitude, params = {} }) {
  const { forecastBase } = getOpenMeteoBases();
  const defaults = {
    latitude: String(latitude),
    longitude: String(longitude),
    current_weather: 'true',
    // Include humidity along with temperature, precipitation, and windspeed
    hourly: 'temperature_2m,relativehumidity_2m,precipitation,windspeed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'auto',
    // Choose kmh for consistency with UI; callers may override to 'mph'
    windspeed_unit: 'kmh',
  };
  const qs = new URLSearchParams({ ...defaults, ...params });
  const url = `${forecastBase}/v1/forecast?${qs.toString()}`;
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
 *   current: { tempC: number, windKph: number, humidity: number|null, summary: string, feelsLikeC: number|null },
 *   hourly: { time: string[], temperature_2m: number[], precipitation: number[], windspeed_10m: number[] },
 *   daily: { time: string[], temperature_2m_max: number[], temperature_2_m_min?: number[], precipitation_sum: number[] },
 *   raw: <original open-meteo payload>
 * }
 *
 * @param {string} query
 * @returns {Promise<object>}
 */
export async function fetchWeatherByQuery(query) {
  const trimmed = sanitizeQuery(query);
  if (!trimmed) throw new Error('Please provide a location.');

  let lat = null;
  let lon = null;
  let locLabel = '';

  // Try to parse "lat,lon"
  const coordMatch = trimmed.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
  if (coordMatch) {
    lat = Number(coordMatch[1]);
    lon = Number(coordMatch[3]);
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new Error('Invalid coordinates. Use "lat,lon" with valid ranges.');
    }
    locLabel = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  } else {
    // Geocode textual query
    const geo = await geocodeLocation(trimmed);
    if (!geo) throw new Error('Location not found. Try a different query.');
    lat = geo.latitude;
    lon = geo.longitude;
    locLabel = [geo.name, geo.country].filter(Boolean).join(', ');
  }

  const data = await getForecast({ latitude: lat, longitude: lon });

  // Map Open‑Meteo fields
  const current = data?.current_weather || {};
  const hourly = data?.hourly || {};
  const daily = data?.daily || {};

  const normalized = {
    source: 'open-meteo',
    location: locLabel || '—',
    current: {
      tempC: isNum(current.temperature) ? Number(current.temperature) : null,
      windKph: isNum(current.windspeed) ? Number(current.windspeed) : null,
      humidity: null, // not available in current_weather
      summary: typeof current.weathercode !== 'undefined'
        ? describeWeatherCode(current.weathercode)
        : '',
      feelsLikeC: null, // could be computed in future
    },
    hourly: {
      time: Array.isArray(hourly.time) ? hourly.time : [],
      temperature_2m: Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m : [],
      precipitation: Array.isArray(hourly.precipitation) ? hourly.precipitation : [],
      windspeed_10m: Array.isArray(hourly.windspeed_10m) ? hourly.windspeed_10m : [],
      relativehumidity_2m: Array.isArray(hourly.relativehumidity_2m) ? hourly.relativehumidity_2m : [],
    },
    daily: {
      time: Array.isArray(daily.time) ? daily.time : [],
      temperature_2m_max: Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [],
      temperature_2m_min: Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [],
      precipitation_sum: Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum : [],
    },
    raw: data,
  };

  return normalized;
}

function sanitizeQuery(q) {
  return String(q || '').replace(/[^\w\s,\-\.]/g, '').trim();
}

function tryJson(t) {
  try { return JSON.parse(t); } catch { return null; }
}

function isNum(n) {
  return n !== null && n !== undefined && !Number.isNaN(Number(n));
}

// PUBLIC_INTERFACE
export function describeWeatherCode(code) {
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
