# Rose Forecast - Elegant AI Weather Frontend

An Elegant, Rose Gold–themed React frontend for AI-powered weather forecasts.

## What’s included
- Landing page with header/nav, central search, results area, and responsive side panel
- Forecast summary card and AI insights card
- Basic interactive chart placeholder
- API layer using environment variables (no secrets hardcoded)
- Graceful loading and error states
- Mobile and desktop responsive layout

## Data Source: Open‑Meteo (no backend required)
The app now fetches weather directly from Open‑Meteo over HTTPS with CORS support:
- Forecast API: https://api.open-meteo.com
- Geocoding API: https://geocoding-api.open-meteo.com

No API keys are required. The UI accepts:
- City/country input (e.g., "London, UK") — geocoded to lat/lon
- Coordinates input (e.g., "37.7749,-122.4194") — used directly

Example Open‑Meteo URLs you can open in a browser:
- Geocoding: https://geocoding-api.open-meteo.com/v1/search?name=London&count=1&language=en&format=json
- Forecast (London lat/lon 51.5072,-0.1276): https://api.open-meteo.com/v1/forecast?latitude=51.5072&longitude=-0.1276&current_weather=true&hourly=temperature_2m,precipitation&timezone=auto

## Environment configuration
Configure provider via non-secret env vars (see `.env.example`):
- `REACT_APP_WEATHER_PROVIDER=open-meteo`
- `REACT_APP_OPEN_METEO_BASE=https://api.open-meteo.com`
- `REACT_APP_OPEN_METEO_GEOCODE_BASE=https://geocoding-api.open-meteo.com`

Legacy keys are still supported (but not required when using Open‑Meteo):
- `REACT_APP_API_BASE`
- `REACT_APP_BACKEND_URL`

## How the UI fetch works
1. User enters a query (city/country OR coordinates).
2. If coordinates (lat,lon), we call the forecast API directly.
3. If city/country, we first geocode via Open‑Meteo search, take the top result, then fetch forecast.
4. We map `current_weather` and `hourly.temperature_2m`/`hourly.precipitation` into the UI cards and chart placeholder.

## Scripts

- `npm start` — Start the app in development mode at http://localhost:3000
- `npm test` — Run tests in watch mode
- `npm run build` — Build for production

## Notes
- Theme colors (Rose Gold): primary `#F472B6`, secondary `#F59E0B`, background `#FDF2F8`, surface `#FFFFFF`, text `#374151`.
- For a production deployment, ensure HTTPS for all endpoints.
