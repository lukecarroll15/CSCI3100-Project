import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5001),
  API_PREFIX: z.string().default('/api'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  MONGO_URI: z.string(),

  SESSION_SECRET: z.string().min(20, 'SESSION_SECRET must be at least 20 characters'),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  OTP_LENGTH: z.coerce.number().int().min(4).max(10).default(6),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  OTP_EXPIRES_MS: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative().default(30),
  OTP_RESEND_COOLDOWN_MS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().nonnegative().optional()
  ),
  OTP_MAX_VERIFY_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_MAX_ATTEMPTS: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
  OTP_BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  EMAIL_FROM: z.string().default('no-reply@taskflow.local'),

  SMTP_HOST: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(65535).optional()),
  SMTP_SECURE: z.preprocess(emptyToUndefined, z.string().optional()).transform((v) => v === 'true'),
  SMTP_USER: z.preprocess(emptyToUndefined, z.string().optional()),
  SMTP_PASS: z.preprocess(emptyToUndefined, z.string().optional()),

  // GitHub OAuth (optional)
  GITHUB_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  GITHUB_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  GITHUB_CALLBACK_URL: z
    .preprocess(emptyToUndefined, z.string().url().optional())
    .default('http://localhost:5001/api/v1/auth/github/callback'),
  GITHUB_SCOPES: z.string().default('read:user user:email'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

  ADMIN_KEY_MAX_USES: z.coerce.number().int().positive().default(5),
  ADMIN_KEY_TTL_DAYS: z.coerce.number().int().nonnegative().default(30),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = EnvSchema.parse(process.env);

export const env = {
  ...parsed,
  OTP_EXPIRES_MS: parsed.OTP_EXPIRES_MS ?? parsed.OTP_TTL_SECONDS * 1000,
  OTP_RESEND_COOLDOWN_MS:
    parsed.OTP_RESEND_COOLDOWN_MS ?? parsed.OTP_RESEND_COOLDOWN_SECONDS * 1000,
  OTP_MAX_ATTEMPTS: parsed.OTP_MAX_ATTEMPTS ?? parsed.OTP_MAX_VERIFY_ATTEMPTS,
};
