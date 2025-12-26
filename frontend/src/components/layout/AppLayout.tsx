import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import { useAuth } from '../../auth/useAuth';
import { useTeams } from '../../teams/useTeams';
import { createTeam } from '../../api/teams';
import { ApiRequestError } from '../../api/client';

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.payload?.error?.message ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export default function AppLayout({ sidebarExtra }: { sidebarExtra?: React.ReactNode }) {
  const { user, logout, refreshMe } = useAuth();
  const { activeTeam, activeTeamId, teams, loading, setActiveTeamId, refreshTeams } = useTeams();
  const navigate = useNavigate();
  const [pendingTeamName, setPendingTeamName] = useState('');
  const [pendingTeamError, setPendingTeamError] = useState('');
  const [pendingTeamLoading, setPendingTeamLoading] = useState(false);
  const requiresTeamSetup = Boolean(user?.pendingTeamCreation);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleCreateTeam = async () => {
    const name = pendingTeamName.trim();
    if (name.length < 2) {
      setPendingTeamError('Team name must be at least 2 characters.');
      return;
    }
    if (name.length > 60) {
      setPendingTeamError('Team name must be 60 characters or fewer.');
      return;
    }
    setPendingTeamError('');
    setPendingTeamLoading(true);
    try {
      const created = await createTeam(name);
      await refreshTeams();
      setActiveTeamId(created.id);
      await refreshMe();
      setPendingTeamName('');
    } catch (err) {
      setPendingTeamError(getErrorMessage(err));
    } finally {
      setPendingTeamLoading(false);
    }
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
              <p className="mt-2">Ask a team admin to invite you so you can see tasks and files.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      {requiresTeamSetup ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#07000b]/40 p-4">
          <div className="animate-modal-in w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-neutral-900">Finish Team Setup</h2>
            <p className="mt-2 text-sm text-neutral-600">
              This activation key is assigned to you. Enter a team name to finish setup and unlock
              the workspace. You cannot continue until the team is created.
            </p>
            <div className="mt-5 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Team name
              </label>
              <input
                value={pendingTeamName}
                onChange={(event) => {
                  setPendingTeamName(event.target.value);
                  if (pendingTeamError) setPendingTeamError('');
                }}
                maxLength={60}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 focus:border-neutral-900 focus:outline-none"
                placeholder="e.g. Product Design"
                autoFocus
              />
              {pendingTeamError ? (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {pendingTeamError}
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleCreateTeam}
                disabled={pendingTeamLoading}
                className="cursor-pointer rounded-lg border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pendingTeamLoading ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
