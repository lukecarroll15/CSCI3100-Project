import { useCallback, useMemo, useState, type FormEvent, useEffect, useRef } from 'react';
import { useAuth } from '../auth/useAuth';
import { useTeams } from '../teams/useTeams';
import {
  createDepartment,
  deleteDepartment,
  getDepartmentUsage,
  listDepartments,
  type DepartmentUsage,
  type Department as DepartmentOption,
} from '../api/departments';
import { getTeamMembers, type TeamMember } from '../api/teams';
import * as tasksApi from '../api/tasks';
import MultiSelectMenu from '../components/ui/MultiSelectMenu';
import { IconCheck, IconX } from '../components/ui/Icons';

type Priority = 'high' | 'medium' | 'low';
type Department = tasksApi.Department;
type ViewMode = 'calendar' | 'table' | 'completed';

type Task = {
  id: string;
  name: string;
  date: string; // any parseable date string
  dueDateIso: string;
  priority: Priority;
  assignee: string[];
  department: Department;
  status: 'In Progress' | 'Not Started' | 'Completed';
  description?: string;
  completedAt?: string;
  completedAtIso?: string;
  editedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

const priorities: Array<Priority | 'all'> = ['all', 'high', 'medium', 'low'];

const ALL_DEPARTMENTS_LABEL = 'All';
const MAX_TASK_NAME_LENGTH = 80;
const MAX_TASK_DESCRIPTION_LENGTH = 280;
const MAX_DEPARTMENT_NAME_LENGTH = 32;
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
const CALENDAR_UI_STATE_KEY = 'calendarState:v1';
const ROLE_LABELS: Record<TeamMember['role'], string> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  member: 'MEMBER',
};
const ROLE_ORDER: Record<TeamMember['role'], number> = { owner: 0, admin: 1, member: 2 };

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
    text: 'text-blue-600',
    pill: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  Completed: {
    text: 'text-emerald-500',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-600',
  },
};

const normalizeDepartmentName = (value?: string | null) => {
  const trimmed = value?.trim() ?? '';
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

const normalizeAssignees = (assignee: string | string[] | null | undefined) => {
  const list = Array.isArray(assignee) ? assignee : assignee ? [assignee] : [];
  const cleaned = list.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  return Array.from(new Set(cleaned)).filter((name) => name.toLowerCase() !== 'unassigned');
};

const formatMemberLabel = (name: string, role?: TeamMember['role']) =>
  role ? `${name} (${ROLE_LABELS[role]})` : name;

const formatAssignees = (assignees: string[]) =>
  assignees.length ? assignees.join(', ') : 'Unassigned';

const truncateCalendarTaskName = (name: string) =>
  name.length > 9 ? `${name.slice(0, 7)}...` : name;

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  const safeLength = Math.max(0, maxLength - 3);
  return `${value.slice(0, safeLength)}...`;
};

const formatDisplayDate = (date: Date) => {
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

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
  createdBy: task.createdBy,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

type SortKey = 'name' | 'date' | 'priority' | 'assignee' | 'department' | 'status';
type SortDir = 'asc' | 'desc';

type CalendarUiState = {
  view?: ViewMode;
  priorityFilter?: Priority | 'all';
  departmentFilter?: string;
  sortKey?: SortKey;
  sortDir?: SortDir;
  calendarDate?: string;
  selectedTaskId?: string | null;
  showTaskModal?: boolean;
  contentScrollTop?: number;
};

function SortIcon({ active, direction }: { active: boolean; direction: SortDir }) {
  if (!active) {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-neutral-300" aria-hidden="true">
        <path
          d="M8 7l4-4 4 4M8 17l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-neutral-600" aria-hidden="true">
      {direction === 'asc' ? (
        <path
          d="M8 14l4-4 4 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M8 10l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
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
          className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-hidden overflow-y-auto rounded-xl border border-neutral-200 bg-white text-xs shadow-lg"
        >
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className={`flex w-full cursor-pointer items-center px-3 py-2 text-left transition-colors ${
              value === '' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {placeholder}
          </button>
          {options.map((dept) => (
            <button
              key={dept._id}
              type="button"
              onClick={() => {
                onChange(dept.name);
                setOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center px-3 py-2 text-left transition-colors ${
                value === dept.name
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {dept.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (next: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange('calendar')}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors ${
          view === 'calendar'
            ? 'bg-neutral-900 text-white shadow-sm'
            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
        }`}
        aria-label="Calendar view"
        aria-pressed={view === 'calendar'}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
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
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors ${
          view === 'table'
            ? 'bg-neutral-900 text-white shadow-sm'
            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
        }`}
        aria-label="List view"
        aria-pressed={view === 'table'}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <rect x="5" y="6" width="14" height="2" rx="1" fill="currentColor" />
          <rect x="5" y="11" width="14" height="2" rx="1" fill="currentColor" />
          <rect x="5" y="16" width="14" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>
      <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden="true" />
      <button
        type="button"
        onClick={() => onChange('completed')}
        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors ${
          view === 'completed'
            ? 'bg-neutral-900 text-white shadow-sm'
            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
        }`}
        aria-label="Completed tasks"
        aria-pressed={view === 'completed'}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M6 12l4 4 8-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

function TableView({
  filteredTasks,
  sortKey,
  sortDir,
  onSort,
  canChangeStatus,
  onComplete,
  showCompleteColumn = true,
  onNonAdmin,
  showIncompleteColumn = false,
  onIncomplete,
  dateLabel = 'Due Date',
  getDate,
  onOpenDetails,
}: {
  filteredTasks: Task[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  canChangeStatus: (task: Task) => boolean;
  onComplete: (task: Task) => void;
  showCompleteColumn?: boolean;
  onNonAdmin?: () => void;
  showIncompleteColumn?: boolean;
  onIncomplete?: (task: Task) => void;
  dateLabel?: string;
  getDate?: (task: Task) => string;
  onOpenDetails: (task: Task) => void;
}) {
  const headers: Array<{ key: SortKey; label: string; className?: string }> = [
    { key: 'name', label: 'Task Name', className: 'w-[220px]' },
    { key: 'date', label: dateLabel, className: 'w-[130px]' },
    { key: 'priority', label: 'Priority', className: 'w-[120px]' },
    { key: 'assignee', label: 'Assigned To', className: 'w-[180px]' },
    { key: 'department', label: 'Department', className: 'w-[160px]' },
    { key: 'status', label: 'Status', className: 'w-[150px]' },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="bg-neutral-50 text-neutral-500">
          <tr>
            {headers.map(({ key, label, className }) => (
              <th key={key} className={`px-6 py-3 font-medium ${className ?? ''}`}>
                <button
                  onClick={() => onSort(key)}
                  className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 transition-colors hover:text-neutral-900"
                >
                  <span>{label}</span>
                  <SortIcon active={sortKey === key} direction={sortDir} />
                </button>
              </th>
            ))}
            {showCompleteColumn && <th className="w-[90px] px-6 py-3 font-medium">Complete</th>}
            {!showCompleteColumn && showIncompleteColumn && (
              <th className="w-[90px] px-6 py-3 font-medium">Incomplete</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {filteredTasks.map((task) => (
            <tr
              key={task.id}
              onClick={() => onOpenDetails(task)}
              className="cursor-pointer hover:bg-neutral-50"
            >
              <td className="w-[220px] px-6 py-4 font-medium text-neutral-900">
                <span className="block truncate" title={task.name}>
                  {truncateText(task.name, TABLE_NAME_MAX)}
                </span>
              </td>
              <td className="w-[130px] whitespace-nowrap px-6 py-4 text-neutral-500">
                {getDate ? getDate(task) : task.date}
              </td>
              <td className="w-[120px] px-6 py-4">
                <PriorityBadge priority={task.priority} />
              </td>
              <td className="w-[180px] px-6 py-4 text-neutral-600">
                {(() => {
                  const assigneesLabel = formatAssignees(task.assignee);
                  return (
                    <span className="block truncate" title={assigneesLabel}>
                      {truncateText(assigneesLabel, TABLE_ASSIGNEE_MAX)}
                    </span>
                  );
                })()}
              </td>
              <td className="w-[160px] px-6 py-4 text-neutral-600">
                {(() => {
                  const departmentLabel = normalizeDepartmentName(task.department);
                  return (
                    <span className="block truncate" title={departmentLabel}>
                      {truncateText(departmentLabel, TABLE_DEPARTMENT_MAX)}
                    </span>
                  );
                })()}
              </td>
              <td className="w-[150px] px-6 py-4">
                <span
                  className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                    STATUS_STYLES[task.status].pill
                  }`}
                >
                  {task.status}
                </span>
              </td>
              {showCompleteColumn && (
                <td className="w-[90px] px-6 py-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!canChangeStatus(task)) {
                        onNonAdmin?.();
                        return;
                      }
                      onComplete(task);
                    }}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${
                      canChangeStatus(task)
                        ? 'cursor-pointer border-emerald-200 text-emerald-500 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600'
                        : 'cursor-not-allowed border-neutral-200 text-neutral-300'
                    }`}
                    aria-label={`Mark ${task.name} complete`}
                    aria-disabled={!canChangeStatus(task)}
                  >
                    <IconCheck className="h-3.5 w-3.5" />
                  </button>
                </td>
              )}
              {!showCompleteColumn && showIncompleteColumn && (
                <td className="w-[90px] px-6 py-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!canChangeStatus(task)) {
                        onNonAdmin?.();
                        return;
                      }
                      onIncomplete?.(task);
                    }}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${
                      canChangeStatus(task)
                        ? 'cursor-pointer border-neutral-300 text-neutral-500 transition-colors hover:border-rose-500 hover:bg-rose-50 hover:text-rose-600'
                        : 'cursor-not-allowed border-neutral-200 text-neutral-300'
                    }`}
                    aria-label={`Mark ${task.name} incomplete`}
                    aria-disabled={!canChangeStatus(task)}
                  >
                    <IconX className="h-3.5 w-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalendarView({
  filteredTasks,
  canChangeStatus,
  onComplete,
  onNonAdmin,
  onOpenDetails,
  onOpenDay,
  currentDate,
  onChangeDate,
}: {
  filteredTasks: Task[];
  canChangeStatus: (task: Task) => boolean;
  onComplete: (task: Task) => void;
  onNonAdmin?: () => void;
  onOpenDetails: (task: Task) => void;
  onOpenDay: (date: Date, tasks: Task[]) => void;
  currentDate: Date;
  onChangeDate: (date: Date) => void;
}) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [monthPickerDate, setMonthPickerDate] = useState(() => currentDate);
  const monthPickerRef = useRef<HTMLDivElement | null>(null);

  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long' });
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const yearOptions = useMemo(() => {
    const baseYear = monthPickerDate.getFullYear();
    return Array.from({ length: 21 }, (_, index) => baseYear - 10 + index);
  }, [monthPickerDate]);

  const calendarDates = useMemo(() => buildCalendarDates(currentDate), [currentDate]);

  const getTasksForDate = (date: Date) =>
    filteredTasks.filter((t) => {
      const taskDate = new Date(t.dueDateIso);
      return !Number.isNaN(taskDate.getTime()) && isSameDay(taskDate, date);
    });

  const handlePrevMonth = () => {
    onChangeDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onChangeDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    onChangeDate(new Date());
  };

  useEffect(() => {
    setMonthPickerDate(currentDate);
  }, [currentDate]);

  useEffect(() => {
    if (!showMonthPicker) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && monthPickerRef.current && !monthPickerRef.current.contains(target)) {
        setShowMonthPicker(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [showMonthPicker]);

  return (
    <div className="flex h-full flex-col gap-1">
      {/* Month Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5">
        <div ref={monthPickerRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setShowMonthPicker((prev) => {
                const next = !prev;
                if (next) setMonthPickerDate(currentDate);
                return next;
              });
            }}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50"
            aria-haspopup="dialog"
            aria-expanded={showMonthPicker}
          >
            <span className="text-sm font-semibold text-neutral-900">{monthLabel}</span>
            <span className="text-sm font-medium text-neutral-500">{year}</span>
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
          {showMonthPicker && (
            <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
              <div className="flex items-center gap-2">
                <select
                  value={monthPickerDate.getMonth()}
                  onChange={(event) =>
                    setMonthPickerDate(
                      (prev) => new Date(prev.getFullYear(), Number(event.target.value), 1)
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
                  value={monthPickerDate.getFullYear()}
                  onChange={(event) =>
                    setMonthPickerDate(
                      (prev) => new Date(Number(event.target.value), prev.getMonth(), 1)
                    )
                  }
                  className="w-24 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 focus:border-neutral-900 focus:outline-none"
                >
                  {yearOptions.map((yearOption) => (
                    <option key={yearOption} value={yearOption}>
                      {yearOption}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase text-neutral-400">
                {WEEKDAY_LABELS.map((day) => (
                  <div key={day} className="text-center">
                    {day}
                  </div>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {buildCalendarDates(monthPickerDate).map((date) => {
                  const isOutsideMonth = date.getMonth() !== monthPickerDate.getMonth();
                  const isSelected = isSameDay(date, currentDate);
                  const isToday = isSameDay(date, today);
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => {
                        onChangeDate(date);
                        setShowMonthPicker(false);
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
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            onClick={handleToday}
            className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs font-semibold text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-neutral-200 bg-white p-1.5">
        <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          {WEEKDAY_LABELS.map((day) => (
            <div key={day} className="text-center">
              {day}
            </div>
          ))}
        </div>
        <div className="mt-1 grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-1">
          {calendarDates.map((date, index) => {
            const isToday = isSameDay(date, today);
            const isOutsideMonth = date.getMonth() !== month;
            const dayTasks = getTasksForDate(date);

            return (
              <div
                key={`${date.toISOString()}-${index}`}
                onClick={() => onOpenDay(date, dayTasks)}
                className={`group flex min-h-0 cursor-pointer flex-col rounded-lg border p-1 ${
                  isOutsideMonth
                    ? 'border-neutral-200 bg-neutral-50 text-neutral-400 opacity-60'
                    : 'border-neutral-200 bg-white text-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between border-b border-neutral-200 pb-0.5 text-xs font-semibold">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      isToday ? 'bg-neutral-900 text-white' : ''
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </div>
                <div className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden pr-1 group-hover:overflow-y-auto">
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`group flex items-center gap-2 rounded-md border px-2 py-1 text-[10px] leading-tight ${PRIORITY_STYLES[task.priority].card}`}
                    >
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenDetails(task);
                        }}
                        className="min-w-0 flex-1 cursor-pointer truncate text-left"
                        title={task.name}
                      >
                        {truncateCalendarTaskName(task.name)}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!canChangeStatus(task)) {
                            onNonAdmin?.();
                            return;
                          }
                          onComplete(task);
                        }}
                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-emerald-200 text-[10px] text-emerald-500 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300"
                        aria-label={`Mark ${task.name} complete`}
                        disabled={!canChangeStatus(task)}
                      >
                        <IconCheck className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { activeTeamId, isTeamAdmin, activeTeam } = useTeams();
  const isAdmin = isTeamAdmin;

  const userIdentifiers = useMemo(() => {
    if (!user) return [] as string[];
    return [user.displayName, user.email].filter(Boolean).map((value) => value.toLowerCase());
  }, [user]);
  const [tasksState, setTasksState] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [view, setView] = useState<ViewMode>('calendar');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState(ALL_DEPARTMENTS_LABEL);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [departmentError, setDepartmentError] = useState('');
  const [departmentToDelete, setDepartmentToDelete] = useState<DepartmentOption | null>(null);
  const [departmentNotice, setDepartmentNotice] = useState('');
  const [departmentUsage, setDepartmentUsage] = useState<DepartmentUsage | null>(null);
  const [departmentUsageError, setDepartmentUsageError] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [addTaskError, setAddTaskError] = useState('');
  const [shake, _setShake] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority | ''>('');
  const [taskDate, setTaskDate] = useState('');
  const [taskDepartment, setTaskDepartment] = useState<Department | ''>('');
  const [taskDescription, setTaskDescription] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [taskAssignee, setTaskAssignee] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(() => new Date());
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editDatePickerMonth, setEditDatePickerMonth] = useState(() => new Date());
  const editDatePickerRef = useRef<HTMLDivElement | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [completeError, setCompleteError] = useState('');
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [taskToRestore, setTaskToRestore] = useState<Task | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<Priority | ''>('');
  const [editTaskDepartment, setEditTaskDepartment] = useState<Department | ''>('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskAssignee, setEditTaskAssignee] = useState<string[]>([]);
  const [editTaskStatus, setEditTaskStatus] = useState<Task['status']>('Not Started');
  const [editFormError, setEditFormError] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const [showDayTasksModal, setShowDayTasksModal] = useState(false);
  const [dayTasksDate, setDayTasksDate] = useState<Date | null>(null);
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const restoreCalendarStateRef = useRef<CalendarUiState | null>(null);
  const pendingCalendarScrollTopRef = useRef<number | null>(null);
  const calendarScrollSaveRef = useRef<number | null>(null);
  const calendarScrollRef = useRef<HTMLDivElement | null>(null);
  const restoreSelectedTaskIdRef = useRef<string | null>(null);
  const restoreShowTaskModalRef = useRef(false);

  const persistCalendarState = useCallback((partial: CalendarUiState) => {
    try {
      const stored = localStorage.getItem(CALENDAR_UI_STATE_KEY);
      let base: CalendarUiState = {};
      if (stored) {
        try {
          base = JSON.parse(stored) as CalendarUiState;
        } catch (error) {
          console.warn('Failed to parse calendar state', error);
        }
      }
      localStorage.setItem(CALENDAR_UI_STATE_KEY, JSON.stringify({ ...base, ...partial }));
    } catch (error) {
      console.warn('Failed to persist calendar state', error);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CALENDAR_UI_STATE_KEY);
      if (stored) {
        restoreCalendarStateRef.current = JSON.parse(stored) as CalendarUiState;
      }
    } catch (error) {
      console.warn('Failed to read calendar state', error);
    }
  }, []);

  useEffect(() => {
    if (hasHydrated) return;
    const restored = restoreCalendarStateRef.current;
    if (restored) {
      if (restored.view) {
        setView(restored.view);
      }
      if (restored.priorityFilter) {
        setPriorityFilter(restored.priorityFilter);
      }
      if (restored.departmentFilter) {
        setDepartmentFilter(restored.departmentFilter);
      }
      if (restored.sortKey) {
        setSortKey(restored.sortKey);
      }
      if (restored.sortDir) {
        setSortDir(restored.sortDir);
      }
      if (restored.calendarDate) {
        const parsed = new Date(restored.calendarDate);
        if (!Number.isNaN(parsed.getTime())) {
          setCalendarDate(parsed);
        }
      }
      if (restored.selectedTaskId) {
        restoreSelectedTaskIdRef.current = restored.selectedTaskId;
      }
      if (typeof restored.contentScrollTop === 'number') {
        pendingCalendarScrollTopRef.current = restored.contentScrollTop;
      }
      restoreShowTaskModalRef.current = restored.showTaskModal === true;
    }
    setHasHydrated(true);
  }, [hasHydrated]);
  // Load tasks from API
  useEffect(() => {
    if (!activeTeamId) return;
    const loadTasks = async () => {
      try {
        const apiTasks = await tasksApi.getTasks();
        const mapped = apiTasks.map(mapApiTask);
        setTasksState(mapped);
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, [activeTeamId]);

  useEffect(() => {
    if (!activeTeamId) {
      setTeamMembers([]);
      return;
    }
    if (!isAdmin) {
      setTeamMembers([]);
      return;
    }
    let active = true;
    const loadMembers = async () => {
      try {
        const members = await getTeamMembers(activeTeamId);
        if (!active) return;
        setTeamMembers(members);
      } catch (err) {
        console.error('Failed to load team members:', err);
        if (!active) return;
        setTeamMembers([]);
      }
    };
    void loadMembers();
    return () => {
      active = false;
    };
  }, [activeTeamId, isAdmin]);

  const selfName = (user?.displayName || user?.email || '').trim();
  const selfRole = activeTeam?.role as TeamMember['role'] | undefined;
  const selfDisplayRole = useMemo(() => selfRole ?? 'member', [selfRole]);
  const assigneeOptions = useMemo(() => {
    const buildOption = (name: string, role?: TeamMember['role']) => ({
      value: name,
      label: formatMemberLabel(name, role),
    });
    if (!selfName && teamMembers.length === 0) return [];

    if (!isAdmin) {
      return selfName ? [buildOption(selfName, selfDisplayRole)] : [];
    }

    const sorted = [...teamMembers].sort((a, b) => {
      const roleOrder = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
      if (roleOrder !== 0) return roleOrder;
      const nameA = (a.displayName || a.email || '').toLowerCase();
      const nameB = (b.displayName || b.email || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    const options = sorted
      .map((member) => {
        const name = (member.displayName || member.email || '').trim();
        if (!name) return null;
        return buildOption(name, member.role);
      })
      .filter((option): option is { value: string; label: string } => Boolean(option));

    if (
      selfName &&
      !options.some((option) => option.value.toLowerCase() === selfName.toLowerCase())
    ) {
      options.push(buildOption(selfName, selfDisplayRole));
    }

    if (!options.length && selfName) {
      options.push(buildOption(selfName, selfDisplayRole));
    }

    return options;
  }, [isAdmin, selfDisplayRole, selfName, teamMembers]);

  const resolveAssigneeValues = useCallback(
    (assignees: string[]) => {
      const valid = assignees.filter((assignee) =>
        assigneeOptions.some((option) => option.value === assignee)
      );
      if (valid.length > 0) return valid;
      if (
        selfName &&
        assigneeOptions.some((option) => option.value.toLowerCase() === selfName.toLowerCase())
      ) {
        return [selfName];
      }
      if (assigneeOptions.length > 0) return [assigneeOptions[0].value];
      return [];
    },
    [assigneeOptions, selfName]
  );

  const isTaskCreator = useCallback(
    (task: Task) => Boolean(user?.id && task.createdBy === user.id),
    [user?.id]
  );

  const isAssignee = useCallback(
    (task: Task) =>
      task.assignee.some((assignee) => userIdentifiers.includes(assignee.toLowerCase())),
    [userIdentifiers]
  );

  const canEditTask = useCallback(
    (task: Task) => isAdmin || isTaskCreator(task),
    [isAdmin, isTaskCreator]
  );

  const canChangeStatus = useCallback(
    (task: Task) => canEditTask(task) || isAssignee(task),
    [canEditTask, isAssignee]
  );

  const canDeleteTask = useCallback((task: Task) => canEditTask(task), [canEditTask]);

  useEffect(() => {
    if (!assigneeOptions.length) {
      if (taskAssignee.length > 0) {
        setTaskAssignee([]);
      }
      return;
    }

    const valid = taskAssignee.filter((value) =>
      assigneeOptions.some((option) => option.value === value)
    );
    if (valid.length === 0) {
      const selfOption = selfName
        ? assigneeOptions.find((option) => option.value.toLowerCase() === selfName.toLowerCase())
        : undefined;
      setTaskAssignee([selfOption?.value ?? assigneeOptions[0].value]);
      return;
    }

    if (valid.length !== taskAssignee.length) {
      setTaskAssignee(valid);
    }
  }, [assigneeOptions, selfName, taskAssignee]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!restoreSelectedTaskIdRef.current || selectedTask || !restoreShowTaskModalRef.current) {
      return;
    }
    const match = tasksState.find((task) => task.id === restoreSelectedTaskIdRef.current);
    restoreSelectedTaskIdRef.current = null;
    restoreShowTaskModalRef.current = false;
    if (match) {
      setSelectedTask(match);
      setShowTaskModal(true);
    }
  }, [hasHydrated, selectedTask, tasksState]);

  useEffect(() => {
    if (!activeTeamId) return;
    const loadDepartments = async () => {
      try {
        const departments = await listDepartments();
        setDepartmentOptions(
          departments.map((dept) => ({
            ...dept,
            name: normalizeDepartmentName(dept.name),
          }))
        );
      } catch (err) {
        console.error('Failed to load departments:', err);
      }
    };
    loadDepartments();
  }, [activeTeamId]);

  useEffect(() => {
    if (!hasHydrated) return;
    persistCalendarState({
      view,
      priorityFilter,
      departmentFilter,
      sortKey,
      sortDir,
      calendarDate: calendarDate.toISOString(),
      showTaskModal,
      selectedTaskId: selectedTask?.id ?? null,
    });
  }, [
    calendarDate,
    departmentFilter,
    hasHydrated,
    persistCalendarState,
    priorityFilter,
    selectedTask?.id,
    showTaskModal,
    sortDir,
    sortKey,
    view,
  ]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (pendingCalendarScrollTopRef.current === null) return;
    const target = calendarScrollRef.current;
    if (!target) return;
    requestAnimationFrame(() => {
      if (calendarScrollRef.current) {
        calendarScrollRef.current.scrollTop = pendingCalendarScrollTopRef.current ?? 0;
      }
      pendingCalendarScrollTopRef.current = null;
    });
  }, [hasHydrated, tasksState.length, view]);

  useEffect(() => {
    const target = calendarScrollRef.current;
    if (!target) return;
    const handleScroll = () => {
      if (calendarScrollSaveRef.current) {
        window.clearTimeout(calendarScrollSaveRef.current);
      }
      calendarScrollSaveRef.current = window.setTimeout(() => {
        persistCalendarState({ contentScrollTop: target.scrollTop });
      }, 200);
    };
    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (calendarScrollSaveRef.current) {
        window.clearTimeout(calendarScrollSaveRef.current);
      }
    };
  }, [persistCalendarState]);

  useEffect(() => {
    if (!showDatePicker) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && datePickerRef.current && !datePickerRef.current.contains(target)) {
        setShowDatePicker(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [showDatePicker]);

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
    if (
      !showAddModal &&
      !showTaskModal &&
      !showCompleteModal &&
      !showIncompleteModal &&
      !showDeleteModal &&
      !showDepartmentModal &&
      !departmentToDelete &&
      !showDayTasksModal
    ) {
      return;
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showAddModal) {
        setShowAddModal(false);
        setFormError('');
        setShowDatePicker(false);
      }
      if (showTaskModal) {
        setShowTaskModal(false);
        setSelectedTask(null);
        setShowStatusMenu(false);
        setIsEditingTask(false);
      }
      if (showCompleteModal) {
        setShowCompleteModal(false);
        setTaskToComplete(null);
      }
      if (showIncompleteModal) {
        setShowIncompleteModal(false);
        setTaskToRestore(null);
      }
      if (showDeleteModal) {
        setShowDeleteModal(false);
        setTaskToDelete(null);
      }
      if (showDepartmentModal) {
        setShowDepartmentModal(false);
        setDepartmentError('');
      }
      if (departmentToDelete) {
        setDepartmentToDelete(null);
        setDepartmentUsage(null);
        setDepartmentUsageError('');
      }
      if (showDayTasksModal) {
        setShowDayTasksModal(false);
        setDayTasks([]);
        setDayTasksDate(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [
    showAddModal,
    showTaskModal,
    showCompleteModal,
    showIncompleteModal,
    showDeleteModal,
    showDepartmentModal,
    departmentToDelete,
    showDayTasksModal,
  ]);

  useEffect(() => {
    if (!selectedTask || isEditingTask) return;
    setEditTaskName(selectedTask.name);
    setEditTaskPriority(selectedTask.priority);
    setEditTaskDepartment(selectedTask.department);
    setEditTaskDueDate(toInputDate(new Date(selectedTask.dueDateIso)));
    setEditTaskDescription(selectedTask.description ?? '');
    setEditTaskAssignee(resolveAssigneeValues(selectedTask.assignee));
    setEditTaskStatus(selectedTask.status);
    setEditFormError('');
    setShowEditDatePicker(false);
    setIsEditingTask(false);
    setShowStatusMenu(false);
  }, [resolveAssigneeValues, selectedTask, showTaskModal, isEditingTask]);

  const selectedDate = useMemo(() => parseInputDate(taskDate), [taskDate]);
  const editSelectedDate = useMemo(() => parseInputDate(editTaskDueDate), [editTaskDueDate]);
  const datePickerYearOptions = useMemo(
    () => buildYearOptions(datePickerMonth.getFullYear()),
    [datePickerMonth]
  );
  const editDatePickerYearOptions = useMemo(
    () => buildYearOptions(editDatePickerMonth.getFullYear()),
    [editDatePickerMonth]
  );
  const isSelectedTaskEdited = useMemo(() => {
    if (!selectedTask?.editedAt) return false;
    const edited = new Date(selectedTask.editedAt).getTime();
    return !Number.isNaN(edited);
  }, [selectedTask]);
  const isStatusDirty = useMemo(
    () => !!selectedTask && editTaskStatus !== selectedTask.status,
    [editTaskStatus, selectedTask]
  );
  const canEditSelectedTask = useMemo(
    () => (selectedTask ? canEditTask(selectedTask) : false),
    [canEditTask, selectedTask]
  );
  const canChangeSelectedStatus = useMemo(
    () => (selectedTask ? canChangeStatus(selectedTask) : false),
    [canChangeStatus, selectedTask]
  );
  const canDeleteSelectedTask = useMemo(
    () => (selectedTask ? canDeleteTask(selectedTask) : false),
    [canDeleteTask, selectedTask]
  );

  useEffect(() => {
    if (!showTaskModal && !showDayTasksModal) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showTaskModal) {
        setShowTaskModal(false);
        setSelectedTask(null);
        setIsEditingTask(false);
        setShowStatusMenu(false);
        setShowEditDatePicker(false);
      }
      if (showDayTasksModal) {
        setShowDayTasksModal(false);
        setDayTasks([]);
        setDayTasksDate(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showTaskModal, showDayTasksModal]);

  const filteredTasks = useMemo(
    () =>
      tasksState.filter((task) => {
        const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
        const deptMatch =
          departmentFilter === ALL_DEPARTMENTS_LABEL || task.department === departmentFilter;
        const isActive = task.status !== 'Completed';
        return priorityMatch && deptMatch && isActive;
      }),
    [priorityFilter, departmentFilter, tasksState]
  );

  const completedTasks = useMemo(
    () => tasksState.filter((task) => task.status === 'Completed'),
    [tasksState]
  );

  const sortedTasks = useMemo(() => {
    const priorityWeight: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    const dir = sortDir === 'asc' ? 1 : -1;
    const arr = [...filteredTasks];
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'assignee':
          return formatAssignees(a.assignee).localeCompare(formatAssignees(b.assignee)) * dir;
        case 'department':
          return a.department.localeCompare(b.department) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'priority':
          return (priorityWeight[a.priority] - priorityWeight[b.priority]) * dir;
        case 'date': {
          const timeA = new Date(a.dueDateIso).getTime();
          const timeB = new Date(b.dueDateIso).getTime();
          return (timeA - timeB) * dir;
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredTasks, sortDir, sortKey]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleOpenDayTasks = (date: Date, tasks: Task[]) => {
    setDayTasksDate(date);
    setDayTasks(tasks);
    setShowDayTasksModal(true);
  };

  const handleAddTaskClick = () => {
    setShowAddModal(true);
    setAddTaskError('');
  };

  const handleAddDepartmentClick = () => {
    if (!isAdmin) {
      setCompleteError('Only admins can manage departments.');
      window.setTimeout(() => setCompleteError(''), 2200);
      return;
    }
    setDepartmentError('');
    setNewDepartmentName('');
    setShowDepartmentModal(true);
  };

  const handleCreateDepartment = async () => {
    const trimmedName = newDepartmentName.trim();
    if (!trimmedName) {
      setDepartmentError('Department name is required.');
      return;
    }
    if (trimmedName.length > MAX_DEPARTMENT_NAME_LENGTH) {
      setDepartmentError(
        `Department name must be ${MAX_DEPARTMENT_NAME_LENGTH} characters or fewer.`
      );
      return;
    }

    try {
      const normalizedName = normalizeDepartmentName(trimmedName);
      await createDepartment(normalizedName);
      const departments = await listDepartments();
      setDepartmentOptions(
        departments.map((dept) => ({
          ...dept,
          name: normalizeDepartmentName(dept.name),
        }))
      );
      setShowDepartmentModal(false);
      setNewDepartmentName('');
      setDepartmentError('');
    } catch (err) {
      console.error('Failed to create department:', err);
      setDepartmentError('Failed to create department. Please try again.');
    }
  };

  const handleDeleteDepartment = async (dept: DepartmentOption) => {
    if (!isAdmin) {
      setCompleteError('Only admins can manage departments.');
      window.setTimeout(() => setCompleteError(''), 2200);
      return;
    }
    setDepartmentUsage(null);
    setDepartmentUsageError('');
    try {
      const usage = await getDepartmentUsage(dept._id);
      setDepartmentUsage(usage);
    } catch (err) {
      console.error('Failed to load department usage:', err);
      setDepartmentUsageError('Failed to load department usage.');
    }
    setDepartmentToDelete(dept);
  };

  const confirmDeleteDepartment = async () => {
    if (!departmentToDelete) return;
    try {
      await deleteDepartment(departmentToDelete._id, { force: true });
      const departments = await listDepartments();
      setDepartmentOptions(
        departments.map((dept) => ({
          ...dept,
          name: normalizeDepartmentName(dept.name),
        }))
      );
      if (departmentFilter === departmentToDelete.name) {
        setDepartmentFilter(ALL_DEPARTMENTS_LABEL);
      }
      setTasksState((prev) => prev.filter((task) => task.department !== departmentToDelete.name));
      if (selectedTask?.department === departmentToDelete.name) {
        setSelectedTask(null);
        setShowTaskModal(false);
      }
      setDepartmentNotice('Department removed.');
      window.setTimeout(() => setDepartmentNotice(''), 2200);
    } catch (err) {
      console.error('Failed to delete department:', err);
      setDepartmentNotice('Failed to remove department. Please try again.');
      window.setTimeout(() => setDepartmentNotice(''), 2200);
    } finally {
      setDepartmentToDelete(null);
      setDepartmentUsage(null);
      setDepartmentUsageError('');
    }
  };

  const handleAddTaskSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedName = taskName.trim();
    if (!trimmedName || !taskPriority || !taskDate || !taskDepartment) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (trimmedName.length > MAX_TASK_NAME_LENGTH) {
      setFormError(`Task name must be ${MAX_TASK_NAME_LENGTH} characters or fewer.`);
      return;
    }
    const trimmedDescription = taskDescription.trim();
    if (trimmedDescription.length > MAX_TASK_DESCRIPTION_LENGTH) {
      setFormError(`Description must be ${MAX_TASK_DESCRIPTION_LENGTH} characters or fewer.`);
      return;
    }
    if (taskAssignee.length === 0) {
      setFormError('Please select an assignee.');
      return;
    }

    const parsedDate = parseInputDate(taskDate);
    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      setFormError('Please provide a valid due date.');
      return;
    }

    try {
      const assignees = normalizeAssignees(taskAssignee);
      const newTask = await tasksApi.createTask({
        name: trimmedName,
        description: trimmedDescription || undefined,
        priority: taskPriority,
        department: taskDepartment,
        assignee: assignees,
        dueDate: parsedDate.toISOString(),
      });

      const mappedTask = mapApiTask(newTask);

      setTasksState((prev) => [...prev, mappedTask]);
      setShowAddModal(false);
      setTaskName('');
      setTaskPriority('');
      setTaskDate('');
      setTaskDepartment('');
      setTaskDescription('');
      setTaskAssignee([]);
      setShowDatePicker(false);
      setFormError('');
    } catch (err) {
      console.error('Failed to create task:', err);
      setFormError('Failed to create task. Please try again.');
    }
  };

  const handleStatusChange = (nextStatus: Task['status']) => {
    if (!selectedTask) return;
    if (!canChangeStatus(selectedTask)) {
      setCompleteError('Only assignees or task creators can update task status.');
      window.setTimeout(() => setCompleteError(''), 2200);
      setShowStatusMenu(false);
      return;
    }
    setEditTaskStatus(nextStatus);
    setShowStatusMenu(false);
  };

  const handleConfirmStatusChange = useCallback(async () => {
    if (!selectedTask || !isStatusDirty) return;
    if (!canChangeStatus(selectedTask)) {
      setCompleteError('Only assignees or task creators can update task status.');
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
  }, [canChangeStatus, editTaskStatus, isStatusDirty, selectedTask]);

  const handleCancelEdit = () => {
    if (!selectedTask) return;
    setEditTaskName(selectedTask.name);
    setEditTaskPriority(selectedTask.priority);
    setEditTaskDepartment(selectedTask.department);
    setEditTaskDueDate(toInputDate(new Date(selectedTask.dueDateIso)));
    setEditTaskDescription(selectedTask.description ?? '');
    setEditTaskAssignee(resolveAssigneeValues(selectedTask.assignee));
    setEditTaskStatus(selectedTask.status);
    setEditFormError('');
    setShowEditDatePicker(false);
    setShowStatusMenu(false);
    setIsEditingTask(false);
  };

  const handleSaveTaskEdits = useCallback(async () => {
    if (!selectedTask) return;
    if (!canEditTask(selectedTask)) {
      setEditFormError('Only task creators or team admins can edit task details.');
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
    const trimmedDescription = editTaskDescription.trim();
    if (trimmedDescription.length > MAX_TASK_DESCRIPTION_LENGTH) {
      setEditFormError(`Description must be ${MAX_TASK_DESCRIPTION_LENGTH} characters or fewer.`);
      return;
    }
    if (editTaskAssignee.length === 0) {
      setEditFormError('Please select an assignee.');
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
        description: trimmedDescription || undefined,
        priority: editTaskPriority,
        department: editTaskDepartment,
        assignee: normalizeAssignees(editTaskAssignee),
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
    editTaskAssignee,
    editTaskDepartment,
    editTaskDescription,
    editTaskDueDate,
    editTaskName,
    editTaskPriority,
    canEditTask,
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

  const handleMarkComplete = (task: Task) => {
    if (!canChangeStatus(task)) {
      handleNonAdminAttempt();
      return;
    }
    setTaskToComplete(task);
    setShowCompleteModal(true);
  };

  const handleNonAdminAttempt = () => {
    setCompleteError('Only assignees or task creators can update task status.');
    window.setTimeout(() => setCompleteError(''), 2200);
  };

  const confirmComplete = async () => {
    if (!taskToComplete) return;

    try {
      const updated = await tasksApi.updateTask(taskToComplete.id, { status: 'Completed' });
      const mapped = mapApiTask(updated);
      setTasksState((prev) => prev.map((t) => (t.id === mapped.id ? mapped : t)));
      setSelectedTask((prev) => (prev?.id === mapped.id ? mapped : prev));
      setTaskToComplete(null);
      setShowCompleteModal(false);
    } catch (err) {
      console.error('Failed to complete task:', err);
      setCompleteError('Failed to mark task as complete. Please try again.');
      window.setTimeout(() => setCompleteError(''), 2200);
    }
  };

  const handleMarkIncomplete = (task: Task) => {
    if (!canChangeStatus(task)) {
      handleNonAdminAttempt();
      return;
    }
    setTaskToRestore(task);
    setShowIncompleteModal(true);
  };

  const confirmRestore = async () => {
    if (!taskToRestore) return;

    try {
      const updated = await tasksApi.updateTask(taskToRestore.id, { status: 'Not Started' });
      const mapped = mapApiTask(updated);
      setTasksState((prev) => prev.map((t) => (t.id === mapped.id ? mapped : t)));
      setSelectedTask((prev) => (prev?.id === mapped.id ? mapped : prev));
      setTaskToRestore(null);
      setShowIncompleteModal(false);
    } catch (err) {
      console.error('Failed to restore task:', err);
      setCompleteError('Failed to restore task. Please try again.');
      window.setTimeout(() => setCompleteError(''), 2200);
    }
  };

  const handleDeleteTask = (task: Task) => {
    if (!canDeleteTask(task)) {
      setCompleteError('Only task creators or team admins can delete tasks.');
      window.setTimeout(() => setCompleteError(''), 2200);
      return;
    }
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
    <div className="flex h-full flex-col overflow-hidden">
      {/* Filters */}
      <div className="mb-2 flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <span className="text-xs font-bold uppercase text-neutral-400">Priority:</span>
            <div className="flex flex-wrap gap-1">
              {priorities.map((opt) => {
                const isActive = priorityFilter === opt;
                if (opt === 'all') {
                  return (
                    <button
                      key={opt}
                      onClick={() => setPriorityFilter(opt)}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? 'border-neutral-900 bg-neutral-900 text-white ring-1 ring-neutral-300 ring-offset-1 ring-offset-white'
                          : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
                      }`}
                      aria-pressed={isActive}
                    >
                      All
                    </button>
                  );
                }
                const styles = PRIORITY_STYLES[opt];
                return (
                  <button
                    key={opt}
                    onClick={() => setPriorityFilter(opt)}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isActive ? styles.active : `bg-white ${styles.base}`
                    }`}
                    aria-pressed={isActive}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="ml-auto flex-shrink-0">
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase text-neutral-400">Department:</span>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setDepartmentFilter(ALL_DEPARTMENTS_LABEL)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                departmentFilter === ALL_DEPARTMENTS_LABEL
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
              }`}
              aria-pressed={departmentFilter === ALL_DEPARTMENTS_LABEL}
            >
              {ALL_DEPARTMENTS_LABEL}
            </button>
            {departmentOptions.map((dept) => {
              const isActive = departmentFilter === dept.name;
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
                    onClick={() => setDepartmentFilter(dept.name)}
                    className="cursor-pointer"
                  >
                    <span className="block max-w-[140px] truncate" title={dept.name}>
                      {dept.name}
                    </span>
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDepartment(dept)}
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
                  )}
                </div>
              );
            })}
            {isAdmin && (
              <button
                onClick={handleAddDepartmentClick}
                className="cursor-pointer rounded-full border border-dashed border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-400 hover:border-neutral-400 hover:text-neutral-600"
                title="Add Department"
                aria-label="Add Department"
              >
                +
              </button>
            )}
          </div>
        </div>
      </div>
      {departmentNotice && (
        <div className="mb-1 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          {departmentNotice}
        </div>
      )}

      {/* Views - Scrollable Container */}
      <div
        ref={calendarScrollRef}
        className={`flex-1 ${view === 'calendar' ? 'min-h-0' : 'overflow-y-auto'}`}
      >
        {view === 'table' ? (
          <TableView
            filteredTasks={sortedTasks}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            canChangeStatus={canChangeStatus}
            onComplete={handleMarkComplete}
            onNonAdmin={handleNonAdminAttempt}
            onOpenDetails={(task) => {
              setSelectedTask(task);
              setShowTaskModal(true);
            }}
          />
        ) : view === 'calendar' ? (
          <CalendarView
            filteredTasks={filteredTasks}
            canChangeStatus={canChangeStatus}
            onComplete={handleMarkComplete}
            onNonAdmin={handleNonAdminAttempt}
            onOpenDetails={(task) => {
              setSelectedTask(task);
              setShowTaskModal(true);
            }}
            onOpenDay={handleOpenDayTasks}
            currentDate={calendarDate}
            onChangeDate={setCalendarDate}
          />
        ) : (
          <TableView
            filteredTasks={completedTasks}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            canChangeStatus={canChangeStatus}
            onComplete={() => {}}
            showCompleteColumn={false}
            showIncompleteColumn={true}
            onIncomplete={handleMarkIncomplete}
            onNonAdmin={handleNonAdminAttempt}
            dateLabel="Completion Date"
            getDate={(t) => t.completedAt ?? t.date}
            onOpenDetails={(task) => {
              setSelectedTask(task);
              setShowTaskModal(true);
            }}
          />
        )}

        {loading && (
          <div className="flex items-center justify-center p-8">
            <div className="text-lg text-gray-600">Loading tasks...</div>
          </div>
        )}
      </div>

      {/* Add Task Button */}
      <button
        onClick={handleAddTaskClick}
        className={`fixed bottom-8 right-8 inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-neutral-900 px-5 text-xs font-semibold text-white shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.99] ${
          shake ? 'animate-shake' : ''
        }`}
        aria-live="polite"
      >
        <span className="text-sm">+</span>
        <span>Add Task</span>
      </button>
      {addTaskError && (
        <div className="fixed bottom-20 right-8 rounded-md border-2 border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-lg">
          {addTaskError}
        </div>
      )}
      {completeError && (
        <div className="fixed bottom-32 right-8 rounded-md border-2 border-yellow-500 bg-white px-4 py-2 text-sm font-semibold text-yellow-700 shadow-lg">
          {completeError}
        </div>
      )}

      {showDayTasksModal && dayTasksDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07000b]/40 p-4">
          <div className="animate-modal-in w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  Tasks for {formatDisplayDate(dayTasksDate)}
                </h3>
                <p className="text-xs text-neutral-500">{dayTasks.length} total</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDayTasksModal(false);
                  setDayTasks([]);
                  setDayTasksDate(null);
                }}
                className="cursor-pointer rounded-md border border-neutral-200 px-2 py-1 text-sm font-semibold text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
            <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {dayTasks.length ? (
                dayTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      setShowDayTasksModal(false);
                      setDayTasks([]);
                      setDayTasksDate(null);
                      setSelectedTask(task);
                      setShowTaskModal(true);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${PRIORITY_STYLES[task.priority].card}`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-neutral-800" title={task.name}>
                        {truncateText(task.name, TABLE_NAME_MAX)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-neutral-500">
                        {truncateText(formatAssignees(task.assignee), TABLE_ASSIGNEE_MAX)} •{' '}
                        {truncateText(
                          normalizeDepartmentName(task.department),
                          TABLE_DEPARTMENT_MAX
                        )}
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
                  No tasks scheduled for this day.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                    if (!canEditSelectedTask) {
                      setCompleteError('Only task creators or team admins can edit task details.');
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
                  disabled={!canEditSelectedTask}
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
                    <div className="mt-1 break-words text-neutral-700" title={selectedTask.name}>
                      {selectedTask.name}
                    </div>
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
                    <div
                      className="mt-1 break-words text-neutral-700"
                      title={normalizeDepartmentName(selectedTask.department)}
                    >
                      {normalizeDepartmentName(selectedTask.department)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">Assigned To</div>
                  {isEditingTask ? (
                    <div className="mt-1">
                      <MultiSelectMenu
                        values={editTaskAssignee}
                        placeholder="Select assignee"
                        options={assigneeOptions}
                        onChange={setEditTaskAssignee}
                        disabled={!isAdmin}
                      />
                    </div>
                  ) : (
                    <div
                      className="mt-1 break-words text-neutral-700"
                      title={formatAssignees(selectedTask.assignee)}
                    >
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
                        if (!canChangeSelectedStatus) {
                          setCompleteError(
                            'Only assignees or task creators can update task status.'
                          );
                          window.setTimeout(() => setCompleteError(''), 2200);
                          return;
                        }
                        setShowStatusMenu((prev) => !prev);
                      }}
                      disabled={!canChangeSelectedStatus || isEditingTask}
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
                  <>
                    <textarea
                      value={editTaskDescription}
                      onChange={(event) => setEditTaskDescription(event.target.value)}
                      maxLength={MAX_TASK_DESCRIPTION_LENGTH}
                      className="min-h-[96px] w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:border-neutral-900 focus:outline-none"
                      placeholder="Add more context, requirements, or links"
                    />
                    <div className="mt-1 text-xs text-neutral-400">
                      {editTaskDescription.length}/{MAX_TASK_DESCRIPTION_LENGTH}
                    </div>
                  </>
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
              {canDeleteSelectedTask && (
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
                  {canChangeSelectedStatus && (
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07000b]/40 p-4">
          <div className="animate-modal-in w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-neutral-900">Add New Task</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormError('');
                  setShowDatePicker(false);
                }}
                className="cursor-pointer rounded-md border border-neutral-200 px-2 py-1 text-sm font-semibold text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddTaskSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">Task Name *</label>
                <input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  maxLength={MAX_TASK_NAME_LENGTH}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-neutral-900 focus:outline-none"
                  placeholder="Enter task name"
                />
                <div className="mt-1 text-xs text-neutral-400">
                  {taskName.length}/{MAX_TASK_NAME_LENGTH}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Priority *</label>
                  <div className="flex gap-2">
                    {(['high', 'medium', 'low'] as Priority[]).map((p) => {
                      const isActive = taskPriority === p;
                      const styles = PRIORITY_STYLES[p];
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setTaskPriority(p)}
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
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">Due Date *</label>
                  <div ref={datePickerRef} className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setShowDatePicker((prev) => {
                          const next = !prev;
                          if (next) setDatePickerMonth(selectedDate ?? new Date());
                          return next;
                        })
                      }
                      className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 transition-colors hover:border-neutral-300"
                      aria-haspopup="dialog"
                      aria-expanded={showDatePicker}
                    >
                      <span>
                        {selectedDate ? formatDisplayDate(selectedDate) : 'Select a date'}
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
                    {showDatePicker && (
                      <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-neutral-200 bg-white p-3 shadow-xl">
                        <div className="flex items-center gap-2">
                          <select
                            value={datePickerMonth.getMonth()}
                            onChange={(event) =>
                              setDatePickerMonth(
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
                            value={datePickerMonth.getFullYear()}
                            onChange={(event) =>
                              setDatePickerMonth(
                                (prev) => new Date(Number(event.target.value), prev.getMonth(), 1)
                              )
                            }
                            className="w-24 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 focus:border-neutral-900 focus:outline-none"
                          >
                            {datePickerYearOptions.map((yearOption) => (
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
                          {buildCalendarDates(datePickerMonth).map((date) => {
                            const isOutsideMonth = date.getMonth() !== datePickerMonth.getMonth();
                            const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
                            const isToday = isSameDay(date, new Date());
                            return (
                              <button
                                key={date.toISOString()}
                                type="button"
                                onClick={() => {
                                  setTaskDate(toInputDate(date));
                                  setShowDatePicker(false);
                                }}
                                className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border text-[11px] transition-colors ${
                                  isSelected
                                    ? 'border-neutral-900 bg-neutral-900 text-white'
                                    : isOutsideMonth
                                      ? 'border-transparent text-neutral-300 hover:text-neutral-500'
                                      : 'border-transparent text-neutral-700 hover:bg-neutral-100'
                                } ${isToday && !isSelected ? 'border-amber-400' : ''}`}
                              >
                                {date.getDate()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Department *</label>
                <DepartmentMenu
                  value={taskDepartment}
                  placeholder="Select department"
                  options={departmentOptions}
                  onChange={(next) => setTaskDepartment(next as Department | '')}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Assign To *</label>
                <MultiSelectMenu
                  values={taskAssignee}
                  placeholder="Select assignee"
                  options={assigneeOptions}
                  onChange={setTaskAssignee}
                  disabled={!isAdmin}
                />
                {!isAdmin ? (
                  <p className="mt-1 text-xs text-neutral-500">Assigned to your account.</p>
                ) : null}
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold">Description (optional)</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  maxLength={MAX_TASK_DESCRIPTION_LENGTH}
                  className="min-h-[96px] w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:border-neutral-900 focus:outline-none"
                  placeholder="Add more context, requirements, or links"
                />
                <div className="mt-1 text-xs text-neutral-400">
                  {taskDescription.length}/{MAX_TASK_DESCRIPTION_LENGTH}
                </div>
              </div>

              {formError && (
                <div className="rounded-md border-2 border-red-600 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormError('');
                    setShowDatePicker(false);
                    setTaskAssignee([]);
                  }}
                  className="cursor-pointer rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-800"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDepartmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07000b]/40 p-4">
          <div className="animate-modal-in w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Add Department</h3>
              <button
                onClick={() => {
                  setShowDepartmentModal(false);
                  setDepartmentError('');
                }}
                className="cursor-pointer rounded-md border border-neutral-200 px-2 py-1 text-sm font-semibold text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
            <div className="space-y-2">
              <input
                value={newDepartmentName}
                onChange={(event) => setNewDepartmentName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleCreateDepartment();
                  }
                }}
                maxLength={MAX_DEPARTMENT_NAME_LENGTH}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-neutral-900 focus:outline-none"
                placeholder="Department name"
                autoFocus
              />
              <div className="text-xs text-neutral-400">
                {newDepartmentName.length}/{MAX_DEPARTMENT_NAME_LENGTH}
              </div>
              {departmentError ? (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {departmentError}
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDepartmentModal(false);
                  setDepartmentError('');
                }}
                className="cursor-pointer rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateDepartment}
                className="cursor-pointer rounded-lg border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-800"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {departmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07000b]/40 p-4">
          <div className="animate-modal-in w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Remove Department</h3>
              <button
                onClick={() => {
                  setDepartmentToDelete(null);
                  setDepartmentUsage(null);
                  setDepartmentUsageError('');
                }}
                className="cursor-pointer rounded-md border border-neutral-200 px-2 py-1 text-sm font-semibold text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-neutral-600">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-neutral-900">{departmentToDelete.name}</span>?
            </p>
            {departmentUsageError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {departmentUsageError}
              </div>
            )}
            {departmentUsage &&
              (departmentUsage.taskCount > 0 || departmentUsage.fileCount > 0) && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Removing this department will delete {departmentUsage.taskCount} task
                  {departmentUsage.taskCount === 1 ? '' : 's'} and {departmentUsage.fileCount} file
                  {departmentUsage.fileCount === 1 ? '' : 's'}.
                </div>
              )}
            <div className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              This action cannot be undone.
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDepartmentToDelete(null);
                  setDepartmentUsage(null);
                  setDepartmentUsageError('');
                }}
                className="cursor-pointer rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDepartment}
                className="cursor-pointer rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      {showCompleteModal && taskToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07000b]/40 p-4">
          <div className="animate-modal-in w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Confirm Completion</h3>
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setTaskToComplete(null);
                }}
                className="cursor-pointer rounded-md border-2 border-gray-400 px-2 py-1 text-sm font-semibold hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <p className="mb-4 text-sm">
              Are you sure you want to mark{' '}
              <span className="font-semibold" title={taskToComplete.name}>
                {truncateText(taskToComplete.name, MAX_TASK_NAME_LENGTH)}
              </span>{' '}
              as complete?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setTaskToComplete(null);
                }}
                className="cursor-pointer rounded-md border-2 border-gray-400 px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmComplete}
                className="cursor-pointer rounded-md border-2 border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow hover:bg-emerald-600"
              >
                Yes, mark complete
              </button>
            </div>
          </div>
        </div>
      )}

      {showIncompleteModal && taskToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07000b]/40 p-4">
          <div className="animate-modal-in w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Revert Completion</h3>
              <button
                onClick={() => {
                  setShowIncompleteModal(false);
                  setTaskToRestore(null);
                }}
                className="cursor-pointer rounded-md border-2 border-gray-400 px-2 py-1 text-sm font-semibold hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <p className="mb-4 text-sm">
              Are you sure you want to revert the completion of{' '}
              <span className="font-semibold" title={taskToRestore.name}>
                {truncateText(taskToRestore.name, MAX_TASK_NAME_LENGTH)}
              </span>
              ?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowIncompleteModal(false);
                  setTaskToRestore(null);
                }}
                className="cursor-pointer rounded-md border-2 border-gray-400 px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="cursor-pointer rounded-md border-2 border-red-600 bg-red-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-1"
              >
                Yes, revert completion
              </button>
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
              <span className="font-semibold" title={taskToDelete.name}>
                {truncateText(taskToDelete.name, MAX_TASK_NAME_LENGTH)}
              </span>
              ? This action cannot be undone.
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
    </div>
  );
}
