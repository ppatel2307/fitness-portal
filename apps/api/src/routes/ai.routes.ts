import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { GeminiService, ChatContext } from '../services/gemini.service.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { NotFoundError } from '../lib/errors.js';

const router = Router();

async function buildChatContext(userId: string): Promise<ChatContext> {
  const [user, onboarding, workoutPlan, mealPlan, knowledgeDoc] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.onboardingQuestionnaire.findUnique({ where: { userId } }),
    prisma.workoutPlan.findFirst({
      where: { userId, active: true },
      include: { workoutDays: { include: { exercises: { orderBy: { orderIndex: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.mealPlan.findFirst({ where: { userId }, orderBy: { weekStart: 'desc' } }),
    prisma.aIDocument.findFirst({ where: { type: 'KNOWLEDGE_BASE', active: true } }),
  ]);

  return {
    userProfile: {
      name: user?.name ?? 'User',
      age: onboarding?.age,
      gender: onboarding?.gender,
      fitnessGoals: onboarding?.fitnessGoals,
      injuries: onboarding?.injuries,
      dietaryRestrictions: onboarding?.dietaryRestrictions,
      activityLevel: onboarding?.activityLevel,
    },
    workoutPlan: workoutPlan
      ? {
          title: workoutPlan.title,
          days: workoutPlan.workoutDays.map(d => ({
            dayOfWeek: d.dayOfWeek,
            title: d.title,
            exercises: d.exercises.map(e => ({ name: e.name, sets: e.sets, reps: e.reps })),
          })),
        }
      : undefined,
    mealPlan: mealPlan
      ? {
          breakfast: mealPlan.breakfast,
          lunch: mealPlan.lunch,
          dinner: mealPlan.dinner,
          snacks: mealPlan.snacks,
        }
      : undefined,
    knowledgeBase: knowledgeDoc?.content,
  };
}

// Get or create active conversation
router.get(
  '/conversation',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const userId = req.user!.userId;

    let conversation = await prisma.aIConversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: { userId },
        include: { messages: true },
      });
    }

    res.json({ success: true, data: conversation });
  })
);

// Send a chat message
router.post(
  '/chat',
  authenticate,
  validate({
    body: z.object({
      message: z.string().min(1).max(2000),
      conversationId: z.string().optional(),
    }),
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const userId = req.user!.userId;
    const { message, conversationId } = req.body;

    let conversation;
    if (conversationId) {
      conversation = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      });
      if (!conversation) throw new NotFoundError('Conversation');
    } else {
      conversation = await prisma.aIConversation.create({
        data: { userId },
        include: { messages: true },
      });
    }

    // Build history for Gemini
    const history = conversation.messages.map(m => ({
      role: m.role === 'USER' ? ('user' as const) : ('model' as const),
      parts: [{ text: m.content }],
    }));

    const ctx = await buildChatContext(userId);
    const aiResponse = await GeminiService.chat(message, history, ctx);

    // Save messages
    await prisma.aIMessage.createMany({
      data: [
        { conversationId: conversation.id, role: 'USER', content: message },
        { conversationId: conversation.id, role: 'ASSISTANT', content: aiResponse },
      ],
    });

    await prisma.aIConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        message: aiResponse,
      },
    });
  })
);

// Clear conversation
router.delete(
  '/conversation/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    await prisma.aIConversation.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    res.json({ success: true, data: { message: 'Conversation cleared' } });
  })
);

// Generate meal plan
router.post(
  '/meal-plan/generate',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const userId = req.user!.userId;

    const [user, onboarding, nutritionTarget, nutritionGuide] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
      prisma.onboardingQuestionnaire.findUnique({ where: { userId } }),
      prisma.nutritionTarget.findUnique({ where: { userId } }),
      prisma.aIDocument.findFirst({ where: { type: 'NUTRITION_GUIDE', active: true } }),
    ]);

    const mealPlanData = await GeminiService.generateMealPlan({
      userProfile: {
        name: user?.name ?? 'User',
        age: onboarding?.age,
        gender: onboarding?.gender,
        weight: onboarding?.weight,
        height: onboarding?.height,
        fitnessGoals: onboarding?.fitnessGoals,
        dietaryRestrictions: onboarding?.dietaryRestrictions,
        activityLevel: onboarding?.activityLevel,
        injuries: onboarding?.injuries,
      },
      nutritionTarget: nutritionTarget
        ? {
            calories: nutritionTarget.calories,
            protein: nutritionTarget.protein,
            carbs: nutritionTarget.carbs,
            fat: nutritionTarget.fat,
          }
        : undefined,
      nutritionGuide: nutritionGuide?.content,
    });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week

    const mealPlan = await prisma.mealPlan.upsert({
      where: {
        // There's no unique constraint here, so we find and update or create
        id: (await prisma.mealPlan.findFirst({ where: { userId, weekStart } }))?.id ?? 'new',
      },
      create: {
        userId,
        weekStart,
        breakfast: mealPlanData.breakfast,
        lunch: mealPlanData.lunch,
        dinner: mealPlanData.dinner,
        snacks: mealPlanData.snacks,
        groceries: mealPlanData.groceries,
        calories: mealPlanData.totalCalories,
        notes: mealPlanData.notes,
      },
      update: {
        breakfast: mealPlanData.breakfast,
        lunch: mealPlanData.lunch,
        dinner: mealPlanData.dinner,
        snacks: mealPlanData.snacks,
        groceries: mealPlanData.groceries,
        calories: mealPlanData.totalCalories,
        notes: mealPlanData.notes,
      },
    });

    res.json({ success: true, data: mealPlan });
  })
);

// Adjust meal plan
router.post(
  '/meal-plan/adjust',
  authenticate,
  validate({ body: z.object({ adjustment: z.string().min(1).max(500) }) }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const userId = req.user!.userId;
    const { adjustment } = req.body;

    const [currentPlan, onboarding] = await Promise.all([
      prisma.mealPlan.findFirst({ where: { userId }, orderBy: { weekStart: 'desc' } }),
      prisma.onboardingQuestionnaire.findUnique({ where: { userId } }),
    ]);

    if (!currentPlan) throw new NotFoundError('Meal plan');

    const adjusted = await GeminiService.adjustMealPlan(
      {
        breakfast: currentPlan.breakfast,
        lunch: currentPlan.lunch,
        dinner: currentPlan.dinner,
        snacks: currentPlan.snacks,
      },
      adjustment,
      {
        name: 'User',
        dietaryRestrictions: onboarding?.dietaryRestrictions,
      }
    );

    const updatedPlan = await prisma.mealPlan.update({
      where: { id: currentPlan.id },
      data: {
        breakfast: adjusted.breakfast,
        lunch: adjusted.lunch,
        dinner: adjusted.dinner,
        snacks: adjusted.snacks,
        groceries: adjusted.groceries,
        calories: adjusted.totalCalories,
        notes: adjusted.notes,
      },
    });

    res.json({ success: true, data: updatedPlan });
  })
);

export default router;
