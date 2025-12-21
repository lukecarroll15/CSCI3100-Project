import { apiGet, apiPostJson, apiPatchJson, apiDelete } from './client';

export type Priority = 'high' | 'medium' | 'low';
export type Department = 'sales' | 'it' | 'finance' | 'marketing' | 'hr' | 'customer-service';
export type TaskStatus = 'Not Started' | 'In Progress' | 'Completed';

export type Task = {
  _id: string;
  name: string;
  description: string;
  priority: Priority;
  department: Department;
  assignee: string;
  dueDate: string;
  status: TaskStatus;
  completedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskPayload = {
  name: string;
  description?: string;
  priority: Priority;
  department: Department;
  assignee?: string;
  dueDate: string;
};

export type UpdateTaskPayload = {
  name?: string;
  description?: string;
  priority?: Priority;
  department?: Department;
  assignee?: string;
  dueDate?: string;
  status?: TaskStatus;
};

export async function getTasks(): Promise<Task[]> {
  const res = await apiGet<{ tasks: Task[] }>('/tasks');
  return res.tasks;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const res = await apiPostJson<{ task: Task }>('/tasks', payload);
  return res.task;
}

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  const res = await apiPatchJson<{ task: Task }>(`/tasks/${id}`, payload);
  return res.task;
}

export async function deleteTask(id: string): Promise<void> {
  await apiDelete(`/tasks/${id}`);
}
