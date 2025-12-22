import { randomInt } from 'crypto';

/**
 * Admin/Licence activation key format: AAAA-BBBB-CCCC (12 chars grouped by 4).
 */
export const ADMIN_KEY_REGEX = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

// Excludes ambiguous chars (I, O, 0, 1) to reduce copy/paste mistakes.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeAdminKey(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidAdminKeyFormat(input: string): boolean {
  return ADMIN_KEY_REGEX.test(normalizeAdminKey(input));
}

export function formatAdminKey12(raw: string): string {
  const val = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `${val.slice(0, 4)}-${val.slice(4, 8)}-${val.slice(8, 12)}`;
}

export function generateRandomAdminKey12(): string {
  let raw = '';
  for (let i = 0; i < 12; i++) {
    raw += ALPHABET[randomInt(ALPHABET.length)];
  }
  return formatAdminKey12(raw);
}

export function getAdminKeyExpiryDate(ttlDays: number): Date | null {
  if (!Number.isFinite(ttlDays) || ttlDays <= 0) return null;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);
  return expiresAt;
}
