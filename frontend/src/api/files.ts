import { apiJson } from './client';

export interface FileItem {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: {
    _id: string;
    displayName: string;
    email: string;
  };
  department: string;
  folder: string | null;
  isAdminOnly: boolean;
  isPrivate: boolean;
  createdAt: string;
}

export async function listFiles(
  folderId?: string | null,
  access: 'all' | 'standard' | 'admin' | 'private' = 'all'
): Promise<FileItem[]> {
  const params = new URLSearchParams();
  if (folderId) params.append('folder', folderId);
  if (access && access !== 'all') params.append('access', access);

  const query = params.toString();
  const url = query ? `/files?${query}` : '/files';
  return apiJson<FileItem[]>(url, { method: 'GET' });
}

export async function uploadFile(
  file: File,
  isAdminOnly: boolean,
  isPrivate: boolean,
  department: string = 'General',
  folderId: string | null = null
): Promise<FileItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('isAdminOnly', String(isAdminOnly));
  formData.append('isPrivate', String(isPrivate));
  formData.append('department', department);
  if (folderId) {
    formData.append('folder', folderId);
  }

  console.log('uploadFile called with:', {
    fileName: file.name,
    isAdminOnly,
    department,
    folderId,
  });

  return apiJson<FileItem>('/files', {
    method: 'POST',
    body: formData,
  });
}

export async function deleteFile(fileId: string): Promise<void> {
  return apiJson<void>(`/files/${fileId}`, { method: 'DELETE' });
}

export async function deleteFolder(folderId: string): Promise<void> {
  return apiJson<void>(`/folders/${folderId}`, { method: 'DELETE' });
}

export function getDownloadUrl(fileId: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
  return `${baseUrl}/files/${fileId}/download`;
}
