/**
 * Zod validation schemas for user/client management
 */

import { z } from 'zod';

export const createClientSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  notes: z.string().optional(),
  goal: z.string().optional(),
  height: z.number().positive().optional(),
});

export const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  notes: z.string().optional(),
  goal: z.string().optional(),
  height: z.number().positive().optional(),
  active: z.boolean().optional(),
  timezone: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  height: z.number().positive().optional(),
  goal: z.string().optional(),
  timezone: z.string().optional(),
});

export const clientIdParamSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
