import type { Transaction } from 'sequelize';
import { AppError } from '../../shared/app-error.js';
import { productVariantRepository } from './product-variant.repository.js';
import { productRepository } from './product.repository.js';

// Read, check, write: the row is locked for the transaction so the check cannot go stale.
export const lockProduct = async (storeId: string, productId: string, transaction: Transaction) => {
  const product = await productRepository.findById(storeId, productId, { transaction, lock: true });

  if (!product) {
    throw new AppError('NOT_FOUND', 'Product not found');
  }

  return product;
};

export const lockVariant = async (
  storeId: string,
  productId: string,
  variantId: string,
  transaction: Transaction,
) => {
  const variant = await productVariantRepository.findById(storeId, productId, variantId, {
    transaction,
    lock: true,
  });

  if (!variant) {
    throw new AppError('NOT_FOUND', 'Variant not found');
  }

  return variant;
};
