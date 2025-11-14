import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import './index.css';
import { fetchWeatherByQuery } from './api';

/** Theme hook to allow basic light/dark switching if needed via feature flag */
function useTheme() {
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return { theme, setTheme };
}

/** Header and Navigation */
function Header({ theme, onToggleTheme }) {
  return (
    <div className="header">
      <div className="container header-inner">
        <div className="brand" aria-label="Brand">
          <div className="brand-badge" aria-hidden>
            ⛅
          </div>
          <div>
            <div style={{ lineHeight: 1 }}>Rose Forecast</div>
            <div className="helper" style={{ fontWeight: 500 }}>Elegant AI Weather</div>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          <a href="#home" className="active">Home</a>
          <a href="#insights">AI Insights</a>
          <a href="#about">About</a>
          <button
            className="btn"
            style={{ background: 'transparent', color: 'var(--color-text)', border: '1px solid rgba(0,0,0,0.08)' }}
            onClick={onToggleTheme}
            aria-label={`Switch theme (current ${theme})`}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </nav>
      </div>
    </div>
  );
}

/** Central search section */
function SearchSection({ onSearch, loading }) {
  const [query, setQuery] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    const q = (query || '').trim();
    if (!q) return;
    onSearch(q);
  };

  return (
    <div className="card panel" style={{ padding: 20 }}>
      <h1 className="title">Find your forecast</h1>
      <p className="subtitle">Enter a city, region, or coordinates to see current conditions and AI-driven insights.</p>
      <form onSubmit={onSubmit} className="searchbar" role="search" aria-label="Weather search">
        <input
          className="input"
          placeholder="e.g. London, UK or 37.7749,-122.4194"
          aria-label="Enter a location"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <button className="btn" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>
      <div className="helper" style={{ marginTop: 8 }}>
        Tip: Enter a city/country (e.g., "London, UK") or coordinates ("37.7749,-122.4194"). Data is fetched directly from Open‑Meteo.
      </div>
    </div>
  );
}

/** Simple AI insights card (calls backend AI endpoint through API layer) */
function AIInsights({ insights, loading, error }) {
  return (
    <div className="card panel" aria-live="polite">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>AI Insights</h2>
        <span className="badge">OpenAI-powered</span>
      </div>
      {loading && <div className="loading" style={{ marginTop: 8 }}>🔮 Generating insights…</div>}
      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
      {!loading && !error && insights && (
        <div style={{ marginTop: 8, lineHeight: 1.6 }}>{insights}</div>
      )}
      {!loading && !error && !insights && (
        <div className="helper" style={{ marginTop: 8 }}>No insights yet. Run a search to generate AI commentary.</div>
      )}
    </div>
  );
}

/** Forecast summary card */
function ForecastSummary({ data, loading, error }) {
  const current = data?.current || {};
  const hourly = data?.hourly || {};
  const nextTemps = Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m.slice(0, 24) : [];
  const nextPrec = Array.isArray(hourly.precipitation) ? hourly.precipitation.slice(0, 24) : [];

  return (
    <div className="card panel" aria-live="polite">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Forecast</h2>
        {data?.location && <span className="badge">{data.location}</span>}
      </div>
      {loading && <div className="loading" style={{ marginTop: 8 }}>🌤️ Fetching weather…</div>}
      {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
      {!loading && !error && data && (
        <div className="results-grid" style={{ marginTop: 10 }}>
          <div className="row">
            <InfoChip label="Temperature" value={`${fmtNum(current.tempC)} °C`} />
            <InfoChip label="Feels Like" value={`${fmtNum(current.feelsLikeC)} °C`} />
            <InfoChip label="Humidity" value={current.humidity == null ? '—' : `${fmtNum(current.humidity)} %`} />
            <InfoChip label="Wind" value={`${fmtNum(current.windKph)} km/h`} />
          </div>
          <div className="chart-placeholder">
            Next 24h • Avg Temp {fmtNum(avg(nextTemps))} °C • Total Precip {fmtNum(sum(nextPrec))} mm
          </div>
          {current.summary && (
            <div className="helper" style={{ marginTop: 6 }}>
              Summary: {current.summary}
            </div>
          )}
        </div>
      )}
      {!loading && !error && !data && (
        <div className="helper" style={{ marginTop: 8 }}>Search for a location to view the forecast.</div>
      )}
    </div>
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

/** Right side panel for additional information */
function SidePanel({ meta }) {
  return (
    <aside className="card panel" aria-label="Additional info">
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Details</h3>
      <div className="helper">Environment</div>
      <ul style={{ marginTop: 6, paddingLeft: 18 }}>
        <li>Env: {process.env.REACT_APP_NODE_ENV || process.env.NODE_ENV || 'development'}</li>
        <li>Provider: {process.env.REACT_APP_WEATHER_PROVIDER || 'open-meteo'}</li>
        <li>OM Base: {process.env.REACT_APP_OPEN_METEO_BASE || 'https://api.open-meteo.com'}</li>
        <li>OM Geocode: {process.env.REACT_APP_OPEN_METEO_GEOCODE_BASE || 'https://geocoding-api.open-meteo.com'}</li>
        <li>Flags: {process.env.REACT_APP_FEATURE_FLAGS || 'none'}</li>
      </ul>
      <div className="helper" style={{ marginTop: 10 }}>About</div>
      <p style={{ marginTop: 6 }}>
        Elegant, AI-enhanced forecasts with a Rose Gold aesthetic.
      </p>
      {meta?.lastUpdated && (
        <>
          <div className="helper" style={{ marginTop: 10 }}>Last Updated</div>
          <div>{new Date(meta.lastUpdated).toLocaleString()}</div>
        </>
      )}
    </aside>
  );
}

/* No backend paths required: we call Open‑Meteo directly via api.js */

// PUBLIC_INTERFACE
function App() {
  /** Main application component for the AI-powered weather app.
   * Renders header/nav, central search, results section with forecast and AI insights,
   * a basic interactive chart placeholder, and a responsive side panel.
   */
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiError, setAiError] = useState('');
  const [forecast, setForecast] = useState(null);
  const [insights, setInsights] = useState('');
  const [meta, setMeta] = useState({});

  const onToggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const executeSearch = async (query) => {
    setLoading(true);
    setError('');
    setAiError('');
    setInsights('');
    setForecast(null);
    try {
      const normalized = await fetchWeatherByQuery(query);
      setForecast(normalized);
      setMeta({ lastUpdated: Date.now() });
    } catch (err) {
      setError(err?.message || 'Unable to fetch weather right now.');
    } finally {
      setLoading(false);
    }

    // Placeholder AI insights (no backend). In a future task, integrate real AI.
    setAiLoading(true);
    try {
      const tip = `Based on current conditions in ${query}, consider dressing in layers and checking hourly precipitation.`;
      setInsights(tip);
    } catch (err) {
      setAiError(err?.message || 'Unable to generate AI insights.');
    } finally {
      setAiLoading(false);
    }
  };

  const layout = useMemo(() => ({
    left: (
      <div className="results-grid">
        <SearchSection onSearch={executeSearch} loading={loading} />
        <ForecastSummary data={forecast} loading={loading} error={error} />
        <AIInsights insights={insights} loading={aiLoading} error={aiError} />
      </div>
    ),
    right: <SidePanel meta={meta} />,
  }), [aiError, aiLoading, error, forecast, loading, insights, meta]);

  return (
    <div>
      <Header theme={theme} onToggleTheme={onToggleTheme} />
      <main className="container main">
        <section aria-label="Main content">{layout.left}</section>
        <section aria-label="Side info">{layout.right}</section>
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="container" style={{ padding: '14px 0 24px', color: 'var(--color-text-muted)' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>© {new Date().getFullYear()} Rose Forecast</div>
        <div>Theme: Rose Gold • Primary #F472B6 • Secondary #F59E0B</div>
      </div>
    </footer>
  );
}

function fmtNum(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return Number(n).toFixed(1);
}

function avg(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const s = arr.reduce((a, b) => a + Number(b || 0), 0);
  return s / arr.length;
}

function sum(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + Number(b || 0), 0);
}

export default App;
