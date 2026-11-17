import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env.js';

export const SESSION_COOKIE = 'storekit_session';

const secure = env.COOKIE_SECURE ?? env.NODE_ENV === 'production';

export const readCookie = (req: Request, name: string) => {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const separator = part.indexOf('=');

    if (separator > 0 && part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
};

const cookieOptions = (maxAgeMs?: number): CookieOptions => ({
  httpOnly: true,
  secure,
  sameSite: 'lax',
  path: '/',
  ...(maxAgeMs !== undefined && { maxAge: maxAgeMs }),
});

export const writeSessionCookie = (res: Response, token: string, maxAgeMs: number) => {
  res.cookie(SESSION_COOKIE, token, cookieOptions(maxAgeMs));
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
};
