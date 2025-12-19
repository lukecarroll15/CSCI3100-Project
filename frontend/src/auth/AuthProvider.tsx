import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { ApiRequestError } from '../api/client';
import type { AuthContextValue } from './context';
import { AuthContext } from './context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch (e) {
      // 401 is expected when not logged in
      if (e instanceof ApiRequestError && e.status === 401) {
        setUser(null);
        return;
      }
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refreshMe();
      setLoading(false);
    })();
  }, [refreshMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      requestOtp: authApi.requestOtp,
      verifyOtp: async (email, code) => {
        const u = await authApi.verifyOtp(email, code);
        setUser(u);
        return u;
      },
      logout: async () => {
        await authApi.logout();
        setUser(null);
      },
      refreshMe,
    }),
    [user, loading, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
