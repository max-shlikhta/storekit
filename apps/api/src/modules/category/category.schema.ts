import { z } from 'zod';
import { nonEmptyPatch, position, text } from '../../shared/schemas.js';

export const createCategorySchema = z.strictObject({
  name: text(100),
  position: position.optional(),
});

// PATCH schemas carry no defaults: a missing field means "leave it as it is".
export const updateCategorySchema = z
  .strictObject({
    name: text(100),
    position,
  })
  .partial()
  .refine(nonEmptyPatch, 'At least one field is required');

export type CreateCategoryInput = z.output<typeof createCategorySchema>;
export type UpdateCategoryInput = z.output<typeof updateCategorySchema>;
