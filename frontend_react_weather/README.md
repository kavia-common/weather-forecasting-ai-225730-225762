# Rose Forecast - Elegant AI Weather Frontend

An Elegant, Rose Gold–themed React frontend for AI-powered weather forecasts.

## What’s included
- Landing page with header/nav, central search, results area, and responsive side panel
- Forecast summary card and AI insights card
- Basic interactive chart placeholder
- API layer using environment variables (no secrets hardcoded)
- Graceful loading and error states
- Mobile and desktop responsive layout

## Environment configuration
This app reads the backend API base URL from one of:
- `REACT_APP_API_BASE`
- `REACT_APP_BACKEND_URL`

If neither is set, it will call relative paths (e.g., `/api/weather`). See `.env.example` for non-secret configuration hints.

## Scripts

- `npm start` — Start the app in development mode at http://localhost:3000
- `npm test` — Run tests in watch mode
- `npm run build` — Build for production

## Expected backend endpoints
The frontend calls:
- `GET /api/weather?query=<location>` — returns weather data (various common shapes supported)
- `GET /api/ai/forecast?query=<location>` — returns AI insights (string or `{ insights: string }`)

No API keys or secrets are stored or used directly in the frontend.

## Notes
- Theme colors (Rose Gold): primary `#F472B6`, secondary `#F59E0B`, background `#FDF2F8`, surface `#FFFFFF`, text `#374151`.
- For a production deployment, ensure HTTPS for all endpoints.
