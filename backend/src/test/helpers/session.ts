import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

type SessionUser = { _id: unknown; email: string; role?: 'user' | 'admin' };

export function sessionCookieFor(user: SessionUser): string {
  const token = jwt.sign({ email: user.email, role: user.role ?? 'user' }, env.SESSION_SECRET, {
    subject: String(user._id),
    expiresIn: `${env.SESSION_TTL_HOURS}h`,
  });
  return `taskflow_session=${token}`;
}
