import { env } from '../config/env.js';

type Level = 'debug' | 'info' | 'warn' | 'error';
type Context = Record<string, unknown>;

const LEVEL_WEIGHTS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 } as const;
const DEFAULT_LEVELS = { development: 'debug', test: 'silent', production: 'info' } as const;

const threshold = LEVEL_WEIGHTS[env.LOG_LEVEL ?? DEFAULT_LEVELS[env.NODE_ENV]];

const format = (level: Level, message: string, context?: Context) => {
  const time = new Date().toISOString();

  if (env.NODE_ENV === 'production') {
    return JSON.stringify({ time, level, message, ...context });
  }

  const suffix = context ? ` ${JSON.stringify(context)}` : '';
  return `${time} ${level.toUpperCase().padEnd(5)} ${message}${suffix}`;
};

const write = (level: Level, message: string, context?: Context) => {
  if (LEVEL_WEIGHTS[level] < threshold) {
    return;
  }

  const line = format(level, message, context);

  if (level === 'warn' || level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
};

export const logger = {
  debug: (message: string, context?: Context) => {
    write('debug', message, context);
  },
  info: (message: string, context?: Context) => {
    write('info', message, context);
  },
  warn: (message: string, context?: Context) => {
    write('warn', message, context);
  },
  error: (message: string, context?: Context) => {
    write('error', message, context);
  },
};

export const serializeError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  const { code } = (error as { original?: { code?: unknown } }).original ?? {};

  // Network errors (fetch failed) keep the real reason, e.g. a TLS problem, in `cause`.
  const { cause } = error;

  return {
    name: error.name,
    message: error.message,
    ...(typeof code === 'string' && { code }),
    ...(cause !== undefined && {
      cause: cause instanceof Error ? `${cause.name}: ${cause.message}` : JSON.stringify(cause),
    }),
    stack: error.stack,
  };
};
