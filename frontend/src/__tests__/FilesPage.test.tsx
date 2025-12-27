import { screen } from '@testing-library/react';
import FilesPage from '../pages/FilesPage';
import { renderWithProviders } from '../test/utils';

test('FilesPage shows empty state when no files exist', async () => {
  renderWithProviders(<FilesPage />);

  expect(
    await screen.findByText(/no files or folders found matching your filters/i)
  ).toBeInTheDocument();
});
