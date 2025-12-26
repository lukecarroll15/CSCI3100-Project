import { Router } from 'express';
import {
  handleGetTasks,
  handleCreateTask,
  handleUpdateTask,
  handleDeleteTask,
} from '../../controllers/tasks.controller';
import { requireAuth } from '../../middleware/auth';
import { requireTeam } from '../../middleware/team';

export const tasksRouter = Router();

tasksRouter.get('/', requireAuth, requireTeam, handleGetTasks);
tasksRouter.post('/', requireAuth, requireTeam, handleCreateTask);
tasksRouter.patch('/:id', requireAuth, requireTeam, handleUpdateTask);
tasksRouter.delete('/:id', requireAuth, requireTeam, handleDeleteTask);
