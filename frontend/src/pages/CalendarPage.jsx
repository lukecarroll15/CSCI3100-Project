import { useState } from 'react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

const tasks = [
  { name: 'Submit Final Tender', date: 'Nov 20, 2025', priority: 'high', assignee: 'Sarah Chen', department: 'sales', status: 'In Progress', day: 20 },
  { name: 'Complete Security Audit', date: 'Nov 18, 2025', priority: 'high', assignee: 'David Park', department: 'it', status: 'Not Started', day: 18 },
  { name: 'Review Q4 Budget', date: 'Nov 22, 2025', priority: 'medium', assignee: 'Michael Torres', department: 'finance', status: 'In Progress', day: 22 },
  { name: 'Update Marketing Materials', date: 'Nov 25, 2025', priority: 'medium', assignee: 'Emma Wilson', department: 'marketing', status: 'Not Started', day: 25 },
  { name: 'Review client feedback', date: 'Nov 18, 2025', priority: 'low', assignee: 'John Smith', department: 'customer-service', status: 'In Progress', day: 18 },
  { name: 'Organize team building event', date: 'Dec 1, 2025', priority: 'low', assignee: 'Sarah Chen', department: 'hr', status: 'Not Started', day: null },
  { name: 'Deploy new software update', date: 'Nov 19, 2025', priority: 'high', assignee: 'David Park', department: 'it', status: 'In Progress', day: 19 },
  { name: 'Prepare client presentation', date: 'Nov 21, 2025', priority: 'medium', assignee: 'Emma Wilson', department: 'sales', status: 'Not Started', day: 21 },
];

const departments = ['all', 'sales', 'it', 'finance', 'marketing', 'hr', 'customer-service'];
const priorities = ['all', 'high', 'medium', 'low'];
const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function FilterSection({ label, options, active, onChange, colorMap }) {
  return (
    <div className="flex gap-4 mb-6 p-5 border-2 border-gray-500 rounded-lg bg-gray-50 items-center flex-wrap">
      <div className="text-base font-bold border-r-2 border-gray-400 pr-4">{label}</div>
      {options.map((opt) => {
        const isActive = active === opt;
        const colorClass = colorMap?.[opt] || '';
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-4 py-2 border-2 rounded-md text-sm cursor-pointer transition-colors ${
              isActive
                ? colorClass || 'bg-gray-200 border-gray-500 font-bold'
                : 'bg-white border-gray-500 hover:bg-gray-100'
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
    <table className="w-full border-collapse border-2 border-gray-800 rounded-lg overflow-hidden">
      <thead className="bg-gray-100">
        <tr>
          {['Task Name', 'Due Date', 'Priority', 'Assigned To', 'Department', 'Status'].map((h) => (
            <th key={h} className="p-4 text-left border-2 border-gray-500 text-base font-bold">
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
            className="hover:bg-gray-50 cursor-pointer"
          >
            <td className="p-4 border-2 border-gray-300 text-sm">{task.name}</td>
            <td className="p-4 border-2 border-gray-300 text-sm">{task.date}</td>
            <td className="p-4 border-2 border-gray-300 text-sm">
              <Badge variant={task.priority}>{task.priority.toUpperCase()}</Badge>
            </td>
            <td className="p-4 border-2 border-gray-300 text-sm">{task.assignee}</td>
            <td className="p-4 border-2 border-gray-300 text-sm capitalize">{task.department.replace('-', ' ')}</td>
            <td className="p-4 border-2 border-gray-300 text-sm">{task.status}</td>
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
    <div className="grid grid-cols-7 gap-3 border-2 border-gray-800 rounded-lg p-5 bg-gray-50">
      {dayHeaders.map((d) => (
        <div key={d} className="text-center font-bold p-3 border-2 border-gray-500 rounded-md bg-gray-200">
          {d}
        </div>
      ))}
      {calendarDays.map((day) => {
        const dayTasks = getTasksForDay(day);
        return (
          <div key={day} className="min-h-28 p-3 border-2 border-gray-500 rounded-lg bg-white">
            <div className="font-bold mb-2 pb-2 border-b-2 border-gray-300">{day}</div>
            {dayTasks.map((task, i) => (
              <div
                key={i}
                onClick={() => alert('Would open task details')}
                className={`p-2 mb-1 border-2 rounded text-xs cursor-pointer hover:bg-gray-100 ${
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
      <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-gray-800">
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
        className="fixed bottom-12 right-12 w-14 h-14 border-2 border-gray-800 rounded-full bg-white text-3xl cursor-pointer flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
      >
        +
      </button>
    </div>
  );
}
