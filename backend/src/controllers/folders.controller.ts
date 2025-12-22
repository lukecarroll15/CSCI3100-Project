import { Request, Response, NextFunction } from 'express';
import Folder from '../models/Folder';
import { FileModel } from '../models/File';
import { AppError } from '../errors/AppError';

export const createFolder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('createFolder request body:', req.body);
    console.log('createFolder auth:', req.auth);

    const { name, department } = req.body;
    let { parentFolder } = req.body;
    
    if (parentFolder === 'null' || parentFolder === 'undefined' || !parentFolder) {
      parentFolder = null;
    }

    const userId = req.auth?.userId;

    if (!userId) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'User not found'));
    }

    const folder = await Folder.create({
      name,
      parentFolder: parentFolder || null,
      createdBy: userId,
      department: department || 'General',
    });

    res.status(201).json(folder);
  } catch (error: any) {
    console.error('createFolder error:', error);
    if (error.code === 11000) {
      return next(new AppError(400, 'FOLDER_EXISTS', 'A folder with this name already exists in this location'));
    }
    next(error);
  }
};

export const listFolders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { parentFolder, department, all } = req.query;
    console.log('listFolders query params:', { parentFolder, department, all });

    const query: any = {};
    
    if (all === 'true') {
      // Fetch all folders, ignore parentFolder
      if (department && department !== 'All' && department !== 'All Files') {
        query.department = department;
      }
    } else if (parentFolder && parentFolder !== 'null' && parentFolder !== 'undefined') {
      query.parentFolder = parentFolder;
    } else {
      query.parentFolder = null;
      // Only filter by department at the root level
      if (department && department !== 'All' && department !== 'All Files') {
        query.department = department;
      }
    }
    
    console.log('listFolders mongoose query:', query);
    const folders = await Folder.find(query)
      .sort({ name: 1 })
      .populate('createdBy', 'displayName email');
    console.log(`Found ${folders.length} folders. Departments:`, folders.map(f => (f as any).department));
    res.json(folders);
  } catch (error) {
    next(error);
  }
};

export const deleteFolder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Check if folder has subfolders or files
    const subfoldersCount = await Folder.countDocuments({ parentFolder: id });
    const filesCount = await FileModel.countDocuments({ folder: id });

    if (subfoldersCount > 0 || filesCount > 0) {
      return next(new AppError(400, 'FOLDER_NOT_EMPTY', 'Cannot delete folder that contains files or subfolders'));
    }

    const folder = await Folder.findByIdAndDelete(id);
    if (!folder) {
      return next(new AppError(404, 'NOT_FOUND', 'Folder not found'));
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
