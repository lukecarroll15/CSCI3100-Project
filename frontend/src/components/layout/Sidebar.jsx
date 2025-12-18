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
    <aside className="w-64 bg-gray-50 border-r-2 border-gray-800 pt-8 flex flex-col">
      <nav className="flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `block mx-5 my-2 px-6 py-3 border-2 rounded-lg text-base transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white border-gray-500 hover:bg-gray-200'
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
