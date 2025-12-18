import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

// Liveness: server process is running
healthRouter.get('/live', (_req, res) => {
  res.json({
    status: 'OK',
    type: 'liveness',
    timestamp: new Date().toISOString(),
  });
});

// Readiness: server is ready to serve requests (e.g., DB connected)
healthRouter.get('/ready', (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;

  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'OK' : 'NOT_READY',
    type: 'readiness',
    dbReady,
    timestamp: new Date().toISOString(),
  });
});
