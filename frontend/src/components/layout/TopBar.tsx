import { useEffect, useState } from 'react';
import SelectMenu from '../ui/SelectMenu';
import { getAdminStats, type AdminStats } from '../../api/admin';
import { ApiRequestError } from '../../api/client';
import {
  createTeamInvite,
  deleteTeam,
  type TeamInviteRole,
  type TeamSummary,
} from '../../api/teams';

type Props = {
  userName?: string;
  userRole?: 'user' | 'admin';
  userAdminLevel?: 'owner' | 'admin' | null;
  onLogout: () => void;
  teams?: TeamSummary[];
  activeTeamId?: string | null;
  activeTeamRole?: TeamSummary['role'] | null;
  teamLoading?: boolean;
  onTeamChange?: (teamId: string) => void;
  onTeamsRefresh?: () => Promise<void>;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.payload?.error?.message ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

function AdminDashboardModal({
  isOpen,
  onClose,
  stats,
  loading,
  teams,
  activeTeamId,
  isSystemOwner,
  onTeamsRefresh,
  onTeamChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  stats: AdminStats | null;
  loading: boolean;
  teams: TeamSummary[];
  activeTeamId: string | null;
  isSystemOwner: boolean;
  onTeamsRefresh?: () => Promise<void>;
  onTeamChange?: (teamId: string) => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteNotice, setInviteNotice] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const ownedTeams = teams.filter((team) => team.role === 'owner');
  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? null;
  const [inviteRole, setInviteRole] = useState<TeamInviteRole>('member');
  const isOwner = activeTeam?.role === 'owner';
  const [deleteTeamId, setDeleteTeamId] = useState(activeTeamId ?? '');
  const [deleteTeamName, setDeleteTeamName] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteNotice, setDeleteNotice] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!ownedTeams.length) return;
    if (!deleteTeamId || !ownedTeams.some((team) => team.id === deleteTeamId)) {
      const nextId =
        activeTeamId && ownedTeams.some((team) => team.id === activeTeamId)
          ? activeTeamId
          : ownedTeams[0].id;
      setDeleteTeamId(nextId);
    }
  }, [activeTeamId, deleteTeamId, ownedTeams]);

  useEffect(() => {
    if (!isOpen) {
      setShowDeleteModal(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOwner) {
      setInviteRole('member');
    }
  }, [isOwner]);

  useEffect(() => {
    setInviteRole('member');
  }, [activeTeamId]);

  useEffect(() => {
    setDeleteTeamName('');
    setDeleteError('');
    setDeleteNotice('');
  }, [deleteTeamId]);

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!activeTeam) {
      setInviteError('Select an active team first');
      return;
    }
    if (!email) {
      setInviteError('Invite email is required');
      return;
    }
    const role: TeamInviteRole = isOwner ? inviteRole : 'member';
    setInviteError('');
    setInviteNotice('');
    setInviteLoading(true);
    try {
      await createTeamInvite(activeTeam.id, email, role);
      setInviteNotice(
        role === 'admin'
          ? 'Invite created. The user joins as an admin after logging in.'
          : 'Invite created. The user joins after logging in.'
      );
      setInviteEmail('');
      if (onTeamsRefresh) {
        await onTeamsRefresh();
      }
    } catch (err) {
      setInviteError(getErrorMessage(err));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deleteTeamId) {
      setDeleteError('Select a team first');
      return;
    }
    const team = ownedTeams.find((item) => item.id === deleteTeamId);
    if (!team) {
      setDeleteError('You can only delete team(s) you own.');
      return;
    }
    if (deleteTeamName.trim() !== team.name) {
      setDeleteError('Team name does not match.');
      return;
    }
    setDeleteError('');
    setDeleteNotice('');
    setDeleteLoading(true);
    try {
      await deleteTeam(deleteTeamId, team.name);
      setDeleteNotice('Team deleted.');
      setDeleteTeamName('');
      setShowDeleteModal(false);
      if (onTeamsRefresh) {
        await onTeamsRefresh();
      }
      if (activeTeamId === deleteTeamId && onTeamChange) {
        const nextTeam = teams.find((item) => item.id !== deleteTeamId);
        if (nextTeam) {
          onTeamChange(nextTeam.id);
        }
      }
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteError('');
    setDeleteNotice('');
    setDeleteTeamName('');
    if (!deleteTeamId && ownedTeams.length > 0) {
      setDeleteTeamId(ownedTeams[0].id);
    }
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteError('');
    setDeleteNotice('');
    setDeleteTeamName('');
  };

  const ownedTeamOptions = ownedTeams.map((team) => ({ value: team.id, label: team.name }));
  const deleteTarget = ownedTeams.find((team) => team.id === deleteTeamId) ?? null;
  const deleteLabelName = deleteTarget?.name ?? activeTeam?.name ?? 'TEAM';
  const isDeleteMatch = deleteTarget ? deleteTeamName.trim() === deleteTarget.name : false;
  const inviteRoleOptions = [
    { value: 'member', label: 'Member' },
    { value: 'admin', label: 'Admin' },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="duration-400 fixed inset-0 z-50 flex items-center justify-center bg-[#07000b]/30 transition-opacity"
      onClick={onClose}
    >
      <div
        className="animate-modal-in max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-lg border-2 border-gray-800 bg-white p-5 shadow-lg sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 text-2xl font-bold">Admin Dashboard</h2>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <>
            {stats ? (
              <>
                {/* Admin Count */}
                <div className="mb-6 rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-600">Total Admin(s)</p>
                  <p className="text-3xl font-bold">{stats.adminCount}</p>
                </div>

                {/* Owner + Admin List */}
                <div className="mb-6 space-y-4">
                  <div>
                    <h3 className="mb-3 font-bold">Owner</h3>
                    <div className="rounded-lg border-2 border-gray-300 bg-gray-50 p-4 text-sm">
                      {stats.owner ? (
                        <div className="flex min-w-0 items-center justify-between">
                          <span
                            className="max-w-[220px] truncate font-semibold"
                            title={stats.owner.displayName}
                          >
                            {stats.owner.displayName}
                          </span>
                          <span
                            className="max-w-[240px] truncate text-gray-600"
                            title={stats.owner.email}
                          >
                            {stats.owner.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">No owner assigned yet</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 font-bold">Admin(s)</h3>
                    <div className="space-y-2 rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                      {stats.admins.length === 0 ? (
                        <p className="text-sm text-gray-500">No additional admins</p>
                      ) : (
                        stats.admins.map((admin, idx) => (
                          <div
                            key={idx}
                            className="flex min-w-0 items-center justify-between text-sm"
                          >
                            <span
                              className="max-w-[220px] truncate font-semibold"
                              title={admin.displayName}
                            >
                              {admin.displayName}
                            </span>
                            <span
                              className="max-w-[240px] truncate text-gray-600"
                              title={admin.email}
                            >
                              {admin.email}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Activation Keys */}
                {isSystemOwner ? (
                  <div className="mb-6">
                    <h3 className="mb-3 font-bold">Active Activation Key(s)</h3>
                    {stats.activationKeys.length === 0 ? (
                      <p className="text-sm text-gray-500">No active keys available</p>
                    ) : (
                      <div className="space-y-2 rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                        {stats.activationKeys.map((key, idx) => (
                          <div
                            key={idx}
                            className="border-b-2 border-gray-200 pb-3 last:border-b-0"
                          >
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="font-mono text-neutral-700">{key.key}</span>
                              <span className="text-gray-600">
                                {key.usesCount} / {key.maxUses}
                              </span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-gray-200">
                              <div
                                className="h-full rounded-full bg-neutral-800"
                                style={{
                                  width: `${((key.maxUses - key.usesCount) / key.maxUses) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mb-6 text-center text-red-600">Failed to load admin stats</p>
            )}

            {/* Team Management */}
            <div className="mb-6">
              <h3 className="mb-3 font-bold">Team(s)</h3>
              <div className="rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                {teams.length === 0 ? (
                  <p className="text-sm text-gray-500">No teams created yet</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    {teams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between">
                        <span className="truncate font-semibold">{team.name}</span>
                        <span className="rounded-full border border-gray-300 px-2 py-0.5 text-[10px] uppercase text-gray-600">
                          {team.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="mb-3 font-bold">Invite Member</h3>
              {inviteError ? (
                <p className="mb-2 text-sm font-medium text-red-600">{inviteError}</p>
              ) : inviteNotice ? (
                <p className="mb-2 text-sm font-medium text-green-700">{inviteNotice}</p>
              ) : null}
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">
                  <span>Inviting to</span>
                  <span className="max-w-[200px] truncate text-gray-700">
                    {activeTeam?.name ?? 'No active team'}
                  </span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="member@example.com"
                    className="flex-1 rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                  />
                  {isOwner ? (
                    <SelectMenu
                      value={inviteRole}
                      placeholder="Role"
                      options={inviteRoleOptions}
                      onChange={(value) => setInviteRole(value as TeamInviteRole)}
                      className="sm:w-[150px]"
                    />
                  ) : (
                    <div className="flex items-center rounded-md border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 sm:w-[150px]">
                      Member only
                    </div>
                  )}
                </div>
                <button
                  onClick={handleInvite}
                  disabled={inviteLoading || !activeTeam}
                  className="w-full cursor-pointer rounded-md border-2 border-gray-800 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-all hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {inviteLoading ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </div>

            {ownedTeams.length > 0 ? (
              <div className="mb-6">
                <h3 className="mb-3 font-bold text-red-600">Delete Team</h3>
                <p className="mb-3 text-sm text-gray-600">
                  Permanently remove a team and revoke its activation key.
                </p>
                <button
                  onClick={openDeleteModal}
                  className="w-full cursor-pointer rounded-md border-2 border-red-500 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-sm"
                >
                  DELETE {deleteLabelName}
                </button>
              </div>
            ) : null}

            <button
              onClick={onClose}
              className="w-full cursor-pointer rounded-md border-2 border-neutral-900 bg-neutral-900 px-4 py-2 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200"
            >
              Close
            </button>
          </>
        )}
      </div>
      {showDeleteModal ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#07000b]/40 p-4"
          onClick={(event) => {
            event.stopPropagation();
            closeDeleteModal();
          }}
        >
          <div
            className="animate-modal-in w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-neutral-900">Delete Team</h3>
            <p className="mt-1 text-sm text-neutral-600">
              Type the exact team name to confirm. This action is permanent.
            </p>
            {deleteError ? (
              <p className="mt-3 text-sm font-medium text-red-600">{deleteError}</p>
            ) : deleteNotice ? (
              <p className="mt-3 text-sm font-medium text-green-700">{deleteNotice}</p>
            ) : null}
            <div className="mt-4 space-y-2">
              <SelectMenu
                value={deleteTeamId}
                placeholder="Select team"
                options={ownedTeamOptions}
                onChange={setDeleteTeamId}
              />
              <input
                type="text"
                value={deleteTeamName}
                onChange={(event) => setDeleteTeamName(event.target.value)}
                onPaste={(event) => event.preventDefault()}
                onCopy={(event) => event.preventDefault()}
                onCut={(event) => event.preventDefault()}
                onDrop={(event) => event.preventDefault()}
                placeholder={deleteTarget ? `Type "${deleteTarget.name}" to confirm` : 'Team name'}
                className="w-full rounded-md border-2 border-red-200 bg-white px-3 py-2 text-sm focus:border-red-300 focus:outline-none"
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="cursor-pointer rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTeam}
                disabled={!isDeleteMatch || deleteLoading}
                className="cursor-pointer rounded-lg border-2 border-red-500 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteLoading ? 'Deleting...' : `DELETE ${deleteLabelName}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TopBar({
  userName = 'User',
  userRole = 'user',
  userAdminLevel = null,
  onLogout,
  teams = [],
  activeTeamId = null,
  activeTeamRole = null,
  teamLoading = false,
  onTeamChange,
  onTeamsRefresh,
}: Props) {
  const isSystemOwner = userRole === 'admin' && userAdminLevel === 'owner';
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const teamOptions = teams.map((team) => ({ value: team.id, label: team.name }));
  const isTeamAdmin = activeTeamRole === 'owner' || activeTeamRole === 'admin';
  const displayActiveRole = activeTeamRole;

  const handleOpenDashboard = async () => {
    setDashboardOpen(true);
    setStatsLoading(true);
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <header className="flex flex-wrap items-center gap-3 border-b-2 border-gray-800 bg-white px-4 py-3 sm:px-6 md:h-[70px] md:flex-nowrap md:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <img
          src="/brand/taskflow-logo.svg"
          alt="TaskFlow"
          className="h-10 w-10 rounded-lg border-2 border-gray-800 bg-white p-1"
        />
        <div className="flex items-center gap-2 rounded-md border-2 border-gray-500 bg-gray-50 px-3 py-2 text-sm sm:px-4 sm:text-base">
          <span className="max-w-[180px] truncate" title={userName}>
            {userName}
          </span>
        </div>
        {teamLoading ? (
          <div className="rounded-md border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Loading teams...
          </div>
        ) : teams.length > 0 ? (
          <div className="flex items-center gap-2 rounded-md border-2 border-gray-800 bg-gray-50 px-3 py-2 text-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Team
            </span>
            <SelectMenu
              value={activeTeamId ?? ''}
              placeholder="Select team"
              options={teamOptions}
              onChange={(id) => onTeamChange?.(id)}
              className="min-w-[160px]"
            />
            {displayActiveRole ? (
              <span className="rounded-full border border-gray-300 px-2 py-0.5 text-[10px] uppercase text-gray-600">
                {displayActiveRole}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="rounded-md border-2 border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            No team
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {isTeamAdmin && (
          <button
            onClick={handleOpenDashboard}
            className="cursor-pointer rounded-md border-2 border-blue-600 bg-blue-50 px-4 py-2 text-base font-semibold text-blue-600 transition-all hover:-translate-y-0.5 hover:border-blue-700 hover:bg-blue-100 hover:text-blue-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
          >
            Admin Dashboard
          </button>
        )}
        <button
          onClick={onLogout}
          className="cursor-pointer rounded-md border-2 border-gray-800 bg-white px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 sm:px-5 sm:text-base"
        >
          Logout
        </button>
      </div>

      <AdminDashboardModal
        isOpen={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        stats={stats}
        loading={statsLoading}
        teams={teams}
        activeTeamId={activeTeamId}
        isSystemOwner={isSystemOwner}
        onTeamsRefresh={onTeamsRefresh}
        onTeamChange={onTeamChange}
      />
    </header>
  );
}
