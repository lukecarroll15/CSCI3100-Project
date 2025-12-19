import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

export type AuthInfo = { userId: string; email: string };

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthInfo;
  }
}

const COOKIE_NAME = 'taskflow_session';

export function setSessionCookie(res: Response, payload: { userId: string; email: string }) {
  const token = jwt.sign({ email: payload.email }, env.SESSION_SECRET, {
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

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required'));

  try {
    const decoded = jwt.verify(token, env.SESSION_SECRET) as { email: string; sub?: string };
    req.auth = { userId: decoded.sub ?? '', email: decoded.email };
    return next();
  } catch {
    return next(new AppError(401, 'INVALID_SESSION', 'Invalid or expired session'));
  }
}
