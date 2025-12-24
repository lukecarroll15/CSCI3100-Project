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
                  <div key={idx} className="flex min-w-0 items-center justify-between text-sm">
                    <span
                      className="max-w-[220px] truncate font-semibold"
                      title={admin.displayName}
                    >
                      {admin.displayName}
                    </span>
                    <span className="max-w-[240px] truncate text-gray-600" title={admin.email}>
                      {admin.email}
                    </span>
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

            <button
              onClick={onClose}
              className="w-full cursor-pointer rounded-md border-2 border-neutral-900 bg-neutral-900 px-4 py-2 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-200"
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
    <header className="relative flex flex-wrap items-center gap-3 border-b-2 border-gray-800 bg-white px-4 py-3 sm:px-6 md:h-[70px] md:flex-nowrap md:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-800 bg-gray-100 text-xs">
          U
        </div>
        <div className="flex items-center gap-2 rounded-md border-2 border-gray-500 bg-gray-50 px-3 py-2 text-sm sm:px-4 sm:text-base">
          <span className="max-w-[180px] truncate" title={userName}>
            {userName}
          </span>
          {userRole === 'admin' && (
            <Badge variant="admin" className={animateAdmin ? 'admin-badge-pop' : ''}>
              ADMIN
            </Badge>
          )}
        </div>
        {userRole === 'admin' && (
          <button
            onClick={handleOpenDashboard}
            className="cursor-pointer rounded-md border-2 border-blue-600 bg-blue-50 px-4 py-2 text-base font-semibold text-blue-600 transition-all hover:-translate-y-0.5 hover:border-blue-700 hover:bg-blue-100 hover:text-blue-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
          >
            Admin Dashboard
          </button>
        )}
      </div>

      <div className="order-3 w-full text-center md:absolute md:left-1/2 md:order-none md:w-auto md:-translate-x-1/2">
        <div className="inline-flex rounded-md border-2 border-gray-800 px-4 py-1 text-xl font-bold sm:text-2xl">
          {companyName}
        </div>
      </div>

      <button
        onClick={onLogout}
        className="ml-auto cursor-pointer rounded-md border-2 border-gray-800 bg-white px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200 sm:px-5 sm:text-base"
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
