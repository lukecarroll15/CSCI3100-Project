import type { Request, Response, NextFunction } from 'express';
import { DepartmentModel } from '../models/Department';
import { AppError } from '../errors/AppError';

const DEFAULT_DEPARTMENTS = ['General', 'Sales', 'IT', 'Finance', 'Marketing'];

export async function handleListDepartments(req: Request, res: Response, next: NextFunction) {
  try {
    let departments = await DepartmentModel.find().sort({ name: 1 });
    
    // Seed defaults if empty
    if (departments.length === 0) {
      const docs = DEFAULT_DEPARTMENTS.map(name => ({ name }));
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
    const { name } = req.body;
    if (!name) throw new AppError(400, 'BAD_REQUEST', 'Department name is required');

    const exists = await DepartmentModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
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
