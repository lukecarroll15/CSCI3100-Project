import type { Request, Response, NextFunction } from 'express';
import type { FilterQuery } from 'mongoose';
import Folder, { FOLDER_DEPARTMENT, type IFolder } from '../models/Folder';
import { FileModel, type FileDoc } from '../models/File';
import { AppError } from '../errors/AppError';

const MAX_FOLDER_DEPTH = 4;
const MAX_FOLDER_NAME_LENGTH = 48;

export const createFolder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('createFolder request body:', req.body);
    console.log('createFolder auth:', req.auth);

    const { name } = req.body;
    let { parentFolder } = req.body;
    const isPrivate = req.body.isPrivate === true || req.body.isPrivate === 'true';

    if (parentFolder === 'null' || parentFolder === 'undefined' || !parentFolder) {
      parentFolder = null;
    }

    const userId = req.auth?.userId;

    if (!userId) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'User not found'));
    }

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      return next(new AppError(400, 'BAD_REQUEST', 'Folder name is required'));
    }
    if (trimmedName.length > MAX_FOLDER_NAME_LENGTH) {
      return next(
        new AppError(
          400,
          'NAME_TOO_LONG',
          `Folder name must be ${MAX_FOLDER_NAME_LENGTH} characters or fewer`
        )
      );
    }

    let depth = 1;
    if (parentFolder) {
      const visited = new Set<string>();
      let currentParentId: string | null = parentFolder;
      while (currentParentId) {
        if (visited.has(currentParentId)) {
          return next(new AppError(400, 'INVALID_PARENT', 'Folder hierarchy contains a loop'));
        }
        visited.add(currentParentId);
        const parent = await Folder.findById(currentParentId);
        if (!parent) {
          return next(new AppError(404, 'NOT_FOUND', 'Parent folder not found'));
        }
        depth += 1;
        if (depth > MAX_FOLDER_DEPTH) {
          return next(
            new AppError(400, 'MAX_DEPTH', `Folders can be nested up to ${MAX_FOLDER_DEPTH} levels`)
          );
        }
        currentParentId = parent.parentFolder ? parent.parentFolder.toString() : null;
      }
    }

    const folder = await Folder.create({
      name: trimmedName,
      parentFolder: parentFolder || null,
      createdBy: userId,
      department: FOLDER_DEPARTMENT,
      isPrivate,
    });

    res.status(201).json(folder);
  } catch (error: unknown) {
    console.error('createFolder error:', error);
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        return next(
          new AppError(
            400,
            'FOLDER_EXISTS',
            'A folder with this name already exists in this location'
          )
        );
      }
    }
    next(error);
  }
};

export const listFolders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { parentFolder, department, all, access } = req.query;
    console.log('listFolders query params:', { parentFolder, department, all, access });
    const parentFolderParam = typeof parentFolder === 'string' ? parentFolder : undefined;
    const departmentParam = typeof department === 'string' ? department.trim() : undefined;
    const allParam = typeof all === 'string' ? all : undefined;
    const accessParam = typeof access === 'string' ? access : 'all';
    const normalizedAccess = ['all', 'standard', 'admin', 'private'].includes(accessParam)
      ? accessParam
      : 'all';
    const departmentLower = departmentParam?.toLowerCase() ?? '';
    const hasDepartmentFilter =
      !!departmentParam && !['all', 'all files', 'general'].includes(departmentLower);
    const filterFolderDepartment = departmentLower === FOLDER_DEPARTMENT.toLowerCase();
    const userId = req.auth?.userId;
    const isAdmin = req.auth?.role === 'admin';

    if (!userId) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'User not found'));
    }

    const query: FilterQuery<IFolder> = {};

    if (allParam === 'true') {
      // Fetch all folders, ignore parentFolder
      if (filterFolderDepartment) {
        query.department = departmentParam;
      }
    } else if (
      parentFolderParam &&
      parentFolderParam !== 'null' &&
      parentFolderParam !== 'undefined'
    ) {
      query.parentFolder = parentFolderParam;
    } else {
      query.parentFolder = null;
      // Only filter by department at the root level
      if (filterFolderDepartment) {
        query.department = departmentParam;
      }
    }

    query.$or = [{ isPrivate: { $ne: true } }, { createdBy: userId }];

    console.log('listFolders mongoose query:', query);
    let folders = await Folder.find(query)
      .sort({ name: 1 })
      .populate('createdBy', 'displayName email');

    if (normalizedAccess === 'admin' && !isAdmin) {
      res.json([]);
      return;
    }

    const folderIds = folders.map((folder) => folder._id);
    if (folderIds.length === 0) {
      res.json([]);
      return;
    }

    const fileQuery: FilterQuery<FileDoc> = { folder: { $in: folderIds } };
    if (hasDepartmentFilter && departmentParam) {
      fileQuery.department = departmentParam;
    }
    if (normalizedAccess === 'admin') {
      fileQuery.isAdminOnly = true;
    } else if (normalizedAccess === 'private') {
      fileQuery.isPrivate = true;
      fileQuery.uploadedBy = userId;
    } else if (normalizedAccess === 'standard') {
      fileQuery.isAdminOnly = { $ne: true };
      fileQuery.isPrivate = { $ne: true };
    } else {
      const standardCondition: FilterQuery<FileDoc> = {
        isAdminOnly: { $ne: true },
        isPrivate: { $ne: true },
      };
      const privateCondition: FilterQuery<FileDoc> = { isPrivate: true, uploadedBy: userId };
      const accessConditions: FilterQuery<FileDoc>[] = [standardCondition, privateCondition];
      if (isAdmin) {
        accessConditions.push({ isAdminOnly: true });
      }
      fileQuery.$or = accessConditions;
    }

    const foldersWithAnyFiles = await FileModel.distinct('folder', { folder: { $in: folderIds } });
    const foldersWithAccess = await FileModel.distinct('folder', fileQuery);
    const anyFilesSet = new Set(foldersWithAnyFiles.map((id) => id.toString()));
    const accessSet = new Set(foldersWithAccess.map((id) => id.toString()));

    folders = folders.filter((folder) => {
      const folderId = folder._id.toString();
      const hasAnyFiles = anyFilesSet.has(folderId);
      const hasAccessFiles = accessSet.has(folderId);

      if (normalizedAccess === 'private') {
        if (hasDepartmentFilter) {
          return hasAccessFiles;
        }
        return folder.isPrivate || hasAccessFiles;
      }

      if (normalizedAccess === 'standard' || normalizedAccess === 'admin') {
        if (folder.isPrivate) return false;
        return hasAccessFiles;
      }

      if (hasDepartmentFilter) {
        return hasAccessFiles;
      }

      if (!hasAnyFiles) {
        return true;
      }

      return hasAccessFiles;
    });

    console.log(
      `Found ${folders.length} folders. Departments:`,
      folders.map((folder) => folder.department)
    );
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
      return next(
        new AppError(
          400,
          'FOLDER_NOT_EMPTY',
          'Cannot delete folder that contains files or subfolders'
        )
      );
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
