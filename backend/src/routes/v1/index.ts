import { Router } from 'express';
import { healthRouter } from '../health.routes';
import { authRouter } from './auth.routes';
import { usersRouter } from './users.routes';
import { filesRouter } from './files.routes';
import { foldersRouter } from './folders.routes';
import { departmentsRouter } from './departments.routes';

export const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/files', filesRouter);
v1Router.use('/folders', foldersRouter);
v1Router.use('/departments', departmentsRouter);
