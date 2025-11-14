import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import './index.css';

/**
 * Small environment-aware API client using REACT_APP_API_BASE or REACT_APP_BACKEND_URL.
 * Falls back to relative /api when not provided.
 */
const getApiBase = () => {
  const base =
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    '';
  if (base && /^https?:\/\//i.test(base)) return base.replace(/\/+$/, '');
  // As a safe default, use a relative path to support proxying in dev setups
  return '';
};

// PUBLIC_INTERFACE
export function apiFetch(path, options = {}) {
  /** Fetch wrapper for backend APIs using configured base URL.
   * - path: string - API path such as '/weather?city=London'
   * Returns JSON or throws an error with safe message (no secrets).
   */
  const base = getApiBase();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  }).then(async (res) => {
    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) {
      const msg =
        (data && (data.message || data.error)) ||
        `Request failed (${res.status})`;
      const error = new Error(msg);
      error.status = res.status;
      error.payload = data;
      throw error;
    }
    return data;
  }).catch((err) => {
    // Do not leak any env/secret information
    if (process.env.REACT_APP_LOG_LEVEL === 'debug') {
      // eslint-disable-next-line no-console
      console.debug('[apiFetch] error', err?.message);
    }
    throw err;
  });
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

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
        Tip: We never store your searches. All requests go to your configured backend.
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
            <InfoChip label="Temperature" value={`${fmtNum(data.tempC)} °C`} />
            <InfoChip label="Feels Like" value={`${fmtNum(data.feelsLikeC)} °C`} />
            <InfoChip label="Humidity" value={`${fmtNum(data.humidity)} %`} />
            <InfoChip label="Wind" value={`${fmtNum(data.windKph)} km/h`} />
          </div>
          <div className="chart-placeholder">
            Interactive chart placeholder (temperature next 24h)
          </div>
          {data.summary && (
            <div className="helper" style={{ marginTop: 6 }}>
              Summary: {data.summary}
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
        <li>API: {process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || '(relative /api)'}</li>
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

/** Build the request paths based on safe encoding */
function buildWeatherPath(q) {
  const qp = encodeURIComponent(q);
  // Expected backend route: GET /api/weather?query=<q>
  return `/api/weather?query=${qp}`;
}
function buildInsightsPath(q) {
  const qp = encodeURIComponent(q);
  // Expected backend route: POST /api/ai/forecast with { query }, but GET acceptable as placeholder
  return `/api/ai/forecast?query=${qp}`;
}

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
      // Weather endpoint
      const weather = await apiFetch(buildWeatherPath(query));
      const normalized = normalizeWeather(weather);
      setForecast(normalized);
      setMeta({ lastUpdated: Date.now() });
    } catch (err) {
      setError(err?.message || 'Unable to fetch weather right now.');
    } finally {
      setLoading(false);
    }

    // AI insights (best effort, do not block main result)
    setAiLoading(true);
    try {
      const ai = await apiFetch(buildInsightsPath(query), { method: 'GET' });
      const text = typeof ai === 'string' ? ai : (ai?.insights || ai?.summary || '');
      setInsights(text || 'No AI commentary available.');
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

/** Normalize weather response to app-friendly schema */
function normalizeWeather(raw) {
  if (!raw) return null;

  // Try common shapes. This function is defensive since backend shape may vary.
  const fromCommon = () => {
    const loc = raw.location?.name || raw.name || raw.city || raw.query || '';
    const tempC =
      raw.tempC ??
      raw.temperatureC ??
      raw.current?.temp_c ??
      (raw.main?.temp != null ? (Number(raw.main.temp) - 273.15) : null);
    const feelsLikeC =
      raw.feelsLikeC ??
      raw.feels_like_c ??
      raw.current?.feelslike_c ??
      (raw.main?.feels_like != null ? (Number(raw.main.feels_like) - 273.15) : null);
    const humidity =
      raw.humidity ??
      raw.current?.humidity ??
      raw.main?.humidity ??
      null;
    const windKph =
      raw.windKph ??
      raw.current?.wind_kph ??
      (raw.wind?.speed != null ? Number(raw.wind.speed) * 3.6 : null);
    const summary =
      raw.summary ??
      raw.weather?.[0]?.description ??
      raw.current?.condition?.text ??
      '';

    return {
      location: loc || '—',
      tempC: tempC != null ? Number(tempC) : null,
      feelsLikeC: feelsLikeC != null ? Number(feelsLikeC) : null,
      humidity: humidity != null ? Number(humidity) : null,
      windKph: windKph != null ? Number(windKph) : null,
      summary,
    };
  };

  try {
    return fromCommon();
  } catch {
    return null;
  }
}

export default App;
