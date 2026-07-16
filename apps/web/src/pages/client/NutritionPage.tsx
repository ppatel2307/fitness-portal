import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '@/lib/api';
import { getToday } from '@/lib/utils';
import type { MealPlan, NutritionTarget, ApiResponse } from '@/types';
import { Apple, Sparkles, RefreshCw, ShoppingCart, ChevronDown, ChevronUp, Plus, Trash2, UtensilsCrossed } from 'lucide-react';

interface FoodLog {
  id: string;
  date: string;
  mealName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const foodLogSchema = z.object({
  mealName: z.string().min(1, 'What did you eat?').max(100),
  calories: z.coerce.number().int().nonnegative(),
  protein: z.coerce.number().int().nonnegative(),
  carbs: z.coerce.number().int().nonnegative(),
  fat: z.coerce.number().int().nonnegative(),
});

type FoodLogForm = z.infer<typeof foodLogSchema>;

function FoodLogSection({ target }: { target: NutritionTarget | null }) {
  const queryClient = useQueryClient();
  const today = getToday();

  const logsQuery = useQuery({
    queryKey: ['food-logs', today],
    queryFn: async () => {
      const res = await api.get<ApiResponse<FoodLog[]>>(`/nutrition/logs?date=${today}`);
      return res.data.data ?? [];
    },
  });

  const form = useForm<FoodLogForm>({
    resolver: zodResolver(foodLogSchema),
    defaultValues: { mealName: '', calories: 0, protein: 0, carbs: 0, fat: 0 },
  });

  const addMutation = useMutation({
    mutationFn: async (data: FoodLogForm) => {
      await api.post('/nutrition/logs', { ...data, date: today });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs', today] });
      form.reset();
      toast.success('Meal logged');
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (logId: string) => {
      await api.delete(`/nutrition/logs/${logId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-logs', today] });
      toast.success('Entry removed');
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const logs = logsQuery.data ?? [];
  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const macros = [
    { label: 'Calories', eaten: totals.calories, goal: target?.calories, color: 'bg-yellow-400' },
    { label: 'Protein', eaten: totals.protein, goal: target?.protein, color: 'bg-blue-400' },
    { label: 'Carbs', eaten: totals.carbs, goal: target?.carbs, color: 'bg-green-400' },
    { label: 'Fat', eaten: totals.fat, goal: target?.fat, color: 'bg-orange-400' },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="w-5 h-5 text-zinc-400" />
        <h2 className="text-lg font-semibold text-white">Today's Food Log</h2>
      </div>

      {/* Progress vs targets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {macros.map(m => {
          const pct = m.goal ? Math.min(100, Math.round((m.eaten / m.goal) * 100)) : 0;
          return (
            <div key={m.label} className="bg-zinc-800/50 rounded-xl p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-white">{m.eaten}</span>
                <span className="text-xs text-zinc-500">{m.goal ? `/ ${m.goal}` : ''}</span>
              </div>
              <p className="text-xs text-zinc-500 mb-2">{m.label}</p>
              <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${m.color} rounded-full transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add entry */}
      <form
        onSubmit={form.handleSubmit(data => addMutation.mutate(data))}
        className="grid grid-cols-2 md:grid-cols-12 gap-2 items-start"
      >
        <div className="col-span-2 md:col-span-4">
          <input
            className="w-full px-3 py-2 bg-zinc-800 border border-border rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Meal (e.g. Tofu stir-fry)"
            aria-label="Meal name"
            {...form.register('mealName')}
          />
          {form.formState.errors.mealName && (
            <p className="text-xs text-error mt-1">{form.formState.errors.mealName.message}</p>
          )}
        </div>
        {(['calories', 'protein', 'carbs', 'fat'] as const).map(field => (
          <div key={field} className="col-span-1">
            <input
              type="number"
              min={0}
              className="w-full px-3 py-2 bg-zinc-800 border border-border rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder={field === 'calories' ? 'kcal' : `${field[0].toUpperCase()}g`}
              aria-label={field}
              {...form.register(field)}
            />
          </div>
        ))}
        <div className="col-span-2 md:col-span-4">
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-fg rounded-lg text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" /> {addMutation.isPending ? 'Logging…' : 'Log Meal'}
          </button>
        </div>
      </form>

      {/* Entries */}
      {logsQuery.isLoading ? (
        <div className="flex justify-center py-6">
          <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-4">
          Nothing logged today — add your first meal above.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {logs.map(log => (
            <li key={log.id} className="flex items-center justify-between py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{log.mealName}</p>
                <p className="text-xs text-zinc-500">
                  {log.calories} kcal • P {log.protein}g • C {log.carbs}g • F {log.fat}g
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(log.id)}
                className="p-1.5 text-zinc-500 hover:text-error rounded-lg hover:bg-error/10 transition"
                aria-label={`Delete ${log.mealName}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MealCard({ title, section }: { title: string; section: { items: string[]; calories: number } }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">{title}</span>
          <span className="text-xs text-zinc-500">{section.calories} cal</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <ul className="space-y-1.5">
            {section.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-accent mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function NutritionPage() {
  const queryClient = useQueryClient();
  const [adjustment, setAdjustment] = useState('');
  const [showGroceries, setShowGroceries] = useState(false);

  const mealPlanQuery = useQuery({
    queryKey: ['meal-plan'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<MealPlan | null>>('/nutrition/meal-plan');
      return res.data.data ?? null;
    },
  });

  const targetsQuery = useQuery({
    queryKey: ['nutrition-targets'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<NutritionTarget | null>>('/nutrition/my-targets');
      return res.data.data ?? null;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<MealPlan>>('/ai/meal-plan/generate');
      return res.data.data;
    },
    onSuccess: plan => {
      queryClient.setQueryData(['meal-plan'], plan);
      toast.success('Meal plan generated!');
    },
    onError: e => toast.error(getErrorMessage(e)),
  });

  const adjustMutation = useMutation({
    mutationFn: async (change: string) => {
      const res = await api.post<ApiResponse<MealPlan>>('/ai/meal-plan/adjust', { adjustment: change });
      return res.data.data;
    },
    onSuccess: plan => {
      queryClient.setQueryData(['meal-plan'], plan);
      setAdjustment('');
      toast.success('Meal plan updated!');
    },
    onError: e => toast.error(getErrorMessage(e)),
  });

  const mealPlan = mealPlanQuery.data ?? null;
  const nutritionTarget = targetsQuery.data ?? null;
  const isGenerating = generateMutation.isPending;
  const isAdjusting = adjustMutation.isPending;

  const generateMealPlan = () => generateMutation.mutate();
  const adjustMealPlan = () => {
    if (adjustment.trim()) adjustMutation.mutate(adjustment.trim());
  };

  if (mealPlanQuery.isLoading || targetsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (mealPlanQuery.isError) {
    return (
      <div className="bg-card border border-border rounded-2xl p-12 text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Couldn't load your nutrition data</h2>
        <p className="text-zinc-400 mb-6">{getErrorMessage(mealPlanQuery.error)}</p>
        <button
          onClick={() => mealPlanQuery.refetch()}
          className="px-6 py-3 bg-accent hover:bg-accent-hover text-accent-fg font-semibold rounded-xl transition"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Nutrition</h1>
        <button
          onClick={generateMealPlan}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition"
        >
          {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isGenerating ? 'Generating...' : mealPlan ? 'Regenerate' : 'Generate Meal Plan'}
        </button>
      </div>

      {/* Nutrition targets */}
      {nutritionTarget && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Daily Targets</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Calories', value: nutritionTarget.calories, unit: 'kcal', color: 'text-yellow-400' },
              { label: 'Protein', value: nutritionTarget.protein, unit: 'g', color: 'text-blue-400' },
              { label: 'Carbs', value: nutritionTarget.carbs, unit: 'g', color: 'text-green-400' },
              { label: 'Fat', value: nutritionTarget.fat, unit: 'g', color: 'text-orange-400' },
            ].map(item => (
              <div key={item.label} className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-zinc-500">{item.label} ({item.unit})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily food logging */}
      <FoodLogSection target={nutritionTarget} />

      {/* No meal plan */}
      {!mealPlan && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <Apple className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Meal Plan Yet</h2>
          <p className="text-zinc-400 mb-6 max-w-sm mx-auto">
            Generate a personalized meal plan using AI based on your profile and nutrition goals.
          </p>
          <button
            onClick={generateMealPlan}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-semibold rounded-xl mx-auto transition"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
      )}

      {/* Meal plan */}
      {mealPlan && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Weekly Meal Plan</p>
              <p className="text-sm text-zinc-300 mt-0.5">
                Week of {new Date(mealPlan.weekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{mealPlan.calories}</p>
              <p className="text-xs text-zinc-500">calories/day</p>
            </div>
          </div>

          {/* Meals */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-semibold text-white mb-4">Daily Meals</h2>
            <MealCard title="Breakfast" section={mealPlan.breakfast} />
            <MealCard title="Lunch" section={mealPlan.lunch} />
            <MealCard title="Dinner" section={mealPlan.dinner} />
            <MealCard title="Snacks" section={mealPlan.snacks} />
          </div>

          {/* Notes */}
          {mealPlan.notes && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
              <p className="text-xs font-medium text-accent mb-1">Coach Notes</p>
              <p className="text-sm text-zinc-300">{mealPlan.notes}</p>
            </div>
          )}

          {/* Grocery list */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <button onClick={() => setShowGroceries(g => !g)} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-zinc-400" />
                <h2 className="text-lg font-semibold text-white">Grocery List</h2>
                <span className="text-sm text-zinc-500">({(mealPlan.groceries as string[]).length} items)</span>
              </div>
              {showGroceries ? <ChevronUp className="w-5 h-5 text-zinc-500" /> : <ChevronDown className="w-5 h-5 text-zinc-500" />}
            </button>
            {showGroceries && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(mealPlan.groceries as string[]).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg">
                    <span className="text-accent">•</span>
                    <span className="text-sm text-zinc-300">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Adjustments */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Request Changes</h2>
            <p className="text-sm text-zinc-400 mb-4">Ask the AI to adjust your meal plan (e.g., "Replace chicken with fish", "Make breakfast vegetarian", "Add more protein")</p>
            <div className="flex gap-3">
              <input
                type="text"
                className="flex-1 px-4 py-3 bg-zinc-800 border border-border rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Describe the change you want..."
                value={adjustment}
                onChange={e => setAdjustment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && adjustMealPlan()}
              />
              <button
                onClick={adjustMealPlan}
                disabled={isAdjusting || !adjustment.trim()}
                className="px-4 py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition flex items-center gap-2"
              >
                {isAdjusting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Adjust
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
