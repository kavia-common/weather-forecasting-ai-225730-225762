# Rose Forecast - Elegant AI Weather Frontend

An Elegant, Rose Gold–themed React frontend for AI-powered weather forecasts.

## What’s included
- Dedicated Search & Forecast page rendered by default
- Prominent search with suggestions and validation for "city,country" and "lat,lon"
- Current conditions card and simple hourly temperatures list
- API layer using environment variables (no secrets hardcoded)
- Graceful loading, error, and empty states with aria-live updates
- Mobile and desktop responsive layout

## Data Source: Open‑Meteo (no backend required)
The app fetches weather directly from Open‑Meteo over HTTPS with CORS support:
- Forecast API: https://api.open-meteo.com
- Geocoding API: https://geocoding-api.open-meteo.com

No API keys are required. The UI accepts:
- City/country input (e.g., "London, UK") — geocoded to lat/lon
- Coordinates input (e.g., "37.7749,-122.4194") — used directly

Example Open‑Meteo URLs:
- Geocoding: https://geocoding-api.open-meteo.com/v1/search?name=London&count=1&language=en&format=json
- Forecast (London lat/lon 51.5072,-0.1276):
  https://api.open-meteo.com/v1/forecast?latitude=51.5072&longitude=-0.1276&current_weather=true&hourly=temperature_2m,precipitation,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto

## Environment configuration
You can optionally override the Open‑Meteo base URLs using environment variables (no secrets):
- `REACT_APP_OPEN_METEO_BASE=https://api.open-meteo.com`
- `REACT_APP_OPEN_METEO_GEOCODE_BASE=https://geocoding-api.open-meteo.com`

Other available environment variables (not required for Open‑Meteo):
- `REACT_APP_API_BASE`
- `REACT_APP_BACKEND_URL`

These have graceful fallbacks to the official URLs if not set.

## How searching works
1. Enter either a city/country or coordinates.
2. If coordinates (lat,lon), we call the Forecast API directly.
3. If city/country, we first call the Geocoding search API to get coordinates, then request the forecast.
4. We display current conditions and show a simple list of the next hourly temperatures.

## Example queries to try
- London, UK
- Paris, FR
- 37.7749,-122.4194
- 51.5072,-0.1276

## Scripts

- `npm start` — Start the app in development mode at http://localhost:3000
- `npm test` — Run tests
- `npm run build` — Build for production

## Notes
- Theme colors (Rose Gold): primary `#F472B6`, secondary `#F59E0B`, background `#FDF2F8`, surface `#FFFFFF`, text `#374151`.
- For production deployment, ensure HTTPS for all endpoints.
