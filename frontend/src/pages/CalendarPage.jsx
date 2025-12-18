import { useState } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const tasks = [
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

const departments = ['all', 'sales', 'it', 'finance', 'marketing', 'hr', 'customer-service'];
const priorities = ['all', 'high', 'medium', 'low'];
const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function FilterSection({ label, options, active, onChange, colorMap }) {
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

function TableView({ filteredTasks }) {
  return (
    <table className="w-full border-collapse overflow-hidden rounded-lg border-2 border-gray-800">
      <thead className="bg-gray-100">
        <tr>
          {['Task Name', 'Due Date', 'Priority', 'Assigned To', 'Department', 'Status'].map((h) => (
            <th key={h} className="border-2 border-gray-500 p-4 text-left text-base font-bold">
              {h}
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

function CalendarView({ filteredTasks }) {
  const calendarDays = [];
  for (let i = 10; i <= 30; i++) {
    calendarDays.push(i);
  }

  const getTasksForDay = (day) => filteredTasks.filter((t) => t.day === day);

  return (
    <div className="grid grid-cols-7 gap-3 rounded-lg border-2 border-gray-800 bg-gray-50 p-5">
      {dayHeaders.map((d) => (
        <div
          key={d}
          className="rounded-md border-2 border-gray-500 bg-gray-200 p-3 text-center font-bold"
        >
          {d}
        </div>
      ))}
      {calendarDays.map((day) => {
        const dayTasks = getTasksForDay(day);
        return (
          <div key={day} className="min-h-28 rounded-lg border-2 border-gray-500 bg-white p-3">
            <div className="mb-2 border-b-2 border-gray-300 pb-2 font-bold">{day}</div>
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
  );
}

export default function CalendarPage() {
  const [view, setView] = useState('calendar');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const filteredTasks = tasks.filter((task) => {
    const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
    const deptMatch = departmentFilter === 'all' || task.department === departmentFilter;
    return priorityMatch && deptMatch;
  });

  const priorityColors = {
    high: 'border-red-600 text-red-600',
    medium: 'border-orange-500 text-orange-500',
    low: 'border-green-600 text-green-600',
  };

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

      {/* Filters */}
      <FilterSection
        label="Filter by Priority:"
        options={priorities}
        active={priorityFilter}
        onChange={setPriorityFilter}
        colorMap={priorityColors}
      />
      <FilterSection
        label="Filter by Department:"
        options={departments}
        active={departmentFilter}
        onChange={setDepartmentFilter}
      />

      {/* Views */}
      {view === 'table' ? (
        <TableView filteredTasks={filteredTasks} />
      ) : (
        <CalendarView filteredTasks={filteredTasks} />
      )}

      {/* Add Task Button */}
      <button
        onClick={() => alert('Would open Add New Task dialog')}
        className="fixed bottom-12 right-12 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-gray-800 bg-white text-3xl shadow-lg transition-colors hover:bg-gray-100"
      >
        +
      </button>
    </div>
  );
}
