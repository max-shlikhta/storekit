import { sequelize } from '../../database/index.js';
import { AppError } from '../../shared/app-error.js';
import type { Pagination } from '../../shared/http/pagination.js';
import { applyInitialStock } from '../inventory/inventory.service.js';
import { categoryRepository } from '../category/category.repository.js';
import { productVariantRepository } from './product-variant.repository.js';
import { lockProduct, lockVariant } from './product.locks.js';
import { productRepository } from './product.repository.js';
import type {
  CreateProductInput,
  CreateVariantInput,
  UpdateProductInput,
  UpdateVariantInput,
} from './product.schema.js';
import type { ProductListFilters } from './product.types.js';

const assertCategory = async (storeId: string, categoryId: string | null | undefined) => {
  if (categoryId && !(await categoryRepository.findById(storeId, categoryId))) {
    throw new AppError('VALIDATION_ERROR', 'Category not found in this store', [
      { path: 'categoryId', message: 'Category not found in this store' },
    ]);
  }
};

export const productService = {
  getProducts: async (storeId: string, filters: ProductListFilters, pagination: Pagination) => {
    const { rows, count } = await productRepository.findAll(storeId, filters, pagination);
    const variants = await productVariantRepository.findByProducts(
      storeId,
      rows.map(({ id }) => id),
    );

    return { products: rows, variants, total: count };
  },

  getProduct: async (storeId: string, productId: string) => {
    const product = await productRepository.findById(storeId, productId);

    if (!product) {
      throw new AppError('NOT_FOUND', 'Product not found');
    }

    return { product, variants: await productVariantRepository.findByProduct(storeId, productId) };
  },

  createProduct: async (storeId: string, input: CreateProductInput) => {
    await assertCategory(storeId, input.categoryId);

    return productRepository.create({ storeId, ...input });
  },

  updateProduct: (storeId: string, productId: string, input: UpdateProductInput) =>
    sequelize.transaction(async (transaction) => {
      const product = await lockProduct(storeId, productId, transaction);

      await assertCategory(storeId, input.categoryId);

      // A product goes on sale only with at least one variant that can be sold.
      if (
        input.status === 'active' &&
        product.status !== 'active' &&
        (await productVariantRepository.countActive(storeId, productId, transaction)) === 0
      ) {
        throw new AppError('CONFLICT', 'Add an active variant before putting the product on sale', [
          { path: 'status', message: 'The product has no active variants' },
        ]);
      }

      return productRepository.update(product, input, transaction);
    }),

  // Only a draft that never had stock can be deleted; anything else is archived, because orders
  // and stock history refer to it.
  deleteProduct: (storeId: string, productId: string) =>
    sequelize.transaction(async (transaction) => {
      const product = await lockProduct(storeId, productId, transaction);

      if (product.status !== 'draft') {
        throw new AppError('CONFLICT', 'Only draft products can be deleted: archive it instead', [
          { path: 'status', message: 'Archive the product instead of deleting it' },
        ]);
      }

      await productRepository.destroy(product, transaction);
    }),

  createVariant: (storeId: string, productId: string, input: CreateVariantInput) =>
    sequelize.transaction(async (transaction) => {
      await lockProduct(storeId, productId, transaction);

      const { initialStock, ...fields } = input;
      const variant = await productVariantRepository.create(
        {
          ...fields,
          costPriceMinor: fields.costPriceMinor ?? null,
          storeId,
          productId,
        },
        transaction,
      );

      await applyInitialStock(storeId, variant, initialStock, transaction);

      return variant;
    }),

  updateVariant: (
    storeId: string,
    productId: string,
    variantId: string,
    input: UpdateVariantInput,
  ) =>
    sequelize.transaction(async (transaction) => {
      const product = await lockProduct(storeId, productId, transaction);
      const variant = await lockVariant(storeId, productId, variantId, transaction);

      // Switching off the last active variant of a product on sale would leave nothing to buy.
      if (
        input.isActive === false &&
        variant.isActive &&
        product.status === 'active' &&
        (await productVariantRepository.countActive(storeId, productId, transaction)) <= 1
      ) {
        throw new AppError('CONFLICT', 'A product on sale needs at least one active variant', [
          { path: 'isActive', message: 'Archive the product instead' },
        ]);
      }

      return productVariantRepository.update(variant, input, transaction);
    }),
};
