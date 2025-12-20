import Badge from '../components/ui/Badge';
import { useAuth } from '../auth/useAuth';

type Priority = 'high' | 'medium' | 'low';

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
          time: '11:15 AM',
          icon: '💬',
          title: 'New post in Marketing Channel',
          description: 'Discussion: Campaign ideas for product launch',
          meta: ['Posted by Emma Wilson', '5 replies'],
        },
        {
          time: '9:00 AM',
          icon: '📅',
          title: 'Team Standup Meeting',
          description: 'Task marked as complete',
          priority: 'medium',
          meta: ['Completed by John Smith'],
        },
        {
          time: '8:30 AM',
          icon: '✉️',
          title: 'New message from David Park',
          description: 'You have 3 unread messages',
          meta: ['Click to view messages'],
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
        {
          time: '10:00 AM',
          icon: '💬',
          title: 'New post in Engineering Channel',
          description: 'Discussion: Code review best practices',
          meta: ['Posted by David Park', '12 replies'],
        },
      ],
    },
  };
}

const activityData = getActivityData();

function ActivityItem({ time, icon, title, description, priority, meta }: ActivityItemData) {
  const handleClick = () => {
    if (icon === '📅') alert('Would navigate to Calendar task');
    else if (icon === '📁') alert('Would navigate to File');
    else if (icon === '💬') alert('Would navigate to Discussion');
    else if (icon === '✉️') alert('Would navigate to Messages');
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

function ActivityGroup({ date, items }: ActivityGroupData) {
  return (
    <div className="mb-10">
      <div className="mb-5 rounded-lg border-2 border-gray-800 bg-gray-50 p-3 text-xl font-bold">
        {date}
      </div>
      {items.map((item, i) => (
        <ActivityItem key={i} {...item} />
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
  const unreadMessages = 3;
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
          <span className="text-lg">✉️</span>
          <span className="font-medium">{unreadMessages} messages</span>
          <span className="text-gray-500">unread</span>
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
  const displayName = user?.displayName ?? 'there';

  return (
    <div>
      <WelcomeHeader displayName={displayName} />
      <h2 className="mb-6 border-b-2 border-gray-800 pb-4 text-2xl font-bold">Activity Feed</h2>
      <ActivityGroup {...activityData.today} />
      <ActivityGroup {...activityData.yesterday} />
    </div>
  );
}
