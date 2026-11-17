import { z } from 'zod';
import { nonEmptyPatch, text } from '../../shared/schemas.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Slugs that would shadow the admin's own pages.
const RESERVED_SLUGS = new Set(['api', 'login', 'logout', 'settings', 'health', 'stores']);

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(63)
  .regex(SLUG_PATTERN, 'Use lowercase letters, digits and "-"')
  .refine((value) => !RESERVED_SLUGS.has(value), 'This address is reserved');

const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Use a three-letter currency code');

export const createStoreSchema = z.strictObject({
  slug,
  name: text(255),
  currency: currency.optional(),
});

export const updateStoreSchema = z
  .strictObject({
    name: text(255),
    isActive: z.boolean(),
  })
  .partial()
  .refine(nonEmptyPatch, 'Pass at least one field');

export type CreateStoreInput = z.output<typeof createStoreSchema>;
export type UpdateStoreInput = z.output<typeof updateStoreSchema>;
