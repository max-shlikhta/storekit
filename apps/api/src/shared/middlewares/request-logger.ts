import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from '../logger.js';

const REQUEST_ID_PATTERN = /^[\w.:-]{1,128}$/;

export const requestLogger: RequestHandler = (req, res, next) => {
  const incomingId = req.get('x-request-id');
  const requestId = incomingId && REQUEST_ID_PATTERN.test(incomingId) ? incomingId : randomUUID();
  const startedAt = performance.now();

  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl.split('?')[0] ?? ''} ${res.statusCode}`, {
      requestId,
      durationMs: Math.round(performance.now() - startedAt),
    });
  });

  next();
};
