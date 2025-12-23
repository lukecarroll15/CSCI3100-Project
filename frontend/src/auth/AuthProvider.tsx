import { useEffect, useMemo, useRef, useState } from 'react';
import * as authApi from '../api/auth';
import { ApiRequestError } from '../api/client';
import { AuthContext, type AuthContextValue } from './context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<authApi.User | null>(null);
  const [loading, setLoading] = useState(true);
  const retryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    const fetchMe = async (attempt = 0) => {
      try {
        const me = await authApi.getMe();
        if (!active) return;
        setUser(me);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiRequestError && err.status === 429 && attempt < 3) {
          retryTimerRef.current = window.setTimeout(
            () => {
              void fetchMe(attempt + 1);
            },
            1200 * (attempt + 1)
          );
          return;
        }
        setUser(null);
        setLoading(false);
      }
    };

    void fetchMe();
    return () => {
      active = false;
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
      }
    };
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
      refreshMe: async () => {
        try {
          const me = await authApi.getMe();
          setUser(me);
        } catch (err) {
          if (err instanceof ApiRequestError && err.status === 429) return;
          setUser(null);
        }
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
