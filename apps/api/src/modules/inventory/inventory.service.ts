import type { Transaction } from 'sequelize';
import { type ProductVariant, sequelize } from '../../database/index.js';
import { AppError } from '../../shared/app-error.js';
import type { Pagination } from '../../shared/http/pagination.js';
import { MAX_STOCK_QUANTITY } from '../../shared/schemas.js';
import { productVariantRepository } from '../product/product-variant.repository.js';
import { lockVariant } from '../product/product.locks.js';
import { inventoryRepository } from './inventory.repository.js';
import { BACKORDER_REASONS, type StockAdjustmentInput } from './inventory.schema.js';
import type { StockAdjustment } from './stock-movement.types.js';

// Works out why the atomic update matched nothing, so the caller gets an exact error.
const rejectStockChange = async (
  { storeId, variantId, delta, errorPath = 'delta' }: StockAdjustment,
  transaction: Transaction,
) => {
  const current = await inventoryRepository.getStockOnHand(storeId, variantId, transaction);

  if (current === undefined) {
    return new AppError('NOT_FOUND', 'Variant not found');
  }

  if (Math.abs(current + delta) > MAX_STOCK_QUANTITY) {
    return new AppError('CONFLICT', 'Stock would exceed the allowed range', [
      { path: errorPath, message: `Stock must stay within ±${MAX_STOCK_QUANTITY}` },
    ]);
  }

  return new AppError('CONFLICT', 'Not enough stock', [
    { path: errorPath, message: 'Stock cannot go below zero for this variant and reason' },
  ]);
};

// The only way stock changes: the atomic update and its journal row commit or fail together.
export const applyStockChange = async (adjustment: StockAdjustment, transaction: Transaction) => {
  const { storeId, variantId, delta, reason, note, orderId } = adjustment;
  const quantityAfter = await inventoryRepository.applyDelta(
    {
      storeId,
      variantId,
      delta,
      allowBackorder: (BACKORDER_REASONS as readonly string[]).includes(reason),
      maxQuantity: MAX_STOCK_QUANTITY,
    },
    transaction,
  );

  if (quantityAfter === undefined) {
    throw await rejectStockChange(adjustment, transaction);
  }

  const movement = await inventoryRepository.recordMovement(
    {
      storeId,
      variantId,
      reason,
      delta,
      quantityAfter,
      note: note ?? null,
      orderId: orderId ?? null,
    },
    transaction,
  );

  return { movement, stockOnHand: quantityAfter };
};

export const applyInitialStock = async (
  storeId: string,
  variant: ProductVariant,
  quantity: number | undefined,
  transaction: Transaction,
) => {
  if (!quantity) {
    return;
  }

  await applyStockChange(
    { storeId, variantId: variant.id, delta: quantity, reason: 'initial' },
    transaction,
  );
  await variant.reload({ transaction });
};

export const inventoryService = {
  adjustStock: (
    storeId: string,
    productId: string,
    variantId: string,
    input: StockAdjustmentInput,
  ) =>
    sequelize.transaction(async (transaction) => {
      const variant = await lockVariant(storeId, productId, variantId, transaction);

      if (input.mode === 'set') {
        const delta = input.quantity - variant.stockOnHand;

        if (delta === 0) {
          return { movement: null, stockOnHand: variant.stockOnHand };
        }

        return applyStockChange(
          { storeId, variantId, delta, reason: 'stocktake', note: input.note },
          transaction,
        );
      }

      return applyStockChange(
        { storeId, variantId, delta: input.delta, reason: input.reason, note: input.note },
        transaction,
      );
    }),

  getMovements: async (
    storeId: string,
    productId: string,
    variantId: string,
    pagination: Pagination,
  ) => {
    if (!(await productVariantRepository.findById(storeId, productId, variantId))) {
      throw new AppError('NOT_FOUND', 'Variant not found');
    }

    return inventoryRepository.findMovements(storeId, variantId, pagination);
  },
};
