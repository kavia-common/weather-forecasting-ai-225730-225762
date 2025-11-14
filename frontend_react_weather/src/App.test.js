import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  // Mock fetch for Open‑Meteo endpoints
  global.fetch = jest.fn((url) => {
    const u = String(url);
    if (u.includes('/v1/search')) {
      return Promise.resolve(new Response(JSON.stringify({
        results: [
          { id: 1, name: 'London', country: 'UK', latitude: 51.5072, longitude: -0.1276 }
        ]
      }), { status: 200 }));
    }
    if (u.includes('/v1/forecast')) {
      return Promise.resolve(new Response(JSON.stringify({
        current_weather: { temperature: 20.1, windspeed: 12.3, weathercode: 2 },
        hourly: {
          time: Array.from({ length: 24 }, (_, i) => new Date(Date.now() + i * 3600_000).toISOString()),
          temperature_2m: Array.from({ length: 24 }, () => 20),
          precipitation: Array.from({ length: 24 }, () => 0),
          windspeed_10m: Array.from({ length: 24 }, () => 10),
        },
        daily: {
          time: ['2025-01-01'],
          temperature_2m_max: [22],
          temperature_2m_min: [14],
          precipitation_sum: [0]
        }
      }), { status: 200 }));
    }
    return Promise.resolve(new Response('{}', { status: 200 }));
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders header brand and search UI', () => {
  render(<App />);
  expect(screen.getByText(/Rose Forecast/i)).toBeInTheDocument();
  // Dedicated page renders a form role="search"
  expect(screen.getByRole('search')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
});

test('performs a successful search and renders forecast', async () => {
  render(<App />);
  const input = screen.getByLabelText(/Search location/i, { selector: 'input' }) || screen.getByPlaceholderText(/City, Country or Lat,Lon/i);
  fireEvent.change(input, { target: { value: 'London, UK' } });
  fireEvent.click(screen.getByRole('button', { name: /search/i }));

  await waitFor(() => {
    expect(screen.getByText(/Current Conditions/i)).toBeInTheDocument();
  });

  // Check for one of the normalized fields (temperature chip)
  expect(screen.getByText(/Temperature/i)).toBeInTheDocument();
});
