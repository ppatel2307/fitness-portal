import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotificationService } from '../services/notification.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';

const router = Router();

const createRequestSchema = z.object({
  category: z.enum(['WORKOUT_MODIFICATION', 'NUTRITION_REQUEST', 'INJURY_UPDATE', 'GENERAL']),
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(2000),
});

// User: submit a request
router.post(
  '/',
  authenticate,
  validate({ body: createRequestSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const userId = req.user!.userId;
    const { category, subject, body } = req.body;

    const request = await prisma.userRequest.create({
      data: { userId, category, subject, body },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    await Promise.all([
      NotificationService.notifyAdmins(
        'NEW_REQUEST',
        'New User Request',
        `${user?.name} submitted a ${category.replace('_', ' ').toLowerCase()}: "${subject}"`,
        { requestId: request.id, userId }
      ),
      NotificationService.notifyManagersOfClient(
        userId,
        'NEW_REQUEST',
        'Client Request',
        `${user?.name} submitted a request: "${subject}"`,
        { requestId: request.id }
      ),
    ]);

    res.status(201).json({ success: true, data: request });
  })
);

// User: get own requests
router.get(
  '/my',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const requests = await prisma.userRequest.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: requests });
  })
);

// Admin/Manager: get all requests
router.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { status } = req.query;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;

    // Managers only see requests from their assigned clients
    if (req.user!.role === 'MANAGER') {
      const assignments = await prisma.managerClient.findMany({
        where: { managerId: req.user!.userId },
        select: { clientId: true },
      });
      where.userId = { in: assignments.map(a => a.clientId) };
    }

    const requests = await prisma.userRequest.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: requests });
  })
);

// Admin: update request status and reply
router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  validate({
    body: z.object({
      status: z.enum(['PENDING', 'IN_REVIEW', 'RESOLVED']).optional(),
      adminReply: z.string().max(2000).optional(),
    }),
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { id } = req.params;
    const { status, adminReply } = req.body;

    const existing = await prisma.userRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Request');

    const updated = await prisma.userRequest.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(adminReply !== undefined && { adminReply }),
        ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
      },
    });

    if (status === 'RESOLVED' || adminReply) {
      await NotificationService.create(
        existing.userId,
        'GENERAL',
        'Request Updated',
        adminReply
          ? `Your request "${existing.subject}" received a reply.`
          : `Your request "${existing.subject}" has been ${status?.toLowerCase()}.`,
        { requestId: id }
      );
    }

    res.json({ success: true, data: updated });
  })
);

export default router;
