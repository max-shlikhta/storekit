import { Router } from 'express';
import { authController } from './auth.controller.js';
import { requireActiveSession, requireSessionStatus } from './auth.middleware.js';

const anySession = requireSessionStatus(
  'active',
  'two_factor_pending',
  'two_factor_setup_required',
);
const canSetUpTwoFactor = requireSessionStatus('active', 'two_factor_setup_required');

export const authRouter = Router();

authRouter.post('/login', authController.login);
authRouter.post('/logout', authController.logout);

authRouter.get('/me', anySession, authController.me);
authRouter.patch('/me', requireActiveSession, authController.updateProfile);
authRouter.post(
  '/two-factor/verify',
  requireSessionStatus('two_factor_pending'),
  authController.verifyTwoFactor,
);
authRouter.post('/two-factor/setup', canSetUpTwoFactor, authController.setupTwoFactor);
authRouter.post('/two-factor/enable', canSetUpTwoFactor, authController.enableTwoFactor);
authRouter.post('/two-factor/disable', requireActiveSession, authController.disableTwoFactor);
authRouter.post(
  '/two-factor/recovery-codes',
  requireActiveSession,
  authController.regenerateRecoveryCodes,
);
authRouter.post('/password', requireActiveSession, authController.changePassword);
authRouter.post('/logout-all', requireActiveSession, authController.logoutEverywhere);
