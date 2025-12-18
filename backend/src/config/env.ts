import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Always load backend/.env (works from src and from dist after build)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  // Add the new field here
  API_PREFIX: z.string().default('/api'),

  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  MONGO_URI: z.string().default('mongodb://127.0.0.1:27017/taskflow_dev'),

  // Required later for auth sessions (keep it in .env, never commit)
  SESSION_SECRET: z
    .string()
    .min(20, 'SESSION_SECRET must be at least 20 characters')
    .default('change_me'),

  // Rate limit defaults for later auth endpoints (OTP spam prevention)
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
});

export const env = EnvSchema.parse(process.env);
