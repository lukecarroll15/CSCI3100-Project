import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { TaskModel } from '../models/Task';
import { AppError } from '../errors/AppError';

const CreateTaskSchema = z.object({
  name: z.string().trim().min(1, 'Task name is required'),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  department: z.enum(['sales', 'it', 'finance', 'marketing', 'hr', 'customer-service']),
  assignee: z.string().optional(),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid due date'),
});

const UpdateTaskSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  department: z.enum(['sales', 'it', 'finance', 'marketing', 'hr', 'customer-service']).optional(),
  assignee: z.string().optional(),
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

    const task = await TaskModel.create({
      name: parsed.name,
      description: parsed.description || '',
      priority: parsed.priority,
      department: parsed.department,
      assignee: parsed.assignee || 'Unassigned',
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

    if (parsed.name !== undefined) task.name = parsed.name;
    if (parsed.description !== undefined) task.description = parsed.description;
    if (parsed.priority !== undefined) task.priority = parsed.priority;
    if (parsed.department !== undefined) task.department = parsed.department;
    if (parsed.assignee !== undefined) task.assignee = parsed.assignee;
    if (parsed.dueDate !== undefined) task.dueDate = new Date(parsed.dueDate);
    if (parsed.status !== undefined) {
      task.status = parsed.status;
      if (parsed.status === 'Completed' && !task.completedAt) {
        task.completedAt = new Date();
      } else if (parsed.status !== 'Completed') {
        task.completedAt = undefined;
      }
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
