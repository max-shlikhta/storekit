import type { Session } from '../modules/auth/session.model.js';
import type { User } from '../modules/auth/user.model.js';
import type { Store } from '../modules/store/store.model.js';
import type { StoreRole } from '../modules/store/store.types.js';

declare global {
  namespace Express {
    interface Locals {
      requestId?: string;
      session?: Session;
      user?: User;
      store?: Store;
      storeRole?: StoreRole;
    }
  }
}

export {};
