import { Schema, model, type InferSchemaType } from 'mongoose';

export const TEAM_ROLES = ['owner', 'admin', 'member'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

const TeamMembershipSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: TEAM_ROLES, default: 'member' },
  },
  { timestamps: true }
);

TeamMembershipSchema.index({ teamId: 1, userId: 1 }, { unique: true });

export type TeamMembershipDoc = InferSchemaType<typeof TeamMembershipSchema>;
export const TeamMembershipModel = model('TeamMembership', TeamMembershipSchema);
