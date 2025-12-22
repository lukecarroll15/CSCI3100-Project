import React, { useEffect, useState, useMemo } from 'react';
import mammoth from 'mammoth';
import { useAuth } from '../auth/useAuth';
import { listFiles, uploadFile, deleteFile, getDownloadUrl, type FileItem } from '../api/files';
import { listFolders, createFolder, deleteFolder, listAllFolders, type FolderItem } from '../api/folders';
import { listDepartments, createDepartment, type Department } from '../api/departments';
import Button from '../components/ui/Button';
import FilePreviewModal from '../components/files/FilePreviewModal';

const FILE_TYPES = ['All', 'Documents', 'Spreadsheets', 'PDFs', 'Images'];

type FolderNode = FolderItem & { children: FolderNode[] };

function buildFolderTree(folders: FolderItem[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  // Initialize map
  folders.forEach(f => {
    map.set(f._id, { ...f, children: [] });
  });

  // Build tree
  folders.forEach(f => {
    const node = map.get(f._id)!;
    if (f.parentFolder && map.has(f.parentFolder)) {
      map.get(f.parentFolder)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function FolderTreeItem({ 
  node, 
  currentFolderId, 
  onSelect 
}: { 
  node: FolderNode; 
  currentFolderId: string | null; 
  onSelect: (folder: FolderNode) => void; 
}) {
  const [expanded, setExpanded] = useState(false);
  const isSelected = currentFolderId === node._id;
  const hasChildren = node.children.length > 0;

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors cursor-pointer ${
          isSelected ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
        }`}
        onClick={() => onSelect(node)}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className={`flex h-6 w-6 items-center justify-center rounded hover:bg-neutral-200/50 ${hasChildren ? 'visible' : 'invisible'}`}
        >
          <span className="text-[10px]">{expanded ? '▼' : '▶'}</span>
        </button>
        <span className="text-lg">📁</span>
        <span className="truncate">{node.name}</span>
      </div>
      
      {expanded && hasChildren && (
        <div className="ml-3 border-l border-neutral-200 pl-1">
          {node.children.map(child => (
            <FolderTreeItem 
              key={child._id} 
              node={child} 
              currentFolderId={currentFolderId} 
              onSelect={onSelect} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getFileCategory(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'PDFs';
  if (['doc', 'docx', 'txt', 'md'].includes(ext || '')) return 'Documents';
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) return 'Spreadsheets';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) return 'Images';
  return 'Other';
}

function FileIcon({ fileName, isFolder }: { fileName: string; isFolder?: boolean }) {
  if (isFolder) return <span className="text-amber-500 text-4xl">📁</span>;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <span className="text-red-500 font-bold">PDF</span>;
  if (['doc', 'docx'].includes(ext || '')) return <span className="text-blue-500 font-bold">DOC</span>;
  if (['xls', 'xlsx'].includes(ext || '')) return <span className="text-green-500 font-bold">XLS</span>;
  if (['png', 'jpg', 'jpeg'].includes(ext || '')) return <span className="text-purple-500 font-bold">IMG</span>;
  return <span className="text-gray-500 font-bold">FILE</span>;
}

export default function FilesPage() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAdminOnly, setIsAdminOnly] = useState(false);
  const [uploadDept, setUploadDept] = useState('General');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [selectedFolder, setSelectedFolder] = useState('All Files');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [previewFile, setPreviewFile] = useState<{ 
    name: string; 
    type: 'markdown' | 'image' | 'pdf' | 'docx'; 
    content?: string; 
    url?: string; 
  } | null>(null);

  useEffect(() => {
    loadData();
    loadFolderTree();
    loadDepartments();
  }, [currentFolderId, selectedFolder]); // Reload when folder or sidebar selection changes

  async function loadDepartments() {
    try {
      const data = await listDepartments();
      setDepartments(data);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  }

  async function handleAddDepartment() {
    const name = prompt('Enter new department name:');
    if (!name) return;
    try {
      await createDepartment(name);
      await loadDepartments();
    } catch (err: any) {
      alert(err.message || 'Failed to create department');
    }
  }

  async function loadFolderTree() {
    try {
      const allFolders = await listAllFolders();
      const tree = buildFolderTree(allFolders);
      setFolderTree(tree);
    } catch (err) {
      console.error('Failed to load folder tree', err);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      // Pass selectedFolder as department filter if we are at root level
      const department = selectedFolder === 'All Files' ? 'All' : selectedFolder;
      
      const [filesData, foldersData] = await Promise.all([
        listFiles(currentFolderId),
        listFolders(currentFolderId, department)
      ]);
      setFiles(filesData);
      setFolders(foldersData);
    } catch (err) {
      console.error(err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const typeMatch = typeFilter === 'All' || getFileCategory(file.originalName) === typeFilter;
      // If we are in a specific folder, we don't filter by "selectedFolder" (which is the sidebar category)
      // unless we are in "All Files" mode.
      // But wait, listFiles already filters by folderId.
      // If currentFolderId is null (root), we should filter by selectedFolder (department).
      
      let deptMatch = true;
      if (!currentFolderId) {
         if (selectedFolder !== 'All Files') {
             deptMatch = file.department === selectedFolder;
         }
      }
      
      // Also apply the dropdown filter if it's set
      const dropdownDeptMatch = deptFilter === 'All' || file.department === deptFilter;

      return typeMatch && deptMatch && dropdownDeptMatch;
    });
  }, [files, typeFilter, deptFilter, selectedFolder, currentFolderId]);

  async function handleCreateFolder() {
    const name = prompt('Enter folder name:');
    if (!name) return;

    try {
      // If we are at root (All Files), the new folder becomes a root folder (and thus a sidebar item)
      // We default department to 'General' or whatever logic we want.
      // Since we removed the concept of "Department" selection from sidebar, we can just use 'General'
      // or maybe inherit from parent if nested.
      
      const department = 'General'; 
      console.log('Creating folder with department:', department);
      await createFolder(name, currentFolderId, department);
      await loadData();
      await loadFolderTree();
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    }
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm('Are you sure you want to delete this folder?')) return;
    try {
      await deleteFolder(id);
      await loadData();
      await loadFolderTree();
    } catch (err: any) {
      setError(err.message || 'Failed to delete folder');
    }
  }

  async function handleDeleteFile(id: string) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await deleteFile(id);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete file');
    }
  }

  async function handlePreview(file: FileItem) {
    const isImage = /\.(png|jpe?g)$/i.test(file.originalName);
    const isMarkdown = /\.md$/i.test(file.originalName);
    const isPdf = /\.pdf$/i.test(file.originalName);
    const isDocx = /\.docx$/i.test(file.originalName);

    try {
      const response = await fetch(getDownloadUrl(file._id), { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch file');

      if (isImage || isPdf) {
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        
        setPreviewFile({
          name: file.originalName,
          type: isImage ? 'image' : 'pdf',
          url: objectUrl
        });
        return;
      }

      if (isMarkdown) {
        const text = await response.text();
        setPreviewFile({ name: file.originalName, type: 'markdown', content: text });
        return;
      }

      if (isDocx) {
        const arrayBuffer = await response.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setPreviewFile({ name: file.originalName, type: 'docx', content: result.value });
        return;
      }

    } catch (err) {
      console.error('Preview error:', err);
      setError('Failed to load preview');
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setNotice(null);

      await uploadFile(file, isAdminOnly, uploadDept, currentFolderId);
      await loadData();
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
    <div className="flex h-full gap-8">
      {/* Sub-sidebar for Folders */}
      <aside className="w-48 flex-shrink-0 border-r border-neutral-200 pr-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-500">My Files</h2>
        <nav className="space-y-1">
          <button
            onClick={() => {
              setSelectedFolder('All Files');
              setCurrentFolderId(null);
            }}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              selectedFolder === 'All Files' && !currentFolderId
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            📁 All Files
          </button>
          
          {folderTree.map(node => (
            <FolderTreeItem
              key={node._id}
              node={node}
              currentFolderId={currentFolderId}
              onSelect={(folder) => {
                setCurrentFolderId(folder._id);
                setSelectedFolder(folder.name);
              }}
            />
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <button 
              onClick={() => {
                setCurrentFolderId(null);
                setSelectedFolder('All Files');
              }}
              className="hover:text-neutral-900"
            >
              Home
            </button>
            <span>&gt;</span>
            <span className="font-medium text-neutral-900">{selectedFolder}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button onClick={handleCreateFolder} variant="secondary" className="text-xs font-bold">
              + New Folder
            </Button>
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded px-3 py-1 text-xs font-medium ${viewMode === 'grid' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500'}`}
              >
                Grid View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded px-3 py-1 text-xs font-medium ${viewMode === 'list' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500'}`}
              >
                List View
              </button>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap items-center gap-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase text-neutral-400">File Type:</span>
            <div className="flex gap-1">
              {FILE_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    typeFilter === type ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase text-neutral-400">Department:</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setDeptFilter('All')}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  deptFilter === 'All' ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
                }`}
              >
                All
              </button>
              {departments.map(dept => (
                <button
                  key={dept._id}
                  onClick={() => setDeptFilter(dept.name)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    deptFilter === dept.name ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {dept.name}
                </button>
              ))}
              <button
                onClick={handleAddDepartment}
                className="rounded-full border border-dashed border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-400 hover:border-neutral-400 hover:text-neutral-600"
                title="Add Department"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-neutral-500">Loading...</div>
        ) : (filteredFiles.length === 0 && folders.length === 0) ? (
          <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center">
            <p className="text-neutral-500">No files or folders found matching your filters.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Folders first */}
            {folders.map((folder) => (
              <div 
                key={folder._id} 
                onClick={() => {
                  setCurrentFolderId(folder._id);
                  setSelectedFolder(folder.name);
                }}
                className="group relative flex cursor-pointer flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-xl bg-amber-50 text-2xl">
                  <FileIcon fileName="" isFolder />
                </div>
                <h3 className="mb-1 w-full truncate text-center text-sm font-bold text-neutral-900" title={folder.name}>
                  {folder.name}
                </h3>
                <p className="text-[10px] text-neutral-400">Folder</p>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder._id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                >
                  🗑️
                </button>
              </div>
            ))}

            {/* Files */}
            {filteredFiles.map((file) => (
              <div key={file._id} className="group relative flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:shadow-md">
                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-xl bg-neutral-50 text-2xl">
                  <FileIcon fileName={file.originalName} />
                </div>
                <h3 className="mb-1 w-full truncate text-center text-sm font-bold text-neutral-900" title={file.originalName}>
                  {file.originalName}
                </h3>
                <p className="text-[10px] text-neutral-400">
                  {(file.size / 1024).toFixed(1)} KB • {new Date(file.createdAt).toLocaleDateString()}
                </p>
                <p className="mt-1 text-[10px] font-medium text-neutral-500">
                  {file.uploadedBy?.displayName || 'Unknown'} • <span className="text-neutral-400">{file.department}</span>
                </p>
                
                {file.isAdminOnly && (
                  <span className="mt-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    Admin Only
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(file._id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                >
                  🗑️
                </button>

                <div className="mt-4 flex w-full gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handlePreview(file)}
                    className="flex-1 rounded-lg bg-neutral-100 py-2 text-xs font-bold text-neutral-900 hover:bg-neutral-200"
                  >
                    Preview
                  </button>
                  <a
                    href={getDownloadUrl(file._id)}
                    className="flex-1 rounded-lg bg-neutral-900 py-2 text-center text-xs font-bold text-white hover:bg-neutral-800"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Size</th>
                  <th className="px-6 py-3 font-medium">Department</th>
                  <th className="px-6 py-3 font-medium">Uploaded By</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {/* Folders */}
                {folders.map((folder) => (
                  <tr 
                    key={folder._id} 
                    onClick={() => {
                      setCurrentFolderId(folder._id);
                      setSelectedFolder(folder.name);
                    }}
                    className="group cursor-pointer hover:bg-neutral-50"
                  >
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      <div className="flex items-center gap-3">
                        <FileIcon fileName="" isFolder />
                        {folder.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">--</td>
                    <td className="px-6 py-4 text-neutral-500">Folder</td>
                    <td className="px-6 py-4 text-neutral-500">
                      {folder.createdBy?.displayName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {new Date(folder.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder._id);
                        }}
                        className="font-medium text-red-600 hover:text-red-900 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Files */}
                {filteredFiles.map((file) => (
                  <tr key={file._id} className="group hover:bg-neutral-50">
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      <div className="flex items-center gap-3">
                        <FileIcon fileName={file.originalName} />
                        {file.originalName}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600">
                        {file.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {file.uploadedBy?.displayName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handlePreview(file)}
                          className="font-medium text-neutral-600 hover:text-neutral-900 hover:underline"
                        >
                          Preview
                        </button>
                        <a
                          href={getDownloadUrl(file._id)}
                          className="font-medium text-neutral-900 hover:underline"
                        >
                          Download
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file._id);
                          }}
                          className="font-medium text-red-600 hover:text-red-900 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Upload Button */}
      <div className="fixed bottom-8 right-8 flex flex-col items-end gap-4">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-neutral-200">
          <select
            value={uploadDept}
            onChange={(e) => setUploadDept(e.target.value)}
            className="rounded-lg border-neutral-200 text-xs font-bold text-neutral-700 focus:border-neutral-900 focus:ring-neutral-900"
          >
            {departments.map(dept => (
              <option key={dept._id} value={dept.name}>{dept.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs font-bold text-neutral-700">
            <input 
              type="checkbox" 
              checked={isAdminOnly} 
              onChange={e => setIsAdminOnly(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Admin Only
          </label>
          <div className="relative">
            <input
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <button className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-lg transition-transform hover:scale-105 active:scale-95">
              {uploading ? '...' : '↑'}
            </button>
          </div>
        </div>
      </div>

      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => {
          if (previewFile?.url && (previewFile.type === 'image' || previewFile.type === 'pdf')) {
            URL.revokeObjectURL(previewFile.url);
          }
          setPreviewFile(null);
        }}
        fileName={previewFile?.name || ''}
        content={previewFile?.content}
        url={previewFile?.url}
        type={previewFile?.type || 'markdown'}
      />
    </div>
  );
}

