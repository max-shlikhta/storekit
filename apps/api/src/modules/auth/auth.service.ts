import { sequelize } from '../../database/index.js';
import { AppError } from '../../shared/app-error.js';
import { hashPassword, verifyPassword } from '../../shared/security/password.js';
import { randomToken } from '../../shared/security/secret-box.js';
import { storeMemberRepository } from '../store/store-member.repository.js';
import { storeRepository } from '../store/store.repository.js';
import { failsWith, loginRateLimiter } from './rate-limiter.js';
import type { Session } from './session.model.js';
import { sessionRepository } from './session.repository.js';
import { type ClientInfo, sessionService } from './session.service.js';
import type { User } from './user.model.js';
import { userRepository } from './user.repository.js';

const MAX_FAILURES_PER_ACCOUNT = 5;
const MAX_FAILURES_PER_IP = 50;

let dummyHash: Promise<string> | undefined;

// Checked against when the email is unknown, so an unknown email takes as long as a wrong password.
const getDummyHash = () => (dummyHash ??= hashPassword(randomToken()));

const invalidCredentials = () =>
  new AppError('UNAUTHORIZED', 'Invalid email or password', [
    { path: 'email', message: 'Invalid email or password' },
  ]);

const verifyCurrentPassword = (user: User, currentPassword: string) => {
  const key = `password:${user.id}`;

  return loginRateLimiter.run(
    [{ key, max: MAX_FAILURES_PER_ACCOUNT }],
    async () => {
      if (!(await verifyPassword(currentPassword, user.passwordHash))) {
        throw new AppError('VALIDATION_ERROR', 'Current password is incorrect', [
          { path: 'currentPassword', message: 'Current password is incorrect' },
        ]);
      }
    },
    failsWith('VALIDATION_ERROR'),
    [key],
  );
};

export const authService = {
  loginWithPassword: (email: string, password: string, client: ClientInfo) => {
    const emailKey = `email:${email}`;

    return loginRateLimiter.run(
      [
        { key: emailKey, max: MAX_FAILURES_PER_ACCOUNT },
        { key: `ip:${client.ip ?? 'unknown'}`, max: MAX_FAILURES_PER_IP },
      ],
      async () => {
        const user = await userRepository.findByEmail(email);
        const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));

        if (!user || !valid || !user.isActive) {
          throw invalidCredentials();
        }

        await userRepository.update(user, { lastLoginAt: new Date() });
        return sessionService.create(user, client);
      },
      failsWith('UNAUTHORIZED'),
      [emailKey],
    );
  },

  logout: (session: Session) => sessionRepository.destroy(session),

  logoutEverywhere: (session: Session) => sessionRepository.destroyForUser(session.userId),

  // A new password ends every other session of the account.
  changePassword: async (
    user: User,
    session: Session,
    currentPassword: string,
    newPassword: string,
  ) => {
    await verifyCurrentPassword(user, currentPassword);

    const passwordHash = await hashPassword(newPassword);

    await sequelize.transaction(async (transaction) => {
      await userRepository.update(user, { passwordHash }, transaction);
      await sessionRepository.destroyForUser(user.id, session.id, transaction);
    });
  },

  updateProfile: (user: User, input: { name?: string | null }) =>
    userRepository.update(user, { ...(input.name !== undefined && { name: input.name }) }),

  getProfile: async (user: User) => {
    const memberships = await storeMemberRepository.findForUser(user.id);
    const stores = await storeRepository.findByIds(memberships.map(({ storeId }) => storeId));

    return {
      stores: stores.map((store) => ({
        store,
        role: memberships.find(({ storeId }) => storeId === store.id)?.role ?? 'staff',
      })),
      unusedRecoveryCodes: user.twoFactorEnabledAt
        ? await userRepository.countUnusedRecoveryCodes(user.id)
        : 0,
    };
  },
};
