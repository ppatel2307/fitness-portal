import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { NotificationService } from '../services/notification.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

// ==================== ADMIN WORKOUT PLAN ROUTES ====================

const createPlanSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  weekStart: z.string().optional(),
  workoutDays: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    title: z.string(),
    isRestDay: z.boolean().default(false),
    exercises: z.array(z.object({
      name: z.string(),
      sets: z.number().int().positive(),
      reps: z.string(),
      restSeconds: z.number().int().optional(),
      notes: z.string().optional(),
      youtubeUrl: z.string().optional(),
      orderIndex: z.number().int().default(0),
    })).optional(),
  })).optional(),
});

router.post(
  '/plans',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: createPlanSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { userId, title, weekStart, workoutDays } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId, role: 'USER' } });
    if (!user) throw new NotFoundError('User');

    // A client follows exactly one active plan: assigning a new one retires the old.
    const plan = await prisma.$transaction(async tx => {
      await tx.workoutPlan.updateMany({
        where: { userId, active: true },
        data: { active: false },
      });
      return tx.workoutPlan.create({
        data: {
          userId,
          title,
          weekStart: weekStart ? new Date(weekStart) : undefined,
          workoutDays: workoutDays
            ? {
                create: workoutDays.map((day: { dayOfWeek: number; title: string; isRestDay?: boolean; exercises?: { name: string; sets: number; reps: string; restSeconds?: number; notes?: string; youtubeUrl?: string; orderIndex?: number }[] }) => ({
                  dayOfWeek: day.dayOfWeek,
                  title: day.title,
                  isRestDay: day.isRestDay ?? false,
                  exercises: day.exercises
                    ? { create: day.exercises.map((ex, idx) => ({ ...ex, orderIndex: ex.orderIndex ?? idx })) }
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
    });

    await NotificationService.create(userId, 'WORKOUT_ASSIGNED', 'New Workout Plan', `Your coach assigned you a new workout plan: "${title}"`, { planId: plan.id });

    res.status(201).json({ success: true, data: plan });
  })
);

router.get(
  '/plans',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const where = req.user!.role === 'ADMIN' || req.user!.role === 'MANAGER'
      ? {}
      : { userId: req.user!.userId };

    const plans = await prisma.workoutPlan.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        workoutDays: {
          include: { exercises: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: plans });
  })
);

router.get(
  '/plans/:planId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: req.params.planId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        workoutDays: {
          include: { exercises: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });

    if (!plan) throw new NotFoundError('Workout plan');
    if (req.user!.role === 'USER' && plan.userId !== req.user!.userId) {
      throw new ForbiddenError("Cannot access another user's workout plan");
    }

    res.json({ success: true, data: plan });
  })
);

router.patch(
  '/plans/:planId',
  authenticate,
  requireRole('ADMIN'),
  validate({
    body: z.object({
      title: z.string().min(1).max(200).optional(),
      weekStart: z.string().optional(),
      active: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { planId } = req.params;
    const plan = await prisma.workoutPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError('Workout plan');

    const updated = await prisma.$transaction(async tx => {
      // Re-activating a plan retires the client's other active plans.
      if (req.body.active === true) {
        await tx.workoutPlan.updateMany({
          where: { userId: plan.userId, active: true, id: { not: planId } },
          data: { active: false },
        });
      }
      return tx.workoutPlan.update({
        where: { id: planId },
        data: {
          title: req.body.title,
          weekStart: req.body.weekStart ? new Date(req.body.weekStart) : undefined,
          active: req.body.active,
        },
        include: {
          workoutDays: {
            include: { exercises: { orderBy: { orderIndex: 'asc' } } },
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      });
    });

    res.json({ success: true, data: updated });
  })
);

// Replace a plan's full contents (title + days + exercises) in one call.
// Simpler and safer for the plan editor than orchestrating granular updates.
router.put(
  '/plans/:planId',
  authenticate,
  requireRole('ADMIN'),
  validate({
    body: z.object({
      title: z.string().min(1).max(200),
      workoutDays: z.array(z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        title: z.string().min(1),
        isRestDay: z.boolean().default(false),
        exercises: z.array(z.object({
          name: z.string().min(1),
          sets: z.number().int().positive(),
          reps: z.string().min(1),
          restSeconds: z.number().int().positive().optional(),
          notes: z.string().optional(),
          youtubeUrl: z.string().optional(),
        })).default([]),
      })),
    }),
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { planId } = req.params;
    const { title, workoutDays } = req.body;

    const plan = await prisma.workoutPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError('Workout plan');

    type IncomingDay = {
      dayOfWeek: number;
      title: string;
      isRestDay?: boolean;
      exercises?: { name: string; sets: number; reps: string; restSeconds?: number; notes?: string; youtubeUrl?: string }[];
    };

    const updated = await prisma.$transaction(async tx => {
      // Reconcile days in place so completion history (which the accountability
      // ledger depends on) survives edits. A day is matched by dayOfWeek; only
      // days removed from the plan lose their history (FK cascade).
      const existingDays = await tx.workoutDay.findMany({ where: { workoutPlanId: planId } });
      const unmatched = [...existingDays];

      for (const day of workoutDays as IncomingDay[]) {
        const matchIdx = unmatched.findIndex(d => d.dayOfWeek === day.dayOfWeek);
        const exercises = (day.exercises ?? []).map((ex, idx) => ({ ...ex, orderIndex: idx }));

        if (matchIdx >= 0) {
          const existing = unmatched.splice(matchIdx, 1)[0];
          await tx.exercise.deleteMany({ where: { workoutDayId: existing.id } });
          await tx.workoutDay.update({
            where: { id: existing.id },
            data: {
              title: day.title,
              isRestDay: day.isRestDay ?? false,
              exercises: { create: exercises },
            },
          });
        } else {
          await tx.workoutDay.create({
            data: {
              workoutPlanId: planId,
              dayOfWeek: day.dayOfWeek,
              title: day.title,
              isRestDay: day.isRestDay ?? false,
              exercises: { create: exercises },
            },
          });
        }
      }

      if (unmatched.length > 0) {
        await tx.workoutDay.deleteMany({ where: { id: { in: unmatched.map(d => d.id) } } });
      }

      return tx.workoutPlan.update({
        where: { id: planId },
        data: { title },
        include: {
          workoutDays: {
            include: { exercises: { orderBy: { orderIndex: 'asc' } } },
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      });
    });

    await NotificationService.create(
      plan.userId,
      'WORKOUT_ASSIGNED',
      'Workout Plan Updated',
      `Your coach updated your workout plan: "${title}"`,
      { planId }
    );

    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/plans/:planId',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const plan = await prisma.workoutPlan.findUnique({ where: { id: req.params.planId } });
    if (!plan) throw new NotFoundError('Workout plan');
    await prisma.workoutPlan.delete({ where: { id: req.params.planId } });
    res.json({ success: true, data: { message: 'Workout plan deleted' } });
  })
);

// ==================== WORKOUT DAY ROUTES ====================

const exerciseInputSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().positive(),
  reps: z.string().min(1),
  restSeconds: z.number().int().positive().optional(),
  notes: z.string().optional(),
  youtubeUrl: z.string().optional(),
  orderIndex: z.number().int().optional(),
});

router.post(
  '/plans/:planId/days',
  authenticate,
  requireRole('ADMIN'),
  validate({
    body: z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      title: z.string().min(1),
      isRestDay: z.boolean().optional(),
      exercises: z.array(exerciseInputSchema).optional(),
    }),
  }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const plan = await prisma.workoutPlan.findUnique({ where: { id: req.params.planId } });
    if (!plan) throw new NotFoundError('Workout plan');

    const day = await prisma.workoutDay.create({
      data: {
        workoutPlanId: req.params.planId,
        dayOfWeek: req.body.dayOfWeek,
        title: req.body.title,
        isRestDay: req.body.isRestDay ?? false,
        exercises: req.body.exercises
          ? { create: req.body.exercises.map((ex: { name: string; sets: number; reps: string; restSeconds?: number; notes?: string; youtubeUrl?: string; orderIndex?: number }, idx: number) => ({ ...ex, orderIndex: ex.orderIndex ?? idx })) }
          : undefined,
      },
      include: { exercises: { orderBy: { orderIndex: 'asc' } } },
    });

    res.status(201).json({ success: true, data: day });
  })
);

router.patch(
  '/days/:dayId',
  authenticate,
  requireRole('ADMIN'),
  validate({
    body: z.object({
      title: z.string().min(1).optional(),
      dayOfWeek: z.number().int().min(0).max(6).optional(),
      isRestDay: z.boolean().optional(),
    }),
  }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const day = await prisma.workoutDay.findUnique({ where: { id: req.params.dayId } });
    if (!day) throw new NotFoundError('Workout day');

    const updated = await prisma.workoutDay.update({
      where: { id: req.params.dayId },
      data: { title: req.body.title, dayOfWeek: req.body.dayOfWeek, isRestDay: req.body.isRestDay },
      include: { exercises: { orderBy: { orderIndex: 'asc' } } },
    });

    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/days/:dayId',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const day = await prisma.workoutDay.findUnique({ where: { id: req.params.dayId } });
    if (!day) throw new NotFoundError('Workout day');
    await prisma.workoutDay.delete({ where: { id: req.params.dayId } });
    res.json({ success: true, data: { message: 'Workout day deleted' } });
  })
);

// ==================== EXERCISE ROUTES ====================

router.post(
  '/days/:dayId/exercises',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: exerciseInputSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const day = await prisma.workoutDay.findUnique({ where: { id: req.params.dayId } });
    if (!day) throw new NotFoundError('Workout day');

    const maxOrder = await prisma.exercise.aggregate({
      where: { workoutDayId: req.params.dayId },
      _max: { orderIndex: true },
    });

    const exercise = await prisma.exercise.create({
      data: {
        workoutDayId: req.params.dayId,
        name: req.body.name,
        sets: req.body.sets,
        reps: req.body.reps,
        restSeconds: req.body.restSeconds,
        notes: req.body.notes,
        youtubeUrl: req.body.youtubeUrl || null,
        orderIndex: req.body.orderIndex ?? (maxOrder._max.orderIndex ?? 0) + 1,
      },
    });

    res.status(201).json({ success: true, data: exercise });
  })
);

router.patch(
  '/exercises/:exerciseId',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: exerciseInputSchema.partial() }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const exercise = await prisma.exercise.findUnique({ where: { id: req.params.exerciseId } });
    if (!exercise) throw new NotFoundError('Exercise');

    const updated = await prisma.exercise.update({
      where: { id: req.params.exerciseId },
      data: {
        name: req.body.name,
        sets: req.body.sets,
        reps: req.body.reps,
        restSeconds: req.body.restSeconds,
        notes: req.body.notes,
        youtubeUrl: req.body.youtubeUrl === '' ? null : req.body.youtubeUrl,
        orderIndex: req.body.orderIndex,
      },
    });

    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/exercises/:exerciseId',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const exercise = await prisma.exercise.findUnique({ where: { id: req.params.exerciseId } });
    if (!exercise) throw new NotFoundError('Exercise');
    await prisma.exercise.delete({ where: { id: req.params.exerciseId } });
    res.json({ success: true, data: { message: 'Exercise deleted' } });
  })
);

// ==================== CLIENT WORKOUT COMPLETION ====================

router.post(
  '/complete',
  authenticate,
  validate({
    body: z.object({
      workoutDayId: z.string().uuid(),
      durationMinutes: z.number().int().min(0).optional(),
      feedback: z.string().max(500).optional(),
    }),
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { workoutDayId, durationMinutes, feedback } = req.body;
    const userId = req.user!.userId;

    const day = await prisma.workoutDay.findUnique({
      where: { id: workoutDayId },
      include: { workoutPlan: true },
    });

    if (!day) throw new NotFoundError('Workout day');
    if (day.workoutPlan.userId !== userId) throw new ForbiddenError("Cannot complete another user's workout");

    const completion = await prisma.workoutCompletion.create({
      data: { userId, workoutDayId, durationMinutes, feedback },
    });

    await NotificationService.create(
      userId,
      'WORKOUT_COMPLETED',
      'Workout Completed',
      `Great job completing "${day.title}"!`,
      { completionId: completion.id }
    );

    await NotificationService.notifyAdmins(
      'WORKOUT_COMPLETED',
      'Workout Completed',
      `User completed workout: "${day.title}"`,
      { userId, completionId: completion.id }
    );

    res.status(201).json({ success: true, data: completion });
  })
);

router.get(
  '/completions',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const where = req.user!.role === 'ADMIN' ? {} : { userId: req.user!.userId };

    const completions = await prisma.workoutCompletion.findMany({
      where,
      include: { workoutDay: { select: { title: true, dayOfWeek: true } } },
      orderBy: { completedAt: 'desc' },
      take: 200,
    });

    res.json({ success: true, data: completions });
  })
);

// Get user's active plan with calendar data
router.get(
  '/my-plan',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const userId = req.user!.role === 'USER' ? req.user!.userId : req.query.userId as string;
    if (!userId) throw new NotFoundError('User ID required');

    const plan = await prisma.workoutPlan.findFirst({
      where: { userId, active: true },
      include: {
        workoutDays: {
          include: { exercises: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get last 60 days of completions for calendar
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const completions = await prisma.workoutCompletion.findMany({
      where: { userId, completedAt: { gte: sixtyDaysAgo } },
      include: { workoutDay: { select: { id: true, title: true, dayOfWeek: true } } },
      orderBy: { completedAt: 'desc' },
    });

    res.json({
      success: true,
      data: { plan, completions, todayDayOfWeek: new Date().getDay() },
    });
  })
);

// Admin: get completion stats
router.get(
  '/stats',
  authenticate,
  requireRole('ADMIN', 'MANAGER'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completions = await prisma.workoutCompletion.groupBy({
      by: ['userId'],
      where: { completedAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    });

    res.json({ success: true, data: completions });
  })
);

export default router;
