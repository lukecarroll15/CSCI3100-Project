import { NavLink } from 'react-router-dom';
import AdminPanel from './AdminPanel';
import { IconCalendar, IconCanvas, IconFolder, IconHome } from '../ui/Icons';

const navItems = [
  { path: '/', label: 'Dashboard', icon: <IconHome className="h-5 w-5" /> },
  { path: '/calendar', label: 'Calendar', icon: <IconCalendar className="h-5 w-5" /> },
  { path: '/files', label: 'Files', icon: <IconFolder className="h-5 w-5" /> },
  { path: '/canvas', label: 'Canvas', icon: <IconCanvas className="h-5 w-5" /> },
];

export default function Sidebar({
  children,
  compact = false,
}: {
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <aside
      className={`flex w-64 flex-col border-r-2 border-gray-800 bg-gray-50 ${
        compact ? 'pt-5' : 'pt-8'
      }`}
    >
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `mx-5 block cursor-pointer rounded-xl border-2 px-6 py-3 text-base text-[#07000b] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200 ${
                isActive
                  ? 'border-[#07000b] bg-[#07000b] text-white shadow-sm'
                  : 'border-neutral-200 bg-white hover:-translate-y-0.5 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm'
              }`
            }
          >
            <span className="inline-flex items-center gap-2">
              {item.icon}
              <span>{item.label}</span>
            </span>
          </NavLink>
        ))}
      </nav>
      <AdminPanel />
      {children}
    </aside>
  );
}
