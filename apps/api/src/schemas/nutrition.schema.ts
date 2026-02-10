/**
 * Zod validation schemas for nutrition management
 */

import { z } from 'zod';

export const nutritionTargetSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  calories: z.number().int().positive(),
  protein: z.number().int().nonnegative(),
  carbs: z.number().int().nonnegative(),
  fat: z.number().int().nonnegative(),
  waterLiters: z.number().positive().default(2.5),
  notes: z.string().optional(),
});

export const updateNutritionTargetSchema = nutritionTargetSchema.omit({ clientId: true }).partial();

export const foodLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mealName: z.string().min(1, 'Meal name is required'),
  calories: z.number().int().nonnegative(),
  protein: z.number().int().nonnegative(),
  carbs: z.number().int().nonnegative(),
  fat: z.number().int().nonnegative(),
});

export const updateFoodLogSchema = foodLogSchema.partial();

export const foodLogIdParamSchema = z.object({
  logId: z.string().uuid('Invalid log ID'),
});

export const dateQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type NutritionTargetInput = z.infer<typeof nutritionTargetSchema>;
export type FoodLogInput = z.infer<typeof foodLogSchema>;
