import Badge from '../ui/Badge';
import { useEffect, useRef, useState } from 'react';
import { getAdminStats, type AdminStats } from '../../api/admin';

type Props = {
  userName?: string;
  userRole?: 'user' | 'admin';
  companyName?: string;
  onLogout: () => void;
};

function AdminDashboardModal({
  isOpen,
  onClose,
  stats,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  stats: AdminStats | null;
  loading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="duration-400 fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 transition-opacity"
      onClick={onClose}
    >
      <div
        className="animate-modal-in max-h-[80vh] w-[600px] overflow-y-auto rounded-lg border-2 border-gray-800 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-6 text-2xl font-bold">Admin Dashboard</h2>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : stats ? (
          <>
            {/* Admin Count */}
            <div className="mb-6 rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-600">Total Admins</p>
              <p className="text-3xl font-bold">{stats.adminCount}</p>
            </div>

            {/* Admin List */}
            <div className="mb-6">
              <h3 className="mb-3 font-bold">Admins</h3>
              <div className="space-y-2 rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                {stats.admins.map((admin, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="font-semibold">{admin.displayName}</span>
                    <span className="text-gray-600">{admin.email}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activation Keys */}
            <div className="mb-6">
              <h3 className="mb-3 font-bold">Active Activation Keys</h3>
              {stats.activationKeys.length === 0 ? (
                <p className="text-sm text-gray-500">No active keys available</p>
              ) : (
                <div className="space-y-2 rounded-lg border-2 border-gray-300 bg-gray-50 p-4">
                  {stats.activationKeys.map((key, idx) => (
                    <div key={idx} className="border-b-2 border-gray-200 pb-3 last:border-b-0">
                      <div className="flex justify-between text-sm font-semibold">
                        <span className="font-mono text-blue-600">{key.key}</span>
                        <span className="text-gray-600">
                          {key.usesCount} / {key.maxUses}
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-green-600"
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

            <button
              onClick={onClose}
              className="w-full rounded-md border-2 border-gray-800 bg-gray-800 px-4 py-2 font-semibold text-white hover:bg-gray-700"
            >
              Close
            </button>
          </>
        ) : (
          <p className="text-center text-red-600">Failed to load admin stats</p>
        )}
      </div>
    </div>
  );
}

export default function TopBar({
  userName = 'User',
  userRole = 'user',
  companyName = 'TaskFlow',
  onLogout,
}: Props) {
  const [animateAdmin, setAnimateAdmin] = useState(false);
  const previousRole = useRef(userRole);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (previousRole.current !== 'admin' && userRole === 'admin') {
      setAnimateAdmin(true);
      const timeout = setTimeout(() => setAnimateAdmin(false), 900);
      previousRole.current = userRole;
      return () => clearTimeout(timeout);
    }

    previousRole.current = userRole;
  }, [userRole]);

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
    <header className="flex h-[70px] items-center border-b-2 border-gray-800 bg-white px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-800 bg-gray-100 text-xs">
          U
        </div>
        <div className="flex items-center gap-2 rounded-md border-2 border-gray-500 bg-gray-50 px-4 py-2 text-base">
          {userName}
          {userRole === 'admin' && (
            <Badge variant="admin" className={animateAdmin ? 'admin-badge-pop' : ''}>
              ADMIN
            </Badge>
          )}
        </div>
        {userRole === 'admin' && (
          <button
            onClick={handleOpenDashboard}
            className="rounded-md border-2 border-blue-600 bg-blue-50 px-4 py-2 text-base font-semibold text-blue-600 transition-colors hover:bg-blue-100"
          >
            Admin Dashboard
          </button>
        )}
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 text-center">
        <div className="mb-1 rounded-md border-2 border-gray-800 px-5 py-1 text-2xl font-bold">
          {companyName}
        </div>
        <div className="rounded border border-gray-400 bg-gray-50 px-3 py-1 text-xs text-gray-500">
          Jira-like project manager (CSCI3100)
        </div>
      </div>

      <button
        onClick={onLogout}
        className="ml-auto cursor-pointer rounded-md border-2 border-gray-800 bg-white px-5 py-2 text-base transition-colors hover:bg-gray-100"
      >
        Logout
      </button>

      <AdminDashboardModal
        isOpen={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        stats={stats}
        loading={statsLoading}
      />
    </header>
  );
}
