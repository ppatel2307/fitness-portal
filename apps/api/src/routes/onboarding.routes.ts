import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotificationService } from '../services/notification.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

const onboardingSchema = z.object({
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  age: z.number().int().min(13).max(100).optional(),
  gender: z.string().optional(),
  fitnessExperience: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  dailyWorkoutMinutes: z.number().int().min(15).max(240).optional(),
  fitnessGoals: z.array(z.string()).default([]),
  injuries: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).default([]),
  equipment: z.array(z.string()).default([]),
  activityLevel: z.enum(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']).optional(),
});

router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const onboarding = await prisma.onboardingQuestionnaire.findUnique({
      where: { userId: req.user!.userId },
    });
    res.json({ success: true, data: onboarding });
  })
);

router.post(
  '/submit',
  authenticate,
  validate({ body: onboardingSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const userId = req.user!.userId;
    const data = req.body;

    const onboarding = await prisma.onboardingQuestionnaire.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
        completed: true,
        completedAt: new Date(),
      },
      update: {
        ...data,
        completed: true,
        completedAt: new Date(),
      },
    });

    // Update client profile with basic data
    await prisma.clientProfile.upsert({
      where: { userId },
      create: {
        userId,
        height: data.height,
        weight: data.weight,
        age: data.age,
        gender: data.gender,
        goal: (data.fitnessGoals as string[]).join(', '),
      },
      update: {
        height: data.height,
        weight: data.weight,
        age: data.age,
        gender: data.gender,
        goal: (data.fitnessGoals as string[]).join(', '),
      },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    await NotificationService.notifyAdmins(
      'NEW_USER_REGISTRATION',
      'New User Onboarding Complete',
      `${user?.name} has completed their onboarding questionnaire and requires a custom workout plan.`,
      { userId }
    );

    res.json({ success: true, data: onboarding });
  })
);

export default router;
