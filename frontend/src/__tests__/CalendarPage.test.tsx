import { screen } from '@testing-library/react';
import CalendarPage from '../pages/CalendarPage';
import { renderWithProviders } from '../test/utils';

test('CalendarPage renders the Add Task action', async () => {
  renderWithProviders(<CalendarPage />);

  expect(await screen.findByRole('button', { name: /add task/i })).toBeInTheDocument();
});
