import { Router } from 'express';
import { healthRouter } from '../health.routes';
import { authRouter } from './auth.routes';
import { usersRouter } from './users.routes';

export const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);
