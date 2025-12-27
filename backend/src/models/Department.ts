import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  },
  { timestamps: true }
);

DepartmentSchema.index({ teamId: 1, name: 1 }, { unique: true });

export type DepartmentDoc = InferSchemaType<typeof DepartmentSchema> & { _id: Types.ObjectId };
export const DepartmentModel = model('Department', DepartmentSchema);
