import { ForeignKeyConstraintError, UniqueConstraintError } from 'sequelize';
import { AppError, type AppErrorCode } from './app-error.js';

export type ConstraintMapping = {
  code?: AppErrorCode;
  path: string;
  message: string;
};

export const rethrowConstraintViolation = (
  error: unknown,
  constraints: Record<string, ConstraintMapping>,
): never => {
  if (error instanceof UniqueConstraintError || error instanceof ForeignKeyConstraintError) {
    const { constraint } = error.parent as { constraint?: string };
    const mapping = constraint ? constraints[constraint] : undefined;

    if (mapping) {
      throw new AppError(mapping.code ?? 'CONFLICT', mapping.message, [
        { path: mapping.path, message: mapping.message },
      ]);
    }

    if (error instanceof UniqueConstraintError) {
      throw new AppError('CONFLICT', 'Resource already exists');
    }
  }

  throw error;
};
