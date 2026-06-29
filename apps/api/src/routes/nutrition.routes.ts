import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

router.post(
  '/targets',
  authenticate,
  requireRole('ADMIN'),
  validate({
    body: z.object({
      userId: z.string().uuid(),
      calories: z.number().int().positive(),
      protein: z.number().int().nonnegative(),
      carbs: z.number().int().nonnegative(),
      fat: z.number().int().nonnegative(),
      waterLiters: z.number().positive().default(2.5),
      notes: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { userId, calories, protein, carbs, fat, waterLiters, notes } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const target = await prisma.nutritionTarget.upsert({
      where: { userId },
      create: { userId, calories, protein, carbs, fat, waterLiters, notes },
      update: { calories, protein, carbs, fat, waterLiters, notes },
    });
    res.status(201).json({ success: true, data: target });
  })
);

router.get(
  '/targets/:userId',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const target = await prisma.nutritionTarget.findUnique({
      where: { userId: req.params.userId },
      include: { user: { select: { name: true, email: true } } },
    });
    res.json({ success: true, data: target });
  })
);

router.patch(
  '/targets/:userId',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const target = await prisma.nutritionTarget.findUnique({ where: { userId: req.params.userId } });
    if (!target) throw new NotFoundError('Nutrition target');
    const updated = await prisma.nutritionTarget.update({ where: { userId: req.params.userId }, data: req.body });
    res.json({ success: true, data: updated });
  })
);

router.get(
  '/my-targets',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const target = await prisma.nutritionTarget.findUnique({ where: { userId: req.user!.userId } });
    res.json({ success: true, data: target });
  })
);

router.get(
  '/meal-plan',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const mealPlan = await prisma.mealPlan.findFirst({
      where: { userId: req.user!.userId },
      orderBy: { weekStart: 'desc' },
    });
    res.json({ success: true, data: mealPlan });
  })
);

router.post(
  '/logs',
  authenticate,
  validate({
    body: z.object({
      date: z.string(),
      mealName: z.string().min(1).max(100),
      calories: z.number().int().nonnegative(),
      protein: z.number().int().nonnegative(),
      carbs: z.number().int().nonnegative(),
      fat: z.number().int().nonnegative(),
    }),
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { date, mealName, calories, protein, carbs, fat } = req.body;
    const log = await prisma.foodLog.create({
      data: { userId: req.user!.userId, date: new Date(date), mealName, calories, protein, carbs, fat },
    });
    res.status(201).json({ success: true, data: log });
  })
);

router.get(
  '/logs',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { date, startDate, endDate } = req.query as Record<string, string | undefined>;
    let userId = req.user!.userId;
    if (req.user!.role === 'ADMIN' && req.query.userId) userId = req.query.userId as string;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (date) { const d = new Date(date); dateFilter.gte = d; dateFilter.lte = d; }
    else { if (startDate) dateFilter.gte = new Date(startDate); if (endDate) dateFilter.lte = new Date(endDate); }

    const logs = await prisma.foodLog.findMany({
      where: { userId, date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
    res.json({ success: true, data: logs });
  })
);

router.patch(
  '/logs/:logId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const log = await prisma.foodLog.findUnique({ where: { id: req.params.logId } });
    if (!log) throw new NotFoundError('Food log');
    if (req.user!.role === 'USER' && log.userId !== req.user!.userId) throw new ForbiddenError("Cannot modify another user's food log");
    const updated = await prisma.foodLog.update({
      where: { id: req.params.logId },
      data: { ...req.body, date: req.body.date ? new Date(req.body.date) : undefined },
    });
    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/logs/:logId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const log = await prisma.foodLog.findUnique({ where: { id: req.params.logId } });
    if (!log) throw new NotFoundError('Food log');
    if (req.user!.role === 'USER' && log.userId !== req.user!.userId) throw new ForbiddenError("Cannot delete another user's food log");
    await prisma.foodLog.delete({ where: { id: req.params.logId } });
    res.json({ success: true, data: { message: 'Food log deleted' } });
  })
);

router.get(
  '/summary',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { startDate, endDate } = req.query as Record<string, string | undefined>;
    let userId = req.user!.userId;
    if (req.user!.role === 'ADMIN' && req.query.userId) userId = req.query.userId as string;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const logs = await prisma.foodLog.groupBy({
      by: ['date'],
      where: { userId, date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined },
      _sum: { calories: true, protein: true, carbs: true, fat: true },
      orderBy: { date: 'asc' },
    });
    const targets = await prisma.nutritionTarget.findUnique({ where: { userId } });
    res.json({ success: true, data: { dailyTotals: logs, targets } });
  })
);

export default router;
