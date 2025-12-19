import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { UserModel } from '../models/User';

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.email) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

    const user = await UserModel.findOne({ email: req.auth.email }).lean();
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

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
