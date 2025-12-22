import { apiPostJson, apiGet } from './client';

export async function activateLicense(code: string) {
  return apiPostJson<{ message: string; user?: { id: string; email: string; role: string } }>(
    '/admin/activate',
    { code }
  );
}

export type AdminStats = {
  adminCount: number;
  admins: Array<{ displayName: string; email: string }>;
  activationKeys: Array<{
    key: string;
    usesCount: number;
    maxUses: number;
    remainingUses: number;
    createdAt: string;
  }>;
};

export async function getAdminStats() {
  return apiGet<AdminStats>('/admin/stats');
}
