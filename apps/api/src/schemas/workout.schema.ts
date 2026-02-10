/**
 * Zod validation schemas for workout management
 */

import { z } from 'zod';

export const exerciseSchema = z.object({
  name: z.string().min(1, 'Exercise name is required'),
  sets: z.number().int().positive(),
  reps: z.string().min(1, 'Reps is required'), // e.g., "8-12", "AMRAP"
  rpe: z.number().min(1).max(10).optional(),
  weight: z.string().optional(),
  restSeconds: z.number().int().positive().optional(),
  notes: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
  orderIndex: z.number().int().optional(),
});

export const workoutDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday
  title: z.string().min(1, 'Day title is required'),
  exercises: z.array(exerciseSchema).optional(),
});

export const createWorkoutPlanSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  title: z.string().min(1, 'Plan title is required'),
  weekStart: z.string().datetime().optional(),
  workoutDays: z.array(workoutDaySchema).optional(),
});

export const updateWorkoutPlanSchema = z.object({
  title: z.string().min(1).optional(),
  weekStart: z.string().datetime().optional(),
  active: z.boolean().optional(),
});

export const addWorkoutDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  title: z.string().min(1, 'Day title is required'),
  exercises: z.array(exerciseSchema).optional(),
});

export const updateWorkoutDaySchema = z.object({
  title: z.string().min(1).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
});

export const addExerciseSchema = exerciseSchema;

export const updateExerciseSchema = exerciseSchema.partial();

export const completeWorkoutSchema = z.object({
  workoutDayId: z.string().uuid('Invalid workout day ID'),
  comment: z.string().optional(),
});

export const workoutPlanIdParamSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
});

export const workoutDayIdParamSchema = z.object({
  dayId: z.string().uuid('Invalid day ID'),
});

export const exerciseIdParamSchema = z.object({
  exerciseId: z.string().uuid('Invalid exercise ID'),
});

export type CreateWorkoutPlanInput = z.infer<typeof createWorkoutPlanSchema>;
export type UpdateWorkoutPlanInput = z.infer<typeof updateWorkoutPlanSchema>;
export type AddWorkoutDayInput = z.infer<typeof addWorkoutDaySchema>;
export type ExerciseInput = z.infer<typeof exerciseSchema>;
