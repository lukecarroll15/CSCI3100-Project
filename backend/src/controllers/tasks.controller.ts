import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { TaskModel } from '../models/Task';
import { AppError } from '../errors/AppError';

const MAX_TASK_NAME_LENGTH = 80;
const AssigneeSchema = z
  .union([z.string().trim().min(1), z.array(z.string().trim().min(1))])
  .optional();

const normalizeAssignees = (value: string | string[] | undefined) => {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  const cleaned = list.map((item) => item.trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
};

const CreateTaskSchema = z.object({
  name: z.string().trim().min(1, 'Task name is required').max(MAX_TASK_NAME_LENGTH),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  department: z.string().trim().min(1, 'Department is required'),
  assignee: AssigneeSchema,
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid due date'),
});

const UpdateTaskSchema = z.object({
  name: z.string().trim().min(1).max(MAX_TASK_NAME_LENGTH).optional(),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  department: z.string().trim().min(1).optional(),
  assignee: AssigneeSchema,
  dueDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid due date')
    .optional(),
  status: z.enum(['Not Started', 'In Progress', 'Completed']).optional(),
});

export async function handleGetTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const tasks = await TaskModel.find().sort({ createdAt: -1 });
    return res.json({ tasks });
  } catch (err) {
    return next(err);
  }
}

export async function handleCreateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    if (auth.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Admin access required');
    }

    const parsed = CreateTaskSchema.parse(req.body);

    const assignees = normalizeAssignees(parsed.assignee);
    const task = await TaskModel.create({
      name: parsed.name,
      description: parsed.description || '',
      priority: parsed.priority,
      department: parsed.department,
      assignee: assignees.length ? assignees : ['Unassigned'],
      dueDate: new Date(parsed.dueDate),
      status: 'Not Started',
      createdBy: auth.userId,
    });

    return res.status(201).json({ task });
  } catch (err) {
    return next(err);
  }
}

export async function handleUpdateTask(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    if (auth.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Admin access required');
    }

    const { id } = req.params;
    const parsed = UpdateTaskSchema.parse(req.body);

    const task = await TaskModel.findById(id);
    if (!task) {
      throw new AppError(404, 'NOT_FOUND', 'Task not found');
    }

    let hasNonStatusChange = false;

    if (parsed.name !== undefined && parsed.name !== task.name) {
      task.name = parsed.name;
      hasNonStatusChange = true;
    }
    if (parsed.description !== undefined && parsed.description !== task.description) {
      task.description = parsed.description;
      hasNonStatusChange = true;
    }
    if (parsed.priority !== undefined && parsed.priority !== task.priority) {
      task.priority = parsed.priority;
      hasNonStatusChange = true;
    }
    if (parsed.department !== undefined && parsed.department !== task.department) {
      task.department = parsed.department;
      hasNonStatusChange = true;
    }
    if (parsed.assignee !== undefined) {
      const assignees = normalizeAssignees(parsed.assignee);
      const nextAssignees = assignees.length ? assignees : ['Unassigned'];
      if (nextAssignees.join('|') !== task.assignee.join('|')) {
        task.assignee = nextAssignees;
        hasNonStatusChange = true;
      }
    }
    if (parsed.dueDate !== undefined) {
      const nextDueDate = new Date(parsed.dueDate);
      if (task.dueDate.getTime() !== nextDueDate.getTime()) {
        task.dueDate = nextDueDate;
        hasNonStatusChange = true;
      }
    }
    if (parsed.status !== undefined) {
      task.status = parsed.status;
      if (parsed.status === 'Completed' && !task.completedAt) {
        task.completedAt = new Date();
      } else if (parsed.status !== 'Completed') {
        task.completedAt = undefined;
      }
    }

    if (hasNonStatusChange) {
      task.editedAt = new Date();
    }

    await task.save();

    return res.json({ task });
  } catch (err) {
    return next(err);
  }
}

export async function handleDeleteTask(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    if (auth.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Admin access required');
    }

    const { id } = req.params;
    const task = await TaskModel.findByIdAndDelete(id);

    if (!task) {
      throw new AppError(404, 'NOT_FOUND', 'Task not found');
    }

    return res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    return next(err);
  }
}
