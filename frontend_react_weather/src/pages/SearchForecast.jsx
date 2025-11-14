import React, { useEffect, useMemo, useState } from 'react';
import '../index.css';
import '../App.css';
import { fetchWeatherByQuery, searchLocations } from '../api';

/**
 * PUBLIC_INTERFACE
 * SearchForecast
 * A dedicated page that renders a prominent search bar, suggestion list,
 * validation for "city,country" and "lat,lon", and shows forecast results
 * including current conditions and a simple hourly temperatures list.
 */
export default function SearchForecast() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [forecast, setForecast] = useState(null);

  // Live region for status updates
  const statusText = useMemo(() => {
    if (status.type === 'error') return status.message;
    if (loading) return 'Loading results…';
    return status.message || '';
  }, [status, loading]);

  // Minimal debounced suggestions
  useEffect(() => {
    const q = query.trim();
    if (!q || isCoordinates(q)) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const results = await searchLocations(q);
        setSuggestions(results.slice(0, 5));
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const q = sanitize(query);
    if (!q) {
      setStatus({ type: 'error', message: 'Please enter a location or coordinates.' });
      return;
    }
    // If this is a text search (not coordinates), require at least 2 characters
    if (!isCoordinates(q) && q.length < 2) {
      setStatus({ type: 'error', message: 'Please enter at least 2 characters for city/country.' });
      return;
    }
    if (isCoordinates(q)) {
      const [lat, lon] = q.split(',').map((v) => Number(v));
      if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        setStatus({ type: 'error', message: 'Invalid coordinates. Use "lat,lon" within valid ranges.' });
        return;
      }
    }
    setLoading(true);
    setStatus({ type: 'info', message: 'Searching…' });
    setForecast(null);
    try {
      const data = await fetchWeatherByQuery(q);
      setForecast(data);
      setStatus({ type: 'success', message: 'Results ready.' });
    } catch (err) {
      setStatus({ type: 'error', message: err?.message || 'Unable to fetch forecast.' });
    } finally {
      setLoading(false);
    }
  };

  const onPickSuggestion = (sug) => {
    const label = [sug.name, sug.country].filter(Boolean).join(', ');
    setQuery(label);
    setSuggestions([]);
  };

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
      <div className="card panel" style={{ padding: 20 }}>
        <h1 className="title">Search & Forecast</h1>
        <p className="subtitle">Enter a city/country (e.g., "London, UK") or lat,lon (e.g., "37.7749,-122.4194").</p>

        <form onSubmit={onSubmit} className="searchbar" role="search" aria-label="Weather search form">
          <label htmlFor="search-input" className="helper" style={{ position: 'absolute', left: -9999 }}>
            Search location
          </label>
          <input
            id="search-input"
            className="input"
            placeholder="City, Country or Lat,Lon"
            aria-describedby="search-help"
            aria-invalid={status.type === 'error' ? 'true' : 'false'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          <button className="btn" type="submit" disabled={loading} aria-busy={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
        <div id="search-help" className="helper" style={{ marginTop: 8 }}>
          Tip: Try "Paris, FR" or "51.5072,-0.1276"
        </div>

        {suggestions.length > 0 && (
          <ul
            className="card"
            style={{ listStyle: 'none', padding: 8, marginTop: 10, borderRadius: 12 }}
            role="listbox"
            aria-label="Search suggestions"
          >
            {suggestions.map((s) => (
              <li key={`${s.id || `${s.latitude},${s.longitude}`}`} role="option">
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid rgba(0,0,0,0.08)', margin: 4 }}
                  onClick={() => onPickSuggestion(s)}
                >
                  {[s.name, s.country].filter(Boolean).join(', ')} — {s.latitude.toFixed(2)},{s.longitude.toFixed(2)}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div aria-live="polite" className={status.type === 'error' ? 'error' : 'helper'} style={{ marginTop: 10 }}>
          {statusText}
        </div>
      </div>

      <div className="results-grid" style={{ marginTop: 16 }}>
        <ForecastCards data={forecast} loading={loading} error={status.type === 'error' ? status.message : ''} />
      </div>
    </div>
  );
}

function ForecastCards({ data, loading, error }) {
  const current = data?.current || {};
  const hourly = data?.hourly || {};
  const nextTemps = Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m.slice(0, 12) : [];
  const nextTimes = Array.isArray(hourly.time) ? hourly.time.slice(0, 12) : [];

  return (
    <>
      <div className="card panel" aria-live="polite">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Current Conditions</h2>
          {data?.location && <span className="badge">{data.location}</span>}
        </div>
        {loading && <div className="loading" style={{ marginTop: 8 }}>🌤️ Fetching weather…</div>}
        {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
        {!loading && !error && data && (
          <div className="row" style={{ marginTop: 10 }}>
            <InfoChip label="Temperature" value={`${fmtNum(current.tempC)} °C`} />
            <InfoChip label="Wind" value={current.windKph == null ? '—' : `${fmtNum(current.windKph)} km/h`} />
            <InfoChip label="Feels Like" value={current.feelsLikeC == null ? '—' : `${fmtNum(current.feelsLikeC)} °C`} />
            <InfoChip label="Summary" value={current.summary || '—'} />
            {Array.isArray(hourly.relativehumidity_2m) && hourly.relativehumidity_2m.length > 0 && (
              <InfoChip label="Humidity" value={`${fmtNum(hourly.relativehumidity_2m[0])} %`} />
            )}
          </div>
        )}
        {!loading && !error && !data && (
          <div className="helper" style={{ marginTop: 8 }}>Use the search above to see the forecast.</div>
        )}
      </div>

      <div className="card panel" aria-live="polite">
        <h2 style={{ marginTop: 0 }}>Hourly Temperatures (next 12)</h2>
        {loading && <div className="loading" style={{ marginTop: 8 }}>Loading hourly data…</div>}
        {!loading && !error && nextTemps.length > 0 ? (
          <ul style={{ paddingLeft: 18, marginTop: 8 }}>
            {nextTemps.map((t, idx) => (
              <li key={idx} className="helper" style={{ marginBottom: 4 }}>
                {formatHour(nextTimes[idx])}: {fmtNum(t)} °C
              </li>
            ))}
          </ul>
        ) : (!loading && !error) ? (
          <div className="helper">No hourly data available.</div>
        ) : null}
      </div>
    </>
  );
}

function InfoChip({ label, value }) {
  return (
    <div className="card" style={{ padding: '10px 12px', borderRadius: 12 }}>
      <div className="helper" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function sanitize(q) {
  return String(q || '').replace(/[^\w\s,\-\.]/g, '').trim();
}

function isCoordinates(q) {
  return /^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(q);
}

function fmtNum(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return Number(n).toFixed(1);
}

function formatHour(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}
