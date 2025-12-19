import { Schema, model } from 'mongoose';

const OtpSchema = new Schema(
  {
    email: { type: String, required: true, index: true, trim: true, lowercase: true },
    purpose: {
      type: String,
      required: true,
      enum: ['login', 'signup'],
      default: 'login',
      index: true,
    },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    attempts: { type: Number, required: true, default: 0 },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OtpSchema.index({ email: 1, createdAt: -1 });

export const OtpModel = model('Otp', OtpSchema);
