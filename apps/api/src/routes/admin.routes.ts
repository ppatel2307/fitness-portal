/**
 * Admin-specific routes
 * Dashboard stats and admin operations
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ApiResponse } from '../types/index.js';

const router = Router();

/**
 * GET /admin/dashboard
 * Get admin dashboard statistics
 */
router.get(
  '/dashboard',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    // Total active clients
    const totalClients = await prisma.user.count({
      where: { role: 'CLIENT', active: true },
    });

    // Get start of current week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Workouts scheduled this week (count workout days * active plans)
    const activePlans = await prisma.workoutPlan.findMany({
      where: { active: true },
      include: { workoutDays: true },
    });
    const workoutsThisWeek = activePlans.reduce(
      (acc, plan) => acc + plan.workoutDays.length,
      0
    );

    // Check-ins pending (from last week without response)
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const checkInsThisWeek = await prisma.checkIn.count({
      where: {
        weekOf: { gte: lastWeekStart, lt: weekStart },
      },
    });

    // Get all clients for pending check-ins calculation
    const activeClients = await prisma.user.count({
      where: { role: 'CLIENT', active: true },
    });
    const pendingCheckIns = Math.max(0, activeClients - checkInsThisWeek);

    // Latest workout logs (completions)
    const latestCompletions = await prisma.workoutCompletion.findMany({
      take: 10,
      orderBy: { completedAt: 'desc' },
      include: {
        // We need to manually join since there's no direct relation
      },
    });

    // Get client names for completions
    const clientIds = [...new Set(latestCompletions.map((c) => c.clientId))];
    const clients = await prisma.user.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, name: true },
    });
    const clientMap = new Map(clients.map((c) => [c.id, c.name]));

    const completionsWithNames = latestCompletions.map((c) => ({
      ...c,
      clientName: clientMap.get(c.clientId) || 'Unknown',
    }));

    // Recent check-ins
    const recentCheckIns = await prisma.checkIn.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      data: {
        totalClients,
        workoutsThisWeek,
        pendingCheckIns,
        latestCompletions: completionsWithNames,
        recentCheckIns,
      },
    });
  })
);

/**
 * GET /admin/clients-overview
 * Get overview of all clients with their latest stats
 */
router.get(
  '/clients-overview',
  authenticate,
  requireRole('ADMIN'),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const clients = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true,
        clientProfile: {
          select: { goal: true },
        },
        workoutPlans: {
          where: { active: true },
          select: { id: true, title: true },
          take: 1,
        },
        nutritionTarget: {
          select: { calories: true },
        },
        weightLogs: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { weight: true, date: true },
        },
        checkIns: {
          orderBy: { weekOf: 'desc' },
          take: 1,
          select: { weekOf: true, adherence: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const clientsOverview = clients.map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      active: client.active,
      createdAt: client.createdAt,
      goal: client.clientProfile?.goal,
      hasWorkoutPlan: client.workoutPlans.length > 0,
      workoutPlanTitle: client.workoutPlans[0]?.title,
      hasNutritionTargets: !!client.nutritionTarget,
      latestWeight: client.weightLogs[0]?.weight,
      latestWeightDate: client.weightLogs[0]?.date,
      lastCheckIn: client.checkIns[0]?.weekOf,
      lastAdherence: client.checkIns[0]?.adherence,
    }));

    res.json({
      success: true,
      data: clientsOverview,
    });
  })
);

export default router;
