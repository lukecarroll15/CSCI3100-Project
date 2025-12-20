import { Router } from 'express';
import { handleUploadFile, handleListFiles, handleDownloadFile, upload } from '../../controllers/files.controller';
import { requireAuth } from '../../middleware/auth';

export const filesRouter = Router();

filesRouter.use(requireAuth);

filesRouter.get('/', handleListFiles);
filesRouter.post('/', upload.single('file'), handleUploadFile);
filesRouter.get('/:fileId/download', handleDownloadFile);
