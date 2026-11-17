import { Router } from 'express';
import { requireStoreRole } from './store.context.js';
import { storeController } from './store.controller.js';

// Mounted at /stores: creating a store.
export const storeRouter = Router();

storeRouter.post('/', storeController.createStore);

// Mounted at /stores/:storeId, after storeContext.
export const storeItemRouter = Router();

storeItemRouter.get('/', storeController.getStore);
storeItemRouter.patch('/', requireStoreRole('owner'), storeController.updateStore);
