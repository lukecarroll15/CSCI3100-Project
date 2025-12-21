import { Router } from 'express';
import {
  handleGetTasks,
  handleCreateTask,
  handleUpdateTask,
  handleDeleteTask,
} from '../../controllers/tasks.controller';
import { requireAuth } from '../../middleware/auth';

export const tasksRouter = Router();

tasksRouter.get('/', requireAuth, handleGetTasks);
tasksRouter.post('/', requireAuth, handleCreateTask);
tasksRouter.patch('/:id', requireAuth, handleUpdateTask);
tasksRouter.delete('/:id', requireAuth, handleDeleteTask);
