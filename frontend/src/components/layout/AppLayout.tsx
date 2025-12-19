import { Outlet, useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { useAuth } from '../../auth/useAuth';

export default function AppLayout({ sidebarExtra }: { sidebarExtra?: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100">
      <TopBar
        userName={user?.displayName || user?.email || 'User'}
        companyName={(import.meta.env.VITE_APP_NAME as string | undefined) ?? 'TaskFlow'}
        onLogout={handleLogout}
      />
      <div className="flex flex-1">
        <Sidebar>{sidebarExtra}</Sidebar>
        <main className="flex-1 overflow-y-auto bg-white p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
