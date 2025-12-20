import { apiPostJson } from './client';

export async function activateLicense(code: string) {
  return apiPostJson<{ message: string; user?: { id: string; email: string; role: string } }>('/admin/activate', { code });
}