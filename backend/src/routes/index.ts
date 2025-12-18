import type { Express } from 'express';
import { v1Router } from './v1';

export function registerRoutes(app: Express, apiPrefix = '/api'): void {
  app.get('/', (_req, res) => res.send('TaskFlow API is running'));
  app.use(`${apiPrefix}/v1`, v1Router);
}
