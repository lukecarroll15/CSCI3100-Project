import { apiGet, apiJson, apiPostJson } from './client';

export type TeamRole = 'owner' | 'admin' | 'member';

export type TeamSummary = {
  id: string;
  name: string;
  role: TeamRole;
};

export type TeamInviteRole = 'admin' | 'member';

export type TeamInvite = {
  id: string;
  email: string;
  role: TeamInviteRole;
  expiresAt: string;
};

export type TeamMember = {
  userId: string;
  displayName: string;
  email: string;
  role: TeamRole;
};

export async function getMyTeams(): Promise<TeamSummary[]> {
  const res = await apiGet<{ teams: TeamSummary[] }>('/teams/mine');
  return res.teams;
}

export async function createTeam(name: string): Promise<TeamSummary> {
  const res = await apiPostJson<{ team: { id: string; name: string }; role: TeamRole }>('/teams', {
    name,
  });
  return { id: res.team.id, name: res.team.name, role: res.role };
}

export async function createTeamInvite(
  teamId: string,
  email: string,
  role: TeamInviteRole = 'member'
): Promise<TeamInvite> {
  const res = await apiPostJson<{ invite: TeamInvite }>(`/teams/${teamId}/invites`, {
    email,
    role,
  });
  return res.invite;
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const res = await apiGet<{ members: TeamMember[] }>(`/teams/${teamId}/members`);
  return res.members;
}

export async function deleteTeam(teamId: string, name: string): Promise<void> {
  await apiJson<void>(`/teams/${teamId}`, {
    method: 'DELETE',
    body: JSON.stringify({ name }),
  });
}
