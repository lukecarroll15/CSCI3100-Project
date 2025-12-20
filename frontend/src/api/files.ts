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
  isAdminOnly: boolean;
  createdAt: string;
}

export async function listFiles(): Promise<FileItem[]> {
  return apiJson<FileItem[]>('/files', { method: 'GET' });
}

export async function uploadFile(file: File, isAdminOnly: boolean): Promise<FileItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('isAdminOnly', String(isAdminOnly));

  console.log('uploadFile called with:', { fileName: file.name, isAdminOnly });

  return apiJson<FileItem>('/files', {
    method: 'POST',
    body: formData,
  });
}

export function getDownloadUrl(fileId: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
  return `${baseUrl}/files/${fileId}/download`;
}
