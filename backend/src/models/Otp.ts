import { Schema, model, type InferSchemaType } from 'mongoose';

const OtpSchema = new Schema(
  {
    email: { type: String, required: true, index: true, trim: true, lowercase: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

OtpSchema.index({ email: 1, createdAt: -1 });

export type OtpDoc = InferSchemaType<typeof OtpSchema>;
export const OtpModel = model('Otp', OtpSchema);
