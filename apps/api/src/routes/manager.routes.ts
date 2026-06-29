import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

// Get assigned clients
router.get(
  '/clients',
  authenticate,
  requireRole('MANAGER'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const assignments = await prisma.managerClient.findMany({
      where: { managerId: req.user!.userId },
      include: {
        client: {
          include: {
            clientProfile: true,
            onboarding: true,
            workoutPlans: {
              where: { active: true },
              include: {
                workoutDays: {
                  include: { exercises: true, completions: { orderBy: { completedAt: 'desc' }, take: 1 } },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    res.json({ success: true, data: assignments.map(a => a.client) });
  })
);

// Get client detail for manager
router.get(
  '/clients/:clientId',
  authenticate,
  requireRole('MANAGER'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { clientId } = req.params;

    // Verify assignment
    const assignment = await prisma.managerClient.findFirst({
      where: { managerId: req.user!.userId, clientId },
    });
    if (!assignment) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Not assigned to this client' } });
    }

    const client = await prisma.user.findUnique({
      where: { id: clientId },
      include: {
        clientProfile: true,
        onboarding: true,
        workoutPlans: {
          where: { active: true },
          include: {
            workoutDays: {
              include: {
                exercises: { orderBy: { orderIndex: 'asc' } },
                completions: { orderBy: { completedAt: 'desc' }, take: 5 },
              },
            },
          },
          take: 1,
        },
        mealPlans: { orderBy: { weekStart: 'desc' }, take: 1 },
        workoutCompletions: {
          orderBy: { completedAt: 'desc' },
          take: 30,
        },
        checkIns: { orderBy: { weekOf: 'desc' }, take: 4 },
      },
    });

    res.json({ success: true, data: client });
  })
);

// Get workout completion stats for manager's clients
router.get(
  '/stats',
  authenticate,
  requireRole('MANAGER'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const assignments = await prisma.managerClient.findMany({
      where: { managerId: req.user!.userId },
      select: { clientId: true },
    });
    const clientIds = assignments.map(a => a.clientId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completions = await prisma.workoutCompletion.groupBy({
      by: ['userId'],
      where: { userId: { in: clientIds }, completedAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    });

    const stats = completions.map(c => ({ userId: c.userId, completions: c._count.id }));
    res.json({ success: true, data: stats });
  })
);

export default router;
