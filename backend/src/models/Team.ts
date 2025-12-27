import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const TeamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inviteOnly: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TeamSchema.index({ name: 1 }, { unique: true });

export type TeamDoc = InferSchemaType<typeof TeamSchema> & { _id: Types.ObjectId };
export const TeamModel = model('Team', TeamSchema);
