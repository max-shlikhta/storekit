import { z } from 'zod';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
    throw error;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DB_LOGGING: z.stringbool().default(false),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).optional(),
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be at least 32 characters')
    .refine((value) => !value.startsWith('change-me'), 'Replace the AUTH_SECRET placeholder'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  COOKIE_SECURE: z.stringbool().optional(),
  // Express "trust proxy": which proxies may set X-Forwarded-For (hop count, address list or false)
  TRUST_PROXY: z
    .string()
    .trim()
    .default('loopback')
    .transform((value) => {
      if (value === 'false') {
        return false;
      }

      return /^\d+$/.test(value) ? Number(value) : value;
    }),
  // The admin's public address: the only browser origin allowed to change data.
  ADMIN_URL: z.url().transform((value) => value.replace(/\/+$/, '')),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
