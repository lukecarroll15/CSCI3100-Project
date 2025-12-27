import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const TaskSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    department: { type: String, required: true, trim: true },
    assignee: { type: [String], default: [] },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed'],
      default: 'Not Started',
    },
    completedAt: { type: Date },
    editedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  },
  { timestamps: true }
);

export type TaskDoc = InferSchemaType<typeof TaskSchema> & { _id: Types.ObjectId };
export const TaskModel = model('Task', TaskSchema);
