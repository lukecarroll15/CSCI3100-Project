import { Schema, model, type InferSchemaType } from 'mongoose';

const DepartmentSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export type DepartmentDoc = InferSchemaType<typeof DepartmentSchema>;
export const DepartmentModel = model('Department', DepartmentSchema);
