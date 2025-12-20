import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState('');
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true');

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
  };

  const handleActivate = () => {
    if (adminKey.length === 14) {
      localStorage.setItem('isAdmin', 'true');
      setIsAdmin(true);
      window.dispatchEvent(new CustomEvent('admin-change', { detail: true }));
      alert('Admin access activated! You can now access restricted files.');
    } else {
      alert('Please enter a valid admin key in the format: AAAA-BBBB-CCCC');
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
      >
        Activate
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