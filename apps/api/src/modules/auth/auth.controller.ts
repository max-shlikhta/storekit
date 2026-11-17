import type { Request, Response } from 'express';
import { clearSessionCookie, writeSessionCookie } from '../../shared/http/cookies.js';
import { parseBody } from '../../shared/http/request.js';
import { clientInfo, getSession, getUser } from './auth.middleware.js';
import {
  changePasswordSchema,
  codeSchema,
  loginSchema,
  updateProfileSchema,
} from './auth.schema.js';
import { authService } from './auth.service.js';
import type { Session } from './session.model.js';
import { SESSION_TTL_MS } from './session.service.js';
import { twoFactorService } from './two-factor.service.js';
import type { User } from './user.model.js';

// Never returns the password hash or the 2FA secret.
export const toUserDto = (user: User) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  isActive: user.isActive,
  twoFactorEnabled: user.twoFactorEnabledAt !== null,
  twoFactorRequired: user.twoFactorRequired,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

const toSessionDto = (session: Session) => ({
  status: session.status,
  expiresAt: session.expiresAt,
});

export const authController = {
  login: async (req: Request, res: Response) => {
    const { email, password } = parseBody(req, loginSchema);
    const { token, session } = await authService.loginWithPassword(
      email,
      password,
      clientInfo(req),
    );

    writeSessionCookie(res, token, SESSION_TTL_MS);
    res.json({ data: { session: toSessionDto(session) } });
  },

  logout: async (_req: Request, res: Response) => {
    const { session } = res.locals;

    if (session) {
      await authService.logout(session);
    }

    clearSessionCookie(res);
    res.status(204).end();
  },

  logoutEverywhere: async (_req: Request, res: Response) => {
    await authService.logoutEverywhere(getSession(res));
    clearSessionCookie(res);
    res.status(204).end();
  },

  me: async (_req: Request, res: Response) => {
    const user = getUser(res);
    const session = getSession(res);
    const profile = session.status === 'active' ? await authService.getProfile(user) : undefined;

    res.json({
      data: {
        user: toUserDto(user),
        session: toSessionDto(session),
        stores:
          profile?.stores.map(({ store, role }) => ({
            id: store.id,
            slug: store.slug,
            name: store.name,
            currency: store.currency,
            role,
          })) ?? [],
        unusedRecoveryCodes: profile?.unusedRecoveryCodes ?? 0,
      },
    });
  },

  verifyTwoFactor: async (req: Request, res: Response) => {
    const { code } = parseBody(req, codeSchema);
    const session = getSession(res);
    await twoFactorService.verifySession(session, code);

    res.json({ data: { session: toSessionDto(session) } });
  },

  setupTwoFactor: async (_req: Request, res: Response) => {
    res.json({ data: await twoFactorService.setup(getUser(res).id) });
  },

  enableTwoFactor: async (req: Request, res: Response) => {
    const { code } = parseBody(req, codeSchema);
    const session = getSession(res);
    const recoveryCodes = await twoFactorService.enable(session, code);

    res.json({ data: { recoveryCodes, session: toSessionDto(session) } });
  },

  disableTwoFactor: async (req: Request, res: Response) => {
    const { code } = parseBody(req, codeSchema);
    await twoFactorService.disable(getUser(res).id, code);

    res.status(204).end();
  },

  regenerateRecoveryCodes: async (req: Request, res: Response) => {
    const { code } = parseBody(req, codeSchema);

    res.json({
      data: {
        recoveryCodes: await twoFactorService.regenerateRecoveryCodes(getUser(res).id, code),
      },
    });
  },

  changePassword: async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = parseBody(req, changePasswordSchema);
    await authService.changePassword(getUser(res), getSession(res), currentPassword, newPassword);

    res.status(204).end();
  },

  updateProfile: async (req: Request, res: Response) => {
    const input = parseBody(req, updateProfileSchema);
    const user = await authService.updateProfile(getUser(res), input);

    res.json({ data: toUserDto(user) });
  },
};
