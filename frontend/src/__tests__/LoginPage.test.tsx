import { screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import LoginPage from '../pages/LoginPage';
import { renderWithProviders, defaultAuthValue } from '../test/utils';

test('LoginPage shows validation error for empty email after blur', async () => {
  const auth = {
    ...defaultAuthValue,
    user: null,
    requestOtp: vi.fn(async () => undefined),
    verifyOtp: vi.fn(async () => defaultAuthValue.user!),
  };

  renderWithProviders(<LoginPage />, { auth });

  const emailInput = screen.getByPlaceholderText('name@example.com');
  fireEvent.blur(emailInput);

  const sendButton = screen.getByRole('button', { name: /send login code/i });

  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  expect(sendButton).toBeDisabled();
  expect(auth.requestOtp).not.toHaveBeenCalled();
});

test('LoginPage moves to code step after requesting OTP', async () => {
  const auth = {
    ...defaultAuthValue,
    user: null,
    requestOtp: vi.fn(async () => undefined),
    verifyOtp: vi.fn(async () => defaultAuthValue.user!),
  };

  renderWithProviders(<LoginPage />, { auth });

  const emailInput = screen.getByPlaceholderText('name@example.com');
  fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

  const sendButton = screen.getByRole('button', { name: /send login code/i });
  fireEvent.click(sendButton);

  expect(auth.requestOtp).toHaveBeenCalledWith('user@example.com', 'login');
  expect(await screen.findByPlaceholderText('123456')).toBeInTheDocument();
});
