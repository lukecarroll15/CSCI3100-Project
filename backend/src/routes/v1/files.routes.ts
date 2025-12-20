import { Router } from 'express';
import { handleUploadFile, handleListFiles, handleDownloadFile, upload } from '../../controllers/files.controller';
import { requireAuth } from '../../middleware/auth';

export const filesRouter = Router();

filesRouter.use(requireAuth);

filesRouter.get('/', handleListFiles);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
filesRouter.post('/', upload.single('file') as any, handleUploadFile);
filesRouter.get('/:fileId/download', handleDownloadFile);
