import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { TaskModel } from '../models/Task';
import { AppError } from '../errors/AppError';
import { hasTeamAdminAccess } from '../middleware/team';
import { UserModel } from '../models/User';
import { TeamMembershipModel } from '../models/TeamMembership';

const MAX_TASK_NAME_LENGTH = 80;
const AssigneeSchema = z.union([
  z.string().trim().min(1),
  z.array(z.string().trim().min(1)).min(1),
]);

const normalizeAssignees = (value: string | string[] | undefined) => {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  const cleaned = list.map((item) => item.trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
};

const normalizeIdentifiers = (value: string | undefined | null) =>
  value ? value.trim().toLowerCase() : '';

const buildIdentifierList = (values: Array<string | undefined | null>) =>
  values.map(normalizeIdentifiers).filter(Boolean);

const isAssigneeMatch = (assignees: string[], identifiers: string[]) =>
  assignees.some((assignee) => identifiers.includes(assignee.trim().toLowerCase()));

async function getCreatorMeta(teamId: string, creatorId: string) {
  const [creator, membership] = await Promise.all([
    UserModel.findById(creatorId).select('displayName email').lean(),
    TeamMembershipModel.findOne({ teamId, userId: creatorId }).select('role').lean(),
  ]);

  return {
    role: membership?.role,
    identifiers: buildIdentifierList([creator?.displayName, creator?.email]),
  };
}

function isPersonalTask({
  creatorRole,
  creatorIdentifiers,
  assignees,
}: {
  creatorRole: string | undefined;
  creatorIdentifiers: string[];
  assignees: string[];
}) {
  if (creatorRole === 'member') return true;
  if (!creatorRole) return false;
  if (assignees.length !== 1) return false;
  return isAssigneeMatch(assignees, creatorIdentifiers);
}

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
  assignee: AssigneeSchema.optional(),
  dueDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid due date')
    .optional(),
  status: z.enum(['Not Started', 'In Progress', 'Completed']).optional(),
});

export async function handleGetTasks(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    const teamId = req.team?.teamId;
    if (!teamId) {
      throw new AppError(400, 'TEAM_REQUIRED', 'Team context required');
    }
    if (!auth) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }

    const [tasks, user] = await Promise.all([
      TaskModel.find({ teamId }).sort({ createdAt: -1 }).lean(),
      UserModel.findById(auth.userId).select('displayName email').lean(),
    ]);

    const viewerIdentifiers = buildIdentifierList([user?.displayName, user?.email, auth.email]);
    const isTeamAdmin = hasTeamAdminAccess(req);
    const creatorMetaCache = new Map<string, { role: string | undefined; identifiers: string[] }>();

    const loadCreatorMeta = async (creatorId: string) => {
      const cached = creatorMetaCache.get(creatorId);
      if (cached) return cached;
      const meta = await getCreatorMeta(teamId, creatorId);
      creatorMetaCache.set(creatorId, meta);
      return meta;
    };

    const visibleTasks = await Promise.all(
      tasks.map(async (task) => {
        const creatorId = String(task.createdBy);
        const isCreator = creatorId === auth.userId;
        if (isCreator) return task;

        const assignees = normalizeAssignees(task.assignee);
        const creatorMeta = await loadCreatorMeta(creatorId);
        const personal = isPersonalTask({
          creatorRole: creatorMeta.role,
          creatorIdentifiers: creatorMeta.identifiers,
          assignees,
        });
        const isAssignee = isAssigneeMatch(assignees, viewerIdentifiers);
        const canView = !personal && (isTeamAdmin || isAssignee);
        return canView ? task : null;
      })
    );

    const filteredTasks = visibleTasks.filter(
      (task): task is (typeof tasks)[number] => Boolean(task)
    );
    return res.json({ tasks: filteredTasks });
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

    const teamId = req.team?.teamId;
    if (!teamId) {
      throw new AppError(400, 'TEAM_REQUIRED', 'Team context required');
    }

    const parsed = CreateTaskSchema.parse(req.body);

    const assignees = normalizeAssignees(parsed.assignee);
    let finalAssignees = assignees;
    if (!hasTeamAdminAccess(req)) {
      const user = await UserModel.findById(auth.userId).select('displayName email').lean();
      const selfLabel = (user?.displayName || user?.email || auth.email || '').trim();
      if (!selfLabel) {
        throw new AppError(400, 'ASSIGNEE_REQUIRED', 'Assignee is required');
      }
      finalAssignees = [selfLabel];
    }

    const task = await TaskModel.create({
      name: parsed.name,
      description: parsed.description || '',
      priority: parsed.priority,
      department: parsed.department,
      assignee: finalAssignees,
      dueDate: new Date(parsed.dueDate),
      status: 'Not Started',
      createdBy: auth.userId,
      teamId,
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

    const teamId = req.team?.teamId;
    if (!teamId) {
      throw new AppError(400, 'TEAM_REQUIRED', 'Team context required');
    }

    const { id } = req.params;
    const parsed = UpdateTaskSchema.parse(req.body);

    const task = await TaskModel.findOne({ _id: id, teamId });
    if (!task) {
      throw new AppError(404, 'NOT_FOUND', 'Task not found');
    }

    const user = await UserModel.findById(auth.userId).select('displayName email').lean();
    const viewerIdentifiers = buildIdentifierList([user?.displayName, user?.email, auth.email]);
    const isTeamAdmin = hasTeamAdminAccess(req);
    const creatorId = String(task.createdBy);
    const isCreator = creatorId === auth.userId;
    const assignees = normalizeAssignees(task.assignee);
    const creatorMeta = await getCreatorMeta(teamId, creatorId);
    const personal = isPersonalTask({
      creatorRole: creatorMeta.role,
      creatorIdentifiers: creatorMeta.identifiers,
      assignees,
    });
    const isAssignee = isAssigneeMatch(assignees, viewerIdentifiers);
    const canView = isCreator || (!personal && (isTeamAdmin || isAssignee));

    if (!canView) {
      throw new AppError(403, 'FORBIDDEN', 'Not authorized to access this task');
    }

    const canEditDetails = isCreator || (isTeamAdmin && !personal);
    const canChangeStatus = isCreator || isAssignee || (isTeamAdmin && !personal);

    let hasNonStatusChange = false;
    let hasStatusChange = false;
    let nextAssignees: string[] | null = null;

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
      nextAssignees = assignees;
      if (assignees.join('|') !== task.assignee.join('|')) {
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
    if (parsed.status !== undefined && parsed.status !== task.status) {
      hasStatusChange = true;
    }

    if (hasNonStatusChange && !canEditDetails) {
      throw new AppError(403, 'FORBIDDEN', 'Only the task creator can edit details');
    }
    if (hasStatusChange && !canChangeStatus) {
      throw new AppError(403, 'FORBIDDEN', 'Not authorized to update task status');
    }

    if (nextAssignees) {
      if (creatorMeta.role === 'member') {
        const isSelfOnly =
          nextAssignees.length === 1 &&
          isAssigneeMatch(nextAssignees, creatorMeta.identifiers);
        if (!isSelfOnly) {
          throw new AppError(
            400,
            'ASSIGNEE_RESTRICTED',
            'Members can only assign tasks to themselves'
          );
        }
      }
      if (nextAssignees.join('|') !== task.assignee.join('|')) {
        task.assignee = nextAssignees;
      }
    }

    if (hasStatusChange && parsed.status) {
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

    const teamId = req.team?.teamId;
    if (!teamId) {
      throw new AppError(400, 'TEAM_REQUIRED', 'Team context required');
    }

    const { id } = req.params;
    const task = await TaskModel.findOne({ _id: id, teamId });

    if (!task) {
      throw new AppError(404, 'NOT_FOUND', 'Task not found');
    }

    const user = await UserModel.findById(auth.userId).select('displayName email').lean();
    const viewerIdentifiers = buildIdentifierList([user?.displayName, user?.email, auth.email]);
    const isTeamAdmin = hasTeamAdminAccess(req);
    const creatorId = String(task.createdBy);
    const isCreator = creatorId === auth.userId;
    const assignees = normalizeAssignees(task.assignee);
    const creatorMeta = await getCreatorMeta(teamId, creatorId);
    const personal = isPersonalTask({
      creatorRole: creatorMeta.role,
      creatorIdentifiers: creatorMeta.identifiers,
      assignees,
    });
    const isAssignee = isAssigneeMatch(assignees, viewerIdentifiers);
    const canView = isCreator || (!personal && (isTeamAdmin || isAssignee));

    if (!canView) {
      throw new AppError(403, 'FORBIDDEN', 'Not authorized to access this task');
    }

    const canDelete = isCreator || (isTeamAdmin && !personal);
    if (!canDelete) {
      throw new AppError(403, 'FORBIDDEN', 'Not authorized to delete this task');
    }

    await task.deleteOne();
    return res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    return next(err);
  }
}
