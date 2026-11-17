import type { Request, Response } from 'express';
import { parseBody, parseId } from '../../shared/http/request.js';
import { toUserDto } from '../auth/auth.controller.js';
import type { User } from '../auth/user.model.js';
import type { StoreMember } from './store-member.model.js';
import { getStore } from './store.context.js';
import { addStaffSchema } from './store-team.schema.js';
import { storeTeamService } from './store-team.service.js';

type MemberWithUser = StoreMember & { user: User };

const toMemberDto = (member: StoreMember) => ({
  role: member.role,
  addedAt: member.createdAt,
  user: toUserDto((member as MemberWithUser).user),
});

export const storeTeamController = {
  getMembers: async (_req: Request, res: Response) => {
    const members = await storeTeamService.getMembers(getStore(res).id);
    res.json({ data: members.map(toMemberDto) });
  },

  addStaff: async (req: Request, res: Response) => {
    const { email } = parseBody(req, addStaffSchema);
    const members = await storeTeamService.addStaff(getStore(res).id, email);

    res.json({ data: members.map(toMemberDto) });
  },

  removeStaff: async (req: Request, res: Response) => {
    const userId = parseId(req.params.userId, 'User');
    const members = await storeTeamService.removeStaff(getStore(res).id, userId);

    res.json({ data: members.map(toMemberDto) });
  },
};
