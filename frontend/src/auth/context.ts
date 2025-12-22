import { createContext } from 'react';
import type { OtpPurpose, User } from '../api/auth';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  requestOtp: (email: string, purpose: OtpPurpose) => Promise<void>;
  verifyOtp: (
    email: string,
    code: string,
    purpose: OtpPurpose,
    displayName?: string
  ) => Promise<User>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
