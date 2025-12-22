import { Router } from 'express';
import {
  handleListDepartments,
  handleCreateDepartment,
} from '../../controllers/departments.controller';
import { requireAuth } from '../../middleware/auth';

export const departmentsRouter = Router();

departmentsRouter.use(requireAuth);
departmentsRouter.get('/', handleListDepartments);
departmentsRouter.post('/', handleCreateDepartment);
