import { Router } from 'express';
import {
  handleListDepartments,
  handleCreateDepartment,
  handleGetDepartmentUsage,
  handleDeleteDepartment,
} from '../../controllers/departments.controller';
import { requireAuth } from '../../middleware/auth';

export const departmentsRouter = Router();

departmentsRouter.use(requireAuth);
departmentsRouter.get('/', handleListDepartments);
departmentsRouter.post('/', handleCreateDepartment);
departmentsRouter.get('/:id/usage', handleGetDepartmentUsage);
departmentsRouter.delete('/:id', handleDeleteDepartment);
