import { LicenceKeyModel } from '../models/LicenceKey';
import { env } from './env';
import {
  generateRandomAdminKey12,
  getAdminKeyExpiryDate,
  isValidAdminKeyFormat,
  normalizeAdminKey,
} from '../utils/adminKey';

/**
 * Dev helper: ensure there is at least one active activation key.
 * - Runs only in non-production.
 * - If INITIAL_ADMIN_KEY is set and valid, uses it.
 * - Otherwise generates a random key and logs it to the server console.
 */
export async function seedInitialActivationKey(): Promise<void> {
  if (env.NODE_ENV === 'production') return;
  if (!env.ADMIN_KEY_AUTO_SEED) return;

  const exists = await LicenceKeyModel.exists({ redeemed: false, revoked: false });
  if (exists) return;

  const fromEnvRaw = process.env.INITIAL_ADMIN_KEY;
  const fromEnv = typeof fromEnvRaw === 'string' ? normalizeAdminKey(fromEnvRaw) : '';
  const key = fromEnv && isValidAdminKeyFormat(fromEnv) ? fromEnv : generateRandomAdminKey12();
  const expiresAt = getAdminKeyExpiryDate(env.ADMIN_KEY_TTL_DAYS);

  await LicenceKeyModel.create({
    key,
    redeemed: false,
    usesCount: 0,
    maxUses: env.ADMIN_KEY_MAX_USES,
    revoked: false,
    expiresAt,
  });

  console.log(`[seed] Initial activation key: ${key}`);
}
