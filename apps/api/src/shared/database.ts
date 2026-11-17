import type { FindOptions, Transaction } from 'sequelize';

export type LockOptions = {
  transaction: Transaction;
  lock: NonNullable<FindOptions['lock']>;
};
