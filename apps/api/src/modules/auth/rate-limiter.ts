import { AppError, type AppErrorCode } from '../../shared/app-error.js';

const WINDOW_MS = 15 * 60 * 1000;

export type RateLimit = { key: string; max: number };

const failures = new Map<string, number[]>();
const inFlight = new Map<string, number>();
let lastSweepAt = 0;

const recent = (key: string, now: number) =>
  (failures.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);

const sweep = (now: number) => {
  if (now - lastSweepAt < WINDOW_MS) {
    return;
  }

  lastSweepAt = now;

  for (const key of failures.keys()) {
    if (recent(key, now).length === 0) {
      failures.delete(key);
    }
  }
};

const adjustInFlight = (keys: string[], delta: number) => {
  for (const key of keys) {
    const count = (inFlight.get(key) ?? 0) + delta;

    if (count > 0) {
      inFlight.set(key, count);
    } else {
      inFlight.delete(key);
    }
  }
};

export const failsWith =
  (code: AppErrorCode) =>
  (error: unknown): boolean =>
    error instanceof AppError && error.code === code;

export const loginRateLimiter = {
  // Attempts in progress count against the limit, so parallel requests cannot all slip past the check.
  run: async <T>(
    limits: RateLimit[],
    task: () => Promise<T>,
    isFailure: (error: unknown) => boolean,
    resetOnSuccess: string[] = [],
  ): Promise<T> => {
    const now = Date.now();
    sweep(now);

    if (limits.some(({ key, max }) => recent(key, now).length + (inFlight.get(key) ?? 0) >= max)) {
      throw new AppError('TOO_MANY_REQUESTS', 'Too many failed attempts: try again in 15 minutes');
    }

    const keys = limits.map(({ key }) => key);
    adjustInFlight(keys, 1);

    try {
      const result = await task();

      for (const key of resetOnSuccess) {
        failures.delete(key);
      }

      return result;
    } catch (error) {
      if (isFailure(error)) {
        const failedAt = Date.now();

        for (const key of keys) {
          failures.set(key, [...recent(key, failedAt), failedAt]);
        }
      }

      throw error;
    } finally {
      adjustInFlight(keys, -1);
    }
  },

  clear: () => {
    failures.clear();
    inFlight.clear();
  },
};
