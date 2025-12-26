import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { LicenceKeyModel } from '../models/LicenceKey';
import { UserModel } from '../models/User';
import { AuditLogModel } from '../models/AuditLogs';
import { AppError } from '../errors/AppError';
import { Types } from 'mongoose';
import { env } from '../config/env';
import {
  generateRandomAdminKey12,
  getAdminKeyExpiryDate,
  isValidAdminKeyFormat,
  normalizeAdminKey,
} from '../utils/adminKey';

const ActivateLicenceBodySchema = z.object({
  code: z.string().trim().min(1, 'Missing activation code'),
});

async function generateUniqueLicenceKey(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateRandomAdminKey12();
    const exists = await LicenceKeyModel.exists({ key: code });
    if (!exists) {
      const expiresAt = getAdminKeyExpiryDate(env.ADMIN_KEY_TTL_DAYS);
      await LicenceKeyModel.create({
        key: code,
        redeemed: false,
        usesCount: 0,
        maxUses: env.ADMIN_KEY_MAX_USES,
        revoked: false,
        expiresAt,
      });
      return code;
    }
  }
  throw new Error('FAILED_TO_GENERATE_UNIQUE_KEY');
}

export async function handleActivateLicence(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ActivateLicenceBodySchema.parse(req.body);
    const normalized = normalizeAdminKey(parsed.code);

    // Strictly enforce the required format: AAAA-BBBB-CCCC
    if (!isValidAdminKeyFormat(normalized)) {
      throw new AppError(
        400,
        'INVALID_CODE_FORMAT',
        'Admin key must match the format: AAAA-BBBB-CCCC'
      );
    }

    const key = await LicenceKeyModel.findOne({ key: normalized });

    if (!key) {
      throw new AppError(400, 'INVALID_CODE', 'Invalid Activation Key');
    }

    if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) {
      key.revoked = true;
      await key.save();
      throw new AppError(400, 'KEY_EXPIRED', 'This activation key has expired');
    }

    const limit =
      typeof key.maxUses === 'number' && key.maxUses > 0 ? key.maxUses : env.ADMIN_KEY_MAX_USES;
    const exhausted = Boolean(key.revoked) || Boolean(key.redeemed) || key.usesCount >= limit;
    if (exhausted) {
      throw new AppError(
        400,
        'KEY_EXHAUSTED',
        'This activation code has been revoked or exhausted'
      );
    }

    const auth = req.auth;
    if (!auth) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const user = await UserModel.findById(auth.userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    if (user.role === 'admin') {
      throw new AppError(400, 'ALREADY_ADMIN', 'Account already has admin privileges');
    }

    // increment usage for this activation
    key.usesCount += 1;
    key.usedBy = new Types.ObjectId(auth.userId);
    key.usedAt = new Date();

    // When reaching max uses, exhaust this key (and generate the next key)
    if (key.usesCount >= limit) {
      key.redeemed = true;
      key.revoked = true;
      const nextKey = await generateUniqueLicenceKey();
      await AuditLogModel.create({
        action: 'licence_key_generated',
        userId: auth.userId,
        ip: req.ip,
        meta: { nextKey },
      });
    }
    await key.save();

    // upgrade user role to admin
    user.role = 'admin';
    await user.save();

    // audit
    await AuditLogModel.create({
      action: 'activate_admin',
      userId: auth.userId,
      ip: req.ip,
      meta: { code: normalized, licenceId: key._id.toString() },
    });

    res.json({
      message: 'Activation successful',
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

export async function handleGetAdminStats(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const user = await UserModel.findById(auth.userId);
    if (!user || user.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Only admins can access this');
    }

    const admins = await UserModel.find({ role: 'admin' }, 'displayName email').lean();
    const adminCount = admins.length;

    const now = new Date();
    const validKeys = await LicenceKeyModel.find(
      { redeemed: false, revoked: false, $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      'key usesCount maxUses createdAt'
    )
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      adminCount,
      admins: admins.map((a) => ({
        displayName: a.displayName,
        email: a.email,
      })),
      activationKeys: validKeys.map((k) => {
        const maxUses =
          typeof k.maxUses === 'number' && k.maxUses > 0 ? k.maxUses : env.ADMIN_KEY_MAX_USES;
        const usesCount = typeof k.usesCount === 'number' ? k.usesCount : 0;
        return {
          key: k.key,
          usesCount,
          maxUses,
          remainingUses: Math.max(0, maxUses - usesCount),
          createdAt: k.createdAt,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}
