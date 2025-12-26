import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import {
  handleCreateInvite,
  handleCreateTeam,
  handleDeleteTeam,
  handleListInvites,
  handleListMyTeams,
  handleListTeamMembers,
  handleRemoveMember,
  handleUpdateMemberRole,
} from '../../controllers/teams.controller';

export const teamsRouter = Router();

teamsRouter.use(requireAuth);

teamsRouter.get('/mine', handleListMyTeams);
teamsRouter.post('/', handleCreateTeam);
teamsRouter.delete('/:teamId', handleDeleteTeam);
teamsRouter.get('/:teamId/members', handleListTeamMembers);
teamsRouter.patch('/:teamId/members/:memberId', handleUpdateMemberRole);
teamsRouter.delete('/:teamId/members/:memberId', handleRemoveMember);
teamsRouter.get('/:teamId/invites', handleListInvites);
teamsRouter.post('/:teamId/invites', handleCreateInvite);
