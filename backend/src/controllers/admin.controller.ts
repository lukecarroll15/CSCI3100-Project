import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { LicenceKeyModel } from '../models/LicenceKey';
import { UserModel } from '../models/User';
import { AuditLogModel } from '../models/AuditLogs';
import { AppError } from '../errors/AppError';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { TeamMembershipModel } from '../models/TeamMembership';
import { hasTeamAdminAccess } from '../middleware/team';
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
      return code;
    }
  }
  throw new Error('FAILED_TO_GENERATE_UNIQUE_KEY');
}

type LicenceKeyCreateOptions = {
  ownerUserId?: Types.ObjectId | null;
  teamId?: Types.ObjectId | null;
  usesCount?: number;
  maxUses?: number;
  expiresAt?: Date | null;
};

async function createLicenceKeyRecord(options: LicenceKeyCreateOptions) {
  const key = await generateUniqueLicenceKey();
  const expiresAt =
    options.expiresAt !== undefined
      ? options.expiresAt
      : getAdminKeyExpiryDate(env.ADMIN_KEY_TTL_DAYS);
  return LicenceKeyModel.create({
    key,
    ownerUserId: options.ownerUserId ?? null,
    teamId: options.teamId ?? null,
    redeemed: false,
    usesCount: options.usesCount ?? 0,
    maxUses: options.maxUses ?? env.ADMIN_KEY_MAX_USES,
    revoked: false,
    expiresAt,
  });
}

async function rotateExpiredTeamKey(key: {
  _id: Types.ObjectId;
  ownerUserId?: Types.ObjectId | null;
  teamId?: Types.ObjectId | null;
  usesCount?: number;
  maxUses?: number;
}) {
  if (!key.teamId) return null;
  const nextKey = await createLicenceKeyRecord({
    ownerUserId: key.ownerUserId ?? null,
    teamId: key.teamId ?? null,
    usesCount: key.usesCount ?? 0,
    maxUses: key.maxUses ?? env.ADMIN_KEY_MAX_USES,
  });
  await LicenceKeyModel.updateOne({ _id: key._id }, { $set: { revoked: true, redeemed: true } });
  return nextKey.toObject();
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
      if (key.teamId) {
        await rotateExpiredTeamKey({
          _id: key._id,
          ownerUserId: key.ownerUserId ?? null,
          teamId: key.teamId ?? null,
          usesCount: key.usesCount ?? 0,
          maxUses: key.maxUses ?? env.ADMIN_KEY_MAX_USES,
        });
      }
      key.revoked = true;
      key.redeemed = true;
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

    if (key.ownerUserId && !key.teamId) {
      throw new AppError(
        409,
        'TEAM_PENDING',
        'Team setup is pending. Ask the key owner to finish creating the team.'
      );
    }

    const isFirstActivation = !key.ownerUserId;
    if (isFirstActivation) {
      key.ownerUserId = new Types.ObjectId(auth.userId);
    }

    // increment usage for this activation
    key.usesCount += 1;
    key.usedBy = new Types.ObjectId(auth.userId);
    key.usedAt = new Date();

    // When reaching max uses, exhaust this key (and generate the next key)
    if (key.usesCount >= limit) {
      key.redeemed = true;
      key.revoked = true;
      const nextKey = await createLicenceKeyRecord({
        ownerUserId: key.ownerUserId ?? null,
        teamId: key.teamId ?? null,
        usesCount: 0,
        maxUses: limit,
      });
      await AuditLogModel.create({
        action: 'licence_key_generated',
        userId: auth.userId,
        ip: req.ip,
        meta: { nextKey: nextKey.key },
      });
    }
    await key.save();

    // upgrade user role to admin
    user.role = 'admin';
    user.adminLevel = isFirstActivation ? 'owner' : 'admin';
    await user.save();

    if (!isFirstActivation) {
      if (!key.teamId) {
        throw new AppError(
          409,
          'TEAM_PENDING',
          'Team setup is pending. Ask the key owner to finish creating the team.'
        );
      }
      await TeamMembershipModel.updateOne(
        { teamId: key.teamId, userId: auth.userId },
        { $set: { role: 'admin' } },
        { upsert: true }
      );
    }

    // audit
    await AuditLogModel.create({
      action: 'activate_admin',
      userId: auth.userId,
      ip: req.ip,
      meta: { code: normalized, licenceId: key._id.toString(), teamId: key.teamId?.toString() },
    });

    res.json({
      message: 'Activation successful',
      user: {
        id: String(user._id),
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        adminLevel: user.adminLevel ?? null,
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

    const teamId = req.team?.teamId;
    if (!teamId) {
      throw new AppError(400, 'TEAM_REQUIRED', 'Team context required');
    }
    if (!hasTeamAdminAccess(req)) {
      throw new AppError(403, 'FORBIDDEN', 'Team admin access required');
    }

    const members = await TeamMembershipModel.find({ teamId })
      .populate('userId', 'displayName email')
      .lean();
    const ownerMember = members.find((member) => member.role === 'owner') ?? null;
    const adminMembers = members.filter((member) => member.role === 'admin');
    const adminCount = (ownerMember ? 1 : 0) + adminMembers.length;

    const now = new Date();
    const validKeys = await LicenceKeyModel.find(
      { teamId, redeemed: false, revoked: false },
      'key usesCount maxUses createdAt expiresAt ownerUserId teamId'
    )
      .sort({ createdAt: -1 })
      .lean();

    let activeKeys = validKeys;
    const expiredKeys = validKeys.filter(
      (key) => key.expiresAt && key.expiresAt.getTime() <= now.getTime()
    );
    if (expiredKeys.length > 0) {
      const replacements: typeof validKeys = [];
      for (const expired of expiredKeys) {
        const replacement = await rotateExpiredTeamKey({
          _id: expired._id,
          ownerUserId: expired.ownerUserId ?? null,
          teamId: expired.teamId ?? null,
          usesCount: expired.usesCount ?? 0,
          maxUses: expired.maxUses ?? env.ADMIN_KEY_MAX_USES,
        });
        if (replacement) {
          replacements.push(replacement);
        }
      }
      const filtered = validKeys.filter(
        (key) => !expiredKeys.some((expired) => expired._id.equals(key._id))
      );
      activeKeys = [...filtered, ...replacements].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
    }

    res.json({
      adminCount,
      owner: ownerMember
        ? {
            displayName:
              (ownerMember.userId as { displayName?: string; email?: string })?.displayName ?? '',
            email: (ownerMember.userId as { displayName?: string; email?: string })?.email ?? '',
          }
        : null,
      admins: adminMembers.map((member) => {
        const user = member.userId as { displayName?: string; email?: string };
        return { displayName: user?.displayName ?? '', email: user?.email ?? '' };
      }),
      activationKeys:
        req.team?.role === 'owner'
          ? activeKeys.map((k) => {
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
            })
          : [],
    });
  } catch (err) {
    next(err);
  }
}
