/**
 * User management routes
 * Admin: CRUD clients
 * Client: View/update own profile
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthService } from '../services/auth.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ConflictError } from '../lib/errors.js';
import {
  createClientSchema,
  updateClientSchema,
  updateProfileSchema,
  clientIdParamSchema,
} from '../schemas/user.schema.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

// ==================== ADMIN ROUTES ====================

/**
 * GET /users/clients
 * List all clients (Admin only)
 */
router.get(
  '/clients',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        createdAt: true,
        clientProfile: {
          select: {
            goal: true,
            notes: true,
            height: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: clients,
    });
  })
);

/**
 * POST /users/clients
 * Create a new client (Admin only)
 */
router.post(
  '/clients',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: createClientSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { email, name, password, notes, goal, height } = req.body;

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('Email already in use');
    }

    const passwordHash = await AuthService.hashPassword(password);

    const client = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: 'CLIENT',
        clientProfile: {
          create: {
            notes,
            goal,
            height,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        createdAt: true,
        clientProfile: true,
      },
    });

    res.status(201).json({
      success: true,
      data: client,
    });
  })
);

/**
 * GET /users/clients/:clientId
 * Get client details (Admin only)
 */
router.get(
  '/clients/:clientId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: clientIdParamSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { clientId } = req.params;

    const client = await prisma.user.findUnique({
      where: { id: clientId, role: 'CLIENT' },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        createdAt: true,
        clientProfile: true,
        nutritionTarget: true,
        workoutPlans: {
          where: { active: true },
          include: {
            workoutDays: {
              include: { exercises: { orderBy: { orderIndex: 'asc' } } },
              orderBy: { dayOfWeek: 'asc' },
            },
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundError('Client');
    }

    res.json({
      success: true,
      data: client,
    });
  })
);

/**
 * PATCH /users/clients/:clientId
 * Update client (Admin only)
 */
router.patch(
  '/clients/:clientId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: clientIdParamSchema, body: updateClientSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { clientId } = req.params;
    const { name, notes, goal, height, active, timezone } = req.body;

    const client = await prisma.user.findUnique({
      where: { id: clientId, role: 'CLIENT' },
    });

    if (!client) {
      throw new NotFoundError('Client');
    }

    const updated = await prisma.user.update({
      where: { id: clientId },
      data: {
        name,
        active,
        clientProfile: {
          upsert: {
            create: { notes, goal, height, timezone },
            update: { notes, goal, height, timezone },
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        clientProfile: true,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /users/clients/:clientId
 * Deactivate client (soft delete)
 */
router.delete(
  '/clients/:clientId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: clientIdParamSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { clientId } = req.params;

    const client = await prisma.user.findUnique({
      where: { id: clientId, role: 'CLIENT' },
    });

    if (!client) {
      throw new NotFoundError('Client');
    }

    await prisma.user.update({
      where: { id: clientId },
      data: { active: false },
    });

    res.json({
      success: true,
      data: { message: 'Client deactivated successfully' },
    });
  })
);

// ==================== CLIENT PROFILE ROUTES ====================

/**
 * GET /users/profile
 * Get own profile (Client/Admin)
 */
router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        clientProfile: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  })
);

/**
 * PATCH /users/profile
 * Update own profile
 */
router.patch(
  '/profile',
  authenticate,
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { name, height, goal, timezone } = req.body;
    const userId = req.user!.userId;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        clientProfile: {
          upsert: {
            create: { height, goal, timezone },
            update: { height, goal, timezone },
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        clientProfile: true,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

export default router;
