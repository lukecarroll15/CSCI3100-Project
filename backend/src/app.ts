import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { registerRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { logger } from './utils/logger';

export function createApp() {
  const app = express();
  app.use(pinoHttp({ logger }));
  app.use(cookieParser());

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  registerRoutes(app, env.API_PREFIX);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
