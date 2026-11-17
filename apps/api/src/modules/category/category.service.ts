import { sequelize } from '../../database/index.js';
import { AppError } from '../../shared/app-error.js';
import { storeRepository } from '../store/store.repository.js';
import { categoryRepository, MAX_CATEGORIES } from './category.repository.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.schema.js';

const getCategory = async (storeId: string, categoryId: string) => {
  const category = await categoryRepository.findById(storeId, categoryId);

  if (!category) {
    throw new AppError('NOT_FOUND', 'Category not found');
  }

  return category;
};

export const categoryService = {
  getCategories: (storeId: string) => categoryRepository.findAll(storeId),

  getCategory,

  // The store row is locked, so two parallel requests cannot both slip past the limit.
  createCategory: (storeId: string, input: CreateCategoryInput) =>
    sequelize.transaction(async (transaction) => {
      await storeRepository.findById(storeId, { transaction, lock: true });

      if ((await categoryRepository.count(storeId, transaction)) >= MAX_CATEGORIES) {
        throw new AppError('CONFLICT', `A store can have at most ${MAX_CATEGORIES} categories`);
      }

      return categoryRepository.create(storeId, input, transaction);
    }),

  updateCategory: async (storeId: string, categoryId: string, input: UpdateCategoryInput) =>
    categoryRepository.update(await getCategory(storeId, categoryId), input),

  deleteCategory: async (storeId: string, categoryId: string) => {
    await categoryRepository.destroy(await getCategory(storeId, categoryId));
  },
};
