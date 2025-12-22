import { useMemo, useState, type FormEvent, useEffect } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useAuth } from '../auth/useAuth';
import * as tasksApi from '../api/tasks';

type Priority = 'high' | 'medium' | 'low';
type Department = 'sales' | 'it' | 'finance' | 'marketing' | 'hr' | 'customer-service';
type ViewMode = 'calendar' | 'table' | 'completed';

type UserOption = { name: string; email: string };

type Task = {
  id: string;
  name: string;
  date: string; // any parseable date string
  priority: Priority;
  assignee: string;
  department: Department;
  status: 'In Progress' | 'Not Started' | 'Completed';
  description?: string;
  completedAt?: string;
};

const initialTasks: Task[] = [
  {
    id: 't1',
    name: 'Submit Final Tender',
    date: 'Nov 20, 2025',
    priority: 'high',
    assignee: 'Sarah Chen',
    department: 'sales',
    status: 'In Progress',
  },
  {
    id: 't2',
    name: 'Complete Security Audit',
    date: 'Nov 18, 2025',
    priority: 'high',
    assignee: 'David Park',
    department: 'it',
    status: 'Not Started',
  },
  {
    id: 't3',
    name: 'Review Q4 Budget',
    date: 'Nov 22, 2025',
    priority: 'medium',
    assignee: 'Michael Torres',
    department: 'finance',
    status: 'In Progress',
  },
  {
    id: 't4',
    name: 'Update Marketing Materials',
    date: 'Nov 25, 2025',
    priority: 'medium',
    assignee: 'Emma Wilson',
    department: 'marketing',
    status: 'Not Started',
  },
  {
    id: 't5',
    name: 'Review client feedback',
    date: 'Nov 18, 2025',
    priority: 'low',
    assignee: 'John Smith',
    department: 'customer-service',
    status: 'In Progress',
  },
  {
    id: 't6',
    name: 'Organize team building event',
    date: 'Dec 1, 2025',
    priority: 'low',
    assignee: 'Sarah Chen',
    department: 'hr',
    status: 'Not Started',
  },
  {
    id: 't7',
    name: 'Deploy new software update',
    date: 'Nov 19, 2025',
    priority: 'high',
    assignee: 'David Park',
    department: 'it',
    status: 'In Progress',
  },
  {
    id: 't8',
    name: 'Prepare client presentation',
    date: 'Nov 21, 2025',
    priority: 'medium',
    assignee: 'Emma Wilson',
    department: 'sales',
    status: 'Not Started',
  },
];

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

const departments: Array<Department | 'all'> = [
  'all',
  'sales',
  'it',
  'finance',
  'marketing',
  'hr',
  'customer-service',
];
const priorities: Array<Priority | 'all'> = ['all', 'high', 'medium', 'low'];
const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type FilterSectionProps<T extends string> = {
  label: string;
  options: T[];
  active: T;
  onChange: (value: T) => void;
  colorMap?: Record<T, string>;
};

function FilterSection<T extends string>({
  label,
  options,
  active,
  onChange,
  colorMap,
}: FilterSectionProps<T>) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border-2 border-gray-500 bg-gray-50 p-5">
      <div className="border-r-2 border-gray-400 pr-4 text-base font-bold">{label}</div>
      {options.map((opt) => {
        const isActive = active === opt;
        const colorClass = colorMap?.[opt] || '';
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`cursor-pointer rounded-md border-2 px-4 py-2 text-sm transition-colors ${
              isActive
                ? colorClass || 'border-gray-500 bg-gray-200 font-bold'
                : 'border-gray-500 bg-white hover:bg-gray-100'
            } ${colorClass}`}
          >
            {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1).replace('-', ' ')}
          </button>
        );
      })}
    </div>
  );
}

type SortKey = 'name' | 'date' | 'priority' | 'assignee' | 'department' | 'status';
type SortDir = 'asc' | 'desc';

function TableView({
  filteredTasks,
  sortKey,
  sortDir,
  onSort,
  isAdmin,
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
  isAdmin: boolean;
  onComplete: (task: Task) => void;
  showCompleteColumn?: boolean;
  onNonAdmin?: () => void;
  showIncompleteColumn?: boolean;
  onIncomplete?: (task: Task) => void;
  dateLabel?: string;
  getDate?: (task: Task) => string;
  onOpenDetails: (task: Task) => void;
}) {
  const headers: Array<{ key: SortKey; label: string }> = [
    { key: 'name', label: 'Task Name' },
    { key: 'date', label: dateLabel },
    { key: 'priority', label: 'Priority' },
    { key: 'assignee', label: 'Assigned To' },
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status' },
  ];

  const indicator = (key: SortKey) => {
    if (sortKey !== key) return '↕';
    return sortDir === 'asc' ? '▲' : '▼';
  };

  const hint = (key: SortKey) => {
    if (key === 'date') return sortDir === 'asc' ? 'Old → New' : 'New → Old';
    if (key === 'priority') return sortDir === 'asc' ? 'High → Low' : 'Low → High';
    return sortDir === 'asc' ? 'A → Z' : 'Z → A';
  };

  return (
    <table className="w-full border-collapse overflow-hidden rounded-lg border-2 border-gray-800">
      <thead className="bg-gray-100">
        <tr>
          {headers.map(({ key, label }) => (
            <th key={key} className="border-2 border-gray-500 p-4 text-left text-base font-bold">
              <button
                onClick={() => onSort(key)}
                className="flex items-center gap-2 text-left text-sm font-bold uppercase tracking-wide"
              >
                <span>{label}</span>
                <span className="text-xs text-gray-600">{indicator(key)}</span>
              </button>
            </th>
          ))}
          {showCompleteColumn && (
            <th className="border-2 border-gray-500 p-4 text-left text-base font-bold">Complete</th>
          )}
          {!showCompleteColumn && showIncompleteColumn && (
            <th className="border-2 border-gray-500 p-4 text-left text-base font-bold">Incomplete</th>
          )}
        </tr>
      </thead>
      <tbody>
        {filteredTasks.map((task, i) => (
          <tr
            key={i}
            onClick={() => onOpenDetails(task)}
            className="cursor-pointer hover:bg-gray-50"
          >
            <td className="border-2 border-gray-300 p-4 text-sm">{task.name}</td>
            <td className="border-2 border-gray-300 p-4 text-sm">{getDate ? getDate(task) : task.date}</td>
            <td className="border-2 border-gray-300 p-4 text-sm">
              <Badge variant={task.priority}>{task.priority.toUpperCase()}</Badge>
            </td>
            <td className="border-2 border-gray-300 p-4 text-sm">{task.assignee}</td>
            <td className="border-2 border-gray-300 p-4 text-sm capitalize">
              {task.department.replace('-', ' ')}
            </td>
            <td className="border-2 border-gray-300 p-4 text-sm">{task.status}</td>
            {showCompleteColumn && (
              <td className="border-2 border-gray-300 p-4 text-sm">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAdmin) {
                      onNonAdmin?.();
                      return;
                    }
                    onComplete(task);
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                    isAdmin
                      ? 'border-gray-400 text-gray-600 hover:border-green-600 hover:text-green-600 hover:bg-green-50 transition-colors'
                      : 'border-gray-300 text-gray-300 cursor-not-allowed'
                  }`}
                  aria-label={`Mark ${task.name} complete`}
                  aria-disabled={!isAdmin}
                >
                  ✓
                </button>
              </td>
            )}
            {!showCompleteColumn && showIncompleteColumn && (
              <td className="border-2 border-gray-300 p-4 text-sm">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAdmin) {
                      onNonAdmin?.();
                      return;
                    }
                    onIncomplete?.(task);
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                    isAdmin
                      ? 'border-gray-400 text-gray-600 hover:border-red-600 hover:text-red-600 hover:bg-red-50 transition-colors'
                      : 'border-gray-300 text-gray-300 cursor-not-allowed'
                  }`}
                  aria-label={`Mark ${task.name} incomplete`}
                  aria-disabled={!isAdmin}
                >
                  ✕
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CalendarView({
  filteredTasks,
  isAdmin,
  onComplete,
  onNonAdmin,
  onOpenDetails,
}: {
  filteredTasks: Task[];
  isAdmin: boolean;
  onComplete: (task: Task) => void;
  onNonAdmin?: () => void;
  onOpenDetails: (task: Task) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const currentDay = today.getDate();

  // Get first day of month and number of days in month
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create array of just the days in the month (no padding)
  const calendarDays = useMemo(() => {
    const days: number[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }, [year, month]);

  const getTasksForDay = (day: number) =>
    filteredTasks.filter((t) => {
      const taskDate = new Date(t.date);
      return (
        !Number.isNaN(taskDate.getTime()) &&
        taskDate.getFullYear() === year &&
        taskDate.getMonth() === month &&
        taskDate.getDate() === day
      );
    });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between rounded-lg border-2 border-gray-800 bg-gray-50 p-4">
        <button
          onClick={handlePrevMonth}
          className="rounded-md border-2 border-gray-500 bg-white px-4 py-2 font-semibold hover:bg-gray-100"
        >
          ← Previous
        </button>
        <h2 className="text-2xl font-bold">{monthName}</h2>
        <button
          onClick={handleNextMonth}
          className="rounded-md border-2 border-gray-500 bg-white px-4 py-2 font-semibold hover:bg-gray-100"
        >
          Next →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border-2 border-gray-800 bg-gray-50 p-5">
        <div className="grid grid-cols-7 gap-3">
          {calendarDays.map((day) => {
            const isToday = isCurrentMonth && day === currentDay;
            const dayTasks = getTasksForDay(day);
            const dayOfWeek = new Date(year, month, day).toLocaleDateString('en-US', {
              weekday: 'short',
            });

            return (
              <div
                key={day}
                className={`min-h-28 rounded-lg border-2 p-3 ${
                  isToday ? 'border-blue-600 bg-blue-50' : 'border-gray-500 bg-white'
                }`}
              >
                <div
                  className={`mb-2 flex items-center justify-between border-b-2 pb-2 ${
                    isToday ? 'border-blue-600' : 'border-gray-300'
                  }`}
                >
                  <div
                    className={`font-bold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}
                  >
                    {day}
                  </div>
                  <div className="text-xs font-light text-gray-500">{dayOfWeek}</div>
                </div>
                {dayTasks.map((task, i) => (
                  <div
                    key={i}
                    className={`group mb-1 flex items-center justify-between rounded border-2 p-2 text-xs transition-colors ${
                      task.priority === 'high'
                        ? 'border-red-600 hover:bg-red-100'
                        : task.priority === 'medium'
                          ? 'border-orange-500 hover:bg-orange-100'
                          : 'border-green-600 hover:bg-green-100'
                    }`}
                  >
                    <button
                      onClick={() => onOpenDetails(task)}
                      className="flex-1 text-left hover:bg-gray-100"
                    >
                      {task.name.length > 15 ? task.name.slice(0, 15) + '...' : task.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAdmin) {
                          onNonAdmin?.();
                          return;
                        }
                        onComplete(task);
                      }}
                      className="ml-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-400 text-gray-600 hover:border-green-600 hover:text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-300 transition-colors"
                      aria-label={`Mark ${task.name} complete`}
                      disabled={!isAdmin}
                    >
                      ✓
                    </button>
                  </div>
                ))}
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
  const [tasksState, setTasksState] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [view, setView] = useState<ViewMode>('calendar');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [addTaskError, setAddTaskError] = useState('');
  const [shake, setShake] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority | ''>('');
  const [taskDate, setTaskDate] = useState('');
  const [taskDepartment, setTaskDepartment] = useState<Department | ''>('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [showAssigneeSuggestions, setShowAssigneeSuggestions] = useState(false);
  const [formError, setFormError] = useState('');

  // Load tasks from API
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const apiTasks = await tasksApi.getTasks();
        // Map API tasks to our frontend format
        const mapped: Task[] = apiTasks.map((t) => ({
          id: t._id,
          name: t.name,
          date: new Date(t.dueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          priority: t.priority,
          assignee: t.assignee,
          department: t.department,
          status: t.status,
          description: t.description || undefined,
          completedAt: t.completedAt
            ? new Date(t.completedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : undefined,
        }));
        setTasksState(mapped);
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  const assigneeMatches = useMemo(() => {
    const query = taskAssignee.trim().toLowerCase();
    if (query.length < 1) return [] as UserOption[];
    return mockUsers.filter((u) =>
      `${u.name} ${u.email}`.toLowerCase().includes(query)
    );
  }, [taskAssignee]);

  const filteredTasks = useMemo(
    () =>
      tasksState.filter((task) => {
        const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
        const deptMatch = departmentFilter === 'all' || task.department === departmentFilter;
        const isActive = task.status !== 'Completed';
        return priorityMatch && deptMatch && isActive;
      }),
    [priorityFilter, departmentFilter, tasksState]
  );

  const completedTasks = useMemo(
    () => tasksState.filter((task) => task.status === 'Completed'),
    [tasksState]
  );

  const priorityWeight: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

  const sortedTasks = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const arr = [...filteredTasks];
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'assignee':
          return a.assignee.localeCompare(b.assignee) * dir;
        case 'department':
          return a.department.localeCompare(b.department) * dir;
        case 'status':
          return a.status.localeCompare(b.status) * dir;
        case 'priority':
          return (priorityWeight[a.priority] - priorityWeight[b.priority]) * dir;
        case 'date': {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          return (timeA - timeB) * dir;
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [filteredTasks, sortDir, sortKey, priorityWeight]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const priorityColors = {
    high: 'border-red-600 text-red-600',
    medium: 'border-orange-500 text-orange-500',
    low: 'border-green-600 text-green-600',
    all: '',
  } as const;

  const handleAddTaskClick = () => {
    if (user?.role === 'admin') {
      setShowAddModal(true);
      setAddTaskError('');
      return;
    }

    setAddTaskError('Only admins can add tasks.');
    setShake(true);

    window.setTimeout(() => setShake(false), 450);
    window.setTimeout(() => setAddTaskError(''), 2400);
  };

  const handleAddTaskSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!taskName.trim() || !taskPriority || !taskDate || !taskDepartment) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const parsedDate = new Date(taskDate);
    if (Number.isNaN(parsedDate.getTime())) {
      setFormError('Please provide a valid due date.');
      return;
    }

    try {
      const newTask = await tasksApi.createTask({
        name: taskName.trim(),
        description: taskDescription.trim() || undefined,
        priority: taskPriority,
        department: taskDepartment,
        assignee: taskAssignee.trim() || undefined,
        dueDate: parsedDate.toISOString(),
      });

      const formattedDate = new Date(newTask.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const mappedTask: Task = {
        id: newTask._id,
        name: newTask.name,
        date: formattedDate,
        priority: newTask.priority,
        assignee: newTask.assignee,
        department: newTask.department,
        status: newTask.status,
        description: newTask.description || undefined,
      };

      setTasksState((prev) => [...prev, mappedTask]);
      setShowAddModal(false);
      setTaskName('');
      setTaskPriority('');
      setTaskDate('');
      setTaskDepartment('');
      setTaskDescription('');
      setTaskAssignee('');
      setFormError('');
    } catch (err) {
      console.error('Failed to create task:', err);
      setFormError('Failed to create task. Please try again.');
    }
  };

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [completeError, setCompleteError] = useState('');
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [taskToRestore, setTaskToRestore] = useState<Task | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const handleMarkComplete = (task: Task) => {
    if (user?.role !== 'admin') return;
    setTaskToComplete(task);
    setShowCompleteModal(true);
  };

  const handleNonAdminAttempt = () => {
    setCompleteError('Only admins can mark tasks complete.');
    window.setTimeout(() => setCompleteError(''), 2200);
  };

  const confirmComplete = async () => {
    if (!taskToComplete) return;

    try {
      await tasksApi.updateTask(taskToComplete.id, { status: 'Completed' });

      const completedDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      setTasksState((prev) =>
        prev.map((t) =>
          t.id === taskToComplete.id
            ? { ...t, status: 'Completed' as const, completedAt: completedDate }
            : t
        )
      );
      setTaskToComplete(null);
      setShowCompleteModal(false);
    } catch (err) {
      console.error('Failed to complete task:', err);
      setCompleteError('Failed to mark task as complete. Please try again.');
      window.setTimeout(() => setCompleteError(''), 2200);
    }
  };

  const handleMarkIncomplete = (task: Task) => {
    if (user?.role !== 'admin') return;
    setTaskToRestore(task);
    setShowIncompleteModal(true);
  };

  const confirmRestore = async () => {
    if (!taskToRestore) return;

    try {
      await tasksApi.updateTask(taskToRestore.id, { status: 'Not Started' });

      setTasksState((prev) =>
        prev.map((t) =>
          t.id === taskToRestore.id
            ? { ...t, status: 'Not Started' as const, completedAt: undefined }
            : t
        )
      );
      setTaskToRestore(null);
      setShowIncompleteModal(false);
    } catch (err) {
      console.error('Failed to restore task:', err);
      setCompleteError('Failed to restore task. Please try again.');
      window.setTimeout(() => setCompleteError(''), 2200);
    }
  };

  const handleDeleteTask = (task: Task) => {
    if (user?.role !== 'admin') return;
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
      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b-2 border-gray-800 pb-4">
        <h1 className="text-3xl">Calendar & Tasks</h1>
        <div className="flex gap-3">
          <Button
            variant={view === 'table' ? 'primary' : 'outline'}
            onClick={() => setView('table')}
          >
            Table View
          </Button>
          <Button
            variant={view === 'calendar' ? 'primary' : 'outline'}
            onClick={() => setView('calendar')}
          >
            Calendar View
          </Button>
          <Button
            variant={view === 'completed' ? 'primary' : 'outline'}
            onClick={() => setView('completed')}
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Filters - Combined on one row */}
      <div className="mb-6 flex gap-6 rounded-lg border-2 border-gray-500 bg-gray-50 p-5">
        {/* Priority Filter */}
        <div className="flex flex-1 items-center gap-4">
          <div className="border-r-2 border-gray-400 pr-4 text-base font-bold">Filter by Priority:</div>
          <div className="flex flex-wrap gap-2">
            {priorities.map((opt) => {
              const isActive = priorityFilter === opt;
              let borderColor = 'border-gray-500';
              let bgColor = isActive ? 'bg-gray-200' : 'bg-white hover:bg-gray-100';
              let textColor = '';

              if (opt === 'high') {
                borderColor = 'border-red-600';
                bgColor = isActive ? 'bg-red-100' : 'bg-white hover:bg-red-50';
                textColor = isActive ? 'text-red-700' : 'text-red-600';
              } else if (opt === 'medium') {
                borderColor = 'border-orange-500';
                bgColor = isActive ? 'bg-orange-100' : 'bg-white hover:bg-orange-50';
                textColor = isActive ? 'text-orange-700' : 'text-orange-600';
              } else if (opt === 'low') {
                borderColor = 'border-green-600';
                bgColor = isActive ? 'bg-green-100' : 'bg-white hover:bg-green-50';
                textColor = isActive ? 'text-green-700' : 'text-green-600';
              }

              return (
                <button
                  key={opt}
                  onClick={() => setPriorityFilter(opt)}
                  className={`cursor-pointer rounded-md border-2 px-3 py-1 text-sm transition-colors ${borderColor} ${bgColor} ${textColor} ${isActive ? 'font-bold' : ''}`}
                >
                  {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Department Filter */}
        <div className="flex flex-1 items-center gap-4">
          <div className="border-r-2 border-gray-400 pr-4 text-base font-bold">Filter by Department:</div>
          <div className="flex flex-wrap gap-2">
            {departments.map((opt) => {
              const isActive = departmentFilter === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setDepartmentFilter(opt)}
                  className={`cursor-pointer rounded-md border-2 px-3 py-1 text-sm transition-colors ${
                    isActive
                      ? 'border-gray-500 bg-gray-200 font-bold'
                      : 'border-gray-500 bg-white hover:bg-gray-100'
                  }`}
                >
                  {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1).replace('-', ' ')}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Views - Scrollable Container */}
      <div className="flex-1 overflow-y-auto">
        {view === 'table' ? (
        <TableView
          filteredTasks={sortedTasks}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          isAdmin={user?.role === 'admin'}
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
          isAdmin={user?.role === 'admin'}
          onComplete={handleMarkComplete}
          onNonAdmin={handleNonAdminAttempt}
          onOpenDetails={(task) => {
            setSelectedTask(task);
            setShowTaskModal(true);
          }}
        />
      ) : (
        <TableView
          filteredTasks={completedTasks}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          isAdmin={user?.role === 'admin'}
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
        className={`fixed bottom-12 right-12 flex items-center gap-3 rounded-full border-2 border-gray-900 bg-white px-7 py-3 text-lg font-bold text-gray-900 shadow-xl transition-all hover:scale-105 hover:-translate-y-1 hover:shadow-2xl animate-pulse-soft ${
          shake ? 'animate-shake' : ''
        }`}
        aria-live="polite"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-900 bg-blue-600 text-2xl text-white">+</span>
        <span className="pr-1">Add Task</span>
      </button>
      {addTaskError && (
        <div className="fixed bottom-28 right-12 rounded-md border-2 border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-lg">
          {addTaskError}
        </div>
      )}
      {completeError && (
        <div className="fixed bottom-40 right-12 rounded-md border-2 border-yellow-500 bg-white px-4 py-2 text-sm font-semibold text-yellow-700 shadow-lg">
          {completeError}
        </div>
      )}

      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="animate-modal-in w-full max-w-xl rounded-xl border-2 border-gray-900 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Task Details</h3>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                }}
                className="rounded-md border-2 border-gray-400 px-2 py-1 text-sm font-semibold hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="font-semibold">Task Name</div>
                  <div>{selectedTask.name}</div>
                </div>
                <div>
                  <div className="font-semibold">{selectedTask.status === 'Completed' ? 'Completion Date' : 'Due Date'}</div>
                  <div>{selectedTask.status === 'Completed' ? selectedTask.completedAt ?? selectedTask.date : selectedTask.date}</div>
                </div>
                <div>
                  <div className="font-semibold">Priority</div>
                  <div>
                    <Badge variant={selectedTask.priority}>{selectedTask.priority.toUpperCase()}</Badge>
                  </div>
                </div>
                <div>
                  <div className="font-semibold">Department</div>
                  <div className="capitalize">{selectedTask.department.replace('-', ' ')}</div>
                </div>
                <div>
                  <div className="font-semibold">Assigned To</div>
                  <div>{selectedTask.assignee}</div>
                </div>
                <div>
                  <div className="font-semibold">Status</div>
                  <div>{selectedTask.status}</div>
                </div>
              </div>
              {selectedTask.description && (
                <div>
                  <div className="mb-1 font-semibold">Description</div>
                  <div className="whitespace-pre-wrap break-words text-gray-700">
                    {selectedTask.description}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              {user?.role === 'admin' && (
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    handleDeleteTask(selectedTask);
                  }}
                  className="mr-auto rounded-md border-2 border-red-600 bg-red-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-red-700"
                >
                  Delete Task
                </button>
              )}
              {user?.role === 'admin' && selectedTask.status !== 'Completed' && (
                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    setTaskToComplete(selectedTask);
                    setShowCompleteModal(true);
                  }}
                  className="rounded-md border-2 border-gray-900 bg-green-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-green-700"
                >
                  Mark Complete
                </button>
              )}
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                }}
                className="rounded-md border-2 border-gray-400 px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="animate-modal-in w-full max-w-lg rounded-xl border-2 border-gray-900 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Add New Task</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-md border-2 border-gray-400 px-2 py-1 text-sm font-semibold hover:bg-gray-100"
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
                  className="w-full rounded-md border-2 border-gray-400 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  placeholder="Enter task name"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold">Priority *</label>
                  <div className="flex gap-2">
                    {(['high', 'medium', 'low'] as Priority[]).map((p) => {
                      const isActive = taskPriority === p;
                      const styles =
                        p === 'high'
                          ? 'border-red-600 text-red-700 hover:bg-red-50'
                          : p === 'medium'
                            ? 'border-orange-500 text-orange-700 hover:bg-orange-50'
                            : 'border-green-600 text-green-700 hover:bg-green-50';
                      const activeBg =
                        p === 'high'
                          ? 'bg-red-100'
                          : p === 'medium'
                            ? 'bg-orange-100'
                            : 'bg-green-100';
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setTaskPriority(p)}
                          className={`flex-1 rounded-md border-2 px-3 py-2 text-sm font-semibold transition-colors ${styles} ${
                            isActive ? `${activeBg} ring-2 ring-offset-1 ring-gray-700` : 'bg-white'
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
                  <input
                    type="date"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    className="w-full rounded-md border-2 border-gray-400 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Department *</label>
                <select
                  value={taskDepartment}
                  onChange={(e) => setTaskDepartment(e.target.value as Department | '')}
                  className="w-full rounded-md border-2 border-gray-400 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                >
                  <option value="">Select department</option>
                  {departments
                    .filter((d) => d !== 'all')
                    .map((dept) => (
                      <option key={dept} value={dept}>
                        {dept.charAt(0).toUpperCase() + dept.slice(1).replace('-', ' ')}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Assign To (optional)</label>
                <div className="relative">
                  <input
                    type="search"
                    value={taskAssignee}
                    onChange={(e) => {
                      setTaskAssignee(e.target.value);
                      setShowAssigneeSuggestions(true);
                    }}
                    onFocus={() => {
                      if (taskAssignee.trim().length >= 1) setShowAssigneeSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowAssigneeSuggestions(false), 120)}
                    className="w-full rounded-md border-2 border-gray-400 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                    placeholder="Search or type a registered user"
                  />
                  {assigneeMatches.length > 0 && showAssigneeSuggestions && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border-2 border-gray-300 bg-white shadow-lg">
                      {assigneeMatches.map((user) => (
                        <button
                          key={user.email}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setTaskAssignee(user.name);
                            setShowAssigneeSuggestions(false);
                          }}
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-100"
                        >
                          <span className="font-semibold">{user.name}</span>
                          <span className="text-xs text-gray-600">{user.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">Leave blank to keep Unassigned.</p>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-semibold">Description (optional)</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="min-h-[96px] w-full rounded-md border-2 border-gray-400 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
                  placeholder="Add more context, requirements, or links"
                />
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
                  }}
                  className="rounded-md border-2 border-gray-400 px-4 py-2 text-sm font-semibold hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md border-2 border-gray-900 bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showCompleteModal && taskToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="animate-modal-in w-full max-w-md rounded-xl border-2 border-gray-900 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Confirm Completion</h3>
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setTaskToComplete(null);
                }}
                className="rounded-md border-2 border-gray-400 px-2 py-1 text-sm font-semibold hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <p className="mb-4 text-sm">
              Are you sure you want to mark <span className="font-semibold">{taskToComplete.name}</span> as complete?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setTaskToComplete(null);
                }}
                className="rounded-md border-2 border-gray-400 px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmComplete}
                className="rounded-md border-2 border-gray-900 bg-green-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-green-700"
              >
                Yes, mark complete
              </button>
            </div>
          </div>
        </div>
      )}

      {showIncompleteModal && taskToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="animate-modal-in w-full max-w-md rounded-xl border-2 border-gray-900 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Revert Completion</h3>
              <button
                onClick={() => {
                  setShowIncompleteModal(false);
                  setTaskToRestore(null);
                }}
                className="rounded-md border-2 border-gray-400 px-2 py-1 text-sm font-semibold hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <p className="mb-4 text-sm">
              Are you sure you want to revert the completion of <span className="font-semibold">{taskToRestore.name}</span>?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowIncompleteModal(false);
                  setTaskToRestore(null);
                }}
                className="rounded-md border-2 border-gray-400 px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="rounded-md border-2 border-gray-900 bg-red-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-red-700"
              >
                Yes, revert completion
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="animate-modal-in w-full max-w-md rounded-xl border-2 border-gray-900 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Delete Task</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTaskToDelete(null);
                }}
                className="rounded-md border-2 border-gray-400 px-2 py-1 text-sm font-semibold hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            <p className="mb-4 text-sm">
              Are you sure you want to permanently delete <span className="font-semibold">{taskToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTaskToDelete(null);
                }}
                className="rounded-md border-2 border-gray-400 px-4 py-2 text-sm font-semibold hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-md border-2 border-red-600 bg-red-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-red-700"
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
