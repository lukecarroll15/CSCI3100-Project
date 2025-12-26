import { Router } from 'express';
import * as folderController from '../../controllers/folders.controller';
import { requireAuth } from '../../middleware/auth';
import { requireTeam } from '../../middleware/team';

export const foldersRouter = Router();

foldersRouter.use(requireAuth, requireTeam);

foldersRouter.get('/', folderController.listFolders);
foldersRouter.post('/', folderController.createFolder);
foldersRouter.delete('/:id', folderController.deleteFolder);
