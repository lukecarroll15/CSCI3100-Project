import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { activateLicense } from '../../api/admin';
import { useAuth } from '../../auth/useAuth';
import { ApiRequestError } from '../../api/client';

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.payload?.error?.message ?? err.message;
  if (err instanceof Error) return err.message;
  return 'Activation failed';
}

export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState('');
  const { user, refreshMe } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setIsAdmin(user?.role === 'admin');
  }, [user]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsAdmin(Boolean(detail));
    };
    window.addEventListener('admin-change', handler as EventListener);
    return () => window.removeEventListener('admin-change', handler as EventListener);
  }, []);

  const handleKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let formatted = '';
    for (let i = 0; i < value.length && i < 12; i++) {
      if (i > 0 && i % 4 === 0) formatted += '-';
      formatted += value[i];
    }
    setAdminKey(formatted);
    // Clear any previous error when user edits the input
    if (errorMsg) setErrorMsg('');
  };

  const handleActivate = async () => {
    const codeToSubmit = adminKey;
    if (codeToSubmit.length !== 14) {
      setErrorMsg('Please enter a valid admin key in the format: AAAA-BBBB-CCCC');
      return;
    }

    setLoading(true);
    // Clear input immediately so user can type a new key
    setAdminKey('');
    try {
      await activateLicense(codeToSubmit);
      localStorage.setItem('isAdmin', 'true');
      setIsAdmin(true);
      setErrorMsg('');
      window.dispatchEvent(new CustomEvent('admin-change', { detail: true }));
      await refreshMe(); 
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
        {errorMsg && (
          <div className="mb-2 text-xs font-semibold text-red-600">
            {errorMsg}
          </div>
        )}
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
        disabled={loading}
      >
        {loading ? 'Activating…' : 'Activate'}
      </Button>
      <div
        className={`mt-3 rounded-md border-2 p-2 text-center text-xs font-bold ${
          isAdmin ? 'border-green-600 bg-green-100 text-green-600' : 'border-red-600 bg-red-100 text-red-600'
        }`}
      >
        {isAdmin ? '✓ Admin Access: Active' : '❌ Admin Access: Inactive'}
      </div>
    </div>
  );
}
