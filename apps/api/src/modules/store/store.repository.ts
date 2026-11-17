import { Op, type Transaction } from 'sequelize';
import { Store } from '../../database/index.js';
import type { LockOptions } from '../../shared/database.js';
import { rethrowConstraintViolation } from '../../shared/database-errors.js';
import type { CreateStoreInput, UpdateStoreInput } from './store.schema.js';

const UNIQUE_CONSTRAINTS = {
  stores_slug_key: { path: 'slug', message: 'Store with this slug already exists' },
};

export const storeRepository = {
  findById: (id: string, options?: LockOptions) => Store.findByPk(id, options),

  findByIds: (ids: string[]) =>
    ids.length === 0
      ? Promise.resolve([])
      : Store.findAll({ where: { id: { [Op.in]: ids } }, order: [['name', 'ASC']] }),

  create: async (data: CreateStoreInput, transaction?: Transaction) => {
    try {
      return await Store.create(data, { transaction });
    } catch (error) {
      return rethrowConstraintViolation(error, UNIQUE_CONSTRAINTS);
    }
  },

  update: (store: Store, data: UpdateStoreInput) => store.update(data),
};
