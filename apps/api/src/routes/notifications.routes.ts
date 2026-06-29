import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotificationService } from '../services/notification.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const notifications = await NotificationService.getForUser(req.user!.userId);
    const unread = await NotificationService.unreadCount(req.user!.userId);
    res.json({ success: true, data: { notifications, unreadCount: unread } });
  })
);

router.patch(
  '/:id/read',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    await NotificationService.markRead(req.params.id, req.user!.userId);
    res.json({ success: true, data: { message: 'Marked as read' } });
  })
);

router.patch(
  '/mark-all-read',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    await NotificationService.markAllRead(req.user!.userId);
    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  })
);

export default router;
