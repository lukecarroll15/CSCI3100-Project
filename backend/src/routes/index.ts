import type { Express } from 'express';
import { healthRouter } from './health.routes';

export function registerRoutes(app: Express, apiPrefix = '/api'): void {
  // Optional: root landing (matches many real projects)
  app.get('/', (_req, res) => {
    res.send('TaskFlow API is running');
  });

  app.use(`${apiPrefix}/health`, healthRouter);
}
