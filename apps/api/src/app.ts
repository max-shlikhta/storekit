import express from 'express';
import { env } from './config/env.js';
import { healthRouter } from './modules/health/health.routes.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './shared/middlewares/error-handler.js';
import { notFoundHandler } from './shared/middlewares/not-found.js';
import { requestLogger } from './shared/middlewares/request-logger.js';

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(requestLogger);
  app.use(express.json());

  app.use('/health', healthRouter);
  app.use('/api/v1', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
