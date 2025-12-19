import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  // If SMTP not configured, log OTP to server console (development convenience)
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    logger.info({ to, code }, 'SMTP not configured; OTP printed to logs');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: !!env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject: 'Your TaskFlow login code',
    text: `Your one-time login code is: ${code}\n\nThis code expires soon.`,
  });
}
