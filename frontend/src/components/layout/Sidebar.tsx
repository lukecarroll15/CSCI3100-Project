import { NavLink } from 'react-router-dom';
import AdminPanel from './AdminPanel';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '🏠' },
  { path: '/calendar', label: 'Calendar', icon: '📅' },
  { path: '/files', label: 'Files', icon: '📁' },
  { path: '/canvas', label: 'Canvas', icon: '🧩' },
];

export default function Sidebar({ children }: { children?: React.ReactNode }) {
  return (
    <aside className="flex w-64 flex-col border-r-2 border-gray-800 bg-gray-50 pt-8">
      <nav className="flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `mx-5 my-2 block rounded-lg border-2 px-6 py-3 text-base text-[#07000b] transition-colors ${
                isActive
                  ? 'border-[#07000b] bg-[#07000b] text-white'
                  : 'border-neutral-200 bg-white hover:bg-neutral-100'
              }`
            }
          >
            {item.icon} {item.label}
          </NavLink>
        ))}
      </nav>
      <AdminPanel />
      {children}
    </aside>
  );
}
