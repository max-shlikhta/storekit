import { z } from 'zod';
import { paginationSchema } from '../../shared/http/pagination.js';
import {
  costPriceMinor,
  multilineText,
  nonEmptyPatch,
  priceMinor,
  sku,
  text,
  uuid,
} from '../../shared/schemas.js';
import { initialStock } from '../inventory/inventory.schema.js';
import { PRODUCT_STATUSES } from './product.types.js';

export const createProductSchema = z.strictObject({
  title: text(255),
  description: multilineText(5000).nullish(),
  categoryId: uuid.nullish(),
});

// Status goes through its own rules (a product needs an active variant to go on sale).
export const updateProductSchema = z
  .strictObject({
    title: text(255),
    description: multilineText(5000).nullable(),
    categoryId: uuid.nullable(),
    status: z.enum(PRODUCT_STATUSES),
  })
  .partial()
  .refine(nonEmptyPatch, 'At least one field is required');

export const listProductsSchema = paginationSchema.extend({
  status: z.enum(PRODUCT_STATUSES).optional(),
  categoryId: uuid.optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export const createVariantSchema = z.strictObject({
  sku,
  title: text(100),
  priceMinor,
  costPriceMinor: costPriceMinor.nullish(),
  allowBackorder: z.boolean().optional(),
  initialStock: initialStock.optional(),
});

export const updateVariantSchema = z
  .strictObject({
    sku,
    title: text(100),
    priceMinor,
    costPriceMinor: costPriceMinor.nullable(),
    allowBackorder: z.boolean(),
    isActive: z.boolean(),
  })
  .partial()
  .refine(nonEmptyPatch, 'At least one field is required');

export type CreateProductInput = z.output<typeof createProductSchema>;
export type UpdateProductInput = z.output<typeof updateProductSchema>;
export type ListProductsInput = z.output<typeof listProductsSchema>;
export type CreateVariantInput = z.output<typeof createVariantSchema>;
export type UpdateVariantInput = z.output<typeof updateVariantSchema>;
