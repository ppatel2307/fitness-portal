/**
 * Content management routes
 * Announcements and resources
 */

import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError } from '../lib/errors.js';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementIdParamSchema,
  createResourceSchema,
  updateResourceSchema,
  resourceIdParamSchema,
} from '../schemas/content.schema.js';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';

const router = Router();

// ==================== ANNOUNCEMENTS ====================

/**
 * POST /content/announcements
 * Create announcement (Admin only)
 */
router.post(
  '/announcements',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: createAnnouncementSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { title, body, audienceType, recipientIds } = req.body;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        body,
        audienceType,
        recipients:
          audienceType === 'SPECIFIC' && recipientIds
            ? { connect: recipientIds.map((id: string) => ({ id })) }
            : undefined,
      },
      include: {
        recipients: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: announcement,
    });
  })
);

/**
 * GET /content/announcements
 * Get announcements (Admin: all, Client: relevant)
 */
router.get(
  '/announcements',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    let where = {};

    if (req.user!.role === 'CLIENT') {
      where = {
        OR: [
          { audienceType: 'ALL' },
          { recipients: { some: { id: req.user!.userId } } },
        ],
      };
    }

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        recipients: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: announcements,
    });
  })
);

/**
 * GET /content/announcements/:announcementId
 * Get specific announcement
 */
router.get(
  '/announcements/:announcementId',
  authenticate,
  validate({ params: announcementIdParamSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const { announcementId } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        recipients: { select: { id: true, name: true, email: true } },
      },
    });

    if (!announcement) {
      throw new NotFoundError('Announcement');
    }

    // Check if client can access this announcement
    if (req.user!.role === 'CLIENT') {
      if (
        announcement.audienceType !== 'ALL' &&
        !announcement.recipients.some((r) => r.id === req.user!.userId)
      ) {
        throw new NotFoundError('Announcement');
      }
    }

    res.json({
      success: true,
      data: announcement,
    });
  })
);

/**
 * PATCH /content/announcements/:announcementId
 * Update announcement (Admin only)
 */
router.patch(
  '/announcements/:announcementId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: announcementIdParamSchema, body: updateAnnouncementSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { announcementId } = req.params;
    const { title, body, audienceType, recipientIds } = req.body;

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new NotFoundError('Announcement');
    }

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        title,
        body,
        audienceType,
        recipients:
          audienceType === 'SPECIFIC' && recipientIds
            ? { set: recipientIds.map((id: string) => ({ id })) }
            : audienceType === 'ALL'
            ? { set: [] }
            : undefined,
      },
      include: {
        recipients: { select: { id: true, name: true } },
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /content/announcements/:announcementId
 * Delete announcement (Admin only)
 */
router.delete(
  '/announcements/:announcementId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: announcementIdParamSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { announcementId } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new NotFoundError('Announcement');
    }

    await prisma.announcement.delete({ where: { id: announcementId } });

    res.json({
      success: true,
      data: { message: 'Announcement deleted' },
    });
  })
);

// ==================== RESOURCES ====================

/**
 * POST /content/resources
 * Create resource (Admin only)
 */
router.post(
  '/resources',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: createResourceSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const resource = await prisma.resource.create({
      data: req.body,
    });

    res.status(201).json({
      success: true,
      data: resource,
    });
  })
);

/**
 * GET /content/resources
 * Get all resources
 */
router.get(
  '/resources',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    const category = req.query.category as string | undefined;

    const resources = await prisma.resource.findMany({
      where: category ? { category: category as any } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: resources,
    });
  })
);

/**
 * PATCH /content/resources/:resourceId
 * Update resource (Admin only)
 */
router.patch(
  '/resources/:resourceId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: resourceIdParamSchema, body: updateResourceSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { resourceId } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundError('Resource');
    }

    const updated = await prisma.resource.update({
      where: { id: resourceId },
      data: req.body,
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /content/resources/:resourceId
 * Delete resource (Admin only)
 */
router.delete(
  '/resources/:resourceId',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: resourceIdParamSchema }),
  asyncHandler(async (req, res: Response<ApiResponse>) => {
    const { resourceId } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundError('Resource');
    }

    await prisma.resource.delete({ where: { id: resourceId } });

    res.json({
      success: true,
      data: { message: 'Resource deleted' },
    });
  })
);

export default router;
