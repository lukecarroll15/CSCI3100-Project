import mongoose, { Schema, Document } from 'mongoose';

export interface IFolder extends Document {
  name: string;
  parentFolder?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  department: string;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema: Schema = new Schema({
  name: { type: String, required: true },
  parentFolder: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  department: { type: String, default: 'General' },
}, { timestamps: true });

// Ensure unique folder names within the same parent folder for a user (or globally if preferred)
FolderSchema.index({ name: 1, parentFolder: 1 }, { unique: true });

export default mongoose.model<IFolder>('Folder', FolderSchema);
