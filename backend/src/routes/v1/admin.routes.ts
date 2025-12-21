import { Router } from 'express';
import { handleActivateLicence } from '../../controllers/admin.controller';
import { requireAuth } from '../../middleware/auth';

export const adminRouter = Router();

adminRouter.post('/activate', requireAuth, handleActivateLicence);
