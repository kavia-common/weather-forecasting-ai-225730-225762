import React, { useEffect, useState } from 'react';
import './App.css';
import './index.css';
import SearchForecast from './pages/SearchForecast';

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
          <a href="#home" className="active">Search</a>
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

// PUBLIC_INTERFACE
function App() {
  /**
   * Default entry page renders the dedicated Search & Forecast experience.
   * Accessible, validates input, shows suggestions, and forecast results.
   */
  const { theme, setTheme } = useTheme();
  const onToggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <div>
      <Header theme={theme} onToggleTheme={onToggleTheme} />
      <main className="container" style={{ paddingTop: 16, paddingBottom: 24 }}>
        <SearchForecast />
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

export default App;
