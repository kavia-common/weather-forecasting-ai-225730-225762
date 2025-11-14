import { render, screen } from '@testing-library/react';
import App from './App';

test('renders header brand and search UI', () => {
  render(<App />);
  expect(screen.getByText(/Rose Forecast/i)).toBeInTheDocument();
  expect(screen.getByRole('search')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
});
