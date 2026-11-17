import type { Transaction } from 'sequelize';
import { env } from '../../config/env.js';
import { randomToken, sha256 } from '../../shared/security/secret-box.js';
import type { SessionStatus } from './session.model.js';
import { sessionRepository } from './session.repository.js';
import type { User } from './user.model.js';
import { userRepository } from './user.repository.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const PENDING_TTL_MS = 10 * 60 * 1000;
const RENEW_AFTER_MS = 60 * 60 * 1000;

export const SESSION_TTL_MS = env.SESSION_TTL_DAYS * DAY_MS;

export type ClientInfo = {
  userAgent?: string | undefined;
  ip?: string | undefined;
};

export const sessionStatusFor = (user: User): SessionStatus => {
  if (user.twoFactorEnabledAt) {
    return 'two_factor_pending';
  }

  return user.twoFactorRequired ? 'two_factor_setup_required' : 'active';
};

const expiryFor = (status: SessionStatus, now = Date.now()) =>
  new Date(now + (status === 'active' ? SESSION_TTL_MS : PENDING_TTL_MS));

export const sessionService = {
  create: async (user: User, client: ClientInfo, transaction?: Transaction) => {
    const token = randomToken();
    const status = sessionStatusFor(user);
    const session = await sessionRepository.create(
      {
        userId: user.id,
        tokenHash: sha256(token),
        status,
        userAgent: client.userAgent?.slice(0, 255) ?? null,
        ip: client.ip?.slice(0, 64) ?? null,
        expiresAt: expiryFor(status),
      },
      transaction,
    );

    return { token, session };
  },

  authenticate: async (token: string | undefined) => {
    if (!token) {
      return undefined;
    }

    const session = await sessionRepository.findByTokenHash(sha256(token));

    if (!session) {
      return undefined;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await sessionRepository.destroy(session);
      return undefined;
    }

    const user = await userRepository.findById(session.userId);

    if (!user?.isActive) {
      return undefined;
    }

    const mustSetUpTwoFactor = user.twoFactorRequired && !user.twoFactorEnabledAt;
    let renewed = false;

    if (session.status === 'active' && mustSetUpTwoFactor) {
      await sessionRepository.update(session, {
        status: 'two_factor_setup_required',
        expiresAt: expiryFor('two_factor_setup_required'),
      });
    } else if (session.status === 'two_factor_setup_required' && !mustSetUpTwoFactor) {
      // 2FA was set up on another device or is no longer required: continue from the right step.
      const status = user.twoFactorEnabledAt ? 'two_factor_pending' : 'active';
      await sessionRepository.update(session, {
        status,
        expiresAt: expiryFor(status),
        lastUsedAt: new Date(),
      });
      renewed = status === 'active';
    } else if (
      session.status === 'active' &&
      Date.now() - session.lastUsedAt.getTime() > RENEW_AFTER_MS
    ) {
      await sessionRepository.update(session, {
        lastUsedAt: new Date(),
        expiresAt: expiryFor('active'),
      });
      renewed = true;
    }

    return { session, user, renewed };
  },

  purgeExpired: () => sessionRepository.destroyExpired(),

  activate: (session: Parameters<typeof sessionRepository.update>[0], transaction?: Transaction) =>
    sessionRepository.update(
      session,
      { status: 'active', expiresAt: expiryFor('active'), lastUsedAt: new Date() },
      transaction,
    ),
};
