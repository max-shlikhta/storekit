import type { Transaction } from 'sequelize';
import { Category } from '../../database/index.js';
import { rethrowConstraintViolation } from '../../shared/database-errors.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.schema.js';

export const MAX_CATEGORIES = 200;

// Named in the migration; a violation becomes a 409 that names the field.
const CONSTRAINTS = {
  categories_store_id_lower_name_key: {
    path: 'name',
    message: 'Category with this name already exists in the store',
  },
  products_store_id_category_id_fkey: {
    path: 'categoryId',
    message: 'Category has products: move them to another category first',
  },
};

// Every read takes the store first and filters by it: another store's rows are never reachable.
export const categoryRepository = {
  findAll: (storeId: string) =>
    Category.findAll({
      where: { storeId },
      order: [
        ['position', 'ASC'],
        ['name', 'ASC'],
        ['id', 'ASC'],
      ],
      limit: MAX_CATEGORIES,
    }),

  findById: (storeId: string, id: string) => Category.findOne({ where: { storeId, id } }),

  count: (storeId: string, transaction: Transaction) =>
    Category.count({ where: { storeId }, transaction }),

  create: async (storeId: string, data: CreateCategoryInput, transaction: Transaction) => {
    try {
      return await Category.create({ ...data, storeId }, { transaction });
    } catch (error) {
      return rethrowConstraintViolation(error, CONSTRAINTS);
    }
  },

  update: async (category: Category, data: UpdateCategoryInput) => {
    try {
      return await category.update(data);
    } catch (error) {
      return rethrowConstraintViolation(error, CONSTRAINTS);
    }
  },

  destroy: async (category: Category) => {
    try {
      await category.destroy();
    } catch (error) {
      rethrowConstraintViolation(error, CONSTRAINTS);
    }
  },
};
