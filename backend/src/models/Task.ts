import { Schema, model, type InferSchemaType } from 'mongoose';

const TaskSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    department: { type: String, required: true, trim: true },
    assignee: { type: [String], default: ['Unassigned'] },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed'],
      default: 'Not Started',
    },
    completedAt: { type: Date },
    editedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export type TaskDoc = InferSchemaType<typeof TaskSchema>;
export const TaskModel = model('Task', TaskSchema);
