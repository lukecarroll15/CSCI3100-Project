import { useState, useMemo } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../auth/useAuth';

type Folder = { name: string; icon: string; sub: boolean };
type FileType = 'Document' | 'Spreadsheet' | 'PDF' | 'Image';
type Department = 'Sales' | 'IT' | 'Finance' | 'Marketing' | 'HR' | 'Shared';
type ViewMode = 'grid' | 'list';

type FileItem = {
  name: string;
  type: FileType;
  icon: string;
  size: string;
  date: string;
  author: string;
  department: Department;
  adminOnly: boolean;
};

type FileCollection = FileItem[];

const folders: Folder[] = [
  { name: 'All Files', icon: '📁', sub: false },
  { name: 'Sales', icon: '📁', sub: false },
  { name: 'Proposals', icon: '📂', sub: true },
  { name: 'Contracts', icon: '📂', sub: true },
  { name: 'IT', icon: '📁', sub: false },
  { name: 'Finance', icon: '📁', sub: false },
  { name: 'Marketing', icon: '📁', sub: false },
  { name: 'HR', icon: '📁', sub: false },
  { name: 'Shared', icon: '📁', sub: false },
];

const files: FileCollection = [
  {
    name: 'Q4_Budget_Report.xlsx',
    type: 'Spreadsheet',
    icon: '📄 DOC',
    size: '2.3 MB',
    date: 'Nov 17, 2025',
    author: 'Michael Torres',
    department: 'Finance',
    adminOnly: false,
  },
  {
    name: 'Project_Proposal_v3.pdf',
    type: 'PDF',
    icon: '📄 PDF',
    size: '1.8 MB',
    date: 'Nov 16, 2025',
    author: 'Sarah Chen',
    department: 'Sales',
    adminOnly: false,
  },
  {
    name: 'Sales_Strategy_2025.docx',
    type: 'Document',
    icon: '📄 DOC',
    size: '890 KB',
    date: 'Nov 15, 2025',
    author: 'Emma Wilson',
    department: 'Sales',
    adminOnly: true,
  },
  {
    name: 'Campaign_Banner.png',
    type: 'Image',
    icon: '🖼️ IMG',
    size: '3.5 MB',
    date: 'Nov 14, 2025',
    author: 'David Park',
    department: 'Marketing',
    adminOnly: false,
  },
  {
    name: 'Employee_Schedule.xlsx',
    type: 'Spreadsheet',
    icon: '📊 XLS',
    size: '456 KB',
    date: 'Nov 13, 2025',
    author: 'John Smith',
    department: 'HR',
    adminOnly: false,
  },
  {
    name: 'Security_Audit_Report.pdf',
    type: 'PDF',
    icon: '📄 PDF',
    size: '2.1 MB',
    date: 'Nov 12, 2025',
    author: 'David Park',
    department: 'IT',
    adminOnly: true,
  },
];

const fileTypeFilters: Array<{ label: string; value: 'All' | FileType }> = [
  { label: 'All', value: 'All' },
  { label: 'Documents', value: 'Document' },
  { label: 'Spreadsheets', value: 'Spreadsheet' },
  { label: 'PDFs', value: 'PDF' },
  { label: 'Images', value: 'Image' },
];
const departments: Array<'All' | Department> = [
  'All',
  'Sales',
  'IT',
  'Finance',
  'Marketing',
  'Shared',
];

function FolderTree({
  activeFolder,
  onSelect,
}: {
  activeFolder: string;
  onSelect: (folder: string) => void;
}) {
  return (
    <div className="w-72 overflow-y-auto border-r-2 border-gray-800 bg-gray-50 p-6">
      <div className="mb-5 rounded-md border-2 border-gray-800 bg-white p-3 text-lg font-bold">
        My Files
      </div>
      {folders.map((folder) => (
        <div
          key={folder.name}
          onClick={() => onSelect(folder.name)}
          className={`my-2 flex cursor-pointer items-center gap-2 rounded-md border-2 p-3 transition-colors ${
            folder.sub ? 'ml-5 text-sm' : ''
          } ${
            activeFolder === folder.name
              ? 'border-gray-800 bg-gray-800 text-white'
              : 'border-gray-500 bg-white hover:bg-gray-200'
          }`}
        >
          {folder.icon} {folder.name}
        </div>
      ))}
    </div>
  );
}

function FileGrid({ files, isAdmin }: { files: FileCollection; isAdmin: boolean }) {
  const handleClick = (file: FileItem) => {
    if (file.adminOnly && !isAdmin) {
      alert('Access Denied: This file requires admin privileges.');
    } else {
      alert('Would open file preview/download');
    }
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
      {files.map((file) => (
        <div
          key={file.name}
          onClick={() => handleClick(file)}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-5 transition-colors ${
            file.adminOnly && !isAdmin
              ? 'cursor-not-allowed border-gray-500 opacity-60'
              : 'border-gray-500 hover:border-gray-800 hover:bg-gray-50'
          }`}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-gray-500 bg-gray-100 text-sm">
            {file.icon}
          </div>
          <div className="break-words text-center text-sm font-bold">{file.name}</div>
          <div className="text-xs text-gray-500">{file.size}</div>
          <div className="text-xs text-gray-500">{file.date}</div>
          <div className="text-xs text-gray-500">{file.author}</div>
          {file.adminOnly && <Badge variant={isAdmin ? 'low' : 'high'}>🔒 Admin Only</Badge>}
        </div>
      ))}
    </div>
  );
}

function FileList({ files, isAdmin }: { files: FileCollection; isAdmin: boolean }) {
  const handleClick = (file: FileItem) => {
    if (file.adminOnly && !isAdmin) {
      alert('Access Denied: This file requires admin privileges.');
    } else {
      alert('Would open file preview/download');
    }
  };

  return (
    <table className="w-full border-collapse overflow-hidden rounded-lg border-2 border-gray-800">
      <thead className="bg-gray-100">
        <tr>
          {['Name', 'Type', 'Size', 'Uploaded By', 'Date', 'Access'].map((h) => (
            <th key={h} className="border-2 border-gray-500 p-4 text-left text-sm font-bold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {files.map((file) => (
          <tr
            key={file.name}
            onClick={() => handleClick(file)}
            className={`cursor-pointer ${
              file.adminOnly && !isAdmin ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'
            }`}
          >
            <td className="border-2 border-gray-300 p-4 text-sm">
              {file.icon.split(' ')[0]} {file.name}
            </td>
            <td className="border-2 border-gray-300 p-4 text-sm">{file.type}</td>
            <td className="border-2 border-gray-300 p-4 text-sm">{file.size}</td>
            <td className="border-2 border-gray-300 p-4 text-sm">{file.author}</td>
            <td className="border-2 border-gray-300 p-4 text-sm">{file.date}</td>
            <td className="border-2 border-gray-300 p-4 text-sm">
              {file.adminOnly ? (
                <Badge variant={isAdmin ? 'low' : 'high'}>🔒 Admin Only</Badge>
              ) : (
                'Everyone'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function FilesPage() {
  const [view, setView] = useState<ViewMode>('grid');
  const [activeFolder, setActiveFolder] = useState('All Files');
  const [typeFilter, setTypeFilter] = useState<'All' | FileType>('All');
  const [deptFilter, setDeptFilter] = useState<'All' | Department>('All');
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const visibleFiles = useMemo(() => {
    return files.filter((file) => {
      const typeMatches = typeFilter === 'All' || file.type === typeFilter;
      const deptMatches = deptFilter === 'All' || file.department === deptFilter;
      return typeMatches && deptMatches;
    });
  }, [typeFilter, deptFilter]);

  return (
    <div className="-m-10 flex h-full">
      {/* Folder Tree */}
      <FolderTree activeFolder={activeFolder} onSelect={setActiveFolder} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b-2 border-gray-800 pb-4">
          <div className="rounded-md border-2 border-gray-500 bg-gray-50 px-4 py-2 text-base text-gray-500">
            Home &gt; {activeFolder}
          </div>
          <div className="flex gap-3">
            <Button
              variant={view === 'grid' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('grid')}
            >
              Grid View
            </Button>
            <Button
              variant={view === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              List View
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border-2 border-gray-500 bg-gray-50 p-4">
          <div className="border-r-2 border-gray-400 pr-4 text-sm font-bold">File Type:</div>
          {fileTypeFilters.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`cursor-pointer rounded-md border-2 px-3 py-1.5 text-sm transition-colors ${
                typeFilter === value
                  ? 'border-gray-800 bg-gray-800 text-white'
                  : 'border-gray-500 bg-white hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="ml-4 border-r-2 border-gray-400 pr-4 text-sm font-bold">Department:</div>
          {departments.map((d) => (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              className={`cursor-pointer rounded-md border-2 px-3 py-1.5 text-sm transition-colors ${
                deptFilter === d
                  ? 'border-gray-800 bg-gray-800 text-white'
                  : 'border-gray-500 bg-white hover:bg-gray-100'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* File Views */}
        {view === 'grid' ? (
          <FileGrid files={visibleFiles} isAdmin={isAdmin} />
        ) : (
          <FileList files={visibleFiles} isAdmin={isAdmin} />
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={() => alert('Would open file upload dialog')}
        className="fixed bottom-12 right-12 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-gray-800 bg-white text-3xl shadow-lg transition-colors hover:bg-gray-100"
      >
        +
      </button>
    </div>
  );
}
