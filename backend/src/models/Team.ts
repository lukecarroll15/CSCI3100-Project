import { Schema, model, type InferSchemaType } from 'mongoose';

const TeamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inviteOnly: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TeamSchema.index({ name: 1 }, { unique: true });

export type TeamDoc = InferSchemaType<typeof TeamSchema>;
export const TeamModel = model('Team', TeamSchema);
