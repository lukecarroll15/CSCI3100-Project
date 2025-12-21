import { Schema, model, type InferSchemaType } from 'mongoose';

const CanvasBoardSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export type CanvasBoardDoc = InferSchemaType<typeof CanvasBoardSchema>;
export const CanvasBoardModel = model('CanvasBoard', CanvasBoardSchema);
