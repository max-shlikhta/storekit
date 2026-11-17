import type { Request, Response } from 'express';
import { paginationSchema } from '../../shared/http/pagination.js';
import { parseBody, parseId, parseInput } from '../../shared/http/request.js';
import { getStore } from '../store/store.context.js';
import { stockAdjustmentSchema } from './inventory.schema.js';
import { inventoryService } from './inventory.service.js';
import type { StockMovement } from './stock-movement.model.js';

const toMovementDto = (movement: StockMovement) => ({
  id: movement.id,
  variantId: movement.variantId,
  reason: movement.reason,
  delta: movement.delta,
  quantityAfter: movement.quantityAfter,
  note: movement.note,
  orderId: movement.orderId,
  createdAt: movement.createdAt,
});

const parseVariantParams = (req: Request) => ({
  productId: parseId(req.params.productId, 'Product'),
  variantId: parseId(req.params.variantId, 'Variant'),
});

export const inventoryController = {
  adjustStock: async (req: Request, res: Response) => {
    const { productId, variantId } = parseVariantParams(req);
    const input = parseBody(req, stockAdjustmentSchema);
    const { movement, stockOnHand } = await inventoryService.adjustStock(
      getStore(res).id,
      productId,
      variantId,
      input,
    );

    res.status(movement ? 201 : 200).json({
      data: { movement: movement && toMovementDto(movement), stockOnHand },
    });
  },

  getMovements: async (req: Request, res: Response) => {
    const { productId, variantId } = parseVariantParams(req);
    const pagination = parseInput(paginationSchema, req.query);
    const { rows, count } = await inventoryService.getMovements(
      getStore(res).id,
      productId,
      variantId,
      pagination,
    );

    res.json({ data: rows.map(toMovementDto), meta: { total: count, ...pagination } });
  },
};
