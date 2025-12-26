import { Schema, model, type InferSchemaType } from 'mongoose';

export const TEAM_INVITE_ROLES = ['admin', 'member'] as const;
export type TeamInviteRole = (typeof TEAM_INVITE_ROLES)[number];

const TeamInviteSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, enum: TEAM_INVITE_ROLES, default: 'member' },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

TeamInviteSchema.index({ teamId: 1, email: 1, revokedAt: 1, acceptedAt: 1 });

export type TeamInviteDoc = InferSchemaType<typeof TeamInviteSchema>;
export const TeamInviteModel = model('TeamInvite', TeamInviteSchema);
