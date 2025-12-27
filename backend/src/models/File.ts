import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const FileSchema = new Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    department: { type: String, default: 'General' },
    folder: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
    isAdminOnly: { type: Boolean, default: false },
    isPrivate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type FileDoc = InferSchemaType<typeof FileSchema> & { _id: Types.ObjectId };
export const FileModel = model('File', FileSchema);
