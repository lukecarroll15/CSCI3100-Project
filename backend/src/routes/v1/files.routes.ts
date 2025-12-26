import { Router } from 'express';
import {
  handleUploadFile,
  handleListFiles,
  handleDownloadFile,
  handleDeleteFile,
  upload,
} from '../../controllers/files.controller';
import { requireAuth } from '../../middleware/auth';
import { requireTeam } from '../../middleware/team';

export const filesRouter = Router();

filesRouter.use(requireAuth, requireTeam);

filesRouter.get('/', handleListFiles);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
filesRouter.post('/', upload.single('file') as any, handleUploadFile);
filesRouter.get('/:fileId/download', handleDownloadFile);
filesRouter.delete('/:fileId', handleDeleteFile);
