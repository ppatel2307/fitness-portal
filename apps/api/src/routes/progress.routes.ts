import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

// ==================== WEIGHT LOGS ====================

router.post(
  '/weight',
  authenticate,
  validate({
    body: z.object({
      date: z.string(),
      weight: z.number().positive(),
      note: z.string().optional(),
    }),
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { date, weight, note } = req.body;
    const userId = req.user!.userId;

    const log = await prisma.weightLog.upsert({
      where: { userId_date: { userId, date: new Date(date) } },
      create: { userId, date: new Date(date), weight, note },
      update: { weight, note },
    });

    res.status(201).json({ success: true, data: log });
  })
);

router.get(
  '/weight',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { startDate, endDate } = req.query as Record<string, string | undefined>;
    let userId = req.user!.userId;
    if (req.user!.role === 'ADMIN' && req.query.userId) userId = req.query.userId as string;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const logs = await prisma.weightLog.findMany({
      where: { userId, date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined },
      orderBy: { date: 'desc' },
      take: 365,
    });
    res.json({ success: true, data: logs });
  })
);

router.delete(
  '/weight/:logId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const log = await prisma.weightLog.findUnique({ where: { id: req.params.logId } });
    if (!log) throw new NotFoundError('Weight log');
    if (req.user!.role === 'USER' && log.userId !== req.user!.userId) throw new ForbiddenError("Cannot delete another user's weight log");
    await prisma.weightLog.delete({ where: { id: req.params.logId } });
    res.json({ success: true, data: { message: 'Weight log deleted' } });
  })
);

// ==================== CHECK-INS ====================

router.post(
  '/check-ins',
  authenticate,
  validate({
    body: z.object({
      weekOf: z.string(),
      energy: z.number().int().min(1).max(10),
      sleepHours: z.number().positive().max(24),
      stress: z.number().int().min(1).max(10),
      adherence: z.number().int().min(1).max(10),
      notes: z.string().optional(),
    }),
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { weekOf, energy, sleepHours, stress, adherence, notes } = req.body;
    const userId = req.user!.userId;

    const checkIn = await prisma.checkIn.upsert({
      where: { userId_weekOf: { userId, weekOf: new Date(weekOf) } },
      create: { userId, weekOf: new Date(weekOf), energy, sleepHours, stress, adherence, notes },
      update: { energy, sleepHours, stress, adherence, notes },
    });

    res.status(201).json({ success: true, data: checkIn });
  })
);

router.get(
  '/check-ins',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    let where: { userId?: string } = {};
    if (req.user!.role === 'USER') where.userId = req.user!.userId;
    else if (req.query.userId) where.userId = req.query.userId as string;

    const checkIns = await prisma.checkIn.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { weekOf: 'desc' },
      take: 52,
    });
    res.json({ success: true, data: checkIns });
  })
);

router.get(
  '/check-ins/:checkInId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const checkIn = await prisma.checkIn.findUnique({
      where: { id: req.params.checkInId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!checkIn) throw new NotFoundError('Check-in');
    if (req.user!.role === 'USER' && checkIn.userId !== req.user!.userId) throw new ForbiddenError("Cannot view another user's check-in");
    res.json({ success: true, data: checkIn });
  })
);

// ==================== STATISTICS ====================

router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    let userId = req.user!.userId;
    if (req.user!.role === 'ADMIN' && req.query.userId) userId = req.query.userId as string;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [weightLogs, nutritionLogs, weeklyCompletions, latestCheckIn] = await Promise.all([
      prisma.weightLog.findMany({
        where: { userId, date: { gte: thirtyDaysAgo } },
        orderBy: { date: 'asc' },
      }),
      prisma.foodLog.groupBy({
        by: ['date'],
        where: { userId, date: { gte: thirtyDaysAgo } },
        _sum: { calories: true, protein: true },
        orderBy: { date: 'asc' },
      }),
      prisma.workoutCompletion.count({ where: { userId, completedAt: { gte: weekStart } } }),
      prisma.checkIn.findFirst({ where: { userId }, orderBy: { weekOf: 'desc' } }),
    ]);

    res.json({
      success: true,
      data: { weightTrend: weightLogs, nutritionTrend: nutritionLogs, weeklyWorkoutsCompleted: weeklyCompletions, latestCheckIn },
    });
  })
);

export default router;
