import { useMemo, useState } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

type Priority = 'high' | 'medium' | 'low';
type Department = 'sales' | 'it' | 'finance' | 'marketing' | 'hr' | 'customer-service';
type ViewMode = 'calendar' | 'table';

type Task = {
  name: string;
  date: string;
  priority: Priority;
  assignee: string;
  department: Department;
  status: 'In Progress' | 'Not Started';
  day: number | null;
};

const tasks: Task[] = [
  {
    name: 'Submit Final Tender',
    date: 'Nov 20, 2025',
    priority: 'high',
    assignee: 'Sarah Chen',
    department: 'sales',
    status: 'In Progress',
    day: 20,
  },
  {
    name: 'Complete Security Audit',
    date: 'Nov 18, 2025',
    priority: 'high',
    assignee: 'David Park',
    department: 'it',
    status: 'Not Started',
    day: 18,
  },
  {
    name: 'Review Q4 Budget',
    date: 'Nov 22, 2025',
    priority: 'medium',
    assignee: 'Michael Torres',
    department: 'finance',
    status: 'In Progress',
    day: 22,
  },
  {
    name: 'Update Marketing Materials',
    date: 'Nov 25, 2025',
    priority: 'medium',
    assignee: 'Emma Wilson',
    department: 'marketing',
    status: 'Not Started',
    day: 25,
  },
  {
    name: 'Review client feedback',
    date: 'Nov 18, 2025',
    priority: 'low',
    assignee: 'John Smith',
    department: 'customer-service',
    status: 'In Progress',
    day: 18,
  },
  {
    name: 'Organize team building event',
    date: 'Dec 1, 2025',
    priority: 'low',
    assignee: 'Sarah Chen',
    department: 'hr',
    status: 'Not Started',
    day: null,
  },
  {
    name: 'Deploy new software update',
    date: 'Nov 19, 2025',
    priority: 'high',
    assignee: 'David Park',
    department: 'it',
    status: 'In Progress',
    day: 19,
  },
  {
    name: 'Prepare client presentation',
    date: 'Nov 21, 2025',
    priority: 'medium',
    assignee: 'Emma Wilson',
    department: 'sales',
    status: 'Not Started',
    day: 21,
  },
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
}: {
  filteredTasks: Task[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const headers: Array<{ key: SortKey; label: string }> = [
    { key: 'name', label: 'Task Name' },
    { key: 'date', label: 'Due Date' },
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
        </tr>
      </thead>
      <tbody>
        {filteredTasks.map((task, i) => (
          <tr
            key={i}
            onClick={() => alert('Would open task details')}
            className="cursor-pointer hover:bg-gray-50"
          >
            <td className="border-2 border-gray-300 p-4 text-sm">{task.name}</td>
            <td className="border-2 border-gray-300 p-4 text-sm">{task.date}</td>
            <td className="border-2 border-gray-300 p-4 text-sm">
              <Badge variant={task.priority}>{task.priority.toUpperCase()}</Badge>
            </td>
            <td className="border-2 border-gray-300 p-4 text-sm">{task.assignee}</td>
            <td className="border-2 border-gray-300 p-4 text-sm capitalize">
              {task.department.replace('-', ' ')}
            </td>
            <td className="border-2 border-gray-300 p-4 text-sm">{task.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CalendarView({ filteredTasks }: { filteredTasks: Task[] }) {
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

  const getTasksForDay = (day: number) => filteredTasks.filter((t) => t.day === day);

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
                    onClick={() => alert('Would open task details')}
                    className={`mb-1 cursor-pointer rounded border-2 p-2 text-xs hover:bg-gray-100 ${
                      task.priority === 'high'
                        ? 'border-red-600'
                        : task.priority === 'medium'
                          ? 'border-orange-500'
                          : 'border-green-600'
                    }`}
                  >
                    {task.name.length > 15 ? task.name.slice(0, 15) + '...' : task.name}
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
  const [view, setView] = useState<ViewMode>('calendar');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
        const deptMatch = departmentFilter === 'all' || task.department === departmentFilter;
        return priorityMatch && deptMatch;
      }),
    [priorityFilter, departmentFilter]
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

  return (
    <div>
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

      {/* Views */}
      {view === 'table' ? (
        <TableView
          filteredTasks={sortedTasks}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      ) : (
        <CalendarView filteredTasks={filteredTasks} />
      )}

      {/* Add Task Button */}
      <button
        onClick={() => alert('Would open Add New Task dialog')}
        className="animate-pulse-soft fixed bottom-12 right-12 flex items-center gap-3 rounded-full border-2 border-gray-900 bg-white px-7 py-3 text-lg font-bold text-gray-900 shadow-xl transition-all hover:scale-105 hover:-translate-y-1 hover:shadow-2xl"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-900 bg-blue-600 text-2xl text-white">+</span>
        <span className="pr-1">Add Task</span>
      </button>
    </div>
  );
}
