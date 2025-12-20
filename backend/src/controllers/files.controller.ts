import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { FileModel } from '../models/File';
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

    // Check if it should be admin only
    const isAdminOnly = req.body.isAdminOnly === 'true';

    const fileDoc = await FileModel.create({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: userId,
      isAdminOnly,
    });

    res.status(201).json(fileDoc);
  } catch (err) {
    next(err);
  }
}

export async function handleListFiles(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.auth?.userId;
    const user = await UserModel.findById(userId);
    const isAdmin = user?.role === 'admin';
    
    const query: { isAdminOnly?: boolean } = {};
    if (!isAdmin) {
      query.isAdminOnly = false;
    }

    const files = await FileModel.find(query)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'displayName email');
      
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
    const isAdmin = user?.role === 'admin';

    if (file.isAdminOnly && !isAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'Admin access required');
    }

    const filePath = path.join(UPLOAD_DIR, file.storedName);
    res.download(filePath, file.originalName);
  } catch (err) {
    next(err);
  }
}
