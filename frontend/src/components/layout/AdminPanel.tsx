import { useState } from 'react';
import type { ChangeEvent } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { IconCheck, IconX } from '../ui/Icons';
import { activateLicense } from '../../api/admin';
import { useAuth } from '../../auth/useAuth';
import { useTeams } from '../../teams/useTeams';
import { ApiRequestError } from '../../api/client';
import { formatAdminKey, isValidAdminKeyFormat } from '../../utils/adminKey';

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.payload?.error?.message ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Activation Failed';
}

export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState('');
  const { user, refreshMe } = useAuth();
  const { isTeamAdmin } = useTeams();
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'admin' || isTeamAdmin;

  const handleKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAdminKey(formatAdminKey(e.target.value));
    if (errorMsg) setErrorMsg('');
  };

  const handleActivate = async () => {
    const codeToSubmit = adminKey.trim().toUpperCase();
    if (!isValidAdminKeyFormat(codeToSubmit)) {
      setErrorMsg('Please enter a valid key');
      return;
    }

    setLoading(true);
    try {
      await activateLicense(codeToSubmit);
      setErrorMsg('');
      await refreshMe();
      setAdminKey('');
    } catch (err) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-5 mb-5 rounded-2xl border border-neutral-200 bg-white/90 p-5 shadow-sm">
      <div className="mb-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
          Admin Access
        </p>
        <div className="mt-2 h-px w-full bg-neutral-200" />
      </div>
      <div className="mb-3 space-y-2">
        <p className="text-center text-[11px] text-neutral-500">
          Format:{' '}
          <span className="font-mono tracking-[0.12em] text-neutral-600">AAAA-BBBB-CCCC</span>
        </p>
        {errorMsg && (
          <div className="rounded-md border border-red-200 bg-red-50/80 px-3 py-2 text-[11px] font-medium text-red-700">
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-center">
              <IconX className="h-3.5 w-3.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          </div>
        )}
        <Input
          type="text"
          placeholder="Enter Admin Key"
          maxLength={14}
          value={adminKey}
          onChange={handleKeyChange}
          className="w-full px-3 text-center font-mono text-[11px] tracking-[0.12em]"
        />
      </div>
      <Button
        onClick={handleActivate}
        variant="outline"
        className="w-full border-2 border-gray-800 text-sm font-bold hover:bg-gray-100"
        disabled={loading || isAdmin}
      >
        {isAdmin ? 'Activated' : loading ? 'Activating…' : 'Activate'}
      </Button>
      <div
        className={`mt-3 rounded-md border px-3 py-2 text-center text-[11px] font-medium ${
          isAdmin
            ? 'border-green-200 bg-green-50/80 text-green-700'
            : 'border-red-200 bg-red-50/80 text-red-700'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
              isAdmin
                ? 'border-green-200 bg-green-100 text-green-700'
                : 'border-red-200 bg-red-100 text-red-700'
            }`}
          >
            {isAdmin ? <IconCheck className="h-3.5 w-3.5" /> : <IconX className="h-3.5 w-3.5" />}
          </span>
          <span className="whitespace-nowrap">
            {isAdmin ? 'Admin Access: Active' : 'Admin Access: Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}
