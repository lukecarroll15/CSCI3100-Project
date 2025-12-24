import { Outlet, useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { useAuth } from '../../auth/useAuth';

export default function AppLayout({ sidebarExtra }: { sidebarExtra?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-[100dvh] min-h-screen flex-col overflow-hidden bg-gray-100">
      <TopBar
        userName={user?.displayName || user?.email || 'User'}
        userRole={(user?.role as 'user' | 'admin') ?? 'user'}
        companyName={(import.meta.env.VITE_APP_NAME as string | undefined) ?? 'TaskFlow'}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar>{sidebarExtra}</Sidebar>
        <main className="flex-1 overflow-y-auto bg-white px-10 pb-5 pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
