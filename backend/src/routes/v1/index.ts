import { Router } from 'express';
import { healthRouter } from '../health.routes';

export const v1Router = Router();

v1Router.use('/health', healthRouter);

// Later:
// v1Router.use('/auth', authRouter);
// v1Router.use('/users', usersRouter);
// v1Router.use('/events', eventsRouter);
