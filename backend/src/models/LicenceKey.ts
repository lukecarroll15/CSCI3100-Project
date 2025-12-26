import { Schema, model, type InferSchemaType } from 'mongoose';

const LicenceKeySchema = new Schema(
  {
    key: { type: String, required: true, unique: true, uppercase: true, trim: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    redeemed: { type: Boolean, default: false },
    usedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    usedAt: { type: Date, default: null },
    maxUses: { type: Number, default: 5 },
    usesCount: { type: Number, default: 0 },
    revoked: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type LicenceKeyDoc = InferSchemaType<typeof LicenceKeySchema>;
export const LicenceKeyModel = model('LicenceKey', LicenceKeySchema);
