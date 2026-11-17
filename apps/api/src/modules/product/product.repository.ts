import { Op, type Transaction, type WhereOptions } from 'sequelize';
import { Product } from '../../database/index.js';
import type { LockOptions } from '../../shared/database.js';
import { rethrowConstraintViolation } from '../../shared/database-errors.js';
import type { Pagination } from '../../shared/http/pagination.js';
import type { UpdateProductInput } from './product.schema.js';
import type { ProductListFilters } from './product.types.js';

const CONSTRAINTS = {
  products_store_id_category_id_fkey: {
    path: 'categoryId',
    message: 'Category not found in this store',
  },
  stock_movements_store_id_variant_id_fkey: {
    path: 'id',
    message: 'The product has stock history: archive it instead',
  },
  order_lines_store_id_variant_id_fkey: {
    path: 'id',
    message: 'The product is in orders: archive it instead',
  },
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

export const productRepository = {
  findAll: (storeId: string, filters: ProductListFilters, { limit, offset }: Pagination) => {
    const where: WhereOptions<Product> = {
      storeId,
      ...(filters.status && { status: filters.status }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.search && { title: { [Op.iLike]: `%${escapeLike(filters.search)}%` } }),
    };

    return Product.findAndCountAll({
      where,
      limit,
      offset,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    });
  },

  findById: (storeId: string, id: string, options?: LockOptions) =>
    Product.findOne({ where: { storeId, id }, ...options }),

  findByIds: (storeId: string, ids: string[], transaction?: Transaction) =>
    ids.length === 0
      ? Promise.resolve([])
      : Product.findAll({ where: { storeId, id: { [Op.in]: ids } }, transaction }),

  create: async (
    data: {
      storeId: string;
      title: string;
      description?: string | null;
      categoryId?: string | null;
    },
    transaction?: Transaction,
  ) => {
    try {
      return await Product.create(data, { transaction });
    } catch (error) {
      return rethrowConstraintViolation(error, CONSTRAINTS);
    }
  },

  update: async (product: Product, data: UpdateProductInput, transaction?: Transaction) => {
    try {
      return await product.update(data, { transaction });
    } catch (error) {
      return rethrowConstraintViolation(error, CONSTRAINTS);
    }
  },

  destroy: async (product: Product, transaction: Transaction) => {
    try {
      await product.destroy({ transaction });
    } catch (error) {
      rethrowConstraintViolation(error, CONSTRAINTS);
    }
  },
};
