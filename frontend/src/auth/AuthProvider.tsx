import { useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { AuthContext, type AuthContextValue } from './context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<authApi.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await authApi.getMe();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      requestOtp: async (email, purpose) => {
        await authApi.requestOtp(email, purpose);
      },
      verifyOtp: async (email, code, purpose, displayName) => {
        const u = await authApi.verifyOtp(email, code, purpose, displayName);
        setUser(u);
        return u;
      },
      logout: async () => {
        await authApi.logout();
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
