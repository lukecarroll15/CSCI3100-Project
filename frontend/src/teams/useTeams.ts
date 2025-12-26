import { useContext } from 'react';
import { TeamContext } from './context';
import type { TeamContextValue } from './context';

export function useTeams(): TeamContextValue {
  const ctx = useContext(TeamContext);
  if (!ctx) {
    throw new Error('useTeams must be used within TeamProvider');
  }
  return ctx;
}
