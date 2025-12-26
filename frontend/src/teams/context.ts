import { createContext } from 'react';
import type { TeamSummary } from '../api/teams';

export type TeamContextValue = {
  teams: TeamSummary[];
  activeTeam: TeamSummary | null;
  activeTeamId: string | null;
  isTeamAdmin: boolean;
  loading: boolean;
  setActiveTeamId: (id: string) => void;
  refreshTeams: () => Promise<void>;
};

export const TeamContext = createContext<TeamContextValue | undefined>(undefined);
