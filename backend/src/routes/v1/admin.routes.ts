import { Router } from 'express';
import { handleActivateLicence, handleGetAdminStats } from '../../controllers/admin.controller';
import { requireAuth } from '../../middleware/auth';
import { requireTeam } from '../../middleware/team';

export const adminRouter = Router();

adminRouter.post('/activate', requireAuth, handleActivateLicence);
adminRouter.get('/stats', requireAuth, requireTeam, handleGetAdminStats);
