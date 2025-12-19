import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { getMe } from '../../controllers/users.controller';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, getMe);
