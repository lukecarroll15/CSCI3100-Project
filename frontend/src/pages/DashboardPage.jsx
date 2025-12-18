import Badge from '../components/ui/Badge';

const activityData = {
  today: {
    date: 'Today - November 17, 2025',
    items: [
      {
        time: '2:45 PM',
        icon: '📅',
        title: 'Submit Final Tender',
        description: 'New task added to calendar',
        priority: 'high',
        meta: ['Added by Sarah Chen', 'Due: Nov 20, 2025'],
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
    date: 'Yesterday - November 16, 2025',
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
        meta: ['Updated by Emma Wilson', 'New due: Nov 18, 2025'],
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

function ActivityItem({ time, icon, title, description, priority, meta }) {
  const handleClick = () => {
    if (icon === '📅') alert('Would navigate to Calendar task');
    else if (icon === '📁') alert('Would navigate to File');
    else if (icon === '💬') alert('Would navigate to Discussion');
    else if (icon === '✉️') alert('Would navigate to Messages');
  };

  return (
    <div
      onClick={handleClick}
      className="flex gap-5 p-5 mb-4 border-2 border-gray-500 rounded-lg cursor-pointer bg-white hover:bg-gray-50 hover:border-gray-800 transition-colors"
    >
      <div className="min-w-20 text-sm text-gray-500 border-r-2 border-gray-300 pr-5">
        {time}
      </div>
      <div className="min-w-10 h-10 border-2 border-gray-500 rounded-lg flex items-center justify-center text-sm bg-gray-100">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-base font-bold mb-2">{title}</div>
        <div className="text-sm text-gray-500 mb-2">{description}</div>
        <div className="text-xs text-gray-400 flex gap-4 items-center flex-wrap">
          {priority && <Badge variant={priority}>{priority.toUpperCase()} PRIORITY</Badge>}
          {meta.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityGroup({ date, items }) {
  return (
    <div className="mb-10">
      <div className="text-xl font-bold mb-5 p-3 border-2 border-gray-800 rounded-lg bg-gray-50">
        {date}
      </div>
      {items.map((item, i) => (
        <ActivityItem key={i} {...item} />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl mb-8 pb-4 border-b-2 border-gray-800">Activity Feed</h1>
      <ActivityGroup {...activityData.today} />
      <ActivityGroup {...activityData.yesterday} />
    </div>
  );
}
