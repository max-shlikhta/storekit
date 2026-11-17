import type { Request, RequestHandler } from 'express';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

const hasBody = (req: Request) =>
  req.get('transfer-encoding') !== undefined || Number(req.get('content-length') ?? 0) > 0;

export const requireJsonBody: RequestHandler = (req, res, next) => {
  if (METHODS_WITH_BODY.has(req.method) && hasBody(req) && !req.is('application/json')) {
    res.status(415).json({
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type must be application/json',
      },
    });
    return;
  }

  next();
};
