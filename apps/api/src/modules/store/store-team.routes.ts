import { Router } from 'express';
import { requireStoreRole } from './store.context.js';
import { storeTeamController } from './store-team.controller.js';

export const storeTeamRouter = Router();

storeTeamRouter.use(requireStoreRole('owner'));
storeTeamRouter.get('/', storeTeamController.getMembers);
storeTeamRouter.post('/', storeTeamController.addStaff);
storeTeamRouter.delete('/:userId', storeTeamController.removeStaff);
