/**
 * Zod validation schemas for announcements and resources
 */

import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  audienceType: z.enum(['ALL', 'SPECIFIC']).default('ALL'),
  recipientIds: z.array(z.string().uuid()).optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const announcementIdParamSchema = z.object({
  announcementId: z.string().uuid('Invalid announcement ID'),
});

export const createResourceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  url: z.string().url('Invalid URL'),
  category: z.enum(['NUTRITION', 'FORM', 'MINDSET', 'OTHER']).default('OTHER'),
});

export const updateResourceSchema = createResourceSchema.partial();

export const resourceIdParamSchema = z.object({
  resourceId: z.string().uuid('Invalid resource ID'),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
