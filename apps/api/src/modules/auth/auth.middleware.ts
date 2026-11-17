import type { Request, RequestHandler, Response } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/app-error.js';
import { readCookie, SESSION_COOKIE, writeSessionCookie } from '../../shared/http/cookies.js';
import type { Session, SessionStatus } from './session.model.js';
import { type ClientInfo, SESSION_TTL_MS, sessionService } from './session.service.js';
import type { User } from './user.model.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ADMIN_ORIGIN = new URL(env.ADMIN_URL).origin;

export const clientInfo = (req: Request): ClientInfo => ({
  userAgent: req.get('user-agent'),
  ip: req.ip,
});

// A state-changing request from a browser must come from the admin's own address (the cookie is
// SameSite=Lax already; this is the second lock). req.host honours X-Forwarded-Host from trusted
// proxies, so requests made through the admin's Next.js server pass too.
export const verifyOrigin: RequestHandler = (req, _res, next) => {
  const origin = req.get('origin');
  const allowed = origin === ADMIN_ORIGIN || origin === `${req.protocol}://${req.host}`;

  if (UNSAFE_METHODS.has(req.method) && origin && !allowed) {
    throw new AppError('FORBIDDEN', 'Request origin is not allowed');
  }

  next();
};

export const loadSession: RequestHandler = async (req, res, next) => {
  const token = readCookie(req, SESSION_COOKIE);
  const auth = await sessionService.authenticate(token);

  if (auth) {
    res.locals.session = auth.session;
    res.locals.user = auth.user;
  }

  if (token && auth?.renewed) {
    writeSessionCookie(res, token, SESSION_TTL_MS);
  }

  next();
};

export const getSession = (res: Response): Session => {
  const { session } = res.locals;

  if (!session) {
    throw new AppError('UNAUTHORIZED', 'Not signed in');
  }

  return session;
};

export const getUser = (res: Response): User => {
  const { user } = res.locals;

  if (!user) {
    throw new AppError('UNAUTHORIZED', 'Not signed in');
  }

  return user;
};

export const requireSessionStatus =
  (...statuses: SessionStatus[]): RequestHandler =>
  (_req, res, next) => {
    const session = getSession(res);

    if (!statuses.includes(session.status)) {
      throw new AppError(
        'FORBIDDEN',
        session.status === 'active'
          ? 'This step is not available for the current session'
          : 'Complete two-factor authentication first',
        [{ path: 'session', message: session.status }],
      );
    }

    next();
  };

export const requireActiveSession = requireSessionStatus('active');
