import { apiDelete, apiJson, apiPostJson } from './client';

export interface Department {
  _id: string;
  name: string;
}

export async function listDepartments(): Promise<Department[]> {
  return apiJson<Department[]>('/departments');
}

export async function createDepartment(name: string): Promise<Department> {
  return apiPostJson<Department>('/departments', { name });
}

export async function deleteDepartment(id: string): Promise<void> {
  return apiDelete<void>(`/departments/${id}`);
}
