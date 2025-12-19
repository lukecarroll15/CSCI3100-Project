import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import { requestOtp, verifyOtp, type OtpPurpose } from '../services/auth.service';
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
    const { email, purpose } = RequestOtpSchema.parse(req.body);
    await requestOtp(email, (purpose ?? 'login') as OtpPurpose);
    res.json({ message: 'If eligible, a code has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function handleVerifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, code, purpose, displayName } = VerifyOtpSchema.parse(req.body);
    const user = await verifyOtp(email, code, (purpose ?? 'login') as OtpPurpose, displayName);

    setSessionCookie(res, { userId: String(user._id), email: user.email });

    res.json({
      user: {
        id: String(user._id),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleLogout(_req: Request, res: Response, next: NextFunction) {
  try {
    clearSessionCookie(res);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}
