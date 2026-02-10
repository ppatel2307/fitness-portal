/**
 * Zod validation schemas for progress tracking
 */

import { z } from 'zod';

export const weightLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  weight: z.number().positive('Weight must be positive'),
  note: z.string().optional(),
});

export const updateWeightLogSchema = weightLogSchema.partial();

export const weightLogIdParamSchema = z.object({
  logId: z.string().uuid('Invalid log ID'),
});

export const checkInSchema = z.object({
  weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  energy: z.number().int().min(1).max(10),
  sleepHours: z.number().min(0).max(24),
  stress: z.number().int().min(1).max(10),
  adherence: z.number().int().min(1).max(10),
  notes: z.string().optional(),
});

export const checkInIdParamSchema = z.object({
  checkInId: z.string().uuid('Invalid check-in ID'),
});

export type WeightLogInput = z.infer<typeof weightLogSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
