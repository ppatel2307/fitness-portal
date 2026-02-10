/**
 * Authentication routes
 * Login, logout, token refresh, password management
 */

import { Router, Response } from 'express';
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

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { email, password, rememberMe } = req.body;
    const result = await AuthService.login(email, password, rememberMe);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /auth/logout
 * Invalidate refresh token
 */
router.post(
  '/logout',
  validate({ body: refreshTokenSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { refreshToken } = req.body;
    await AuthService.logout(refreshToken);

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  })
);

/**
 * POST /auth/logout-all
 * Logout from all devices
 */
router.post(
  '/logout-all',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    await AuthService.logoutAll(req.user!.userId);

    res.json({
      success: true,
      data: { message: 'Logged out from all devices' },
    });
  })
);

/**
 * POST /auth/change-password
 * Change own password (requires current password)
 */
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user!.userId, currentPassword, newPassword);

    res.json({
      success: true,
      data: { message: 'Password changed successfully' },
    });
  })
);

/**
 * POST /auth/admin/reset-password
 * Admin reset client password
 */
router.post(
  '/admin/reset-password',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: adminResetPasswordSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { clientId, newPassword } = req.body;
    await AuthService.adminResetPassword(clientId, newPassword);

    res.json({
      success: true,
      data: { message: 'Password reset successfully' },
    });
  })
);

/**
 * GET /auth/me
 * Get current user info
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    res.json({
      success: true,
      data: req.user,
    });
  })
);

export default router;
