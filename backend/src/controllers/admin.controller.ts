import type { NextFunction, Request, Response } from 'express';
import { LicenceKeyModel } from '../models/LicenceKey';
import { UserModel } from '../models/User';
import { AuditLogModel } from '../models/AuditLogs';
import { AppError } from '../errors/AppError';
import { Types } from 'mongoose';
import { randomInt } from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function formatKey12(raw: string): string {
  const val = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return `${val.slice(0, 4)}-${val.slice(4, 8)}-${val.slice(8, 12)}`;
}

function generateRandomKey12(): string {
  let raw = '';
  for (let i = 0; i < 12; i++) {
    raw += ALPHABET[randomInt(ALPHABET.length)];
  }
  return formatKey12(raw);
}

async function generateUniqueLicenceKey(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateRandomKey12();
    const exists = await LicenceKeyModel.exists({ key: code });
    if (!exists) {
      await LicenceKeyModel.create({
        key: code,
        redeemed: false,
        usesCount: 0,
        maxUses: 5,
        revoked: false,
      });
      return code;
    }
  }
  throw new Error('FAILED_TO_GENERATE_UNIQUE_KEY');
}

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

    if (key.revoked) {
      throw new AppError(400, 'KEY_REVOKED', 'This activation code has been revoked or exhausted');
    }
    const limit = typeof key.maxUses === 'number' && key.maxUses > 0 ? key.maxUses : 1;
    if (key.redeemed || key.usesCount >= limit) {
      throw new AppError(
        400,
        'MAX_USES_REACHED',
        'This activation code has reached its maximum usage'
      );
    }

    if (key.redeemed) {
      throw new AppError(400, 'ALREADY_REDEEMED', 'This activation code has already been used');
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

    // Get admin count and list
    const admins = await UserModel.find({ role: 'admin' }, 'displayName email').lean();
    const adminCount = admins.length;

    // Get all valid activation keys with usage
    const validKeys = await LicenceKeyModel.find(
      { redeemed: false, revoked: false },
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
      activationKeys: validKeys.map((k) => ({
        key: k.key,
        usesCount: k.usesCount,
        maxUses: k.maxUses,
        remainingUses: (k.maxUses || 1) - k.usesCount,
        createdAt: k.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}
