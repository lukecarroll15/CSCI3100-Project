import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/ui/Badge';
import { useAuth } from '../auth/useAuth';

const SEARCH_STORAGE_KEY = 'dashboard_search';

type Priority = 'high' | 'medium' | 'low';
type FilterType = 'all' | 'tasks' | 'files';

type ActivityItemData = {
  time: string;
  icon: string;
  title: string;
  description: string;
  priority?: Priority;
  meta: string[];
};

type ActivityGroupData = {
  date: string;
  items: ActivityItemData[];
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getActivityData(): { today: ActivityGroupData; yesterday: ActivityGroupData } {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const tomorrowDate = new Date(today);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  return {
    today: {
      date: `Today - ${formatDate(today)}`,
      items: [
        {
          time: '2:45 PM',
          icon: '📅',
          title: 'Submit Final Tender',
          description: 'New task added to calendar',
          priority: 'high',
          meta: ['Added by Sarah Chen', `Due: ${formatShortDate(threeDaysFromNow)}`],
        },
        {
          time: '1:30 PM',
          icon: '📁',
          title: 'Q4_Budget_Report.xlsx',
          description: 'File uploaded to shared folder',
          meta: ['Uploaded by Michael Torres', 'Finance Folder'],
        },
        {
          time: '9:00 AM',
          icon: '📅',
          title: 'Team Standup Meeting',
          description: 'Task marked as complete',
          priority: 'medium',
          meta: ['Completed by John Smith'],
        },
      ],
    },
    yesterday: {
      date: `Yesterday - ${formatDate(yesterday)}`,
      items: [
        {
          time: '4:20 PM',
          icon: '📁',
          title: 'Project_Proposal_v3.pdf',
          description: 'File modified',
          meta: ['Modified by Sarah Chen', 'Projects Folder'],
        },
        {
          time: '2:10 PM',
          icon: '📅',
          title: 'Review client feedback',
          description: 'Task updated - deadline extended',
          priority: 'low',
          meta: ['Updated by Emma Wilson', `New due: ${formatShortDate(tomorrowDate)}`],
        },
      ],
    },
  };
}

const activityData = getActivityData();

function getRouteForIcon(icon: string): string {
  switch (icon) {
    case '📅':
      return '/calendar';
    case '📁':
      return '/files';
    default:
      return '/';
  }
}

function ActivityItem({
  time,
  icon,
  title,
  description,
  priority,
  meta,
  onNavigate,
}: ActivityItemData & { onNavigate: (path: string) => void }) {
  const handleClick = () => {
    onNavigate(getRouteForIcon(icon));
  };

  return (
    <div
      onClick={handleClick}
      className="mb-4 flex cursor-pointer gap-5 rounded-lg border-2 border-gray-500 bg-white p-5 transition-colors hover:border-gray-800 hover:bg-gray-50"
    >
      <div className="min-w-20 border-r-2 border-gray-300 pr-5 text-sm text-gray-500">{time}</div>
      <div className="flex h-10 min-w-10 items-center justify-center rounded-lg border-2 border-gray-500 bg-gray-100 text-sm">
        {icon}
      </div>
      <div className="flex-1">
        <div className="mb-2 text-base font-bold">{title}</div>
        <div className="mb-2 text-sm text-gray-500">{description}</div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
          {priority && <Badge variant={priority}>{priority.toUpperCase()} PRIORITY</Badge>}
          {meta.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityGroup({
  date,
  items,
  onNavigate,
}: ActivityGroupData & { onNavigate: (path: string) => void }) {
  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="mb-5 rounded-lg border-2 border-gray-800 bg-gray-50 p-3 text-xl font-bold">
        {date}
      </div>
      {items.map((item, i) => (
        <ActivityItem key={i} {...item} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

const filterConfig: { type: FilterType; label: string; icon: string }[] = [
  { type: 'all', label: 'All', icon: '📋' },
  { type: 'tasks', label: 'Tasks', icon: '📅' },
  { type: 'files', label: 'Files', icon: '📁' },
];

function getIconsForFilter(filter: FilterType): string[] {
  switch (filter) {
    case 'tasks':
      return ['📅'];
    case 'files':
      return ['📁'];
    default:
      return [];
  }
}

function filterItems(items: ActivityItemData[], filter: FilterType): ActivityItemData[] {
  if (filter === 'all') return items;
  const icons = getIconsForFilter(filter);
  return items.filter((item) => icons.includes(item.icon));
}

function searchItems(items: ActivityItemData[], query: string): ActivityItemData[] {
  if (!query.trim()) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.meta.some((m) => m.toLowerCase().includes(lowerQuery))
  );
}

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative mb-6">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
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

type FilterButtonsProps = {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
};

function FilterButtons({ activeFilter, onFilterChange }: FilterButtonsProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function WelcomeHeader({ displayName }: { displayName: string }) {
  const tasksDueToday = activityData.today.items.filter((item) => item.icon === '📅').length;
  const pendingFiles = activityData.today.items.filter((item) => item.icon === '📁').length;

  return (
    <div className="mb-8 rounded-lg border-2 border-gray-800 bg-gradient-to-r from-gray-50 to-white p-6">
      <h1 className="mb-2 text-2xl font-bold">
        {getGreeting()}, {displayName}!
      </h1>
      <p className="mb-4 text-gray-600">Here&apos;s what&apos;s happening today</p>
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2">
          <span className="text-lg">📅</span>
          <span className="font-medium">{tasksDueToday} tasks</span>
          <span className="text-gray-500">due today</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2">
          <span className="text-lg">📁</span>
          <span className="font-medium">{pendingFiles} files</span>
          <span className="text-gray-500">updated</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.displayName ?? 'there';
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState(() => {
    return localStorage.getItem(SEARCH_STORAGE_KEY) ?? '';
  });

  useEffect(() => {
    localStorage.setItem(SEARCH_STORAGE_KEY, search);
  }, [search]);

  const filteredToday = {
    ...activityData.today,
    items: searchItems(filterItems(activityData.today.items, filter), search),
  };
  const filteredYesterday = {
    ...activityData.yesterday,
    items: searchItems(filterItems(activityData.yesterday.items, filter), search),
  };

  const hasResults = filteredToday.items.length > 0 || filteredYesterday.items.length > 0;

  return (
    <div>
      <WelcomeHeader displayName={displayName} />
      <h2 className="mb-6 border-b-2 border-gray-800 pb-4 text-2xl font-bold">Activity Feed</h2>
      <SearchBar value={search} onChange={setSearch} />
      <FilterButtons activeFilter={filter} onFilterChange={setFilter} />
      {hasResults ? (
        <>
          <ActivityGroup {...filteredToday} onNavigate={navigate} />
          <ActivityGroup {...filteredYesterday} onNavigate={navigate} />
        </>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
          No {filter === 'all' ? '' : filter + ' '}activity found
          {search && ` matching "${search}"`}
        </div>
      )}
    </div>
  );
}
