import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { TeamModel } from '../models/Team';
import { TeamInviteModel, type TeamInviteRole } from '../models/TeamInvite';
import { TeamMembershipModel, TEAM_ROLES, type TeamRole } from '../models/TeamMembership';
import { UserModel } from '../models/User';
import { FileModel } from '../models/File';
import Folder from '../models/Folder';
import { TaskModel } from '../models/Task';
import { DepartmentModel } from '../models/Department';
import { LicenceKeyModel } from '../models/LicenceKey';
import fs from 'fs';
import path from 'path';

const CreateTeamSchema = z.object({
  name: z.string().trim().min(2).max(60),
});

const InviteSchema = z.object({
  email: z.string().email(),
});

const UpdateMemberRoleSchema = z.object({
  role: z.enum(TEAM_ROLES).refine((role) => role !== 'owner', {
    message: 'Owner role cannot be assigned',
  }),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertTeamId(teamId: string) {
  if (!Types.ObjectId.isValid(teamId)) {
    throw new AppError(400, 'INVALID_TEAM_ID', 'Invalid team id');
  }
}


async function loadMembership(teamId: string, userId: string) {
  return TeamMembershipModel.findOne({ teamId, userId }).lean();
}

function canManageTeam(role: TeamRole | undefined) {
  return role === 'owner' || role === 'admin';
}

function canAssignAdmin(role: TeamRole | undefined) {
  return role === 'owner';
}

async function getPendingOwnerKey(userId: string) {
  return LicenceKeyModel.findOne({
    ownerUserId: userId,
    teamId: null,
    revoked: false,
    redeemed: false,
  })
    .sort({ createdAt: -1 })
    .lean();
}

async function acceptPendingInvites(userId: string, email: string) {
  const now = new Date();
  const invites = await TeamInviteModel.find({
    email,
    revokedAt: null,
    acceptedAt: null,
    expiresAt: { $gt: now },
  });

  if (invites.length === 0) return;

  for (const invite of invites) {
    await TeamMembershipModel.updateOne(
      { teamId: invite.teamId, userId },
      { $setOnInsert: { role: invite.role } },
      { upsert: true }
    );
    invite.acceptedAt = now;
    await invite.save();
  }
}

export async function handleCreateTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

    const pendingKey = await getPendingOwnerKey(auth.userId);
    if (!pendingKey) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Team creation requires ownership of an activation key'
      );
    }

    const parsed = CreateTeamSchema.parse(req.body);

    const team = await TeamModel.create({
      name: parsed.name,
      createdBy: auth.userId,
      inviteOnly: true,
    });

    await TeamMembershipModel.create({
      teamId: team._id,
      userId: auth.userId,
      role: 'owner',
    });

    await LicenceKeyModel.updateOne(
      { _id: pendingKey._id },
      { $set: { teamId: team._id } }
    );

    res.status(201).json({
      team: {
        id: team._id.toString(),
        name: team.name,
      },
      role: 'owner',
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const mongoError = err as { code?: number };
      if (mongoError.code === 11000) {
        return next(new AppError(409, 'TEAM_EXISTS', 'Team already exists'));
      }
    }
    next(err);
  }
}

export async function handleListMyTeams(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth || !auth.userId || !auth.email) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const email = normalizeEmail(auth.email);
    await acceptPendingInvites(auth.userId, email);

    const memberships = await TeamMembershipModel.find({ userId: auth.userId })
      .populate('teamId', 'name')
      .sort({ createdAt: 1 })
      .lean();

    const teams = memberships
      .map((membership) => {
        const team = membership.teamId as unknown as { _id: Types.ObjectId; name: string } | null;
        if (!team) return null;
        return {
          id: team._id.toString(),
          name: team.name,
          role: membership.role,
        };
      })
      .filter(
        (team): team is { id: string; name: string; role: TeamRole } => Boolean(team)
      );

    res.json({ teams });
  } catch (err) {
    next(err);
  }
}

export async function handleListTeamMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

    const { teamId } = req.params;
    assertTeamId(teamId);

    const membership = await loadMembership(teamId, auth.userId);
    if (!canManageTeam(membership?.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Team admin access required');
    }

    const members = await TeamMembershipModel.find({ teamId })
      .populate('userId', 'displayName email')
      .lean();

    const payload = members.map((member) => {
      const user = member.userId as unknown as { _id: Types.ObjectId; displayName: string; email: string };
      return {
        userId: user?._id?.toString(),
        displayName: user?.displayName ?? '',
        email: user?.email ?? '',
        role: member.role,
      };
    });

    res.json({ members: payload });
  } catch (err) {
    next(err);
  }
}

export async function handleCreateInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

    const { teamId } = req.params;
    assertTeamId(teamId);

    const membership = await loadMembership(teamId, auth.userId);
    if (!canManageTeam(membership?.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Team admin access required');
    }

    const parsed = InviteSchema.parse(req.body);
    const email = normalizeEmail(parsed.email);
    const role: TeamInviteRole = 'member';
    const existingUser = await UserModel.findOne({ email }).select('_id').lean();
    if (!existingUser) {
      throw new AppError(
        404,
        'ACCOUNT_NOT_FOUND',
        'Account not found. Ask the user to sign up first.'
      );
    }

    const alreadyMember = await TeamMembershipModel.exists({
      teamId,
      userId: existingUser._id,
    });
    if (alreadyMember) {
      throw new AppError(409, 'ALREADY_MEMBER', 'User is already a team member');
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + env.TEAM_INVITE_TTL_DAYS);

    const existingInvite = await TeamInviteModel.findOne({
      teamId,
      email,
      revokedAt: null,
      acceptedAt: null,
      expiresAt: { $gt: now },
    });

    const invite = existingInvite
      ? await TeamInviteModel.findOneAndUpdate(
          { _id: existingInvite._id },
          { $set: { role, expiresAt } },
          { new: true }
        )
      : await TeamInviteModel.create({
          teamId,
          email,
          role,
          invitedBy: auth.userId,
          expiresAt,
        });

    res.status(201).json({
      invite: {
        id: invite?._id?.toString(),
        email: invite?.email,
        role: invite?.role,
        expiresAt: invite?.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

    const { teamId } = req.params;
    assertTeamId(teamId);

    const membership = await TeamMembershipModel.findOne({ teamId, userId: auth.userId }).lean();
    if (!membership || membership.role !== 'owner') {
      throw new AppError(403, 'FORBIDDEN', 'Only the team owner can delete this team');
    }

    const team = await TeamModel.findById(teamId).lean();
    if (!team) {
      throw new AppError(404, 'TEAM_NOT_FOUND', 'Team not found');
    }

    const DeleteTeamSchema = z.object({ name: z.string().trim().min(1) });
    const parsed = DeleteTeamSchema.parse(req.body);
    if (parsed.name !== team.name) {
      throw new AppError(400, 'TEAM_NAME_MISMATCH', 'Team name does not match');
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    const files = await FileModel.find({ teamId }, 'storedName').lean();
    for (const file of files) {
      const filePath = path.join(uploadDir, file.storedName);
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // Ignore missing files so deletion can proceed.
      }
    }

    const adminMembers = await TeamMembershipModel.find(
      { teamId, role: { $in: ['owner', 'admin'] } },
      'userId'
    ).lean();
    const adminUserIds = adminMembers
      .map((member) => member.userId)
      .filter((id): id is Types.ObjectId => Boolean(id));

    await Promise.all([
      FileModel.deleteMany({ teamId }),
      Folder.deleteMany({ teamId }),
      TaskModel.deleteMany({ teamId }),
      DepartmentModel.deleteMany({ teamId }),
      TeamInviteModel.deleteMany({ teamId }),
      TeamMembershipModel.deleteMany({ teamId }),
      LicenceKeyModel.deleteMany({ teamId }),
      adminUserIds.length > 0
        ? UserModel.updateMany(
            { _id: { $in: adminUserIds } },
            { $set: { role: 'user', adminLevel: null } }
          )
        : Promise.resolve(),
    ]);

    await TeamModel.findByIdAndDelete(teamId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function handleListInvites(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

    const { teamId } = req.params;
    assertTeamId(teamId);

    const membership = await loadMembership(teamId, auth.userId);
    if (!canManageTeam(membership?.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Team admin access required');
    }

    const now = new Date();
    const invites = await TeamInviteModel.find({
      teamId,
      revokedAt: null,
      acceptedAt: null,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      invites: invites.map((invite) => ({
        id: invite._id.toString(),
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

    const { teamId, memberId } = req.params;
    assertTeamId(teamId);
    if (!Types.ObjectId.isValid(memberId)) {
      throw new AppError(400, 'INVALID_MEMBER_ID', 'Invalid member id');
    }

    const membership = await loadMembership(teamId, auth.userId);
    if (!canAssignAdmin(membership?.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Only team owners can update roles');
    }

    const parsed = UpdateMemberRoleSchema.parse(req.body);

    const target = await TeamMembershipModel.findOne({ teamId, userId: memberId });
    if (!target) {
      throw new AppError(404, 'MEMBER_NOT_FOUND', 'Member not found');
    }
    if (target.role === 'owner') {
      throw new AppError(403, 'FORBIDDEN', 'Owner role cannot be modified');
    }

    target.role = parsed.role as TeamRole;
    await target.save();

    res.json({
      member: {
        userId: target.userId.toString(),
        role: target.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleRemoveMember(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');

    const { teamId, memberId } = req.params;
    assertTeamId(teamId);
    if (!Types.ObjectId.isValid(memberId)) {
      throw new AppError(400, 'INVALID_MEMBER_ID', 'Invalid member id');
    }

    const membership = await loadMembership(teamId, auth.userId);
    if (!canManageTeam(membership?.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Team admin access required');
    }

    const target = await TeamMembershipModel.findOne({ teamId, userId: memberId });
    if (!target) {
      throw new AppError(404, 'MEMBER_NOT_FOUND', 'Member not found');
    }
    if (target.role === 'owner') {
      throw new AppError(403, 'FORBIDDEN', 'Owner cannot be removed');
    }

    await TeamMembershipModel.deleteOne({ _id: target._id });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
