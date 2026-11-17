import { z } from 'zod';
import { MAX_STOCK_QUANTITY, text } from '../../shared/schemas.js';

const quantity = z.number().int().min(-MAX_STOCK_QUANTITY).max(MAX_STOCK_QUANTITY);

export const INCREASE_REASONS = ['restock'] as const;
export const DECREASE_REASONS = ['write_off'] as const;
// Only a sale may take stock below zero, and only for a variant that allows backorder.
export const BACKORDER_REASONS = ['order'] as const;

export const stockAdjustmentSchema = z.discriminatedUnion('mode', [
  z
    .strictObject({
      mode: z.literal('delta'),
      delta: quantity.refine((value) => value !== 0, 'Delta must not be zero'),
      reason: z.enum([...INCREASE_REASONS, ...DECREASE_REASONS, 'correction']),
      note: text(500).nullish(),
    })
    .refine(
      ({ reason, delta }) => !(INCREASE_REASONS as readonly string[]).includes(reason) || delta > 0,
      { message: 'This reason requires a positive delta', path: ['delta'] },
    )
    .refine(
      ({ reason, delta }) => !(DECREASE_REASONS as readonly string[]).includes(reason) || delta < 0,
      { message: 'This reason requires a negative delta', path: ['delta'] },
    ),
  z.strictObject({
    mode: z.literal('set'),
    quantity: z.number().int().min(0).max(MAX_STOCK_QUANTITY),
    note: text(500).nullish(),
  }),
]);

export const initialStock = z.number().int().min(0).max(MAX_STOCK_QUANTITY);

export type StockAdjustmentInput = z.output<typeof stockAdjustmentSchema>;
