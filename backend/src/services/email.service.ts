import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

function isPlaceholderHost(host?: string) {
  if (!host) return true;
  const h = host.trim().toLowerCase();
  return h === 'smtp.example.com' || h.endsWith('.example.com') || h === 'example.com';
}

export async function sendOtpEmail(to: string, code: string, expiresMs?: number): Promise<void> {
  // Dev-friendly fallback: if SMTP not configured (or placeholder), print OTP to logs
  if (!env.SMTP_HOST || !env.SMTP_PORT || isPlaceholderHost(env.SMTP_HOST)) {
    if (env.NODE_ENV === 'production') {
      throw new Error('SMTP_NOT_CONFIGURED');
    }
    logger.info({ to }, 'SMTP not configured; printing OTP to logs (dev mode)');
    logger.info({ to, code }, 'OTP code');
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: !!env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });

    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject: 'Your TaskFlow login code',
      text: buildOtpBody(code, expiresMs),
    });
  } catch (err) {
    // Production should fail loudly; dev/test should fall back to logs
    logger.error({ err, to }, 'SMTP send failed');

    if (env.NODE_ENV === 'production') {
      throw err;
    }

    logger.info({ to, code }, 'SMTP send failed; OTP printed to logs (dev fallback)');
  }
}

function buildOtpBody(code: string, expiresMs?: number): string {
  const expiryMinutes = expiresMs ? Math.max(1, Math.round(expiresMs / 60000)) : null;
  const expiryLine = expiryMinutes
    ? `This code expires in about ${expiryMinutes} minute${expiryMinutes === 1 ? '' : 's'}.`
    : 'This code expires soon.';

  return `Your one-time login code is: ${code}\n\n${expiryLine}`;
}
