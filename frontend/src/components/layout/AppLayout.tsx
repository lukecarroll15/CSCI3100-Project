import { Outlet, useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { useAuth } from '../../auth/useAuth';
import { useTeams } from '../../teams/useTeams';

export default function AppLayout({ sidebarExtra }: { sidebarExtra?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { activeTeam, activeTeamId, teams, loading, setActiveTeamId, refreshTeams } = useTeams();
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
        userAdminLevel={user?.adminLevel ?? null}
        companyName={(import.meta.env.VITE_APP_NAME as string | undefined) ?? 'TaskFlow'}
        onLogout={handleLogout}
        teams={teams}
        activeTeamId={activeTeamId}
        activeTeamRole={activeTeam?.role ?? null}
        teamLoading={loading}
        onTeamChange={setActiveTeamId}
        onTeamsRefresh={refreshTeams}
      />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar>{sidebarExtra}</Sidebar>
        <main className="flex-1 overflow-y-auto bg-white px-10 pb-5 pt-8">
          {loading ? (
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
              Loading team workspace...
            </div>
          ) : teams.length === 0 ? (
            <div className="max-w-xl rounded-xl border-2 border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
              <p className="text-lg font-semibold text-gray-900">No team access yet</p>
              <p className="mt-2">
                Ask a team admin to invite you so you can see tasks and files.
              </p>
              {user?.role === 'admin' ? (
                <p className="mt-2 text-gray-600">
                  As a system admin, you can create a team and send invites from the Admin
                  Dashboard.
                </p>
              ) : null}
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
