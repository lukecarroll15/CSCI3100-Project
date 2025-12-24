import { useState } from 'react';
import type { ChangeEvent } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { IconCheck, IconX } from '../ui/Icons';
import { activateLicense } from '../../api/admin';
import { useAuth } from '../../auth/useAuth';
import { ApiRequestError } from '../../api/client';
import { formatAdminKey, isValidAdminKeyFormat } from '../../utils/adminKey';

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.payload?.error?.message ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Activation failed';
}

export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState('');
  const { user, refreshMe } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'admin';

  const handleKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAdminKey(formatAdminKey(e.target.value));
    if (errorMsg) setErrorMsg('');
  };

  const handleActivate = async () => {
    const codeToSubmit = adminKey.trim().toUpperCase();
    if (!isValidAdminKeyFormat(codeToSubmit)) {
      setErrorMsg('Please enter a valid admin key in the format: AAAA-BBBB-CCCC');
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
    <div className="mx-5 mb-5 rounded-lg border-2 border-gray-800 bg-white p-5">
      <div className="mb-2 border-b-2 border-gray-800 pb-2 text-center text-sm font-bold">
        Admin Access
      </div>
      <div className="mb-3 space-y-2">
        <p className="text-xs text-gray-500">Format: AAAA-BBBB-CCCC</p>
        {errorMsg && <div className="text-xs font-semibold text-red-600">{errorMsg}</div>}
        <Input
          type="text"
          placeholder="Enter admin key"
          maxLength={14}
          value={adminKey}
          onChange={handleKeyChange}
          className="w-full px-2.5 text-center font-mono text-[10px] tracking-[0.08em]"
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
        className={`mt-3 rounded-md border-2 p-2 text-center text-[11px] font-bold ${
          isAdmin
            ? 'border-green-600 bg-green-100 text-green-700'
            : 'border-red-600 bg-red-100 text-red-700'
        }`}
      >
        <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
          {isAdmin ? (
            <>
              <IconCheck className="h-4 w-4" strokeWidth={2.4} />
              <span>Admin Access Active</span>
            </>
          ) : (
            <>
              <IconX className="h-4 w-4" strokeWidth={2.4} />
              <span>Admin Access Inactive</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
