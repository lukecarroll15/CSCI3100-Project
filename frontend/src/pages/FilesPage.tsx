import React, { useEffect, useState } from 'react';
import { listFiles, uploadFile, getDownloadUrl, type FileItem } from '../api/files';
import Button from '../components/ui/Button';
import { useAuth } from '../auth/useAuth';

export default function FilesPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAdminOnly, setIsAdminOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  async function loadFiles() {
    try {
      setLoading(true);
      const data = await listFiles();
      setFiles(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setNotice(null);

      console.log('Uploading file:', { name: file.name, size: file.size, type: file.type, isAdminOnly });
      await uploadFile(file, isAdminOnly);
      await loadFiles();
      // Reset input
      e.target.value = '';

      if (isAdminOnly) {
        setNotice('Uploaded. Admin-only files are hidden unless you are an admin.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to upload file';
      setError(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Files</h1>
          <p className="text-neutral-500">Manage your project attachments.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input 
              type="checkbox" 
              checked={isAdminOnly} 
              onChange={e => setIsAdminOnly(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Admin Access Only
          </label>

          <div className="relative">
            <input
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <Button disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {notice && (
        <div className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-neutral-500">Loading files...</div>
      ) : files.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center">
          <p className="text-neutral-500">No files uploaded yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Size</th>
                <th className="px-6 py-3 font-medium">Uploaded By</th>
                <th className="px-6 py-3 font-medium">Access</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {files.map((file) => (
                <tr key={file._id} className="group hover:bg-neutral-50">
                  <td className="px-6 py-4 font-medium text-neutral-900">
                    {file.originalName}
                  </td>
                  <td className="px-6 py-4 text-neutral-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-6 py-4 text-neutral-500">
                    {file.uploadedBy?.displayName || file.uploadedBy?.email || 'Unknown'}
                  </td>
                  <td className="px-6 py-4">
                    {file.isAdminOnly ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                        Admin Only
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        Public
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-neutral-500">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a
                      href={getDownloadUrl(file._id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
