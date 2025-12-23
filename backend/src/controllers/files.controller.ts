import type { Request, Response, NextFunction } from 'express';
import type { FilterQuery } from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { FileModel, type FileDoc } from '../models/File';
import { UserModel } from '../models/User';
import { AppError } from '../errors/AppError';

// Ensure uploads directory exists
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, _file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + _file.originalname);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

export async function handleUploadFile(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('Upload request received:', {
      file: req.file ? { ...req.file, buffer: undefined } : null,
      body: req.body,
      auth: req.auth,
    });

    if (!req.file) throw new AppError(400, 'NO_FILE', 'No file uploaded');

    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, 'UNAUTHENTICATED', 'User not found');

    // Only admins can upload admin-only files
    const isAdminOnly = req.auth?.role === 'admin' && req.body.isAdminOnly === 'true';
    const isPrivate = req.body.isPrivate === 'true' && !isAdminOnly;
    const department = req.body.department || 'General';
    let folder = req.body.folder;

    if (folder === 'null' || folder === 'undefined' || !folder) {
      folder = null;
    }

    const fileDoc = await FileModel.create({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: userId,
      department,
      folder,
      isAdminOnly,
      isPrivate,
    });

    res.status(201).json(fileDoc);
  } catch (err) {
    next(err);
  }
}

export async function handleListFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth?.userId;
    let user = await UserModel.findById(userId);

    // Fallback: If user ID mismatch (e.g. DB reset), try finding by email
    if (!user && req.auth?.email) {
      user = await UserModel.findOne({ email: req.auth.email });
    }

    const isAdmin = user?.role === 'admin' || req.auth?.role === 'admin';

    console.log(`[ListFiles] User: ${user?.email}, Role: ${user?.role}, IsAdmin: ${isAdmin}`);

    const { folder, access } = req.query;
    const query: FilterQuery<FileDoc> = {};
    const folderParam = typeof folder === 'string' ? folder : undefined;
    const accessParam = typeof access === 'string' ? access : 'all';
    const normalizedAccess = ['all', 'standard', 'admin', 'private'].includes(accessParam)
      ? accessParam
      : 'all';

    const userAccessId = req.auth?.userId;
    if (!userAccessId) {
      throw new AppError(401, 'UNAUTHENTICATED', 'User not found');
    }

    const standardCondition: FilterQuery<FileDoc> = {
      isAdminOnly: { $ne: true },
      isPrivate: { $ne: true },
    };
    const privateCondition: FilterQuery<FileDoc> = { isPrivate: true, uploadedBy: userAccessId };
    const adminCondition: FilterQuery<FileDoc> = { isAdminOnly: true };

    const accessConditions: FilterQuery<FileDoc>[] = [];

    if (normalizedAccess === 'admin') {
      if (!isAdmin) {
        res.json([]);
        return;
      }
      accessConditions.push(adminCondition);
    } else if (normalizedAccess === 'private') {
      accessConditions.push(privateCondition);
    } else if (normalizedAccess === 'standard') {
      accessConditions.push(standardCondition);
    } else {
      accessConditions.push(standardCondition, privateCondition);
      if (isAdmin) {
        accessConditions.push(adminCondition);
      }
    }

    if (folderParam && folderParam !== 'null' && folderParam !== 'undefined') {
      query.folder = folderParam;
    } else {
      query.folder = null;
    }
    query.$or = accessConditions;

    console.log('[ListFiles] Query:', JSON.stringify(query));

    const files = await FileModel.find(query)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'displayName email');

    console.log(`[ListFiles] Found ${files.length} files`);

    res.json(files);
  } catch (err) {
    next(err);
  }
}

export async function handleDownloadFile(req: Request, res: Response, next: NextFunction) {
  try {
    const { fileId } = req.params;
    const file = await FileModel.findById(fileId);
    if (!file) throw new AppError(404, 'NOT_FOUND', 'File not found');

    const userId = req.auth?.userId;
    const user = await UserModel.findById(userId);
    const isAdmin = user?.role === 'admin' || req.auth?.role === 'admin';

    if (file.isAdminOnly && !isAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'Admin access required');
    }
    if (file.isPrivate && file.uploadedBy.toString() !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Private file access required');
    }

    const filePath = path.join(UPLOAD_DIR, file.storedName);
    res.download(filePath, file.originalName);
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteFile(req: Request, res: Response, next: NextFunction) {
  try {
    const { fileId } = req.params;
    const file = await FileModel.findById(fileId);
    if (!file) throw new AppError(404, 'NOT_FOUND', 'File not found');

    const userId = req.auth?.userId;
    const user = await UserModel.findById(userId);
    const isAdmin = user?.role === 'admin' || req.auth?.role === 'admin';

    if (file.isPrivate && file.uploadedBy.toString() !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Not authorized to delete this private file');
    }

    // Only the uploader or an admin can delete the file
    if (file.uploadedBy.toString() !== userId && !isAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'Not authorized to delete this file');
    }

    // Delete from disk
    const filePath = path.join(UPLOAD_DIR, file.storedName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from DB
    await FileModel.findByIdAndDelete(fileId);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
