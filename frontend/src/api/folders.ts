import { apiJson } from './client';

export interface FolderItem {
  _id: string;
  name: string;
  parentFolder: string | null;
  createdBy: {
    _id: string;
    displayName: string;
    email: string;
  };
  department: string;
  createdAt: string;
  updatedAt: string;
}

export async function listFolders(parentFolder: string | null = null, department: string = 'All'): Promise<FolderItem[]> {
  const params = new URLSearchParams();
  if (parentFolder) params.append('parentFolder', parentFolder);
  if (department && department !== 'All' && department !== 'All Files') params.append('department', department);
  
  const url = `/folders?${params.toString()}`;
  return apiJson<FolderItem[]>(url, { method: 'GET' });
}

export async function listAllFolders(): Promise<FolderItem[]> {
  return apiJson<FolderItem[]>('/folders?all=true', { method: 'GET' });
}

export async function createFolder(name: string, parentFolder: string | null = null, department: string = 'General'): Promise<FolderItem> {
  return apiJson<FolderItem>('/folders', {
    method: 'POST',
    body: JSON.stringify({ name, parentFolder, department }),
  });
}

export async function deleteFolder(id: string): Promise<void> {
  return apiJson<void>(`/folders/${id}`, { method: 'DELETE' });
}
