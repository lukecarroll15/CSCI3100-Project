import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    displayName: { type: String, default: '' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    adminLevel: { type: String, enum: ['owner', 'admin'], default: null },

    githubId: { type: String, unique: true, sparse: true, index: true },
    githubUsername: { type: String, default: '' },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: Types.ObjectId };
export const UserModel = model('User', UserSchema);
