import type { Transaction } from 'sequelize';
import { StoreMember, User } from '../../database/index.js';
import type { StoreRole } from './store.types.js';

export const storeMemberRepository = {
  find: (storeId: string, userId: string) => StoreMember.findOne({ where: { storeId, userId } }),

  findForStore: (storeId: string) =>
    StoreMember.findAll({
      where: { storeId },
      include: [{ model: User, as: 'user', required: true }],
      order: [
        ['role', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    }),

  findForUser: (userId: string) =>
    StoreMember.findAll({ where: { userId }, order: [['createdAt', 'ASC']] }),

  create: (storeId: string, userId: string, role: StoreRole, transaction?: Transaction) =>
    StoreMember.create({ storeId, userId, role }, { transaction }),

  remove: (storeId: string, userId: string) => StoreMember.destroy({ where: { storeId, userId } }),
};
