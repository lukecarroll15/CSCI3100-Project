import { Schema, model, type InferSchemaType } from 'mongoose';

const FileSchema = new Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isAdminOnly: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type FileDoc = InferSchemaType<typeof FileSchema>;
export const FileModel = model('File', FileSchema);
