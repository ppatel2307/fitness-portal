import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError } from '../lib/errors.js';
import { ApiResponse, AuthenticatedRequest } from '../types/index.js';

const router = Router();

// Dashboard statistics
router.get(
  '/dashboard',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [totalUsers, pendingRequests, completionsThisWeek, unreadNotifications] = await Promise.all([
      prisma.user.count({ where: { role: 'USER', active: true } }),
      prisma.userRequest.count({ where: { status: 'PENDING' } }),
      prisma.workoutCompletion.count({ where: { completedAt: { gte: weekStart } } }),
      prisma.notification.count({ where: { read: false } }),
    ]);

    const recentUsers = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true, name: true, email: true, createdAt: true,
        onboarding: { select: { completed: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentRequests = await prisma.userRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      success: true,
      data: { totalUsers, pendingRequests, completionsThisWeek, unreadNotifications, recentUsers, recentRequests },
    });
  })
);

// Get all users
router.get(
  '/users',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { role } = req.query;
    const users = await prisma.user.findMany({
      where: role ? { role: role as 'USER' | 'MANAGER' | 'ADMIN' } : { role: 'USER' },
      select: {
        id: true, email: true, name: true, active: true, createdAt: true, avatarUrl: true,
        clientProfile: { select: { goal: true, height: true, weight: true } },
        onboarding: { select: { completed: true, fitnessGoals: true } },
        workoutPlans: { where: { active: true }, select: { id: true, title: true }, take: 1 },
        assignedManager: { include: { manager: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  })
);

// Get specific user
router.get(
  '/users/:userId',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: {
        clientProfile: true,
        onboarding: true,
        workoutPlans: {
          include: {
            workoutDays: { include: { exercises: { orderBy: { orderIndex: 'asc' } } }, orderBy: { dayOfWeek: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
        },
        mealPlans: { orderBy: { weekStart: 'desc' }, take: 1 },
        workoutCompletions: { orderBy: { completedAt: 'desc' }, take: 30 },
        userRequests: { orderBy: { createdAt: 'desc' } },
        assignedManager: { include: { manager: { select: { id: true, name: true, email: true } } } },
      },
    });

    if (!user) throw new NotFoundError('User');
    res.json({ success: true, data: user });
  })
);

// Update user
router.patch(
  '/users/:userId',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { name, active, role } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) throw new NotFoundError('User');

    const updated = await prisma.user.update({
      where: { id: req.params.userId },
      data: { name, active, role },
      select: { id: true, email: true, name: true, role: true, active: true },
    });

    res.json({ success: true, data: updated });
  })
);

// Assign manager to user
router.post(
  '/users/:userId/assign-manager',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: z.object({ managerId: z.string().uuid() }) }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { userId } = req.params;
    const { managerId } = req.body;

    const [user, manager] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: managerId, role: 'MANAGER' } }),
    ]);

    if (!user) throw new NotFoundError('User');
    if (!manager) throw new NotFoundError('Manager');

    const assignment = await prisma.managerClient.upsert({
      where: { clientId: userId },
      create: { managerId, clientId: userId },
      update: { managerId },
    });

    res.json({ success: true, data: assignment });
  })
);

// AI Documents management
router.get(
  '/documents',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const docs = await prisma.aIDocument.findMany({ orderBy: { updatedAt: 'desc' } });
    res.json({ success: true, data: docs });
  })
);

router.post(
  '/documents',
  authenticate,
  requireRole('ADMIN'),
  validate({
    body: z.object({
      title: z.string().min(1).max(200),
      type: z.enum(['KNOWLEDGE_BASE', 'NUTRITION_GUIDE']),
      content: z.string().min(1),
    }),
  }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const doc = await prisma.aIDocument.create({ data: req.body });
    res.status(201).json({ success: true, data: doc });
  })
);

router.patch(
  '/documents/:id',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const doc = await prisma.aIDocument.findUnique({ where: { id: req.params.id } });
    if (!doc) throw new NotFoundError('Document');

    const updated = await prisma.aIDocument.update({
      where: { id: req.params.id },
      data: { title: req.body.title, content: req.body.content, active: req.body.active },
    });

    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/documents/:id',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const doc = await prisma.aIDocument.findUnique({ where: { id: req.params.id } });
    if (!doc) throw new NotFoundError('Document');
    await prisma.aIDocument.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Document deleted' } });
  })
);

// Get managers list
router.get(
  '/managers',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const managers = await prisma.user.findMany({
      where: { role: 'MANAGER', active: true },
      select: {
        id: true, name: true, email: true,
        managedClients: { select: { clientId: true } },
      },
    });
    res.json({ success: true, data: managers });
  })
);

// Create manager
router.post(
  '/managers',
  authenticate,
  requireRole('ADMIN'),
  validate({
    body: z.object({
      email: z.string().email(),
      name: z.string().min(1),
      password: z.string().min(8),
    }),
  }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { email, name, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Email already in use' } });
    }

    const { AuthService } = await import('../services/auth.service.js');
    const passwordHash = await AuthService.hashPassword(password);

    const manager = await prisma.user.create({
      data: { email: email.toLowerCase(), name, passwordHash, role: 'MANAGER' },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    res.status(201).json({ success: true, data: manager });
  })
);

export default router;
