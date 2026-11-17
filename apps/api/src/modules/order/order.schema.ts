import { z } from 'zod';
import { paginationSchema } from '../../shared/http/pagination.js';
import { MAX_STOCK_QUANTITY, multilineText, phone, text, uuid } from '../../shared/schemas.js';
import { ORDER_STATUSES } from './order.types.js';

const orderLine = z.strictObject({
  variantId: uuid,
  quantity: z.number().int().min(1).max(MAX_STOCK_QUANTITY),
});

// Either a customer card or the name (and phone) of someone new; a known phone finds the card.
const customerInput = z.strictObject({ name: text(255), phone: phone.nullish() });

export const createOrderSchema = z
  .strictObject({
    customerId: uuid.optional(),
    customer: customerInput.optional(),
    lines: z
      .array(orderLine)
      .min(1)
      .max(100)
      .refine(
        (lines) => new Set(lines.map(({ variantId }) => variantId)).size === lines.length,
        'Each variant can appear in the order only once',
      ),
    discountMinor: z.number().int().min(0).max(2_000_000_000).optional(),
    note: multilineText(1000).nullish(),
  })
  .refine((value) => (value.customerId === undefined) !== (value.customer === undefined), {
    message: 'Pass either customerId or customer',
    path: ['customer'],
  });

export const changeStatusSchema = z
  .strictObject({
    status: z.enum(ORDER_STATUSES),
    reason: text(500).optional(),
  })
  .refine(({ status, reason }) => status !== 'cancelled' || reason !== undefined, {
    message: 'A reason is required to cancel an order',
    path: ['reason'],
  });

export const listOrdersSchema = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export type CreateOrderInput = z.output<typeof createOrderSchema>;
export type ChangeStatusInput = z.output<typeof changeStatusSchema>;
