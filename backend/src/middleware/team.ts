import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { AppError } from '../errors/AppError';
import { TeamMembershipModel, type TeamRole } from '../models/TeamMembership';

export type TeamContext = { teamId: string; role: TeamRole };

declare module 'express-serve-static-core' {
  interface Request {
    team?: TeamContext;
  }
}

function extractTeamId(req: Request): string | null {
  const headerValue = req.headers['x-team-id'];
  const headerTeamId = typeof headerValue === 'string' ? headerValue.trim() : '';
  const queryTeamId = typeof req.query.teamId === 'string' ? req.query.teamId.trim() : '';
  return headerTeamId || queryTeamId || null;
}

export function hasTeamAdminAccess(req: Request): boolean {
  const role = req.team?.role;
  return role === 'owner' || role === 'admin';
}

export async function requireTeam(req: Request, _res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const teamId = extractTeamId(req);
    if (!teamId) {
      throw new AppError(400, 'TEAM_REQUIRED', 'Team context required');
    }
    if (!Types.ObjectId.isValid(teamId)) {
      throw new AppError(400, 'INVALID_TEAM_ID', 'Invalid team id');
    }

    const membership = await TeamMembershipModel.findOne({
      teamId,
      userId: auth.userId,
    }).lean();

    if (membership) {
      req.team = { teamId, role: membership.role };
      return next();
    }

    throw new AppError(403, 'NOT_TEAM_MEMBER', 'You are not a member of this team');
  } catch (err) {
    next(err);
  }
}
