import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mammoth from 'mammoth';
import { useAuth } from '../auth/useAuth';
import { ApiRequestError } from '../api/client';
import { listFiles, uploadFile, deleteFile, getDownloadUrl, type FileItem } from '../api/files';
import {
  listFolders,
  createFolder,
  deleteFolder,
  listAllFolders,
  type FolderItem,
} from '../api/folders';
import {
  listDepartments,
  createDepartment,
  deleteDepartment,
  getDepartmentUsage,
  type DepartmentUsage,
  type Department,
} from '../api/departments';
import Button from '../components/ui/Button';
import FilePreviewModal from '../components/files/FilePreviewModal';
import { IconFile, IconFolder } from '../components/ui/Icons';

const FILE_TYPES = ['All', 'Documents', 'Spreadsheets', 'PDFs', 'Images'];
const MAX_FOLDER_NAME_LENGTH = 48;
const MAX_DEPARTMENT_NAME_LENGTH = 32;
const MAX_FOLDER_DEPTH = 4;
const FOLDER_DEPARTMENT = 'Workspace';
const FILES_UI_STATE_KEY = 'filesPageState:v2';
const GRID_TITLE_MAX = 25;
const GRID_META_MAX = 12;
const LIST_NAME_MAX = 32;
const LIST_DEPARTMENT_MAX = 18;
const LIST_UPLOADER_MAX = 18;

type FilesUiState = {
  currentFolderId: string | null;
  viewMode: 'grid' | 'list';
  typeFilter: string;
  deptFilter: string;
  accessFilter: 'all' | 'standard' | 'admin' | 'private';
  uploadDept: string;
  expandedFolderIds: string[];
  scrollY: number;
  sidebarScrollTop: number;
};

type ConfirmAction =
  | { type: 'folder'; id: string; name: string }
  | { type: 'file'; id: string; name: string }
  | { type: 'department'; id: string; name: string };

type FolderNode = FolderItem & { children: FolderNode[] };

function buildFolderTree(folders: FolderItem[]): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  // Initialize map
  folders.forEach((folder) => {
    map.set(folder._id, { ...folder, children: [] });
  });

  // Build tree
  folders.forEach((folder) => {
    const node = map.get(folder._id)!;
    if (folder.parentFolder && map.has(folder.parentFolder)) {
      map.get(folder.parentFolder)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (nodes: FolderNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((child) => sortNodes(child.children));
  };
  sortNodes(roots);

  return roots;
}

function FolderTreeItem({
  node,
  currentFolderId,
  onSelect,
  onLoadFiles,
  onPreview,
  filesMap,
  filterFile,
  expandedSet,
  onToggle,
}: {
  node: FolderNode;
  currentFolderId: string | null;
  onSelect: (folder: FolderNode) => void;
  onLoadFiles: (folderId: string) => void;
  onPreview: (file: FileItem) => void;
  filesMap: Record<string, FileItem[]>;
  filterFile: (file: FileItem) => boolean;
  expandedSet: Set<string>;
  onToggle: (folderId: string, nextExpanded: boolean) => void;
}) {
  const isSelected = currentFolderId === node._id;
  const expanded = expandedSet.has(node._id);
  const hasChildren = node.children.length > 0;
  const files = filesMap[node._id];
  const visibleFiles = files ? files.filter(filterFile) : [];
  const sortedFiles = [...visibleFiles].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="select-none">
      <div
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
          isSelected ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
        }`}
        onClick={() => onSelect(node)}
      >
        <button
          onClick={(event) => {
            event.stopPropagation();
            const nextExpanded = !expanded;
            onToggle(node._id, nextExpanded);
            if (nextExpanded) {
              onLoadFiles(node._id);
            }
          }}
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-neutral-200/50"
        >
          <span className="text-[10px]">{expanded ? '▼' : '▶'}</span>
        </button>
        <IconFolder className="h-4 w-4 text-neutral-500" />
        <span className="min-w-0 flex-1 truncate">{truncateLabel(node.name, 25)}</span>
        <span className="ml-auto inline-flex h-3 w-3 items-center justify-center text-neutral-400">
          {node.isPrivate ? (
            <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
              <rect
                x="5"
                y="11"
                width="14"
                height="9"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M8 11V8a4 4 0 0 1 8 0v3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <span className="h-3 w-3" aria-hidden="true" />
          )}
        </span>
      </div>

      {expanded && (hasChildren || sortedFiles.length > 0) && (
        <div className="ml-3 border-l border-neutral-200 pl-1">
          {node.children.map((child) => (
            <FolderTreeItem
              key={child._id}
              node={child}
              currentFolderId={currentFolderId}
              onSelect={onSelect}
              onLoadFiles={onLoadFiles}
              onPreview={onPreview}
              filesMap={filesMap}
              filterFile={filterFile}
              expandedSet={expandedSet}
              onToggle={onToggle}
            />
          ))}
          {sortedFiles.length > 0
            ? sortedFiles.map((file) => (
                <button
                  key={file._id}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPreview(file);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <span className="inline-flex h-6 w-6 shrink-0" aria-hidden="true" />
                  <IconFile className="h-3.5 w-3.5 text-neutral-400" />

                  <span className="min-w-0 flex-1 truncate">
                    {truncateLabel(file.originalName, 22)}
                  </span>
                  <span className="inline-flex h-3 w-3 items-center justify-center text-neutral-400">
                    {file.isAdminOnly ? (
                      <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
                        <circle
                          cx="12"
                          cy="8"
                          r="3.2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                        <path
                          d="M5 19c1.5-3 4.3-4.5 7-4.5s5.5 1.5 7 4.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : file.isPrivate ? (
                      <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
                        <rect
                          x="5"
                          y="11"
                          width="14"
                          height="9"
                          rx="2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                        <path
                          d="M8 11V8a4 4 0 0 1 8 0v3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <span className="h-3 w-3" aria-hidden="true" />
                    )}
                  </span>
                </button>
              ))
            : null}
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

function formatFileSize(size: number) {
  if (!Number.isFinite(size)) return '--';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

function truncateLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const safeLength = Math.max(0, maxLength - 3);
  return `${value.slice(0, safeLength)}...`;
}

function getFolderDepartment(folder: FolderItem) {
  const rawDept = folder.department?.trim();
  if (!rawDept) return FOLDER_DEPARTMENT;
  if (rawDept.toLowerCase() === 'general') return FOLDER_DEPARTMENT;
  return rawDept;
}

function FileIcon({ fileName, isFolder }: { fileName: string; isFolder?: boolean }) {
  if (isFolder) return <IconFolder className="h-10 w-10 text-amber-500" />;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <span className="font-bold text-red-500">PDF</span>;
  if (['doc', 'docx'].includes(ext || ''))
    return <span className="font-bold text-blue-500">DOC</span>;
  if (['xls', 'xlsx'].includes(ext || ''))
    return <span className="font-bold text-green-500">XLS</span>;
  if (['png', 'jpg', 'jpeg'].includes(ext || ''))
    return <span className="font-bold text-purple-500">IMG</span>;
  return <span className="font-bold text-gray-500">FILE</span>;
}

export default function FilesPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'admin';
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const uploadMenuRef = useRef<HTMLDivElement | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [allFolders, setAllFolders] = useState<FolderItem[]>([]);
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadAccess, setUploadAccess] = useState<'standard' | 'private' | 'admin'>('standard');
  const [uploadDept, setUploadDept] = useState('General');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [uploadDeptMenuOpen, setUploadDeptMenuOpen] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [departmentUsage, setDepartmentUsage] = useState<DepartmentUsage | null>(null);
  const [departmentUsageError, setDepartmentUsageError] = useState<string | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isFolderPrivate, setIsFolderPrivate] = useState(false);
  const [isCreateDeptOpen, setIsCreateDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [noticeFading, setNoticeFading] = useState(false);
  const [errorFading, setErrorFading] = useState(false);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [typeFilter, setTypeFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('General');
  const [accessFilter, setAccessFilter] = useState<'all' | 'standard' | 'admin' | 'private'>('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [previewFile, setPreviewFile] = useState<{
    name: string;
    type: 'markdown' | 'image' | 'pdf' | 'docx';
    content?: string;
    url?: string;
  } | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const errorTimerRef = useRef<number | null>(null);
  const folderFilesMapRef = useRef<Record<string, FileItem[]>>({});
  const [folderFilesMap, setFolderFilesMap] = useState<Record<string, FileItem[]>>({});
  const scrollSaveRef = useRef<number | null>(null);
  const pendingContentScrollRef = useRef<number | null>(null);
  const pendingSidebarScrollRef = useRef<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const expandedFolderSet = useMemo(() => new Set(expandedFolderIds), [expandedFolderIds]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const restoreStateRef = useRef<Partial<FilesUiState> | null>(null);

  const persistUiState = useCallback((partial: Partial<FilesUiState>) => {
    try {
      const stored = localStorage.getItem(FILES_UI_STATE_KEY);
      let base: Partial<FilesUiState> = {};
      if (stored) {
        try {
          base = JSON.parse(stored) as Partial<FilesUiState>;
        } catch (error) {
          console.warn('Failed to parse stored files UI state', error);
        }
      }
      localStorage.setItem(FILES_UI_STATE_KEY, JSON.stringify({ ...base, ...partial }));
    } catch (error) {
      console.warn('Failed to persist files UI state', error);
    }
  }, []);

  function getErrorMessage(error: unknown, fallback: string) {
    if (error instanceof ApiRequestError) {
      return error.payload?.error?.message ?? error.message;
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  }

  const loadDepartments = useCallback(async () => {
    try {
      const data = await listDepartments();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to load departments', error);
    }
  }, []);

  const loadFolderTree = useCallback(async () => {
    try {
      const allFolders = await listAllFolders();
      const tree = buildFolderTree(allFolders);
      setAllFolders(allFolders);
      setFolderTree(tree);
    } catch (error) {
      console.error('Failed to load folder tree', error);
    }
  }, []);

  const loadFolderFiles = useCallback(async (folderId: string) => {
    if (folderFilesMapRef.current[folderId]) return;
    try {
      const data = await listFiles(folderId, 'all');
      folderFilesMapRef.current = { ...folderFilesMapRef.current, [folderId]: data };
      setFolderFilesMap(folderFilesMapRef.current);
    } catch (error) {
      console.error('Failed to load folder files', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [filesData, foldersData] = await Promise.all([
        listFiles(currentFolderId, accessFilter),
        listFolders(currentFolderId, deptFilter, accessFilter),
      ]);
      setFiles(filesData);
      setFolders(foldersData);
    } catch (error) {
      console.error(error);
      setError(getErrorMessage(error, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, accessFilter, deptFilter]);

  const orderedDepartments = useMemo(() => {
    const reserved = FOLDER_DEPARTMENT.toLowerCase();
    const sorted = departments
      .filter((dept) => dept.name.toLowerCase() !== reserved)
      .sort((a, b) => a.name.localeCompare(b.name));
    const generalIndex = sorted.findIndex((dept) => dept.name.toLowerCase() === 'general');
    if (generalIndex > -1) {
      const [general] = sorted.splice(generalIndex, 1);
      return [general, ...sorted];
    }
    return sorted;
  }, [departments]);

  const folderMap = useMemo(() => {
    return new Map(allFolders.map((folder) => [folder._id, folder]));
  }, [allFolders]);

  const breadcrumbItems = useMemo(() => {
    if (!currentFolderId) return [];
    const path: FolderItem[] = [];
    const visited = new Set<string>();
    let current = folderMap.get(currentFolderId);
    while (current && !visited.has(current._id)) {
      path.push(current);
      visited.add(current._id);
      current = current.parentFolder ? folderMap.get(current.parentFolder) : undefined;
    }
    return path.reverse();
  }, [currentFolderId, folderMap]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadFolderTree();
  }, [loadFolderTree]);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (!orderedDepartments.length) return;
    if (!orderedDepartments.some((dept) => dept.name === deptFilter)) {
      setDeptFilter(orderedDepartments[0].name);
    }
    if (!orderedDepartments.some((dept) => dept.name === uploadDept)) {
      setUploadDept(orderedDepartments[0].name);
    }
  }, [deptFilter, orderedDepartments, uploadDept]);

  useEffect(() => {
    if (!uploadMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (uploadMenuRef.current && target && uploadMenuRef.current.contains(target)) return;
      setUploadMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUploadMenuOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [uploadMenuOpen]);

  useEffect(() => {
    if (!uploadMenuOpen) {
      setUploadDeptMenuOpen(false);
    }
  }, [uploadMenuOpen]);

  useEffect(() => {
    if (!isAdmin) {
      setUploadAccess((prev) => (prev === 'admin' ? 'standard' : prev));
      setAccessFilter((prev) => (prev === 'admin' ? 'all' : prev));
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!currentFolderId) return;
    folderFilesMapRef.current = {
      ...folderFilesMapRef.current,
      [currentFolderId]: files,
    };
    setFolderFilesMap(folderFilesMapRef.current);
  }, [currentFolderId, files]);

  useEffect(() => {
    if (!notice) return;
    setNoticeFading(false);
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNoticeFading(true);
    }, 3500);
    const removeTimer = window.setTimeout(() => {
      setNotice(null);
      setNoticeFading(false);
    }, 4000);
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
      window.clearTimeout(removeTimer);
    };
  }, [notice]);

  useEffect(() => {
    if (!error) return;
    setErrorFading(false);
    if (errorTimerRef.current) {
      window.clearTimeout(errorTimerRef.current);
    }
    errorTimerRef.current = window.setTimeout(() => {
      setErrorFading(true);
    }, 4500);
    const removeTimer = window.setTimeout(() => {
      setError(null);
      setErrorFading(false);
    }, 5000);
    return () => {
      if (errorTimerRef.current) {
        window.clearTimeout(errorTimerRef.current);
      }
      window.clearTimeout(removeTimer);
    };
  }, [error]);

  useEffect(() => {
    if (!isCreateFolderOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCreateFolderOpen(false);
        setDialogError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateFolderOpen]);

  useEffect(() => {
    if (!confirmAction) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        resetConfirmAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmAction]);

  useEffect(() => {
    const saved = localStorage.getItem(FILES_UI_STATE_KEY);
    if (!saved) return;
    try {
      restoreStateRef.current = JSON.parse(saved) as Partial<FilesUiState>;
    } catch (error) {
      console.warn('Failed to parse files UI state', error);
    }
  }, []);

  useEffect(() => {
    if (hasHydrated || authLoading) return;
    const restored = restoreStateRef.current;
    if (!restored) {
      setHasHydrated(true);
      return;
    }

    if (restored.currentFolderId !== undefined) {
      setCurrentFolderId(restored.currentFolderId ?? null);
    }
    if (restored.viewMode) {
      setViewMode(restored.viewMode);
    }
    if (restored.typeFilter && FILE_TYPES.includes(restored.typeFilter)) {
      setTypeFilter(restored.typeFilter);
    }
    if (restored.deptFilter) {
      setDeptFilter(restored.deptFilter);
    }
    if (restored.uploadDept) {
      setUploadDept(restored.uploadDept);
    }
    if (restored.expandedFolderIds) {
      setExpandedFolderIds(restored.expandedFolderIds);
    }
    if (restored.accessFilter) {
      const nextAccess =
        restored.accessFilter === 'admin' && !isAdmin ? 'all' : restored.accessFilter;
      setAccessFilter(nextAccess);
    }
    if (typeof restored.contentScrollTop === 'number') {
      pendingContentScrollRef.current = restored.contentScrollTop ?? 0;
    } else if (typeof restored.scrollY === 'number') {
      pendingContentScrollRef.current = restored.scrollY ?? 0;
    }
    if (typeof restored.sidebarScrollTop === 'number') {
      pendingSidebarScrollRef.current = restored.sidebarScrollTop ?? 0;
    }

    setHasHydrated(true);
  }, [hasHydrated, isAdmin, authLoading]);

  useEffect(() => {
    if (pendingContentScrollRef.current === null) return;
    if (loading) return;
    const target = contentScrollRef.current;
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollTop = pendingContentScrollRef.current ?? 0;
      pendingContentScrollRef.current = null;
    });
  }, [loading]);

  useEffect(() => {
    if (pendingSidebarScrollRef.current === null) return;
    if (!sidebarRef.current) return;
    requestAnimationFrame(() => {
      if (sidebarRef.current) {
        sidebarRef.current.scrollTop = pendingSidebarScrollRef.current ?? 0;
      }
      pendingSidebarScrollRef.current = null;
    });
  }, [folderTree.length]);

  useEffect(() => {
    if (!hasHydrated) return;
    persistUiState({
      currentFolderId,
      viewMode,
      typeFilter,
      deptFilter,
      accessFilter,
      uploadDept,
      expandedFolderIds,
    });
  }, [
    currentFolderId,
    viewMode,
    typeFilter,
    deptFilter,
    accessFilter,
    uploadDept,
    expandedFolderIds,
    hasHydrated,
    persistUiState,
  ]);

  useEffect(() => {
    const target = contentScrollRef.current;
    if (!target) return;
    const handleScroll = () => {
      if (scrollSaveRef.current) {
        window.clearTimeout(scrollSaveRef.current);
      }
      scrollSaveRef.current = window.setTimeout(() => {
        persistUiState({ contentScrollTop: target.scrollTop });
      }, 200);
    };
    target.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (scrollSaveRef.current) {
        window.clearTimeout(scrollSaveRef.current);
      }
    };
  }, [persistUiState]);

  useEffect(() => {
    const target = sidebarRef.current;
    if (!target) return;
    const handleScroll = () => {
      persistUiState({ sidebarScrollTop: target.scrollTop });
    };
    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => target.removeEventListener('scroll', handleScroll);
  }, [persistUiState]);

  useEffect(() => {
    if (!folderTree.length) return;
    expandedFolderIds.forEach((folderId) => {
      void loadFolderFiles(folderId);
    });
  }, [expandedFolderIds, folderTree, loadFolderFiles]);

  function handleAddDepartment() {
    if (!isAdmin) {
      setError('Only admins can manage departments.');
      return;
    }
    setDialogError(null);
    setNewDeptName('');
    setIsCreateDeptOpen(true);
  }

  const isFileVisible = useCallback(
    (file: FileItem) => {
      const typeMatch = typeFilter === 'All' || getFileCategory(file.originalName) === typeFilter;
      const deptMatch =
        deptFilter === 'All' || deptFilter === 'General' || file.department === deptFilter;
      const accessMatch =
        accessFilter === 'all'
          ? true
          : accessFilter === 'admin'
            ? file.isAdminOnly
            : accessFilter === 'private'
              ? file.isPrivate
              : !file.isAdminOnly && !file.isPrivate;
      const roleMatch = isAdmin ? true : !file.isAdminOnly;

      return typeMatch && deptMatch && accessMatch && roleMatch;
    },
    [typeFilter, deptFilter, accessFilter, isAdmin]
  );

  const filteredFiles = useMemo(() => files.filter(isFileVisible), [files, isFileVisible]);

  async function handleCreateFolder(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setDialogError('Folder name is required.');
      return;
    }
    if (trimmedName.length > MAX_FOLDER_NAME_LENGTH) {
      setDialogError(`Folder name must be ${MAX_FOLDER_NAME_LENGTH} characters or fewer.`);
      return;
    }
    const nextDepth = currentFolderId ? breadcrumbItems.length + 1 : 1;
    if (nextDepth > MAX_FOLDER_DEPTH) {
      setDialogError(`Folders can be nested up to ${MAX_FOLDER_DEPTH} levels.`);
      return;
    }

    try {
      await createFolder(trimmedName, currentFolderId, FOLDER_DEPARTMENT, isFolderPrivate);
      await loadData();
      await loadFolderTree();
      setIsCreateFolderOpen(false);
      setNewFolderName('');
      setIsFolderPrivate(false);
      setDialogError(null);
    } catch (error: unknown) {
      setDialogError(getErrorMessage(error, 'Failed to create folder'));
    }
  }

  async function handleCreateDepartment(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setDialogError('Department name is required.');
      return;
    }
    if (trimmedName.length > MAX_DEPARTMENT_NAME_LENGTH) {
      setDialogError(`Department name must be ${MAX_DEPARTMENT_NAME_LENGTH} characters or fewer.`);
      return;
    }
    if (trimmedName.toLowerCase() === FOLDER_DEPARTMENT.toLowerCase()) {
      setDialogError(`${FOLDER_DEPARTMENT} is reserved for folders.`);
      return;
    }
    try {
      await createDepartment(trimmedName);
      await loadDepartments();
      setIsCreateDeptOpen(false);
      setNewDeptName('');
      setDialogError(null);
    } catch (error: unknown) {
      setDialogError(getErrorMessage(error, 'Failed to create department'));
    }
  }

  const resetConfirmAction = () => {
    setConfirmAction(null);
    setDepartmentUsage(null);
    setDepartmentUsageError(null);
  };

  async function handleConfirmDepartmentDelete(id: string, name: string) {
    if (!isAdmin) {
      setError('Only admins can manage departments.');
      return;
    }
    setDepartmentUsage(null);
    setDepartmentUsageError(null);
    try {
      const usage = await getDepartmentUsage(id);
      setDepartmentUsage(usage);
    } catch (error: unknown) {
      setDepartmentUsageError(getErrorMessage(error, 'Failed to load department usage'));
    }
    setConfirmAction({ type: 'department', id, name });
  }

  async function handleDeleteFolder(id: string) {
    try {
      await deleteFolder(id);
      await loadData();
      await loadFolderTree();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to delete folder'));
    }
  }

  async function handleDeleteFile(id: string) {
    try {
      await deleteFile(id);
      await loadData();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to delete file'));
    }
  }

  async function handleDeleteDepartment(id: string) {
    try {
      await deleteDepartment(id, { force: true });
      await loadDepartments();
      await loadData();
      await loadFolderTree();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to delete department'));
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
          url: objectUrl,
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
    } catch (error) {
      console.error('Preview error:', error);
      setError('Failed to load preview');
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      setNotice(null);

      const isAdminOnlyUpload = uploadAccess === 'admin';
      const isPrivateUpload = uploadAccess === 'private';
      const uploaded = await uploadFile(
        file,
        isAdminOnlyUpload,
        isPrivateUpload,
        uploadDept,
        currentFolderId
      );
      setFiles((prev) => [uploaded, ...prev.filter((item) => item._id !== uploaded._id)]);
      if (currentFolderId) {
        folderFilesMapRef.current = {
          ...folderFilesMapRef.current,
          [currentFolderId]: [
            uploaded,
            ...(folderFilesMapRef.current[currentFolderId] || []).filter(
              (item) => item._id !== uploaded._id
            ),
          ],
        };
        setFolderFilesMap(folderFilesMapRef.current);
      }
      void loadData();

      if (!isFileVisible(uploaded)) {
        const nextAccess = uploaded.isAdminOnly
          ? 'admin'
          : uploaded.isPrivate
            ? 'private'
            : 'standard';
        const nextType = getFileCategory(uploaded.originalName);
        setAccessFilter(nextAccess);
        setDeptFilter(uploaded.department || 'General');
        setTypeFilter(FILE_TYPES.includes(nextType) ? nextType : 'All');
        setNotice('Uploaded. Filters updated to show the file.');
      }
      setUploadMenuOpen(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }

      if (isAdminOnlyUpload) {
        setNotice('Uploaded. Admin-only files are hidden unless you are an admin.');
      } else if (isPrivateUpload) {
        setNotice('Uploaded. Private files are visible only to your account.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Upload failed: ${getErrorMessage(error, 'Failed to upload file')}`);
    } finally {
      setUploading(false);
    }
  }

  const handleToggleFolder = useCallback((folderId: string, nextExpanded: boolean) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (nextExpanded) {
        next.add(folderId);
      } else {
        next.delete(folderId);
      }
      return Array.from(next);
    });
  }, []);

  return (
    <div className="flex h-full gap-8 overflow-hidden">
      {/* Sub-sidebar for Folders */}
      <aside className="flex h-full min-h-0 w-48 flex-shrink-0 flex-col border-r border-neutral-200 pr-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-500">
          My Files
        </h2>
        <nav ref={sidebarRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          <button
            onClick={() => {
              setCurrentFolderId(null);
            }}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              !currentFolderId
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <IconFolder className="h-4 w-4" />
              <span>All Files</span>
            </span>
          </button>

          {folderTree.map((node) => (
            <FolderTreeItem
              key={node._id}
              node={node}
              currentFolderId={currentFolderId}
              onSelect={(folder) => {
                setCurrentFolderId(folder._id);
              }}
              onLoadFiles={loadFolderFiles}
              onPreview={handlePreview}
              filesMap={folderFilesMap}
              filterFile={isFileVisible}
              expandedSet={expandedFolderSet}
              onToggle={handleToggleFolder}
            />
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            <button
              onClick={() => {
                setCurrentFolderId(null);
              }}
              className="cursor-pointer hover:text-neutral-900"
            >
              Home
            </button>
            {breadcrumbItems.length === 0 ? (
              <>
                <span className="text-neutral-400">/</span>
                <span className="font-medium text-neutral-900">All Files</span>
              </>
            ) : (
              breadcrumbItems.map((folder, index) => (
                <React.Fragment key={folder._id}>
                  <span className="text-neutral-400">/</span>
                  <button
                    onClick={() => setCurrentFolderId(folder._id)}
                    className={`cursor-pointer ${
                      index === breadcrumbItems.length - 1
                        ? 'font-medium text-neutral-900'
                        : 'hover:text-neutral-900'
                    }`}
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => {
                setDialogError(null);
                setNewFolderName('');
                setIsFolderPrivate(false);
                setIsCreateFolderOpen(true);
              }}
              variant="secondary"
              size="sm"
              className="text-xs font-semibold"
            >
              + New Folder
            </Button>
            <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'hover:bg-neutral-100 hover:text-neutral-900'
                }`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <rect x="4" y="4" width="6" height="6" rx="1.5" fill="currentColor" />
                  <rect x="14" y="4" width="6" height="6" rx="1.5" fill="currentColor" />
                  <rect x="4" y="14" width="6" height="6" rx="1.5" fill="currentColor" />
                  <rect x="14" y="14" width="6" height="6" rx="1.5" fill="currentColor" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'hover:bg-neutral-100 hover:text-neutral-900'
                }`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <rect x="5" y="6" width="14" height="2" rx="1" fill="currentColor" />
                  <rect x="5" y="11" width="14" height="2" rx="1" fill="currentColor" />
                  <rect x="5" y="16" width="14" height="2" rx="1" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap items-center gap-8 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase text-neutral-400">File Type:</span>
            <div className="flex gap-1">
              {FILE_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    typeFilter === type
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
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
              {orderedDepartments.map((dept) => {
                const isActive = deptFilter === dept.name;
                const isDeletable = isAdmin && dept.name.toLowerCase() !== 'general';
                return (
                  <div
                    key={dept._id}
                    className={`relative inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setDeptFilter(dept.name)}
                      className="cursor-pointer"
                    >
                      {dept.name}
                    </button>
                    {isDeletable ? (
                      <button
                        type="button"
                        onClick={() => void handleConfirmDepartmentDelete(dept._id, dept.name)}
                        className={`absolute -right-1 -top-1 inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border text-[9px] transition-colors ${
                          isActive
                            ? 'border-white/70 bg-white/85 text-neutral-900 shadow-sm'
                            : 'border-neutral-300 bg-white text-neutral-500'
                        }`}
                        aria-label={`Delete ${dept.name} department`}
                        title="Remove department"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
                          <path
                            d="M7 7l10 10M17 7L7 17"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                );
              })}
              {isAdmin ? (
                <button
                  onClick={handleAddDepartment}
                  className="cursor-pointer rounded-full border border-dashed border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-400 hover:border-neutral-400 hover:text-neutral-600"
                  title="Add Department"
                >
                  +
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase text-neutral-400">Access:</span>
            <div className="flex gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'standard', label: 'Standard' },
                { id: 'private', label: 'Private' },
                ...(isAdmin ? [{ id: 'admin', label: 'Admin Only' }] : []),
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setAccessFilter(option.id as typeof accessFilter)}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    accessFilter === option.id
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div
            className={`mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600 transition-opacity duration-300 ${
              errorFading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {error}
          </div>
        )}
        {notice && (
          <div
            className={`mb-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 transition-opacity duration-300 ${
              noticeFading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {notice}
          </div>
        )}

          <div ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-12 text-center text-neutral-500">Loading...</div>
          ) : filteredFiles.length === 0 && folders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 py-12 text-center">
              <p className="text-neutral-500">No files or folders found matching your filters.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Folders first */}
                {folders.map((folder) => (
                  <div
                    key={folder._id}
                    onClick={() => {
                      setCurrentFolderId(folder._id);
                    }}
                    className="group relative flex cursor-pointer flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
   
                  >
                    {folder.isPrivate ? (
                      <span
                        className="absolute left-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400"
                        aria-hidden="true"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4">
                          <rect
                            x="5"
                            y="11"
                            width="14"
                            height="9"
                            rx="2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                          <path
                            d="M8 11V8a4 4 0 0 1 8 0v3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    ) : null}
                    <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-xl bg-amber-50 text-2xl">
                      <FileIcon fileName="" isFolder />
                    </div>
                    <h3
                      className="mb-1 w-full truncate text-center text-sm font-bold text-neutral-900"
                      title={folder.name}
                    >
                      {truncateLabel(folder.name, GRID_TITLE_MAX)}
                    </h3>
                    <p className="text-[10px] text-neutral-400">
                      -- • {new Date(folder.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-neutral-500">
                      <span title={folder.createdBy?.displayName || 'Unknown'}>
                        {truncateLabel(folder.createdBy?.displayName || 'Unknown', GRID_META_MAX)}
                      </span>{' '}
                      •{' '}
                      <span className="text-neutral-400" title={getFolderDepartment(folder)}>
                        {truncateLabel(getFolderDepartment(folder), GRID_META_MAX)}
                      </span>
                    </p>
                      <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmAction({ type: 'folder', id: folder._id, name: folder.name });
                      }}
                      className="absolute right-2 top-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-neutral-400 opacity-0 transition-colors hover:bg-neutral-100 hover:text-red-600 group-hover:opacity-100"
                      aria-label="Delete folder"
                      title="Delete"
                    >
                                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          
                        <path
                           d="M9 4h6m-8 3h10m-1 0-.6 11a2 2 0 0 1-2 2H9.6a2 2 0 0 1-2-2L7 7"
                    
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                           strokeLinejoin="round"
                        />
                      </svg>
                     </button>
                  </div>
                ))}

                  {/* Files */}
                {filteredFiles.map((file) => (
                  <div
                    key={file._id}
                    onClick={() => handlePreview(file)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handlePreview(file);
                      }
                
                    }}
                      role="button"
                    tabIndex={0}
                    className="group relative flex cursor-pointer flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
            
                  >
                    <div className="absolute left-2 top-2 flex items-center gap-1">
                      <a
                        href={getDownloadUrl(file._id)}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                        aria-label="Download file"
                        title="Download"

                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                          <path
                             d="M12 4v10m0 0l-4-4m4 4l4-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                             <path
                            d="M5 18h14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                        </a>
                      {file.isAdminOnly ? (
                        <span
                          className="pointer-events-none inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400"
                          aria-hidden="true"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4">
                            <circle
                              cx="12"
                              cy="8"
                              r="3.2"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                            <path
                              d="M5 19c1.5-3 4.3-4.5 7-4.5s5.5 1.5 7 4.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                      ) : null}
                      {file.isPrivate ? (
                        <span
                          className="pointer-events-none inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400"
                          aria-hidden="true"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4">
                            <rect
                              x="5"
                              y="11"
                              width="14"
                              height="9"
                              rx="2"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                            <path
                              d="M8 11V8a4 4 0 0 1 8 0v3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                      ) : null}
                    </div>
                    <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-xl bg-neutral-50 text-2xl">
                      <FileIcon fileName={file.originalName} />
                    </div>
                    <h3
                      className="mb-1 w-full truncate text-center text-sm font-bold text-neutral-900"
                      title={file.originalName}
                    >
                      {truncateLabel(file.originalName, GRID_TITLE_MAX)}
                    </h3>
                    <p className="text-[10px] text-neutral-400">
                      {formatFileSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-neutral-500">
                      {file.isAdminOnly ? (
                        <>
                          <span className="font-bold text-neutral-900">[ADMIN]</span>
                          <span className="text-neutral-500"> • </span>
                        </>
                      ) : null}
                      <span title={file.uploadedBy?.displayName || 'Unknown'}>
                        {truncateLabel(file.uploadedBy?.displayName || 'Unknown', GRID_META_MAX)}
                      </span>{' '}
                      •{' '}
                      <span className="text-neutral-400" title={file.department}>
                        {truncateLabel(file.department, GRID_META_MAX)}
                      </span>
                    </p>

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmAction({ type: 'file', id: file._id, name: file.originalName });
                      }}
                      className="absolute right-2 top-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-neutral-400 opacity-0 transition-colors hover:bg-neutral-100 hover:text-red-600 group-hover:opacity-100"
                      aria-label="Delete file"
                      title="Delete"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path
                          d="M9 4h6m-8 3h10m-1 0-.6 11a2 2 0 0 1-2 2H9.6a2 2 0 0 1-2-2L7 7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
    </div>
        </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="w-[32%] px-6 py-3 font-medium">Name</th>
                    <th className="w-[10%] px-6 py-3 font-medium">Size</th>
                    <th className="w-[16%] px-6 py-3 font-medium">Department</th>
                    <th className="w-[16%] px-6 py-3 font-medium">Uploaded By</th>
                    <th className="w-[14%] px-6 py-3 font-medium">Date</th>
                    <th className="w-[12%] px-6 py-3 text-right font-medium" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {/* Folders */}
                  {folders.map((folder) => (
                    <tr
                      key={folder._id}
                      onClick={() => {
                        setCurrentFolderId(folder._id);
                      }}
                      className="group cursor-pointer hover:bg-neutral-50"
                    >
                      <td className="px-6 py-4 font-medium text-neutral-900">
                        <div className="flex min-w-0 items-center gap-3">
                          <FileIcon fileName="" isFolder />
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate" title={folder.name}>
                              {truncateLabel(folder.name, LIST_NAME_MAX)}
                            </span>
                            {folder.isPrivate ? (
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-neutral-500">
                             
                 
      
                                <rect
                                  x="5"
                                  y="11"
                                  width="14"
                                  height="9"
                                  rx="2"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                />
                                <path
                                  d="M8 11V8a4 4 0 0 1 8 0v3"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                />
                              </svg>
                            ) : null}
                          </span>
                             </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="w-[32%] px-6 py-3 font-medium">Name</th>
                    <th className="w-[10%] px-6 py-3 font-medium">Size</th>
                    <th className="w-[16%] px-6 py-3 font-medium">Department</th>
                    <th className="w-[16%] px-6 py-3 font-medium">Uploaded By</th>
                    <th className="w-[14%] px-6 py-3 font-medium">Date</th>
                    <th className="w-[12%] px-6 py-3 text-right font-medium" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {/* Folders */}
                  {folders.map((folder) => (
                    <tr
                      key={folder._id}
                      onClick={() => {
                        setCurrentFolderId(folder._id);
                      }}
                      className="group cursor-pointer hover:bg-neutral-50"
                    >
                      <td className="px-6 py-4 font-medium text-neutral-900">
                        <div className="flex min-w-0 items-center gap-3">
                          <FileIcon fileName="" isFolder />
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate" title={folder.name}>
                              {truncateLabel(folder.name, LIST_NAME_MAX)}
                            </span>
                            {folder.isPrivate ? (
                              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-neutral-500">
                             
                        </span>
                       </td>
                      <td className="px-6 py-4 text-neutral-500">
                        <span
                          className="block truncate"
                          title={folder.createdBy?.displayName || 'Unknown'}
                  
                        >
                              {truncateLabel(
                            folder.createdBy?.displayName || 'Unknown',
                            LIST_UPLOADER_MAX
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-500 whitespace-nowrap">
                        {new Date(folder.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                                setConfirmAction({ type: 'folder', id: folder._id, name: folder.name });
                       
                          }}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                           aria-label="Delete folder"
                          title="Delete"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                            <path
                              d="M9 4h6m-8 3h10m-1 0-.6 11a2 2 0 0 1-2 2H9.6a2 2 0 0 1-2-2L7 7"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                           </td>
                    </tr>
                  ))}
                   {/* Files */}
                  {filteredFiles.map((file) => (
                    <tr key={file._id} className="group hover:bg-neutral-50">
                      <td className="px-6 py-4 font-medium text-neutral-900">
                        <button
                          type="button"
                          onClick={() => handlePreview(file)}
                          className="flex min-w-0 cursor-pointer items-center gap-3 text-left text-neutral-900 transition-colors hover:text-neutral-900"
                        >
                          <FileIcon fileName={file.originalName} />
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="inline-flex w-4 justify-center text-neutral-500">
                              {file.isPrivate ? (
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                                  <rect
                                    x="5"
                                    y="11"
                                    width="14"
                                    height="9"
                                    rx="2"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                  />
                                  <path
                                    d="M8 11V8a4 4 0 0 1 8 0v3"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              ) : null}
                            </span>
                            {file.isAdminOnly ? (
                              <>
                                <span className="font-semibold text-neutral-900">[ADMIN]</span>
                                <span className="text-neutral-400">•</span>
                              </>
                            ) : null}
                            <span className="truncate" title={file.originalName}>
                              {truncateLabel(file.originalName, LIST_NAME_MAX)}
                            </span>
                          </span>
                             </td>
                      <td className="px-6 py-4 text-neutral-500">
                        <span
                          className="block truncate"
                          title={folder.createdBy?.displayName || 'Unknown'}
                 
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                              <path
                                d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                              />
                              <circle
                                cx="12"
                                cy="12"
                                r="3.2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                              />
                            </svg>
                          </button>
                          <a
                            href={getDownloadUrl(file._id)}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                            aria-label="Download file"
                            title="Download"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                              <path
                                d="M12 4v10m0 0l-4-4m4 4l4-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M5 18h14"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                            </svg>
                          </a>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setConfirmAction({
                                type: 'file',
                                id: file._id,
                                name: file.originalName,
                              });
                            }}
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                            aria-label="Delete file"
                            title="Delete"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                              <path
                                d="M9 4h6m-8 3h10m-1 0-.6 11a2 2 0 0 1-2 2H9.6a2 2 0 0 1-2-2L7 7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
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
      </div>

      {/* Floating Upload Menu */}
      <div ref={uploadMenuRef} className="fixed bottom-8 right-8 z-40 flex flex-col items-end">
        <button
          type="button"
          onClick={() => setUploadMenuOpen((open) => !open)}
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-neutral-900 px-5 text-xs font-semibold text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.99]"
          aria-haspopup="menu"
          aria-expanded={uploadMenuOpen}
        >
          <span className="text-sm">↑</span>
          Upload
        </button>
        {uploadMenuOpen ? (
          <div
            role="menu"
            className="absolute bottom-14 right-0 mt-3 w-72 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Department
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUploadDeptMenuOpen((open) => !open)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-300"
                    aria-haspopup="menu"
                    aria-expanded={uploadDeptMenuOpen}
                  >
                    <span>{uploadDept}</span>
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-neutral-400"
                      aria-hidden="true"
                    >
                      <path
                        d="M7 10l5 5 5-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {uploadDeptMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute left-0 right-0 top-full z-10 mt-1 max-h-32 overflow-hidden overflow-y-auto rounded-xl border border-neutral-200 bg-white text-xs shadow-lg"
                    >
                      {orderedDepartments.map((dept) => (
                        <button
                          key={dept._id}
                          type="button"
                          onClick={() => {
                            setUploadDept(dept.name);
                            setUploadDeptMenuOpen(false);
                          }}
                          className={`flex w-full cursor-pointer items-center px-3 py-2 text-left transition-colors first:rounded-t-xl last:rounded-b-xl ${
                            uploadDept === dept.name
                              ? 'bg-neutral-900 text-white'
                              : 'text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          {dept.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                  Visibility
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setUploadAccess((prev) => (prev === 'private' ? 'standard' : 'private'))
                    }
                    className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                      uploadAccess === 'private'
                        ? 'border-neutral-300 bg-neutral-200 text-neutral-900'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                    aria-pressed={uploadAccess === 'private'}
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                      <rect
                        x="5"
                        y="11"
                        width="14"
                        height="9"
                        rx="2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M8 11V8a4 4 0 0 1 8 0v3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                    Private
                  </button>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() =>
                        setUploadAccess((prev) => (prev === 'admin' ? 'standard' : 'admin'))
                      }
                      className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                        uploadAccess === 'admin'
                          ? 'border-neutral-300 bg-neutral-200 text-neutral-900'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                      aria-pressed={uploadAccess === 'admin'}
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                        <circle
                          cx="12"
                          cy="8"
                          r="3.2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                        <path
                          d="M5 19c1.5-3 4.3-4.5 7-4.5s5.5 1.5 7 4.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                      Admin Only
                    </button>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span className="text-sm">↑</span>
                {uploading ? 'Uploading...' : 'Choose file'}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        className="sr-only"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {isCreateFolderOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-pointer bg-neutral-900/30"
            onClick={() => {
              setIsCreateFolderOpen(false);
              setDialogError(null);
              setIsFolderPrivate(false);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-neutral-900">New Folder</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Create a folder in the current location.
            </p>
            <div className="mt-4 space-y-2">
              <input
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleCreateFolder(newFolderName);
                  }
                }}
                maxLength={MAX_FOLDER_NAME_LENGTH}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-neutral-900 focus:outline-none"
                placeholder="Folder name"
                autoFocus
              />
              <div className="text-xs text-neutral-400">
                {newFolderName.length}/{MAX_FOLDER_NAME_LENGTH}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-500 hover:text-neutral-900">
                <input
                  type="checkbox"
                  checked={isFolderPrivate}
                  onChange={(event) => setIsFolderPrivate(event.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-[#07000b]"
                />
                Private folder (only visible to you)
              </label>
              {dialogError ? (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {dialogError}
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsCreateFolderOpen(false);
                  setDialogError(null);
                  setIsFolderPrivate(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleCreateFolder(newFolderName)}
              >
                Create
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateDeptOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-pointer bg-neutral-900/30"
            onClick={() => {
              setIsCreateDeptOpen(false);
              setDialogError(null);
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-neutral-900">Add Department</h3>
            <p className="mt-1 text-sm text-neutral-500">Keep department names short and clear.</p>
            <div className="mt-4 space-y-2">
              <input
                value={newDeptName}
                onChange={(event) => setNewDeptName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleCreateDepartment(newDeptName);
                  }
                }}
                maxLength={MAX_DEPARTMENT_NAME_LENGTH}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-neutral-900 focus:outline-none"
                placeholder="Department name"
                autoFocus
              />
              <div className="text-xs text-neutral-400">
                {newDeptName.length}/{MAX_DEPARTMENT_NAME_LENGTH}
              </div>
              {dialogError ? (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {dialogError}
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsCreateDeptOpen(false);
                  setDialogError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleCreateDepartment(newDeptName)}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-pointer bg-neutral-900/30"
            onClick={resetConfirmAction}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-neutral-900">
              {confirmAction.type === 'department'
                ? 'Remove department'
                : confirmAction.type === 'folder'
                  ? 'Delete folder'
                  : 'Delete file'}
            </h3>
            <p className="mt-2 text-sm text-neutral-500">
              {confirmAction.type === 'department'
                ? 'Removing this department will delete related tasks and files.'
                : 'This action cannot be undone.'}
            </p>
            {confirmAction.type === 'department' && departmentUsageError ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {departmentUsageError}
              </div>
            ) : null}
            {confirmAction.type === 'department' && departmentUsage ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                This will delete {departmentUsage.taskCount} task
                {departmentUsage.taskCount === 1 ? '' : 's'} and {departmentUsage.fileCount} file
                {departmentUsage.fileCount === 1 ? '' : 's'}.
              </div>
            ) : null}
            <div className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
              {confirmAction.name}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button type="button" variant="secondary" size="sm" onClick={resetConfirmAction}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="border-red-600 bg-red-600 text-white hover:border-red-700 hover:bg-red-700 focus-visible:ring-red-200"
                onClick={async () => {
                  const action = confirmAction;
                  resetConfirmAction();
                  if (action.type === 'folder') {
                    await handleDeleteFolder(action.id);
                    return;
                  }
                  if (action.type === 'file') {
                    await handleDeleteFile(action.id);
                    return;
                  }
                  await handleDeleteDepartment(action.id);
                }}
              >
                {confirmAction.type === 'department' ? 'Remove' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
