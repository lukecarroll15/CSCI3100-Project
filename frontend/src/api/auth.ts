import { apiJson, apiPostJson } from './client';

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
};

type UserResponse = { user: User };

export async function requestOtp(email: string): Promise<void> {
  await apiPostJson<{ message: string }>('/auth/request-otp', { email });
}

export async function verifyOtp(email: string, code: string): Promise<User> {
  const res = await apiPostJson<UserResponse>('/auth/verify-otp', { email, code });
  return res.user;
}

export async function logout(): Promise<void> {
  await apiPostJson<{ message: string }>('/auth/logout', {});
}

export async function getMe(): Promise<User> {
  const res = await apiJson<UserResponse>('/users/me');
  return res.user;
}
