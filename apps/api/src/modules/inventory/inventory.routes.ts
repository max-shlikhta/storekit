import { Router } from 'express';
import { requireStoreRole } from '../store/store.context.js';
import { inventoryController } from './inventory.controller.js';

// Mounted at .../variants/:variantId, so the product and variant ids come from the parent.
export const inventoryRouter = Router({ mergeParams: true });

inventoryRouter.post(
  '/stock-adjustments',
  requireStoreRole('owner'),
  inventoryController.adjustStock,
);
inventoryRouter.get('/stock-movements', inventoryController.getMovements);
