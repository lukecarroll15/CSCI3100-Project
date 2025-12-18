import { useState } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const folders = [
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

const files = [
  { name: 'Q4_Budget_Report.xlsx', type: 'Spreadsheet', icon: '📄 DOC', size: '2.3 MB', date: 'Nov 17, 2025', author: 'Michael Torres', adminOnly: false },
  { name: 'Project_Proposal_v3.pdf', type: 'PDF', icon: '📄 PDF', size: '1.8 MB', date: 'Nov 16, 2025', author: 'Sarah Chen', adminOnly: false },
  { name: 'Sales_Strategy_2025.docx', type: 'Document', icon: '📄 DOC', size: '890 KB', date: 'Nov 15, 2025', author: 'Emma Wilson', adminOnly: true },
  { name: 'Campaign_Banner.png', type: 'Image', icon: '🖼️ IMG', size: '3.5 MB', date: 'Nov 14, 2025', author: 'David Park', adminOnly: false },
  { name: 'Employee_Schedule.xlsx', type: 'Spreadsheet', icon: '📊 XLS', size: '456 KB', date: 'Nov 13, 2025', author: 'John Smith', adminOnly: false },
  { name: 'Security_Audit_Report.pdf', type: 'PDF', icon: '📄 PDF', size: '2.1 MB', date: 'Nov 12, 2025', author: 'David Park', adminOnly: true },
];

const fileTypes = ['All', 'Documents', 'Spreadsheets', 'PDFs', 'Images'];
const departments = ['All', 'Sales', 'IT', 'Finance', 'Marketing'];

function AdminPanel({ isAdmin, onActivate }) {
  const [adminKey, setAdminKey] = useState('');

  const handleKeyChange = (e) => {
    let value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let formatted = '';
    for (let i = 0; i < value.length && i < 12; i++) {
      if (i > 0 && i % 4 === 0) formatted += '-';
      formatted += value[i];
    }
    setAdminKey(formatted);
  };

  const handleActivate = () => {
    if (adminKey.length === 14) {
      onActivate(true);
      alert('Admin access activated! You can now access restricted files.');
    } else {
      alert('Please enter a valid admin key in the format: AAAA-BBBB-CCCC');
    }
  };

  return (
    <div className="mx-5 mb-5 p-5 border-2 border-gray-800 rounded-lg bg-white">
      <div className="text-sm font-bold mb-3 text-center border-b-2 border-gray-800 pb-2">
        Admin Access
      </div>
      <div className="mb-3">
        <label className="text-xs block mb-1 border border-gray-500 p-1 rounded bg-gray-50">
          Admin Key (AAAA-BBBB-CCCC)
        </label>
        <input
          type="text"
          placeholder="Enter admin key"
          maxLength={14}
          value={adminKey}
          onChange={handleKeyChange}
          className="w-full p-2 border-2 border-gray-800 rounded-md text-xs"
        />
      </div>
      <button
        onClick={handleActivate}
        className="w-full p-2 bg-white border-2 border-gray-800 rounded-md cursor-pointer text-sm font-bold hover:bg-gray-100"
      >
        Activate
      </button>
      <div
        className={`mt-3 p-2 border-2 rounded-md text-xs text-center font-bold ${
          isAdmin
            ? 'border-green-600 bg-green-100 text-green-600'
            : 'border-red-600 bg-red-100 text-red-600'
        }`}
      >
        {isAdmin ? '✓ Admin Access: Active' : '❌ Admin Access: Inactive'}
      </div>
    </div>
  );
}

function FolderTree({ activeFolder, onSelect }) {
  return (
    <div className="w-72 border-r-2 border-gray-800 p-6 overflow-y-auto bg-gray-50">
      <div className="text-lg font-bold mb-5 p-3 border-2 border-gray-800 rounded-md bg-white">
        My Files
      </div>
      {folders.map((folder) => (
        <div
          key={folder.name}
          onClick={() => onSelect(folder.name)}
          className={`p-3 my-2 border-2 rounded-md cursor-pointer flex items-center gap-2 transition-colors ${
            folder.sub ? 'ml-5 text-sm' : ''
          } ${
            activeFolder === folder.name
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white border-gray-500 hover:bg-gray-200'
          }`}
        >
          {folder.icon} {folder.name}
        </div>
      ))}
    </div>
  );
}

function FileGrid({ files, isAdmin }) {
  const handleClick = (file) => {
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
          className={`border-2 rounded-lg p-5 cursor-pointer flex flex-col items-center gap-2 transition-colors ${
            file.adminOnly && !isAdmin
              ? 'opacity-60 cursor-not-allowed border-gray-500'
              : 'border-gray-500 hover:border-gray-800 hover:bg-gray-50'
          }`}
        >
          <div className="w-20 h-20 border-2 border-gray-500 rounded-lg flex items-center justify-center text-sm bg-gray-100">
            {file.icon}
          </div>
          <div className="text-sm font-bold text-center break-words">{file.name}</div>
          <div className="text-xs text-gray-500">{file.size}</div>
          <div className="text-xs text-gray-500">{file.date}</div>
          <div className="text-xs text-gray-500">{file.author}</div>
          {file.adminOnly && <Badge variant="admin">🔒 Admin Only</Badge>}
        </div>
      ))}
    </div>
  );
}

function FileList({ files, isAdmin }) {
  const handleClick = (file) => {
    if (file.adminOnly && !isAdmin) {
      alert('Access Denied: This file requires admin privileges.');
    } else {
      alert('Would open file preview/download');
    }
  };

  return (
    <table className="w-full border-collapse border-2 border-gray-800 rounded-lg overflow-hidden">
      <thead className="bg-gray-100">
        <tr>
          {['Name', 'Type', 'Size', 'Uploaded By', 'Date', 'Access'].map((h) => (
            <th key={h} className="p-4 text-left border-2 border-gray-500 text-sm font-bold">
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
              file.adminOnly && !isAdmin ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'
            }`}
          >
            <td className="p-4 border-2 border-gray-300 text-sm">{file.icon.split(' ')[0]} {file.name}</td>
            <td className="p-4 border-2 border-gray-300 text-sm">{file.type}</td>
            <td className="p-4 border-2 border-gray-300 text-sm">{file.size}</td>
            <td className="p-4 border-2 border-gray-300 text-sm">{file.author}</td>
            <td className="p-4 border-2 border-gray-300 text-sm">{file.date}</td>
            <td className="p-4 border-2 border-gray-300 text-sm">
              {file.adminOnly ? <Badge variant="admin">🔒 Admin Only</Badge> : 'Everyone'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function FilesPage() {
  const [view, setView] = useState('grid');
  const [activeFolder, setActiveFolder] = useState('All Files');
  const [typeFilter, setTypeFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <div className="flex h-full -m-10">
      {/* Folder Tree */}
      <FolderTree activeFolder={activeFolder} onSelect={setActiveFolder} />

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-800">
          <div className="text-base text-gray-500 border-2 border-gray-500 px-4 py-2 rounded-md bg-gray-50">
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
        <div className="flex gap-4 mb-6 p-4 border-2 border-gray-500 rounded-lg bg-gray-50 items-center flex-wrap">
          <div className="text-sm font-bold border-r-2 border-gray-400 pr-4">File Type:</div>
          {fileTypes.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 border-2 rounded-md text-sm cursor-pointer transition-colors ${
                typeFilter === t
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white border-gray-500 hover:bg-gray-100'
              }`}
            >
              {t}
            </button>
          ))}
          <div className="text-sm font-bold border-r-2 border-gray-400 pr-4 ml-4">Department:</div>
          {departments.map((d) => (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              className={`px-3 py-1.5 border-2 rounded-md text-sm cursor-pointer transition-colors ${
                deptFilter === d
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white border-gray-500 hover:bg-gray-100'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* File Views */}
        {view === 'grid' ? (
          <FileGrid files={files} isAdmin={isAdmin} />
        ) : (
          <FileList files={files} isAdmin={isAdmin} />
        )}
      </div>

      {/* Admin Panel (floating) */}
      <div className="fixed bottom-20 left-64 z-50">
        <AdminPanel isAdmin={isAdmin} onActivate={setIsAdmin} />
      </div>

      {/* Upload Button */}
      <button
        onClick={() => alert('Would open file upload dialog')}
        className="fixed bottom-12 right-12 w-14 h-14 border-2 border-gray-800 rounded-full bg-white text-3xl cursor-pointer flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
      >
        +
      </button>
    </div>
  );
}
