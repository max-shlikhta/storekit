import { AppError } from '../../shared/app-error.js';
import { userRepository } from '../auth/user.repository.js';
import { storeMemberRepository } from './store-member.repository.js';

// What an owner may do with the team: see everyone, add an existing account as staff, remove staff.
export const storeTeamService = {
  getMembers: (storeId: string) => storeMemberRepository.findForStore(storeId),

  addStaff: async (storeId: string, email: string) => {
    const user = await userRepository.findByEmail(email);

    if (!user?.isActive) {
      throw new AppError('NOT_FOUND', 'No user with this email', [
        { path: 'email', message: 'No user with this email' },
      ]);
    }

    if (await storeMemberRepository.find(storeId, user.id)) {
      throw new AppError('CONFLICT', 'This person is already in the team', [
        { path: 'email', message: 'This person is already in the team' },
      ]);
    }

    await storeMemberRepository.create(storeId, user.id, 'staff');
    return storeMemberRepository.findForStore(storeId);
  },

  removeStaff: async (storeId: string, userId: string) => {
    const member = await storeMemberRepository.find(storeId, userId);

    if (!member) {
      throw new AppError('NOT_FOUND', 'Member not found');
    }

    if (member.role !== 'staff') {
      throw new AppError('FORBIDDEN', 'An owner cannot be removed');
    }

    await storeMemberRepository.remove(storeId, userId);
    return storeMemberRepository.findForStore(storeId);
  },
};
