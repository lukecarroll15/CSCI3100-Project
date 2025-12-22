import { useState } from 'react';
import type { ChangeEvent } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
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
      <div className="mb-3 border-b-2 border-gray-800 pb-2 text-center text-sm font-bold">
        Admin Access
      </div>
      <div className="mb-3">
        <label className="mb-1 block rounded border border-gray-500 bg-gray-50 p-1 text-xs">
          Admin Key (AAAA-BBBB-CCCC)
        </label>
        {errorMsg && <div className="mb-2 text-xs font-semibold text-red-600">{errorMsg}</div>}
        <Input
          type="text"
          placeholder="Enter admin key"
          maxLength={14}
          value={adminKey}
          onChange={handleKeyChange}
          className="w-full"
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
        className={`mt-3 rounded-md border-2 p-2 text-center text-xs font-bold ${
          isAdmin
            ? 'border-green-600 bg-green-100 text-green-600'
            : 'border-red-600 bg-red-100 text-red-600'
        }`}
      >
        {isAdmin ? '✓ Admin Access: Active' : '❌ Admin Access: Inactive'}
      </div>
    </div>
  );
}
