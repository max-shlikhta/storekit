import { QueryTypes, type Transaction } from 'sequelize';
import { ProductVariant, sequelize, StockMovement } from '../../database/index.js';
import type { Pagination } from '../../shared/http/pagination.js';
import type { StockChange, StockMovementReason } from './stock-movement.types.js';

export const inventoryRepository = {
  // One atomic UPDATE ... RETURNING: it only matches while the result stays inside the allowed
  // range, so two parallel sales can never both take the last unit. No row back means refused.
  applyDelta: async (
    { storeId, variantId, delta, allowBackorder, maxQuantity }: StockChange,
    transaction: Transaction,
  ) => {
    const rows = await sequelize.query<{ stock_on_hand: number }>(
      `UPDATE product_variants
          SET stock_on_hand = stock_on_hand + :delta, updated_at = CURRENT_TIMESTAMP
        WHERE store_id = :storeId
          AND id = :variantId
          AND stock_on_hand + :delta BETWEEN :minQuantity AND :maxQuantity
          AND (:delta > 0 OR stock_on_hand + :delta >= 0 OR (:allowBackorder AND allow_backorder))
       RETURNING stock_on_hand`,
      {
        replacements: {
          storeId,
          variantId,
          delta,
          allowBackorder,
          maxQuantity,
          minQuantity: -maxQuantity,
        },
        type: QueryTypes.SELECT,
        transaction,
      },
    );

    return rows[0]?.stock_on_hand;
  },

  getStockOnHand: async (storeId: string, variantId: string, transaction: Transaction) =>
    (
      await ProductVariant.findOne({
        where: { storeId, id: variantId },
        attributes: ['stockOnHand'],
        transaction,
      })
    )?.stockOnHand,

  recordMovement: (
    data: {
      storeId: string;
      variantId: string;
      reason: StockMovementReason;
      delta: number;
      quantityAfter: number;
      note: string | null;
      orderId: string | null;
    },
    transaction: Transaction,
  ) => StockMovement.create(data, { transaction }),

  findMovements: (storeId: string, variantId: string, { limit, offset }: Pagination) =>
    StockMovement.findAndCountAll({
      where: { storeId, variantId },
      limit,
      offset,
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
    }),
};
