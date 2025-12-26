import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMyTeams, type TeamSummary } from '../api/teams';
import { useAuth } from '../auth/useAuth';
import { TeamContext, type TeamContextValue } from './context';

const STORAGE_KEY = 'taskflow_active_team_id';

function readStoredTeamId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistTeamId(teamId: string | null) {
  try {
    if (teamId) {
      localStorage.setItem(STORAGE_KEY, teamId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors (private mode, blocked storage).
  }
}

function resolveActiveTeamId(teams: TeamSummary[], preferredId: string | null): string | null {
  if (preferredId && teams.some((team) => team.id === preferredId)) {
    return preferredId;
  }
  return teams[0]?.id ?? null;
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(readStoredTeamId);
  const [loading, setLoading] = useState(true);

  const setActiveTeamId = useCallback((id: string) => {
    setActiveTeamIdState(id);
    persistTeamId(id);
  }, []);

  const refreshTeams = useCallback(async () => {
    if (!user) {
      setTeams([]);
      setActiveTeamIdState(null);
      persistTeamId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextTeams = await getMyTeams();
      setTeams(nextTeams);
      const storedId = readStoredTeamId();
      const resolvedId = resolveActiveTeamId(nextTeams, storedId);
      setActiveTeamIdState(resolvedId);
      persistTeamId(resolvedId);
    } catch (err) {
      console.error('Failed to load teams:', err);
      setTeams([]);
      setActiveTeamIdState(null);
      persistTeamId(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshTeams();
  }, [refreshTeams]);

  const activeTeam = useMemo(
    () => teams.find((team) => team.id === activeTeamId) ?? null,
    [activeTeamId, teams]
  );

  const isTeamAdmin = useMemo(
    () => activeTeam?.role === 'owner' || activeTeam?.role === 'admin',
    [activeTeam?.role]
  );

  const value = useMemo<TeamContextValue>(
    () => ({
      teams,
      activeTeam,
      activeTeamId,
      isTeamAdmin,
      loading,
      setActiveTeamId,
      refreshTeams,
    }),
    [teams, activeTeam, activeTeamId, isTeamAdmin, loading, setActiveTeamId, refreshTeams]
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
}
