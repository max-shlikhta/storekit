import type { Request, Response } from 'express';
import { parseBody } from '../../shared/http/request.js';
import { getUser } from '../auth/auth.middleware.js';
import { getStore } from './store.context.js';
import type { Store } from './store.model.js';
import { createStoreSchema, updateStoreSchema } from './store.schema.js';
import { storeService } from './store.service.js';

export const toStoreDto = (store: Store) => ({
  id: store.id,
  slug: store.slug,
  name: store.name,
  isActive: store.isActive,
  currency: store.currency,
  createdAt: store.createdAt,
  updatedAt: store.updatedAt,
});

export const storeController = {
  getStore: (_req: Request, res: Response) => {
    res.json({ data: toStoreDto(getStore(res)) });
  },

  createStore: async (req: Request, res: Response) => {
    const input = parseBody(req, createStoreSchema);
    const store = await storeService.createStore(getUser(res), input);

    res.status(201).json({ data: toStoreDto(store) });
  },

  updateStore: async (req: Request, res: Response) => {
    const input = parseBody(req, updateStoreSchema);
    const store = await storeService.updateStore(getStore(res), input);

    res.json({ data: toStoreDto(store) });
  },
};
