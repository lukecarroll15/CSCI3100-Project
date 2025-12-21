import Badge from '../ui/Badge';
import { useEffect, useRef, useState } from 'react';

type Props = {
  userName?: string;
  userRole?: 'user' | 'admin';
  companyName?: string;
  onLogout: () => void;
};

export default function TopBar({
  userName = 'User',
  userRole = 'user',
  companyName = 'TaskFlow',
  onLogout,
}: Props) {

  const [animateAdmin, setAnimateAdmin] = useState(false);
  const previousRole = useRef(userRole);

  useEffect(() => {
    if (previousRole.current !== 'admin' && userRole === 'admin') {
      setAnimateAdmin(true);
      const timeout = setTimeout(() => setAnimateAdmin(false), 900);
      previousRole.current = userRole;
      return () => clearTimeout(timeout);
    }

    previousRole.current = userRole;
  }, [userRole]);

  return (
    <header className="flex h-[70px] items-center border-b-2 border-gray-800 bg-white px-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-800 bg-gray-100 text-xs">
          U
        </div>
        <div className="rounded-md border-2 border-gray-500 bg-gray-50 px-4 py-2 text-base flex items-center gap-2">
          {userName}
          {userRole === 'admin' && (<Badge variant="admin" className={animateAdmin ? 'admin-badge-pop' : ''}>ADMIN</Badge>)}
        </div>
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
    </header>
  );
}
