import { STATUS_CODES } from 'node:http';
import type { ErrorRequestHandler } from 'express';
import {
  ConnectionError,
  DatabaseError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
} from 'sequelize';
import { AppError, type AppErrorCode, type ErrorDetail } from '../app-error.js';
import { logger, serializeError } from '../logger.js';

type HttpError = {
  status: number;
  code: string;
  message: string;
  details?: ErrorDetail[] | undefined;
};

const APP_ERROR_STATUSES: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNSUPPORTED_MEDIA_TYPE: 415,
  TOO_MANY_REQUESTS: 429,
  BAD_GATEWAY: 502,
};

const BODY_PARSER_ERRORS: Record<string, HttpError> = {
  'entity.parse.failed': {
    status: 400,
    code: 'INVALID_JSON',
    message: 'Request body is not valid JSON',
  },
  'entity.too.large': {
    status: 413,
    code: 'PAYLOAD_TOO_LARGE',
    message: 'Request body is too large',
  },
  'charset.unsupported': {
    status: 415,
    code: 'UNSUPPORTED_MEDIA_TYPE',
    message: 'Unsupported charset',
  },
  'encoding.unsupported': {
    status: 415,
    code: 'UNSUPPORTED_MEDIA_TYPE',
    message: 'Unsupported content encoding',
  },
};

const RETRYABLE_DATABASE_CODES = new Set(['40P01', '40001']);

const INTERNAL_ERROR: HttpError = {
  status: 500,
  code: 'INTERNAL_ERROR',
  message: 'Internal server error',
};

const codeForStatus = (status: number) =>
  (STATUS_CODES[status] ?? 'Error').toUpperCase().replace(/[^A-Z0-9]+/g, '_');

const getClientErrorStatus = (error: unknown) => {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return undefined;
  }

  const { status } = error;
  return typeof status === 'number' && status >= 400 && status < 500 ? status : undefined;
};

const toHttpError = (error: unknown): HttpError => {
  if (error instanceof AppError) {
    return {
      status: APP_ERROR_STATUSES[error.code],
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof UniqueConstraintError) {
    return { status: 409, code: 'CONFLICT', message: 'Resource already exists' };
  }

  if (error instanceof ForeignKeyConstraintError) {
    return {
      status: 409,
      code: 'CONFLICT',
      message: 'Referenced resource does not exist or is still in use',
    };
  }

  if (error instanceof ConnectionError) {
    return { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' };
  }

  if (
    error instanceof DatabaseError &&
    RETRYABLE_DATABASE_CODES.has((error.parent as { code?: string }).code ?? '')
  ) {
    return {
      status: 409,
      code: 'CONFLICT',
      message: 'The request collided with a concurrent change: please retry',
    };
  }

  const bodyParserType = (error as { type?: unknown }).type;

  if (typeof bodyParserType === 'string' && bodyParserType in BODY_PARSER_ERRORS) {
    return BODY_PARSER_ERRORS[bodyParserType] ?? INTERNAL_ERROR;
  }

  const status = getClientErrorStatus(error);

  if (status !== undefined) {
    return { status, code: codeForStatus(status), message: STATUS_CODES[status] ?? 'Bad Request' };
  }

  return INTERNAL_ERROR;
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const { status, code, message, details } = toHttpError(error);

  if (status >= 500) {
    logger.error('Request failed', {
      requestId: res.locals.requestId,
      method: req.method,
      path: req.path,
      error: serializeError(error),
    });
  }

  res.status(status).json({ error: { code, message, ...(details && { details }) } });
};
