import type { RequestHandler, Response } from 'express';
import { AppError } from '../../shared/app-error.js';
import { parseId } from '../../shared/http/request.js';
import { getUser } from '../auth/auth.middleware.js';
import type { Store } from './store.model.js';
import { storeService } from './store.service.js';
import type { StoreRole } from './store.types.js';

// Everything under /stores/:storeId passes through here: from this point the store is the one
// the signed-in user belongs to, never one taken from a request body.
export const storeContext: RequestHandler = async (req, res, next) => {
  const storeId = parseId(req.params.storeId, 'Store');
  const { store, role } = await storeService.getAccessibleStore(storeId, getUser(res));

  res.locals.store = store;
  res.locals.storeRole = role;
  next();
};

export const getStore = (res: Response): Store => {
  const { store } = res.locals;

  if (!store) {
    throw new Error('Store context is missing: the route must be mounted after storeContext');
  }

  return store;
};

// Purchase prices are the owner's business: staff neither see nor set them.
export const canSeeCosts = (res: Response) => res.locals.storeRole === 'owner';

export const assertCanSetCosts = (res: Response, ...values: unknown[]) => {
  if (!canSeeCosts(res) && values.some((value) => value !== undefined)) {
    throw new AppError('FORBIDDEN', 'Only the owner can set purchase prices');
  }
};

export const requireStoreRole =
  (...roles: StoreRole[]): RequestHandler =>
  (_req, res, next) => {
    if (!res.locals.storeRole || !roles.includes(res.locals.storeRole)) {
      throw new AppError('FORBIDDEN', 'Your role in this store does not allow this action');
    }

    next();
  };
