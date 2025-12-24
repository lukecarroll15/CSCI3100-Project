import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { DepartmentModel } from '../models/Department';
import Folder, { FOLDER_DEPARTMENT } from '../models/Folder';
import { FileModel } from '../models/File';
import { TaskModel } from '../models/Task';
import { AppError } from '../errors/AppError';

const DEFAULT_DEPARTMENTS = [
  'General',
  'Sales',
  'IT',
  'Finance',
  'Marketing',
  'HR',
  'Customer Service',
];
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

export async function handleListDepartments(req: Request, res: Response, next: NextFunction) {
  try {
    let departments = await DepartmentModel.find().sort({ name: 1 });

    // Seed defaults if empty
    if (departments.length === 0) {
      const docs = DEFAULT_DEPARTMENTS.map((name) => ({ name }));
      await DepartmentModel.insertMany(docs);
      departments = await DepartmentModel.find().sort({ name: 1 });
    }

    res.json(departments);
  } catch (err) {
    next(err);
  }
}

export async function handleCreateDepartment(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }
    if (auth.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Admin access required');
    }

    const { name } = req.body;
    if (!name) throw new AppError(400, 'BAD_REQUEST', 'Department name is required');

    if (String(name).trim().toLowerCase() === FOLDER_DEPARTMENT.toLowerCase()) {
      throw new AppError(
        400,
        'BAD_REQUEST',
        `${FOLDER_DEPARTMENT} is reserved for folders and cannot be created.`
      );
    }

    const exists = await DepartmentModel.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });
    if (exists) throw new AppError(400, 'ALREADY_EXISTS', 'Department already exists');

    const dept = await DepartmentModel.create({
      name,
      createdBy: req.auth?.userId,
    });

    res.status(201).json(dept);
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteDepartment(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }
    if (auth.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Admin access required');
    }

    const { id } = req.params;
    const department = await DepartmentModel.findById(id);
    if (!department) {
      throw new AppError(404, 'NOT_FOUND', 'Department not found');
    }

    const deptName = department.name.trim().toLowerCase();
    if (deptName === 'general') {
      throw new AppError(400, 'BAD_REQUEST', 'General department cannot be deleted');
    }
    if (deptName === FOLDER_DEPARTMENT.toLowerCase()) {
      throw new AppError(400, 'BAD_REQUEST', `${FOLDER_DEPARTMENT} department cannot be deleted`);
    }

    const taskCount = await TaskModel.countDocuments({ department: department.name });
    const files = await FileModel.find({ department: department.name });
    const fileCount = files.length;
    const forceDelete = String(req.query.force || '').toLowerCase() === 'true';

    if ((taskCount > 0 || fileCount > 0) && !forceDelete) {
      throw new AppError(
        409,
        'DEPARTMENT_IN_USE',
        'Department has related tasks or files and requires confirmation.'
      );
    }

    if (fileCount > 0) {
      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(UPLOAD_DIR, file.storedName);
          try {
            await fs.promises.unlink(filePath);
          } catch {
            // Ignore missing files so deletion can proceed.
          }
        })
      );
      await FileModel.deleteMany({ department: department.name });
    }

    if (taskCount > 0) {
      await TaskModel.deleteMany({ department: department.name });
    }

    await Folder.updateMany(
      { department: department.name },
      { $set: { department: FOLDER_DEPARTMENT } }
    );

    await DepartmentModel.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function handleGetDepartmentUsage(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.auth;
    if (!auth) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    }
    if (auth.role !== 'admin') {
      throw new AppError(403, 'FORBIDDEN', 'Admin access required');
    }

    const { id } = req.params;
    const department = await DepartmentModel.findById(id);
    if (!department) {
      throw new AppError(404, 'NOT_FOUND', 'Department not found');
    }

    const [taskCount, fileCount] = await Promise.all([
      TaskModel.countDocuments({ department: department.name }),
      FileModel.countDocuments({ department: department.name }),
    ]);

    res.json({ taskCount, fileCount });
  } catch (err) {
    next(err);
  }
}
