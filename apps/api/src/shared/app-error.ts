export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'TOO_MANY_REQUESTS'
  // An outside service (Nova Poshta) failed or did not answer.
  | 'BAD_GATEWAY';

export type ErrorDetail = {
  path: string;
  message: string;
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details: ErrorDetail[] | undefined;

  constructor(code: AppErrorCode, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}
