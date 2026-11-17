import { z } from 'zod';
import { paginationSchema } from '../../shared/http/pagination.js';
import { nonEmptyPatch, phone, text } from '../../shared/schemas.js';

export const createCustomerSchema = z.strictObject({
  name: text(255),
  phone: phone.nullish(),
  note: text(1000).nullish(),
});

export const updateCustomerSchema = z
  .strictObject({
    name: text(255),
    phone: phone.nullable(),
    note: text(1000).nullable(),
  })
  .partial()
  .refine(nonEmptyPatch, 'At least one field is required');

export const listCustomersSchema = paginationSchema.extend({
  search: z.string().trim().min(1).max(100).optional(),
});

export type CreateCustomerInput = z.output<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.output<typeof updateCustomerSchema>;
