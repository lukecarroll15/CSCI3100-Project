import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import * as tasksApi from '../api/tasks';
import { listFiles, type FileItem } from '../api/files';
import { listAllFolders } from '../api/folders';
import { listDepartments, type Department as DepartmentOption } from '../api/departments';

const SEARCH_STORAGE_KEY = 'dashboard_search';

type Priority = tasksApi.Priority;
type Department = tasksApi.Department;
type FilterType = 'all' | 'tasks' | 'files';

type Task = {
  id: string;
  name: string;
  date: string;
  dueDateIso: string;
  priority: Priority;
  assignee: string[];
  department: Department;
  status: 'In Progress' | 'Not Started' | 'Completed';
  description?: string;
  completedAt?: string;
  completedAtIso?: string;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

type ActivityCategory = 'task' | 'file';
type ActivityKind = 'task_created' | 'task_updated' | 'task_status' | 'file_created';

type ActivityItemData = {
  id: string;
  category: ActivityCategory;
  kind: ActivityKind;
  timestamp: string;
  timeLabel: string;
  title: string;
  description: string;
  meta: string[];
  icon: string;
  priority?: Priority;
  task?: Task;
  file?: FileItem;
};

type ActivityGroupData = {
  dateLabel: string;
  dateKey: string;
  items: ActivityItemData[];
};

type UserOption = { name: string; email: string };

const mockUsers: UserOption[] = [
  { name: 'Sarah Chen', email: 'sarah.chen@taskflow.com' },
  { name: 'Michael Rodriguez', email: 'michael.rodriguez@taskflow.com' },
  { name: 'Emily Thompson', email: 'emily.thompson@taskflow.com' },
  { name: 'David Park', email: 'david.park@taskflow.com' },
  { name: 'Jessica Williams', email: 'jessica.williams@taskflow.com' },
  { name: 'Kevin Zhang', email: 'kevin.zhang@taskflow.com' },
  { name: 'Amanda Foster', email: 'amanda.foster@taskflow.com' },
  { name: 'Ryan Patel', email: 'ryan.patel@taskflow.com' },
  { name: 'Lauren Martinez', email: 'lauren.martinez@taskflow.com' },
  { name: 'James Kim', email: 'james.kim@taskflow.com' },
  { name: 'Olivia Johnson', email: 'olivia.johnson@taskflow.com' },
  { name: 'Daniel Lee', email: 'daniel.lee@taskflow.com' },
  { name: 'Sophia Anderson', email: 'sophia.anderson@taskflow.com' },
  { name: 'Marcus Brown', email: 'marcus.brown@taskflow.com' },
  { name: 'Rachel Davis', email: 'rachel.davis@taskflow.com' },
  { name: 'Alex Wilson', email: 'alex.wilson@taskflow.com' },
  { name: 'Jordan Taylor', email: 'jordan.taylor@taskflow.com' },
  { name: 'Morgan Garcia', email: 'morgan.garcia@taskflow.com' },
  { name: 'Casey Moore', email: 'casey.moore@taskflow.com' },
  { name: 'Harper Jackson', email: 'harper.jackson@taskflow.com' },
];

const MAX_TASK_NAME_LENGTH = 80;
const TABLE_NAME_MAX = 24;
const TABLE_ASSIGNEE_MAX = 22;
const TABLE_DEPARTMENT_MAX = 18;
const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const STATUSES: Array<Task['status']> = ['Not Started', 'In Progress', 'Completed'];

const PRIORITY_STYLES: Record<
  Priority,
  { base: string; active: string; card: string; badge: string }
> = {
  high: {
    base: 'border-rose-500 text-rose-600 hover:bg-rose-50',
    active:
      'border-rose-600 bg-rose-600 text-white ring-1 ring-rose-300 ring-offset-1 ring-offset-white',
    card: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
    badge:
      'border-rose-600 bg-rose-600 text-white ring-1 ring-rose-300 ring-offset-1 ring-offset-white',
  },
  medium: {
    base: 'border-amber-500 text-amber-600 hover:bg-amber-50',
    active:
      'border-amber-500 bg-amber-500 text-white ring-1 ring-amber-300 ring-offset-1 ring-offset-white',
    card: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    badge:
      'border-amber-500 bg-amber-500 text-white ring-1 ring-amber-300 ring-offset-1 ring-offset-white',
  },
  low: {
    base: 'border-teal-400 text-teal-500 hover:bg-teal-50',
    active:
      'border-teal-500 bg-teal-500 text-white ring-1 ring-teal-300 ring-offset-1 ring-offset-white',
    card: 'border-teal-200 bg-teal-50 text-teal-600 hover:bg-teal-100',
    badge:
      'border-teal-500 bg-teal-500 text-white ring-1 ring-teal-300 ring-offset-1 ring-offset-white',
  },
};

const STATUS_STYLES: Record<Task['status'], { text: string; pill: string }> = {
  'Not Started': {
    text: 'text-neutral-500',
    pill: 'border-neutral-200 bg-neutral-50 text-neutral-600',
  },
  'In Progress': {
    text: 'text-amber-600',
    pill: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  Completed: {
    text: 'text-emerald-500',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-600',
  },
};

const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const normalizeDepartmentName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (lower === 'it') return 'IT';
      if (lower === 'hr') return 'HR';
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
};

const normalizeAssignees = (assignee: string | string[] | undefined) => {
  const list = Array.isArray(assignee) ? assignee : assignee ? [assignee] : [];
  const cleaned = list.map((item) => item.trim()).filter(Boolean);
  return Array.from(new Set(cleaned)).filter((name) => name.toLowerCase() !== 'unassigned');
};

const formatAssignees = (assignees: string[]) =>
  assignees.length ? assignees.join(', ') : 'Unassigned';

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  const safeLength = Math.max(0, maxLength - 3);
  return `${value.slice(0, safeLength)}...`;
};

const formatDisplayDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatTimeLabel = (date: Date) =>
  date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseInputDate = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const buildYearOptions = (baseYear: number) =>
  Array.from({ length: 21 }, (_, index) => baseYear - 10 + index);

const buildCalendarDates = (baseDate: Date) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const startDate = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

const formatActivityDateLabel = (date: Date) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return `Today - ${formatDisplayDate(date)}`;
  if (isSameDay(date, yesterday)) return `Yesterday - ${formatDisplayDate(date)}`;
  return formatDisplayDate(date);
};

const mapApiTask = (task: tasksApi.Task): Task => ({
  id: task._id,
  name: task.name,
  date: formatDisplayDate(new Date(task.dueDate)),
  dueDateIso: task.dueDate,
  priority: task.priority,
  assignee: normalizeAssignees(task.assignee),
  department: normalizeDepartmentName(task.department),
  status: task.status,
  description: task.description || undefined,
  completedAt: task.completedAt ? formatDisplayDate(new Date(task.completedAt)) : undefined,
  completedAtIso: task.completedAt ?? undefined,
  editedAt: task.editedAt ?? undefined,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  createdBy: task.createdBy,
});

const getStatusChangeTimestamp = (task: Task): string | null => {
  if (task.status === 'Completed') {
    return task.completedAtIso ?? task.updatedAt;
  }
  if (task.status === 'Not Started') return null;
  if (!task.editedAt) return task.updatedAt;
  const updatedAt = new Date(task.updatedAt).getTime();
  const editedAt = new Date(task.editedAt).getTime();
  if (Number.isNaN(updatedAt) || Number.isNaN(editedAt)) return null;
  return updatedAt > editedAt ? task.updatedAt : null;
};

const getFileVisibilityLabel = (file: FileItem) => {
  if (file.isAdminOnly) return 'Admin-only';
  if (file.isPrivate) return 'Private';
  return 'Shared';
};

const FILE_VISIBILITY_STYLES: Record<string, string> = {
  'Admin-only': 'border-neutral-200 bg-neutral-50 text-neutral-600',
  Private: 'border-amber-200 bg-amber-50 text-amber-700',
  Shared: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const filterConfig: { type: FilterType; label: string; icon: string }[] = [
  { type: 'all', label: 'All', icon: '📋' },
  { type: 'tasks', label: 'Tasks', icon: '📅' },
  { type: 'files', label: 'Files', icon: '📁' },
];

function groupActivities(items: ActivityItemData[]): ActivityGroupData[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const groups = new Map<string, ActivityGroupData>();
  sorted.forEach((item) => {
    const date = new Date(item.timestamp);
    if (Number.isNaN(date.getTime())) return;
    const dateKey = getDateKey(date);
    const existing = groups.get(dateKey);
    if (existing) {
      existing.items.push(item);
      return;
    }
    groups.set(dateKey, {
      dateKey,
      dateLabel: formatActivityDateLabel(date),
      items: [item],
    });
  });
  return Array.from(groups.values());
}

function searchActivities(items: ActivityItemData[], query: string): ActivityItemData[] {
  if (!query.trim()) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.meta.some((m) => m.toLowerCase().includes(lowerQuery))
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${PRIORITY_STYLES[priority].badge}`}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function DepartmentMenu({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: Department | '';
  placeholder: string;
  options: DepartmentOption[];
  onChange: (next: Department | '') => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current && !menuRef.current.contains(target)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-300"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={value ? 'text-neutral-700' : 'text-neutral-400'}>
          {value || placeholder}
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-neutral-400" aria-hidden="true">
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
      {open && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          {options.length ? (
            options.map((option) => (
              <button
                key={option._id}
                type="button"
                onClick={() => {
                  onChange(option.name);
                  setOpen(false);
                }}
                className="flex w-full cursor-pointer px-3 py-2 text-left text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                {option.name}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-neutral-400">No departments available</div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative mb-4">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">🔍</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search activities..."
        className="w-full rounded-lg border-2 border-gray-300 bg-white py-3 pl-12 pr-4 text-base transition-colors focus:border-gray-800 focus:outline-none"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function FilterButtons({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {filterConfig.map(({ type, label, icon }) => (
        <button
          key={type}
          onClick={() => onFilterChange(type)}
          className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2 font-medium transition-colors ${
            activeFilter === type
              ? 'border-gray-800 bg-gray-800 text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
          }`}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function ActivityItem({
  item,
  onOpenTask,
  onOpenFiles,
}: {
  item: ActivityItemData;
  onOpenTask: (task: Task) => void;
  onOpenFiles: () => void;
}) {
  const handleClick = () => {
    if (item.category === 'task' && item.task) {
      onOpenTask(item.task);
      return;
    }
    onOpenFiles();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group flex w-full cursor-pointer gap-4 rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-md"
    >
      <div className="min-w-[72px] text-xs font-medium text-neutral-400">{item.timeLabel}</div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-sm transition-colors group-hover:bg-white">
        {item.icon}
      </div>
      <div className="flex-1">
        <div className="mb-1 text-base font-semibold text-neutral-900">{item.title}</div>
        <div className="mb-2 text-sm text-neutral-500">{item.description}</div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
          {item.priority && <PriorityBadge priority={item.priority} />}
          {item.meta.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>
    </button>
  );
}

function ActivityGroup({
  dateLabel,
  items,
  onOpenTask,
  onOpenFiles,
}: ActivityGroupData & { onOpenTask: (task: Task) => void; onOpenFiles: () => void }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-500">
        {dateLabel}
      </div>
      {items.map((item) => (
        <ActivityItem key={item.id} item={item} onOpenTask={onOpenTask} onOpenFiles={onOpenFiles} />
      ))}
    </div>
  );
}

function DueTodayCard({
  tasks,
  loading,
  onOpenTask,
}: {
  tasks: Task[];
  loading: boolean;
  onOpenTask: (task: Task) => void;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/90 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Due Today
          </p>
          <h3 className="mt-2 text-lg font-semibold text-neutral-900">Tasks Due Today</h3>
        </div>
        <div className="text-xs font-medium text-neutral-400">
          {loading ? '—' : `${tasks.length} tasks`}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-500">
            Loading tasks...
          </div>
        ) : tasks.length ? (
          tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onOpenTask(task)}
              className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${PRIORITY_STYLES[task.priority].card}`}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-neutral-800">
                  {truncateText(task.name, TABLE_NAME_MAX)}
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  {truncateText(formatAssignees(task.assignee), TABLE_ASSIGNEE_MAX)} •{' '}
                  {truncateText(normalizeDepartmentName(task.department), TABLE_DEPARTMENT_MAX)}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                  STATUS_STYLES[task.status].pill
                }`}
              >
                {task.status}
              </span>
            </button>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-500">
            No tasks due today.
          </div>
        )}
      </div>
    </div>
  );
}

function UpdatesModal({
  isOpen,
  items,
  onClose,
  onOpenTask,
  onOpenFiles,
}: {
  isOpen: boolean;
  items: ActivityItemData[];
  onClose: () => void;
  onOpenTask: (task: Task) => void;
  onOpenFiles: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07000b]/40 p-4">
      <div className="animate-modal-in w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Updates for Today</h3>
            <p className="text-xs text-neutral-500">{items.length} total</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md border border-neutral-200 px-2 py-1 text-sm font-semibold text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
          >
            Close
          </button>
        </div>
        <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {items.length ? (
            items.map((item) => {
              const isTask = item.category === 'task' && item.task;
              const visibilityLabel =
                item.category === 'file' && item.file ? getFileVisibilityLabel(item.file) : '';
              const visibilityClass = FILE_VISIBILITY_STYLES[visibilityLabel] ?? '';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (isTask && item.task) {
                      onOpenTask(item.task);
                      return;
                    }
                    onOpenFiles();
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                    isTask && item.priority
                      ? PRIORITY_STYLES[item.priority].card
                      : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-neutral-800">{item.title}</div>
                    <div className="mt-0.5 text-[11px] text-neutral-500">{item.description}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-medium text-neutral-400">
                      {item.timeLabel}
                    </span>
                    {isTask && item.task ? (
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                          STATUS_STYLES[item.task.status].pill
                        }`}
                      >
                        {item.task.status}
                      </span>
                    ) : (
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${visibilityClass}`}
                      >
                        {visibilityLabel}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-500">
              No updates available today.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [tasksState, setTasksState] = useState<Task[]>([]);
  const [filesState, setFilesState] = useState<FileItem[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<Priority | ''>('');
  const [editTaskDepartment, setEditTaskDepartment] = useState<Department | ''>('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskAssignees, setEditTaskAssignees] = useState<string[]>([]);
  const [editTaskStatus, setEditTaskStatus] = useState<Task['status']>('Not Started');
  const [editAssigneeQuery, setEditAssigneeQuery] = useState('');
  const [showEditAssigneeSuggestions, setShowEditAssigneeSuggestions] = useState(false);
  const [editFormError, setEditFormError] = useState('');
  const [completeError, setCompleteError] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editDatePickerMonth, setEditDatePickerMonth] = useState(new Date());
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const editDatePickerRef = useRef<HTMLDivElement | null>(null);

  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState(() => {
    return localStorage.getItem(SEARCH_STORAGE_KEY) ?? '';
  });

  useEffect(() => {
    localStorage.setItem(SEARCH_STORAGE_KEY, search);
  }, [search]);

  useEffect(() => {
    let active = true;
    const loadFiles = async () => {
      try {
        const folders = await listAllFolders();
        const folderIds = [null, ...folders.map((folder) => folder._id)];
        const filesByFolder = await Promise.all(folderIds.map((id) => listFiles(id, 'all')));
        const map = new Map<string, FileItem>();
        filesByFolder.flat().forEach((file) => map.set(file._id, file));
        return Array.from(map.values());
      } catch {
        return listFiles(null, 'all');
      }
    };

    const loadDashboard = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [taskData, departmentData, files] = await Promise.all([
          tasksApi.getTasks(),
          listDepartments(),
          loadFiles(),
        ]);
        if (!active) return;
        setTasksState(taskData.map(mapApiTask));
        setDepartmentOptions(departmentData);
        setFilesState(files);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        if (!active) return;
        setLoadError('Failed to load dashboard data. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const userIdentifiers = useMemo(() => {
    if (!user) return [] as string[];
    return [user.displayName, user.email].filter(Boolean).map((value) => value.toLowerCase());
  }, [user]);

  const relevantTasks = useMemo(() => {
    if (!user) return [] as Task[];
    return tasksState.filter((task) => {
      const isCreator = task.createdBy === user.id;
      const isAssignee = task.assignee.some((assignee) =>
        userIdentifiers.includes(assignee.toLowerCase())
      );
      return isCreator || isAssignee;
    });
  }, [tasksState, user, userIdentifiers]);

  const dueTodayTasks = useMemo(() => {
    const today = new Date();
    return relevantTasks
      .filter((task) => {
        const dueDate = new Date(task.dueDateIso);
        if (Number.isNaN(dueDate.getTime())) return false;
        return isSameDay(dueDate, today) && task.status !== 'Completed';
      })
      .sort((a, b) => {
        const prioritySort = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (prioritySort !== 0) return prioritySort;
        return a.name.localeCompare(b.name);
      });
  }, [relevantTasks]);

  const activityItems = useMemo(() => {
    const items: ActivityItemData[] = [];
    relevantTasks.forEach((task) => {
      const dueLabel = `Due: ${formatDisplayDate(new Date(task.dueDateIso))}`;
      const assigneesLabel = truncateText(formatAssignees(task.assignee), TABLE_ASSIGNEE_MAX);
      const departmentLabel = truncateText(
        normalizeDepartmentName(task.department),
        TABLE_DEPARTMENT_MAX
      );
      const meta = [dueLabel, assigneesLabel, departmentLabel].filter(Boolean);
      const isCreatedByUser = user?.id === task.createdBy;
      items.push({
        id: `${task.id}-created`,
        category: 'task',
        kind: 'task_created',
        timestamp: task.createdAt,
        timeLabel: formatTimeLabel(new Date(task.createdAt)),
        title: task.name,
        description: isCreatedByUser ? 'Task created' : 'Assigned to you',
        meta,
        icon: '📅',
        priority: task.priority,
        task,
      });
      if (task.editedAt) {
        items.push({
          id: `${task.id}-edited-${task.editedAt}`,
          category: 'task',
          kind: 'task_updated',
          timestamp: task.editedAt,
          timeLabel: formatTimeLabel(new Date(task.editedAt)),
          title: task.name,
          description: 'Task details updated',
          meta,
          icon: '📅',
          priority: task.priority,
          task,
        });
      }
      const statusChangeAt = getStatusChangeTimestamp(task);
      if (statusChangeAt) {
        items.push({
          id: `${task.id}-status-${statusChangeAt}`,
          category: 'task',
          kind: 'task_status',
          timestamp: statusChangeAt,
          timeLabel: formatTimeLabel(new Date(statusChangeAt)),
          title: task.name,
          description: `Status updated to ${task.status}`,
          meta,
          icon: '📅',
          priority: task.priority,
          task,
        });
      }
    });

    filesState.forEach((file) => {
      const uploaderLabel = file.uploadedBy?.displayName || file.uploadedBy?.email || 'Unknown';
      const visibility = getFileVisibilityLabel(file);
      const meta = [
        `Uploaded by ${uploaderLabel}`,
        normalizeDepartmentName(file.department),
        visibility,
      ].filter(Boolean);
      items.push({
        id: `file-${file._id}`,
        category: 'file',
        kind: 'file_created',
        timestamp: file.createdAt,
        timeLabel: formatTimeLabel(new Date(file.createdAt)),
        title: file.originalName,
        description: 'File uploaded',
        meta,
        icon: '📁',
        file,
      });
    });

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [filesState, relevantTasks, user]);

  const filteredActivities = useMemo(() => {
    const categoryFiltered =
      filter === 'all'
        ? activityItems
        : activityItems.filter((item) => item.category === (filter === 'tasks' ? 'task' : 'file'));
    return searchActivities(categoryFiltered, search);
  }, [activityItems, filter, search]);

  const activityGroups = useMemo(() => groupActivities(filteredActivities), [filteredActivities]);
  const hasResults = filteredActivities.length > 0;

  const todayUpdates = useMemo(() => {
    const today = new Date();
    return activityItems.filter((item) => {
      const timestamp = new Date(item.timestamp);
      if (Number.isNaN(timestamp.getTime())) return false;
      return isSameDay(timestamp, today);
    });
  }, [activityItems]);
  const updatesLabel = todayUpdates.length === 1 ? '1 update' : `${todayUpdates.length} updates`;

  const editSelectedDate = useMemo(() => parseInputDate(editTaskDueDate), [editTaskDueDate]);
  const editDatePickerYearOptions = useMemo(
    () => buildYearOptions(editDatePickerMonth.getFullYear()),
    [editDatePickerMonth]
  );
  const editAssigneeMatches = useMemo(() => {
    const query = editAssigneeQuery.trim().toLowerCase();
    if (query.length < 1) return [] as UserOption[];
    const selected = new Set(editTaskAssignees.map((name) => name.toLowerCase()));
    return mockUsers.filter(
      (u) =>
        `${u.name} ${u.email}`.toLowerCase().includes(query) && !selected.has(u.name.toLowerCase())
    );
  }, [editAssigneeQuery, editTaskAssignees]);
  const isSelectedTaskEdited = useMemo(() => {
    if (!selectedTask?.editedAt) return false;
    const edited = new Date(selectedTask.editedAt).getTime();
    return !Number.isNaN(edited);
  }, [selectedTask]);
  const isStatusDirty = useMemo(
    () => !!selectedTask && editTaskStatus !== selectedTask.status,
    [editTaskStatus, selectedTask]
  );

  useEffect(() => {
    if (!showTaskModal || !selectedTask || isEditingTask) return;
    setEditTaskName(selectedTask.name);
    setEditTaskPriority(selectedTask.priority);
    setEditTaskDepartment(selectedTask.department);
    setEditTaskDueDate(toInputDate(new Date(selectedTask.dueDateIso)));
    setEditTaskDescription(selectedTask.description ?? '');
    setEditTaskAssignees(selectedTask.assignee);
    setEditTaskStatus(selectedTask.status);
    setEditAssigneeQuery('');
    setShowEditAssigneeSuggestions(false);
    setEditFormError('');
    setShowEditDatePicker(false);
    setShowStatusMenu(false);
  }, [selectedTask, showTaskModal, isEditingTask]);

  useEffect(() => {
    if (!showStatusMenu) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setShowStatusMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [showStatusMenu]);

  useEffect(() => {
    if (!showEditDatePicker) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && editDatePickerRef.current && !editDatePickerRef.current.contains(target)) {
        setShowEditDatePicker(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [showEditDatePicker]);

  const handleOpenTask = (task: Task) => {
    const latest = tasksState.find((item) => item.id === task.id) ?? task;
    setSelectedTask(latest);
    setShowTaskModal(true);
    setIsEditingTask(false);
    setEditFormError('');
    setShowUpdatesModal(false);
  };

  const handleOpenFiles = () => {
    setShowUpdatesModal(false);
    navigate('/files');
  };

  const handleStatusChange = (nextStatus: Task['status']) => {
    if (!selectedTask) return;
    if (!isAdmin) {
      setCompleteError('Only admins can update task status.');
      window.setTimeout(() => setCompleteError(''), 2200);
      setShowStatusMenu(false);
      return;
    }
    setEditTaskStatus(nextStatus);
    setShowStatusMenu(false);
  };

  const handleConfirmStatusChange = useCallback(async () => {
    if (!selectedTask || !isStatusDirty) return;
    if (!isAdmin) {
      setCompleteError('Only admins can update task status.');
      window.setTimeout(() => setCompleteError(''), 2200);
      return;
    }
    try {
      const updated = await tasksApi.updateTask(selectedTask.id, { status: editTaskStatus });
      const mapped = mapApiTask(updated);
      setTasksState((prev) => prev.map((t) => (t.id === mapped.id ? mapped : t)));
      setSelectedTask(null);
      setEditTaskStatus(mapped.status);
      setShowStatusMenu(false);
      setIsEditingTask(false);
      setShowTaskModal(false);
    } catch (err) {
      console.error('Failed to update status:', err);
      setCompleteError('Failed to update status. Please try again.');
      window.setTimeout(() => setCompleteError(''), 2200);
    }
  }, [editTaskStatus, isAdmin, isStatusDirty, selectedTask]);

  const handleCancelEdit = () => {
    if (!selectedTask) return;
    setEditTaskName(selectedTask.name);
    setEditTaskPriority(selectedTask.priority);
    setEditTaskDepartment(selectedTask.department);
    setEditTaskDueDate(toInputDate(new Date(selectedTask.dueDateIso)));
    setEditTaskDescription(selectedTask.description ?? '');
    setEditTaskAssignees(selectedTask.assignee);
    setEditTaskStatus(selectedTask.status);
    setEditAssigneeQuery('');
    setShowEditAssigneeSuggestions(false);
    setEditFormError('');
    setShowEditDatePicker(false);
    setShowStatusMenu(false);
    setIsEditingTask(false);
  };
  const handleSaveTaskEdits = useCallback(async () => {
    if (!selectedTask) return;
    if (!isAdmin) {
      setEditFormError('Only admins can edit tasks.');
      return;
    }
    const trimmedName = editTaskName.trim();
    if (!trimmedName || !editTaskPriority || !editTaskDepartment || !editTaskDueDate) {
      setEditFormError('Please fill in all required fields.');
      return;
    }
    if (trimmedName.length > MAX_TASK_NAME_LENGTH) {
      setEditFormError(`Task name must be ${MAX_TASK_NAME_LENGTH} characters or fewer.`);
      return;
    }

    const parsedDate = parseInputDate(editTaskDueDate);
    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      setEditFormError('Please provide a valid due date.');
      return;
    }

    try {
      const payload: tasksApi.UpdateTaskPayload = {
        name: trimmedName,
        description: editTaskDescription.trim() || undefined,
        priority: editTaskPriority,
        department: editTaskDepartment,
        assignee: normalizeAssignees(editTaskAssignees),
        dueDate: parsedDate.toISOString(),
      };
      const updated = await tasksApi.updateTask(selectedTask.id, payload);
      const mapped = mapApiTask(updated);
      setTasksState((prev) => prev.map((t) => (t.id === mapped.id ? mapped : t)));
      setSelectedTask(mapped);
      setIsEditingTask(false);
      setEditFormError('');
    } catch (err) {
      console.error('Failed to update task:', err);
      setEditFormError('Failed to update task. Please try again.');
    }
  }, [
    editTaskAssignees,
    editTaskDepartment,
    editTaskDescription,
    editTaskDueDate,
    editTaskName,
    editTaskPriority,
    isAdmin,
    selectedTask,
  ]);

  useEffect(() => {
    if (!showTaskModal || !selectedTask) return;
    const handleEnter = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      const target = event.target as HTMLElement | null;
      if (target && target.tagName === 'TEXTAREA') return;
      if (isEditingTask) {
        event.preventDefault();
        handleSaveTaskEdits();
        return;
      }
      if (isStatusDirty) {
        event.preventDefault();
        void handleConfirmStatusChange();
      }
    };
    window.addEventListener('keydown', handleEnter);
    return () => window.removeEventListener('keydown', handleEnter);
  }, [
    showTaskModal,
    selectedTask,
    isEditingTask,
    isStatusDirty,
    handleConfirmStatusChange,
    handleSaveTaskEdits,
  ]);

  const handleDeleteTask = (task: Task) => {
    if (!isAdmin) return;
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await tasksApi.deleteTask(taskToDelete.id);
      setTasksState((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setTaskToDelete(null);
      setShowDeleteModal(false);
      setShowTaskModal(false);
      setSelectedTask(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setCompleteError('Failed to delete task. Please try again.');
      window.setTimeout(() => setCompleteError(''), 2200);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-6 lg:h-full">
      <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col rounded-2xl border border-neutral-200 bg-white/90 p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Activity Feed</h2>
              <p className="text-sm text-neutral-500">
                Keep track of the latest updates across your workspace.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowUpdatesModal(true)}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-600 transition-all hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 hover:shadow-sm"
            >
              {updatesLabel}
            </button>
          </div>
          {loadError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {loadError}
            </div>
          )}
          <SearchBar value={search} onChange={setSearch} />
          <FilterButtons activeFilter={filter} onFilterChange={setFilter} />
          <div className="mt-2 flex-1 lg:min-h-0 lg:overflow-y-auto lg:pr-2">
            {loading ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
                Loading activity feed...
              </div>
            ) : hasResults ? (
              <div className="space-y-8">
                {activityGroups.map((group) => (
                  <ActivityGroup
                    key={group.dateKey}
                    {...group}
                    onOpenTask={handleOpenTask}
                    onOpenFiles={handleOpenFiles}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
                No {filter === 'all' ? '' : `${filter} `}activity found
                {search && ` matching "${search}"`}
              </div>
            )}
          </div>
        </section>
        <aside className="space-y-6">
          <DueTodayCard tasks={dueTodayTasks} loading={loading} onOpenTask={handleOpenTask} />
        </aside>
      </div>

      <UpdatesModal
        isOpen={showUpdatesModal}
        items={todayUpdates}
        onClose={() => setShowUpdatesModal(false)}
        onOpenTask={handleOpenTask}
        onOpenFiles={handleOpenFiles}
      />

      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07000b]/40 p-4">
          <div className="animate-modal-in w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-neutral-900">Task Details</h3>
                {isSelectedTaskEdited && (
                  <span className="relative inline-flex">
                    <span
                      className="group inline-flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 text-neutral-400"
                      aria-label="This task has been edited."
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                        <path
                          d="M12 7v5l3 3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="8"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                        />
                      </svg>
                      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-max -translate-x-1/2 rounded-md border border-neutral-200 bg-neutral-100 px-2 py-1 text-[10px] font-semibold text-neutral-900 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                        This task has been edited.
                      </span>
                    </span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAdmin) {
                      setCompleteError('Only admins can edit tasks.');
                      window.setTimeout(() => setCompleteError(''), 2200);
                      return;
                    }
                    if (isEditingTask) {
                      handleCancelEdit();
                      return;
                    }
                    setIsEditingTask(true);
                    setEditFormError('');
                  }}
                  disabled={!isAdmin}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors transition-transform hover:scale-[1.03] hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.97] disabled:cursor-not-allowed disabled:border-neutral-100 disabled:text-neutral-300 disabled:hover:bg-transparent"
                  title={isEditingTask ? 'Cancel editing' : 'Edit task'}
                  aria-label={isEditingTask ? 'Cancel editing' : 'Edit task'}
                >
                  {isEditingTask ? (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M7 7l10 10M17 7L7 17"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path
                        d="M4 16.5V20h3.5L19 8.5l-3.5-3.5L4 16.5z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setSelectedTask(null);
                    setIsEditingTask(false);
                    setShowStatusMenu(false);
                    setShowEditDatePicker(false);
                  }}
                  className="cursor-pointer rounded-md border border-neutral-200 px-2 py-1 text-sm font-semibold text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="font-semibold">Task Name</div>
                  {isEditingTask ? (
                    <>
                      <input
                        value={editTaskName}
                        onChange={(event) => setEditTaskName(event.target.value)}
                        maxLength={MAX_TASK_NAME_LENGTH}
                        className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-neutral-900 focus:outline-none"
                      />
                      <div className="mt-1 text-xs text-neutral-400">
                        {editTaskName.length}/{MAX_TASK_NAME_LENGTH}
                      </div>
                    </>
                  ) : (
                    <div className="mt-1 text-neutral-700">{selectedTask.name}</div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">
                    {selectedTask.status === 'Completed' ? 'Completion Date' : 'Due Date'}
                  </div>
                  {isEditingTask ? (
                    <div ref={editDatePickerRef} className="relative mt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setShowEditDatePicker((prev) => {
                            const next = !prev;
                            if (next) setEditDatePickerMonth(editSelectedDate ?? new Date());
                            return next;
                          })
                        }
                        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 transition-colors hover:border-neutral-300"
                        aria-haspopup="dialog"
                        aria-expanded={showEditDatePicker}
                      >
                        <span>
                          {editSelectedDate ? formatDisplayDate(editSelectedDate) : 'Select a date'}
                        </span>
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 text-neutral-400"
                          aria-hidden="true"
                        >
                          <rect
                            x="4"
                            y="5"
                            width="16"
                            height="15"
                            rx="2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                          <path
                            d="M8 3v4M16 3v4M4 9h16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      {showEditDatePicker && (
                        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
                          <div className="flex items-center gap-2">
                            <select
                              value={editDatePickerMonth.getMonth()}
                              onChange={(event) =>
                                setEditDatePickerMonth(
                                  (prev) =>
                                    new Date(prev.getFullYear(), Number(event.target.value), 1)
                                )
                              }
                              className="flex-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 focus:border-neutral-900 focus:outline-none"
                            >
                              {MONTH_LABELS.map((label, index) => (
                                <option key={label} value={index}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editDatePickerMonth.getFullYear()}
                              onChange={(event) =>
                                setEditDatePickerMonth(
                                  (prev) => new Date(Number(event.target.value), prev.getMonth(), 1)
                                )
                              }
                              className="w-24 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 focus:border-neutral-900 focus:outline-none"
                            >
                              {editDatePickerYearOptions.map((yearOption) => (
                                <option key={yearOption} value={yearOption}>
                                  {yearOption}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="mt-2 grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase text-neutral-400">
                            {WEEKDAY_LABELS.map((day) => (
                              <div key={day} className="text-center">
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="mt-1 grid grid-cols-7 gap-1">
                            {buildCalendarDates(editDatePickerMonth).map((date) => {
                              const isOutsideMonth =
                                date.getMonth() !== editDatePickerMonth.getMonth();
                              const isSelected = editSelectedDate
                                ? isSameDay(date, editSelectedDate)
                                : false;
                              const isToday = isSameDay(date, new Date());
                              return (
                                <button
                                  key={date.toISOString()}
                                  type="button"
                                  onClick={() => {
                                    setEditTaskDueDate(toInputDate(date));
                                    setShowEditDatePicker(false);
                                  }}
                                  className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border text-[11px] transition-colors ${
                                    isSelected
                                      ? 'border-neutral-900 bg-neutral-900 text-white'
                                      : isOutsideMonth
                                        ? 'border-transparent text-neutral-300 hover:text-neutral-500'
                                        : 'border-transparent text-neutral-700 hover:bg-neutral-100'
                                  } ${isToday && !isSelected ? 'border-neutral-300' : ''}`}
                                >
                                  {date.getDate()}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 text-neutral-700">
                      {selectedTask.status === 'Completed'
                        ? (selectedTask.completedAt ?? selectedTask.date)
                        : selectedTask.date}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">Priority</div>
                  {isEditingTask ? (
                    <div className="mt-2 flex gap-2">
                      {(['high', 'medium', 'low'] as Priority[]).map((p) => {
                        const isActive = editTaskPriority === p;
                        const styles = PRIORITY_STYLES[p];
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setEditTaskPriority(p)}
                            className={`flex-1 cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                              isActive ? styles.active : `bg-white ${styles.base}`
                            }`}
                            aria-pressed={isActive}
                          >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-1">
                      <PriorityBadge priority={selectedTask.priority} />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">Department</div>
                  {isEditingTask ? (
                    <div className="mt-1">
                      <DepartmentMenu
                        value={editTaskDepartment}
                        placeholder="Select department"
                        options={departmentOptions}
                        onChange={(next) => setEditTaskDepartment(next as Department | '')}
                      />
                    </div>
                  ) : (
                    <div className="mt-1 text-neutral-700">
                      {normalizeDepartmentName(selectedTask.department)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">Assigned To</div>
                  {isEditingTask ? (
                    <div className="mt-1">
                      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-2">
                        {editTaskAssignees.map((assignee) => (
                          <span
                            key={assignee}
                            className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-1 text-xs font-semibold text-white"
                          >
                            {assignee}
                            <button
                              type="button"
                              onClick={() =>
                                setEditTaskAssignees((prev) =>
                                  prev.filter((item) => item !== assignee)
                                )
                              }
                              className="cursor-pointer text-white/70 hover:text-white"
                              aria-label={`Remove ${assignee}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          type="search"
                          value={editAssigneeQuery}
                          onChange={(event) => {
                            setEditAssigneeQuery(event.target.value);
                            setShowEditAssigneeSuggestions(true);
                          }}
                          onFocus={() => {
                            if (editAssigneeQuery.trim().length >= 1)
                              setShowEditAssigneeSuggestions(true);
                          }}
                          onKeyDown={(event) => {
                            if (
                              (event.key === 'Enter' || event.key === ',') &&
                              editAssigneeQuery.trim()
                            ) {
                              event.preventDefault();
                              const next = normalizeAssignees([
                                ...editTaskAssignees,
                                editAssigneeQuery.trim(),
                              ]);
                              setEditTaskAssignees(next);
                              setEditAssigneeQuery('');
                              setShowEditAssigneeSuggestions(false);
                              return;
                            }
                            if (
                              event.key === 'Backspace' &&
                              !editAssigneeQuery &&
                              editTaskAssignees.length
                            ) {
                              setEditTaskAssignees((prev) => prev.slice(0, -1));
                            }
                          }}
                          onBlur={() =>
                            setTimeout(() => setShowEditAssigneeSuggestions(false), 120)
                          }
                          className="min-w-[160px] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-neutral-700 focus:outline-none"
                          placeholder={
                            editTaskAssignees.length
                              ? 'Add another person'
                              : 'Search or type a name'
                          }
                        />
                      </div>
                      {editAssigneeMatches.length > 0 && showEditAssigneeSuggestions && (
                        <div className="relative">
                          <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
                            {editAssigneeMatches.map((option) => (
                              <button
                                key={option.email}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setEditTaskAssignees((prev) =>
                                    normalizeAssignees([...prev, option.name])
                                  );
                                  setEditAssigneeQuery('');
                                  setShowEditAssigneeSuggestions(false);
                                }}
                                className="flex w-full cursor-pointer flex-col items-start px-3 py-2 text-left text-sm hover:bg-neutral-50"
                              >
                                <span className="font-semibold">{option.name}</span>
                                <span className="text-xs text-neutral-500">{option.email}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 text-neutral-700">
                      {formatAssignees(selectedTask.assignee)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">Status</div>
                  <div ref={statusMenuRef} className="relative mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingTask) {
                          return;
                        }
                        if (!isAdmin) {
                          setCompleteError('Only admins can update task status.');
                          window.setTimeout(() => setCompleteError(''), 2200);
                          return;
                        }
                        setShowStatusMenu((prev) => !prev);
                      }}
                      disabled={!isAdmin || isEditingTask}
                      className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-300 disabled:cursor-not-allowed disabled:border-neutral-100 disabled:text-neutral-300"
                      aria-haspopup="menu"
                      aria-expanded={showStatusMenu}
                    >
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[editTaskStatus].pill}`}
                      >
                        {editTaskStatus}
                      </span>
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
                    {showStatusMenu && (
                      <div
                        role="menu"
                        className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-neutral-200 bg-white text-xs shadow-lg"
                      >
                        {STATUSES.map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleStatusChange(status)}
                            className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors ${
                              editTaskStatus === status
                                ? 'bg-neutral-100 text-neutral-900'
                                : 'text-neutral-700 hover:bg-neutral-50'
                            }`}
                          >
                            <span
                              className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                                STATUS_STYLES[status].pill
                              }`}
                            >
                              {status}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1 font-semibold">Description</div>
                {isEditingTask ? (
                  <textarea
                    value={editTaskDescription}
                    onChange={(event) => setEditTaskDescription(event.target.value)}
                    className="min-h-[96px] w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:border-neutral-900 focus:outline-none"
                    placeholder="Add more context, requirements, or links"
                  />
                ) : (
                  <div className="whitespace-pre-wrap break-words text-neutral-600">
                    {selectedTask.description || 'No description provided.'}
                  </div>
                )}
              </div>
            </div>

            {editFormError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {editFormError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              {isAdmin && (
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    handleDeleteTask(selectedTask);
                  }}
                  className="mr-auto cursor-pointer rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:border-red-300 hover:bg-red-100"
                >
                  Delete Task
                </button>
              )}
              {isEditingTask ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="cursor-pointer rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTaskEdits}
                    className="cursor-pointer rounded-lg border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-800"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                  {isAdmin && (
                    <button
                      onClick={() => void handleConfirmStatusChange()}
                      disabled={!isStatusDirty}
                      className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold shadow transition-colors disabled:cursor-not-allowed ${
                        isStatusDirty
                          ? 'border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800'
                          : 'border-neutral-200 bg-neutral-100 text-neutral-400'
                      }`}
                    >
                      Confirm
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowTaskModal(false);
                      setSelectedTask(null);
                      setIsEditingTask(false);
                      setShowStatusMenu(false);
                      setShowEditDatePicker(false);
                    }}
                    className="cursor-pointer rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07000b]/40 p-4">
          <div className="animate-modal-in w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Delete Task</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTaskToDelete(null);
                }}
                className="cursor-pointer rounded-md border-2 border-gray-400 px-2 py-1 text-sm font-semibold hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <p className="mb-4 text-sm">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold">{taskToDelete.name}</span>? This action cannot be
              undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTaskToDelete(null);
                }}
                className="cursor-pointer rounded-md border-2 border-gray-400 px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="cursor-pointer rounded-md border-2 border-red-600 bg-red-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-red-700"
              >
                Yes, delete task
              </button>
            </div>
          </div>
        </div>
      )}

      {completeError && (
        <div className="fixed bottom-8 right-8 rounded-md border-2 border-yellow-500 bg-white px-4 py-2 text-sm font-semibold text-yellow-700 shadow-lg">
          {completeError}
        </div>
      )}
    </div>
  );
}
