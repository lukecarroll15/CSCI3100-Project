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

  const shouldSkipRateLimit = (req: express.Request) =>
    req.method === 'OPTIONS' ||
    req.method === 'HEAD' ||
    req.path.startsWith(`${env.API_PREFIX}/v1/auth/github`);

  const rateLimitHandler = (_req: express.Request, res: express.Response) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' },
    });
  };

  const readLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX * 4,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => shouldSkipRateLimit(req) || req.method !== 'GET',
    handler: rateLimitHandler,
  });

  const writeLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX * 2,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => shouldSkipRateLimit(req) || req.method === 'GET',
    handler: rateLimitHandler,
  });

  app.use(readLimiter);
  app.use(writeLimiter);

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Register routes
  registerRoutes(app, env.API_PREFIX);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
