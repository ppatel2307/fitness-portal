/**
 * Nutrition management routes
 * Admin: Set nutrition targets
 * Client: Log food, view targets
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import {
  nutritionTargetSchema,
  updateNutritionTargetSchema,
  foodLogSchema,
  updateFoodLogSchema,
  foodLogIdParamSchema,
  dateQuerySchema,
} from '../schemas/nutrition.schema.js';
import { clientIdParamSchema } from '../schemas/user.schema.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

// ==================== NUTRITION TARGETS (ADMIN) ====================

/**
 * POST /nutrition/targets
 * Set nutrition targets for a client (Admin only)
 */
router.post(
  '/targets',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: nutritionTargetSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { clientId, calories, protein, carbs, fat, waterLiters, notes } = req.body;

    // Verify client exists
    const client = await prisma.user.findUnique({
      where: { id: clientId, role: 'CLIENT' },
    });

    if (!client) {
      throw new NotFoundError('Client');
    }

    const target = await prisma.nutritionTarget.upsert({
      where: { clientId },
      create: { clientId, calories, protein, carbs, fat, waterLiters, notes },
      update: { calories, protein, carbs, fat, waterLiters, notes },
    });

    res.status(201).json({
      success: true,
      data: target,
    });
  })
);

/**
 * GET /nutrition/targets/:clientId
 * Get nutrition targets for a client (Admin only)
 */
router.get(
  '/targets/:clientId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: clientIdParamSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { clientId } = req.params;

    const target = await prisma.nutritionTarget.findUnique({
      where: { clientId },
      include: { client: { select: { name: true, email: true } } },
    });

    res.json({
      success: true,
      data: target,
    });
  })
);

/**
 * PATCH /nutrition/targets/:clientId
 * Update nutrition targets (Admin only)
 */
router.patch(
  '/targets/:clientId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: clientIdParamSchema, body: updateNutritionTargetSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { clientId } = req.params;

    const target = await prisma.nutritionTarget.findUnique({ where: { clientId } });

    if (!target) {
      throw new NotFoundError('Nutrition target');
    }

    const updated = await prisma.nutritionTarget.update({
      where: { clientId },
      data: req.body,
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

// ==================== CLIENT NUTRITION ====================

/**
 * GET /nutrition/my-targets
 * Get own nutrition targets (Client)
 */
router.get(
  '/my-targets',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const target = await prisma.nutritionTarget.findUnique({
      where: { clientId: req.user!.userId },
    });

    res.json({
      success: true,
      data: target,
    });
  })
);

// ==================== FOOD LOGS ====================

/**
 * POST /nutrition/logs
 * Add food log entry (Client)
 */
router.post(
  '/logs',
  authenticate,
  validate({ body: foodLogSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { date, mealName, calories, protein, carbs, fat } = req.body;

    const log = await prisma.foodLog.create({
      data: {
        clientId: req.user!.userId,
        date: new Date(date),
        mealName,
        calories,
        protein,
        carbs,
        fat,
      },
    });

    res.status(201).json({
      success: true,
      data: log,
    });
  })
);

/**
 * GET /nutrition/logs
 * Get food logs (Client: own, Admin: specify clientId)
 */
router.get(
  '/logs',
  authenticate,
  validate({ query: dateQuerySchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { date, startDate, endDate } = req.query as { 
      date?: string; 
      startDate?: string; 
      endDate?: string 
    };
    
    let clientId = req.user!.userId;
    
    if (req.user!.role === 'ADMIN' && req.query.clientId) {
      clientId = req.query.clientId as string;
    }

    const dateFilter: { gte?: Date; lte?: Date } = {};
    
    if (date) {
      const d = new Date(date);
      dateFilter.gte = d;
      dateFilter.lte = d;
    } else if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
    }

    const logs = await prisma.foodLog.findMany({
      where: {
        clientId,
        date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    res.json({
      success: true,
      data: logs,
    });
  })
);

/**
 * PATCH /nutrition/logs/:logId
 * Update food log entry
 */
router.patch(
  '/logs/:logId',
  authenticate,
  validate({ params: foodLogIdParamSchema, body: updateFoodLogSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { logId } = req.params;

    const log = await prisma.foodLog.findUnique({ where: { id: logId } });

    if (!log) {
      throw new NotFoundError('Food log');
    }

    // Check ownership
    if (req.user!.role === 'CLIENT' && log.clientId !== req.user!.userId) {
      throw new ForbiddenError('Cannot modify another user\'s food log');
    }

    const updated = await prisma.foodLog.update({
      where: { id: logId },
      data: {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /nutrition/logs/:logId
 * Delete food log entry
 */
router.delete(
  '/logs/:logId',
  authenticate,
  validate({ params: foodLogIdParamSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { logId } = req.params;

    const log = await prisma.foodLog.findUnique({ where: { id: logId } });

    if (!log) {
      throw new NotFoundError('Food log');
    }

    // Check ownership
    if (req.user!.role === 'CLIENT' && log.clientId !== req.user!.userId) {
      throw new ForbiddenError('Cannot delete another user\'s food log');
    }

    await prisma.foodLog.delete({ where: { id: logId } });

    res.json({
      success: true,
      data: { message: 'Food log deleted' },
    });
  })
);

/**
 * GET /nutrition/summary
 * Get nutrition summary for a date range
 */
router.get(
  '/summary',
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

    // Get daily totals
    const logs = await prisma.foodLog.groupBy({
      by: ['date'],
      where: {
        clientId,
        date: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      _sum: {
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
      },
      orderBy: { date: 'asc' },
    });

    // Get targets for comparison
    const targets = await prisma.nutritionTarget.findUnique({
      where: { clientId },
    });

    res.json({
      success: true,
      data: {
        dailyTotals: logs,
        targets,
      },
    });
  })
);

export default router;
