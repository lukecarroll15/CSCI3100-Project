import { apiDelete, apiJson, apiPostJson } from './client';

export interface Department {
  _id: string;
  name: string;
}

export type DepartmentUsage = {
  taskCount: number;
  fileCount: number;
};

export async function listDepartments(): Promise<Department[]> {
  return apiJson<Department[]>('/departments');
}

export async function createDepartment(name: string): Promise<Department> {
  return apiPostJson<Department>('/departments', { name });
}

export async function getDepartmentUsage(id: string): Promise<DepartmentUsage> {
  return apiJson<DepartmentUsage>(`/departments/${id}/usage`);
}

export async function deleteDepartment(id: string, options?: { force?: boolean }): Promise<void> {
  const query = options?.force ? '?force=true' : '';
  return apiDelete<void>(`/departments/${id}${query}`);
}
