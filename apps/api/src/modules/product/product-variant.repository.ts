import { Op, type CreationAttributes, type Transaction } from 'sequelize';
import { ProductVariant } from '../../database/index.js';
import type { LockOptions } from '../../shared/database.js';
import { rethrowConstraintViolation } from '../../shared/database-errors.js';
import type { UpdateVariantInput } from './product.schema.js';

const CONSTRAINTS = {
  product_variants_store_id_sku_key: {
    path: 'sku',
    message: 'Variant with this SKU already exists in the store',
  },
};

const ORDER: [string, string][] = [
  ['createdAt', 'ASC'],
  ['id', 'ASC'],
];

export const productVariantRepository = {
  findByProduct: (storeId: string, productId: string, transaction?: Transaction) =>
    ProductVariant.findAll({ where: { storeId, productId }, order: ORDER, transaction }),

  findByProducts: (storeId: string, productIds: string[]) =>
    productIds.length === 0
      ? Promise.resolve([])
      : ProductVariant.findAll({
          where: { storeId, productId: { [Op.in]: productIds } },
          order: ORDER,
        }),

  // Locked in ascending id order, the platform-wide lock order, so two orders never deadlock.
  lockByIds: (storeId: string, ids: string[], transaction: Transaction) =>
    ids.length === 0
      ? Promise.resolve([])
      : ProductVariant.findAll({
          where: { storeId, id: { [Op.in]: ids } },
          order: [['id', 'ASC']],
          transaction,
          lock: true,
        }),

  findById: (storeId: string, productId: string, id: string, options?: LockOptions) =>
    ProductVariant.findOne({ where: { storeId, productId, id }, ...options }),

  countActive: (storeId: string, productId: string, transaction: Transaction) =>
    ProductVariant.count({ where: { storeId, productId, isActive: true }, transaction }),

  create: async (data: CreationAttributes<ProductVariant>, transaction: Transaction) => {
    try {
      return await ProductVariant.create(data, { transaction });
    } catch (error) {
      return rethrowConstraintViolation(error, CONSTRAINTS);
    }
  },

  update: async (variant: ProductVariant, data: UpdateVariantInput, transaction: Transaction) => {
    try {
      return await variant.update(data, { transaction });
    } catch (error) {
      return rethrowConstraintViolation(error, CONSTRAINTS);
    }
  },
};
