import { screen } from '@testing-library/react';
import CanvasPage from '../pages/CanvasPage';
import { renderWithProviders } from '../test/utils';

test('CanvasPage renders canvas heading', async () => {
  renderWithProviders(<CanvasPage />);

  expect(await screen.findByText(/canvas/i)).toBeInTheDocument();
});
