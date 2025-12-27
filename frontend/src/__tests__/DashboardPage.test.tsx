import { screen } from '@testing-library/react';
import DashboardPage from '../pages/DashboardPage';
import { renderWithProviders } from '../test/utils';

test('DashboardPage shows empty due-today state', async () => {
  renderWithProviders(<DashboardPage />);

  expect(await screen.findByText(/tasks due today/i)).toBeInTheDocument();
  expect(await screen.findByText(/no tasks due today/i)).toBeInTheDocument();
});
