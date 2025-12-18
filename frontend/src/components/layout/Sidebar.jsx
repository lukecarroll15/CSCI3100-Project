import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '🏠' },
  { path: '/calendar', label: 'Calendar', icon: '📅' },
  { path: '/files', label: 'Files', icon: '📁' },
  { path: '/discussion', label: 'Discussion Board', icon: '💬' },
  { path: '/messages', label: 'Messages', icon: '✉️' },
];

export default function Sidebar({ children }) {
  return (
    <aside className="flex w-64 flex-col border-r-2 border-gray-800 bg-gray-50 pt-8">
      <nav className="flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `mx-5 my-2 block rounded-lg border-2 px-6 py-3 text-base transition-colors ${
                isActive
                  ? 'border-gray-800 bg-gray-800 text-white'
                  : 'border-gray-500 bg-white hover:bg-gray-200'
              }`
            }
          >
            {item.icon} {item.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </aside>
  );
}
