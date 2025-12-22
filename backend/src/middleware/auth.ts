import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { UserModel } from '../models/User';

export type AuthInfo = { userId: string; email: string; role: 'user' | 'admin' };

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthInfo;
  }
}

const COOKIE_NAME = 'taskflow_session';

export function setSessionCookie(
  res: Response,
  payload: { userId: string; email: string; role: 'user' | 'admin' }
) {
  const token = jwt.sign({ email: payload.email, role: payload.role }, env.SESSION_SECRET, {
    subject: payload.userId,
    expiresIn: `${env.SESSION_TTL_HOURS}h`,
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));

  try {
    const decoded = jwt.verify(token, env.SESSION_SECRET) as {
      email: string;
      role: 'user' | 'admin';
      sub?: string;
    };
    const userId = decoded.sub ?? '';
    let role: 'user' | 'admin' = decoded.role ?? 'user';
    if (userId && (!decoded.role || decoded.role === 'user')) {
      try {
        const user = await UserModel.findById(userId).select('role');
        if (user) role = (user.role as 'user' | 'admin') ?? role;
      } catch {
        // ignore DB lookup errors, default role remains
      }
    }
    req.auth = { userId, email: decoded.email, role };
    return next();
  } catch {
    return next(new AppError(401, 'INVALID_SESSION', 'Invalid or expired session'));
  }
}
