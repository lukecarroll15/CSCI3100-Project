import { Router } from 'express';
import { healthRouter } from '../health.routes';
import { authRouter } from './auth.routes';
import { usersRouter } from './users.routes';
import { filesRouter } from './files.routes';
import { foldersRouter } from './folders.routes';
import { departmentsRouter } from './departments.routes';
import { adminRouter } from './admin.routes';
import { canvasRouter } from './canvas.routes';
import { tasksRouter } from './tasks.routes';
import { teamsRouter } from './teams.routes';

export const v1Router = Router();

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/files', filesRouter);
v1Router.use('/folders', foldersRouter);
v1Router.use('/departments', departmentsRouter);
v1Router.use('/admin', adminRouter);
v1Router.use('/teams', teamsRouter);
v1Router.use('/canvas', canvasRouter);
v1Router.use('/tasks', tasksRouter);
