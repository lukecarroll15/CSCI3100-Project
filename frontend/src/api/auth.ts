import { apiGet, apiPostJson } from './client';

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  adminLevel?: 'owner' | 'admin' | null;
  pendingTeamCreation?: boolean;
};

export type OtpPurpose = 'login' | 'signup';

export async function requestOtp(email: string, purpose: OtpPurpose): Promise<void> {
  await apiPostJson<{ message: string }>('/auth/request-otp', { email, purpose });
}

export async function verifyOtp(
  email: string,
  code: string,
  purpose: OtpPurpose,
  displayName?: string
): Promise<User> {
  const payload: { email: string; code: string; purpose: OtpPurpose; displayName?: string } = {
    email,
    code,
    purpose,
  };

  if (displayName && displayName.trim().length > 0) payload.displayName = displayName.trim();

  const res = await apiPostJson<{ user: User }>('/auth/verify-otp', payload);
  return res.user;
}

export async function getMe(): Promise<User> {
  const res = await apiGet<{ user: User }>('/users/me');
  return res.user;
}

export async function logout(): Promise<void> {
  await apiPostJson('/auth/logout', {});
}
