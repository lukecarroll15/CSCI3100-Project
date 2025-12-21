import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { handleGetCanvas, handleUpsertCanvas } from '../../controllers/canvas.controller';

export const canvasRouter = Router();

canvasRouter.get('/', requireAuth, handleGetCanvas);
canvasRouter.put('/', requireAuth, handleUpsertCanvas);
