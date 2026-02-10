/**
 * Workout management routes
 * Admin: CRUD workout plans, days, exercises
 * Client: View and complete workouts
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole, requireOwnership } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import {
  createWorkoutPlanSchema,
  updateWorkoutPlanSchema,
  addWorkoutDaySchema,
  updateWorkoutDaySchema,
  addExerciseSchema,
  updateExerciseSchema,
  completeWorkoutSchema,
  workoutPlanIdParamSchema,
  workoutDayIdParamSchema,
  exerciseIdParamSchema,
} from '../schemas/workout.schema.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

// ==================== ADMIN WORKOUT PLAN ROUTES ====================

/**
 * POST /workouts/plans
 * Create workout plan for a client (Admin only)
 */
router.post(
  '/plans',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: createWorkoutPlanSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { clientId, title, weekStart, workoutDays } = req.body;

    // Verify client exists
    const client = await prisma.user.findUnique({
      where: { id: clientId, role: 'CLIENT' },
    });

    if (!client) {
      throw new NotFoundError('Client');
    }

    const plan = await prisma.workoutPlan.create({
      data: {
        clientId,
        title,
        weekStart: weekStart ? new Date(weekStart) : undefined,
        workoutDays: workoutDays
          ? {
              create: workoutDays.map((day) => ({
                dayOfWeek: day.dayOfWeek,
                title: day.title,
                exercises: day.exercises
                  ? {
                      create: day.exercises.map((ex, idx) => ({
                        ...ex,
                        orderIndex: ex.orderIndex ?? idx,
                        videoUrl: ex.videoUrl || null,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        workoutDays: {
          include: { exercises: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: plan,
    });
  })
);

/**
 * GET /workouts/plans
 * List all workout plans (Admin: all, Client: own)
 */
router.get(
  '/plans',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const where =
      req.user!.role === 'ADMIN'
        ? {}
        : { clientId: req.user!.userId };

    const plans = await prisma.workoutPlan.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, email: true } },
        workoutDays: {
          include: { exercises: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: plans,
    });
  })
);

/**
 * GET /workouts/plans/:planId
 * Get workout plan details
 */
router.get(
  '/plans/:planId',
  authenticate,
  validate({ params: workoutPlanIdParamSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { planId } = req.params;

    const plan = await prisma.workoutPlan.findUnique({
      where: { id: planId },
      include: {
        client: { select: { id: true, name: true, email: true } },
        workoutDays: {
          include: { exercises: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundError('Workout plan');
    }

    // Check ownership for clients
    if (req.user!.role === 'CLIENT' && plan.clientId !== req.user!.userId) {
      throw new ForbiddenError('Cannot access another user\'s workout plan');
    }

    res.json({
      success: true,
      data: plan,
    });
  })
);

/**
 * PATCH /workouts/plans/:planId
 * Update workout plan (Admin only)
 */
router.patch(
  '/plans/:planId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: workoutPlanIdParamSchema, body: updateWorkoutPlanSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { planId } = req.params;
    const { title, weekStart, active } = req.body;

    const plan = await prisma.workoutPlan.findUnique({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundError('Workout plan');
    }

    const updated = await prisma.workoutPlan.update({
      where: { id: planId },
      data: {
        title,
        weekStart: weekStart ? new Date(weekStart) : undefined,
        active,
      },
      include: {
        workoutDays: {
          include: { exercises: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /workouts/plans/:planId
 * Delete workout plan (Admin only)
 */
router.delete(
  '/plans/:planId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: workoutPlanIdParamSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { planId } = req.params;

    const plan = await prisma.workoutPlan.findUnique({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundError('Workout plan');
    }

    await prisma.workoutPlan.delete({ where: { id: planId } });

    res.json({
      success: true,
      data: { message: 'Workout plan deleted' },
    });
  })
);

// ==================== WORKOUT DAY ROUTES ====================

/**
 * POST /workouts/plans/:planId/days
 * Add workout day to plan (Admin only)
 */
router.post(
  '/plans/:planId/days',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: workoutPlanIdParamSchema, body: addWorkoutDaySchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { planId } = req.params;
    const { dayOfWeek, title, exercises } = req.body;

    const plan = await prisma.workoutPlan.findUnique({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundError('Workout plan');
    }

    const day = await prisma.workoutDay.create({
      data: {
        workoutPlanId: planId,
        dayOfWeek,
        title,
        exercises: exercises
          ? {
              create: exercises.map((ex, idx) => ({
                ...ex,
                orderIndex: ex.orderIndex ?? idx,
                videoUrl: ex.videoUrl || null,
              })),
            }
          : undefined,
      },
      include: { exercises: { orderBy: { orderIndex: 'asc' } } },
    });

    res.status(201).json({
      success: true,
      data: day,
    });
  })
);

/**
 * PATCH /workouts/days/:dayId
 * Update workout day (Admin only)
 */
router.patch(
  '/days/:dayId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: workoutDayIdParamSchema, body: updateWorkoutDaySchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { dayId } = req.params;
    const { title, dayOfWeek } = req.body;

    const day = await prisma.workoutDay.findUnique({ where: { id: dayId } });

    if (!day) {
      throw new NotFoundError('Workout day');
    }

    const updated = await prisma.workoutDay.update({
      where: { id: dayId },
      data: { title, dayOfWeek },
      include: { exercises: { orderBy: { orderIndex: 'asc' } } },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /workouts/days/:dayId
 * Delete workout day (Admin only)
 */
router.delete(
  '/days/:dayId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: workoutDayIdParamSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { dayId } = req.params;

    const day = await prisma.workoutDay.findUnique({ where: { id: dayId } });

    if (!day) {
      throw new NotFoundError('Workout day');
    }

    await prisma.workoutDay.delete({ where: { id: dayId } });

    res.json({
      success: true,
      data: { message: 'Workout day deleted' },
    });
  })
);

// ==================== EXERCISE ROUTES ====================

/**
 * POST /workouts/days/:dayId/exercises
 * Add exercise to workout day (Admin only)
 */
router.post(
  '/days/:dayId/exercises',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: workoutDayIdParamSchema, body: addExerciseSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { dayId } = req.params;

    const day = await prisma.workoutDay.findUnique({ where: { id: dayId } });

    if (!day) {
      throw new NotFoundError('Workout day');
    }

    // Get max order index
    const maxOrder = await prisma.exercise.aggregate({
      where: { workoutDayId: dayId },
      _max: { orderIndex: true },
    });

    const exercise = await prisma.exercise.create({
      data: {
        workoutDayId: dayId,
        ...req.body,
        videoUrl: req.body.videoUrl || null,
        orderIndex: req.body.orderIndex ?? (maxOrder._max.orderIndex ?? 0) + 1,
      },
    });

    res.status(201).json({
      success: true,
      data: exercise,
    });
  })
);

/**
 * PATCH /workouts/exercises/:exerciseId
 * Update exercise (Admin only)
 */
router.patch(
  '/exercises/:exerciseId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: exerciseIdParamSchema, body: updateExerciseSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { exerciseId } = req.params;

    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });

    if (!exercise) {
      throw new NotFoundError('Exercise');
    }

    const updated = await prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        ...req.body,
        videoUrl: req.body.videoUrl === '' ? null : req.body.videoUrl,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /workouts/exercises/:exerciseId
 * Delete exercise (Admin only)
 */
router.delete(
  '/exercises/:exerciseId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: exerciseIdParamSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { exerciseId } = req.params;

    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });

    if (!exercise) {
      throw new NotFoundError('Exercise');
    }

    await prisma.exercise.delete({ where: { id: exerciseId } });

    res.json({
      success: true,
      data: { message: 'Exercise deleted' },
    });
  })
);

// ==================== CLIENT WORKOUT COMPLETION ====================

/**
 * POST /workouts/complete
 * Mark workout as completed (Client)
 */
router.post(
  '/complete',
  authenticate,
  validate({ body: completeWorkoutSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { workoutDayId, comment } = req.body;
    const clientId = req.user!.userId;

    // Verify workout day exists and belongs to client
    const day = await prisma.workoutDay.findUnique({
      where: { id: workoutDayId },
      include: { workoutPlan: true },
    });

    if (!day) {
      throw new NotFoundError('Workout day');
    }

    if (req.user!.role === 'CLIENT' && day.workoutPlan.clientId !== clientId) {
      throw new ForbiddenError('Cannot complete another user\'s workout');
    }

    const completion = await prisma.workoutCompletion.create({
      data: {
        clientId: day.workoutPlan.clientId,
        workoutDayId,
        comment,
      },
    });

    res.status(201).json({
      success: true,
      data: completion,
    });
  })
);

/**
 * GET /workouts/completions
 * Get workout completions
 */
router.get(
  '/completions',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const where =
      req.user!.role === 'ADMIN'
        ? {}
        : { clientId: req.user!.userId };

    const completions = await prisma.workoutCompletion.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      take: 100,
    });

    res.json({
      success: true,
      data: completions,
    });
  })
);

/**
 * GET /workouts/my-plan
 * Get client's active workout plan with today's workout
 */
router.get(
  '/my-plan',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const clientId = req.user!.role === 'CLIENT' 
      ? req.user!.userId 
      : req.query.clientId as string;

    if (!clientId) {
      throw new NotFoundError('Client ID required');
    }

    const plan = await prisma.workoutPlan.findFirst({
      where: { clientId, active: true },
      include: {
        workoutDays: {
          include: { exercises: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get today's completions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const completions = await prisma.workoutCompletion.findMany({
      where: {
        clientId,
        completedAt: { gte: today },
      },
    });

    res.json({
      success: true,
      data: {
        plan,
        todayCompletions: completions,
        todayDayOfWeek: new Date().getDay(),
      },
    });
  })
);

export default router;
