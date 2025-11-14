/**
 * PUBLIC_INTERFACE
 * getApiBase
 * Returns the base URL for API calls using environment variables:
 * - REACT_APP_API_BASE
 * - REACT_APP_BACKEND_URL
 * If none is set, returns an empty string to allow relative /api calls.
 */
export function getApiBase() {
  const base =
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    '';
  if (base && /^https?:\/\//i.test(base)) return base.replace(/\/+$/, '');
  return '';
}

/**
 * PUBLIC_INTERFACE
 * apiFetch
 * Fetch wrapper that prefixes the configured base URL and returns JSON.
 * Throws a user-safe error message on failure.
 */
export async function apiFetch(path, options = {}) {
  const base = getApiBase();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  const data = text ? tryJson(text) : null;
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

function tryJson(t) {
  try { return JSON.parse(t); } catch { return null; }
}
