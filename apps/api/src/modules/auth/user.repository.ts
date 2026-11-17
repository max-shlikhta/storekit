import type { CreationAttributes, Transaction } from 'sequelize';
import { RecoveryCode, User } from '../../database/index.js';
import type { LockOptions } from '../../shared/database.js';
import { rethrowConstraintViolation } from '../../shared/database-errors.js';

const CONSTRAINTS = {
  users_email_key: { path: 'email', message: 'User with this email already exists' },
};

export const userRepository = {
  findById: (id: string, options?: LockOptions) => User.findOne({ where: { id }, ...options }),

  findByEmail: (email: string) => User.findOne({ where: { email } }),

  create: async (data: CreationAttributes<User>, transaction?: Transaction) => {
    try {
      return await User.create(data, { transaction });
    } catch (error) {
      return rethrowConstraintViolation(error, CONSTRAINTS);
    }
  },

  update: async (
    user: User,
    data: Partial<CreationAttributes<User>>,
    transaction?: Transaction,
  ) => {
    try {
      return await user.update(data, { transaction });
    } catch (error) {
      return rethrowConstraintViolation(error, CONSTRAINTS);
    }
  },

  replaceRecoveryCodes: async (userId: string, codeHashes: string[], transaction: Transaction) => {
    await RecoveryCode.destroy({ where: { userId }, transaction });
    await RecoveryCode.bulkCreate(
      codeHashes.map((codeHash) => ({ userId, codeHash })),
      { transaction },
    );
  },

  deleteRecoveryCodes: (userId: string, transaction: Transaction) =>
    RecoveryCode.destroy({ where: { userId }, transaction }),

  useRecoveryCode: async (userId: string, codeHash: string, transaction: Transaction) => {
    const [count] = await RecoveryCode.update(
      { usedAt: new Date() },
      { where: { userId, codeHash, usedAt: null }, transaction },
    );

    return count === 1;
  },

  countUnusedRecoveryCodes: (userId: string) =>
    RecoveryCode.count({ where: { userId, usedAt: null } }),
};
