import type { RequestHandler } from 'express';
import { AppError } from '../app-error.js';

export const notFoundHandler: RequestHandler = (req) => {
  throw new AppError('NOT_FOUND', `Route ${req.method} ${req.path} not found`);
};
