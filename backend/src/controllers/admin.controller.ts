import type { NextFunction, Request, Response } from 'express';
import { LicenceKeyModel } from '../models/LicenceKey';
import { UserModel } from '../models/User';
import { AuditLogModel } from '../models/AuditLogs';
import { AppError } from '../errors/AppError';
import { Types } from 'mongoose';

export async function handleActivateLicence(req: Request, res: Response, next: NextFunction) {
  try {
    const { code } = req.body as { code?: string };
    if (!code || typeof code !== 'string') {
      throw new AppError(400, 'INVALID_REQUEST', 'Missing activation code');
    }

    const normalized = code.trim().toUpperCase();
    const key = await LicenceKeyModel.findOne({ key: normalized });

    if (!key) {
      throw new AppError(400, 'INVALID_CODE', 'Invalid activation code');
    }

    if (key.redeemed) {
      throw new AppError(400, 'ALREADY_REDEEMED', 'This activation code has already been used');
    }

    const auth = req.auth;
    if (!auth) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    // mark redeemed
    key.redeemed = true;
    key.usedBy = new Types.ObjectId(auth.userId);
    key.usedAt = new Date();
    await key.save();

    // upgrade user role to admin
    const user = await UserModel.findByIdAndUpdate(auth.userId, { role: 'admin' }, { new: true });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // audit
    await AuditLogModel.create({
      action: 'activate_admin',
      userId: auth.userId,
      ip: req.ip,
      meta: { code: normalized, licenceId: key._id.toString() },
    });

    res.json({
      message: 'Activation successful',
      user: { id: String(user._id), email: user.email, displayName: user.displayName, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}