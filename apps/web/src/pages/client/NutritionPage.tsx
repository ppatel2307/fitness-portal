/**
 * Client Nutrition Page
 * Track daily food intake against targets
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, getErrorMessage } from '@/lib/api';
import { getToday, formatDate, calculateMacroPercentage } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Modal,
  EmptyState,
  Badge,
} from '@/components/ui';
import type { NutritionTarget, FoodLog, ApiResponse } from '@/types';
import { Plus, Trash2, Apple, ChevronLeft, ChevronRight } from 'lucide-react';

const foodLogSchema = z.object({
  mealName: z.string().min(1, 'Meal name is required'),
  calories: z.coerce.number().int().nonnegative(),
  protein: z.coerce.number().int().nonnegative(),
  carbs: z.coerce.number().int().nonnegative(),
  fat: z.coerce.number().int().nonnegative(),
});

type FoodLogForm = z.infer<typeof foodLogSchema>;

// Common foods for quick add
const commonFoods: FoodLogForm[] = [
  { mealName: 'Chicken Breast (150g)', calories: 248, protein: 47, carbs: 0, fat: 5 },
  { mealName: 'Brown Rice (1 cup)', calories: 216, protein: 5, carbs: 45, fat: 2 },
  { mealName: 'Eggs (2 large)', calories: 140, protein: 12, carbs: 1, fat: 10 },
  { mealName: 'Greek Yogurt (200g)', calories: 130, protein: 20, carbs: 8, fat: 2 },
  { mealName: 'Banana (medium)', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { mealName: 'Protein Shake', calories: 150, protein: 25, carbs: 5, fat: 2 },
];

export function NutritionPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FoodLogForm>({
    resolver: zodResolver(foodLogSchema),
    defaultValues: {
      mealName: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
  });

  // Fetch nutrition targets
  const { data: targets } = useQuery({
    queryKey: ['my-nutrition-targets'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<NutritionTarget>>('/nutrition/my-targets');
      return response.data.data;
    },
  });

  // Fetch food logs for selected date
  const { data: logs, isLoading } = useQuery({
    queryKey: ['food-logs', selectedDate],
    queryFn: async () => {
      const response = await api.get<ApiResponse<FoodLog[]>>('/nutrition/logs', {
        params: { date: selectedDate },
      });
      return response.data.data;
    },
  });

  // Add food log mutation
  const addMutation = useMutation({
    mutationFn: async (data: FoodLogForm) => {
      const response = await api.post('/nutrition/logs', {
        ...data,
        date: selectedDate,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs', selectedDate] });
      setAddModalOpen(false);
      setQuickAddOpen(false);
      reset();
    },
  });

  // Delete food log mutation
  const deleteMutation = useMutation({
    mutationFn: async (logId: string) => {
      const response = await api.delete(`/nutrition/logs/${logId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs', selectedDate] });
    },
  });

  // Calculate totals
  const totals = logs?.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ) || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const navigateDate = (direction: 'prev' | 'next') => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const onSubmit = (data: FoodLogForm) => {
    addMutation.mutate(data);
  };

  const handleQuickAdd = (food: FoodLogForm) => {
    Object.entries(food).forEach(([key, value]) => {
      setValue(key as keyof FoodLogForm, value);
    });
    setQuickAddOpen(false);
    setAddModalOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Nutrition"
        description="Track your daily food intake"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setQuickAddOpen(true)}
              leftIcon={<Apple className="w-4 h-4" />}
            >
              Quick Add
            </Button>
            <Button onClick={() => setAddModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Add Food
            </Button>
          </div>
        }
      />

      {/* Date Navigation */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center">
              <p className="font-semibold text-text-primary">
                {formatDate(selectedDate, 'long')}
              </p>
              {selectedDate === getToday() && (
                <Badge variant="info" size="sm">Today</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDate('next')}
              disabled={selectedDate === getToday()}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Targets vs Actual */}
      {targets && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Calories */}
              <MacroProgress
                label="Calories"
                current={totals.calories}
                target={targets.calories}
                unit="kcal"
              />
              {/* Protein */}
              <MacroProgress
                label="Protein"
                current={totals.protein}
                target={targets.protein}
                unit="g"
                color="bg-blue-500"
              />
              {/* Carbs */}
              <MacroProgress
                label="Carbs"
                current={totals.carbs}
                target={targets.carbs}
                unit="g"
                color="bg-yellow-500"
              />
              {/* Fat */}
              <MacroProgress
                label="Fat"
                current={totals.fat}
                target={targets.fat}
                unit="g"
                color="bg-red-500"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Food Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Food Log</CardTitle>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <EmptyState
              title="No entries yet"
              description="Start logging your meals for today"
              action={{
                label: 'Add Food',
                onClick: () => setAddModalOpen(true),
              }}
            />
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-background-secondary rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-text-primary truncate">
                      {log.mealName}
                    </h4>
                    <div className="flex gap-3 mt-1 text-xs text-text-secondary">
                      <span>{log.calories} kcal</span>
                      <span>P: {log.protein}g</span>
                      <span>C: {log.carbs}g</span>
                      <span>F: {log.fat}g</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(log.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-text-muted hover:text-error" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Food Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          reset();
        }}
        title="Add Food"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Meal Name"
            placeholder="e.g., Chicken Breast"
            error={errors.mealName?.message}
            {...register('mealName')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Calories"
              type="number"
              error={errors.calories?.message}
              {...register('calories')}
            />
            <Input
              label="Protein (g)"
              type="number"
              error={errors.protein?.message}
              {...register('protein')}
            />
            <Input
              label="Carbs (g)"
              type="number"
              error={errors.carbs?.message}
              {...register('carbs')}
            />
            <Input
              label="Fat (g)"
              type="number"
              error={errors.fat?.message}
              {...register('fat')}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setAddModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={addMutation.isPending}>
              Add
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Modal */}
      <Modal
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        title="Quick Add"
        description="Select a common food to add"
      >
        <div className="space-y-2">
          {commonFoods.map((food, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickAdd(food)}
              className="w-full p-3 text-left bg-surface hover:bg-surface-hover rounded-lg transition-colors"
            >
              <div className="font-medium text-text-primary">{food.mealName}</div>
              <div className="text-xs text-text-secondary mt-1">
                {food.calories} kcal • P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function MacroProgress({
  label,
  current,
  target,
  unit,
  color = 'bg-accent',
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color?: string;
}) {
  const percentage = Math.min(100, calculateMacroPercentage(current, target));
  const isOver = current > target;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <span className={`text-sm ${isOver ? 'text-error' : 'text-text-primary'}`}>
          {current} / {target} {unit}
        </span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full ${isOver ? 'bg-error' : color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
