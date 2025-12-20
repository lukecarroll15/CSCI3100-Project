import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { OtpModel } from '../models/Otp';
import { UserModel } from '../models/User';
import { sendOtpEmail } from './email.service';

export type OtpPurpose = 'login' | 'signup';

function generateNumericOtp(length: number): string {
  const digits = '0123456789';
  const buf = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += digits[buf[i] % digits.length];
  return out;
}

function normalizeEmail(emailRaw: string): string {
  return emailRaw.trim().toLowerCase();
}

async function assertLoginEmailExists(email: string): Promise<void> {
  const exists = await UserModel.exists({ email });
  if (!exists) {
    throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Account not found. Please sign up first.');
  }
}

async function assertSignupEmailAvailable(email: string): Promise<void> {
  const exists = await UserModel.exists({ email });
  if (exists) {
    throw new AppError(409, 'ACCOUNT_EXISTS', 'Email is already registered. Please log in.');
  }
}

export async function requestOtp(emailRaw: string, purpose: OtpPurpose = 'login'): Promise<void> {
  const email = normalizeEmail(emailRaw);

  if (purpose === 'login') await assertLoginEmailExists(email);
  if (purpose === 'signup') await assertSignupEmailAvailable(email);

  const last = await OtpModel.findOne({ email, purpose }).sort({ createdAt: -1 }).lean();
  if (last) {
    const ageMs = Date.now() - new Date(last.createdAt).getTime();
    if (ageMs < env.OTP_RESEND_COOLDOWN_MS) {
      const seconds = Math.ceil((env.OTP_RESEND_COOLDOWN_MS - ageMs) / 1000);
      throw new AppError(
        429,
        'OTP_COOLDOWN',
        `Please wait ${seconds}s before requesting another code.`
      );
    }
  }

  const codePlain = generateNumericOtp(env.OTP_LENGTH);
  const codeHash = await bcrypt.hash(codePlain, env.OTP_BCRYPT_ROUNDS);

  // Invalidate older unused codes for the same purpose (keeps “latest wins” semantics).
  await OtpModel.updateMany({ email, purpose, usedAt: null }, { $set: { usedAt: new Date() } });

  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MS);
  await OtpModel.create({ email, purpose, codeHash, expiresAt, attempts: 0 });

  await sendOtpEmail(email, codePlain, env.OTP_EXPIRES_MS);
}

export async function verifyOtp(
  emailRaw: string,
  code: string,
  purpose: OtpPurpose = 'login',
  displayNameRaw?: string
) {
  const email = normalizeEmail(emailRaw);

  if (purpose === 'login') await assertLoginEmailExists(email);
  if (purpose === 'signup') await assertSignupEmailAvailable(email);

  const otp = await OtpModel.findOne({
    email,
    purpose,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otp) {
    throw new AppError(400, 'OTP_NOT_FOUND', 'No active code found. Please request a new one.');
  }

  if (otp.attempts >= env.OTP_MAX_ATTEMPTS) {
    otp.usedAt = new Date();
    await otp.save();
    throw new AppError(429, 'OTP_LOCKED', 'Too many attempts. Please request a new code.');
  }

  const ok = await bcrypt.compare(code, otp.codeHash);
  otp.attempts += 1;

  if (!ok) {
    await otp.save();
    throw new AppError(400, 'OTP_INVALID', 'Incorrect code.');
  }

  otp.usedAt = new Date();
  await otp.save();

  let user = await UserModel.findOne({ email });

  if (!user && purpose === 'signup') {
    const displayName = (displayNameRaw ?? '').trim();
    try {
      user = await UserModel.create({
        email,
        displayName: displayName.length > 0 ? displayName : email.split('@')[0],
        role: 'user',
      });
    } catch (err: unknown) {
      // Race condition: another request created the user after validation.
      if (isDuplicateKeyError(err)) {
        user = await UserModel.findOne({ email });
      } else {
        throw err;
      }
    }
  }

  if (!user) {
    // Defensive guard (should not happen due to checks above).
    throw new AppError(500, 'AUTH_STATE_INVALID', 'Authentication state invalid. Please retry.');
  }

  return user;
}

type GithubIdentity = {
  email: string;
  githubId: string;
  githubUsername: string;
  displayName?: string | null;
};

export async function findOrCreateGithubUser(identity: GithubIdentity) {
  const email = normalizeEmail(identity.email);
  const githubId = identity.githubId.trim();
  const githubUsername = identity.githubUsername.trim();
  const displayNameRaw = (identity.displayName ?? '').trim();
  const displayNameCandidate = (
    displayNameRaw.length > 0 ? displayNameRaw : githubUsername || email.split('@')[0]
  ).slice(0, 50);

  if (!githubId) {
    throw new AppError(401, 'GITHUB_PROFILE_INVALID', 'GitHub profile missing ID.');
  }

  let user = await UserModel.findOne({ githubId });
  let matchedByEmail = false;

  if (!user) {
    user = await UserModel.findOne({ email });
    matchedByEmail = Boolean(user);
  }

  if (matchedByEmail && user?.githubId && user.githubId !== githubId) {
    throw new AppError(
      409,
      'ACCOUNT_CONFLICT',
      'This email is already linked to another GitHub account. Please use OTP login.'
    );
  }

  if (!user) {
    try {
      user = await UserModel.create({
        email,
        displayName: displayNameCandidate,
        role: 'user',
        githubId,
        githubUsername,
      });
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        user = await UserModel.findOne({ githubId });
        if (!user) user = await UserModel.findOne({ email });
      } else {
        throw err;
      }
    }
  }

  if (!user) {
    throw new AppError(500, 'AUTH_STATE_INVALID', 'Authentication state invalid. Please retry.');
  }

  let needsSave = false;

  if (!user.githubId || user.githubId !== githubId) {
    user.githubId = githubId;
    needsSave = true;
  }

  if ((user.githubUsername ?? '') !== githubUsername) {
    user.githubUsername = githubUsername;
    needsSave = true;
  }

  if (!user.displayName || user.displayName.trim().length === 0) {
    if (displayNameCandidate.length > 0) {
      user.displayName = displayNameCandidate;
      needsSave = true;
    }
  }

  if (needsSave) await user.save();

  return user;
}

function isDuplicateKeyError(err: unknown): err is { code: number } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: number }).code === 11000
  );
}
