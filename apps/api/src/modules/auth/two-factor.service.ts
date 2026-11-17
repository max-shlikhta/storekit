import { randomBytes } from 'node:crypto';
import type { Transaction } from 'sequelize';
import { sequelize } from '../../database/index.js';
import { AppError } from '../../shared/app-error.js';
import { logger, serializeError } from '../../shared/logger.js';
import { decrypt, encrypt, sha256 } from '../../shared/security/secret-box.js';
import {
  generateTotpSecret,
  isTotpCode,
  matchTotpStep,
  totpUri,
} from '../../shared/security/totp.js';
import { failsWith, loginRateLimiter } from './rate-limiter.js';
import type { Session } from './session.model.js';
import { sessionService } from './session.service.js';
import type { User } from './user.model.js';
import { userRepository } from './user.repository.js';

const ISSUER = 'Storekit';
const RECOVERY_CODE_COUNT = 10;
const MAX_CODE_FAILURES = 5;

const normalizeRecoveryCode = (code: string) => code.replace(/[\s-]/g, '').toLowerCase();

const generateRecoveryCodes = () =>
  Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const raw = randomBytes(5).toString('hex');
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });

const invalidCode = () =>
  new AppError('VALIDATION_ERROR', 'Invalid verification code', [
    { path: 'code', message: 'Invalid verification code' },
  ]);

// Every code check shares one per-user budget, so a stolen session cannot brute-force codes either.
const limitCodeAttempts = <T>(userId: string, task: () => Promise<T>) => {
  const key = `2fa:${userId}`;
  return loginRateLimiter.run(
    [{ key, max: MAX_CODE_FAILURES }],
    task,
    failsWith('VALIDATION_ERROR'),
    [key],
  );
};

const readSecret = (user: User) => {
  try {
    return user.twoFactorSecret ? decrypt(user.twoFactorSecret) : undefined;
  } catch (error) {
    logger.error('Cannot decrypt two-factor secret', {
      userId: user.id,
      error: serializeError(error),
    });
    return undefined;
  }
};

const verifyTotp = async (user: User, code: string, transaction: Transaction) => {
  const secret = isTotpCode(code) ? readSecret(user) : undefined;

  if (!secret) {
    return false;
  }

  const step = matchTotpStep(secret, code);

  if (
    step === undefined ||
    (user.twoFactorLastStep !== null && step <= Number(user.twoFactorLastStep))
  ) {
    return false;
  }

  await userRepository.update(user, { twoFactorLastStep: String(step) }, transaction);
  return true;
};

const verifyCode = async (user: User, code: string, transaction: Transaction) =>
  (await verifyTotp(user, code, transaction)) ||
  (user.twoFactorEnabledAt !== null &&
    (await userRepository.useRecoveryCode(
      user.id,
      sha256(normalizeRecoveryCode(code)),
      transaction,
    )));

const lockUser = async (userId: string, transaction: Transaction) => {
  const user = await userRepository.findById(userId, { transaction, lock: true });

  if (!user) {
    throw new AppError('UNAUTHORIZED', 'Not signed in');
  }

  return user;
};

const issueRecoveryCodes = async (userId: string, transaction: Transaction) => {
  const codes = generateRecoveryCodes();
  await userRepository.replaceRecoveryCodes(
    userId,
    codes.map((code) => sha256(normalizeRecoveryCode(code))),
    transaction,
  );

  return codes;
};

export const twoFactorService = {
  verifySession: (session: Session, code: string) =>
    limitCodeAttempts(session.userId, () =>
      sequelize.transaction(async (transaction) => {
        if (session.status !== 'two_factor_pending') {
          throw new AppError('CONFLICT', 'Two-factor verification is not pending');
        }

        const user = await lockUser(session.userId, transaction);

        if (!(await verifyCode(user, code, transaction))) {
          throw invalidCode();
        }

        await sessionService.activate(session, transaction);
      }),
    ),

  setup: (userId: string) =>
    sequelize.transaction(async (transaction) => {
      const user = await lockUser(userId, transaction);

      if (user.twoFactorEnabledAt) {
        throw new AppError('CONFLICT', 'Two-factor authentication is already enabled');
      }

      const secret = generateTotpSecret();
      await userRepository.update(
        user,
        { twoFactorSecret: encrypt(secret), twoFactorLastStep: null },
        transaction,
      );

      return { secret, otpauthUri: totpUri(secret, user.email, ISSUER) };
    }),

  enable: (session: Session, code: string) =>
    sequelize.transaction(async (transaction) => {
      const user = await lockUser(session.userId, transaction);

      if (user.twoFactorEnabledAt) {
        throw new AppError('CONFLICT', 'Two-factor authentication is already enabled');
      }

      if (!user.twoFactorSecret) {
        throw new AppError('CONFLICT', 'Start the two-factor setup first');
      }

      if (!(await verifyTotp(user, code, transaction))) {
        throw invalidCode();
      }

      await userRepository.update(user, { twoFactorEnabledAt: new Date() }, transaction);
      const recoveryCodes = await issueRecoveryCodes(user.id, transaction);

      if (session.status === 'two_factor_setup_required') {
        await sessionService.activate(session, transaction);
      }

      return recoveryCodes;
    }),

  disable: (userId: string, code: string) =>
    limitCodeAttempts(userId, () =>
      sequelize.transaction(async (transaction) => {
        const user = await lockUser(userId, transaction);

        if (!user.twoFactorEnabledAt) {
          throw new AppError('CONFLICT', 'Two-factor authentication is not enabled');
        }

        if (user.twoFactorRequired) {
          throw new AppError('FORBIDDEN', 'Two-factor authentication is required for this account');
        }

        if (!(await verifyCode(user, code, transaction))) {
          throw invalidCode();
        }

        await userRepository.update(
          user,
          { twoFactorSecret: null, twoFactorEnabledAt: null, twoFactorLastStep: null },
          transaction,
        );
        await userRepository.deleteRecoveryCodes(user.id, transaction);
      }),
    ),

  regenerateRecoveryCodes: (userId: string, code: string) =>
    limitCodeAttempts(userId, () =>
      sequelize.transaction(async (transaction) => {
        const user = await lockUser(userId, transaction);

        if (!user.twoFactorEnabledAt) {
          throw new AppError('CONFLICT', 'Two-factor authentication is not enabled');
        }

        if (!(await verifyTotp(user, code, transaction))) {
          throw invalidCode();
        }

        return issueRecoveryCodes(user.id, transaction);
      }),
    ),
};
