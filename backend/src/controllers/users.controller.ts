import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { UserModel } from '../models/User';
import { LicenceKeyModel } from '../models/LicenceKey';

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.email) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

    const user = await UserModel.findOne({ email: req.auth.email }).lean();
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');

    const pendingKey = await LicenceKeyModel.findOne({
      ownerUserId: user._id,
      teamId: null,
      revoked: false,
      redeemed: false,
    })
      .select('_id')
      .lean();

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        adminLevel: user.adminLevel ?? null,
        pendingTeamCreation: Boolean(pendingKey),
      },
    });
  } catch (e) {
    next(e);
  }
}
