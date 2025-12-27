import { screen } from '@testing-library/react';
import AdminPanel from '../components/layout/AdminPanel';
import { renderWithProviders } from '../test/utils';

test('AdminPanel shows active state for admins', () => {
  renderWithProviders(<AdminPanel />);

  const button = screen.getByRole('button', { name: /activated/i });
  expect(button).toBeDisabled();
  expect(screen.getByText(/admin access: active/i)).toBeInTheDocument();
});
