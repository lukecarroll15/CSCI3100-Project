import crypto from 'crypto';
import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import {
  findOrCreateGithubUser,
  requestOtp,
  verifyOtp,
  type OtpPurpose,
} from '../services/auth.service';
import {
  buildGithubAuthorizeUrl,
  exchangeGithubCodeForToken,
  fetchGithubPrimaryVerifiedEmail,
  fetchGithubUser,
  isGithubConfigured,
} from '../services/githubOAuth.service';
import { clearSessionCookie, setSessionCookie } from '../middleware/auth';

const PurposeSchema = z.enum(['login', 'signup']).default('login');

const RequestOtpSchema = z.object({
  email: z.string().email(),
  purpose: PurposeSchema.optional(),
});

const VerifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(10),
  purpose: PurposeSchema.optional(),
  displayName: z.string().trim().min(1).max(50).optional(),
});

export async function handleRequestOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = RequestOtpSchema.parse(req.body);
    const purpose: OtpPurpose = parsed.purpose ?? 'login';
    await requestOtp(parsed.email, purpose);
    res.json({ message: 'OTP sent' });
  } catch (err) {
    next(err);
  }
}

export async function handleVerifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = VerifyOtpSchema.parse(req.body);
    const purpose: OtpPurpose = parsed.purpose ?? 'login';
    const user = await verifyOtp(parsed.email, parsed.code, purpose, parsed.displayName);

    type WithId = { _id: { toString(): string } };
    const userId = (user as unknown as WithId)._id.toString();

    setSessionCookie(res, { userId, email: user.email });
    res.json({
      user: { id: userId, email: user.email, displayName: user.displayName, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleLogout(_req: Request, res: Response) {
  clearSessionCookie(res);
  res.json({ message: 'Logged out' });
}

// -------- GitHub OAuth --------
const GITHUB_STATE_COOKIE = 'taskflow_github_oauth_state';
const GITHUB_STATE_TTL_MS = 10 * 60 * 1000;

function redirectToLoginWithError(res: Response, code: string, message?: string) {
  const url = new URL('/login', env.FRONTEND_URL);
  url.searchParams.set('error', code);
  if (message) url.searchParams.set('message', message);
  res.redirect(url.toString());
}

export async function handleGithubStart(_req: Request, res: Response) {
  if (!isGithubConfigured()) {
    return redirectToLoginWithError(
      res,
      'GITHUB_NOT_CONFIGURED',
      'GitHub login is not configured in this environment.'
    );
  }

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(GITHUB_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: GITHUB_STATE_TTL_MS,
    path: '/',
  });

  const authorizeUrl = buildGithubAuthorizeUrl(state);
  res.redirect(authorizeUrl);
}

export async function handleGithubCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const expectedState = req.cookies?.[GITHUB_STATE_COOKIE] as string | undefined;

    res.clearCookie(GITHUB_STATE_COOKIE, { path: '/' });

    if (!code || !state || !expectedState || state !== expectedState) {
      return redirectToLoginWithError(res, 'OAUTH_STATE_INVALID', 'Please retry GitHub login.');
    }

    const token = await exchangeGithubCodeForToken(code);
    const ghUser = await fetchGithubUser(token);

    const emailFromProfile = ghUser.email?.trim() ?? '';
    const email = emailFromProfile.includes('@')
      ? emailFromProfile
      : await fetchGithubPrimaryVerifiedEmail(token);

    if (!email) {
      return redirectToLoginWithError(
        res,
        'GITHUB_EMAIL_UNAVAILABLE',
        'Your GitHub email is unavailable. Please use OTP login.'
      );
    }

    const githubId = String(ghUser.id);
    const githubUsername = (ghUser.login ?? '').trim();
    const displayNameRaw = (ghUser.name ?? '').trim();
    const displayName = displayNameRaw.length > 0 ? displayNameRaw : githubUsername;

    const user = await findOrCreateGithubUser({
      email,
      githubId,
      githubUsername,
      displayName,
    });

    setSessionCookie(res, { userId: String(user._id), email: user.email });

    const okUrl = new URL('/', env.FRONTEND_URL);
    res.redirect(okUrl.toString());
  } catch (err) {
    if (err instanceof AppError) {
      return redirectToLoginWithError(res, err.code, err.message);
    }
    next(err);
  }
}
