import { sequelize } from '../../database/index.js';
import { AppError } from '../../shared/app-error.js';
import type { User } from '../auth/user.model.js';
import { storeMemberRepository } from './store-member.repository.js';
import type { Store } from './store.model.js';
import { storeRepository } from './store.repository.js';
import type { CreateStoreInput, UpdateStoreInput } from './store.schema.js';
import type { StoreRole } from './store.types.js';

// A store the user is not a member of is reported as missing, not forbidden: its existence is
// not their business.
const notFound = () => new AppError('NOT_FOUND', 'Store not found');

export const storeService = {
  getAccessibleStore: async (
    storeId: string,
    user: User,
  ): Promise<{ store: Store; role: StoreRole }> => {
    const member = await storeMemberRepository.find(storeId, user.id);
    const store = member ? await storeRepository.findById(storeId) : null;

    if (!member || !store) {
      throw notFound();
    }

    return { store, role: member.role };
  },

  // Whoever creates a store owns it.
  createStore: (user: User, input: CreateStoreInput) =>
    sequelize.transaction(async (transaction) => {
      const store = await storeRepository.create(input, transaction);
      await storeMemberRepository.create(store.id, user.id, 'owner', transaction);

      return store;
    }),

  updateStore: (store: Store, input: UpdateStoreInput) => storeRepository.update(store, input),
};
