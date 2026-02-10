/**
 * Progress tracking routes
 * Weight logs, check-ins, statistics
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import {
  weightLogSchema,
  updateWeightLogSchema,
  weightLogIdParamSchema,
  checkInSchema,
  checkInIdParamSchema,
} from '../schemas/progress.schema.js';
import { dateQuerySchema } from '../schemas/nutrition.schema.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

// ==================== WEIGHT LOGS ====================

/**
 * POST /progress/weight
 * Add weight log entry
 */
router.post(
  '/weight',
  authenticate,
  validate({ body: weightLogSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { date, weight, note } = req.body;
    const clientId = req.user!.userId;

    // Upsert to allow updating same day
    const log = await prisma.weightLog.upsert({
      where: {
        clientId_date: {
          clientId,
          date: new Date(date),
        },
      },
      create: {
        clientId,
        date: new Date(date),
        weight,
        note,
      },
      update: {
        weight,
        note,
      },
    });

    res.status(201).json({
      success: true,
      data: log,
    });
  })
);

/**
 * GET /progress/weight
 * Get weight logs
 */
router.get(
  '/weight',
  authenticate,
  validate({ query: dateQuerySchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    
    let clientId = req.user!.userId;
    
    if (req.user!.role === 'ADMIN' && req.query.clientId) {
      clientId = req.query.clientId as string;
    }

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const logs = await prisma.weightLog.findMany({
      where: {
        clientId,
        date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      orderBy: { date: 'desc' },
      take: 365,
    });

    res.json({
      success: true,
      data: logs,
    });
  })
);

/**
 * DELETE /progress/weight/:logId
 * Delete weight log entry
 */
router.delete(
  '/weight/:logId',
  authenticate,
  validate({ params: weightLogIdParamSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { logId } = req.params;

    const log = await prisma.weightLog.findUnique({ where: { id: logId } });

    if (!log) {
      throw new NotFoundError('Weight log');
    }

    if (req.user!.role === 'CLIENT' && log.clientId !== req.user!.userId) {
      throw new ForbiddenError('Cannot delete another user\'s weight log');
    }

    await prisma.weightLog.delete({ where: { id: logId } });

    res.json({
      success: true,
      data: { message: 'Weight log deleted' },
    });
  })
);

// ==================== CHECK-INS ====================

/**
 * POST /progress/check-ins
 * Submit weekly check-in
 */
router.post(
  '/check-ins',
  authenticate,
  validate({ body: checkInSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { weekOf, energy, sleepHours, stress, adherence, notes } = req.body;
    const clientId = req.user!.userId;

    const checkIn = await prisma.checkIn.upsert({
      where: {
        clientId_weekOf: {
          clientId,
          weekOf: new Date(weekOf),
        },
      },
      create: {
        clientId,
        weekOf: new Date(weekOf),
        energy,
        sleepHours,
        stress,
        adherence,
        notes,
      },
      update: {
        energy,
        sleepHours,
        stress,
        adherence,
        notes,
      },
    });

    res.status(201).json({
      success: true,
      data: checkIn,
    });
  })
);

/**
 * GET /progress/check-ins
 * Get check-ins (Client: own, Admin: all or by clientId)
 */
router.get(
  '/check-ins',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    let where: { clientId?: string } = {};
    
    if (req.user!.role === 'CLIENT') {
      where.clientId = req.user!.userId;
    } else if (req.query.clientId) {
      where.clientId = req.query.clientId as string;
    }

    const checkIns = await prisma.checkIn.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
      orderBy: { weekOf: 'desc' },
      take: 52,
    });

    res.json({
      success: true,
      data: checkIns,
    });
  })
);

/**
 * GET /progress/check-ins/:checkInId
 * Get specific check-in
 */
router.get(
  '/check-ins/:checkInId',
  authenticate,
  validate({ params: checkInIdParamSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { checkInId } = req.params;

    const checkIn = await prisma.checkIn.findUnique({
      where: { id: checkInId },
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
    });

    if (!checkIn) {
      throw new NotFoundError('Check-in');
    }

    if (req.user!.role === 'CLIENT' && checkIn.clientId !== req.user!.userId) {
      throw new ForbiddenError('Cannot view another user\'s check-in');
    }

    res.json({
      success: true,
      data: checkIn,
    });
  })
);

// ==================== STATISTICS ====================

/**
 * GET /progress/stats
 * Get aggregated statistics for dashboard
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    let clientId = req.user!.userId;
    
    if (req.user!.role === 'ADMIN' && req.query.clientId) {
      clientId = req.query.clientId as string;
    }

    // Get last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Weight trend
    const weightLogs = await prisma.weightLog.findMany({
      where: {
        clientId,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'asc' },
    });

    // Nutrition summary
    const nutritionLogs = await prisma.foodLog.groupBy({
      by: ['date'],
      where: {
        clientId,
        date: { gte: thirtyDaysAgo },
      },
      _sum: {
        calories: true,
        protein: true,
      },
      orderBy: { date: 'asc' },
    });

    // Workout completions this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weeklyCompletions = await prisma.workoutCompletion.count({
      where: {
        clientId,
        completedAt: { gte: weekStart },
      },
    });

    // Get latest check-in
    const latestCheckIn = await prisma.checkIn.findFirst({
      where: { clientId },
      orderBy: { weekOf: 'desc' },
    });

    res.json({
      success: true,
      data: {
        weightTrend: weightLogs,
        nutritionTrend: nutritionLogs,
        weeklyWorkoutsCompleted: weeklyCompletions,
        latestCheckIn,
      },
    });
  })
);

export default router;
