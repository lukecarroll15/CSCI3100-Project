import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { OtpModel } from '../models/Otp';
import { UserModel } from '../models/User';
import { sendOtpEmail } from './email.service';

function generateNumericCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += crypto.randomInt(0, 10).toString();
  return out;
}

export async function requestOtp(emailRaw: string): Promise<void> {
  const email = emailRaw.trim().toLowerCase();

  // Cooldown: prevent spam
  const last = await OtpModel.findOne({ email }).sort({ createdAt: -1 }).lean();
  if (last) {
    const secondsSinceLast =
      (Date.now() - new Date(last.createdAt as unknown as string).getTime()) / 1000;
    if (secondsSinceLast < env.OTP_RESEND_COOLDOWN_SECONDS) {
      throw new AppError(429, 'OTP_COOLDOWN', 'Please wait before requesting another code.');
    }
  }

  // Invalidate any previous unused OTPs (only latest should work)
  await OtpModel.updateMany({ email, usedAt: null }, { $set: { usedAt: new Date() } });

  const code = generateNumericCode(env.OTP_LENGTH);
  const codeHash = await bcrypt.hash(code, 10);

  const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

  await OtpModel.create({ email, codeHash, expiresAt });

  await sendOtpEmail(email, code);
}

export async function verifyOtp(emailRaw: string, code: string) {
  const email = emailRaw.trim().toLowerCase();

  const otp = await OtpModel.findOne({
    email,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otp) throw new AppError(400, 'OTP_INVALID', 'Invalid or expired code.');

  if (otp.attempts >= env.OTP_MAX_VERIFY_ATTEMPTS) {
    otp.usedAt = new Date();
    await otp.save();
    throw new AppError(429, 'OTP_LOCKED', 'Too many attempts. Request a new code.');
  }

  const ok = await bcrypt.compare(code, otp.codeHash);
  if (!ok) {
    otp.attempts += 1;
    await otp.save();
    throw new AppError(400, 'OTP_INVALID', 'Invalid or expired code.');
  }

  // Mark as used (single-use)
  otp.usedAt = new Date();
  await otp.save();

  // Auto-create user on first login (FR-UM-6)
  const user =
    (await UserModel.findOne({ email })) ??
    (await UserModel.create({ email, displayName: '', role: 'user' }));

  return user;
}
