import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requestOtp, verifyOtp } from '../services/auth.service';
import { setSessionCookie, clearSessionCookie } from '../middleware/auth';

const RequestOtpSchema = z.object({ email: z.string().email() });
const VerifyOtpSchema = z.object({ email: z.string().email(), code: z.string().min(4).max(10) });

export async function postRequestOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = RequestOtpSchema.parse(req.body);
    await requestOtp(email);
    res.json({ message: 'OTP sent' });
  } catch (e) {
    next(e);
  }
}

export async function postVerifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, code } = VerifyOtpSchema.parse(req.body);
    const user = await verifyOtp(email, code);

    setSessionCookie(res, { userId: user._id.toString(), email: user.email });

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (e) {
    next(e);
  }
}

export function postLogout(_req: Request, res: Response) {
  clearSessionCookie(res);
  res.json({ message: 'Logged out' });
}
