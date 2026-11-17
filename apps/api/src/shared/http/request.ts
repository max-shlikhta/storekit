import type { Request } from 'express';
import type { z } from 'zod';
import { AppError } from '../app-error.js';
import { uuid } from '../schemas.js';

export const formatZodIssues = (error: z.ZodError) =>
  error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));

export const parseInput = <T extends z.ZodType>(schema: T, value: unknown): z.output<T> => {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 'Invalid request', formatZodIssues(result.error));
  }

  return result.data;
};

export const parseBody = <T extends z.ZodType>(req: Request, schema: T): z.output<T> => {
  if (req.body === undefined) {
    throw new AppError('VALIDATION_ERROR', 'Request body must be a JSON object');
  }

  return parseInput(schema, req.body);
};

const idSchema = uuid;

export const parseId = (value: unknown, resource: string) => {
  const result = idSchema.safeParse(value);

  if (!result.success) {
    throw new AppError('NOT_FOUND', `${resource} not found`);
  }

  return result.data;
};
