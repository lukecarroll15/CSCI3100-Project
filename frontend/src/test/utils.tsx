import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import type { User } from '../api/auth';
import { AuthContext, type AuthContextValue } from '../auth/context';
import { TeamContext, type TeamContextValue } from '../teams/context';

const defaultUser: User = {
  id: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  role: 'admin',
  adminLevel: 'owner',
  pendingTeamCreation: false,
};

const defaultAuthValue: AuthContextValue = {
  user: defaultUser,
  loading: false,
  requestOtp: vi.fn(async () => undefined),
  verifyOtp: vi.fn(async () => defaultUser),
  logout: vi.fn(async () => undefined),
  refreshMe: vi.fn(async () => undefined),
};

const defaultTeamValue: TeamContextValue = {
  teams: [{ id: 'team-1', name: 'Alpha Team', role: 'owner' }],
  activeTeam: { id: 'team-1', name: 'Alpha Team', role: 'owner' },
  activeTeamId: 'team-1',
  isTeamAdmin: true,
  loading: false,
  setActiveTeamId: vi.fn(),
  refreshTeams: vi.fn(async () => undefined),
};

type RenderOptions = {
  route?: string;
  auth?: AuthContextValue;
  team?: TeamContextValue;
};

export function renderWithProviders(ui: React.ReactElement, options: RenderOptions = {}) {
  const { route = '/', auth = defaultAuthValue, team = defaultTeamValue } = options;

  if (team.activeTeamId) {
    localStorage.setItem('taskflow_active_team_id', team.activeTeamId);
  }

  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={auth}>
        <TeamContext.Provider value={team}>{ui}</TeamContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

export { defaultAuthValue, defaultTeamValue };
