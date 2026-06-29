import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { StripeService } from '../services/stripe.service.js';

const router = Router();

router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true,
        clientProfile: true,
        onboarding: true,
        accountabilitySubscription: true,
      },
    });
    res.json({ success: true, data: user });
  })
);

router.patch(
  '/profile',
  authenticate,
  validate({
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      height: z.number().positive().optional(),
      weight: z.number().positive().optional(),
      goal: z.string().max(500).optional(),
      timezone: z.string().optional(),
    }),
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { name, height, weight, goal, timezone } = req.body;
    const userId = req.user!.userId;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        clientProfile: {
          upsert: {
            create: { height, weight, goal, timezone },
            update: { height, weight, goal, timezone },
          },
        },
      },
      select: {
        id: true, email: true, name: true, role: true, avatarUrl: true,
        clientProfile: true,
      },
    });

    res.json({ success: true, data: updated });
  })
);

// Stripe: setup payment method
router.post(
  '/payment/setup',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

    const customerId = await StripeService.getOrCreateCustomer(user.id, user.email, user.name);
    const clientSecret = await StripeService.createSetupIntent(customerId);

    res.json({ success: true, data: { clientSecret } });
  })
);

// Get payment methods
router.get(
  '/payment/methods',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const profile = await prisma.clientProfile.findUnique({ where: { userId: req.user!.userId } });
    if (!profile?.stripeCustomerId) return res.json({ success: true, data: [] });

    const methods = await StripeService.getPaymentMethods(profile.stripeCustomerId);
    res.json({ success: true, data: methods });
  })
);

// Toggle accountability tier
router.post(
  '/accountability',
  authenticate,
  validate({ body: z.object({ active: z.boolean() }) }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { active } = req.body;
    const userId = req.user!.userId;

    const subscription = await prisma.accountabilitySubscription.upsert({
      where: { userId },
      create: { userId, active, tier: active ? 'accountability' : 'free' },
      update: { active, tier: active ? 'accountability' : 'free' },
    });

    res.json({ success: true, data: subscription });
  })
);

// Get missed workout charges
router.get(
  '/charges',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const charges = await prisma.missedWorkoutCharge.findMany({
      where: { userId: req.user!.userId },
      orderBy: { workoutDate: 'desc' },
    });
    res.json({ success: true, data: charges });
  })
);

// User self-reports they've paid their outstanding balance (honor system).
// Marks all of their PENDING charges as paid.
router.post(
  '/charges/pay',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const result = await prisma.missedWorkoutCharge.updateMany({
      where: { userId: req.user!.userId, status: 'PENDING' },
      data: { status: 'SUCCEEDED' },
    });
    res.json({ success: true, data: { cleared: result.count } });
  })
);

export default router;
