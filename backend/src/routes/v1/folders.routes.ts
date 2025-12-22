import { Router } from 'express';
import * as folderController from '../../controllers/folders.controller';
import { requireAuth } from '../../middleware/auth';

export const foldersRouter = Router();

foldersRouter.use(requireAuth);

foldersRouter.get('/', folderController.listFolders);
foldersRouter.post('/', folderController.createFolder);
foldersRouter.delete('/:id', folderController.deleteFolder);
