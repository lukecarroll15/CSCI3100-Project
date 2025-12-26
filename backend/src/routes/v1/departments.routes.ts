import { Router } from 'express';
import {
  handleListDepartments,
  handleCreateDepartment,
  handleGetDepartmentUsage,
  handleDeleteDepartment,
} from '../../controllers/departments.controller';
import { requireAuth } from '../../middleware/auth';
import { requireTeam } from '../../middleware/team';

export const departmentsRouter = Router();

departmentsRouter.use(requireAuth, requireTeam);
departmentsRouter.get('/', handleListDepartments);
departmentsRouter.post('/', handleCreateDepartment);
departmentsRouter.get('/:id/usage', handleGetDepartmentUsage);
departmentsRouter.delete('/:id', handleDeleteDepartment);
