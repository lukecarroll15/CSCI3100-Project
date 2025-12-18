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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <TopBar onLogout={handleLogout} />
      <div className="flex flex-1">
        <Sidebar>{sidebarExtra}</Sidebar>
        <main className="flex-1 p-10 overflow-y-auto bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
