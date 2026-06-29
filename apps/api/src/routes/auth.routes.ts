import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  adminResetPasswordSchema,
} from '../schemas/auth.schema.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

router.post(
  '/google',
  validate({ body: z.object({ idToken: z.string() }) }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { idToken } = req.body;
    const result = await AuthService.googleLogin(idToken);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { email, password, rememberMe } = req.body;
    const result = await AuthService.login(email, password, rememberMe);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshAccessToken(refreshToken);
    res.json({ success: true, data: result });
  })
);

router.post(
  '/logout',
  validate({ body: refreshTokenSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { refreshToken } = req.body;
    await AuthService.logout(refreshToken);
    res.json({ success: true, data: { message: 'Logged out successfully' } });
  })
);

router.post(
  '/logout-all',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    await AuthService.logoutAll(req.user!.userId);
    res.json({ success: true, data: { message: 'Logged out from all devices' } });
  })
);

router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ success: true, data: { message: 'Password changed successfully' } });
  })
);

router.post(
  '/admin/reset-password',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: adminResetPasswordSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { clientId, newPassword } = req.body;
    await AuthService.adminResetPassword(clientId, newPassword);
    res.json({ success: true, data: { message: 'Password reset successfully' } });
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    res.json({ success: true, data: req.user });
  })
);

export default router;
