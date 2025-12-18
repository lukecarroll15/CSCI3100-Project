import { Outlet, useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';

export default function AppLayout({ sidebarExtra }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    // TODO: Implement actual logout logic
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <TopBar onLogout={handleLogout} />
      <div className="flex flex-1">
        <Sidebar>{sidebarExtra}</Sidebar>
        <main className="flex-1 overflow-y-auto bg-white p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
